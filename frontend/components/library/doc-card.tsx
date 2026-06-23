"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Folder, Loader2, MessageSquareText, MoreHorizontal, Trash2, X } from "lucide-react";
import { apiDel } from "@/lib/api";
import type { Collection, DocRecord } from "@/lib/types";
import { StatusBadge } from "./status-badge";

interface DocCardProps {
  doc: DocRecord;
  collections: Collection[];
  onAssign: (docId: string, collectionId: string | null) => void;
  onDelete: (docId: string) => void;
}

export function DocCard({ doc, collections, onAssign, onDelete }: DocCardProps) {
  const isReady = doc.status === "ready";
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function handleMenuClose() {
    setMenuOpen(false);
    setConfirmDelete(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiDel(`/documents/${doc.id}`);
      onDelete(doc.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const activeCollection = collections.find((c) => c.id === doc.collectionId);

  return (
    <article className="card-lift relative rounded-xl hairline bg-ink-2/50 p-5 flex flex-col gap-4 group cursor-default">
      {/* Thumb */}
      <div className="relative rounded-lg overflow-hidden hairline bg-ink-3 aspect-[4/2.6] flex items-stretch">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "repeating-linear-gradient(180deg, transparent 0 9px, rgba(255,255,255,0.04) 9px 10px)",
          }}
        />
        <div className="relative flex-1 p-4 flex flex-col">
          <div className="font-mono text-[8.5px] text-fog-4 tracking-wider mb-1">
            DOC · {doc.tag.toUpperCase()}
          </div>
          <div className="font-serif text-[18px] text-fog-0 leading-tight line-clamp-2">
            {doc.name.replace(/_/g, " ").replace(".pdf", "")}
          </div>
          <div className="mt-auto font-mono text-[9.5px] text-fog-4">
            {doc.pages} pp · {doc.sizeMB} MB
          </div>
        </div>
        <div
          className="w-16 shrink-0 relative border-l border-hairline"
          style={{ borderLeftWidth: "0.5px" }}
        >
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background:
                "repeating-linear-gradient(180deg, transparent 0 3px, rgba(255,255,255,0.06) 3px 4px)",
            }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <StatusBadge status={doc.status} progress={doc.progress} />
            <span className="font-mono text-[10.5px] text-fog-4">·</span>
            <span className="font-mono text-[10.5px] text-fog-3">
              {doc.uploadedAt}
            </span>
            {activeCollection && (
              <>
                <span className="font-mono text-[10.5px] text-fog-4">·</span>
                <span className="flex items-center gap-1 font-mono text-[10px] text-iris/80">
                  <Folder className="w-2.5 h-2.5" strokeWidth={1.5} />
                  {activeCollection.name}
                </span>
              </>
            )}
          </div>
          <h3
            className="font-mono text-[12.5px] text-fog-0 truncate"
            title={doc.name}
          >
            {doc.name}
          </h3>
          <p className="text-fog-3 text-[12.5px] mt-1.5 line-clamp-2 leading-relaxed">
            {doc.excerpt}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {isReady ? (
          <Link
            href={{ pathname: "/chat", query: { doc: doc.id } }}
            className="h-8 flex-1 rounded-md text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-all bg-iris/10 text-iris border border-iris/30 hover:bg-iris/20"
          >
            <MessageSquareText className="w-3.5 h-3.5" strokeWidth={1.5} />
            Open chat
          </Link>
        ) : (
          <button
            disabled
            className="h-8 flex-1 rounded-md text-[12.5px] font-medium flex items-center justify-center gap-1.5 bg-ink-3 text-fog-4 cursor-not-allowed border border-hairline"
          >
            <MessageSquareText className="w-3.5 h-3.5" strokeWidth={1.5} />
            Indexing…
          </button>
        )}

        {/* Assign-to-collection popover */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="h-8 w-8 rounded-md hairline text-fog-3 hover:text-fog-0 hover:bg-ink-3 flex items-center justify-center transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={handleMenuClose} />
              <div className="absolute right-0 bottom-full mb-2 z-40 w-52 rounded-lg hairline bg-ink-3 shadow-xl py-1">
                <div className="px-3 py-1.5 flex items-center justify-between">
                  <span className="eyebrow text-[10px]">Move to collection</span>
                  <button onClick={handleMenuClose} className="text-fog-4 hover:text-fog-0">
                    <X className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                </div>

                {collections.length === 0 ? (
                  <p className="px-3 py-2 text-[12px] text-fog-4">No collections yet.</p>
                ) : (
                  <ul>
                    {collections.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => {
                            onAssign(doc.id, doc.collectionId === c.id ? null : c.id);
                            handleMenuClose();
                          }}
                          className={
                            "w-full text-left px-3 py-2 text-[12.5px] flex items-center gap-2 hover:bg-ink-4 transition-colors " +
                            (doc.collectionId === c.id ? "text-iris" : "text-fog-1")
                          }
                        >
                          <Folder className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                          <span className="truncate">{c.name}</span>
                          {doc.collectionId === c.id && (
                            <span className="ml-auto font-mono text-[9px] text-iris">✓</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {doc.collectionId && (
                  <button
                    onClick={() => { onAssign(doc.id, null); handleMenuClose(); }}
                    className="w-full text-left px-3 py-2 text-[12px] text-fog-3 hover:text-fog-0 hover:bg-ink-4 transition-colors"
                  >
                    Remove from collection
                  </button>
                )}

                {/* Delete section */}
                <div className="my-1 border-t border-hairline" style={{ borderTopWidth: "0.5px" }} />

                {confirmDelete ? (
                  <div className="px-3 py-2">
                    <p className="text-[11.5px] text-fog-2 mb-2">
                      Delete <span className="text-fog-0 font-mono">{doc.name}</span>? This removes all chat history and cannot be undone.
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 h-7 rounded text-[11.5px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                      >
                        {deleting ? (
                          <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
                        ) : (
                          "Delete"
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                        className="flex-1 h-7 rounded text-[11.5px] text-fog-3 hover:text-fog-0 hover:bg-ink-4 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full text-left px-3 py-2 text-[12px] text-red-400/80 hover:text-red-400 hover:bg-ink-4 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                    Delete document
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
