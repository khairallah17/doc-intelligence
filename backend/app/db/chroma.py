"""Async ChromaDB client singleton and collection helpers."""

from __future__ import annotations

import logging

import chromadb
from chromadb.api import AsyncClientAPI

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: AsyncClientAPI | None = None


async def get_chroma_client() -> AsyncClientAPI:
    """Return the shared async ChromaDB client, creating it on first call."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = await chromadb.AsyncHttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
        )
        logger.info(
            "ChromaDB client connected to %s:%s",
            settings.CHROMA_HOST,
            settings.CHROMA_PORT,
        )
    return _client


async def get_or_create_collection(collection_id: str):
    """Return the named ChromaDB collection, creating it if absent."""
    client = await get_chroma_client()
    return await client.get_or_create_collection(
        name=collection_id,
        metadata={"hnsw:space": "cosine"},
    )


async def delete_collection(collection_id: str) -> None:
    """Delete a ChromaDB collection, silently ignoring if it does not exist."""
    client = await get_chroma_client()
    try:
        await client.delete_collection(collection_id)
        logger.info("Deleted ChromaDB collection: %s", collection_id)
    except Exception:
        pass
