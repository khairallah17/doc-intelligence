"use client";

import type { Citation, Message as MessageType } from "@/lib/types";
import { AssistantAvatar } from "./assistant-avatar";
import { CitationPill } from "./citation-pill";

interface MessageProps {
  m: MessageType;
  citationRegistry: Record<string, Citation>;
  onCite: (id: string) => void;
  openCitation: string | null;
}

export function Message({ m, citationRegistry, onCite, openCitation }: MessageProps) {
  if (m.role === "user") return <UserMessage m={m} />;
  return (
    <AssistantMessage
      m={m}
      citationRegistry={citationRegistry}
      onCite={onCite}
      openCitation={openCitation}
    />
  );
}

function UserMessage({ m }: { m: MessageType }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] flex flex-col items-end gap-1.5">
        <div
          className="rounded-2xl rounded-br-md px-4 py-3 text-[14px] leading-relaxed text-fog-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(124,137,255,0.10) 0%, rgba(90,103,224,0.06) 100%)",
            border: "0.5px solid rgba(124,137,255,0.25)",
          }}
        >
          {m.text}
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-fog-4">
          <span>You · {m.time}</span>
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ m, citationRegistry, onCite, openCitation }: MessageProps) {
  return (
    <div className="flex gap-3">
      <AssistantAvatar />
      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-[10.5px] text-fog-2">Lexicon</span>
          <span className="font-mono text-[10px] text-fog-4">· {m.time}</span>
        </div>
        <div
          className="text-[14.5px] leading-[1.7] text-fog-1 font-normal"
          style={{ textWrap: "pretty" } as React.CSSProperties}
        >
          {m.text}
        </div>
        {m.citations && m.citations.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {m.citations.map((cid) => (
              <CitationPill
                key={cid}
                id={cid}
                citation={citationRegistry[cid]}
                onClick={onCite}
                active={openCitation === cid}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
