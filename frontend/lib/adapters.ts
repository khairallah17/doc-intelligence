/**
 * Pure adapter functions mapping backend API shapes to the frontend's
 * internal types. No side-effects, no API calls.
 */

import type { DocumentResponse, MessageResponse, Source } from "./api";
import type { Citation, DocRecord, Message } from "./types";

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Map a backend DocumentResponse to the frontend DocRecord shape. */
export function docFromApi(d: DocumentResponse): DocRecord {
  const uiStatus =
    d.status === "ready" ? "ready" : "processing";

  return {
    id: d.id,
    name: d.original_name,
    pages: d.page_count ?? 0,
    uploadedAt: formatDate(d.created_at),
    sizeMB: parseFloat((d.file_size_bytes / (1024 * 1024)).toFixed(1)),
    status: uiStatus,
    tag: "DOC",
    excerpt: "",
    collectionId: d.collection_id,
  };
}

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/**
 * Convert a backend Source into a frontend Citation and return a
 * stable synthetic ID so it can be stored in the citation registry.
 *
 * Returns [id, citation].
 */
export function citationFromSource(
  s: Source,
  docName: string,
  msgId: string,
  idx: number,
): [string, Citation] {
  const id = `src-${msgId}-${idx}`;
  const citation: Citation = {
    page: s.page,
    doc: docName,
    section: `Page ${s.page}`,
    text: s.chunk_text,
    highlight: s.chunk_text.slice(0, 120),
    score: s.score ?? undefined,
  };
  return [id, citation];
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Convert a backend MessageResponse to a frontend Message.
 * Populates citationRegistry in place with any sources on the message.
 *
 * @param m - the backend message
 * @param docName - the document name (needed to label citations)
 * @param citationRegistry - mutable registry that receives new entries
 */
export function messageFromApi(
  m: MessageResponse,
  docName: string,
  citationRegistry: Record<string, Citation>,
): Message {
  const citations: string[] = [];

  if (m.sources) {
    m.sources.forEach((s, idx) => {
      const [id, citation] = citationFromSource(s, docName, m.id, idx);
      citationRegistry[id] = citation;
      citations.push(id);
    });
  }

  return {
    id: m.id,
    role: m.role,
    text: m.content,
    time: formatTime(m.created_at),
    citations: citations.length > 0 ? citations : undefined,
  };
}
