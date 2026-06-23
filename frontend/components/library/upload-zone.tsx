"use client";

import { useState } from "react";
import { UploadRow } from "./upload-row";
import type { UploadState } from "@/lib/types";

interface UploadZoneProps {
  /** Called when the zone is clicked (opens the file picker). */
  onSimulate: () => void;
  /** Called when files are dropped onto the zone. */
  onFiles?: (files: FileList) => void;
  uploads: UploadState[];
}

export function UploadZone({ onSimulate, onFiles, uploads }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <section
      onDragEnter={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragActive(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files.length && onFiles) {
          onFiles(e.dataTransfer.files);
        } else {
          onSimulate();
        }
      }}
      onClick={onSimulate}
      className={
        "relative cursor-pointer rounded-xl overflow-hidden group transition-all " +
        (dragActive ? "bg-iris/[0.04]" : "bg-ink-2/40 hover:bg-ink-2/60")
      }
      style={{
        border: dragActive
          ? "1px dashed transparent"
          : "0.5px solid rgba(255,255,255,0.06)",
      }}
    >
      {dragActive && (
        <div className="dropzone-active absolute inset-0 rounded-xl pointer-events-none" />
      )}

      <div className="px-8 py-10 flex flex-col md:flex-row items-center gap-8">
        <div className="shrink-0 relative">
          {/* Decorative stacked PDFs */}
          <div className="relative w-24 h-28">
            <div className="absolute inset-0 rounded-md hairline bg-ink-3 rotate-[-6deg] translate-x-[-8px] translate-y-1" />
            <div className="absolute inset-0 rounded-md hairline bg-ink-3 rotate-[3deg] translate-x-[2px]" />
            <div
              className="absolute inset-0 rounded-md bg-ink-4 flex flex-col p-2.5"
              style={{ border: "0.5px solid rgba(124,137,255,0.30)" }}
            >
              <div className="font-mono text-[8px] text-iris tracking-wider">
                PDF
              </div>
              <div className="mt-1 space-y-1">
                <div className="h-0.5 bg-white/10 rounded w-full" />
                <div className="h-0.5 bg-white/10 rounded w-3/4" />
                <div className="h-0.5 bg-white/10 rounded w-5/6" />
                <div className="h-0.5 bg-white/10 rounded w-2/3" />
                <div className="h-0.5 bg-white/10 rounded w-4/5" />
              </div>
              <div className="mt-auto flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-iris" />
                <div className="font-mono text-[7px] text-fog-3">INDEX</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="eyebrow mb-2">
            {dragActive ? "Drop to upload" : "Drop zone"}
          </div>
          <h3 className="font-serif text-[26px] text-fog-0 leading-tight">
            Drag a PDF here, or{" "}
            <span className="text-iris underline decoration-iris/40 underline-offset-4">
              browse files
            </span>
            .
          </h3>
          <p className="mt-2 text-fog-3 text-[13.5px]">
            Up to 250 MB per document · OCR runs automatically on scanned pages ·
            Most files index in under 30 seconds.
          </p>
        </div>

        <div className="shrink-0 hidden md:flex flex-col items-end gap-2 font-mono text-[10.5px] text-fog-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-mint" />
            OCR · ENABLED
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-mint" />
            EMBEDDINGS · v3
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-amber" />
            MAX · 250 MB
          </div>
        </div>
      </div>

      {/* In-flight uploads */}
      {uploads.length > 0 && (
        <div
          className="border-t border-hairline px-8 py-4 space-y-3 bg-ink-1/60"
          style={{ borderTopWidth: "0.5px" }}
        >
          {uploads.map((u) => (
            <UploadRow key={u.id} u={u} />
          ))}
        </div>
      )}
    </section>
  );
}
