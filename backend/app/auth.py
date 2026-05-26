import os
import time
from typing import Dict, List

import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwt


_JWKS_CACHE: Dict[str, object] = {"keys": None, "expires": 0}


def _authority() -> str:
    tenant_id = os.getenv("AAD_TENANT_ID")
    if not tenant_id:
        raise HTTPException(status_code=503, detail="AAD_TENANT_ID is not configured.")
    return f"https://login.microsoftonline.com/{tenant_id}/v2.0"


def _audiences() -> List[str]:
    client_id = os.getenv("AAD_CLIENT_ID")
    audience = os.getenv("AAD_API_AUDIENCE")
    if not client_id and not audience:
        raise HTTPException(status_code=503, detail="AAD_CLIENT_ID is not configured.")

    audiences = []
    if audience:
        audiences.append(audience)
    if client_id:
        audiences.extend([client_id, f"api://{client_id}"])
    # Preserve order and uniqueness
    seen = set()
    unique = []
    for aud in audiences:
        if aud and aud not in seen:
            seen.add(aud)
            unique.append(aud)
    return unique


async def _get_jwks() -> List[Dict[str, str]]:
    now = time.time()
    cached = _JWKS_CACHE.get("keys")
    if cached and now < float(_JWKS_CACHE.get("expires", 0)):
        return cached

    authority = _authority()
    async with httpx.AsyncClient(timeout=10) as client:
        config_res = await client.get(f"{authority}/.well-known/openid-configuration")
        config_res.raise_for_status()
        jwks_uri = config_res.json().get("jwks_uri")
        if not jwks_uri:
            raise HTTPException(status_code=503, detail="OpenID configuration missing jwks_uri.")
        jwks_res = await client.get(jwks_uri)
        jwks_res.raise_for_status()
        jwks = jwks_res.json().get("keys", [])

    _JWKS_CACHE["keys"] = jwks
    _JWKS_CACHE["expires"] = now + 3600
    return jwks


async def verify_token(token: str) -> Dict[str, object]:
    try:
        unverified = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token header.") from exc

    jwks = await _get_jwks()
    key = next((k for k in jwks if k.get("kid") == unverified.get("kid")), None)
    if not key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Signing key not found.")

    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=[unverified.get("alg", "RS256")],
            audience=_audiences(),
            issuer=_authority(),
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token verification failed.") from exc

    return claims
