"""
Standardized API response formatting
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime

class SuccessResponse(BaseModel):
    """Standard success response format"""
    success: bool = True
    data: Optional[Any] = None
    message: Optional[str] = None
    timestamp: datetime = datetime.now()

class ErrorResponse(BaseModel):
    """Standard error response format"""
    success: bool = False
    error: Dict[str, Any]
    timestamp: datetime = datetime.now()

def success_response(data: Any = None, message: str = None) -> Dict[str, Any]:
    """Create a standardized success response"""
    return SuccessResponse(
        data=data,
        message=message
    ).model_dump()

def error_response(
    code: int,
    message: str,
    details: Any = None,
    path: str = None
) -> Dict[str, Any]:
    """Create a standardized error response"""
    error_info = {
        "code": code,
        "message": message
    }

    if details:
        error_info["details"] = details
    if path:
        error_info["path"] = path

    return ErrorResponse(error=error_info).model_dump()

def paginated_response(
    items: List[Any],
    total: int,
    page: int,
    per_page: int,
    message: str = None
) -> Dict[str, Any]:
    """Create a standardized paginated response"""
    return SuccessResponse(
        data={
            "items": items,
            "pagination": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page
            }
        },
        message=message
    ).model_dump()