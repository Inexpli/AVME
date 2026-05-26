import os
from typing import Dict, List, Tuple

import httpx
from fastapi import HTTPException


def _env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise HTTPException(status_code=503, detail=f"{name} is not configured.")
    return value


def _timeout() -> float:
    try:
        return float(os.getenv("DOC_HTTP_TIMEOUT", "30"))
    except ValueError:
        return 30.0


def _doc_intel_endpoint() -> str:
    return _env("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT").rstrip("/")


def _doc_intel_key() -> str:
    return _env("AZURE_DOCUMENT_INTELLIGENCE_API_KEY")


def _doc_intel_model() -> str:
    return os.getenv("AZURE_DOCUMENT_INTELLIGENCE_MODEL", "prebuilt-read")


def _doc_intel_version() -> str:
    return os.getenv("AZURE_DOCUMENT_INTELLIGENCE_API_VERSION", "2023-07-31")


def _text_ai_endpoint() -> str:
    return _env("AZURE_TEXT_ANALYTICS_ENDPOINT").rstrip("/")


def _text_ai_key() -> str:
    return _env("AZURE_TEXT_ANALYTICS_API_KEY")


def _text_ai_version() -> str:
    return os.getenv("AZURE_TEXT_ANALYTICS_API_VERSION", "2023-07-01")


def _text_language() -> str:
    return os.getenv("AZURE_TEXT_ANALYTICS_LANGUAGE", "en")


def _text_limit() -> int:
    try:
        return int(os.getenv("DOC_TEXT_LIMIT", "4000"))
    except ValueError:
        return 4000


def _text_analytics_limit() -> int:
    try:
        return int(os.getenv("TEXT_ANALYTICS_MAX_CHARS", "5000"))
    except ValueError:
        return 5000


async def extract_text(file_bytes: bytes, content_type: str) -> str:
    url = f"{_doc_intel_endpoint()}/documentintelligence/documentModels/{_doc_intel_model()}:analyze"
    params = {"api-version": _doc_intel_version()}
    headers = {"Ocp-Apim-Subscription-Key": _doc_intel_key(), "Content-Type": content_type}

    async with httpx.AsyncClient(timeout=_timeout()) as client:
        res = await client.post(url, params=params, headers=headers, content=file_bytes)
    if res.status_code != 202:
        raise HTTPException(status_code=502, detail="Document Intelligence analyze request failed.")
    op_location = res.headers.get("operation-location")
    if not op_location:
        raise HTTPException(status_code=502, detail="Document Intelligence missing operation-location.")

    async with httpx.AsyncClient(timeout=_timeout()) as client:
        for _ in range(20):
            poll = await client.get(op_location, headers={"Ocp-Apim-Subscription-Key": _doc_intel_key()})
            poll.raise_for_status()
            payload = poll.json()
            status = payload.get("status")
            if status == "succeeded":
                result = payload.get("analyzeResult", {})
                return result.get("content", "") or ""
            if status in {"failed", "canceled"}:
                raise HTTPException(status_code=502, detail="Document Intelligence analysis failed.")
    raise HTTPException(status_code=504, detail="Document Intelligence analysis timed out.")


async def extract_entities(text: str) -> Tuple[List[Dict[str, str]], List[str]]:
    shortened = text[: _text_analytics_limit()]
    headers = {
        "Ocp-Apim-Subscription-Key": _text_ai_key(),
        "Content-Type": "application/json",
    }
    doc = {"documents": [{"id": "1", "language": _text_language(), "text": shortened}]}
    entities_url = f"{_text_ai_endpoint()}/text/analytics/v3.1/entities/recognition/general"
    phrases_url = f"{_text_ai_endpoint()}/text/analytics/v3.1/keyPhrases"
    params = {"api-version": _text_ai_version()}

    async with httpx.AsyncClient(timeout=_timeout()) as client:
        entities_res = await client.post(entities_url, params=params, headers=headers, json=doc)
        phrases_res = await client.post(phrases_url, params=params, headers=headers, json=doc)
    try:
        entities_res.raise_for_status()
        phrases_res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Text Analytics request failed.") from exc

    entities = entities_res.json().get("documents", [{}])[0].get("entities", [])
    phrases = phrases_res.json().get("documents", [{}])[0].get("keyPhrases", [])
    return entities, phrases


def build_key_fields(entities: List[Dict[str, str]]) -> List[str]:
    fields = []
    for ent in entities:
        category = ent.get("category")
        text = ent.get("text")
        if not text or not category:
            continue
        fields.append(f"{category}: {text}")
    return fields[:12]


def compliance_checks(doc_type: str, text: str, entities: List[Dict[str, str]], key_phrases: List[str]) -> List[str]:
    issues = []
    lowered = text.lower()
    categories = {e.get("category") for e in entities if e.get("category")}

    if doc_type in {"invoice", "financial"}:
        if "Date" not in categories and "Quantity" not in categories:
            issues.append("Missing date references for financial document.")
        if "Quantity" not in categories and "Money" not in categories:
            issues.append("Missing monetary amounts for invoice/financial document.")
    if doc_type in {"contract", "agreement"}:
        if "Date" not in categories:
            issues.append("Missing effective or expiry dates in contract.")
        if "termination" not in lowered and "term" not in lowered:
            issues.append("No termination or term clauses detected.")
    if doc_type in {"certification", "registration"}:
        if "valid" not in lowered and "expiry" not in lowered and "expires" not in lowered:
            issues.append("No validity or expiry references detected.")
    if not key_phrases:
        issues.append("No key phrases extracted; document may be low quality.")

    return issues


def cross_reference(
    text: str,
    supplier_name: str,
    contract_titles: List[str],
) -> List[str]:
    issues = []
    lowered = text.lower()
    if supplier_name and supplier_name.lower() not in lowered:
        issues.append("Supplier name not found in document text.")
    if contract_titles:
        matched = any(title.lower() in lowered for title in contract_titles if title)
        if not matched:
            issues.append("No matching contract titles found in document text.")
    return issues


def summarize(text: str, key_phrases: List[str]) -> str:
    if key_phrases:
        return "Key phrases: " + ", ".join(key_phrases[:8])
    snippet = text.strip().replace("\n", " ")
    return snippet[:200] + ("…" if len(snippet) > 200 else "")


def trim_text(text: str) -> str:
    limit = _text_limit()
    if len(text) <= limit:
        return text
    return text[:limit] + "…"
