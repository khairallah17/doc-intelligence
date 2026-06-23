"""FastAPI application entry point."""

import logging
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import auth, chat, documents
from app.routers import collections, insights

logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(
    title="Document Intelligence Assistant",
    description="RAG-powered PDF Q&A API with streaming responses",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Exception handlers ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return field-level validation errors as a structured 422 response."""
    errors = [
        {
            "field": " → ".join(str(loc) for loc in err["loc"]),
            "message": err["msg"],
        }
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": errors},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Log full traceback for unexpected errors; never leak internals to client."""
    logger.error(
        "Unhandled exception on %s %s", request.method, request.url, exc_info=True
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# --- Routers ---
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(documents.router, prefix="/documents", tags=["Documents"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(collections.router, prefix="/collections", tags=["Collections"])
app.include_router(insights.router, prefix="/insights", tags=["Insights"])


# --- Health check ---
@app.get("/health", tags=["Health"], summary="Health check")
async def health() -> dict:
    """Return service status and current UTC timestamp."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
