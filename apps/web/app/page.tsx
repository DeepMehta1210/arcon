"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Send,
  Inbox,
  Kanban,
  Search,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  User,
  Globe,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
  ExternalLink,
  Sparkles,
  FileText,
  MapPin,
  Star,
  Copy,
  Check,
  LogOut,
  Server,
  Zap,
  Building2,
  Flame,
  Upload,
  Crosshair,
  UserCheck,
  MessageSquare,
  Calendar,
  Layers,
  Clock
} from "lucide-react";
import { ArconLogo } from "./components/ArconLogo";
import { TeamManagementView } from "./components/TeamManagementView";
import {
  SalesReviewView,
  isLeadReadyForSalesReview,
  cleanCompanyName,
  isGenericEmail,
  isValidEmail,
  StoredLead
} from "./components/SalesReviewView";

const TEAM_SENDERS = [
  { id: "deep", email: "deep@3dices.com", name: "Deep Mehta", role: "AWS Certified Solutions Architect – Professional | Founder" },
  { id: "sales1", email: "sales1@3dices.com", name: "Sales Lead", role: "Enterprise Growth" },
  { id: "sales2", email: "sales2@3dices.com", name: "Business Dev", role: "Technical Partnerships" }
];

interface Stats {
  total: number;
  sourced: number;
  verified: number;
  researched: number;
  contacted: number;
  replied: number;
  disqualified?: number;
  withEmail: number;
  withPhone: number;
}

const CRM_STAGES: Array<{ id: StoredLead["stage"]; label: string; color: string }> = [
  { id: "researched", label: "Ready to Pitch", color: "emerald" },
  { id: "contacted", label: "Pitch Sent", color: "blue" },
  { id: "replied", label: "Founder Replied", color: "purple" },
  { id: "verified", label: "Call Booked", color: "amber" },
  { id: "sourced", label: "Backlog / Sourced", color: "zinc" }
];

