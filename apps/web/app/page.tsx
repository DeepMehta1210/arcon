"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Zap,
  Radio,
  Send,
  Inbox,
  Kanban,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building,
  Mail,
  MessageSquare,
  Sparkles
} from "lucide-react";

export default function GrowthDashboard() {
  const [activeTab, setActiveTab] = useState<"radar" | "pipeline" | "inbox" | "composer">("radar");

  // Live Composer state with real-time ASD-STE100 checks
  const [composerText, setComposerText] = useState(
    "We saw your recent product launch. We built a free diagnostic report. Do you want the link?"
  );
  const [targetEmail, setTargetEmail] = useState("founder@startup.com");
  const [targetSubject, setTargetSubject] = useState("Question about cloud latency");
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Simple real-time sentence word count check
  const sentences = composerText
    .split(/(?<=[.?!])\s+/)
    .filter((s) => s.trim().length > 0);
  const longestSentenceWords = sentences.reduce((max, s) => {
    const count = s.trim().split(/\s+/).length;
    return count > max ? count : max;
  }, 0);
  const isSte100Compliant = longestSentenceWords <= 20;

  const handleSendTouch = () => {
    if (!isSte100Compliant) return;
    setSendSuccess(`Touch sent to ${targetEmail} via Warmbly Fleet. Message ID: <mock-${Date.now()}@3dices.com>`);
    setTimeout(() => setSendSuccess(null), 5000);
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation Bar */}
      <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white">Growth OS</h1>
            <p className="text-xs text-slate-400">Autonomous GTM & Lead Generation Engine</p>
          </div>
        </div>

        {/* Live System Status Badges */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400 ring-1 ring-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Antigravity MCP: Connected
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-blue-400 ring-1 ring-blue-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            SMTP Verifier: $0 API Fees
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-purple-400 ring-1 ring-purple-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            ASD-STE100: Active
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/30 p-4">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("radar")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === "radar"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Radio className="h-4 w-4" />
              Sourcing Radar
            </button>
            <button
              onClick={() => setActiveTab("pipeline")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === "pipeline"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Kanban className="h-4 w-4" />
              Opportunity Kanban
            </button>
            <button
              onClick={() => setActiveTab("inbox")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === "inbox"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Inbox className="h-4 w-4" />
              Unified Inbox
            </button>
            <button
              onClick={() => setActiveTab("composer")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === "composer"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Send className="h-4 w-4" />
              STE100 Outbound
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === "radar" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Live Signal Radar</h2>
                  <p className="text-sm text-slate-400">
                    Real-time triggers mined from Hacker News Show HN, Y Combinator, and Google Maps.
                  </p>
                </div>
                <button
                  onClick={() => alert("Antigravity MCP triggered: /listen-signals")}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  <Search className="h-4 w-4" />
                  Sweep Live Signals
                </button>
              </div>

              {/* Signal Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold uppercase tracking-wider text-emerald-400">Show HN</span>
                    <span>15m ago</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-white">Double (YC W24)</h3>
                  <p className="mt-1 text-sm text-slate-400">Index investing engine with 0% expense ratios launched today.</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">Score: 92%</span>
                    <button
                      onClick={() => alert("Running 5-agent research swarm on Double...")}
                      className="text-xs font-semibold text-emerald-400 hover:underline"
                    >
                      Run Research Swarm →
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold uppercase tracking-wider text-purple-400">YC Directory</span>
                    <span>1h ago</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-white">SSOReady</h3>
                  <p className="mt-1 text-sm text-slate-400">Open source SAML SSO infrastructure for B2B applications.</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">Score: 88%</span>
                    <button
                      onClick={() => alert("Running 5-agent research swarm on SSOReady...")}
                      className="text-xs font-semibold text-emerald-400 hover:underline"
                    >
                      Run Research Swarm →
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold uppercase tracking-wider text-blue-400">Google Maps</span>
                    <span>2h ago</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-white">Downtown Dental Studio</h3>
                  <p className="mt-1 text-sm text-slate-400">High-growth practice in Chicago. Phone verified: +1 312-555-0199.</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">Socket Valid</span>
                    <button
                      onClick={() => alert("Drafting WhatsApp touch with anti-ban jitter...")}
                      className="text-xs font-semibold text-emerald-400 hover:underline"
                    >
                      Queue WhatsApp Touch →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "pipeline" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Opportunity Pipeline Kanban</h2>
                <p className="text-sm text-slate-400">Stages synchronized with PostgreSQL 16 database.</p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <h3 className="text-xs font-semibold uppercase text-slate-400">1. Researched (3)</h3>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-800/60 p-3 text-xs">
                      <p className="font-semibold text-white">Acme Analytics</p>
                      <p className="text-slate-400">Decision Maker: Sarah Connor</p>
                      <span className="mt-2 inline-block rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                        Score 88%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <h3 className="text-xs font-semibold uppercase text-slate-400">2. Ready to Send (1)</h3>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-800/60 p-3 text-xs">
                      <p className="font-semibold text-white">CloudScale Inc</p>
                      <p className="text-slate-400">Angle: Latency Diagnostic</p>
                      <span className="mt-2 inline-block rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
                        STE-100 Verified
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <h3 className="text-xs font-semibold uppercase text-slate-400">3. Touch Sent (8)</h3>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-800/60 p-3 text-xs">
                      <p className="font-semibold text-white">VectorBase</p>
                      <p className="text-slate-400">Channel: Cold Email (Warmbly)</p>
                      <span className="mt-2 inline-block rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
                        Receipt: #9a1b4
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <h3 className="text-xs font-semibold uppercase text-emerald-400">4. Meeting Booked (2)</h3>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs">
                      <p className="font-semibold text-emerald-200">Kiro AI Systems</p>
                      <p className="text-slate-400">Call scheduled for Friday</p>
                      <span className="mt-2 inline-block rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                        Deal Value: $6,000/mo
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "inbox" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Unified Multi-Channel Inbox</h2>
                <p className="text-sm text-slate-400">Consolidated Email, WhatsApp, and LinkedIn conversations.</p>
              </div>

              <div className="grid grid-cols-3 gap-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="space-y-3 border-r border-slate-800 pr-4">
                  <div className="rounded-lg bg-slate-800/80 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">David Miller</span>
                      <span className="text-emerald-400">Interested</span>
                    </div>
                    <p className="mt-1 text-slate-300">Yes, please send over the diagnostic report...</p>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Elena Rostova</span>
                      <span className="text-blue-400">WhatsApp</span>
                    </div>
                    <p className="mt-1 text-slate-400">Can you do Thursday 2 PM?</p>
                  </div>
                </div>
                <div className="col-span-2 space-y-4">
                  <div className="rounded-lg bg-slate-900/80 p-4 text-sm">
                    <p className="text-xs text-slate-400">From: David Miller &lt;david@vectorbase.io&gt;</p>
                    <p className="mt-2 text-slate-200">
                      Hi Deep, yes please send over the diagnostic report you mentioned. We have been experiencing latency
                      spikes on our read replicas.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 p-3">
                    <textarea
                      rows={3}
                      className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                      placeholder="Type your STE-100 response..."
                      defaultValue="We attached the report. It highlights three latency bottlenecks. When can your team review it?"
                    />
                    <div className="mt-2 flex justify-between">
                      <span className="text-xs text-emerald-400">ASD-STE100: PASS (13 words)</span>
                      <button className="rounded bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950">
                        Send Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "composer" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Outbound Composer & Quality Gate</h2>
                <p className="text-sm text-slate-400">
                  Pre-send validation enforces ASD-STE100 word limits and strips AI slop tokens.
                </p>
              </div>

              {sendSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4" />
                  {sendSuccess}
                </div>
              )}

              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
                <div>
                  <label className="text-xs font-medium text-slate-400">Recipient Email</label>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">Subject Line</label>
                  <input
                    type="text"
                    value={targetSubject}
                    onChange={(e) => setTargetSubject(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">Outreach Body</label>
                  <textarea
                    rows={4}
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Real-time STE-100 Validation Bar */}
                <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    {isSte100Compliant ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    )}
                    <span>
                      Longest Sentence: <strong>{longestSentenceWords} words</strong> (Limit: 20 words)
                    </span>
                  </div>
                  <span className={`font-semibold ${isSte100Compliant ? "text-emerald-400" : "text-amber-400"}`}>
                    {isSte100Compliant ? "STE-100 COMPLIANT" : "EXCEEDS LIMIT"}
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() =>
                      setComposerText(
                        "We saw your recent product launch. We built a free diagnostic report. Do you want the link?"
                      )
                    }
                    className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Load Mom-Test Play
                  </button>
                  <button
                    onClick={handleSendTouch}
                    disabled={!isSte100Compliant}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold ${
                      isSte100Compliant
                        ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                        : "cursor-not-allowed bg-slate-800 text-slate-500"
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Dispatch Touch
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
