import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.energy_record import EnergyRecord
from app.models.anomaly import AnomalyRun, AnomalyResult
from app.models.recommendation import Recommendation
from app.models.setting import SystemSetting
from app.schemas.recommendation import RecommendationResponse, RecommendationSummaryResponse

class RecommendationEngine:
    @classmethod
    def generate_recommendations(cls, db: Session, dataset_id: int) -> RecommendationSummaryResponse:
        records = db.query(EnergyRecord).filter(
            EnergyRecord.dataset_id == dataset_id
        ).order_by(EnergyRecord.timestamp.asc()).all()
        
        if not records:
            raise ValueError("No records found to analyze for recommendations.")
            
        data = [{
            "timestamp": r.timestamp,
            "consumption_kwh": r.consumption_kwh,
            "hour": r.timestamp.hour,
            "dayofweek": r.timestamp.weekday(),
            "is_weekend": r.timestamp.weekday() >= 5
        } for r in records]
        
        df = pd.DataFrame(data)
        
        # Retrieve active tariff & emission factor
        tariff_setting = db.query(SystemSetting).filter_by(key="energy_tariff").first()
        tariff = float(tariff_setting.value) if tariff_setting else settings.DEFAULT_ENERGY_TARIFF
        
        ef_setting = db.query(SystemSetting).filter_by(key="emission_factor").first()
        emission_factor = float(ef_setting.value) if ef_setting else settings.DEFAULT_EMISSION_FACTOR
        
        # Calculate key load parameters
        total_kwh = df["consumption_kwh"].sum()
        peak_kwh = df["consumption_kwh"].max()
        avg_kwh = df["consumption_kwh"].mean()
        
        # Night-time / Unoccupied hours (10:00 PM to 5:00 AM)
        off_hours_mask = df["hour"].isin([22, 23, 0, 1, 2, 3, 4, 5])
        off_hours_df = df[off_hours_mask]
        off_hours_avg = off_hours_df["consumption_kwh"].mean()
        
        # Working hours (Mon-Fri 8:00 AM to 6:00 PM)
        work_hours_df = df[(~df["is_weekend"]) & (df["hour"].between(8, 18))]
        work_hours_avg = work_hours_df["consumption_kwh"].mean() if len(work_hours_df) > 0 else avg_kwh
        
        # Weekend days
        weekend_df = df[df["is_weekend"]]
        weekend_avg = weekend_df["consumption_kwh"].mean() if len(weekend_df) > 0 else avg_kwh
        
        # Baseline ratio (off-hours to peak)
        baseload_ratio = off_hours_avg / max(1.0, peak_kwh)
        
        # Check existing anomalies
        anomaly_count = db.query(AnomalyResult).join(AnomalyRun).filter(
            AnomalyRun.dataset_id == dataset_id,
            AnomalyResult.is_anomaly == True
        ).count()
        
        critical_anomalies = db.query(AnomalyResult).join(AnomalyRun).filter(
            AnomalyRun.dataset_id == dataset_id,
            AnomalyResult.severity.in_(["Critical", "High"])
        ).all()
        
        recommendations_to_add: List[Recommendation] = []
        
        # Rule 1: Off-Hours Baseload Leakage Detection
        if baseload_ratio > 0.35 and len(off_hours_df) > 10:
            # Opportunity to reduce nighttime standby consumption by 15-20%
            target_reduction_pct = 0.15
            annual_off_hours = len(off_hours_df) * (8760 / max(1, len(df)))
            est_kwh_savings = off_hours_avg * target_reduction_pct * annual_off_hours
            est_cost_savings = est_kwh_savings * tariff
            est_co2e_savings = est_kwh_savings * emission_factor
            
            recommendations_to_add.append(Recommendation(
                dataset_id=dataset_id,
                title="Mitigate Elevated Unoccupied Baseload Consumption",
                category="Baseload Reduction",
                priority="High" if baseload_ratio > 0.45 else "Medium",
                evidence=(
                    f"Average off-hours consumption (10 PM - 5 AM) is {off_hours_avg:.1f} kWh, "
                    f"representing {baseload_ratio*100:.1f}% of maximum facility peak demand ({peak_kwh:.1f} kWh). "
                    f"Standard commercial baseload benchmarks typically remain below 25-30%."
                ),
                calculation_details=(
                    f"Applying a 15% reduction to off-hours load ({off_hours_avg:.1f} kWh × 0.15 = {off_hours_avg*0.15:.1f} kWh/h) "
                    f"over projected annual off-hours ({int(annual_off_hours)} hours) yields "
                    f"{est_kwh_savings:,.0f} kWh in avoidable energy."
                ),
                suggested_action=(
                    "Implement automated building management system (BMS) setback controls. "
                    "Schedule nocturnal shutdown for ventilation chillers, non-critical lighting, "
                    "plug loads, and auxiliary equipment."
                ),
                limitations="Assumes non-critical equipment can be safely de-energized without affecting 24/7 server infrastructure.",
                expected_savings_kwh=round(est_kwh_savings, 1),
                expected_savings_cost=round(est_cost_savings, 2),
                expected_savings_co2e_kg=round(est_co2e_savings, 1),
                status="New"
            ))

        # Rule 2: Weekend Temperature / HVAC Setback Optimization
        weekend_to_work_ratio = weekend_avg / max(1.0, work_hours_avg)
        if weekend_to_work_ratio > 0.50 and len(weekend_df) > 10:
            target_cut = 0.20
            annual_weekend_hours = len(weekend_df) * (8760 / max(1, len(df)))
            est_kwh_savings = weekend_avg * target_cut * annual_weekend_hours
            est_cost_savings = est_kwh_savings * tariff
            est_co2e_savings = est_kwh_savings * emission_factor
            
            recommendations_to_add.append(Recommendation(
                dataset_id=dataset_id,
                title="Optimize Weekend HVAC & Lighting Setback Schedules",
                category="Schedule Optimization",
                priority="High",
                evidence=(
                    f"Weekend average consumption ({weekend_avg:.1f} kWh) remains at "
                    f"{weekend_to_work_ratio*100:.1f}% of active weekday working-hour levels ({work_hours_avg:.1f} kWh). "
                    f"Unoccupied facilities should ideally scale down to 30-40%."
                ),
                calculation_details=(
                    f"A 20% reduction across unoccupied weekend periods ({weekend_avg:.1f} kWh × 0.20) "
                    f"across {int(annual_weekend_hours)} hours recovers {est_kwh_savings:,.0f} kWh annually."
                ),
                suggested_action=(
                    "Verify thermostat weekend drift tolerances (e.g., raise cooling setpoint to 26°C and lower heating to 16°C). "
                    "Ensure sweep controls turn off shared floor lighting and air handling units after Friday 7:00 PM."
                ),
                limitations="May require tenant notification or occupancy sensor overrides in multi-tenant leased facilities.",
                expected_savings_kwh=round(est_kwh_savings, 1),
                expected_savings_cost=round(est_cost_savings, 2),
                expected_savings_co2e_kg=round(est_co2e_savings, 1),
                status="New"
            ))

        # Rule 3: Peak Demand Shaving & Load Shedding
        # Identify top 5% peak demand hours
        p95_kwh = df["consumption_kwh"].quantile(0.95)
        top_peak_hours = df[df["consumption_kwh"] >= p95_kwh]
        if peak_kwh > (avg_kwh * 1.8) and len(top_peak_hours) > 0:
            shaved_kw = peak_kwh - p95_kwh
            # In commercial utility tariffs, peak demand charges often comprise $12 - $20 per kW-month
            demand_charge_rate = 15.0 # $/kW-month
            est_demand_cost_savings = shaved_kw * demand_charge_rate * 12 # 12 months
            est_peak_kwh_savings = shaved_kw * len(top_peak_hours)
            est_co2e_savings = est_peak_kwh_savings * emission_factor
            
            recommendations_to_add.append(Recommendation(
                dataset_id=dataset_id,
                title="Initiate Peak Demand Shaving Protocol",
                category="Peak Shaving",
                priority="Critical" if peak_kwh > (avg_kwh * 2.2) else "High",
                evidence=(
                    f"Maximum observed instantaneous demand reached {peak_kwh:.1f} kWh, "
                    f"which is {(peak_kwh/avg_kwh):.1f}x higher than the facility average ({avg_kwh:.1f} kWh). "
                    f"The top 5% peak periods consistently exceed {p95_kwh:.1f} kWh."
                ),
                calculation_details=(
                    f"Shaving {shaved_kw:.1f} kW from peak demand avoids roughly ${demand_charge_rate:.2f}/kW-month "
                    f"in capacity reservation charges, totaling ${est_demand_cost_savings:,.2f}/yr, "
                    f"alongside {est_peak_kwh_savings:,.0f} kWh in direct energy avoidance."
                ),
                suggested_action=(
                    "Stagger major equipment startup sequences (pumps, compressors, elevators). "
                    "Pre-cool facilities 1-2 hours before peak afternoon electricity hours to shift thermal mass."
                ),
                limitations="Actual financial savings depend on utility tariff structure (e.g. ratchet clauses and coincidence factors).",
                expected_savings_kwh=round(est_peak_kwh_savings, 1),
                expected_savings_cost=round(est_demand_cost_savings, 2),
                expected_savings_co2e_kg=round(est_co2e_savings, 1),
                status="New"
            ))

        # Rule 4: Action on Detected Statistical Anomalies
        if critical_anomalies:
            crit_count = len(critical_anomalies)
            # Sum excess kWh above expected baseline for these anomalies
            total_excess_kwh = sum(
                max(0.0, (a.consumption_kwh - (a.expected_kwh or avg_kwh)))
                for a in critical_anomalies
            )
            est_cost_waste = total_excess_kwh * tariff
            est_co2e_waste = total_excess_kwh * emission_factor
            
            recommendations_to_add.append(Recommendation(
                dataset_id=dataset_id,
                title="Remediate Detected High-Severity Energy Consumption Anomalies",
                category="Anomaly Investigation",
                priority="Critical",
                evidence=(
                    f"{crit_count} high/critical severity consumption anomalies were isolated. "
                    f"These events represent atypical energy spikes (such as {critical_anomalies[0].timestamp.strftime('%Y-%m-%d %H:%M')} "
                    f"at {critical_anomalies[0].consumption_kwh:.1f} kWh)."
                ),
                calculation_details=(
                    f"Total uncharacteristic excess energy across detected anomalies amounts to "
                    f"{total_excess_kwh:,.1f} kWh, representing ${est_cost_waste:,.2f} in unnecessary cost."
                ),
                suggested_action=(
                    "Dispatch maintenance personnel to inspect submeters and AHU damper actuators. "
                    "Check for simultaneous heating and cooling cycles, sensor calibration drifts, or manual overrides."
                ),
                limitations="Requires on-site submeter verification to isolate specific equipment circuits.",
                expected_savings_kwh=round(total_excess_kwh, 1),
                expected_savings_cost=round(est_cost_waste, 2),
                expected_savings_co2e_kg=round(est_co2e_waste, 1),
                status="New"
            ))
        else:
            recommendations_to_add.append(Recommendation(
                dataset_id=dataset_id,
                title="Maintain Proactive Energy Monitoring Schedule",
                category="Continuous Commissioning",
                priority="Low",
                evidence="No severe consumption anomalies currently exceed statistical alarm boundaries.",
                calculation_details="Baseline stability maintained. Preventive checkups protect against 2-5% operational degradation.",
                suggested_action="Continue regular quarterly submeter recalibration and filter replacements.",
                limitations="General operational hygiene practice.",
                expected_savings_kwh=round(total_kwh * 0.02, 1),
                expected_savings_cost=round(total_kwh * 0.02 * tariff, 2),
                expected_savings_co2e_kg=round(total_kwh * 0.02 * emission_factor, 1),
                status="New"
            ))

        # Clear existing recommendations for this dataset and insert newly generated ones
        db.query(Recommendation).filter(Recommendation.dataset_id == dataset_id).delete()
        db.commit()
        
        db.bulk_save_objects(recommendations_to_add)
        db.commit()
        
        # Query saved recommendations
        saved_recs = db.query(Recommendation).filter(
            Recommendation.dataset_id == dataset_id
        ).order_by(Recommendation.id.asc()).all()
        
        tot_kwh = sum(r.expected_savings_kwh or 0 for r in saved_recs)
        tot_cost = sum(r.expected_savings_cost or 0 for r in saved_recs)
        tot_co2 = sum(r.expected_savings_co2e_kg or 0 for r in saved_recs)
        
        crit_count = sum(1 for r in saved_recs if r.priority == "Critical")
        high_count = sum(1 for r in saved_recs if r.priority == "High")
        med_count = sum(1 for r in saved_recs if r.priority == "Medium")
        low_count = sum(1 for r in saved_recs if r.priority == "Low")
        
        rec_responses = [
            RecommendationResponse(
                id=r.id,
                dataset_id=r.dataset_id,
                title=r.title,
                category=r.category,
                priority=r.priority,
                evidence=r.evidence,
                calculation_details=r.calculation_details,
                suggested_action=r.suggested_action,
                limitations=r.limitations,
                expected_savings_kwh=r.expected_savings_kwh,
                expected_savings_cost=r.expected_savings_cost,
                expected_savings_co2e_kg=r.expected_savings_co2e_kg,
                status=r.status,
                created_at=r.created_at
            )
            for r in saved_recs
        ]
        
        return RecommendationSummaryResponse(
            total_recommendations=len(saved_recs),
            critical_count=crit_count,
            high_count=high_count,
            medium_count=med_count,
            low_count=low_count,
            total_potential_kwh_savings=round(tot_kwh, 1),
            total_potential_cost_savings=round(tot_cost, 2),
            total_potential_co2e_kg_savings=round(tot_co2, 1),
            recommendations=rec_responses
        )
