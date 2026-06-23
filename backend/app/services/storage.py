"""File storage backends: local filesystem and AWS S3."""

import logging
import os
import tempfile
from abc import ABC, abstractmethod

import boto3
from fastapi import UploadFile

from app.config import get_settings

logger = logging.getLogger(__name__)


class StorageService(ABC):
    """Abstract storage backend."""

    @abstractmethod
    async def save(self, file: UploadFile, destination: str) -> str:
        """Persist *file* at *destination* and return the storage path."""

    @abstractmethod
    async def delete(self, storage_path: str) -> None:
        """Remove the file at *storage_path*."""

    @abstractmethod
    async def get_local_path(self, storage_path: str) -> str:
        """Return a local filesystem path suitable for reading the file."""


class LocalStorageService(StorageService):
    """Store files on the local filesystem under LOCAL_UPLOAD_DIR."""

    def __init__(self) -> None:
        settings = get_settings()
        self._base = settings.LOCAL_UPLOAD_DIR
        os.makedirs(self._base, exist_ok=True)

    async def save(self, file: UploadFile, destination: str) -> str:
        """Write *file* to LOCAL_UPLOAD_DIR/{destination}."""
        path = os.path.join(self._base, destination)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        content = await file.read()
        with open(path, "wb") as fh:
            fh.write(content)
        logger.info("Saved file locally: %s", path)
        return path

    async def delete(self, storage_path: str) -> None:
        """Remove the file at *storage_path* if it exists."""
        try:
            os.remove(storage_path)
            logger.info("Deleted local file: %s", storage_path)
        except FileNotFoundError:
            logger.warning("File not found for deletion: %s", storage_path)

    async def get_local_path(self, storage_path: str) -> str:
        """Return *storage_path* directly (already local)."""
        return storage_path


class S3StorageService(StorageService):
    """Store files on AWS S3, downloading to /tmp for local access."""

    def __init__(self) -> None:
        settings = get_settings()
        self._bucket = settings.AWS_BUCKET_NAME
        self._s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

    async def save(self, file: UploadFile, destination: str) -> str:
        """Upload *file* to S3 and return the S3 key as storage path."""
        content = await file.read()
        self._s3.put_object(Bucket=self._bucket, Key=destination, Body=content)
        logger.info("Uploaded file to S3: s3://%s/%s", self._bucket, destination)
        return destination

    async def delete(self, storage_path: str) -> None:
        """Delete the S3 object at *storage_path*."""
        self._s3.delete_object(Bucket=self._bucket, Key=storage_path)
        logger.info("Deleted S3 object: %s", storage_path)

    async def get_local_path(self, storage_path: str) -> str:
        """Download the S3 object to a temp file and return the local path."""
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        self._s3.download_fileobj(self._bucket, storage_path, tmp)
        tmp.flush()
        tmp.close()
        return tmp.name


def get_storage_service() -> StorageService:
    """Return the configured storage backend."""
    settings = get_settings()
    if settings.USE_LOCAL_STORAGE:
        return LocalStorageService()
    return S3StorageService()
