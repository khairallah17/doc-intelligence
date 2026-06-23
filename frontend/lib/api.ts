/**
 * Centralised API client for the Lexicon backend.
 * All network calls go through apiFetch so auth headers and token
 * refresh are handled in one place.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Backend response types
// ---------------------------------------------------------------------------

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface DocumentResponse {
  id: string;
  original_name: string;
  page_count: number | null;
  file_size_bytes: number;
  status: "uploading" | "processing" | "ready" | "failed";
  created_at: string;
  processed_at: string | null;
  collection_id: string | null;
}

export interface CollectionResponse {
  id: string;
  name: string;
  created_at: string;
  document_count: number;
}

export interface UploadResponse {
  id: string;
  original_name: string;
  status: string;
}

export interface Source {
  page: number;
  chunk_text: string;
  score: number | null;
}

export interface MessageResponse {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[] | null;
  created_at: string;
}

export interface SessionResponse {
  id: string;
  document_id: string;
  created_at: string;
  title: string | null;
}

export interface DocumentInsight {
  id: string;
  name: string;
  page_count: number | null;
  session_count: number;
  question_count: number;
}

export interface InsightsResponse {
  document_count: number;
  total_pages: number;
  total_size_bytes: number;
  session_count: number;
  question_count: number;
  top_documents: DocumentInsight[];
  member_since: string;
}

// ---------------------------------------------------------------------------
// Token storage helpers
// ---------------------------------------------------------------------------

const ACCESS_KEY = "lexicon_access_token";
const REFRESH_KEY = "lexicon_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function storeTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data: LoginResponse = await res.json();
    storeTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      return fetch(`${BASE_URL}${path}`, { ...init, headers });
    }
    clearTokens();
    if (typeof window !== "undefined") window.location.href = "/login";
  }
  return res;
}

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`POST ${path} failed: ${res.status}`), {
      status: res.status,
      body: err,
    });
  }
  return res.json() as Promise<T>;
}

export async function apiDel(path: string): Promise<void> {
  const res = await apiFetch(path, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T | null> {
  const res = await apiFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`PATCH ${path} failed: ${res.status}`), {
      status: res.status,
      body: err,
    });
  }
  return res.json() as Promise<T>;
}

export async function apiUpload(
  path: string,
  file: File,
): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiFetch(path, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`UPLOAD ${path} failed: ${res.status}`), {
      status: res.status,
      body: err,
    });
  }
  return res.json() as Promise<UploadResponse>;
}

/**
 * Open a streaming fetch to the SSE chat endpoint.
 * Returns the raw Response so the caller can read the body as a stream.
 */
export async function streamChat(
  sessionId: string,
  question: string,
): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${BASE_URL}/chat/sessions/${sessionId}/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ question }),
  });
}

// ---------------------------------------------------------------------------
// Auth helpers (used directly by AuthContext)
// ---------------------------------------------------------------------------

export async function apiLogin(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const fd = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: fd.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error("Login failed"), { status: res.status, body: err });
  }
  return res.json();
}

export async function apiRegister(
  email: string,
  password: string,
  full_name: string,
): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error("Registration failed"), { status: res.status, body: err });
  }
  return res.json();
}
