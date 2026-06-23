"""Streaming RAG chain: retrieve → generate → persist → yield SSE events."""

import asyncio
import json
import logging
import uuid
from collections.abc import AsyncGenerator

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.chroma import get_or_create_collection
from app.db.models import Message, MessageRole

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are a document analysis assistant. "
    "Answer the user's question using ONLY the provided context. "
    "Always cite sources inline using [Page X] format after each relevant claim. "
    "If the answer is not in the context, say: "
    "'I could not find information about this in the document.'"
)


async def stream_rag_response(
    doc_id: uuid.UUID,
    chroma_collection_id: str,
    question: str,
    session_id: uuid.UUID,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    """
    Async generator that drives the full RAG pipeline and yields SSE frames.

    Yields:
        SSE data frames:
          - ``data: {"type": "token", "content": "<text>"}``  (one per streamed token)
          - ``data: {"type": "sources", "sources": [...]}``    (after full response)
          - ``data: [DONE]``                                    (stream terminator)
    """
    settings = get_settings()

    try:
        # --- Retrieve ---
        collection = await get_or_create_collection(chroma_collection_id)
        embeddings_model = OpenAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            api_key=settings.OPENAI_API_KEY,
        )
        query_vector = await embeddings_model.aembed_query(question)
        results = await collection.query(
            query_embeddings=[query_vector],
            n_results=settings.TOP_K_RESULTS,
            include=["documents", "metadatas", "distances"],
        )
        retrieved_docs: list[str] = results["documents"][0]
        retrieved_metas: list[dict] = results["metadatas"][0]
        retrieved_scores: list[float] = results["distances"][0]

        # --- Build prompt ---
        context = "\n\n".join(
            f"[Page {meta['page_number']}]\n{doc}"
            for doc, meta in zip(retrieved_docs, retrieved_metas)
        )
        messages = [
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(content=f"Context:\n{context}\n\nQuestion: {question}"),
        ]

        # --- Stream LLM response ---
        llm = ChatOpenAI(
            model=settings.LLM_MODEL,
            streaming=True,
            temperature=0,
            api_key=settings.OPENAI_API_KEY,
        )
        full_response = ""
        async for chunk in llm.astream(messages):
            token: str = chunk.content  # type: ignore[assignment]
            full_response += token
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        # --- Persist messages ---
        sources = [
            {
                "page": meta["page_number"],
                "chunk_text": doc[:200],
                "score": round(float(score), 4),
            }
            for doc, meta, score in zip(
                retrieved_docs, retrieved_metas, retrieved_scores
            )
        ]
        user_msg = Message(
            session_id=session_id,
            role=MessageRole.user,
            content=question,
        )
        assistant_msg = Message(
            session_id=session_id,
            role=MessageRole.assistant,
            content=full_response,
            sources=sources,
        )
        db.add(user_msg)
        db.add(assistant_msg)
        await db.commit()

        # --- Sources + done ---
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
        yield "data: [DONE]\n\n"

    except asyncio.CancelledError:
        logger.info("Client disconnected during streaming for session %s", session_id)
        raise
    except Exception as exc:
        logger.error(
            "RAG chain error for session %s: %s", session_id, exc, exc_info=True
        )
        yield f"data: {json.dumps({'type': 'error', 'detail': 'Streaming error'})}\n\n"
        yield "data: [DONE]\n\n"
