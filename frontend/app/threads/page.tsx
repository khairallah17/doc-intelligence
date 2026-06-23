"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, MessageSquareText, Search, Trash2 } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { apiDel, apiGet, type DocumentResponse, type SessionResponse } from "@/lib/api";

interface Group {
  docId: string;
  docName: string;
  sessions: SessionResponse[];
}

export default function ThreadsPage() {
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [docMap, setDocMap] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<SessionResponse[]>("/chat/sessions"),
      apiGet<DocumentResponse[]>("/documents"),
    ])
      .then(([sess, docs]) => {
        setSessions(sess);
        const map: Record<string, string> = {};
        docs.forEach((d) => { map[d.id] = d.original_name; });
        setDocMap(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    setDeleting((prev) => new Set(prev).add(id));
    try {
      await apiDel(`/chat/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  // Filter
  const filtered = sessions.filter((s) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (docMap[s.document_id] ?? "").toLowerCase().includes(q) ||
      (s.title ?? "").toLowerCase().includes(q)
    );
  });

  // Group by document_id preserving order of first appearance
  const groups: Group[] = [];
  const seen = new Set<string>();
  for (const s of filtered) {
    if (!seen.has(s.document_id)) {
      seen.add(s.document_id);
      groups.push({
        docId: s.document_id,
        docName: docMap[s.document_id] ?? s.document_id,
        sessions: filtered.filter((x) => x.document_id === s.document_id),
      });
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-[28px] text-fog-0 mb-1">Threads</h1>
          <p className="text-fog-3 text-[13.5px]">
            All your chat conversations, across every document.
          </p>
        </div>

        <div className="relative mb-8">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fog-4"
            strokeWidth={1.5}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threads or documents…"
            className="w-full h-10 bg-ink-2 hairline rounded-lg text-[13.5px] pl-9 pr-4 text-fog-1 placeholder:text-fog-4 focus:outline-none focus:border-iris/40"
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-ink-2/60 animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquareText
              className="w-8 h-8 text-fog-5 mx-auto mb-3"
              strokeWidth={1}
            />
            <p className="text-fog-3 text-[14px]">
              {query
                ? "No threads match your search."
                : "No threads yet. Open a document and start a conversation."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.docId}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="eyebrow truncate max-w-[400px]">
                    {group.docName.replace(/\.pdf$/i, "")}
                  </span>
                  <div className="flex-1 h-px border-t border-hairline" style={{ borderTopWidth: "0.5px" }} />
                  <Link
                    href={`/chat?doc=${group.docId}`}
                    className="text-fog-4 hover:text-iris transition-colors"
                    title="Open in chat"
                  >
                    <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                  </Link>
                </div>
                <ul className="space-y-1.5">
                  {group.sessions.map((s) => (
                    <li key={s.id}>
                      <div className="group flex items-center gap-4 rounded-lg px-4 py-3 hairline bg-ink-2/40 hover:bg-ink-2 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-[13.5px] text-fog-1 truncate">
                            {s.title ?? "Untitled thread"}
                          </div>
                          <div className="font-mono text-[10.5px] text-fog-4 mt-0.5">
                            {new Date(s.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/chat?doc=${s.document_id}&session=${s.id}`}
                            className="h-7 px-3 rounded text-[11.5px] font-medium bg-iris/10 text-iris border border-iris/20 hover:bg-iris/20 flex items-center gap-1.5 transition-colors"
                          >
                            <MessageSquareText className="w-3 h-3" strokeWidth={1.5} />
                            Continue
                          </Link>
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={deleting.has(s.id)}
                            className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center text-fog-4 hover:text-red-400 transition-all disabled:opacity-30"
                            title="Delete thread"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
