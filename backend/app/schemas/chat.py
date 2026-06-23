"""Pydantic schemas for chat session endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class Source(BaseModel):
    """A retrieved document chunk used as evidence for an assistant reply."""

    page: int
    chunk_text: str
    score: float | None


class MessageResponse(BaseModel):
    """A single message returned from the chat history."""

    id: uuid.UUID
    role: str
    content: str
    sources: list[Source] | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionResponse(BaseModel):
    """A chat session record."""

    id: uuid.UUID
    document_id: uuid.UUID
    created_at: datetime
    title: str | None

    model_config = ConfigDict(from_attributes=True)


class ChatRequest(BaseModel):
    """Body for sending a question to the streaming RAG endpoint."""

    question: str = Field(min_length=1, max_length=1000)


class CreateSessionRequest(BaseModel):
    """Body for creating a new chat session."""

    document_id: uuid.UUID
