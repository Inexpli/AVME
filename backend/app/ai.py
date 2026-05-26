import json
import os
from pathlib import Path
from dotenv import load_dotenv, find_dotenv
from datetime import date
from typing import List

import anyio
import httpx

load_dotenv()

try:
    from groq import Groq
except Exception:  # pragma: no cover - handled with runtime error
    Groq = None

from . import models, schemas


class LLMConfigError(RuntimeError):
    pass


def _score_to_level(score: int) -> str:
    if score >= 80:
        return "low"
    if score >= 60:
        return "medium"
    if score >= 40:
        return "high"
    return "critical"


def mock_risk_assessment(supplier: models.Supplier) -> schemas.RiskAssessmentResponse:
    score = supplier.risk_score
    level = supplier.risk_level or _score_to_level(score)
    factors = [
        schemas.RiskFactor(
            name="Financial stability",
            detail=f"Recent financial indicators place {supplier.name} in the {level} risk band.",
            impact="medium" if score < 70 else "low",
        ),
        schemas.RiskFactor(
            name="Operational resilience",
            detail=f"Category '{supplier.category}' shows moderate supply variability this quarter.",
            impact="medium",
        ),
        schemas.RiskFactor(
            name="Compliance posture",
            detail=f"Supplier status is '{supplier.status}', requiring continuous audit tracking.",
            impact="high" if supplier.status != "active" else "low",
        ),
    ]
    recommendations = [
        "Schedule quarterly compliance reviews and refresh certifications.",
        "Maintain dual-source coverage for critical SKUs.",
        "Review payment terms based on delivery performance trends.",
    ]
    return schemas.RiskAssessmentResponse(score=score, level=level, factors=factors, recommendations=recommendations)


def mock_contract_search(contracts: List[models.Contract], query: str) -> schemas.ContractSearchResponse:
    results = []
    if not contracts:
        return schemas.ContractSearchResponse(results=results)

    seed = abs(hash(query))
    clause_types = ["liability", "penalty", "termination", "pricing", "SLA"]
    for i in range(min(3, len(contracts))):
        contract = contracts[(seed + i) % len(contracts)]
        clause = clause_types[(seed + i) % len(clause_types)]
        results.append(
            schemas.ContractSearchResult(
                contractTitle=contract.title,
                supplier=contract.supplier.name if contract.supplier else "Unknown",
                clauseType=clause,
                excerpt=f"Relevant {clause} clause referencing '{query}' in {contract.title}.",
                relevanceScore=85 - i * 7,
            )
        )
    return schemas.ContractSearchResponse(results=results)


def mock_negotiation_email(supplier: models.Supplier, scenario: str, context: str) -> str:
    context_line = context or "Please align on a mutually beneficial adjustment."
    return (
        f"Subject: {scenario.replace('_', ' ').title()} discussion\n\n"
        f"Hello {supplier.name} Team,\n\n"
        f"We appreciate the partnership and would like to revisit the current {scenario.replace('_', ' ')} terms. "
        f"{context_line} Our goal is to maintain delivery continuity while ensuring value alignment on both sides.\n\n"
        "Please share your availability for a short call this week so we can agree on next steps.\n\n"
        "Best regards,\n"
        "Procurement Operations"
    )


def mock_document_analysis(doc: models.Document) -> schemas.DocumentAnalysisResponse:
    return schemas.DocumentAnalysisResponse(
        summary=f"{doc.filename} appears structurally complete and aligned with {doc.doc_type} requirements.",
        key_fields=[
            f"Document type: {doc.doc_type}",
            f"Captured date: {doc.created_at}",
            "Supplier reference: On file",
        ],
        issues=[],
        recommendation="Proceed with validation and archive in the supplier dossier.",
    )


async def call_anthropic(system: str, user_content: str, max_tokens: int = 900) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise LLMConfigError("ANTHROPIC_API_KEY is not configured.")

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user_content}],
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()
    return data["content"][0]["text"]


def _get_groq_client() -> Groq:
    if Groq is None:
        raise LLMConfigError("groq package is not installed.")
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise LLMConfigError("GROQ_API_KEY is not configured.")
    return Groq(api_key=api_key)


async def call_groq(
    system: str,
    user_content: str,
    max_tokens: int = 900,
    temperature: float = 0.7,
    top_p: float = 1.0,
    reasoning_effort: str = "medium",
) -> str:
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": user_content})

    def _call() -> str:
        client = _get_groq_client()
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens,
            stream=True,
            stop=None,
        )
        parts = []
        for chunk in completion:
            delta = chunk.choices[0].delta
            content = getattr(delta, "content", None)
            if content:
                parts.append(content)
        return "".join(parts)

    return await anyio.to_thread.run_sync(_call)


def parse_json_payload(text: str):
    cleaned = text.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)

