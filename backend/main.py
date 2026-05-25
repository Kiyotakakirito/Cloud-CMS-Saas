from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from config import settings

from routers import (
    customers, auth, billing, ticketing, users, 
    tenants, analytics, audit, system_settings, staff
)

from utils.error_handler import (
    http_error_handler, validation_error_handler,
    general_error_handler, AppError, app_error_handler
)
from middleware.security import SecurityHeadersMiddleware, RequestTimingMiddleware
from middleware.rate_limit import rate_limit_middleware, rate_limit_exception_handler
from middleware.request_logging import RequestLoggingMiddleware
from slowapi.errors import RateLimitExceeded
from utils.logger import logger
import logging
from supabase_client import supabase

app = FastAPI(
    title=f"{settings.PROJECT_NAME} (Supabase)",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=None,
    redirect_slashes=False
)

# Security middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestTimingMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
app.middleware("http")(rate_limit_middleware(settings.RATE_LIMIT_REQUESTS))

@app.get("/health")
def health_check():
    return {"status": "healthy", "project": settings.PROJECT_NAME, "database": "supabase"}

# Routers
app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(billing.router)
app.include_router(ticketing.router)
app.include_router(users.router)
app.include_router(tenants.router)
app.include_router(analytics.router)
app.include_router(audit.router)
app.include_router(system_settings.router)
app.include_router(staff.router)

# Add error handlers
app.add_exception_handler(HTTPException, http_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(Exception, general_error_handler)
app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)

# Comprehensive health check endpoint
@app.get("/api/v1/health")
def api_health_check():
    """Comprehensive health check endpoint"""
    import psutil
    import datetime

    # Check Supabase connection
    db_status = "healthy"
    try:
        supabase.table("tenants").select("count", count="exact").limit(1).execute()
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "services": {
            "database": db_status,
            "api": "healthy"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
