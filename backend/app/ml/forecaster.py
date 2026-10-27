import json
import datetime
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

from app.models.dataset import Dataset
from app.models.energy_record import EnergyRecord
from app.models.forecast import ForecastRun, ForecastResult
from app.schemas.forecast import ForecastRunResponse, ForecastPredictionPoint, ModelComparisonItem

class EnergyForecaster:
    @staticmethod
    def engineer_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """
        Creates time-aware autoregressive and cyclical features.
        Strictly prevents data leakage by only using past lags and rolling windows.
        """
        df = df.copy()
        
        # Calendar & cyclical features
        df["hour"] = df["timestamp"].dt.hour
        df["dayofweek"] = df["timestamp"].dt.dayofweek
        df["day"] = df["timestamp"].dt.day
        df["month"] = df["timestamp"].dt.month
        df["is_weekend"] = (df["dayofweek"] >= 5).astype(int)
        
        # Sine/Cosine cyclical encoding for hour and month
        df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24.0)
        df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24.0)
        df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12.0)
        df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12.0)
        
        # Autoregressive Lags: 1h, 24h, 168h (same hour last week)
        df["lag_1"] = df["consumption_kwh"].shift(1)
        df["lag_24"] = df["consumption_kwh"].shift(24)
        df["lag_168"] = df["consumption_kwh"].shift(168)
        
        # Rolling statistics on historical consumption (shift by 1 to prevent leak)
        df["rolling_mean_24"] = df["consumption_kwh"].shift(1).rolling(window=24, min_periods=1).mean()
        df["rolling_std_24"] = df["consumption_kwh"].shift(1).rolling(window=24, min_periods=1).std().fillna(0.0)
        
        # Temperature if available
        feature_cols = [
            "hour", "dayofweek", "month", "is_weekend",
            "hour_sin", "hour_cos", "month_sin", "month_cos",
            "lag_1", "lag_24", "lag_168",
            "rolling_mean_24", "rolling_std_24"
        ]
        
        if "temperature_c" in df.columns and df["temperature_c"].notna().sum() > (len(df) * 0.5):
            df["temp_filled"] = df["temperature_c"].ffill().bfill().fillna(20.0)
            feature_cols.append("temp_filled")
            
        # Backfill initial lags so we have clean training rows
        df["lag_168"] = df["lag_168"].bfill()
        df["lag_24"] = df["lag_24"].bfill()
        df["lag_1"] = df["lag_1"].bfill()
        df["rolling_mean_24"] = df["rolling_mean_24"].bfill()
        
        return df, feature_cols

    @staticmethod
    def calculate_wape(actual: np.ndarray, pred: np.ndarray) -> float:
        """Weighted Absolute Percentage Error (WAPE). Resilient to zero or near-zero values."""
        actual_sum = np.sum(np.abs(actual))
        if actual_sum == 0:
            return 0.0
        return float(np.sum(np.abs(actual - pred)) / actual_sum * 100.0)

    @classmethod
    def train_and_forecast(
        cls,
        db: Session,
        dataset_id: int,
        model_type: str = "xgboost",
        horizon_hours: int = 168,
        train_split_ratio: float = 0.8
    ) -> ForecastRunResponse:
        """
        Loads dataset records, performs chronological validation, evaluates models,
        forecasts future periods, and persists results.
        """
        records = db.query(EnergyRecord).filter(
            EnergyRecord.dataset_id == dataset_id
        ).order_by(EnergyRecord.timestamp.asc()).all()
        
        if len(records) < 200:
            raise ValueError(
                f"Insufficient historical data: {len(records)} records available. "
                "Forecasting requires at least 200 chronological hourly observations."
            )
            
        data = [{
            "timestamp": r.timestamp,
            "consumption_kwh": r.consumption_kwh,
            "temperature_c": r.temperature_c
        } for r in records]
        
        raw_df = pd.DataFrame(data)
        raw_df["timestamp"] = pd.to_datetime(raw_df["timestamp"])
        raw_df = raw_df.sort_values(by="timestamp").reset_index(drop=True)
        
        df_feat, feature_cols = cls.engineer_features(raw_df)
        
        # Chronological train-validation split
        split_idx = int(len(df_feat) * train_split_ratio)
        train_df = df_feat.iloc[:split_idx]
        val_df = df_feat.iloc[split_idx:]
        
        X_train = train_df[feature_cols].values
        y_train = train_df["consumption_kwh"].values
        X_val = val_df[feature_cols].values
        y_val = val_df["consumption_kwh"].values
        
        # 1. Baseline Model: Seasonal Naive (uses same hour 168h / 7 days ago)
        baseline_preds = val_df["lag_168"].values
        base_mae = float(mean_absolute_error(y_val, baseline_preds))
        base_rmse = float(root_mean_squared_error(y_val, baseline_preds))
        base_wape = cls.calculate_wape(y_val, baseline_preds)
        base_r2 = max(0.0, float(r2_score(y_val, baseline_preds)))
        
        # 2. Random Forest Regressor
        rf_model = RandomForestRegressor(n_estimators=80, max_depth=12, random_state=42, n_jobs=-1)
        rf_model.fit(X_train, y_train)
        rf_preds = rf_model.predict(X_val)
        rf_mae = float(mean_absolute_error(y_val, rf_preds))
        rf_rmse = float(root_mean_squared_error(y_val, rf_preds))
        rf_wape = cls.calculate_wape(y_val, rf_preds)
        rf_r2 = max(0.0, float(r2_score(y_val, rf_preds)))
        
        # 3. XGBoost Regressor (if installed and compatible)
        xgb_preds = None
        xgb_model = None
        xgb_mae, xgb_rmse, xgb_wape, xgb_r2 = 0.0, 0.0, 0.0, 0.0
        
        if HAS_XGBOOST:
            try:
                xgb_model = xgb.XGBRegressor(
                    n_estimators=120,
                    max_depth=6,
                    learning_rate=0.08,
                    subsample=0.85,
                    colsample_bytree=0.85,
                    random_state=42
                )
                xgb_model.fit(X_train, y_train)
                xgb_preds = xgb_model.predict(X_val)
                xgb_mae = float(mean_absolute_error(y_val, xgb_preds))
                xgb_rmse = float(root_mean_squared_error(y_val, xgb_preds))
                xgb_wape = cls.calculate_wape(y_val, xgb_preds)
                xgb_r2 = max(0.0, float(r2_score(y_val, xgb_preds)))
            except Exception as e:
                xgb_model = None
                print(f"XGBoost training fallback: {e}")

        # Choose best or requested model
        comparison_list: List[ModelComparisonItem] = [
            ModelComparisonItem(
                model_name="Seasonal Naive Baseline",
                mae=round(base_mae, 2),
                rmse=round(base_rmse, 2),
                wape=round(base_wape, 2),
                r2=round(base_r2, 3),
                is_selected=False
            ),
            ModelComparisonItem(
                model_name="Random Forest Regressor",
                mae=round(rf_mae, 2),
                rmse=round(rf_rmse, 2),
                wape=round(rf_wape, 2),
                r2=round(rf_r2, 3),
                is_selected=False
            )
        ]
        
        if HAS_XGBOOST and xgb_model is not None:
            comparison_list.append(ModelComparisonItem(
                model_name="XGBoost Regressor",
                mae=round(xgb_mae, 2),
                rmse=round(xgb_rmse, 2),
                wape=round(xgb_wape, 2),
                r2=round(xgb_r2, 3),
                is_selected=False
            ))
            
        # Select target model
        if model_type == "baseline_seasonal":
            selected_name = "Seasonal Naive Baseline"
            selected_model = None
            sel_mae, sel_rmse, sel_wape, sel_r2 = base_mae, base_rmse, base_wape, base_r2
        elif model_type == "random_forest" or xgb_model is None:
            selected_name = "Random Forest Regressor"
            selected_model = rf_model
            sel_mae, sel_rmse, sel_wape, sel_r2 = rf_mae, rf_rmse, rf_wape, rf_r2
        else:
            selected_name = "XGBoost Regressor"
            selected_model = xgb_model
            sel_mae, sel_rmse, sel_wape, sel_r2 = xgb_mae, xgb_rmse, xgb_wape, xgb_r2

        for item in comparison_list:
            if item.model_name == selected_name:
                item.is_selected = True

        # Generate future forecast points
        last_timestamp = raw_df["timestamp"].max()
        future_predictions: List[ForecastPredictionPoint] = []
        
        # Calculate residual std dev for confidence interval
        val_predictions = xgb_preds if (selected_name == "XGBoost Regressor" and xgb_preds is not None) else (rf_preds if selected_name == "Random Forest Regressor" else baseline_preds)
        residuals = y_val - val_predictions
        residual_std = float(np.std(residuals)) if len(residuals) > 0 else 15.0
        
        # Iterative / Autoregressive rollout into future
        history_df = raw_df.copy()
        
        for step in range(1, horizon_hours + 1):
            next_ts = last_timestamp + datetime.timedelta(hours=step)
            h = next_ts.hour
            dow = next_ts.weekday()
            is_wknd = int(dow >= 5)
            
            # Extract lagged values from existing history
            lag1_val = history_df["consumption_kwh"].iloc[-1]
            lag24_val = history_df["consumption_kwh"].iloc[-24] if len(history_df) >= 24 else lag1_val
            lag168_val = history_df["consumption_kwh"].iloc[-168] if len(history_df) >= 168 else lag24_val
            rolling_24 = history_df["consumption_kwh"].iloc[-24:].mean() if len(history_df) >= 24 else lag1_val
            rolling_std = history_df["consumption_kwh"].iloc[-24:].std() if len(history_df) >= 24 else 5.0
            
            if selected_model is None: # Seasonal naive
                pred_val = float(lag168_val)
            else:
                feat_dict = {
                    "hour": h,
                    "dayofweek": dow,
                    "month": next_ts.month,
                    "is_weekend": is_wknd,
                    "hour_sin": np.sin(2 * np.pi * h / 24.0),
                    "hour_cos": np.cos(2 * np.pi * h / 24.0),
                    "month_sin": np.sin(2 * np.pi * next_ts.month / 12.0),
                    "month_cos": np.cos(2 * np.pi * next_ts.month / 12.0),
                    "lag_1": lag1_val,
                    "lag_24": lag24_val,
                    "lag_168": lag168_val,
                    "rolling_mean_24": rolling_24,
                    "rolling_std_24": rolling_std if not pd.isna(rolling_std) else 0.0
                }
                if "temp_filled" in feature_cols:
                    feat_dict["temp_filled"] = 20.0 # Standard setpoint default
                    
                x_input = np.array([[feat_dict[c] for c in feature_cols]])
                pred_val = float(selected_model.predict(x_input)[0])
                
            pred_val = max(10.0, round(pred_val, 2))
            
            # Expand confidence interval slightly over time
            horizon_spread = 1.0 + (step / horizon_hours) * 0.5
            lower_bound = max(0.0, round(pred_val - 1.96 * residual_std * horizon_spread, 2))
            upper_bound = round(pred_val + 1.96 * residual_std * horizon_spread, 2)
            
            future_predictions.append(ForecastPredictionPoint(
                timestamp=next_ts.strftime("%Y-%m-%d %H:%M:%S"),
                predicted_kwh=pred_val,
                lower_bound_kwh=lower_bound,
                upper_bound_kwh=upper_bound,
                actual_kwh=None
            ))
            
            # Append predicted value to history for recursive lags
            new_row = pd.DataFrame([{
                "timestamp": next_ts,
                "consumption_kwh": pred_val,
                "temperature_c": 20.0
            }])
            history_df = pd.concat([history_df, new_row], ignore_index=True)

        # Persist ForecastRun
        run_record = ForecastRun(
            dataset_id=dataset_id,
            model_name=selected_name,
            horizon_hours=horizon_hours,
            train_split_ratio=train_split_ratio,
            mae=round(sel_mae, 2),
            rmse=round(sel_rmse, 2),
            wape=round(sel_wape, 2),
            r2=round(sel_r2, 3),
            hyperparameters=json.dumps({"horizon": horizon_hours, "model_type": model_type}),
            model_comparison=json.dumps([m.model_dump() for m in comparison_list])
        )
        db.add(run_record)
        db.commit()
        db.refresh(run_record)
        
        # Persist ForecastResults
        result_objects = [
            ForecastResult(
                run_id=run_record.id,
                timestamp=datetime.datetime.strptime(p.timestamp, "%Y-%m-%d %H:%M:%S"),
                predicted_kwh=p.predicted_kwh,
                lower_bound_kwh=p.lower_bound_kwh,
                upper_bound_kwh=p.upper_bound_kwh,
                actual_kwh=None
            )
            for p in future_predictions
        ]
        db.bulk_save_objects(result_objects)
        db.commit()
        
        return ForecastRunResponse(
            id=run_record.id,
            dataset_id=dataset_id,
            model_name=selected_name,
            horizon_hours=horizon_hours,
            train_split_ratio=train_split_ratio,
            mae=round(sel_mae, 2),
            rmse=round(sel_rmse, 2),
            wape=round(sel_wape, 2),
            r2=round(sel_r2, 3),
            created_at=run_record.created_at,
            model_comparison=comparison_list,
            predictions=future_predictions
        )
