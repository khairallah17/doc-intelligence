# Document Intelligence Assistant — FastAPI Backend
> Claude Code Plan Mode · Implementation Plan

---

## Project overview

Build a production-ready FastAPI backend for a RAG-powered document intelligence API.
Users upload PDFs, the system chunks and embeds them into ChromaDB, and a LangChain
streaming chain answers questions with inline page citations.

---

## Tech stack

| Layer | Library | Version |
|---|---|---|
| API | fastapi | 0.115.0 |
| Server | uvicorn[standard] | 0.30.6 |
| ORM | sqlalchemy[asyncio] | 2.0.35 |
| DB driver | asyncpg | 0.29.0 |
| Migrations | alembic | 1.13.2 |
| Validation | pydantic + pydantic-settings | 2.9.2 / 2.5.2 |
| Auth | python-jose[cryptography] + passlib[bcrypt] | 3.3.0 / 1.7.4 |
| File upload | python-multipart | 0.0.12 |
| LLM chain | langchain + langchain-openai + langchain-community | 0.3.0 |
| Vector DB | chromadb | 0.5.11 |
| PDF parse | pymupdf | 1.24.10 |
| File storage | boto3 | 1.35.0 |
| HTTP client | httpx | 0.27.2 |
| Testing | pytest + pytest-asyncio | 8.3.3 / 0.24.0 |

---

## Target folder structure

```
doc-intelligence-backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── dependencies.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── documents.py
│   │   └── chat.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ingestion.py
│   │   ├── rag_chain.py
│   │   └── storage.py
│   ├── db/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── chroma.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── documents.py
│   │   └── chat.py
│   └── core/
│       ├── __init__.py
│       ├── security.py
│       └── exceptions.py
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 001_initial.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_documents.py
│   └── test_chat.py
├── .env.example
├── .gitignore
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Implementation tasks

Execute in strict order. Each task depends on the previous being complete and error-free.
Run `python -c "from app.main import app"` after each major task to catch import errors early.

---

### Task 1 — Scaffold and dependencies

**Files to create:** `requirements.txt`, `.gitignore`, `.env.example`, all `__init__.py` files

**Actions:**
- Create the full folder structure above
- Write `requirements.txt` with exact pinned versions from the tech stack table
- Write `.env.example` with all required keys (see environment variables section below)
- Write `.gitignore` — ignore `.env`, `__pycache__`, `*.pyc`, `uploads/`, `.pytest_cache/`, `chroma_data/`
- Create empty `__init__.py` in every package folder

**Verify:** `ls -R app/` shows correct tree with no missing folders

---

### Task 2 — Configuration (`app/config.py`)

**Spec:**
```python
class Settings(BaseSettings):
    DATABASE_URL: str
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    OPENAI_API_KEY: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = ""
    USE_LOCAL_STORAGE: bool = True
    LOCAL_UPLOAD_DIR: str = "uploads"
    MAX_PDF_SIZE_MB: int = 20
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 100
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    LLM_MODEL: str = "gpt-4o"
    TOP_K_RESULTS: int = 4
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env")

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

**Verify:** `python -c "from app.config import get_settings; print(get_settings())"` — loads without error (uses .env.example values)

---

### Task 3 — Database setup (`app/db/database.py` + `app/db/models.py`)

**`database.py` spec:**
- Create async SQLAlchemy engine using `DATABASE_URL` from settings
- Create `AsyncSessionLocal` sessionmaker
- Create `Base = declarative_base()`
- Implement `get_db()` async generator dependency yielding `AsyncSession`

**`models.py` spec — four ORM models:**

```
User:
  id: UUID primary key, default uuid4
  email: String, unique, indexed, not null
  hashed_password: String, not null
  full_name: String, not null
  created_at: DateTime, default utcnow
  is_active: Boolean, default True
  documents: relationship → Document (back_populates="owner")

Document:
  id: UUID primary key, default uuid4
  user_id: UUID ForeignKey("users.id"), ondelete CASCADE, indexed
  filename: String (stored name on disk/S3)
  original_name: String (user-facing name)
  page_count: Integer, nullable
  file_size_bytes: Integer
  status: Enum("uploading","processing","ready","failed"), default "uploading"
  storage_path: String
  chroma_collection_id: String, nullable
  created_at: DateTime, default utcnow
  processed_at: DateTime, nullable
  owner: relationship → User (back_populates="documents")
  sessions: relationship → ChatSession (back_populates="document")

ChatSession:
  id: UUID primary key, default uuid4
  user_id: UUID ForeignKey("users.id"), ondelete CASCADE, indexed
  document_id: UUID ForeignKey("documents.id"), ondelete CASCADE, indexed
  created_at: DateTime, default utcnow
  title: String, nullable
  messages: relationship → Message (back_populates="session")

Message:
  id: UUID primary key, default uuid4
  session_id: UUID ForeignKey("chat_sessions.id"), ondelete CASCADE, indexed
  role: Enum("user","assistant")
  content: Text
  sources: JSON, nullable  ← list of {page, chunk_text, score}
  created_at: DateTime, default utcnow
  session: relationship → ChatSession (back_populates="messages")
```

