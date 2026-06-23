export type DocStatus = "ready" | "processing";

export interface DocRecord {
  id: string;
  name: string;
  pages: number;
  uploadedAt: string;
  sizeMB: number;
  status: DocStatus;
  progress?: number;
  tag: string;
  excerpt: string;
  collectionId: string | null;
}

export interface Collection {
  id: string;
  name: string;
  documentCount: number;
}

export interface Citation {
  page: number;
  doc: string;
  section: string;
  text: string;
  highlight: string;
  /** Retrieval similarity score from ChromaDB (0–1, higher = more relevant). */
  score?: number;
}

export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  text: string;
  time: string;
  citations?: string[];
}

export interface UploadState {
  id: string;
  name: string;
  stage: "uploading" | "processing" | "done";
  progress: number;
  /** internal processing progress 0..100 */
  _proc?: number;
}
