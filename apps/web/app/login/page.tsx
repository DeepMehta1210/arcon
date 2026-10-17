"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArconLogo } from "../components/ArconLogo";
import { Lock, Mail, ArrowRight, AlertTriangle, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100 font-sans selection:bg-zinc-800">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <ArconLogo size="lg" showWordmark={true} />
          </div>
          <p className="text-xs text-zinc-400">
            Sign in to access your autonomous outbound lead engine.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-2xl backdrop-blur-sm space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900/90 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-zinc-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900/90 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none transition"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-white py-2 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-40"
            >
              {loading ? "Authenticating..." : "Sign in"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="border-t border-zinc-800/60 pt-3 text-center">
            <p className="flex items-center justify-center gap-1 text-[11px] text-zinc-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Role-Based Access Control & Encrypted Sessions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
