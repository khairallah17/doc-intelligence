"""Shared pytest fixtures for the Document Intelligence API test suite."""

import asyncio
import uuid
from collections.abc import AsyncGenerator
from typing import Generator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.database import Base, get_db
from app.db.models import DocStatus, Document
from app.main import app

# --- In-memory SQLite engine for tests (no Postgres needed) ---
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
_test_engine = create_async_engine(TEST_DB_URL, echo=False)
_TestSessionLocal = async_sessionmaker(
    bind=_test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Create all tables once per test session."""
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a transactional test session that rolls back after each test."""
    async with _TestSessionLocal() as session:
        yield session


@pytest.fixture
def client(db: AsyncSession) -> Generator[TestClient, None, None]:
    """TestClient with the database dependency overridden to use the test session."""

    async def _override_db():
        yield db

    app.dependency_overrides[get_db] = _override_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def test_user(client: TestClient) -> dict:
    """Register a test user and return the response JSON (includes tokens)."""
    resp = client.post(
        "/auth/register",
        json={
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "password123",
            "full_name": "Test User",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def auth_headers(test_user: dict) -> dict:
    """Authorization header dict for the registered test user."""
    return {"Authorization": f"Bearer {test_user['access_token']}"}


@pytest_asyncio.fixture
async def test_document(db: AsyncSession, test_user: dict, client: TestClient) -> Document:
    """
    Insert a Document row with status='ready' directly into the test DB.

    Uses a second registered user to obtain the user_id so we don't depend
    on the auth router returning the user's UUID.
    """
    from app.db.models import User
    from app.core.security import hash_password
    from sqlalchemy import select

    result = await db.execute(select(User))
    user = result.scalars().first()
    assert user is not None, "test_user fixture must run first"

    doc = Document(
        user_id=user.id,
        filename="test.pdf",
        original_name="test.pdf",
        file_size_bytes=1024,
        status=DocStatus.ready,
        storage_path="uploads/test.pdf",
        chroma_collection_id="testcollection",
        page_count=10,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc
