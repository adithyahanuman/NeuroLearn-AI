"""
ml-service/app/security.py

Security middleware and dependency for NeuroLearn AI ML Service.
Enforces constant-time X-API-Key validation via secrets.compare_digest.
"""

import os
import secrets
from typing import Optional
from fastapi import Header, HTTPException, status

DEFAULT_API_KEY = "9bfa0adf52e01d16604931cae1b5f1f05811bf4a5700b5401bce3d85027d1d5c"


def get_expected_api_key() -> str:
    return os.environ.get("ML_API_KEY", DEFAULT_API_KEY)


def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> str:
    """
    Validates incoming X-API-Key header against configured ML_API_KEY using
    constant-time secrets.compare_digest to prevent timing attacks.
    """
    expected = get_expected_api_key()
    if not x_api_key or not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return x_api_key
