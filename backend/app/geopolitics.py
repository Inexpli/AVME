import os
from typing import Dict, List, Optional

import httpx
from fastapi import HTTPException


def _timeout() -> float:
    try:
        return float(os.getenv("GEO_RISK_HTTP_TIMEOUT", "10"))
    except ValueError:
        return 10.0


def _parse_list(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [v.strip().lower() for v in value.split(",") if v.strip()]


def _score_to_level(score: int) -> str:
    if score >= 80:
        return "low"
    if score >= 60:
        return "medium"
    if score >= 40:
        return "high"
    return "critical"


async def _external_score(country: str) -> Optional[Dict[str, object]]:
    url = os.getenv("GEO_RISK_API_URL")
    if not url:
        return None
    headers = {}
    api_key = os.getenv("GEO_RISK_API_KEY")
    if api_key:
        headers["x-api-key"] = api_key
    async with httpx.AsyncClient(timeout=_timeout()) as client:
        res = await client.get(url, params={"country": country}, headers=headers)
    try:
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Geopolitical risk API request failed.") from exc
    return res.json()


async def score(country: str) -> Dict[str, object]:
    if country:
        country = country.strip()
    external = await _external_score(country or "")
    if external:
        score_val = int(external.get("score", 60))
        level = external.get("level") or _score_to_level(score_val)
        return {
            "score": score_val,
            "level": level,
            "source": "external",
            "detail": external.get("detail", ""),
        }

    critical = set(_parse_list(os.getenv("GEO_RISK_CRITICAL_COUNTRIES")))
    high = set(_parse_list(os.getenv("GEO_RISK_HIGH_COUNTRIES")))
    medium = set(_parse_list(os.getenv("GEO_RISK_MEDIUM_COUNTRIES")))
    country_key = (country or "").lower()

    if country_key in critical:
        return {"score": 30, "level": "critical", "source": "rules", "detail": "Critical risk list"}
    if country_key in high:
        return {"score": 45, "level": "high", "source": "rules", "detail": "High risk list"}
    if country_key in medium:
        return {"score": 65, "level": "medium", "source": "rules", "detail": "Medium risk list"}
    return {"score": 85, "level": "low", "source": "rules", "detail": "Default baseline"}
