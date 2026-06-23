"""Pydantic schemas for document endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    """Full document record returned to the client."""

    id: uuid.UUID
    original_name: str
    page_count: int | None
    file_size_bytes: int
    status: str
    created_at: datetime
    processed_at: datetime | None
    collection_id: uuid.UUID | None = None

    model_config = ConfigDict(from_attributes=True)


class UploadResponse(BaseModel):
    """Lightweight response returned immediately after a PDF upload."""

    id: uuid.UUID
    original_name: str
    status: str
