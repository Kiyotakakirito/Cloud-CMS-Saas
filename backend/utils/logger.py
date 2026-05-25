import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
from config import settings
import sys

class StructuredLogger:
    """Structured JSON logging for production"""

    def __init__(self, name: str = "cms-saas"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))

        # Create console handler with JSON formatter
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        self.logger.addHandler(handler)

    def info(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self.logger.info(message, extra=extra or {})

    def warning(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self.logger.warning(message, extra=extra or {})

    def error(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self.logger.error(message, extra=extra or {})

    def critical(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self.logger.critical(message, extra=extra or {})

    def debug(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self.logger.debug(message, extra=extra or {})

    def exception(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self.logger.exception(message, extra=extra or {})

class JSONFormatter(logging.Formatter):
    """Format log records as JSON"""

    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "environment": settings.ENVIRONMENT,
        }

        # Add extra fields if present
        if hasattr(record, 'extra') and record.extra:
            log_data.update(record.extra)

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)

# Global logger instance
logger = StructuredLogger()

def log_request(request_id: str, method: str, path: str, status_code: int, duration: float):
    """Log HTTP request details"""
    logger.info("HTTP request", {
        "request_id": request_id,
        "method": method,
        "path": path,
        "status_code": status_code,
        "duration_ms": round(duration * 1000, 2),
        "type": "http_request"
    })

def log_database_query(query: str, duration: float, success: bool = True):
    """Log database query details"""
    logger.debug("Database query", {
        "query": query,
        "duration_ms": round(duration * 1000, 2),
        "success": success,
        "type": "database_query"
    })

def log_security_event(event_type: str, details: Dict[str, Any]):
    """Log security-related events"""
    logger.warning("Security event", {
        "event_type": event_type,
        **details,
        "type": "security_event"
    })