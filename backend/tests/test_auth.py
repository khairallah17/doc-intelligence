"""Tests for the /auth router."""

import uuid

import pytest
from fastapi.testclient import TestClient


def _register(client: TestClient, email: str | None = None) -> dict:
    email = email or f"user_{uuid.uuid4().hex[:8]}@example.com"
    resp = client.post(
        "/auth/register",
        json={"email": email, "password": "password123", "full_name": "Alice"},
    )
    return resp


def test_register_success(client: TestClient) -> None:
    """Registering with unique credentials returns 201 and both tokens."""
    resp = _register(client)
    assert resp.status_code == 201
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


def test_register_duplicate_email(client: TestClient) -> None:
    """Re-registering with the same email returns 409."""
    email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
    _register(client, email=email)
    resp = _register(client, email=email)
    assert resp.status_code == 409


def test_login_success(client: TestClient) -> None:
    """Valid credentials return 200 and tokens."""
    email = f"login_{uuid.uuid4().hex[:8]}@example.com"
    _register(client, email=email)
    resp = client.post(
        "/auth/login",
        data={"username": email, "password": "password123"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client: TestClient) -> None:
    """Wrong password returns 401."""
    email = f"wrongpw_{uuid.uuid4().hex[:8]}@example.com"
    _register(client, email=email)
    resp = client.post(
        "/auth/login",
        data={"username": email, "password": "wrongpassword"},
    )
    assert resp.status_code == 401


def test_me_requires_auth(client: TestClient) -> None:
    """GET /auth/me without a token returns 401."""
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_returns_user_data(client: TestClient, auth_headers: dict) -> None:
    """GET /auth/me with a valid token returns the user's profile."""
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "email" in body
    assert "full_name" in body
    assert "id" in body
