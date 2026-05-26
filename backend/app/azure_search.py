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
        return float(os.getenv("AZURE_SEARCH_HTTP_TIMEOUT", "15"))
    except ValueError:
        return 15.0


def _endpoint() -> str:
    return _env("AZURE_SEARCH_ENDPOINT").rstrip("/")


def _index() -> str:
    return _env("AZURE_SEARCH_INDEX")


def _api_key() -> str:
    return _env("AZURE_SEARCH_API_KEY")


def _admin_key() -> str:
    return os.getenv("AZURE_SEARCH_ADMIN_KEY") or _api_key()


def _api_version() -> str:
    return os.getenv("AZURE_SEARCH_API_VERSION", "2023-11-01").strip()


def _search_url() -> str:
    return f"{_endpoint()}/indexes/{_index()}/docs/search"


def _index_url() -> str:
    return f"{_endpoint()}/indexes/{_index()}/docs/index"


def _headers() -> Dict[str, str]:
    return {
        "api-key": _api_key(),
        "Content-Type": "application/json",
    }


def _admin_headers() -> Dict[str, str]:
    return {
        "api-key": _admin_key(),
        "Content-Type": "application/json",
    }


async def health_check() -> None:
    url = f"{_endpoint()}/indexes/{_index()}?api-version={_api_version()}"
    async with httpx.AsyncClient(timeout=_timeout()) as client:
        res = await client.get(url, headers=_headers())
    try:
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Azure AI Search health check failed.") from exc


async def search(
    query: str,
    top: int = 5,
    filter_expr: Optional[str] = None,
    select: Optional[str] = None,
) -> List[Dict[str, Any]]:
    payload: Dict[str, Any] = {
        "search": query,
        "top": top,
        "queryType": os.getenv("AZURE_SEARCH_QUERY_TYPE", "simple"),
    }
    if filter_expr:
        payload["filter"] = filter_expr
    if select:
        payload["select"] = select
    vector_profile = os.getenv("AZURE_SEARCH_VECTOR_PROFILE")
    vector_field = os.getenv("AZURE_SEARCH_VECTOR_FIELD")
    if vector_profile and vector_field:
        payload["vectorQueries"] = [
            {
                "kind": "text",
                "text": query,
                "k": top,
                "fields": vector_field,
                "profile": vector_profile,
            }
        ]

    async with httpx.AsyncClient(timeout=_timeout()) as client:
        res = await client.post(f"{_search_url()}?api-version={_api_version()}", json=payload, headers=_headers())
    try:
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Azure AI Search query failed.") from exc

    data = res.json()
    return data.get("value", [])


async def index_documents(documents: List[Dict[str, Any]], action: str = "mergeOrUpload") -> Dict[str, Any]:
    payload = {"value": [{"@search.action": action, **doc} for doc in documents]}
    async with httpx.AsyncClient(timeout=_timeout()) as client:
        res = await client.post(f"{_index_url()}?api-version={_api_version()}", json=payload, headers=_admin_headers())
    try:
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Azure AI Search indexing failed.") from exc
    return res.json()
