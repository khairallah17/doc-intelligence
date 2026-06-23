interface AssistantAvatarProps {
  streaming?: boolean;
}

export function AssistantAvatar({ streaming }: AssistantAvatarProps) {
  return (
    <div
      className="shrink-0 w-8 h-8 rounded-lg mark relative overflow-hidden flex items-center justify-center"
      style={{
        boxShadow: streaming
          ? "0 0 0 0.5px rgba(255,255,255,0.20) inset, 0 0 24px -4px rgba(124,137,255,0.7)"
          : undefined,
      }}
    >
      <span className="font-mono text-[11px] text-white/95 font-semibold">L</span>
    </div>
  );
}
