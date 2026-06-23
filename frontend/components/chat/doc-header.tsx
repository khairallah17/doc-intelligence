"use client";

import { FileText, MoreVertical, PanelLeftOpen, Repeat, Share2 } from "lucide-react";
import type { DocRecord } from "@/lib/types";
import { StatusBadge } from "../library/status-badge";

interface DocHeaderProps {
  doc: DocRecord;
  onSwitch: () => void;
  sidebarOpen: boolean;
}

export function DocHeader({ doc, onSwitch, sidebarOpen }: DocHeaderProps) {
  return (
    <div
      className="border-b border-hairline px-6 lg:px-8 h-14 flex items-center gap-4 shrink-0 bg-ink-1/40 backdrop-blur"
      style={{ borderBottomWidth: "0.5px" }}
    >
      {!sidebarOpen && (
        <button
          onClick={onSwitch}
          className="w-8 h-8 rounded-md hairline hover:bg-ink-2 flex items-center justify-center text-fog-3 hover:text-fog-0"
        >
          <PanelLeftOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      )}
      <div className="w-7 h-9 rounded-sm hairline bg-ink-3 flex items-center justify-center shrink-0">
        <FileText className="w-3.5 h-3.5 text-iris" strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <h2 className="font-mono text-[13px] text-fog-0 truncate">{doc.name}</h2>
          <span className="font-mono text-[10.5px] text-fog-4 shrink-0">
            {doc.pages} pp · {doc.sizeMB} MB
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <StatusBadge status={doc.status} progress={doc.progress} />
          <span className="font-mono text-[10px] text-fog-5">·</span>
          <span className="font-mono text-[10px] text-fog-4 uppercase tracking-wider">
            Indexed · embeddings v3
          </span>
        </div>
      </div>

      <button
        onClick={onSwitch}
        className="hidden md:flex h-8 px-3 rounded-md hairline items-center gap-1.5 text-[12.5px] text-fog-1 hover:bg-ink-2"
      >
        <Repeat className="w-3.5 h-3.5" strokeWidth={1.5} />
        Switch document
      </button>
      <button className="h-8 w-8 rounded-md hairline flex items-center justify-center text-fog-3 hover:text-fog-0 hover:bg-ink-2">
        <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
      <button className="h-8 w-8 rounded-md hairline flex items-center justify-center text-fog-3 hover:text-fog-0 hover:bg-ink-2">
        <MoreVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
