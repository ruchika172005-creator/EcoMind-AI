import json
import httpx
import datetime
from typing import List, Dict, Any, Tuple, Optional
from app.integrations.erp.base_connector import BaseERPConnector
from app.integrations.erp.security import ERPSecurity

class GenericRESTConnector(BaseERPConnector):
    """
    Configurable REST API connector for utility billing endpoints.
    Enforces SSRF prevention and timeout protection.
    """
    def validate_config(self) -> Tuple[bool, Optional[str]]:
        url = self.config.get("endpoint_url")
        if not url:
            return False, "Missing endpoint URL."
        if not ERPSecurity.validate_safe_url(url):
            return False, "Prohibited endpoint URL. Loopback, private subnets, and cloud metadata addresses are blocked for SSRF protection."
        return True, None

    def test_connection(self) -> Tuple[bool, str]:
        valid, err = self.validate_config()
        if not valid:
            return False, f"Configuration validation failed: {err}"

        url = self.config.get("endpoint_url")
        headers = {}
        auth_type = self.config.get("auth_type", "NONE")
        creds = self.config.get("credentials", "")

        if auth_type == "BEARER_TOKEN" and creds:
            headers["Authorization"] = f"Bearer {creds}"
        elif auth_type == "API_KEY" and creds:
            headers["X-API-Key"] = creds

        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(url, headers=headers)
                if resp.status_code in (200, 201, 204):
                    return True, f"Connection verified. HTTP {resp.status_code} response received."
                elif resp.status_code == 401:
                    return False, "Authentication failed (HTTP 401 Unauthorized). Check API credentials."
                else:
                    return False, f"Server responded with status HTTP {resp.status_code}."
        except Exception as e:
            return False, f"Network connection error: {str(e)}"

    def fetch_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        valid, err = self.validate_config()
        if not valid:
            raise ValueError(f"Cannot fetch from invalid configuration: {err}")

        url = self.config.get("endpoint_url")
        headers = {}
        if self.config.get("auth_type") == "BEARER_TOKEN":
            headers["Authorization"] = f"Bearer {self.config.get('credentials')}"

        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, headers=headers, params={"limit": limit})
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list):
                return data[:limit]
            elif isinstance(data, dict) and "records" in data:
                return data["records"][:limit]
            return []

    def map_and_normalize(self, raw_records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        mapping = {}
        if self.config.get("field_mapping"):
            try:
                mapping = json.loads(self.config["field_mapping"])
            except Exception:
                pass

        normalized = []
        warnings = []

        for r in raw_records:
            try:
                tx_id = str(r.get(mapping.get("transaction_id", "id"), ""))
                qty = float(r.get(mapping.get("quantity", "quantity"), 0.0))
                cost = float(r.get(mapping.get("cost", "cost"), 0.0))
                u_type = str(r.get(mapping.get("utility_type", "type"), "ELECTRICITY")).upper()
                unit = str(r.get(mapping.get("unit", "unit"), "kWh"))
                inv_no = str(r.get(mapping.get("invoice_number", "invoice_number"), tx_id))

                normalized.append({
                    "external_transaction_id": tx_id,
                    "facility_id": r.get("facility_id", "HQ-BLDG-01"),
                    "utility_type": u_type,
                    "billing_period_start": datetime.datetime.utcnow() - datetime.timedelta(days=30),
                    "billing_period_end": datetime.datetime.utcnow(),
                    "billed_quantity": qty,
                    "unit": unit,
                    "total_cost": cost,
                    "currency": r.get("currency", "USD"),
                    "invoice_number": inv_no,
                    "provenance": "Measured"
                })
            except Exception as e:
                warnings.append(f"Failed to normalize raw REST record: {str(e)}")

        return normalized, warnings
