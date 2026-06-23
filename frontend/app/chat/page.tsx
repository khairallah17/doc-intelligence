"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { DocHeader } from "@/components/chat/doc-header";
import { ThreadIntro } from "@/components/chat/thread-intro";
import { Message } from "@/components/chat/message";
import { StreamingMessage } from "@/components/chat/streaming-message";
import { Composer } from "@/components/chat/composer";
import { CitationDrawer } from "@/components/chat/citation-drawer";
import {
  apiGet,
  apiPost,
  streamChat,
  type DocumentResponse,
  type MessageResponse,
  type SessionResponse,
} from "@/lib/api";
import { citationFromSource, docFromApi, messageFromApi } from "@/lib/adapters";
import { formatTime } from "@/lib/utils";
import type { Citation, DocRecord, Message as MessageType } from "@/lib/types";

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatView />
    </Suspense>
  );
}

interface StreamState {
  text: string;
}

function ChatView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryDocId = searchParams.get("doc");
  const querySessionId = searchParams.get("session");

  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>("");
  const activeDoc = docs.find((d) => d.id === activeDocId) ?? docs[0];

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionResponse[]>([]);

  const [thread, setThread] = useState<MessageType[]>([]);
  const [citationRegistry, setCitationRegistry] = useState<Record<string, Citation>>({});
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<StreamState | null>(null);
  const [openCitation, setOpenCitation] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Load document list
  // -------------------------------------------------------------------------
  useEffect(() => {
    apiGet<DocumentResponse[]>("/documents").then((list) => {
      const mapped = list.filter((d) => d.status === "ready").map(docFromApi);
      setDocs(mapped);
      const initial =
        queryDocId && mapped.some((d) => d.id === queryDocId)
          ? queryDocId
          : mapped[0]?.id ?? "";
      setActiveDocId(initial);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Sync ?doc= query param
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!activeDocId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("doc", activeDocId);
    router.replace(`/chat?${params.toString()}`, { scroll: false });
  }, [activeDocId]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Load sessions + resume latest when activeDocId changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!activeDocId) return;

    let cancelled = false;
    setThread([]);
    setCitationRegistry({});
    setSessionId(null);
    setSessions([]);

    (async () => {
      try {
        // Fetch existing sessions for this document
        const existing = await apiGet<SessionResponse[]>(
          `/chat/sessions?document_id=${activeDocId}`,
        );
        if (cancelled) return;

        setSessions(existing);

        if (existing.length > 0) {
          // Resume the session from the URL param, or fall back to most recent
          const target = querySessionId
            ? (existing.find((s) => s.id === querySessionId) ?? existing[0])
            : existing[0];
          await loadSession(target, cancelled);
        } else {
          // No sessions yet — create the first one
          const session = await apiPost<SessionResponse>("/chat/sessions", {
            document_id: activeDocId,
          });
          if (cancelled) return;
          setSessions([session]);
          setSessionId(session.id);
        }
      } catch (err) {
        console.error("Failed to load sessions:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeDocId, docs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Load messages for a session
  // -------------------------------------------------------------------------
  async function loadSession(session: SessionResponse, cancelled = false) {
    setSessionId(session.id);
    setThread([]);
    setCitationRegistry({});

    const messages = await apiGet<MessageResponse[]>(
      `/chat/sessions/${session.id}/messages`,
    );
    if (cancelled) return;

    const doc = docs.find((d) => d.id === activeDocId);
    const docName = doc?.name ?? "document";
    const registry: Record<string, Citation> = {};
    const loaded = messages.map((m) => messageFromApi(m, docName, registry));
    setCitationRegistry(registry);
    setThread(loaded);
  }

  // -------------------------------------------------------------------------
  // New thread
  // -------------------------------------------------------------------------
  const handleNewThread = useCallback(async () => {
    if (!activeDocId) return;
    try {
      const session = await apiPost<SessionResponse>("/chat/sessions", {
        document_id: activeDocId,
      });
      setSessions((prev) => [session, ...prev]);
      setSessionId(session.id);
      setThread([]);
      setCitationRegistry({});
      setOpenCitation(null);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  }, [activeDocId]);

  // -------------------------------------------------------------------------
  // Delete session
  // -------------------------------------------------------------------------
  const handleDeleteSession = useCallback(
    (deletedId: string) => {
      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== deletedId);
        if (deletedId === sessionId) {
          // Switch to next available session or clear
          if (remaining.length > 0) {
            loadSession(remaining[0]);
          } else {
            setSessionId(null);
            setThread([]);
            setCitationRegistry({});
          }
        }
        return remaining;
      });
    },
    [sessionId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // -------------------------------------------------------------------------
  // Auto scroll
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread.length, streaming?.text]);

  // -------------------------------------------------------------------------
  // Send message + stream response
  // -------------------------------------------------------------------------
  const send = useCallback(async () => {
    if (!input.trim() || streaming || !sessionId) return;

    const userMsg: MessageType = {
      id: "u" + Date.now(),
      role: "user",
      text: input.trim(),
      time: formatTime(),
    };
    setThread((th) => [...th, userMsg]);
    setInput("");
    setStreaming({ text: "" });

    try {
      const res = await streamChat(sessionId, userMsg.text);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;

          try {
            const event = JSON.parse(payload) as {
              type: string;
              content?: string;
              sources?: Array<{ page: number; chunk_text: string; score: number }>;
            };

            if (event.type === "token" && event.content) {
              fullText += event.content;
              setStreaming({ text: fullText });
            } else if (event.type === "sources" && event.sources) {
              const doc = docs.find((d) => d.id === activeDocId);
              const docName = doc?.name ?? "document";
              const msgId = "a" + Date.now();
              const newRegistry: Record<string, Citation> = {};
              const citationIds = event.sources.map((s, idx) => {
                const [id, citation] = citationFromSource(s, docName, msgId, idx);
                newRegistry[id] = citation;
                return id;
              });

              setCitationRegistry((prev) => ({ ...prev, ...newRegistry }));

              const assistantMsg: MessageType = {
                id: msgId,
                role: "assistant",
                text: fullText,
                time: formatTime(),
                citations: citationIds.length > 0 ? citationIds : undefined,
              };
              setThread((th) => [...th, assistantMsg]);
              setStreaming(null);
            }
          } catch {
            // skip malformed frames
          }
        }
      }

      // Fallback: [DONE] with no sources event
      if (streaming !== null) {
        setThread((th) => [
          ...th,
          { id: "a" + Date.now(), role: "assistant", text: fullText, time: formatTime() },
        ]);
        setStreaming(null);
      }
    } catch (err) {
      console.error("Streaming error:", err);
      setStreaming(null);
    }
  }, [input, streaming, sessionId, activeDocId, docs]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // -------------------------------------------------------------------------
  // Citation drawer
  // -------------------------------------------------------------------------
  const openCitationObj = openCitation ? citationRegistry[openCitation] : null;
  const allCitationsForDrawer: [string, Citation][] = openCitation
    ? (() => {
        const msg = thread.find((m) => m.citations?.includes(openCitation));
        return (msg?.citations ?? [openCitation])
          .filter((id) => citationRegistry[id])
          .map((id) => [id, citationRegistry[id]]);
      })()
    : [];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="relative h-screen flex flex-col" data-screen-label="02 Chat">
      <TopBar
        inChat
        rightSlot={
          <div className="hidden md:flex items-center gap-2 font-mono text-[10.5px] text-fog-3 mr-2">
            <span className="w-1 h-1 rounded-full bg-mint" />
            THREAD · LIVE
          </div>
        }
      />

      <div className="flex-1 min-h-0 flex relative">
        <ChatSidebar
          docs={docs}
          activeId={activeDocId}
          setActiveId={(id) => {
            setActiveDocId(id);
            setOpenCitation(null);
          }}
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          activeSessionId={sessionId}
          sessions={sessions}
          onSelectSession={(s) => {
            loadSession(s);
            setOpenCitation(null);
          }}
          onDeleteSession={handleDeleteSession}
          onNewThread={handleNewThread}
        />

        <section className="flex-1 min-w-0 flex flex-col relative">
          {activeDoc && (
            <DocHeader
              doc={activeDoc}
              onSwitch={() => setSidebarOpen(!sidebarOpen)}
              sidebarOpen={sidebarOpen}
            />
          )}

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8 space-y-7">
              {activeDoc && <ThreadIntro doc={activeDoc} />}
              {thread.map((m) => (
                <Message
                  key={m.id}
                  m={m}
                  citationRegistry={citationRegistry}
                  onCite={(id) => setOpenCitation(id)}
                  openCitation={openCitation}
                />
              ))}
              {streaming && <StreamingMessage text={streaming.text} done={false} />}
            </div>
          </div>

          {activeDoc && (
            <Composer
              input={input}
              setInput={setInput}
              onSend={send}
              onKey={onKey}
              streaming={!!streaming}
              onClear={() => setThread([])}
              docName={activeDoc.name}
              pages={activeDoc.pages}
            />
          )}
        </section>

        {openCitation && openCitationObj && (
          <CitationDrawer
            citation={openCitationObj}
            allCitations={allCitationsForDrawer}
            activeId={openCitation}
            setActiveId={setOpenCitation}
            onClose={() => setOpenCitation(null)}
          />
        )}
      </div>
    </div>
  );
}