**Verify:** No import errors. All relationships resolvable.

---

### Task 4 — Security (`app/core/security.py`)

**Functions to implement:**

```python
def hash_password(password: str) -> str
  # bcrypt via passlib CryptContext

def verify_password(plain: str, hashed: str) -> bool

def create_access_token(data: dict) -> str
  # JWT, expiry = ACCESS_TOKEN_EXPIRE_MINUTES from settings
  # Always include "type": "access" in payload

def create_refresh_token(data: dict) -> str
  # JWT, expiry = REFRESH_TOKEN_EXPIRE_DAYS from settings
  # Always include "type": "refresh" in payload

def decode_token(token: str) -> dict
  # Raises HTTPException(401) on expired or invalid
  # Uses settings.SECRET_KEY and settings.ALGORITHM

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: AsyncSession = Depends(get_db)
) -> User
  # Decode token, look up User by sub (email), raise 401 if not found or inactive
```

**Verify:** Unit-test mentally: `hash_password("secret")` → non-empty string, `verify_password("secret", hash)` → True

---

### Task 5 — Custom exceptions (`app/core/exceptions.py`)

**Define:**
```python
class DocumentNotFoundError(HTTPException):
    def __init__(self): super().__init__(status_code=404, detail="Document not found")

class DocumentNotReadyError(HTTPException):
    def __init__(self): super().__init__(status_code=400, detail="Document is not ready for querying")

class DocumentOwnershipError(HTTPException):
    def __init__(self): super().__init__(status_code=403, detail="Access denied")

class FileTooLargeError(HTTPException):
    def __init__(self, max_mb: int): super().__init__(status_code=413, detail=f"File exceeds {max_mb}MB limit")

class InvalidFileTypeError(HTTPException):
    def __init__(self): super().__init__(status_code=422, detail="Only PDF files are accepted")
```

---

### Task 6 — Pydantic schemas (`app/schemas/`)

**`auth.py`:**
```python
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RefreshRequest(BaseModel):
    refresh_token: str
```

**`documents.py`:**
```python
class DocumentResponse(BaseModel):
    id: UUID
    original_name: str
    page_count: int | None
    file_size_bytes: int
    status: str
    created_at: datetime
    processed_at: datetime | None
    model_config = ConfigDict(from_attributes=True)

class UploadResponse(BaseModel):
    id: UUID
    original_name: str
    status: str
```

**`chat.py`:**
```python
class Source(BaseModel):
    page: int
    chunk_text: str
    score: float | None

class MessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    sources: list[Source] | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SessionResponse(BaseModel):
    id: UUID
    document_id: UUID
    created_at: datetime
    title: str | None
    model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)

class CreateSessionRequest(BaseModel):
    document_id: UUID
```

---

### Task 7 — Alembic setup + initial migration

**Actions:**
- Run `alembic init alembic`
- Edit `alembic/env.py`: import `Base` from `app.db.models`, set `target_metadata = Base.metadata`, configure async engine
- Run `alembic revision --autogenerate -m "initial"` to generate `001_initial.py`
- Verify migration creates all four tables with correct columns and constraints

**Verify:** `alembic upgrade head` runs without errors against a local Postgres instance

---

### Task 8 — Auth router (`app/routers/auth.py`)

**Endpoints:**

```
POST /auth/register
  - Check email uniqueness → 409 if taken
  - Hash password
  - Create User in DB
  - Return LoginResponse (access + refresh tokens)

POST /auth/login
  - Accept OAuth2PasswordRequestForm
  - Look up user by email → 401 if not found
  - verify_password → 401 if wrong
  - Return LoginResponse

POST /auth/refresh
  - Decode refresh token, verify type == "refresh"
  - Return new access_token only

GET /auth/me
  - Depends(get_current_user)
  - Return UserResponse
```

**Verify:** `POST /auth/register` then `GET /auth/me` with returned token returns user data

---

### Task 9 — ChromaDB client (`app/db/chroma.py`)

