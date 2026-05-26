import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException


def _env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise HTTPException(status_code=503, detail=f"{name} is not configured.")
    return value


def _timeout() -> float:
    try:
        return float(os.getenv("DATAVERSE_HTTP_TIMEOUT", "20"))
    except ValueError:
        return 20.0


def _base_url() -> str:
    return _env("DATAVERSE_BASE_URL").rstrip("/")


def _api_version() -> str:
    return os.getenv("DATAVERSE_API_VERSION", "v9.2").strip()


def _entity_set() -> str:
    return os.getenv("DATAVERSE_SUPPLIER_ENTITY_SET", "accounts").strip("/")


def _field_id() -> str:
    return os.getenv("DATAVERSE_SUPPLIER_FIELD_ID", "accountid")


def _field_name() -> str:
    return os.getenv("DATAVERSE_SUPPLIER_FIELD_NAME", "name")


def _field_country() -> str:
    return os.getenv("DATAVERSE_SUPPLIER_FIELD_COUNTRY", "address1_country")


def _field_category() -> str:
    return os.getenv("DATAVERSE_SUPPLIER_FIELD_CATEGORY", "industrycode")


def _select() -> str:
    return os.getenv(
        "DATAVERSE_SUPPLIER_SELECT",
        f"{_field_id()},{_field_name()},{_field_country()},{_field_category()}",
    )


def _token_url() -> str:
    explicit = os.getenv("DATAVERSE_OAUTH_TOKEN_URL")
    if explicit:
        return explicit
    tenant = _env("DATAVERSE_TENANT_ID")
    return f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"


def _scope() -> str:
    return os.getenv("DATAVERSE_OAUTH_SCOPE", f"{_base_url()}/.default")


async def _access_token() -> str:
    client_id = _env("DATAVERSE_OAUTH_CLIENT_ID")
    client_secret = _env("DATAVERSE_OAUTH_CLIENT_SECRET")

    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": _scope(),
    }

    async with httpx.AsyncClient(timeout=_timeout()) as client:
        res = await client.post(_token_url(), data=data)
    try:
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Dataverse OAuth token request failed.") from exc

    token = res.json().get("access_token")
    if not token:
        raise HTTPException(status_code=502, detail="Dataverse OAuth token missing access_token.")
    return token


def _headers(token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
    }


def _entity_url() -> str:
    return f"{_base_url()}/api/data/{_api_version()}/{_entity_set()}"


async def check_connection() -> None:
    token = await _access_token()
    whoami_url = f"{_base_url()}/api/data/{_api_version()}/WhoAmI"
    async with httpx.AsyncClient(timeout=_timeout()) as client:
        res = await client.get(whoami_url, headers=_headers(token))
    try:
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Dataverse health check failed.") from exc


async def fetch_suppliers(top: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
    token = await _access_token()
    params: Dict[str, Any] = {"$top": top}
    if skip:
        params["$skip"] = skip
    select = _select()
    if select:
        params["$select"] = select

    async with httpx.AsyncClient(timeout=_timeout()) as client:
        res = await client.get(_entity_url(), headers=_headers(token), params=params)
    try:
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Dataverse query failed.") from exc

    payload = res.json()
    return payload.get("value", [])


def map_to_supplier(item: Dict[str, Any]) -> Dict[str, Any]:
    dataverse_id = item.get(_field_id())
    name = item.get(_field_name()) or dataverse_id or "Unknown"
    country = item.get(_field_country()) or "Unknown"
    category = item.get(_field_category()) or "Uncategorized"
    return {
        "dataverse_id": dataverse_id,
        "name": name,
        "country": country,
        "category": category,
        "status": "active",
        "risk_score": 50,
        "risk_level": "medium",
    }
