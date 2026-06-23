"use client";

import { ArrowUp, Paperclip, Slash, Trash2 } from "lucide-react";

interface ComposerProps {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  streaming: boolean;
  onClear: () => void;
  docName: string;
  pages: number;
}

export function Composer({
  input,
  setInput,
  onSend,
  onKey,
  streaming,
  onClear,
  docName,
  pages,
}: ComposerProps) {
  const sendable = input.trim() && !streaming;
  return (
    <div
      className="border-t border-hairline px-6 lg:px-8 py-4 bg-ink-1/40 backdrop-blur shrink-0"
      style={{ borderTopWidth: "0.5px" }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="relative rounded-xl hairline bg-ink-2/80 focus-within:border-iris/40 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask anything about this document…"
            rows={2}
            className="block w-full bg-transparent resize-none px-4 pt-3.5 pb-12 text-[14px] text-fog-0 placeholder:text-fog-4 focus:outline-none leading-relaxed"
          />
          <div className="absolute left-3 right-3 bottom-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                className="h-7 px-2 rounded text-fog-3 hover:text-fog-0 hover:bg-ink-3 flex items-center gap-1 text-[12px]"
                title="Attach"
              >
                <Paperclip className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <button className="h-7 px-2 rounded text-fog-3 hover:text-fog-0 hover:bg-ink-3 flex items-center gap-1 text-[12px]">
                <Slash className="w-3 h-3" strokeWidth={1.5} />
                <span className="font-mono text-[11px]">commands</span>
              </button>
              <button
                onClick={onClear}
                className="h-7 px-2 rounded text-fog-3 hover:text-fog-0 hover:bg-ink-3 flex items-center gap-1 text-[12px]"
              >
                <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                <span className="font-mono text-[11px]">clear</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-fog-4 hidden sm:inline">
                ⌘ + ↵ to send
              </span>
              <button
                onClick={onSend}
                disabled={!sendable}
                className={
                  "h-7 px-3 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-all " +
                  (sendable ? "text-white" : "bg-ink-3 text-fog-4 cursor-not-allowed")
                }
                style={
                  sendable
                    ? {
                        background:
                          "linear-gradient(180deg, #7c89ff 0%, #5a67e0 100%)",
                        boxShadow:
                          "0 1px 0 0 rgba(255,255,255,0.18) inset, 0 6px 12px -4px rgba(124,137,255,0.5)",
                      }
                    : {}
                }
              >
                {streaming ? "Streaming…" : "Send"}
                <ArrowUp className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-2 px-1 flex items-center justify-between font-mono text-[10px] text-fog-4">
          <span>
            Grounded · {docName} · {pages} pages
          </span>
          <span>Lexicon may quote out of context · always verify citations</span>
        </div>
      </div>
    </div>
  );
}