**Spec:**
```python
import chromadb
from app.config import get_settings

_client: chromadb.AsyncHttpClient | None = None

async def get_chroma_client() -> chromadb.AsyncHttpClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = await chromadb.AsyncHttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT
        )
    return _client

async def get_or_create_collection(collection_id: str):
    client = await get_chroma_client()
    return await client.get_or_create_collection(
        name=collection_id,
        metadata={"hnsw:space": "cosine"}
    )

async def delete_collection(collection_id: str):
    client = await get_chroma_client()
    try:
        await client.delete_collection(collection_id)
    except Exception:
        pass  # Collection may not exist
```

---

### Task 10 — Storage service (`app/services/storage.py`)

**Implement two backends behind one interface:**

```python
class StorageService:
    async def save(self, file: UploadFile, destination: str) -> str:
        """Save file, return storage path"""

    async def delete(self, storage_path: str) -> None:
        """Delete file from storage"""

    async def get_local_path(self, storage_path: str) -> str:
        """Return local path for reading (downloads from S3 if needed)"""

class LocalStorageService(StorageService):
    # Saves to settings.LOCAL_UPLOAD_DIR/{destination}
    # get_local_path returns the path directly

class S3StorageService(StorageService):
    # Uses boto3 to upload/delete from settings.AWS_BUCKET_NAME
    # get_local_path downloads to /tmp/ and returns temp path

def get_storage_service() -> StorageService:
    # Returns LocalStorageService if USE_LOCAL_STORAGE else S3StorageService
```

---

### Task 11 — Ingestion service (`app/services/ingestion.py`)

**Implement `process_document(doc_id: UUID, db: AsyncSession)`:**

```
Step 1 — Fetch Document from DB, update status to "processing"

Step 2 — Get local file path from storage service

Step 3 — Parse PDF with PyMuPDF:
  doc = fitz.open(local_path)
  page_count = len(doc)
  raw_pages = []
  for page_num, page in enumerate(doc, start=1):
      text = page.get_text()
      if text.strip():
          raw_pages.append({"text": text, "page": page_num})

Step 4 — Chunk with LangChain:
  splitter = RecursiveCharacterTextSplitter(
      chunk_size=settings.CHUNK_SIZE,
      chunk_overlap=settings.CHUNK_OVERLAP,
      separators=["\n\n", "\n", ". ", " ", ""]
  )
  chunks = []
  metadatas = []
  for page_data in raw_pages:
      page_chunks = splitter.split_text(page_data["text"])
      for i, chunk in enumerate(page_chunks):
          chunks.append(chunk)
          metadatas.append({
              "doc_id": str(doc_id),
              "page_number": page_data["page"],
              "chunk_index": i
          })

Step 5 — Embed and store in ChromaDB:
  embeddings = OpenAIEmbeddings(model=settings.EMBEDDING_MODEL)
  collection_id = f"doc{str(doc_id).replace('-', '')}"
  collection = await get_or_create_collection(collection_id)
  batch_size = 100  # avoid ChromaDB request size limits
  for i in range(0, len(chunks), batch_size):
      batch_chunks = chunks[i:i+batch_size]
      batch_meta = metadatas[i:i+batch_size]
      batch_ids = [f"{collection_id}_{i+j}" for j in range(len(batch_chunks))]
      vectors = await embeddings.aembed_documents(batch_chunks)
      await collection.add(
          embeddings=vectors,
          documents=batch_chunks,
          metadatas=batch_meta,
          ids=batch_ids
      )

Step 6 — Update Document in DB:
  document.status = "ready"
  document.page_count = page_count
  document.chroma_collection_id = collection_id
  document.processed_at = datetime.utcnow()
  await db.commit()

Error handling:
  wrap entire flow in try/except Exception as e:
      document.status = "failed"
      await db.commit()
      logger.error(f"Ingestion failed for doc {doc_id}: {e}", exc_info=True)
```

---

### Task 12 — Documents router (`app/routers/documents.py`)

**Endpoints:**

```
POST /documents/upload
  - Validate: file.content_type == "application/pdf" → InvalidFileTypeError
  - Validate: file.size ≤ MAX_PDF_SIZE_MB * 1024 * 1024 → FileTooLargeError
  - Save to storage with unique filename: f"{uuid4()}.pdf"
  - Create Document record in DB with status="uploading"
  - Add BackgroundTasks: background_tasks.add_task(process_document, doc.id, db)
  - Return UploadResponse (id, original_name, status="processing")

GET /documents
  - Return list of current user's documents, ordered by created_at DESC
  - Exclude failed documents older than 24h (optional cleanup)

GET /documents/{doc_id}
  - Validate user owns doc → DocumentOwnershipError
  - Return DocumentResponse

DELETE /documents/{doc_id}
  - Validate user owns doc → DocumentOwnershipError
  - Delete ChromaDB collection if chroma_collection_id exists
  - Delete from storage
  - Delete from DB (cascade deletes sessions + messages)
  - Return 204
```

