"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, FolderPlus, LogOut, Search, Upload, X } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { UploadZone } from "@/components/library/upload-zone";
import { DocCard } from "@/components/library/doc-card";
import { EmptyState } from "@/components/library/empty-state";
import {
  apiDel,
  apiGet,
  apiPatch,
  apiPost,
  apiUpload,
  type CollectionResponse,
  type DocumentResponse,
} from "@/lib/api";

import { docFromApi } from "@/lib/adapters";
import { useAuth } from "@/lib/auth-context";
import type { Collection, DocRecord, UploadState } from "@/lib/types";

type Filter = "all" | "ready" | "processing";

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1_000;

export default function LibraryPage() {
  const { logout, user } = useAuth();
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);

  // New-collection inline form
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const newCollectionInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const pollDeadlines = useRef<Map<string, number>>(new Map());

  // -------------------------------------------------------------------------
  // Load docs + collections on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    apiGet<DocumentResponse[]>("/documents")
      .then((list) => setDocs(list.map(docFromApi)))
      .catch(console.error);
    apiGet<CollectionResponse[]>("/collections")
      .then((list) =>
        setCollections(
          list.map((c) => ({ id: c.id, name: c.name, documentCount: c.document_count })),
        ),
      )
      .catch(console.error);
  }, []);

  // Focus the new-collection input when the form appears
  useEffect(() => {
    if (creatingCollection) {
      setTimeout(() => newCollectionInputRef.current?.focus(), 50);
    }
  }, [creatingCollection]);

  // -------------------------------------------------------------------------
  // Collections
  // -------------------------------------------------------------------------
  const handleCreateCollection = useCallback(async () => {
    const name = newCollectionName.trim();
    if (!name) return;
    try {
      const created = await apiPost<CollectionResponse>("/collections", { name });
      setCollections((prev) => [
        { id: created.id, name: created.name, documentCount: 0 },
        ...prev,
      ]);
      setNewCollectionName("");
      setCreatingCollection(false);
    } catch (err) {
      console.error("Failed to create collection:", err);
    }
  }, [newCollectionName]);

  const handleDeleteDoc = useCallback(
    (docId: string) => {
      setDocs((prev) => {
        const doc = prev.find((d) => d.id === docId);
        if (doc?.collectionId) {
          setCollections((cols) =>
            cols.map((c) =>
              c.id === doc.collectionId
                ? { ...c, documentCount: Math.max(0, c.documentCount - 1) }
                : c,
            ),
          );
        }
        return prev.filter((d) => d.id !== docId);
      });
    },
    [],
  );

  const handleAssignCollection = useCallback(
    async (docId: string, collectionId: string | null) => {
      try {
        await apiPatch(`/collections/documents/${docId}/assign`, { collection_id: collectionId });
        setDocs((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, collectionId } : d)),
        );
        // update document_count on affected collections
        setCollections((prev) =>
          prev.map((c) => {
            const wasAssigned = docs.find((d) => d.id === docId)?.collectionId === c.id;
            const isAssigned = c.id === collectionId;
            if (wasAssigned && !isAssigned) return { ...c, documentCount: c.documentCount - 1 };
            if (!wasAssigned && isAssigned) return { ...c, documentCount: c.documentCount + 1 };
            return c;
          }),
        );
      } catch (err) {
        console.error("Failed to assign collection:", err);
      }
    },
    [docs],
  );

  // -------------------------------------------------------------------------
  // Polling helpers
  // -------------------------------------------------------------------------
  const stopPoll = useCallback((id: string) => {
    const timer = pollTimers.current.get(id);
    if (timer) {
      clearInterval(timer);
      pollTimers.current.delete(id);
      pollDeadlines.current.delete(id);
    }
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const startPoll = useCallback(
    (id: string) => {
      pollDeadlines.current.set(id, Date.now() + POLL_TIMEOUT_MS);
      const timer = setInterval(async () => {
        if (Date.now() > (pollDeadlines.current.get(id) ?? 0)) {
          stopPoll(id);
          return;
        }
        try {
          const doc = await apiGet<DocumentResponse>(`/documents/${id}`);
          if (doc.status === "ready" || doc.status === "failed") {
            setDocs((prev) =>
              prev.map((d) => (d.id === id ? docFromApi(doc) : d)),
            );
            stopPoll(id);
          }
        } catch {
          stopPoll(id);
        }
      }, POLL_INTERVAL_MS);
      pollTimers.current.set(id, timer);
    },
    [stopPoll],
  );

  useEffect(
    () => () => pollTimers.current.forEach((t) => clearInterval(t)),
    [],
  );

  // -------------------------------------------------------------------------
  // Upload handler
  // -------------------------------------------------------------------------
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const file = files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        alert("Only PDF files are accepted.");
        return;
      }

      const uploadId = "u" + Date.now();
      setUploads((prev) => [
        ...prev,
        { id: uploadId, name: file.name, stage: "uploading", progress: 0 },
      ]);

      const progressTimer = setInterval(() => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId && u.stage === "uploading" && u.progress < 90
              ? { ...u, progress: u.progress + 10 }
              : u,
          ),
        );
      }, 150);

      try {
        const result = await apiUpload("/documents/upload", file);
        clearInterval(progressTimer);

        const optimistic: DocRecord = {
          id: result.id,
          name: result.original_name,
          pages: 0,
          uploadedAt: "Just now",
          sizeMB: parseFloat((file.size / (1024 * 1024)).toFixed(1)),
          status: "processing",
          tag: "DOC",
          excerpt: "",
          collectionId: null,
        };
        setDocs((prev) => [optimistic, ...prev]);
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, progress: 100, stage: "processing" } : u,
          ),
        );
        startPoll(result.id);
        setTimeout(() => stopPoll(uploadId), 1_500);
      } catch (err: unknown) {
        clearInterval(progressTimer);
        setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        const e = err as { status?: number };
        if (e.status === 413) alert("File is too large (max 20 MB).");
        else if (e.status === 422) alert("Only PDF files are accepted.");
        else alert("Upload failed. Please try again.");
      }
    },
    [startPoll, stopPoll],
  );

  const openFilePicker = () => fileInputRef.current?.click();

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------
  const filtered = useMemo(
    () =>
      docs.filter((d) => {
        if (filter !== "all" && d.status !== filter) return false;
        if (activeCollectionId && d.collectionId !== activeCollectionId) return false;
        if (query && !d.name.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [docs, query, filter, activeCollectionId],
  );

  const counts = useMemo(
    () => ({
      all: docs.length,
      ready: docs.filter((d) => d.status === "ready").length,
      processing: docs.filter((d) => d.status === "processing").length,
    }),
    [docs],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="relative" data-screen-label="01 Library">
      <TopBar
        rightSlot={
          <button
            onClick={logout}
            className="hidden md:flex items-center gap-1.5 font-mono text-[10.5px] text-fog-3 hover:text-fog-1 transition-colors mr-2"
          >
            <LogOut className="w-3 h-3" strokeWidth={1.5} />
            Sign out
          </button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <main className="relative max-w-[1400px] mx-auto px-6 lg:px-10 pt-10 pb-24">
        {/* Hero header */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="eyebrow mb-3 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-iris" />
                Library · {docs.length} document{docs.length !== 1 ? "s" : ""}
                {user && <span className="text-fog-4">· {user.full_name}</span>}
              </div>
              <h1 className="font-serif text-[56px] leading-[1.04] tracking-tight text-fog-0">
                Your <em className="text-iris not-italic font-serif italic">second brain</em>
                <br />
                for everything you read.
              </h1>
              <p className="mt-4 text-fog-2 text-[15px] max-w-xl leading-relaxed">
                Upload PDFs, contracts, research, and reports. Lexicon indexes every
                page so you can have a real conversation with the source — with
                citations you can verify in one click.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* New Collection button / inline form */}
              {creatingCollection ? (
                <div className="flex items-center gap-1.5 hairline rounded-md bg-ink-2 px-2 h-9">
                  <input
                    ref={newCollectionInputRef}
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateCollection();
                      if (e.key === "Escape") {
                        setCreatingCollection(false);
                        setNewCollectionName("");
                      }
                    }}
                    placeholder="Collection name…"
                    className="bg-transparent text-[13px] text-fog-0 placeholder:text-fog-4 outline-none w-36"
                  />
                  <button
                    onClick={handleCreateCollection}
                    className="text-iris hover:text-iris/70"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => {
                      setCreatingCollection(false);
                      setNewCollectionName("");
                    }}
                    className="text-fog-4 hover:text-fog-1"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreatingCollection(true)}
                  className="h-9 px-3 rounded-md hairline text-fog-1 text-[13px] hover:bg-ink-2 transition-colors flex items-center gap-1.5"
                >
                  <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                  New collection
                </button>
              )}

              <button
                onClick={openFilePicker}
                className="h-9 px-3.5 rounded-md text-[13px] flex items-center gap-1.5 font-medium text-white"
                style={{
                  background: "linear-gradient(180deg, #7c89ff 0%, #5a67e0 100%)",
                  boxShadow:
                    "0 1px 0 0 rgba(255,255,255,0.18) inset, 0 8px 16px -8px rgba(124,137,255,0.55)",
                }}
              >
                <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                Upload PDF
                <span className="font-mono text-[10px] opacity-70 ml-1 px-1 rounded bg-black/20">
                  ⌘U
                </span>
              </button>
            </div>
          </div>
        </section>

        <UploadZone onSimulate={openFilePicker} onFiles={handleFiles} uploads={uploads} />

        {/* Search + filter */}
        <section className="mt-10 mb-5 flex flex-col gap-3">
          {/* Collection filter pills */}
          {collections.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveCollectionId(null)}
                className={
                  "h-7 px-3 rounded-full text-[11.5px] font-mono transition-colors border " +
                  (activeCollectionId === null
                    ? "bg-iris/10 text-iris border-iris/30"
                    : "text-fog-3 border-hairline hover:text-fog-1 hover:border-fog-4")
                }
              >
                All collections
              </button>
              {collections.map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    setActiveCollectionId((prev) => (prev === c.id ? null : c.id))
                  }
                  className={
                    "h-7 px-3 rounded-full text-[11.5px] font-mono transition-colors border " +
                    (activeCollectionId === c.id
                      ? "bg-iris/10 text-iris border-iris/30"
                      : "text-fog-3 border-hairline hover:text-fog-1 hover:border-fog-4")
                  }
                >
                  {c.name}
                  <span className="ml-1.5 text-fog-4">{c.documentCount}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex-1 max-w-md relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fog-3"
                strokeWidth={1.5}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents, pages, or passages…"
                className="w-full h-10 bg-ink-2 hairline rounded-md pl-9 pr-20 text-[13.5px] text-fog-0 placeholder:text-fog-4 focus:outline-none focus:border-iris/40 transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="font-mono text-[10px] text-fog-3 px-1.5 py-0.5 rounded border border-hairline bg-ink-3">
                  ⌘
                </kbd>
                <kbd className="font-mono text-[10px] text-fog-3 px-1.5 py-0.5 rounded border border-hairline bg-ink-3">
                  K
                </kbd>
              </span>
            </div>

            <div className="flex items-center gap-1 p-1 bg-ink-2 hairline rounded-md">
              {(
                [
                  { id: "all", label: "All", count: counts.all },
                  { id: "ready", label: "Ready", count: counts.ready },
                  { id: "processing", label: "Processing", count: counts.processing },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFilter(opt.id)}
                  className={
                    "h-7 px-3 rounded text-[12.5px] transition-colors flex items-center gap-1.5 " +
                    (filter === opt.id ? "bg-ink-4 text-fog-0" : "text-fog-3 hover:text-fog-1")
                  }
                >
                  {opt.label}
                  <span className="font-mono text-[10px] text-fog-3">{opt.count}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Doc grid */}
        {filtered.length === 0 ? (
          <EmptyState onSimulate={openFilePicker} />
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                collections={collections}
                onAssign={handleAssignCollection}
                onDelete={handleDeleteDoc}
              />
            ))}
          </section>
        )}

        <footer
          className="mt-16 pt-6 border-t border-hairline flex items-center justify-between text-fog-4 text-[11.5px] font-mono"
          style={{ borderTopWidth: "0.5px" }}
        >
          <span>LEXICON · DOCUMENT INTELLIGENCE</span>
          <span>
            BUILT BY{" "}
            <span className="text-fog-2">MOHAMED KHAIRALLAH</span>
          </span>
        </footer>
      </main>
    </div>
  );
}
