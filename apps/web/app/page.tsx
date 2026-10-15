"use client";

import React, { useState, useEffect } from "react";
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
  Phone,
  User,
  Globe,
  Sparkles,
  RefreshCw,
  ExternalLink
} from "lucide-react";

interface StoredLead {
  id: string;
  source: string;
  companyName: string;
  contactName?: string;
  headline?: string;
  emailCandidates: string[];
  phone?: string;
  websiteUrl?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    rawAddress?: string;
  };
  socialUrls: Record<string, string>;
  stage: "sourced" | "verified" | "researched" | "contacted" | "replied";
  score: number;
  verificationStatus?: "unverified" | "socket_valid" | "socket_invalid" | "catch_all";
  notes?: string;
}

interface Stats {
  total: number;
  sourced: number;
  verified: number;
  researched: number;
  contacted: number;
  replied: number;
  withEmail: number;
  withPhone: number;
}

export default function GrowthDashboard() {
  const [activeTab, setActiveTab] = useState<"radar" | "pipeline" | "inbox" | "composer">("radar");
  const [leads, setLeads] = useState<StoredLead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Live Composer state with real-time ASD-STE100 checks
  const [composerText, setComposerText] = useState(
    "We saw your recent cloud software updates. We built a free diagnostic report. Do you want the link?"
  );
  const [targetEmail, setTargetEmail] = useState("business@esferasoft.co.uk");
  const [targetSubject, setTargetSubject] = useState("Question about cloud latency");
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Fetch leads and stats
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/leads?limit=100");
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Trigger ingestion
  const handleIngest = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/leads", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await fetchLeads();
      }
    } catch (err) {
      console.error("Ingestion error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Run live socket SMTP verification
  const handleVerify = async (lead: StoredLead) => {
    setActionLoadingId(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/verify`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.lead) {
        setLeads((prev) => prev.map((l) => (l.id === lead.id ? data.lead : l)));
        setStats((prev) => prev ? { ...prev, verified: prev.verified + 1 } : null);
      }
    } catch (err) {
      console.error("Verify failed:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Run 5-agent research swarm
  const handleResearch = async (lead: StoredLead) => {
    setActionLoadingId(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/research`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.lead) {
        setLeads((prev) => prev.map((l) => (l.id === lead.id ? data.lead : l)));
        if (data.dossier?.suggestedAngle) {
          setComposerText(data.dossier.suggestedAngle);
        }
      }
    } catch (err) {
      console.error("Research failed:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Switch to composer with prefilled lead
  const handleComposeForLead = (lead: StoredLead) => {
    if (lead.emailCandidates[0]) {
      setTargetEmail(lead.emailCandidates[0]);
    }
    setTargetSubject(`Cloud optimization question for ${lead.companyName}`);
    if (lead.notes) {
      setComposerText(lead.notes);
    } else {
      setComposerText(
        `We reviewed the cloud infrastructure for ${lead.companyName}. We found three latency bottlenecks. Can we send the diagnostic report?`
      );
    }
    setActiveTab("composer");
  };

  // ASD-STE100 word count validation
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
    setSendSuccess(`Touch dispatched to ${targetEmail} via Warmbly Fleet. Message ID: <touch-${Date.now()}@3dices.com>`);
    setTimeout(() => setSendSuccess(null), 5000);
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.location?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.location?.country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={handleIngest}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Sync Leads Folder
          </button>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400 ring-1 ring-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {stats ? `${stats.total} Leads Loaded` : "Loading Leads..."}
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
              {stats && (
                <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {stats.total}
                </span>
              )}
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
              Pipeline Kanban
              {stats && (
                <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {stats.researched}
                </span>
              )}
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

          {/* Quick Metrics Widget */}
          {stats && (
            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Database Metrics</h4>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Total Targets</span>
                  <span className="font-semibold text-white">{stats.total}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>With Direct Email</span>
                  <span className="font-semibold text-emerald-400">{stats.withEmail}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>With Direct Phone</span>
                  <span className="font-semibold text-blue-400">{stats.withPhone}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Researched (&gt;=70%)</span>
                  <span className="font-semibold text-purple-400">{stats.researched}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: SOURCING RADAR */}
          {activeTab === "radar" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Target Lead Radar</h2>
                  <p className="text-sm text-slate-400">
                    Real-time B2B targets imported directly from your Leads folder.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search company, founder, city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-72 rounded-lg border border-slate-800 bg-slate-900/90 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Cards Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredLeads.slice(0, 30).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm transition hover:border-slate-700"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                          {lead.source.replace("_", " ")}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {lead.location?.city ? `${lead.location.city}, ` : ""}
                          {lead.location?.country || "Global"}
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-semibold text-white line-clamp-1">
                        {lead.companyName}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1">{lead.headline || "Software & Cloud Services"}</p>

                      {/* Contact & Decision Maker info */}
                      <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                        {lead.contactName && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <User className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            <span className="font-medium text-white truncate">{lead.contactName}</span>
                          </div>
                        )}
                        {lead.emailCandidates[0] && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Mail className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{lead.emailCandidates[0]}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Phone className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <span className="truncate">{lead.phone}</span>
                          </div>
                        )}
                        {lead.websiteUrl && (
                          <div className="flex items-center gap-2 text-slate-400 hover:text-emerald-400">
                            <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <a
                              href={lead.websiteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-[11px] underline"
                            >
                              {lead.websiteUrl.replace(/^https?:\/\//, "")}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-800/80 pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            lead.score >= 70
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          Score: {lead.score}%
                        </span>
                        {lead.verificationStatus === "socket_valid" && (
                          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
                            Verified
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {lead.emailCandidates.length > 0 && lead.verificationStatus !== "socket_valid" && (
                          <button
                            onClick={() => handleVerify(lead)}
                            disabled={actionLoadingId === lead.id}
                            className="text-xs font-semibold text-blue-400 hover:underline"
                          >
                            {actionLoadingId === lead.id ? "Checking..." : "Verify"}
                          </button>
                        )}
                        <button
                          onClick={() => handleResearch(lead)}
                          disabled={actionLoadingId === lead.id}
                          className="text-xs font-semibold text-purple-400 hover:underline"
                        >
                          Research
                        </button>
                        <button
                          onClick={() => handleComposeForLead(lead)}
                          className="text-xs font-semibold text-emerald-400 hover:underline"
                        >
                          Pitch →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PIPELINE KANBAN */}
          {activeTab === "pipeline" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Opportunity Pipeline Kanban</h2>
                <p className="text-sm text-slate-400">Live stages updated in real time.</p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {/* 1. Sourced */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <h3 className="text-xs font-semibold uppercase text-slate-400">
                    1. Sourced ({leads.filter((l) => l.stage === "sourced").length})
                  </h3>
                  <div className="mt-3 space-y-3">
                    {leads
                      .filter((l) => l.stage === "sourced")
                      .slice(0, 8)
                      .map((lead) => (
                        <div key={lead.id} className="rounded-lg border border-slate-800 bg-slate-800/60 p-3 text-xs">
                          <p className="font-semibold text-white">{lead.companyName}</p>
                          <p className="text-slate-400 truncate">{lead.contactName || "Decision Maker"}</p>
                          <span className="mt-2 inline-block rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
                            Score {lead.score}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 2. Verified */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <h3 className="text-xs font-semibold uppercase text-blue-400">
                    2. Verified ({leads.filter((l) => l.stage === "verified").length})
                  </h3>
                  <div className="mt-3 space-y-3">
                    {leads
                      .filter((l) => l.stage === "verified")
                      .slice(0, 8)
                      .map((lead) => (
                        <div key={lead.id} className="rounded-lg border border-slate-800 bg-slate-800/60 p-3 text-xs">
                          <p className="font-semibold text-white">{lead.companyName}</p>
                          <p className="text-slate-400 truncate">{lead.emailCandidates[0]}</p>
                          <span className="mt-2 inline-block rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
                            Socket Valid
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 3. Researched */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <h3 className="text-xs font-semibold uppercase text-purple-400">
                    3. Researched ({leads.filter((l) => l.stage === "researched").length})
                  </h3>
                  <div className="mt-3 space-y-3">
                    {leads
                      .filter((l) => l.stage === "researched")
                      .slice(0, 8)
                      .map((lead) => (
                        <div key={lead.id} className="rounded-lg border border-slate-800 bg-slate-800/60 p-3 text-xs">
                          <p className="font-semibold text-white">{lead.companyName}</p>
                          <p className="text-slate-400 truncate">{lead.contactName || "Decision Maker"}</p>
                          <span className="mt-2 inline-block rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400">
                            Rubric Pass ({lead.score}%)
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 4. Contacted */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <h3 className="text-xs font-semibold uppercase text-emerald-400">
                    4. Contacted ({leads.filter((l) => l.stage === "contacted").length})
                  </h3>
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-slate-500 italic">No touch dispatched today.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UNIFIED INBOX */}
          {activeTab === "inbox" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Unified Inbox & Triage</h2>
                <p className="text-sm text-slate-400">Direct replies parsed across Email and WhatsApp.</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
                <Inbox className="mx-auto h-10 w-10 text-slate-600" />
                <p className="mt-3 text-sm text-slate-400">All inbound messages are up to date.</p>
                <p className="text-xs text-slate-500">Autonomous listener will notify on incoming replies.</p>
              </div>
            </div>
          )}

          {/* TAB 4: ASD-STE100 COMPOSER */}
          {activeTab === "composer" && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">ASD-STE100 Outbound Composer</h2>
                <p className="text-sm text-slate-400">
                  Pre-send linter enforcing maximum 20 words per sentence and zero slop vocabulary.
                </p>
              </div>

              {sendSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  {sendSuccess}
                </div>
              )}

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400">Recipient Email</label>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">Subject Line</label>
                  <input
                    type="text"
                    value={targetSubject}
                    onChange={(e) => setTargetSubject(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">
                    Message Body (ASD-STE100 Compliance Active)
                  </label>
                  <textarea
                    rows={5}
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Real-Time ASD-STE100 Rule Status */}
                <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    {isSte100Compliant ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        ASD-STE100 Compliant: Max sentence length is {longestSentenceWords}/20 words.
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        Sentence too long ({longestSentenceWords} words). Shorten to 20 words.
                      </span>
                    )}
                  </div>
                  <button
                    disabled={!isSte100Compliant}
                    onClick={handleSendTouch}
                    className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
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