**Ownership check helper (put in `app/dependencies.py`):**
```python
async def get_user_document(
    doc_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Document:
    doc = await db.get(Document, doc_id)
    if not doc:
        raise DocumentNotFoundError()
    if doc.user_id != current_user.id:
        raise DocumentOwnershipError()
    return doc
```

---

### Task 13 — RAG chain service (`app/services/rag_chain.py`)

**Implement `stream_rag_response(...)` as async generator:**

```python
async def stream_rag_response(
    doc_id: UUID,
    chroma_collection_id: str,
    question: str,
    session_id: UUID,
    db: AsyncSession
) -> AsyncGenerator[str, None]:

    # Step 1 — Load ChromaDB collection
    collection = await get_or_create_collection(chroma_collection_id)

    # Step 2 — Embed the question and retrieve top-k chunks
    embeddings = OpenAIEmbeddings(model=settings.EMBEDDING_MODEL)
    query_vector = await embeddings.aembed_query(question)
    results = await collection.query(
        query_embeddings=[query_vector],
        n_results=settings.TOP_K_RESULTS,
        include=["documents", "metadatas", "distances"]
    )
    retrieved_docs = results["documents"][0]      # list of chunk texts
    retrieved_metas = results["metadatas"][0]     # list of metadata dicts
    retrieved_scores = results["distances"][0]    # cosine distances

    # Step 3 — Build prompt
    context = "\n\n".join([
        f"[Page {meta['page_number']}]\n{doc}"
        for doc, meta in zip(retrieved_docs, retrieved_metas)
    ])

    system_prompt = (
        "You are a document analysis assistant. "
        "Answer the user's question using ONLY the provided context. "
        "Always cite sources inline using [Page X] format after each relevant claim. "
        "If the answer is not in the context, say: "
        "'I could not find information about this in the document.'"
    )

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Context:\n{context}\n\nQuestion: {question}")
    ]

    # Step 4 — Stream from OpenAI
    llm = ChatOpenAI(
        model=settings.LLM_MODEL,
        streaming=True,
        temperature=0
    )

    full_response = ""
    async for chunk in llm.astream(messages):
        token = chunk.content
        full_response += token
        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

    # Step 5 — Persist messages to DB
    user_msg = Message(
        session_id=session_id,
        role="user",
        content=question
    )
    sources = [
        {
            "page": meta["page_number"],
            "chunk_text": doc[:200],
            "score": round(float(score), 4)
        }
        for doc, meta, score in zip(retrieved_docs, retrieved_metas, retrieved_scores)
    ]
    assistant_msg = Message(
        session_id=session_id,
        role="assistant",
        content=full_response,
        sources=sources
    )
    db.add(user_msg)
    db.add(assistant_msg)
    await db.commit()

    # Step 6 — Send sources event then done
    yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
    yield "data: [DONE]\n\n"
```

---

### Task 14 — Chat router (`app/routers/chat.py`)

**Endpoints:**

```
POST /chat/sessions
  Body: CreateSessionRequest { document_id }
  - Validate user owns document → DocumentOwnershipError
  - Validate document.status == "ready" → DocumentNotReadyError
  - Create ChatSession in DB
  - Return SessionResponse

GET /chat/sessions
  - Return user's sessions, newest first
  - Include document original_name via join

GET /chat/sessions/{session_id}/messages
  - Validate user owns session
  - Return list of MessageResponse ordered by created_at ASC

POST /chat/sessions/{session_id}/stream
  Body: ChatRequest { question }
  - Validate user owns session
  - Fetch session's document, verify still "ready"
  - Return StreamingResponse(
        stream_rag_response(...),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

DELETE /chat/sessions/{session_id}
  - Validate user owns session
  - Delete session (cascade deletes messages)
  - Return 204
```

---

### Task 15 — App entry point (`app/main.py`)

**Spec:**
```python
app = FastAPI(
    title="Document Intelligence Assistant",
    description="RAG-powered PDF Q&A API with streaming responses",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Exception handlers
@app.exception_handler(RequestValidationError)
# → return 422 with field-level error messages, not raw Pydantic output

@app.exception_handler(Exception)
# → log full traceback, return 500 {"detail": "Internal server error"}
# NEVER expose exception message to client in production

# Routers
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(documents_router, prefix="/documents", tags=["Documents"])
app.include_router(chat_router, prefix="/chat", tags=["Chat"])

# Health check
@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
```

