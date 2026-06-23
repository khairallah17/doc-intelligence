"""Shared FastAPI dependencies used across multiple routers."""

import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DocumentNotFoundError, DocumentOwnershipError
from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import Document, User


async def get_user_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Document:
    """
    Dependency that fetches a Document by ID and verifies ownership.

    Raises DocumentNotFoundError (404) if the document does not exist.
    Raises DocumentOwnershipError (403) if the caller does not own it.
    """
    doc: Document | None = await db.get(Document, doc_id)
    if doc is None:
        raise DocumentNotFoundError()
    if doc.user_id != current_user.id:
        raise DocumentOwnershipError()
    return doc
