"use client";

import { Bookmark, Copy, ExternalLink, Quote, X } from "lucide-react";
import type { Citation } from "@/lib/types";
import { splitWithHighlight } from "@/lib/utils";

interface CitationDrawerProps {
  citation: Citation;
  allCitations: [string, Citation][];
  activeId: string;
  setActiveId: (id: string) => void;
  onClose: () => void;
}

export function CitationDrawer({
  citation,
  allCitations,
  activeId,
  setActiveId,
  onClose,
}: CitationDrawerProps) {
  const parts = splitWithHighlight(citation.text, citation.highlight);
  return (
    <div className="absolute inset-y-0 right-0 z-40 flex">
      <aside
        key={activeId}
        className="drawer-anim w-[440px] max-w-[92vw] h-full bg-ink-1/95 backdrop-blur-md border-l border-hairline flex flex-col"
        style={{
          borderLeftWidth: "0.5px",
          boxShadow: "-20px 0 60px -20px rgba(0,0,0,0.6)",
        }}
      >
        {/* Drawer header */}
        <div
          className="px-5 pt-5 pb-3 border-b border-hairline"
          style={{ borderBottomWidth: "0.5px" }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="eyebrow mb-1.5 flex items-center gap-2">
                <Quote className="w-2.5 h-2.5 text-iris" strokeWidth={1.5} />
                Source · Page {citation.page}
              </div>
              <h3 className="font-serif text-[22px] text-fog-0 leading-tight">
                {citation.section}
              </h3>
              <div className="font-mono text-[11px] text-fog-3 mt-1.5 truncate">
                {citation.doc}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md hairline hover:bg-ink-2 text-fog-3 hover:text-fog-0 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="h-7 px-2.5 rounded hairline text-[11.5px] text-fog-2 hover:text-fog-0 hover:bg-ink-2 flex items-center gap-1.5 font-mono">
              <ExternalLink className="w-2.5 h-2.5" strokeWidth={1.5} />
              Open page
            </button>
            <button className="h-7 px-2.5 rounded hairline text-[11.5px] text-fog-2 hover:text-fog-0 hover:bg-ink-2 flex items-center gap-1.5 font-mono">
              <Copy className="w-2.5 h-2.5" strokeWidth={1.5} />
              Copy passage
            </button>
            <button className="h-7 w-7 rounded hairline text-fog-3 hover:text-fog-0 hover:bg-ink-2 flex items-center justify-center">
              <Bookmark className="w-2.5 h-2.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Page preview block */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
          <div className="relative rounded-md hairline bg-ink-2/60 p-5 mb-5">
            <div className="absolute top-3 right-3 font-mono text-[9.5px] text-fog-4 tracking-wider">
              PAGE {citation.page} OF 84
            </div>
            <div className="absolute -left-px top-6 bottom-6 w-[2px] bg-iris/60 rounded-full" />

            <div className="font-mono text-[10px] text-fog-4 mb-3 tracking-wider uppercase">
              {citation.section}
            </div>
            <p
              className="text-[13.5px] leading-[1.75] text-fog-1"
              style={{ textWrap: "pretty" } as React.CSSProperties}
            >
              {parts.map((p, i) =>
                p.mark ? (
                  <mark key={i} className="passage-mark text-fog-0">
                    {p.text}
                  </mark>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </p>

            {/* fake continuation lines */}
            <div className="mt-4 space-y-2 opacity-50">
              {[80, 92, 70, 88, 60].map((w, i) => (
                <div
                  key={i}
                  className="h-1.5 bg-white/[0.06] rounded"
                  style={{ width: w + "%" }}
                />
              ))}
            </div>
          </div>

          {/* Other citations from this answer */}
          <div className="eyebrow mb-3">All sources in this answer</div>
          <ul className="space-y-1.5">
            {allCitations.map(([id, c]) => (
              <li key={id}>
                <button
                  onClick={() => setActiveId(id)}
                  className={
                    "w-full text-left rounded-md px-3 py-2.5 hairline transition-colors " +
                    (id === activeId
                      ? "bg-iris/[0.06] border-iris/30"
                      : "bg-ink-2/40 hover:bg-ink-2")
                  }
                  style={{
                    borderColor:
                      id === activeId
                        ? "rgba(124,137,255,0.30)"
                        : "rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10.5px] text-iris">
                      p.{c.page}
                    </span>
                    <span className="font-mono text-[10px] text-fog-4 truncate">
                      {c.section}
                    </span>
                  </div>
                  <p className="text-[12px] text-fog-2 line-clamp-2 leading-relaxed">
                    {c.highlight}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="px-5 py-3 border-t border-hairline font-mono text-[10px] text-fog-4 flex items-center justify-between"
          style={{ borderTopWidth: "0.5px" }}
        >
          <span>
            RELEVANCE ·{" "}
            {citation.score != null ? citation.score.toFixed(2) : "--"}
          </span>
          <span>PAGE · {citation.page}</span>
          <span>SOURCE · {citation.doc.split("/").pop()?.slice(0, 20) ?? "--"}</span>
        </div>
      </aside>
    </div>
  );
}
