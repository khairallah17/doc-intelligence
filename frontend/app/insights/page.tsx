"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  MessageSquareText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { apiGet, type InsightsResponse } from "@/lib/api";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<InsightsResponse>("/insights")
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const memberSince = data
    ? new Date(data.member_since).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="relative min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[28px] text-fog-0 mb-1">Insights</h1>
            <p className="text-fog-3 text-[13.5px]">Your activity at a glance.</p>
          </div>
          <span className="font-mono text-[11px] text-fog-4 shrink-0">
            Member since {memberSince}
          </span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <StatCard
            loading={loading}
            icon={FileText}
            label="Documents"
            value={data?.document_count ?? 0}
            sub={data ? formatBytes(data.total_size_bytes) + " total" : "—"}
            color="iris"
          />
          <StatCard
            loading={loading}
            icon={BookOpen}
            label="Pages indexed"
            value={data?.total_pages ?? 0}
            sub="across all documents"
            color="mint"
          />
          <StatCard
            loading={loading}
            icon={MessageSquareText}
            label="Questions asked"
            value={data?.question_count ?? 0}
            sub="total user messages"
            color="iris"
          />
          <StatCard
            loading={loading}
            icon={Sparkles}
            label="Threads"
            value={data?.session_count ?? 0}
            sub="chat sessions"
            color="amber"
          />
        </div>

        {/* Top documents */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="eyebrow">Most active documents</span>
            <div
              className="flex-1 border-t border-hairline"
              style={{ borderTopWidth: "0.5px" }}
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-ink-2/60 animate-pulse" />
              ))}
            </div>
          ) : !data || data.top_documents.length === 0 ? (
            <p className="text-fog-4 text-[13px]">
              No activity yet. Start by opening a document.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.top_documents.map((doc, i) => (
                <li key={String(doc.id)}>
                  <Link
                    href={`/chat?doc=${doc.id}`}
                    className="group flex items-center gap-4 rounded-lg px-4 py-3 hairline bg-ink-2/40 hover:bg-ink-2 transition-colors"
                  >
                    <span className="font-mono text-[11px] text-fog-5 w-4 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] text-fog-1 truncate group-hover:text-fog-0 transition-colors">
                        {doc.name.replace(/\.pdf$/i, "")}
                      </div>
                      <div className="font-mono text-[10.5px] text-fog-4 mt-0.5">
                        {doc.page_count != null ? `${doc.page_count} pp` : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-5 shrink-0">
                      <MiniStat label="threads" value={doc.session_count} />
                      <MiniStat label="questions" value={doc.question_count} highlight />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type Color = "iris" | "mint" | "amber";

const COLOR_MAP: Record<Color, { bg: string; icon: string; border: string }> = {
  iris:  { bg: "bg-iris/10",  icon: "text-iris",  border: "border-iris/20" },
  mint:  { bg: "bg-mint/10",  icon: "text-mint",  border: "border-mint/20" },
  amber: { bg: "bg-amber/10", icon: "text-amber",  border: "border-amber/20" },
};

function StatCard({
  loading,
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  loading: boolean;
  icon: LucideIcon;
  label: string;
  value: number;
  sub: string;
  color: Color;
}) {
  const c = COLOR_MAP[color];
  return (
    <div className="rounded-xl hairline bg-ink-2/50 p-5">
      <div className="mb-4">
        <div
          className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}
        >
          <Icon className={`w-4 h-4 ${c.icon}`} strokeWidth={1.5} />
        </div>
      </div>
      {loading ? (
        <div className="h-9 w-20 bg-ink-3 rounded animate-pulse mb-2" />
      ) : (
        <div className="font-serif text-[38px] leading-none text-fog-0 mb-2">
          {value.toLocaleString()}
        </div>
      )}
      <div className="font-mono text-[11.5px] text-fog-1 mb-0.5">{label}</div>
      <div className="font-mono text-[10px] text-fog-4">{sub}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="text-right">
      <div
        className={`font-mono text-[13px] ${highlight ? "text-iris" : "text-fog-2"}`}
      >
        {value}
      </div>
      <div className="font-mono text-[9.5px] text-fog-4">{label}</div>
    </div>
  );
}
