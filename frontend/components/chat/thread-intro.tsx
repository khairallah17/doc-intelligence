import type { DocRecord } from "@/lib/types";

export function ThreadIntro({ doc }: { doc: DocRecord }) {
  return (
    <div className="pb-2">
      <div className="eyebrow mb-3 flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-iris" />
        Thread opened · {doc.uploadedAt}
      </div>
      <h2 className="font-serif text-[34px] leading-tight text-fog-0 tracking-tight">
        Ask{" "}
        <em className="italic text-iris">
          {doc.name.replace(".pdf", "").replace(/_/g, " ")}
        </em>{" "}
        anything.
      </h2>
      <p className="text-fog-3 text-[13.5px] mt-1.5 max-w-xl">
        Every answer is grounded in the document. Click any citation to inspect the
        exact passage.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          "Summarize the executive overview",
          "What were Q4 results?",
          "Risks called out by auditors",
          "Renewables strategy",
        ].map((s) => (
          <button
            key={s}
            className="px-3 h-7 rounded-full hairline bg-ink-2/60 hover:bg-ink-2 text-[12px] text-fog-2 hover:text-fog-0 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="my-7 flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="font-mono text-[10px] text-fog-4 tracking-wider">
          CONVERSATION
        </span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>
    </div>
  );
}
