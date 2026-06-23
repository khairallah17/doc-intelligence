"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const NAV = [
  { label: "Documents", href: "/" },
  { label: "Threads",   href: "/threads" },
  { label: "Insights",  href: "/insights" },
] as const;

interface TopBarProps {
  inChat?: boolean;
  rightSlot?: React.ReactNode;
}

export function TopBar({ inChat = false, rightSlot }: TopBarProps) {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-md bg-ink-1/70 border-b border-hairline"
      style={{ borderBottomWidth: "0.5px" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="mark w-6 h-6 rounded-[7px] relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-semibold text-white/95">
              L
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[19px] leading-none text-fog-0 tracking-tight">
              Lexicon
            </span>
            <span className="font-mono text-[10px] text-fog-3 tracking-wider uppercase mt-0.5">
              v1.4
            </span>
          </div>
        </Link>

        {inChat && (
          <Link
            href="/"
            className="hidden md:flex items-center gap-1.5 text-fog-2 hover:text-fog-0 text-[13px] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            Library
          </Link>
        )}

        <nav className="hidden lg:flex items-center gap-1 ml-4">
          {NAV.map(({ label, href }) => {
            const active = label === "Documents" ? pathname === "/" : pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className={
                  "px-3 h-8 text-[13px] rounded-md transition-colors " +
                  (active
                    ? "text-fog-0 bg-ink-3"
                    : "text-fog-3 hover:text-fog-1 hover:bg-ink-2")
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {rightSlot}

        {/* Creator credit */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-mono text-[11px] text-fog-1 leading-none">
              Mohamed Khairallah
            </span>
            <span className="font-mono text-[9.5px] text-fog-4 leading-none mt-0.5">
              Creator
            </span>
          </div>
          <div className="w-8 h-8 rounded-full hairline-strong overflow-hidden bg-gradient-to-br from-iris/40 to-mint/30 flex items-center justify-center shrink-0">
            <span className="font-mono text-[11px] text-fog-0 font-medium">MK</span>
          </div>
        </div>
      </div>
    </header>
  );
}
