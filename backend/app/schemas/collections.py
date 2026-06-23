"""Pydantic schemas for collection endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CollectionResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime
    document_count: int

    model_config = ConfigDict(from_attributes=True)


class CreateCollectionRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class RenameCollectionRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class AssignCollectionRequest(BaseModel):
    collection_id: uuid.UUID | None
