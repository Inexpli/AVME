import os
from typing import Optional
from urllib.parse import urlparse

import anyio
from azure.storage.blob import BlobServiceClient, ContentSettings
from fastapi import HTTPException


_BLOB_SERVICE: Optional[BlobServiceClient] = None


def _backend() -> str:
    return os.getenv("STORAGE_BACKEND", "local").lower()


def _uploads_dir() -> str:
    return os.getenv("LOCAL_UPLOADS_DIR", "")


def _blob_service() -> BlobServiceClient:
    global _BLOB_SERVICE
    if _BLOB_SERVICE:
        return _BLOB_SERVICE
    conn_str = os.getenv("AZURE_BLOB_CONNECTION_STRING")
    account_url = os.getenv("AZURE_BLOB_ACCOUNT_URL")
    account_key = os.getenv("AZURE_BLOB_ACCOUNT_KEY")
    sas_token = os.getenv("AZURE_BLOB_SAS_TOKEN")
    if conn_str:
        _BLOB_SERVICE = BlobServiceClient.from_connection_string(conn_str)
        return _BLOB_SERVICE
    if account_url and (account_key or sas_token):
        credential = account_key or sas_token
        _BLOB_SERVICE = BlobServiceClient(account_url=account_url, credential=credential)
        return _BLOB_SERVICE
    raise HTTPException(status_code=503, detail="Azure Blob Storage is not configured.")


def _container_name() -> str:
    name = os.getenv("AZURE_BLOB_CONTAINER")
    if not name:
        raise HTTPException(status_code=503, detail="AZURE_BLOB_CONTAINER is not configured.")
    return name


def _create_container_if_needed(service: BlobServiceClient) -> None:
    if os.getenv("AZURE_BLOB_CREATE_CONTAINER", "false").lower() != "true":
        return
    try:
        service.create_container(_container_name())
    except Exception:
        pass


def _blob_name_from_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.lstrip("/")
    container = _container_name()
    if path.startswith(f"{container}/"):
        return path[len(container) + 1 :]
    return path


async def save_file(file_name: str, content: bytes, content_type: Optional[str]) -> str:
    if _backend() == "local":
        uploads_dir = _uploads_dir()
        if not uploads_dir:
            raise HTTPException(status_code=503, detail="LOCAL_UPLOADS_DIR is not configured.")
        os.makedirs(uploads_dir, exist_ok=True)
        path = os.path.join(uploads_dir, file_name)
        def _write():
            with open(path, "wb") as handle:
                handle.write(content)
        await anyio.to_thread.run_sync(_write)
        return path

    service = _blob_service()
    _create_container_if_needed(service)
    container = service.get_container_client(_container_name())
    blob = container.get_blob_client(file_name)
    settings = ContentSettings(content_type=content_type) if content_type else None

    def _upload():
        blob.upload_blob(content, overwrite=True, content_settings=settings)

    await anyio.to_thread.run_sync(_upload)
    return blob.url


async def read_file(stored_path: str) -> bytes:
    if _backend() == "local":
        return await anyio.to_thread.run_sync(lambda: open(stored_path, "rb").read())

    service = _blob_service()
    blob_name = _blob_name_from_url(stored_path)
    blob = service.get_blob_client(container=_container_name(), blob=blob_name)

    def _download() -> bytes:
        return blob.download_blob().readall()

    return await anyio.to_thread.run_sync(_download)