---

### Task 16 — Docker setup

**`Dockerfile`:**
```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p uploads
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

**`docker-compose.yml`:**
```yaml
version: "3.9"

services:
  api:
    build: .
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      chroma:
        condition: service_started
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: docai
      POSTGRES_USER: docai
      POSTGRES_PASSWORD: docai
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U docai"]
      interval: 5s
      timeout: 5s
      retries: 5

  chroma:
    image: chromadb/chroma:0.5.11
    ports:
      - "8001:8001"
    volumes:
      - chroma_data:/chroma/chroma
    restart: unless-stopped

volumes:
  postgres_data:
  chroma_data:
```

---

### Task 17 — Tests

**`tests/conftest.py`:**
```python
# Fixtures:
# - engine: async SQLite in-memory engine with Base.metadata.create_all
# - db: AsyncSession from test engine
# - client: TestClient with get_db overridden
# - test_user: creates user via POST /auth/register
# - auth_headers: {"Authorization": "Bearer <token>"} for test_user
# - test_document: Document row with status="ready", chroma_collection_id set
```

**`tests/test_auth.py`:**
```
test_register_success → 200, returns tokens
test_register_duplicate_email → 409
test_login_success → 200, returns tokens
test_login_wrong_password → 401
test_me_requires_auth → 401 without token
test_me_returns_user_data → 200 with valid token
```

**`tests/test_documents.py`:**
```
test_upload_pdf_success → 200, status="processing"
test_upload_non_pdf → 422
test_upload_too_large → 413
test_list_returns_only_user_docs → user A cannot see user B docs
test_delete_removes_from_chroma → mock ChromaDB, assert delete_collection called
test_get_document_wrong_user → 403
```

**`tests/test_chat.py`:**
```
test_create_session_requires_ready_doc → 400 for status="processing"
test_create_session_wrong_user → 403
test_stream_returns_event_stream → Content-Type: text/event-stream
test_messages_saved_after_stream → user + assistant rows in DB
test_sources_in_final_event → last SSE event has type="sources"
test_delete_session → 204, messages cascade deleted
```

---

### Task 18 — README.md

**Sections to include:**
1. Project overview (3 sentences)
2. Architecture diagram (ASCII)
3. Prerequisites
4. Local setup (step by step)
5. API reference table (method, path, auth, description)
6. Running tests
7. Environment variables reference

---

## Environment variables reference (`.env.example`)

```env
# Database
DATABASE_URL=postgresql+asyncpg://docai:docai@localhost:5432/docai

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8001

# OpenAI
OPENAI_API_KEY=sk-...

# Auth
SECRET_KEY=your-secret-key-minimum-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Storage
USE_LOCAL_STORAGE=true
LOCAL_UPLOAD_DIR=uploads
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=

# Limits
MAX_PDF_SIZE_MB=20
CHUNK_SIZE=800
CHUNK_OVERLAP=100
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4o
TOP_K_RESULTS=4

# CORS
CORS_ORIGINS=["http://localhost:3000"]
```

---

## Quality requirements

Apply to every file without exception:

- All functions and classes have docstrings
- All route handlers have FastAPI `summary=` and `description=` fields
- No hardcoded strings — all config via `get_settings()`
- All DB operations are async (`async with`, `await session.execute(...)`)
- No `print()` — use `logging.getLogger(__name__)` throughout
- All UUID route parameters verify ownership before any DB mutation (no IDOR)
- Background tasks must not block the HTTP response
- Streaming endpoint handles client disconnect via `asyncio.CancelledError`
- Never expose raw exception messages in HTTP responses

---

## Verification checklist

Run after completing all tasks:

```bash
# 1 — Docker stack starts clean
docker-compose up --build -d

# 2 — Migrations run
docker-compose exec api alembic upgrade head

# 3 — Health endpoint responds
curl http://localhost:8000/health

# 4 — OpenAPI docs render
open http://localhost:8000/docs

# 5 — Full test suite passes
docker-compose exec api pytest tests/ -v --tb=short

# 6 — Manual smoke test
# Register → login → upload PDF → poll status until ready → create session → stream question
```

---

## SSE wire format reference

Every token during streaming:
```
data: {"type": "token", "content": "Hello"}\n\n
```

Final sources event:
```
data: {"type": "sources", "sources": [{"page": 4, "chunk_text": "...", "score": 0.87}]}\n\n
```

Stream end sentinel:
```
data: [DONE]\n\n
```
