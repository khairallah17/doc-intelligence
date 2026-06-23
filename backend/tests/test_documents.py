"""Tests for the /documents router."""

import io
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.db.models import Document


def _pdf_bytes(size: int = 512) -> bytes:
    """Minimal valid-ish PDF bytes (FastAPI only checks content-type in tests)."""
    return b"%PDF-1.4 " + b"A" * size


def test_upload_pdf_success(client: TestClient, auth_headers: dict) -> None:
    """A valid PDF upload returns 202 with status 'processing'."""
    with patch(
        "app.routers.documents.process_document", new_callable=AsyncMock
    ):
        resp = client.post(
            "/documents/upload",
            headers=auth_headers,
            files={"file": ("report.pdf", _pdf_bytes(), "application/pdf")},
        )
    assert resp.status_code == 202
    body = resp.json()
    assert body["original_name"] == "report.pdf"
    assert body["status"] == "processing"


def test_upload_non_pdf(client: TestClient, auth_headers: dict) -> None:
    """Uploading a non-PDF returns 422."""
    resp = client.post(
        "/documents/upload",
        headers=auth_headers,
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 422


def test_upload_too_large(client: TestClient, auth_headers: dict) -> None:
    """Uploading a file larger than MAX_PDF_SIZE_MB returns 413."""
    big = b"%PDF-1.4 " + b"A" * (21 * 1024 * 1024)
    with patch(
        "app.routers.documents.process_document", new_callable=AsyncMock
    ):
        resp = client.post(
            "/documents/upload",
            headers=auth_headers,
            files={"file": ("big.pdf", big, "application/pdf")},
        )
    assert resp.status_code == 413


def test_list_returns_only_user_docs(client: TestClient, auth_headers: dict) -> None:
    """A user's document list does not include another user's documents."""
    # Register a second user and upload a doc as them.
    email2 = f"user2_{uuid.uuid4().hex[:8]}@example.com"
    resp2 = client.post(
        "/auth/register",
        json={"email": email2, "password": "password123", "full_name": "Bob"},
    )
    headers2 = {"Authorization": f"Bearer {resp2.json()['access_token']}"}

    with patch(
        "app.routers.documents.process_document", new_callable=AsyncMock
    ):
        client.post(
            "/documents/upload",
            headers=headers2,
            files={"file": ("bob.pdf", _pdf_bytes(), "application/pdf")},
        )

    resp = client.get("/documents", headers=auth_headers)
    assert resp.status_code == 200
    names = [d["original_name"] for d in resp.json()]
    assert "bob.pdf" not in names


def test_delete_removes_from_chroma(
    client: TestClient, auth_headers: dict, test_document: Document
) -> None:
    """Deleting a document calls ChromaDB delete_collection."""
    with patch("app.routers.documents.delete_collection", new_callable=AsyncMock) as mock_del, \
         patch("app.services.storage.LocalStorageService.delete", new_callable=AsyncMock):
        resp = client.delete(
            f"/documents/{test_document.id}", headers=auth_headers
        )
    assert resp.status_code == 204
    mock_del.assert_called_once_with(test_document.chroma_collection_id)


def test_get_document_wrong_user(client: TestClient, test_document: Document) -> None:
    """Another user requesting a document by ID returns 403."""
    email = f"intruder_{uuid.uuid4().hex[:8]}@example.com"
    resp = client.post(
        "/auth/register",
        json={"email": email, "password": "password123", "full_name": "Eve"},
    )
    intruder_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    resp = client.get(
        f"/documents/{test_document.id}", headers=intruder_headers
    )
    assert resp.status_code == 403
