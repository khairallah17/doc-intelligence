"""Insights router: aggregate usage stats for the authenticated user."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import ChatSession, Document, Message, MessageRole, User
from app.schemas.insights import DocumentInsight, InsightsResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "",
    response_model=InsightsResponse,
    summary="Get usage insights",
    description="Return aggregate stats for the authenticated user's documents and conversations.",
)
async def get_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InsightsResponse:
    # Aggregate document stats
    doc_row = (
        await db.execute(
            select(
                func.count(Document.id).label("doc_count"),
                func.coalesce(func.sum(Document.page_count), 0).label("total_pages"),
                func.coalesce(func.sum(Document.file_size_bytes), 0).label("total_size"),
            ).where(Document.user_id == current_user.id)
        )
    ).one()

    # Session count
    session_count = (
        await db.scalar(
            select(func.count(ChatSession.id)).where(
                ChatSession.user_id == current_user.id
            )
        )
    ) or 0

    # Question count (user-role messages only)
    question_count = (
        await db.scalar(
            select(func.count(Message.id))
            .join(ChatSession, Message.session_id == ChatSession.id)
            .where(
                ChatSession.user_id == current_user.id,
                Message.role == MessageRole.user,
            )
        )
    ) or 0

    # Top 5 documents by question count
    top_rows = (
        await db.execute(
            select(
                Document.id,
                Document.original_name,
                Document.page_count,
                func.count(ChatSession.id.distinct()).label("session_count"),
                func.count(Message.id)
                .filter(Message.role == MessageRole.user)
                .label("question_count"),
            )
            .outerjoin(ChatSession, ChatSession.document_id == Document.id)
            .outerjoin(Message, Message.session_id == ChatSession.id)
            .where(Document.user_id == current_user.id)
            .group_by(Document.id, Document.original_name, Document.page_count)
            .order_by(
                func.count(Message.id)
                .filter(Message.role == MessageRole.user)
                .desc()
            )
            .limit(5)
        )
    ).all()

    top_documents = [
        DocumentInsight(
            id=r.id,
            name=r.original_name,
            page_count=r.page_count,
            session_count=r.session_count,
            question_count=r.question_count,
        )
        for r in top_rows
    ]

    return InsightsResponse(
        document_count=doc_row.doc_count,
        total_pages=int(doc_row.total_pages),
        total_size_bytes=int(doc_row.total_size),
        session_count=session_count,
        question_count=question_count,
        top_documents=top_documents,
        member_since=current_user.created_at,
    )
