"""Documents router: upload, list, retrieve, and delete PDFs."""

import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.exceptions import FileTooLargeError, InvalidFileTypeError
from app.core.security import get_current_user
from app.db.chroma import delete_collection
from app.db.database import get_db
from app.db.models import Document, DocStatus, User
from app.dependencies import get_user_document
from app.schemas.documents import DocumentResponse, UploadResponse
from app.services.ingestion import process_document
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a PDF document",
    description=(
        "Accept a PDF file, persist it to storage, create a Document record, "
        "and kick off background ingestion (chunking + embedding into ChromaDB)."
    ),
)
async def upload_document(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """Upload and begin processing a PDF."""
    settings = get_settings()

    if file.content_type != "application/pdf":
        raise InvalidFileTypeError()

    # Read size; FastAPI doesn't expose Content-Length reliably for multipart.
    content = await file.read()
    size_bytes = len(content)
    if size_bytes > settings.MAX_PDF_SIZE_MB * 1024 * 1024:
        raise FileTooLargeError(settings.MAX_PDF_SIZE_MB)

    # Re-wrap content so storage service can read it.
    import io
    file.file = io.BytesIO(content)  # type: ignore[assignment]
    file.size = size_bytes

    filename = f"{uuid.uuid4()}.pdf"
    storage = get_storage_service()
    storage_path = await storage.save(file, filename)

    doc = Document(
        user_id=current_user.id,
        filename=filename,
        original_name=file.filename or filename,
        file_size_bytes=size_bytes,
        status=DocStatus.uploading,
        storage_path=storage_path,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    background_tasks.add_task(process_document, doc.id, db)
    logger.info("Document %s queued for ingestion by user %s", doc.id, current_user.id)

    return UploadResponse(
        id=doc.id,
        original_name=doc.original_name,
        status=DocStatus.processing.value,
    )


@router.get(
    "",
    response_model=list[DocumentResponse],
    summary="List my documents",
    description="Return all documents owned by the authenticated user, newest first.",
)
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentResponse]:
    """Return the caller's document list."""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [DocumentResponse.model_validate(d) for d in docs]


@router.get(
    "/{doc_id}",
    response_model=DocumentResponse,
    summary="Get a document",
    description="Return metadata for a single document owned by the caller.",
)
async def get_document(
    doc: Document = Depends(get_user_document),
) -> DocumentResponse:
    """Return a single document record."""
    return DocumentResponse.model_validate(doc)


@router.delete(
    "/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document",
    description=(
        "Remove a document from storage, ChromaDB, and the database. "
        "Cascades to all associated chat sessions and messages."
    ),
)
async def delete_document(
    doc: Document = Depends(get_user_document),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a document and all associated data."""
    if doc.chroma_collection_id:
        await delete_collection(doc.chroma_collection_id)

    storage = get_storage_service()
    await storage.delete(doc.storage_path)

    await db.delete(doc)
    await db.commit()
    logger.info("Document %s deleted", doc.id)
