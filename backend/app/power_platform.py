import os
from typing import Any, Dict

import httpx
from fastapi import HTTPException


def _env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise HTTPException(status_code=503, detail=f"{name} is not configured.")
    return value


def _timeout() -> float:
    try:
        return float(os.getenv("POWER_AUTOMATE_HTTP_TIMEOUT", "15"))
    except ValueError:
        return 15.0


def _flow_url() -> str:
    return _env("POWER_AUTOMATE_FLOW_URL")


def _auth_type() -> str:
    return os.getenv("POWER_AUTOMATE_AUTH_TYPE", "none").lower()


def _oauth_token_url() -> str:
    return _env("POWER_AUTOMATE_OAUTH_TOKEN_URL")


def _oauth_scope() -> str:
    return _env("POWER_AUTOMATE_OAUTH_SCOPE")


async def _oauth_token() -> str:
    data = {
        "grant_type": "client_credentials",
        "client_id": _env("POWER_AUTOMATE_OAUTH_CLIENT_ID"),
        "client_secret": _env("POWER_AUTOMATE_OAUTH_CLIENT_SECRET"),
        "scope": _oauth_scope(),
    }
    async with httpx.AsyncClient(timeout=_timeout()) as client:
        res = await client.post(_oauth_token_url(), data=data)
    try:
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Power Automate OAuth token request failed.") from exc
    token = res.json().get("access_token")
    if not token:
        raise HTTPException(status_code=502, detail="Power Automate OAuth token missing access_token.")
    return token


async def _headers() -> Dict[str, str]:
    auth_type = _auth_type()
    if auth_type == "api_key":
        return {"x-api-key": _env("POWER_AUTOMATE_API_KEY")}
    if auth_type == "bearer":
        return {"Authorization": f"Bearer {_env('POWER_AUTOMATE_BEARER_TOKEN')}"}
    if auth_type == "oauth_client_credentials":
        token = await _oauth_token()
        return {"Authorization": f"Bearer {token}"}
    return {}


async def validate_connection() -> None:
    if _auth_type() == "oauth_client_credentials":
        await _oauth_token()
    _flow_url()


async def trigger_flow(payload: Dict[str, Any]) -> Dict[str, Any]:
    headers = await _headers()
    async with httpx.AsyncClient(timeout=_timeout()) as client:
        res = await client.post(_flow_url(), json=payload, headers=headers)
    try:
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Power Automate flow trigger failed.") from exc
    if res.headers.get("content-type", "").startswith("application/json"):
        return res.json()
    return {"status": "ok"}
