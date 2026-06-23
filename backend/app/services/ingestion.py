"""PDF ingestion pipeline: parse → chunk → embed → store in ChromaDB."""

import logging
import uuid
from datetime import datetime, timezone

import fitz  # PyMuPDF
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.chroma import get_or_create_collection
from app.db.models import DocStatus, Document
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)


async def process_document(doc_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Full ingestion pipeline for a single document.

    Steps:
      1. Fetch Document from DB and transition status to 'processing'.
      2. Retrieve local file path from the storage service.
      3. Parse text by page with PyMuPDF.
      4. Chunk text with RecursiveCharacterTextSplitter.
      5. Embed chunks with OpenAI and upsert to ChromaDB in batches.
      6. Update Document status to 'ready' with page count and collection id.

    On any error the document status is set to 'failed'.
    """
    settings = get_settings()
    document: Document | None = await db.get(Document, doc_id)
    if document is None:
        logger.error("process_document called with unknown doc_id=%s", doc_id)
        return

    try:
        document.status = DocStatus.processing
        await db.commit()

        storage = get_storage_service()
        local_path = await storage.get_local_path(document.storage_path)

        # --- Parse PDF ---
        pdf = fitz.open(local_path)
        page_count = len(pdf)
        raw_pages: list[dict] = []
        for page_num, page in enumerate(pdf, start=1):
            text = page.get_text()
            if text.strip():
                raw_pages.append({"text": text, "page": page_num})
        pdf.close()

        if not raw_pages:
            raise ValueError("PDF contains no extractable text")

        # --- Chunk ---
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        chunks: list[str] = []
        metadatas: list[dict] = []
        for page_data in raw_pages:
            for i, chunk in enumerate(splitter.split_text(page_data["text"])):
                chunks.append(chunk)
                metadatas.append(
                    {
                        "doc_id": str(doc_id),
                        "page_number": page_data["page"],
                        "chunk_index": i,
                    }
                )

        # --- Embed and upsert to ChromaDB ---
        embeddings_model = OpenAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            api_key=settings.OPENAI_API_KEY,
        )
        collection_id = f"doc{str(doc_id).replace('-', '')}"
        collection = await get_or_create_collection(collection_id)

        batch_size = 100
        for batch_start in range(0, len(chunks), batch_size):
            batch_chunks = chunks[batch_start : batch_start + batch_size]
            batch_meta = metadatas[batch_start : batch_start + batch_size]
            batch_ids = [
                f"{collection_id}_{batch_start + j}"
                for j in range(len(batch_chunks))
            ]
            vectors = await embeddings_model.aembed_documents(batch_chunks)
            await collection.add(
                embeddings=vectors,
                documents=batch_chunks,
                metadatas=batch_meta,
                ids=batch_ids,
            )
            logger.debug(
                "Upserted batch %d-%d for doc %s",
                batch_start,
                batch_start + len(batch_chunks),
                doc_id,
            )

        # --- Persist results ---
        document.status = DocStatus.ready
        document.page_count = page_count
        document.chroma_collection_id = collection_id
        document.processed_at = datetime.now(timezone.utc)
        await db.commit()
        logger.info("Document %s ingested successfully (%d pages)", doc_id, page_count)

    except Exception as exc:
        logger.error(
            "Ingestion failed for doc %s: %s", doc_id, exc, exc_info=True
        )
        document.status = DocStatus.failed
        await db.commit()
