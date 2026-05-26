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
        return float(os.getenv("SAP_HTTP_TIMEOUT", "20"))
    except ValueError:
        return 20.0


def _odata_base() -> str:
    return _env("SAP_ODATA_BASE_URL").rstrip("/")


def _bp_service() -> str:
    return os.getenv("SAP_BP_SERVICE", "API_BUSINESS_PARTNER").strip("/")


def _bp_entity_set() -> str:
    return os.getenv("SAP_BP_ENTITY_SET", "A_BusinessPartner").strip("/")


def bp_url() -> str:
    return f"{_odata_base()}/{_bp_service()}/{_bp_entity_set()}"


async def _access_token() -> str:
    token_url = _env("SAP_OAUTH_TOKEN_URL")
    client_id = _env("SAP_OAUTH_CLIENT_ID")
    client_secret = _env("SAP_OAUTH_CLIENT_SECRET")
    scope = os.getenv("SAP_OAUTH_SCOPE")
    audience = os.getenv("SAP_OAUTH_AUDIENCE")

    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }
    if scope:
        data["scope"] = scope
    if audience:
        data["audience"] = audience

    async with httpx.AsyncClient(timeout=_timeout()) as client:
        res = await client.post(token_url, data=data)
    try:
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="SAP OAuth token request failed.") from exc
    token = res.json().get("access_token")
    if not token:
        raise HTTPException(status_code=502, detail="SAP OAuth token missing access_token.")
    return token


async def fetch_business_partners(top: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
    token = await _access_token()
    select = os.getenv(
        "SAP_BP_SELECT",
        "BusinessPartner,BusinessPartnerFullName,BusinessPartnerName,BusinessPartnerCategory,"
        "OrganizationBPName1,OrganizationBPName2,FirstName,LastName,Country,Region,Industry",
    )
    params: Dict[str, Any] = {"$top": top}
    if skip:
        params["$skip"] = skip
    if select:
        params["$select"] = select

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=_timeout()) as client:
        res = await client.get(bp_url(), headers=headers, params=params)
    try:
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="SAP OData request failed.") from exc

    payload = res.json()
    if "d" in payload and isinstance(payload["d"], dict):
        return payload["d"].get("results", [])
    return payload.get("value", [])


async def check_connection() -> None:
    await _access_token()


def map_bp_to_supplier(bp: Dict[str, Any]) -> Dict[str, Any]:
    sap_id = bp.get("BusinessPartner") or bp.get("BusinessPartnerID")
    name = (
        bp.get("BusinessPartnerFullName")
        or bp.get("BusinessPartnerName")
        or " ".join(filter(None, [bp.get("FirstName"), bp.get("LastName")])).strip()
        or " ".join(filter(None, [bp.get("OrganizationBPName1"), bp.get("OrganizationBPName2")])).strip()
        or sap_id
    )
    country = bp.get("Country") or bp.get("CountryOfOrigin") or "Unknown"
    category = bp.get("Industry") or bp.get("BusinessPartnerCategory") or "Uncategorized"

    return {
        "sap_id": sap_id,
        "name": name or "Unknown",
        "country": country,
        "category": category,
        "status": "active",
        "risk_score": 50,
        "risk_level": "medium",
    }
