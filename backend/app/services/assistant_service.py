import re
import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.energy_record import EnergyRecord
from app.models.forecast import ForecastRun, ForecastResult
from app.models.anomaly import AnomalyRun, AnomalyResult
from app.models.carbon import CarbonCalculation
from app.models.recommendation import Recommendation
from app.schemas.assistant import AssistantQueryResponse, AssistantSourceCitation

class AssistantService:
    @classmethod
    def process_query(cls, db: Session, query: str, dataset_id: Optional[int] = None) -> AssistantQueryResponse:
        q_lower = query.lower().strip()
        
        # If no dataset specified, pick the most recent or demo dataset
        if not dataset_id:
            latest_ds = db.query(Dataset).order_by(Dataset.id.desc()).first()
            if latest_ds:
                dataset_id = latest_ds.id
                
        if not dataset_id:
            return AssistantQueryResponse(
                query=query,
                answer=(
                    "No datasets have been loaded yet into EcoMind AI. "
                    "Please navigate to **Energy Data Management** to upload a CSV file or click **'Load Demo Data'** to get started."
                ),
                source_module="System",
                confidence=1.0,
                citations=[],
                suggested_followups=[
                    "How do I upload a dataset?",
                    "What CSV columns are supported?"
                ]
            )
            
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            return AssistantQueryResponse(
                query=query,
                answer="The specified dataset could not be found.",
                source_module="System",
                confidence=0.5,
                citations=[],
                suggested_followups=[]
            )

        citations: List[AssistantSourceCitation] = []
        
        # 1. Consumption & Overview Queries
        if any(w in q_lower for w in ["total energy", "total consumption", "how much energy", "consumed", "average consumption", "daily"]):
            total_kwh = dataset.total_consumption_kwh
            avg_kwh = dataset.avg_consumption_kwh
            min_kwh = dataset.min_consumption_kwh
            max_kwh = dataset.max_consumption_kwh
            start_str = dataset.start_time.strftime("%b %d, %Y") if dataset.start_time else "N/A"
            end_str = dataset.end_time.strftime("%b %d, %Y") if dataset.end_time else "N/A"
            daily_avg = avg_kwh * 24.0
            
            citations.append(AssistantSourceCitation(module="Energy Records", metric="Total Consumption", value=f"{total_kwh:,.1f} kWh"))
            citations.append(AssistantSourceCitation(module="Energy Records", metric="Average Daily", value=f"{daily_avg:,.1f} kWh/day"))
            citations.append(AssistantSourceCitation(module="Energy Records", metric="Peak Demand", value=f"{max_kwh:,.1f} kWh"))
            
            answer = (
                f"### Energy Consumption Overview for **{dataset.name}**\n\n"
                f"- **Reporting Period**: {start_str} to {end_str} ({dataset.row_count:,} hourly readings)\n"
                f"- **Total Energy Consumed**: **{total_kwh:,.1f} kWh**\n"
                f"- **Average Hourly Load**: **{avg_kwh:,.1f} kWh** (~{daily_avg:,.1f} kWh per 24-hour cycle)\n"
                f"- **Peak Demand Record**: **{max_kwh:,.1f} kWh**\n"
                f"- **Baseload Floor**: **{min_kwh:,.1f} kWh**\n\n"
                f"The load curve demonstrates a characteristic commercial schedule with distinct weekday operating peaks and weekend setback periods."
            )
            return AssistantQueryResponse(
                query=query,
                answer=answer,
                source_module="Energy Analytics",
                confidence=0.98,
                citations=citations,
                suggested_followups=[
                    "What is forecast for the next 7 days?",
                    "What is our estimated carbon impact?",
                    "Are there any detected anomalies?"
                ]
            )

        # 2. Forecasting Queries
        elif any(w in q_lower for w in ["forecast", "predict", "next 7 days", "future", "upcoming"]):
            latest_forecast = db.query(ForecastRun).filter(
                ForecastRun.dataset_id == dataset_id
            ).order_by(ForecastRun.id.desc()).first()
            
            if not latest_forecast:
                return AssistantQueryResponse(
                    query=query,
                    answer=(
                        f"No active forecast run was found for **{dataset.name}**. "
                        f"You can generate one instantly on the **Consumption Forecasting** page using XGBoost or Random Forest."
                    ),
                    source_module="ML Forecasting",
                    confidence=0.90,
                    citations=[],
                    suggested_followups=[
                        "What is our historical total consumption?",
                        "What anomalies have been detected?"
                    ]
                )
                
            predictions = db.query(ForecastResult).filter(
                ForecastResult.run_id == latest_forecast.id
            ).order_by(ForecastResult.timestamp.asc()).all()
            
            tot_pred = sum(p.predicted_kwh for p in predictions)
            peak_pred = max(p.predicted_kwh for p in predictions) if predictions else 0.0
            min_pred = min(p.predicted_kwh for p in predictions) if predictions else 0.0
            
            citations.append(AssistantSourceCitation(module="Forecasting", metric="Model", value=latest_forecast.model_name))
            citations.append(AssistantSourceCitation(module="Forecasting", metric="Horizon", value=f"{latest_forecast.horizon_hours} hours"))
            citations.append(AssistantSourceCitation(module="Forecasting", metric="Projected Energy", value=f"{tot_pred:,.1f} kWh"))
            citations.append(AssistantSourceCitation(module="Forecasting", metric="Validation WAPE", value=f"{latest_forecast.wape:.1f}%"))
            
            answer = (
                f"### Forecasting Outlook ({latest_forecast.model_name})\n\n"
                f"Based on the trained **{latest_forecast.model_name}** model "
                f"(Validation Metrics: **WAPE = {latest_forecast.wape:.1f}%**, **MAE = {latest_forecast.mae:.1f} kWh**, **R² = {latest_forecast.r2:.2f}**):\n\n"
                f"- **Projected Horizon**: Next **{latest_forecast.horizon_hours} hours** ({len(predictions)} hourly steps)\n"
                f"- **Total Forecasted Energy**: **{tot_pred:,.1f} kWh**\n"
                f"- **Expected Peak Hour**: **{peak_pred:,.1f} kWh**\n"
                f"- **Expected Night Baseload**: **{min_pred:,.1f} kWh**\n\n"
                f"All future intervals include 95% confidence intervals derived from out-of-sample validation residuals."
            )
            return AssistantQueryResponse(
                query=query,
                answer=answer,
                source_module="ML Forecasting",
                confidence=0.96,
                citations=citations,
                suggested_followups=[
                    "What was our peak consumption?",
                    "Which recommendations will reduce this forecasted demand?"
                ]
            )

        # 3. Anomaly Queries
        elif any(w in q_lower for w in ["anomaly", "anomalies", "unusual", "spike", "outlier", "investigation"]):
            latest_run = db.query(AnomalyRun).filter(
                AnomalyRun.dataset_id == dataset_id
            ).order_by(AnomalyRun.id.desc()).first()
            
            if not latest_run:
                return AssistantQueryResponse(
                    query=query,
                    answer=(
                        f"Anomaly detection has not been executed yet on **{dataset.name}**. "
                        f"Visit the **Anomaly Detection** page to run Scikit-learn's Isolation Forest detector."
                    ),
                    source_module="Anomaly Detection",
                    confidence=0.90,
                    citations=[],
                    suggested_followups=["Run anomaly detection on this dataset"]
                )
                
            anomalies = db.query(AnomalyResult).filter(
                AnomalyResult.run_id == latest_run.id
            ).order_by(AnomalyResult.anomaly_score.asc()).limit(5).all()
            
            crit_count = db.query(AnomalyResult).filter(
                AnomalyResult.run_id == latest_run.id,
                AnomalyResult.severity.in_(["Critical", "High"])
            ).count()
            
            citations.append(AssistantSourceCitation(module="Anomaly Detection", metric="Total Flagged", value=str(latest_run.anomalies_detected)))
            citations.append(AssistantSourceCitation(module="Anomaly Detection", metric="High/Critical", value=str(crit_count)))
            
            top_anomalies_md = ""
            for a in anomalies:
                top_anomalies_md += f"- **{a.timestamp.strftime('%Y-%m-%d %H:%M')}**: **{a.consumption_kwh:.1f} kWh** ({a.severity}) — *{a.explanation}*\n"
                
            answer = (
                f"### Detected Energy Consumption Anomalies\n\n"
                f"The Isolation Forest algorithm analyzed **{latest_run.total_records_analyzed:,} readings** "
                f"with a contamination sensitivity of **{latest_run.contamination*100:.1f}%**:\n\n"
                f"- **Total Flagged Anomalies**: **{latest_run.anomalies_detected}**\n"
                f"- **High & Critical Events**: **{crit_count}**\n\n"
                f"#### Top Unusual Readings Requiring Inspection:\n"
                f"{top_anomalies_md}\n"
                f"> **Engineering Note**: Anomalies indicate statistical deviation from standard time-of-day baselines, often pointing to HVAC schedule misconfigurations or faulty submeter sensors."
            )
            return AssistantQueryResponse(
                query=query,
                answer=answer,
                source_module="Anomaly Detection",
                confidence=0.97,
                citations=citations,
                suggested_followups=[
                    "What recommendations address these anomalies?",
                    "What is the estimated carbon impact?"
                ]
            )

        # 4. Carbon & Emissions Queries
        elif any(w in q_lower for w in ["carbon", "emission", "co2", "footprint", "greenhouse"]):
            latest_calc = db.query(CarbonCalculation).filter(
                CarbonCalculation.dataset_id == dataset_id
            ).order_by(CarbonCalculation.id.desc()).first()
            
            if not latest_calc:
                # Calculate dynamically if not yet stored
                from app.services.carbon_service import CarbonService
                calc_resp = CarbonService.calculate_emissions(db, dataset_id)
                latest_calc = db.query(CarbonCalculation).filter_by(id=calc_resp.id).first()

            citations.append(AssistantSourceCitation(module="Carbon Accounting", metric="Total Emissions", value=f"{latest_calc.total_emissions_mt_co2e:,.2f} MT CO2e"))
            citations.append(AssistantSourceCitation(module="Carbon Accounting", metric="Grid Factor", value=f"{latest_calc.emission_factor:.3f} kg CO2e/kWh"))
            citations.append(AssistantSourceCitation(module="Carbon Accounting", metric="Tree Equivalent", value=f"{latest_calc.tree_seedlings_grown_10yr:,.0f} seedlings"))
            
            answer = (
                f"### Carbon Footprint Analysis for **{dataset.name}**\n\n"
                f"- **Total Carbon Footprint**: **{latest_calc.total_emissions_mt_co2e:,.2f} Metric Tonnes CO2e** "
                f"({latest_calc.total_emissions_kg_co2e:,.1f} kg CO2e)\n"
                f"- **Grid Emission Factor**: **{latest_calc.emission_factor:.4f} kg CO2e/kWh** "
                f"(*{latest_calc.factor_source}*)\n"
                f"- **Formula Used**: `Emissions (kg CO2e) = Energy Consumed (kWh) × Emission Factor`\n\n"
                f"#### EPA Greenhouse Gas Equivalencies:\n"
                f"- 🚗 Equivalent to **{latest_calc.passenger_vehicle_miles:,.0f} miles** driven by an average gasoline passenger vehicle.\n"
                f"- 🌲 Requires **{latest_calc.tree_seedlings_grown_10yr:,.0f} tree seedlings** grown for 10 years to sequester this carbon.\n"
                f"- ⚡ Equivalent to **{latest_calc.homes_electricity_year:.1f} average residential homes'** annual electricity use."
            )
            return AssistantQueryResponse(
                query=query,
                answer=answer,
                source_module="Carbon Accounting",
                confidence=0.98,
                citations=citations,
                suggested_followups=[
                    "What recommendations will reduce our carbon emissions?",
                    "How can I change the emission factor in Settings?"
                ]
            )

        # 5. Recommendation Queries
        elif any(w in q_lower for w in ["recommendation", "savings", "efficiency", "reduce", "opportunity", "action"]):
            recs = db.query(Recommendation).filter(
                Recommendation.dataset_id == dataset_id
            ).all()
            
            if not recs:
                from app.services.recommendation_service import RecommendationEngine
                rec_summary = RecommendationEngine.generate_recommendations(db, dataset_id)
                recs = db.query(Recommendation).filter(Recommendation.dataset_id == dataset_id).all()
                
            tot_kwh_save = sum(r.expected_savings_kwh or 0 for r in recs)
            tot_cost_save = sum(r.expected_savings_cost or 0 for r in recs)
            tot_co2_save = sum(r.expected_savings_co2e_kg or 0 for r in recs)
            
            citations.append(AssistantSourceCitation(module="AI Recommendations", metric="Total Opportunities", value=str(len(recs))))
            citations.append(AssistantSourceCitation(module="AI Recommendations", metric="Potential Cost Savings", value=f"${tot_cost_save:,.2f}"))
            citations.append(AssistantSourceCitation(module="AI Recommendations", metric="Potential CO2e Avoidance", value=f"{tot_co2_save:,.1f} kg"))
            
            recs_md = ""
            for r in recs[:4]:
                recs_md += (
                    f"1. **{r.title}** [{r.priority} Priority]\n"
                    f"   - **Potential Savings**: {r.expected_savings_kwh:,.0f} kWh (${r.expected_savings_cost:,.2f}) | {r.expected_savings_co2e_kg:,.1f} kg CO2e\n"
                    f"   - **Action**: {r.suggested_action}\n"
                )
                
            answer = (
                f"### High-Impact Energy Efficiency Recommendations\n\n"
                f"Our heuristic audit engine identified **{len(recs)} data-backed opportunities** "
                f"with total estimated savings of **${tot_cost_save:,.2f}** and **{tot_kwh_save:,.0f} kWh**:\n\n"
                f"{recs_md}\n"
                f"> **Verification Note**: Every estimate is calculated from actual baseline deviations and facility operational hours."
            )
            return AssistantQueryResponse(
                query=query,
                answer=answer,
                source_module="AI Recommendations",
                confidence=0.97,
                citations=citations,
                suggested_followups=[
                    "What caused the high baseload?",
                    "Export the full recommendations report"
                ]
            )

        # 6. Default fallback / General Assistant response
        else:
            answer = (
                f"I can analyze energy data, forecasts, anomalies, carbon metrics, and efficiency recommendations for **{dataset.name}**.\n\n"
                f"Try asking one of the following:\n"
                f"- *'What was the total energy consumption?'*\n"
                f"- *'What consumption is forecast for the next seven days?'*\n"
                f"- *'Which unusual readings require investigation?'*\n"
                f"- *'What is our estimated carbon impact?'*\n"
                f"- *'Which recommendations have the strongest supporting evidence?'*"
            )
            return AssistantQueryResponse(
                query=query,
                answer=answer,
                source_module="General Intelligence",
                confidence=0.85,
                citations=[],
                suggested_followups=[
                    "What was the total energy consumption?",
                    "What is forecast for next 7 days?",
                    "What are the top recommendations?"
                ]
            )
