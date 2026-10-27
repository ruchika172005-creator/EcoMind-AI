from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional
import datetime

class BaseERPConnector(ABC):
    """
    Standard interface for ERP utility billing and activity data connectors.
    """
    def __init__(self, connector_id: int, name: str, config: Dict[str, Any]):
        self.connector_id = connector_id
        self.name = name
        self.config = config

    @abstractmethod
    def validate_config(self) -> Tuple[bool, Optional[str]]:
        """Validates connection parameters, URLs, and authentication setup."""
        pass

    @abstractmethod
    def test_connection(self) -> Tuple[bool, str]:
        """Tests connectivity to the ERP service or validates credentials."""
        pass

    @abstractmethod
    def fetch_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Pulls raw utility invoices / consumption line items from source."""
        pass

    @abstractmethod
    def map_and_normalize(self, raw_records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Maps raw ERP records into the EcoMind canonical utility model:
        - external_transaction_id
        - facility_id
        - utility_type ("ELECTRICITY", "WATER", "NATURAL_GAS", "DIESEL", "WASTE")
        - billing_period_start
        - billing_period_end
        - billed_quantity
        - unit
        - total_cost
        - currency
        - invoice_number
        - provenance ("Measured", "Estimated", "Simulated")
        Returns (normalized_records, validation_warnings).
        """
        pass