export default function ArconDashboard() {
  // Default to the actionable curated Outreach Queue
  const [activeTab, setActiveTab] = useState<"review" | "pipeline" | "inbox" | "radar" | "team">("review");
  const [leads, setLeads] = useState<StoredLead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("all");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Selected lead for detail drawer
  const [selectedLead, setSelectedLead] = useState<StoredLead | null>(null);
  const [generatedSow, setGeneratedSow] = useState<string | null>(null);
  const [sowLoading, setSowLoading] = useState(false);
  const [copiedSow, setCopiedSow] = useState(false);

  // Autonomous Sourcing modal state
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [sourceChannel, setSourceChannel] = useState<"places" | "show_hn" | "yc">("places");
  const [sourceKeyword, setSourceKeyword] = useState("Web Design Agency");
  const [sourceCity, setSourceCity] = useState("London");
  const [sourceBatch, setSourceBatch] = useState("W24");
  const [sourceLimit, setSourceLimit] = useState(15);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [sourceSuccess, setSourceSuccess] = useState<string | null>(null);

  // Sniper Agency modal state
  const [isSniperModalOpen, setIsSniperModalOpen] = useState(false);
  const [sniperUrl, setSniperUrl] = useState("");
  const [sniperContactName, setSniperContactName] = useState("");
  const [sniperCompanyName, setSniperCompanyName] = useState("");
  const [sniperArchetype, setSniperArchetype] = useState("Creative Studio");
  const [sniperLoading, setSniperLoading] = useState(false);
  const [sniperError, setSniperError] = useState<string | null>(null);
  const [sniperSuccess, setSniperSuccess] = useState<string | null>(null);

  // Admin CSV Import modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);

  // Pagination for all agencies directory
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  // Pipeline CRM Rep Filter
  const [pipelineRepFilter, setPipelineRepFilter] = useState<string>("all");

  // Autopilot worker state
  const [workerStatus, setWorkerStatus] = useState<{
    isActive: boolean;
    currentActivity: string;
  } | null>(null);

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null);

  // Fetch leads and stats
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/leads?limit=2000");
      if (res.ok) {
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          if (data.success) {
            setLeads(data.leads || []);
            setStats(data.stats || null);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkerStatus = async () => {
    try {
      const res = await fetch("/api/pipeline/worker-status");
      const data = await res.json();
      if (data.success && data.worker) {
        setWorkerStatus(data.worker);
      }
    } catch {}
  };

  useEffect(() => {
    fetchLeads();
    fetchWorkerStatus();
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) return null;
        const t = await r.text();
        return t ? JSON.parse(t) : null;
      })
      .then((data) => {
        if (data && data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  // Toggle Autopilot
  const handleToggleAutopilot = async () => {
    try {
      const action = workerStatus?.isActive ? "pause" : "resume";
      const res = await fetch("/api/pipeline/worker-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success && data.worker) {
        setWorkerStatus(data.worker);
      }
    } catch (err) {
      console.error("Failed to toggle autopilot:", err);
    }
  };

  // Admin CSV lead import handler
  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setCsvLoading(true);
    setCsvError(null);
    setCsvSuccess(null);
    try {
      const text = await csvFile.text();
      const res = await fetch("/api/leads/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent: text,
          fileName: csvFile.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setCsvSuccess(
          `Imported ${data.totalParsed} leads (${data.added} new added).`
        );
        await fetchLeads();
        setTimeout(() => {
          setIsCsvModalOpen(false);
          setCsvSuccess(null);
          setCsvFile(null);
        }, 1800);
      } else {
        setCsvError(data.error || "Failed to import CSV leads.");
      }
    } catch (err) {
      setCsvError((err as Error).message);
    } finally {
      setCsvLoading(false);
    }
  };

  // Sniper Agency Handler
  const handleSniperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sniperUrl.trim()) return;
    setSniperLoading(true);
    setSniperError(null);
    setSniperSuccess(null);
    try {
      const res = await fetch("/api/leads/sniper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sniperUrl.trim(),
          contactName: sniperContactName.trim() || undefined,
          companyName: sniperCompanyName.trim() || undefined,
          archetype: sniperArchetype
        })
      });
      const data = await res.json();
      if (data.success && data.lead) {
        setSniperSuccess(`Targeted ${data.lead.companyName}! Lead added to Outreach Queue.`);
        await fetchLeads();
        setTimeout(() => {
          setIsSniperModalOpen(false);
          setSniperSuccess(null);
          setSniperUrl("");
          setSniperContactName("");
          setSniperCompanyName("");
          setActiveTab("review");
        }, 1200);
      } else {
        setSniperError(data.error || "Failed to sniper target agency.");
      }
    } catch (err) {
      setSniperError((err as Error).message);
    } finally {
      setSniperLoading(false);
    }
  };

  // Move lead stage
  const handleMoveStage = async (leadId: string, nextStage: StoredLead["stage"]) => {
    setActionLoadingId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage })
      });
      const data = await res.json();
      if (data.success && data.lead) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? data.lead : l)));
        if (selectedLead?.id === leadId) {
          setSelectedLead(data.lead);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to update stage:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Run socket SMTP verification
  const handleVerify = async (lead: StoredLead) => {
    setActionLoadingId(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/verify`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.lead) {
        setLeads((prev) => prev.map((l) => (l.id === lead.id ? data.lead : l)));
        if (selectedLead?.id === lead.id) {
          setSelectedLead(data.lead);
        }
      }
    } catch (err) {
      console.error("Verify failed:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Run research swarm
  const handleResearch = async (lead: StoredLead) => {
    setActionLoadingId(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/research`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.lead) {
        setLeads((prev) => prev.map((l) => (l.id === lead.id ? data.lead : l)));
        if (selectedLead?.id === lead.id) {
          setSelectedLead(data.lead);
        }
      }
    } catch (err) {
      console.error("Research failed:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Generate SOW proposal for selected lead
  const handleGenerateProposal = async (lead: StoredLead) => {
    setSowLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/proposal`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.proposal) {
        setGeneratedSow(data.proposal.markdownDocument);
      }
    } catch (err) {
      console.error("Failed to generate SOW:", err);
    } finally {
      setSowLoading(false);
    }
  };

  const handleCopySow = () => {
    if (generatedSow) {
      navigator.clipboard.writeText(generatedSow);
      setCopiedSow(true);
      setTimeout(() => setCopiedSow(false), 2000);
    }
  };

  // Autonomous Sourcing Handler
  const handleSourceLeads = async (e: React.FormEvent) => {
    e.preventDefault();
    setSourceLoading(true);
    setSourceError(null);
    setSourceSuccess(null);
    try {
      const res = await fetch("/api/leads/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: sourceChannel,
          keyword: sourceKeyword.trim(),
          city: sourceCity.trim(),
          batch: sourceBatch.trim(),
          limit: sourceLimit
        })
      });
      const data = await res.json();
      if (data.success) {
        setSourceSuccess(
          `Mined ${data.minedCount} leads (${data.added} new added).`
        );
        await fetchLeads();
        setTimeout(() => {
          setIsSourceModalOpen(false);
          setSourceSuccess(null);
        }, 1800);
      } else {
        setSourceError(data.error || "Failed to source leads.");
      }
    } catch (err) {
      setSourceError((err as Error).message);
    } finally {
      setSourceLoading(false);
    }
  };

  // Filtered leads for directory
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedSourceFilter !== "all" && lead.source !== selectedSourceFilter) {
        return false;
      }
      if (selectedStageFilter !== "all" && lead.stage !== selectedStageFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = lead.companyName.toLowerCase();
      const contact = (lead.contactName || "").toLowerCase();
      const city = (lead.location?.city || "").toLowerCase();
      return name.includes(q) || contact.includes(q) || city.includes(q);
    });
  }, [leads, selectedSourceFilter, selectedStageFilter, searchQuery]);

  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // Daily Curated Queue Count (Capped at 25 for achievable daily target)
  const todayQueueCount = useMemo(() => {
    const ready = leads.filter(isLeadReadyForSalesReview);
    return Math.min(ready.length, 25);
  }, [leads]);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100 font-sans relative">
      {/* Sleek, Clutter-Free Header */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-950 px-6 shrink-0 z-20">
        <div className="flex items-center gap-7">
          <div className="flex items-center gap-2.5">
            <ArconLogo size="md" showWordmark={true} />
            <span className="hidden sm:inline-block rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
              Agency OS
            </span>
          </div>

          {/* Clean 4-Tab Navigation */}
          <nav className="flex items-center gap-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab("review")}
              className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 ${
                activeTab === "review"
                  ? "bg-zinc-800 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Outreach Queue</span>
              {todayQueueCount > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-400 font-bold border border-emerald-500/30">
                  {todayQueueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("pipeline")}
              className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 ${
                activeTab === "pipeline"
                  ? "bg-zinc-800 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Kanban className="h-3.5 w-3.5 text-blue-400" />
              <span>Pipeline</span>
            </button>

            <button
              onClick={() => setActiveTab("inbox")}
              className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 ${
                activeTab === "inbox"
                  ? "bg-zinc-800 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Inbox className="h-3.5 w-3.5 text-purple-400" />
              <span>Inbox</span>
            </button>

            <button
              onClick={() => setActiveTab("radar")}
              className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 ${
                activeTab === "radar"
                  ? "bg-zinc-800 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-zinc-400" />
              <span>All Agencies</span>
            </button>

            {currentUser?.role === "admin" && (
              <button
                onClick={() => setActiveTab("team")}
                className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 ${
                  activeTab === "team"
                    ? "bg-zinc-800 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
                <span>Team</span>
              </button>
            )}
          </nav>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Autopilot Status Pill */}
          <button
            onClick={handleToggleAutopilot}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              workerStatus?.isActive
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
            title="Toggle autonomous background research & mining"
          >
            <span className="relative flex h-2 w-2">
              {workerStatus?.isActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${workerStatus?.isActive ? "bg-emerald-500" : "bg-zinc-600"}`}></span>
            </span>
            <span>{workerStatus?.isActive ? "Autopilot: 24/7" : "Autopilot: Off"}</span>
          </button>

          {/* Sniper Target Agency Modal Trigger */}
          <button
            onClick={() => setIsSniperModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-700/60 bg-indigo-950/40 px-2.5 py-1 text-xs text-indigo-200 hover:bg-indigo-900/60 transition font-medium shadow-sm"
            title="Target a single agency domain for instant AI research and pitch generation"
          >
            <Crosshair className="h-3.5 w-3.5 text-indigo-400" />
            <span>+ Sniper Agency</span>
          </button>

          {/* Auto-Source Prospecting Trigger */}
          <button
            onClick={() => setIsSourceModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition font-medium shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Auto-Source</span>
          </button>

          {currentUser?.role === "admin" && (
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition font-medium"
            >
              <Upload className="h-3.5 w-3.5 text-zinc-400" />
              <span>Import CSV</span>
            </button>
          )}

          {currentUser && (
            <div className="flex items-center gap-2 border-l border-zinc-800/80 pl-2.5">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-white leading-none">{currentUser.name}</span>
                <span className="text-[10px] text-zinc-500 capitalize">{currentUser.role}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out of Arcon"
                className="rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">
        {/* TAB 1: OUTREACH QUEUE (DEFAULT) */}
        {activeTab === "review" && (
          <SalesReviewView
            currentUser={currentUser}
            leads={leads}
            onLeadsUpdated={fetchLeads}
          />
        )}

        {/* TAB 2: PIPELINE CRM */}
        {activeTab === "pipeline" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Agency Growth Pipeline</h2>
                <p className="text-xs text-zinc-400">Track and advance high-value agency relationships from first touch to signed partnership.</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <UserCheck className="h-3.5 w-3.5" />
                  <select
                    value={pipelineRepFilter}
                    onChange={(e) => setPipelineRepFilter(e.target.value)}
                    className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="all">All Reps</option>
                    <option value="deep">Deep Mehta</option>
                    <option value="sales1">Sales Lead</option>
                    <option value="sales2">Business Dev</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Filter pipeline..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {CRM_STAGES.map((col) => {
                const stageLeads = filteredLeads.filter((l) => {
                  if (col.id === "verified") {
                    // Treat verified as meeting booked / in-progress
                    return l.stage === "verified";
                  }
                  if (pipelineRepFilter !== "all" && l.assignedTo && l.assignedTo !== pipelineRepFilter) {
                    return false;
                  }
                  return l.stage === col.id;
                });

                return (
                  <div
                    key={col.id}
                    className="flex flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3 min-h-[550px] max-h-[calc(100vh-190px)]"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                      <span className="text-xs font-semibold text-zinc-300">{col.label}</span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {stageLeads.length === 0 ? (
                        <div className="flex h-32 items-center justify-center text-xs text-zinc-600">
                          Empty stage
                        </div>
                      ) : (
                        stageLeads.map((lead) => (
                          <div
                            key={lead.id}
                            onClick={() => {
                              setSelectedLead(lead);
                              setGeneratedSow(null);
                            }}
                            className="rounded-lg border border-zinc-800/80 bg-zinc-900/80 p-3 text-xs transition hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer shadow-sm group"
                          >
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                              <span className="capitalize">{lead.location?.city || "UK / Global"}</span>
                              <span className="font-semibold text-emerald-400">{lead.score}% ICP</span>
                            </div>

                            <p className="font-semibold text-zinc-100 group-hover:text-white line-clamp-1">{cleanCompanyName(lead.companyName)}</p>
                            <p className="text-zinc-400 mt-0.5 line-clamp-1 text-[11px]">
                              {lead.contactName || "Decision Maker Unknown"}
                            </p>

                            {lead.emailCandidates[0] && (
                              <p className="mt-1 text-zinc-500 truncate font-mono text-[10px]">{lead.emailCandidates[0]}</p>
                            )}

                            <div
                              className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <select
                                value={lead.stage}
                                onChange={(e) =>
                                  handleMoveStage(lead.id, e.target.value as StoredLead["stage"])
                                }
                                disabled={actionLoadingId === lead.id}
                                className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-zinc-400 focus:outline-none text-[10px]"
                              >
                                <option value="researched">Ready</option>
                                <option value="contacted">Sent</option>
                                <option value="replied">Replied</option>
                                <option value="verified">Booked</option>
                                <option value="sourced">Backlog</option>
                              </select>

                              <button
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setActiveTab("review");
                                }}
                                className="font-medium text-emerald-400 hover:underline text-[11px]"
                              >
                                Review Pitch →
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SHARED INBOX */}
        {activeTab === "inbox" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Shared Team Inbox</h2>
                <p className="text-xs text-zinc-400">Incoming founder replies from Zoho Mail and WhatsApp Webhook.</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-400 font-medium">
                Live IMAP/Webhook Active
              </span>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
              <Inbox className="mx-auto h-8 w-8 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-300 font-medium">All partner conversations are up to date.</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                When agency founders reply to your cold email or WhatsApp pitch, the reply triage engine will parse sentiment and display it here with 1-click meeting booking links.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: ALL AGENCIES DIRECTORY (FORMERLY RADAR) */}
        {activeTab === "radar" && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search agencies, founders, or cities..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedSourceFilter}
                  onChange={(e) => {
                    setSelectedSourceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 focus:border-zinc-700 focus:outline-none"
                >
                  <option value="all">All sources ({leads.length})</option>
                  <option value="places">Local Places</option>
                  <option value="show_hn">Show HN</option>
                  <option value="yc">Y Combinator</option>
                  <option value="signal_finder">Sniper Targets</option>
                </select>

                <select
                  value={selectedStageFilter}
                  onChange={(e) => {
                    setSelectedStageFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 focus:border-zinc-700 focus:outline-none"
                >
                  <option value="all">All stages</option>
                  <option value="researched">Ready to Pitch</option>
                  <option value="contacted">Contacted</option>
                  <option value="replied">Replied</option>
                  <option value="sourced">Backlog</option>
                </select>
              </div>
            </div>

            {/* Leads Grid */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {paginatedLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => {
                    setSelectedLead(lead);
                    setGeneratedSow(null);
                  }}
                  className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/70 cursor-pointer group shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-cyan-400" />
                        <span className="capitalize">{lead.source.replace("_", " ")}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="capitalize text-zinc-400">{lead.stage}</span>
                      </div>
                      <span>{lead.location?.city ? `${lead.location.city}, ` : ""}{lead.location?.country || "Global"}</span>
                    </div>

                    <h3 className="mt-1.5 text-sm font-semibold text-zinc-100 line-clamp-1 group-hover:text-white transition">
                      {cleanCompanyName(lead.companyName)}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                      {lead.headline || "Boutique Digital & Web Agency"}
                    </p>

                    <div className="mt-3 space-y-1 text-xs text-zinc-300">
                      {lead.contactName && (
                        <div className="flex items-center gap-1.5 text-zinc-200">
                          <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{lead.contactName}</span>
                        </div>
                      )}
                      {lead.emailCandidates[0] && (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                          <span className="truncate font-mono text-[11px]">{lead.emailCandidates[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* TTFB / DMARC Technical Badges if Available */}
                    {Boolean(lead.signalData?.dossier) && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                        {(lead.signalData!.dossier as any).technicalAudit?.dmarc?.policy === "reject" ||
                        (lead.signalData!.dossier as any).technicalAudit?.dmarc?.policy === "quarantine" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-emerald-400 font-medium">
                            <CheckCircle2 className="h-2.5 w-2.5" /> DMARC Enforced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-amber-400 font-medium">
                            <AlertTriangle className="h-2.5 w-2.5" /> Spoof Risk
                          </span>
                        )}
                        {Boolean((lead.signalData!.dossier as any).technicalAudit?.serverHealth?.ttfbMs) && (
                          <span className="inline-flex items-center gap-1 rounded bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 text-zinc-300 font-mono">
                            <Server className="h-2.5 w-2.5 text-zinc-400" />
                            {(lead.signalData!.dossier as any).technicalAudit.serverHealth.ttfbMs}ms TTFB
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-zinc-800/60 pt-3 text-xs">
                    <span className="text-zinc-500">
                      Score: <strong className="text-zinc-300">{lead.score}%</strong>
                    </span>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setActiveTab("review");
                        }}
                        className="font-medium text-emerald-400 hover:text-emerald-300 transition flex items-center gap-0.5"
                      >
                        Pitch Agency <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 text-xs text-zinc-500">
                <span>
                  Page {currentPage} of {totalPages} ({filteredLeads.length} total)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TEAM MANAGEMENT */}
        {activeTab === "team" && (
          <TeamManagementView currentUser={currentUser} />
        )}
      </main>

      {/* LEAD DETAIL SLIDE-OVER DRAWER */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedLead(null)}
          />
          <div className="relative w-full max-w-xl bg-zinc-950 border-l border-zinc-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto z-10 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{cleanCompanyName(selectedLead.companyName)}</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedLead.headline}</p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="rounded-lg p-1 text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Contact info */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 text-xs">
                <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">Executive Contact</span>
                <div className="flex items-center justify-between text-zinc-200">
                  <span>Name:</span>
                  <span className="font-medium text-white">{selectedLead.contactName || "Undisclosed"}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-200">
                  <span>Email:</span>
                  <span className="font-mono text-zinc-300">{selectedLead.emailCandidates[0] || "None"}</span>
                </div>
                {selectedLead.websiteUrl && (
                  <div className="flex items-center justify-between text-zinc-200">
                    <span>Website:</span>
                    <a
                      href={selectedLead.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {selectedLead.websiteUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* SOW Commercial Generator */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-300 text-xs">White-Label Partner Proposal (SOW)</span>
                  <button
                    onClick={() => handleGenerateProposal(selectedLead)}
                    disabled={sowLoading}
                    className="flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
                  >
                    {sowLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                    {sowLoading ? "Synthesizing..." : "Generate Proposal"}
                  </button>
                </div>

                {generatedSow && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400 font-medium">✓ Proposal Ready</span>
                      <button
                        onClick={handleCopySow}
                        className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        {copiedSow ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedSow ? "Copied!" : "Copy Markdown"}
                      </button>
                    </div>
                    <pre className="max-h-60 overflow-y-auto rounded bg-zinc-950 p-3 text-[11px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed border border-zinc-800">
                      {generatedSow}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => {
                  setSelectedLead(null);
                  setActiveTab("review");
                }}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-semibold text-zinc-950 transition"
              >
                <span>Open in Outreach Queue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SNIPER AGENCY MODAL */}
      {isSniperModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !sniperLoading && setIsSniperModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Crosshair className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Target Specific Agency</h3>
                  <p className="text-xs text-zinc-400">Instant AI crawl, audit & tailored pitch generation.</p>
                </div>
              </div>
              <button
                onClick={() => setIsSniperModalOpen(false)}
                disabled={sniperLoading}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSniperSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Agency Website URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={sniperUrl}
                  onChange={(e) => setSniperUrl(e.target.value)}
                  placeholder="e.g. weareenvoy.com or https://studiomilk.co.uk"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Decision Maker Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={sniperContactName}
                    onChange={(e) => setSniperContactName(e.target.value)}
                    placeholder="e.g. Marcus Gitau"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Agency Archetype
                  </label>
                  <select
                    value={sniperArchetype}
                    onChange={(e) => setSniperArchetype(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-zinc-700 focus:outline-none"
                  >
                    <option value="Creative Studio">Creative Studio</option>
                    <option value="Dev Shop">Dev Shop</option>
                    <option value="E-Commerce / Shopify">E-Commerce</option>
                    <option value="WordPress / CMS">WordPress Agency</option>
                  </select>
                </div>
              </div>

              {sniperError && (
                <div className="flex items-center gap-2 rounded bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{sniperError}</span>
                </div>
              )}

              {sniperSuccess && (
                <div className="flex items-center gap-2 rounded bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{sniperSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsSniperModalOpen(false)}
                  disabled={sniperLoading}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sniperLoading || !sniperUrl.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-40"
                >
                  {sniperLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  {sniperLoading ? "Researching Agency..." : "Scrape & Generate Pitch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUTO-SOURCE MODAL */}
      {isSourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !sourceLoading && setIsSourceModalOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Auto-Source New Agency Leads</h3>
                <p className="text-xs text-zinc-400">Mine high-intent digital agencies from worldwide tech hubs.</p>
              </div>
              <button
                onClick={() => setIsSourceModalOpen(false)}
                disabled={sourceLoading}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSourceLeads} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Target City</label>
                  <input
                    type="text"
                    value={sourceCity}
                    onChange={(e) => setSourceCity(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Keyword</label>
                  <input
                    type="text"
                    value={sourceKeyword}
                    onChange={(e) => setSourceKeyword(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {sourceError && (
                <div className="flex items-center gap-2 rounded bg-rose-500/10 border border-rose-500/20 p-2 text-xs text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{sourceError}</span>
                </div>
              )}

              {sourceSuccess && (
                <div className="flex items-center gap-2 rounded bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{sourceSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsSourceModalOpen(false)}
                  disabled={sourceLoading}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sourceLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-40"
                >
                  {sourceLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  {sourceLoading ? "Mining..." : "Start Mining"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN CSV IMPORT MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !csvLoading && setIsCsvModalOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Import Leads from CSV</h3>
                <p className="text-xs text-zinc-400">Upload any B2B contact list with deduplication.</p>
              </div>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                disabled={csvLoading}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCsvImport} className="space-y-4">
              <label
                htmlFor="csv-file-input"
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition cursor-pointer ${
                  csvFile
                    ? "border-emerald-500/50 bg-emerald-950/10"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                }`}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCsvFile(file);
                      setCsvError(null);
                    }
                  }}
                />
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 mb-2">
                  <Upload className="h-5 w-5 text-zinc-400" />
                </div>
                {csvFile ? (
                  <p className="text-xs font-medium text-emerald-400">{csvFile.name} (Ready)</p>
                ) : (
                  <p className="text-xs text-zinc-400">Click to upload CSV file</p>
                )}
              </label>

              {csvError && (
                <div className="flex items-center gap-2 rounded bg-rose-500/10 border border-rose-500/20 p-2 text-xs text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{csvError}</span>
                </div>
              )}

              {csvSuccess && (
                <div className="flex items-center gap-2 rounded bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{csvSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  disabled={csvLoading}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={csvLoading || !csvFile}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-40"
                >
                  {csvLoading ? "Importing..." : "Upload & Ingest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
