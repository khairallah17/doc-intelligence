"""Chat router: session management and streaming RAG Q&A."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    DocumentNotFoundError,
    DocumentNotReadyError,
    DocumentOwnershipError,
)
from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import ChatSession, Document, DocStatus, Message, MessageRole, User
from app.schemas.chat import (
    ChatRequest,
    CreateSessionRequest,
    MessageResponse,
    SessionResponse,
    Source,
)
from app.services.rag_chain import stream_rag_response

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_user_session(
    session_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> ChatSession:
    """Fetch a ChatSession and verify that *current_user* owns it."""
    session: ChatSession | None = await db.get(ChatSession, session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )
    if session.user_id != current_user.id:
        raise DocumentOwnershipError()
    return session


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a chat session",
    description="Open a new conversation thread linked to a ready document.",
)
async def create_session(
    body: CreateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """Create a new chat session for an owned, ready document."""
    doc: Document | None = await db.get(Document, body.document_id)
    if doc is None:
        raise DocumentNotFoundError()
    if doc.user_id != current_user.id:
        raise DocumentOwnershipError()
    if doc.status != DocStatus.ready:
        raise DocumentNotReadyError()

    session = ChatSession(
        user_id=current_user.id,
        document_id=doc.id,
        title=f"Session — {doc.original_name}",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionResponse.model_validate(session)


@router.get(
    "/sessions",
    response_model=list[SessionResponse],
    summary="List chat sessions",
    description="Return chat sessions for the user, newest first. Filter by document_id if provided.",
)
async def list_sessions(
    document_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SessionResponse]:
    """Return the caller's chat sessions, optionally filtered by document."""
    query = (
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
    )
    if document_id is not None:
        query = query.where(ChatSession.document_id == document_id)
    result = await db.execute(query)
    sessions = result.scalars().all()
    return [SessionResponse.model_validate(s) for s in sessions]


@router.get(
    "/sessions/{session_id}/messages",
    response_model=list[MessageResponse],
    summary="Get session messages",
    description="Return the full message history for a session, oldest first.",
)
async def get_messages(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MessageResponse]:
    """Return messages for an owned session."""
    await _get_user_session(session_id, current_user, db)
    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    def _build_response(m: Message) -> MessageResponse:
        sources = None
        if m.sources:
            sources = [Source(**s) for s in m.sources]
        return MessageResponse(
            id=m.id,
            role=m.role.value,
            content=m.content,
            sources=sources,
            created_at=m.created_at,
        )

    return [_build_response(m) for m in messages]


@router.post(
    "/sessions/{session_id}/stream",
    summary="Stream a RAG answer",
    description=(
        "Send a question to the RAG chain and receive a Server-Sent Events stream. "
        "Events: token chunks, a final sources event, then [DONE]."
    ),
)
async def stream_answer(
    session_id: uuid.UUID,
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Stream the RAG response for a question in an owned, active session."""
    session = await _get_user_session(session_id, current_user, db)

    doc: Document | None = await db.get(Document, session.document_id)
    if doc is None:
        raise DocumentNotFoundError()
    if doc.status != DocStatus.ready:
        raise DocumentNotReadyError()
    if doc.chroma_collection_id is None:
        raise DocumentNotReadyError()

    generator = stream_rag_response(
        doc_id=doc.id,
        chroma_collection_id=doc.chroma_collection_id,
        question=body.question,
        session_id=session_id,
        db=db,
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a chat session",
    description="Remove a session and all its messages (cascade).",
)
async def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete an owned chat session and its messages."""
    session = await _get_user_session(session_id, current_user, db)
    await db.delete(session)
    await db.commit()
    logger.info("Session %s deleted by user %s", session_id, current_user.id)
