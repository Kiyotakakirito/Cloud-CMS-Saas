from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from typing import Callable
import time

# In-memory rate limiting (replace with Redis for production)
_rate_limits = {}

def rate_limit_middleware(requests_per_minute: int = 100):
    """
    Simple in-memory rate limiting middleware.
    For production, use Redis-based rate limiting.
    """
    def middleware(request: Request, call_next: Callable):
        client_ip = get_remote_address(request)
        current_time = time.time()

        # Clean up old entries
        _clean_rate_limits(current_time)

        # Check rate limit
        if client_ip in _rate_limits:
            if len(_rate_limits[client_ip]) >= requests_per_minute:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "rate_limit_exceeded",
                        "message": "Too many requests. Please try again later.",
                        "retry_after": 60
                    }
                )
            _rate_limits[client_ip].append(current_time)
        else:
            _rate_limits[client_ip] = [current_time]

        return call_next(request)

    return middleware

def _clean_rate_limits(current_time: float):
    """Clean up rate limit entries older than 1 minute"""
    global _rate_limits

    for ip in list(_rate_limits.keys()):
        # Remove timestamps older than 60 seconds
        _rate_limits[ip] = [
            ts for ts in _rate_limits[ip]
            if current_time - ts < 60
        ]

        # Remove empty lists
        if not _rate_limits[ip]:
            del _rate_limits[ip]

# Exception handler for rate limiting
async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please try again later.",
            "retry_after": 60
        }
    )