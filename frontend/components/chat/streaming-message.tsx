"use client";

import { AssistantAvatar } from "./assistant-avatar";

interface StreamingMessageProps {
  text: string;
  done?: boolean;
}

export function StreamingMessage({ text, done }: StreamingMessageProps) {
  return (
    <div className="flex gap-3">
      <AssistantAvatar streaming />
      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-[10.5px] text-iris">Lexicon</span>
          <span className="font-mono text-[10px] text-fog-4">· streaming</span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-fog-3">
            <span className="w-1 h-1 rounded-full bg-iris animate-pulse" />
            <span
              className="w-1 h-1 rounded-full bg-iris animate-pulse"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="w-1 h-1 rounded-full bg-iris animate-pulse"
              style={{ animationDelay: "0.4s" }}
            />
          </span>
        </div>
        <div
          className="text-[14.5px] leading-[1.7] text-fog-1"
          style={{ textWrap: "pretty" } as React.CSSProperties}
        >
          {text}
          {!done && <span className="caret" />}
        </div>
      </div>
    </div>
  );
}
