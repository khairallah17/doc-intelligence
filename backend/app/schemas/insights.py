from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class DocumentInsight(BaseModel):
    id: uuid.UUID
    name: str
    page_count: int | None
    session_count: int
    question_count: int


class InsightsResponse(BaseModel):
    document_count: int
    total_pages: int
    total_size_bytes: int
    session_count: int
    question_count: int
    top_documents: list[DocumentInsight]
    member_since: datetime
