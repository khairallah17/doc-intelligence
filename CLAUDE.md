# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Lexicon — Document Intelligence

Full-stack RAG SaaS: upload PDFs, index them into a vector DB, and chat with them via streaming AI responses with inline citations. Two screens: Library (upload/manage) and Chat (Q&A).

---

## Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS — `frontend/`
- **Backend**: FastAPI (async), PostgreSQL, ChromaDB, OpenAI — `backend/`
- **Infra**: Docker Compose runs all three backend services together

---

## Running the stack

### Backend (Docker)
```bash
cd backend
docker compose up -d           # starts api (port 8000), postgres (5433), chroma (8001)
docker compose exec api alembic upgrade head   # run after first start or new migration
docker compose logs api -f     # tail logs
docker compose build api && docker compose up -d api   # rebuild after Python changes
```

### Frontend (local)
```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
```

### Backend tests (SQLite in-memory, no Docker needed)
```bash
cd backend
pip install -r requirements.txt    # or activate venv
pytest                             # all tests
pytest tests/test_auth.py          # single file
pytest -k "test_register"          # single test by name
```

---

## Backend architecture

```
backend/
  app/
    config.py          # Pydantic Settings, @lru_cache singleton, reads .env
    main.py            # FastAPI app, CORS, exception handlers, router registration
    dependencies.py    # get_user_document() — ownership-checked doc fetch
    db/
      database.py      # async engine + AsyncSessionLocal + get_db() dependency
      models.py        # SQLAlchemy ORM: User, Document, ChatSession, Message
      chroma.py        # lazy ChromaDB AsyncHttpClient singleton
    core/
      security.py      # bcrypt hash/verify, JWT mint/decode, get_current_user dep
      exceptions.py    # HTTPException subclasses (404, 403, 409, etc.)
    routers/           # one file per resource group, all auth-gated
    schemas/           # Pydantic v2 request/response models
    services/
      storage.py       # StorageService ABC → LocalStorageService / S3StorageService
      ingestion.py     # BackgroundTask: PyMuPDF → chunk → embed → ChromaDB upsert
      rag_chain.py     # async generator: embed query → ChromaDB retrieve → ChatOpenAI stream → SSE
```

**Key wiring:**
- `get_db()` yields an `AsyncSession`; it is injected into every route and into `process_document` (background task).
- `get_current_user` decodes the Bearer token and returns the `User` ORM object; every protected route depends on it.
- `stream_rag_response()` is an async generator that yields raw SSE strings (`data: {...}\n\n`). It is returned directly as a `StreamingResponse` with `media_type="text/event-stream"`.
- All `DateTime` columns use `DateTime(timezone=True)` (TIMESTAMPTZ). Always use `datetime.now(timezone.utc)` when setting timestamps in Python code.

**Migrations:**
- Alembic with async engine; migration scripts live in `alembic/versions/`.
- After changing any ORM model, write a new migration in `alembic/versions/NNN_description.py` (hand-authored; increment the revision number).
- Always run `docker compose exec api alembic upgrade head` after adding a migration.

**Docker networking:**
- Container-to-container: `DATABASE_URL=postgresql+asyncpg://docai:docai@postgres:5432/docai`, `CHROMA_HOST=chroma`, `CHROMA_PORT=8000`.
- These are set as `environment:` overrides in `docker-compose.yml` and take precedence over `.env`.
- `.env` keeps `localhost` values for running the API outside Docker.

---

## Frontend architecture

```
frontend/
  app/
    page.tsx           # Library page: doc list, upload, status polling
    chat/page.tsx      # Chat page: session management, SSE stream reader
    login/page.tsx     # Login / register toggle
    layout.tsx         # Wraps all pages in AuthProvider + AuthGuard
  components/
    library/           # DocCard, UploadZone, UploadRow, StatusBadge, EmptyState
    chat/              # ChatSidebar, CitationDrawer, CitationPill, Message,
                       # StreamingMessage, Composer, DocHeader, ThreadIntro, AssistantAvatar
    top-bar.tsx        # Shared nav bar with optional rightSlot
    auth-guard.tsx     # Redirects unauthenticated → /login; authenticated away from /login
  lib/
    api.ts             # All fetch calls: apiFetch (auth + retry), apiGet/Post/Del/Upload, streamChat
    auth-context.tsx   # AuthProvider + useAuth() — tokens in localStorage, rehydrates via /auth/me
    adapters.ts        # Pure shape converters: docFromApi, citationFromSource, messageFromApi
    types.ts           # Frontend-only types: DocRecord, Citation, Message, UploadState
```

**Key patterns:**
- All API calls go through `apiFetch` in `api.ts`, which injects the Bearer token and silently retries on 401 by exchanging the refresh token.
- Backend shapes are never used directly in components. `adapters.ts` converts them to frontend types before touching state.
- `citationRegistry: Record<string, Citation>` is held in React state on the chat page. Citation IDs are synthetic: `src-{msgId}-{idx}`. The registry is populated both from historical messages (`GET /sessions/{id}/messages`) and from SSE `type=sources` events during streaming.
- SSE stream is consumed with a `ReadableStream` reader + `TextDecoder`. Frame types: `token` (append to streaming text), `sources` (finalize message + populate registry), `[DONE]` (clear streaming state).

**Design tokens** (Tailwind custom colors, defined in `tailwind.config.ts`):
- `ink-{0..6}` — dark backgrounds (near-black to dark grey)
- `fog-{0..5}` — text/foreground (near-white to mid-grey)
- `iris` — primary accent (purple-blue, `#7c89ff`)
- `mint` — success/green accent
- `amber` — warning accent
- `hairline` / `hairline-strong` — utility border classes defined in `globals.css`

---

## SSE wire format

```
data: {"type":"token","content":"..."}   # one per streamed word/token
data: {"type":"sources","sources":[...]} # after full response; sources shape matches backend Source schema
data: [DONE]                             # stream terminator
```

---

## Environment variables

Key variables (see `backend/.env.example` for the full list):

| Variable | Where used |
|---|---|
| `DATABASE_URL` | SQLAlchemy async engine |
| `CHROMA_HOST` / `CHROMA_PORT` | ChromaDB client (overridden in docker-compose for container networking) |
| `OPENAI_API_KEY` | Embeddings + LLM |
| `SECRET_KEY` | JWT signing (min 32 chars) |
| `NEXT_PUBLIC_API_URL` | Frontend base URL for API calls (`frontend/.env.local`) |
