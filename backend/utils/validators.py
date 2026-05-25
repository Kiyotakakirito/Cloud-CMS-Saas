import re
from typing import Optional

def validate_mac_address(mac_address: str) -> bool:
    """
    Validate MAC address format.
    Supports formats: XX:XX:XX:XX:XX:XX, XX-XX-XX-XX-XX-XX, XXXXXXXXXXXX
    """
    if not mac_address:
        return False

    # Remove any separators and convert to uppercase
    clean_mac = re.sub(r'[^0-9A-Fa-f]', '', mac_address).upper()

    # Check if we have exactly 12 hexadecimal characters
    if len(clean_mac) != 12:
        return False

    # Check if all characters are valid hexadecimal
    if not re.match(r'^[0-9A-F]{12}$', clean_mac):
        return False

    return True

def format_mac_address(mac_address: str, separator: str = ":") -> Optional[str]:
    """
    Format MAC address with specified separator.
    Returns None if invalid MAC address.
    """
    if not validate_mac_address(mac_address):
        return None

    # Clean and format
    clean_mac = re.sub(r'[^0-9A-Fa-f]', '', mac_address).upper()

    # Insert separator every 2 characters
    formatted = separator.join(clean_mac[i:i+2] for i in range(0, 12, 2))

    return formatted

def validate_ip_address(ip_address: str) -> bool:
    """
    Validate IPv4 address format.
    """
    if not ip_address:
        return False

    # Basic IPv4 pattern
    pattern = r'^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'

    return bool(re.match(pattern, ip_address))

def sanitize_html(text: str) -> str:
    """
    Remove HTML tags from a string to prevent XSS.
    """
    if not text:
        return text
    # Simple regex to strip HTML tags
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)