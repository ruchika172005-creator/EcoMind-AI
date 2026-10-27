import ipaddress
import socket
from urllib.parse import urlparse

class ERPSecurity:
    # Disallowed IP networks to prevent Server-Side Request Forgery (SSRF)
    PROHIBITED_NETWORKS = [
        ipaddress.ip_network('127.0.0.0/8'),      # Loopback
        ipaddress.ip_network('10.0.0.0/8'),       # Private Class A
        ipaddress.ip_network('172.16.0.0/12'),    # Private Class B
        ipaddress.ip_network('192.168.0.0/16'),   # Private Class C
        ipaddress.ip_network('169.254.0.0/16'),   # Link-Local / Cloud Metadata
        ipaddress.ip_network('::1/128'),          # IPv6 Loopback
        ipaddress.ip_network('fc00::/7'),         # IPv6 Unique Local
        ipaddress.ip_network('fe80::/10'),        # IPv6 Link-Local
    ]

    @classmethod
    def validate_safe_url(cls, url: str) -> bool:
        """
        Validates that a URL does not target localhost, private subnets,
        or cloud metadata endpoints (e.g. AWS/GCP 169.254.169.254).
        """
        if not url:
            return False
            
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ('http', 'https'):
                return False

            hostname = parsed.hostname
            if not hostname:
                return False

            # Explicit check for localhost string
            if hostname.lower() in ('localhost', '127.0.0.1', '::1', '0.0.0.0'):
                return False

            # Resolve DNS and verify IP
            try:
                ip_str = socket.gethostbyname(hostname)
                ip = ipaddress.ip_address(ip_str)
                for net in cls.PROHIBITED_NETWORKS:
                    if ip in net:
                        return False
            except socket.gaierror:
                # If cannot resolve in sandbox, fail closed
                return False

            return True
        except Exception:
            return False

    @staticmethod
    def mask_secret(secret: str) -> str:
        """Redacts sensitive API keys or tokens for safe UI display and logging."""
        if not secret:
            return "None"
        if len(secret) <= 8:
            return "****"
        return f"{secret[:4]}****{secret[-4:]}"
