interface StatusBadgeProps {
  status: "ready" | "processing";
  progress?: number;
}

export function StatusBadge({ status, progress }: StatusBadgeProps) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-mint tracking-wider uppercase">
        <span className="w-1 h-1 rounded-full bg-mint" />
        Ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-amber tracking-wider uppercase">
      <span className="w-1 h-1 rounded-full bg-amber animate-pulse" />
      Indexing {progress ?? 0}%
    </span>
  );
}
