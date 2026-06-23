"use client";

import { Quote } from "lucide-react";
import type { Citation } from "@/lib/types";

interface CitationPillProps {
  id: string;
  citation: Citation | undefined;
  onClick: (id: string) => void;
  active: boolean;
}

export function CitationPill({ id, citation, onClick, active }: CitationPillProps) {
  if (!citation) return null;
  return (
    <button
      onClick={() => onClick(id)}
      className={
        "cite-pill inline-flex items-stretch rounded-md font-mono text-[11.5px] overflow-hidden hairline " +
        (active ? "active" : "bg-ink-2/80")
      }
      style={{
        borderColor: active ? "rgba(124,137,255,0.55)" : "rgba(255,255,255,0.08)",
      }}
    >
      <span
        className="px-2 py-1.5 bg-ink-3/80 text-iris border-r border-hairline flex items-center gap-1"
        style={{ borderRightWidth: "0.5px" }}
      >
        <Quote className="w-2.5 h-2.5" strokeWidth={1.5} />
        p.{citation.page}
      </span>
      <span className="px-2.5 py-1.5 text-fog-2 max-w-[280px] truncate">
        {citation.section.replace(/^§ ?/, "")}
      </span>
    </button>
  );
}
