from typing import List, Dict, Any, Tuple, Optional
import datetime
from app.integrations.erp.base_connector import BaseERPConnector
from app.integrations.erp.security import ERPSecurity

class SAPConnector(BaseERPConnector):
    """
    SAP S/4HANA Utility Invoicing OData Adapter.
    Requires configured OData service endpoint and OAuth 2.0 client credentials.
    """
    def validate_config(self) -> Tuple[bool, Optional[str]]:
        url = self.config.get("endpoint_url")
        if not url:
            return False, "SAP OData Service URL is required."
        if not ERPSecurity.validate_safe_url(url):
            return False, "Prohibited SAP Service URL (SSRF security policy)."
        return True, None

    def test_connection(self) -> Tuple[bool, str]:
        valid, err = self.validate_config()
        if not valid:
            return False, err
        return False, "SAP OData test requires active corporate SAP Gateway credentials and mTLS certificate. Please configure via enterprise vault."

    def fetch_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        raise NotImplementedError("Live SAP connection requires enterprise OAuth 2.0 gateway credentials. Use Simulated Mode for testing.")

    def map_and_normalize(self, raw_records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        return [], ["SAP OData live extraction not configured."]


class NetSuiteConnector(BaseERPConnector):
    """
    Oracle NetSuite SuiteTalk REST Web Services Utility Adapter.
    """
    def validate_config(self) -> Tuple[bool, Optional[str]]:
        url = self.config.get("endpoint_url")
        if not url:
            return False, "NetSuite SuiteTalk REST URL is required."
        if not ERPSecurity.validate_safe_url(url):
            return False, "Prohibited NetSuite endpoint (SSRF security policy)."
        return True, None

    def test_connection(self) -> Tuple[bool, str]:
        valid, err = self.validate_config()
        if not valid:
            return False, err
        return False, "NetSuite connection requires Token-Based Authentication (TBA) Consumer Key & Token Secret. Configure in Settings."

    def fetch_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        raise NotImplementedError("Live NetSuite SuiteTalk requires TBA credentials. Use Simulated Mode for testing.")

    def map_and_normalize(self, raw_records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        return [], ["NetSuite live extraction not configured."]


class Dynamics365Connector(BaseERPConnector):
    """
    Microsoft Dynamics 365 Finance & Operations OData / Dataverse Entity Adapter.
    """
    def validate_config(self) -> Tuple[bool, Optional[str]]:
        url = self.config.get("endpoint_url")
        if not url:
            return False, "Dynamics 365 Organization Service URL is required."
        if not ERPSecurity.validate_safe_url(url):
            return False, "Prohibited Dynamics endpoint (SSRF security policy)."
        return True, None

    def test_connection(self) -> Tuple[bool, str]:
        valid, err = self.validate_config()
        if not valid:
            return False, err
        return False, "Dynamics 365 connection requires Microsoft Entra ID (Azure AD) Client Secret and Tenant ID."

    def fetch_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        raise NotImplementedError("Live Dynamics 365 requires Entra ID credentials. Use Simulated Mode for testing.")

    def map_and_normalize(self, raw_records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        return [], ["Dynamics 365 live extraction not configured."]
