"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
      router.push("/");
    } catch (err: unknown) {
      const e = err as { body?: { detail?: string; errors?: { message: string }[] } };
      const detail = e.body?.errors?.[0]?.message ?? e.body?.detail ?? "Something went wrong";
      setError(String(detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-0 flex items-center justify-center px-4">
      {/* ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,137,255,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mark mb-4">
            <span className="font-serif text-[22px] text-fog-0 italic">L</span>
          </div>
          <h1 className="font-serif text-[32px] text-fog-0 leading-tight">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-fog-3 text-[13.5px] mt-1.5">
            {mode === "login"
              ? "Sign in to your Lexicon workspace"
              : "Start talking to your documents"}
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={submit}
          className="bg-ink-1/60 hairline rounded-xl p-6 space-y-4 backdrop-blur-sm"
        >
          {mode === "register" && (
            <div>
              <label className="eyebrow block mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Ada Lovelace"
                className="w-full h-10 bg-ink-2 hairline rounded-md px-3 text-[13.5px] text-fog-0 placeholder:text-fog-4 focus:outline-none focus:border-iris/40 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="eyebrow block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full h-10 bg-ink-2 hairline rounded-md px-3 text-[13.5px] text-fog-0 placeholder:text-fog-4 focus:outline-none focus:border-iris/40 transition-colors"
            />
          </div>

          <div>
            <label className="eyebrow block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min. 8 characters"
              className="w-full h-10 bg-ink-2 hairline rounded-md px-3 text-[13.5px] text-fog-0 placeholder:text-fog-4 focus:outline-none focus:border-iris/40 transition-colors"
            />
          </div>

          {error && (
            <p className="text-[12.5px] text-amber font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-md text-[13.5px] font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            style={{
              background: "linear-gradient(180deg, #7c89ff 0%, #5a67e0 100%)",
              boxShadow:
                "0 1px 0 0 rgba(255,255,255,0.18) inset, 0 8px 16px -8px rgba(124,137,255,0.55)",
            }}
          >
            {loading
              ? "Please wait…"
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-fog-3 text-[13px] mt-5">
          {mode === "login" ? "No account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            className="text-iris hover:underline"
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
