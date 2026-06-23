# Document Intelligence Assistant — FastAPI Backend

RAG-powered PDF Q&A API. Users upload PDFs, the system chunks and embeds them into ChromaDB, and a LangChain streaming chain answers questions with inline page citations. All responses are streamed over Server-Sent Events.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js Frontend (port 3000)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP / SSE
┌──────────────────────▼──────────────────────────────────────┐
│  FastAPI API  (port 8000)                                   │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────────┐ │
│  │ /auth    │  │ /documents│  │ /chat                    │ │
│  └──────────┘  └─────┬─────┘  └────────────┬─────────────┘ │
│                      │ BackgroundTask        │ StreamingResp │
│          ┌───────────▼──────────┐  ┌────────▼────────────┐  │
│          │  Ingestion Service   │  │  RAG Chain Service  │  │
│          │  PyMuPDF + LangChain │  │  LangChain + OpenAI │  │
│          └───────────┬──────────┘  └────────┬────────────┘  │
└──────────────────────┼──────────────────────┼───────────────┘
                       │                      │
          ┌────────────▼────────┐  ┌──────────▼──────────────┐
          │  ChromaDB (8001)    │  │  PostgreSQL (5432)       │
          │  Vector store       │  │  Users, Documents,       │
          └─────────────────────┘  │  ChatSessions, Messages  │
                                   └─────────────────────────-┘
```

## Prerequisites

- Docker & Docker Compose
- An OpenAI API key (`sk-...`)

## Local Setup

```bash
# 1 — Clone and enter the backend directory
cd doc-intelligence/backend

# 2 — Copy the environment template and fill in required values
cp .env.example .env
# Edit .env: set OPENAI_API_KEY and SECRET_KEY (min 32 chars)

# 3 — Start the full stack
docker-compose up --build -d

# 4 — Run database migrations
docker-compose exec api alembic upgrade head

# 5 — Verify the API is healthy
curl http://localhost:8000/health

# 6 — Browse interactive docs
open http://localhost:8000/docs
```

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register a new account; returns tokens |
| POST | `/auth/login` | — | Login with email + password; returns tokens |
| POST | `/auth/refresh` | — | Exchange refresh token for new access token |
| GET | `/auth/me` | Bearer | Return current user profile |
| POST | `/documents/upload` | Bearer | Upload a PDF (multipart); triggers background ingestion |
| GET | `/documents` | Bearer | List owned documents |
| GET | `/documents/{id}` | Bearer | Get a single document |
| DELETE | `/documents/{id}` | Bearer | Delete document + storage + ChromaDB collection |
| POST | `/chat/sessions` | Bearer | Create a chat session for a ready document |
| GET | `/chat/sessions` | Bearer | List owned chat sessions |
| GET | `/chat/sessions/{id}/messages` | Bearer | Get message history for a session |
| POST | `/chat/sessions/{id}/stream` | Bearer | Stream a RAG answer (SSE) |
| DELETE | `/chat/sessions/{id}` | Bearer | Delete session and its messages |
| GET | `/health` | — | Service health check |

## SSE Wire Format

```
# During streaming (one per token)
data: {"type": "token", "content": "Hello"}\n\n

# After full response (source citations)
data: {"type": "sources", "sources": [{"page": 4, "chunk_text": "...", "score": 0.87}]}\n\n

# Stream terminator
data: [DONE]\n\n
```

## Running Tests

```bash
# Inside the running api container
docker-compose exec api pytest tests/ -v --tb=short

# Or locally with a virtual environment
pip install -r requirements.txt
DATABASE_URL=sqlite+aiosqlite:///:memory: pytest tests/ -v
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | Async SQLAlchemy connection string (asyncpg or aiosqlite) |
| `CHROMA_HOST` | `localhost` | ChromaDB server hostname |
| `CHROMA_PORT` | `8001` | ChromaDB server port |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `SECRET_KEY` | — | JWT signing secret (≥ 32 chars) |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `USE_LOCAL_STORAGE` | `true` | Use local disk instead of S3 |
| `LOCAL_UPLOAD_DIR` | `uploads` | Directory for local PDF storage |
| `AWS_ACCESS_KEY_ID` | `""` | AWS credentials (S3 mode only) |
| `AWS_SECRET_ACCESS_KEY` | `""` | AWS credentials (S3 mode only) |
| `AWS_BUCKET_NAME` | `""` | S3 bucket name (S3 mode only) |
| `MAX_PDF_SIZE_MB` | `20` | Maximum upload size in MB |
| `CHUNK_SIZE` | `800` | LangChain text splitter chunk size |
| `CHUNK_OVERLAP` | `100` | LangChain text splitter overlap |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model |
| `LLM_MODEL` | `gpt-4o` | OpenAI chat model |
| `TOP_K_RESULTS` | `4` | Number of chunks retrieved per query |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins |
