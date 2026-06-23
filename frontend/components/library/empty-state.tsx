"use client";

import { FileSearch } from "lucide-react";

export function EmptyState({ onSimulate }: { onSimulate: () => void }) {
  return (
    <div className="rounded-xl hairline bg-ink-2/40 py-16 px-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-lg hairline bg-ink-3 flex items-center justify-center mb-4">
        <FileSearch className="w-5 h-5 text-fog-3" strokeWidth={1.5} />
      </div>
      <h3 className="font-serif text-[22px] text-fog-0">Nothing here yet.</h3>
      <p className="text-fog-3 text-[13px] mt-1.5">
        Upload your first PDF to start asking questions.
      </p>
      <button
        onClick={onSimulate}
        className="mt-5 h-9 px-4 rounded-md text-[13px] font-medium text-white"
        style={{
          background: "linear-gradient(180deg, #7c89ff 0%, #5a67e0 100%)",
        }}
      >
        Upload a document
      </button>
    </div>
  );
}
