import datetime
import random
from typing import List, Dict, Any, Tuple, Optional
from app.integrations.erp.base_connector import BaseERPConnector

class SimulatedERPConnector(BaseERPConnector):
    """
    Simulated ERP connector generating clearly labelled synthetic enterprise utility invoices
    (Electricity, Water, Natural Gas, Waste) for seamless offline demonstrations.
    """
    def validate_config(self) -> Tuple[bool, Optional[str]]:
        return True, None

    def test_connection(self) -> Tuple[bool, str]:
        return True, "Simulated ERP gateway connection established successfully (Mock Environment: SAP S/4HANA Sandbox)."

    def fetch_records(self, limit: int = 24) -> List[Dict[str, Any]]:
        records = []
        base_date = datetime.datetime(2024, 1, 1)

        utility_configs = [
            ("ELECTRICITY", "kWh", 185000.0, 0.14, "ELE-"),
            ("WATER", "m³", 1250.0, 3.80, "WTR-"),
            ("NATURAL_GAS", "therms", 8400.0, 1.15, "GAS-"),
            ("WASTE", "kg", 4200.0, 0.22, "WST-")
        ]

        # Generate 6 months of historical bills across 4 utilities
        for m in range(6):
            p_start = base_date + datetime.timedelta(days=m * 30)
            p_end = p_start + datetime.timedelta(days=29)

            for u_type, unit, base_qty, unit_cost, prefix in utility_configs:
                variance = random.uniform(0.92, 1.08)
                qty = round(base_qty * variance, 1)
                cost = round(qty * unit_cost, 2)
                inv_no = f"INV-2024-M{m+1:02d}-{prefix}{random.randint(100, 999)}"
                tx_id = f"SIM-ERP-TX-{m+1:02d}-{u_type}"

                records.append({
                    "InvoiceNumber": inv_no,
                    "TransactionId": tx_id,
                    "FacilityCode": "HQ-BLDG-01",
                    "UtilityCategory": u_type,
                    "PeriodStartDate": p_start.strftime("%Y-%m-%d"),
                    "PeriodEndDate": p_end.strftime("%Y-%m-%d"),
                    "BilledUsage": qty,
                    "MeasurementUnit": unit,
                    "InvoiceAmountUSD": cost,
                    "CurrencyCode": "USD",
                    "PaymentStatus": "PAID",
                    "IsSimulated": True
                })

                if len(records) >= limit:
                    break
            if len(records) >= limit:
                break

        return records

    def map_and_normalize(self, raw_records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        normalized = []
        warnings = []

        for r in raw_records:
            try:
                start_dt = datetime.datetime.strptime(r["PeriodStartDate"], "%Y-%m-%d")
                end_dt = datetime.datetime.strptime(r["PeriodEndDate"], "%Y-%m-%d")

                normalized.append({
                    "external_transaction_id": r["TransactionId"],
                    "facility_id": r.get("FacilityCode", "HQ-BLDG-01"),
                    "utility_type": r["UtilityCategory"],
                    "billing_period_start": start_dt,
                    "billing_period_end": end_dt,
                    "billed_quantity": float(r["BilledUsage"]),
                    "unit": r["MeasurementUnit"],
                    "total_cost": float(r["InvoiceAmountUSD"]),
                    "currency": r.get("CurrencyCode", "USD"),
                    "invoice_number": r["InvoiceNumber"],
                    "provenance": "Simulated"
                })
            except Exception as e:
                warnings.append(f"Failed to normalize record {r.get('InvoiceNumber')}: {str(e)}")

        return normalized, warnings
