"use client";

import type { UploadState } from "@/lib/types";
import { FileText } from "lucide-react";

export function UploadRow({ u }: { u: UploadState }) {
  const stageLabel =
    u.stage === "uploading"
      ? "Uploading"
      : u.stage === "processing"
        ? "Indexing"
        : "Done";
  const pct = u.stage === "uploading" ? u.progress : u._proc ?? 0;
  return (
    <div className="flex items-center gap-4">
      <FileText className="w-3.5 h-3.5 text-iris shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[12px] text-fog-1 truncate">{u.name}</span>
          <span className="font-mono text-[10.5px] text-fog-3 ml-3">
            {stageLabel} · {pct}%
          </span>
        </div>
        <div className="h-[3px] bg-ink-4 rounded-full overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: pct + "%",
              background:
                u.stage === "processing"
                  ? "linear-gradient(90deg, #7aebc4, #7c89ff)"
                  : "linear-gradient(90deg, #5a67e0, #7c89ff)",
            }}
          />
          {u.stage === "processing" && (
            <div className="absolute inset-0 shimmer" />
          )}
        </div>
      </div>
    </div>
  );
}
