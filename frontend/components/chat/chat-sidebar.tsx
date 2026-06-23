"use client";

import { useState } from "react";
import { PanelLeftClose, Plus, Search, Trash2 } from "lucide-react";
import { apiDel, apiGet, type SessionResponse } from "@/lib/api";
import type { DocRecord } from "@/lib/types";

interface ChatSidebarProps {
  docs: DocRecord[];
  activeId: string;
  setActiveId: (id: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  activeSessionId: string | null;
  sessions: SessionResponse[];
  onSelectSession: (session: SessionResponse) => void;
  onDeleteSession: (id: string) => void;
  onNewThread: () => void;
}

export function ChatSidebar({
  docs,
  activeId,
  setActiveId,
  open,
  setOpen,
  activeSessionId,
  sessions,
  onSelectSession,
  onDeleteSession,
  onNewThread,
}: ChatSidebarProps) {
  const [docQuery, setDocQuery] = useState("");
  const visibleDocs = docQuery
    ? docs.filter((d) =>
        d.name.toLowerCase().includes(docQuery.toLowerCase()),
      )
    : docs;

  return (
    <aside
      className={
        "shrink-0 transition-all duration-300 ease-out border-r border-hairline bg-ink-1/60 h-full overflow-y-auto " +
        (open ? "w-[280px]" : "w-0")
      }
      style={{ borderRightWidth: "0.5px" }}
    >
      <div
        className={"w-[280px] " + (open ? "opacity-100" : "opacity-0 pointer-events-none")}
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="eyebrow">Documents · {docs.length}</div>
          <button
            className="text-fog-3 hover:text-fog-0 w-6 h-6 rounded flex items-center justify-center"
            onClick={() => setOpen(false)}
          >
            <PanelLeftClose className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-3 pb-3">
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-fog-4"
              strokeWidth={1.5}
            />
            <input
              value={docQuery}
              onChange={(e) => setDocQuery(e.target.value)}
              placeholder="Filter docs…"
              className="w-full h-8 bg-ink-2 hairline rounded text-[12px] pl-7 pr-2 text-fog-1 placeholder:text-fog-4 focus:outline-none focus:border-iris/40"
            />
          </div>
        </div>
        <ul className="px-2 pb-4 space-y-0.5">
          {visibleDocs.map((d) => {
            const active = d.id === activeId;
            const disabled = d.status !== "ready";
            return (
              <li key={d.id}>
                <button
                  disabled={disabled}
                  onClick={() => setActiveId(d.id)}
                  className={
                    "w-full text-left px-3 py-2.5 rounded-md group transition-colors " +
                    (active ? "bg-ink-3" : "hover:bg-ink-2") +
                    (disabled ? " opacity-50 cursor-not-allowed" : "")
                  }
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={
                        "w-1 h-1 rounded-full " +
                        (active ? "bg-iris" : "bg-transparent")
                      }
                    />
                    <span
                      className={
                        "font-mono text-[11.5px] truncate " +
                        (active
                          ? "text-fog-0"
                          : "text-fog-2 group-hover:text-fog-1")
                      }
                    >
                      {d.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-3">
                    <span className="font-mono text-[10px] text-fog-4">
                      {d.pages} pp
                    </span>
                    <span className="text-fog-5">·</span>
                    {d.status === "ready" ? (
                      <span className="font-mono text-[10px] text-fog-4">
                        {d.uploadedAt}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-amber">
                        indexing {d.progress ?? 0}%
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <ThreadList
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={onSelectSession}
          onDelete={onDeleteSession}
          onNewThread={onNewThread}
        />
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Thread list (sessions for the active document)
// ---------------------------------------------------------------------------

interface ThreadListProps {
  sessions: SessionResponse[];
  activeSessionId: string | null;
  onSelect: (s: SessionResponse) => void;
  onDelete: (id: string) => void;
  onNewThread: () => void;
}

function ThreadList({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  onNewThread,
}: ThreadListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await apiDel(`/chat/sessions/${id}`);
      onDelete(id);
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      className="px-5 py-4 border-t border-hairline"
      style={{ borderTopWidth: "0.5px" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="eyebrow">Threads</div>
        <button
          onClick={onNewThread}
          className="flex items-center gap-1 font-mono text-[10px] text-fog-3 hover:text-fog-0 transition-colors"
          title="New thread"
        >
          <Plus className="w-3 h-3" strokeWidth={1.5} />
          New
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="font-mono text-[10.5px] text-fog-4">No threads yet.</p>
      ) : (
        <ul className="space-y-1">
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <li key={s.id}>
                <div
                  className={
                    "group flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer transition-colors " +
                    (isActive ? "bg-iris/[0.08]" : "hover:bg-ink-2")
                  }
                  onClick={() => onSelect(s)}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className={
                        "text-[12px] truncate " +
                        (isActive ? "text-fog-0" : "text-fog-2")
                      }
                    >
                      {s.title ?? "Untitled thread"}
                    </div>
                    <div className="font-mono text-[9.5px] text-fog-4 mt-0.5">
                      {new Date(s.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    disabled={deletingId === s.id}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-fog-4 hover:text-red-400 transition-all shrink-0"
                    title="Delete thread"
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
