"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Radio,
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
  Instagram,
  Youtube,
  Github,
  Link2,
  Plus,
  LogOut,
  Server,
  ShieldAlert,
  Zap,
  Building2,
  Flame,
  Upload
} from "lucide-react";
import { ArconLogo } from "./components/ArconLogo";
import { TeamManagementView } from "./components/TeamManagementView";
import { SalesReviewView } from "./components/SalesReviewView";

const TEAM_SENDERS = [
  { id: "deep", email: "deep@3dices.com", name: "Deep Mehta", role: "AWS Certified Solutions Architect – Professional | Founder" },
  { id: "sales1", email: "sales1@3dices.com", name: "Sales Lead", role: "Enterprise Growth" },
  { id: "sales2", email: "sales2@3dices.com", name: "Business Dev", role: "Technical Partnerships" }
];

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
  signalData?: Record<string, unknown>;
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

const STAGES: Array<{ id: StoredLead["stage"]; label: string }> = [
  { id: "sourced", label: "Sourced" },
  { id: "verified", label: "Verified" },
  { id: "researched", label: "Researched" },
  { id: "contacted", label: "Contacted" }
];

export default function ArconDashboard() {
  const [activeTab, setActiveTab] = useState<"radar" | "review" | "pipeline" | "inbox" | "composer" | "team">("radar");
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
  const [sourceKeyword, setSourceKeyword] = useState("Cloud Consulting");
  const [sourceCity, setSourceCity] = useState("London");
  const [sourceBatch, setSourceBatch] = useState("W24");
  const [sourceLimit, setSourceLimit] = useState(15);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [sourceSuccess, setSourceSuccess] = useState<string | null>(null);

  // B2C Creator discovery modal state
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [creatorPlatform, setCreatorPlatform] = useState<"instagram" | "youtube" | "linktree" | "github">("instagram");
  const [creatorIdentifier, setCreatorIdentifier] = useState("");
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [creatorSuccess, setCreatorSuccess] = useState<string | null>(null);

  // Admin CSV Import modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);

  // Pagination for radar
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  // Outbound composer state
  const [selectedSenderEmail, setSelectedSenderEmail] = useState("deep@3dices.com");
  const [composerText, setComposerText] = useState(
    `Hi there,\n\nWhile reviewing your application, I noticed your team is actively scaling your web and cloud infrastructure.\n\nAt 3 Dices, we partner with technical founders to eliminate backend bottlenecks, automate CI/CD release pipelines, and cut AWS spend—routinely reducing monthly cloud bills by ~40% while achieving zero-downtime cutovers.\n\nWe're currently offering a complimentary 30-Minute AWS Architecture & Cost Review. We audit your setup, identify immediate latency and cost leaks, and share actionable runbooks whether you work with us or not.\n\nWould you be open to a quick 10-minute call this Thursday to see if there are easy wins for your team?\n\nBest regards,\nDeep Mehta\nAWS Certified Solutions Architect – Professional & Security Specialist\nFounder, 3 Dices Technology | https://3dices.com`
  );
  const [targetEmail, setTargetEmail] = useState("contact@target.com");
  const [targetSubject, setTargetSubject] = useState("Question regarding your cloud architecture & cost");
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null);

  // Fetch leads and stats
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/leads?limit=2000");
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          if (data.user.email) {
            setSelectedSenderEmail(data.user.email);
          }
          if (data.user.role === "sales") {
            setActiveTab("review");
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
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
          `Imported ${data.totalParsed} leads (${data.added} new added). Total leads: ${data.stats?.total || leads.length + data.added}`
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
        if (stats) {
          setStats({ ...stats, verified: stats.verified + 1 });
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
        const pitchText = data.dossier?.recommendedOutreach?.tailoredBody || data.dossier?.suggestedAngle;
        if (pitchText) {
          setComposerText(pitchText);
        }
        const pitchSubject = data.dossier?.recommendedOutreach?.tailoredSubject;
        if (pitchSubject) {
          setTargetSubject(pitchSubject);
        }
        if (data.lead.emailCandidates?.[0]) {
          setTargetEmail(data.lead.emailCandidates[0]);
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

  // Copy SOW to clipboard
  const handleCopySow = () => {
    if (generatedSow) {
      navigator.clipboard.writeText(generatedSow);
      setCopiedSow(true);
      setTimeout(() => setCopiedSow(false), 2000);
    }
  };

  // Open composer with lead info
  const handleComposeForLead = (lead: StoredLead) => {
    if (lead.emailCandidates[0]) {
      setTargetEmail(lead.emailCandidates[0]);
    }
    const properEmail = (lead.signalData as any)?.properEmail || (lead.signalData as any)?.dossier?.recommendedOutreach;
    if (properEmail?.tailoredSubject) {
      setTargetSubject(properEmail.tailoredSubject);
    } else {
      setTargetSubject(`Quick question regarding ${lead.companyName}'s cloud infrastructure`);
    }

    if (properEmail?.tailoredBody) {
      setComposerText(properEmail.tailoredBody);
    } else if (lead.notes) {
      setComposerText(lead.notes);
    } else {
      const firstName = lead.contactName?.split(" ")[0] || "there";
      setComposerText(
        `Hi ${firstName},\n\nI was looking into ${lead.companyName} and really loved your platform.\n\nAt 3 Dices, we partner with growing engineering teams to streamline cloud deployments, cut server latency, and scale backend infrastructure without the overhead of hiring an entire in-house DevOps department.\n\nWould you be open to a quick 10-minute introductory call this Thursday to see if we might be a fit?\n\nBest regards,\nDeep Mehta\nFounder & Cloud Architect | 3 Dices`
      );
    }
    setSelectedLead(null);
    setActiveTab("composer");
  };

  // Composer word count
  const totalWords = composerText.trim() ? composerText.trim().split(/\s+/).length : 0;

  const handleSendTouch = async () => {
    if (!targetEmail.trim() || !targetSubject.trim() || !composerText.trim() || sendingEmail) return;
    setSendingEmail(true);
    setSendError(null);
    setSendSuccess(null);

    const currentSender = TEAM_SENDERS.find((s) => s.email === selectedSenderEmail) || {
      name: currentUser?.name || "Deep Mehta",
      email: selectedSenderEmail || "deep@3dices.com"
    };

    try {
      const res = await fetch("/api/outbound/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: targetEmail,
          subject: targetSubject,
          body: composerText,
          senderEmail: currentSender.email,
          senderName: currentSender.name,
          leadId: selectedLead?.id
        })
      });
      const data = await res.json();
      if (data.success && data.receipt) {
        setSendSuccess(
          `Dispatched via ${currentSender.name} <${currentSender.email}> to ${targetEmail} (Status: ${data.receipt.status}, ID: ${data.receipt.messageId || data.receipt.receiptId})`
        );
        fetchLeads();
      } else {
        setSendError(data.error || "Failed to dispatch email.");
      }
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setSendingEmail(false);
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
          `Mined ${data.minedCount} leads (${data.added} new added). Total leads in DB: ${data.total}`
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

  // Discover & scrape creator
  const handleScrapeCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorIdentifier.trim()) return;
    setCreatorLoading(true);
    setCreatorError(null);
    setCreatorSuccess(null);
    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: creatorPlatform,
          identifier: creatorIdentifier.trim()
        })
      });
      const data = await res.json();
      if (data.success && data.lead) {
        setLeads((prev) => [data.lead, ...prev.filter((l) => l.id !== data.lead.id)]);
        if (data.stats) {
          setStats(data.stats);
        }
        setCreatorSuccess(`Discovered ${data.lead.companyName || creatorIdentifier}!`);
        setSelectedLead(data.lead);
        setTimeout(() => {
          setIsCreatorModalOpen(false);
          setCreatorSuccess(null);
          setCreatorIdentifier("");
        }, 1200);
      } else {
        setCreatorError(data.error || "Failed to discover creator.");
      }
    } catch (err) {
      setCreatorError((err as Error).message);
    } finally {
      setCreatorLoading(false);
    }
  };

  // Dynamic source counts
  const sourceCounts = useMemo(() => {
    return {
      all: leads.length,
      places: leads.filter((l) => l.source === "places").length,
      showHn: leads.filter((l) => l.source === "show_hn").length,
      yc: leads.filter((l) => l.source === "yc").length,
      ukCloud: leads.filter((l) => ((l.signalData?.sourceFile as string) || "").includes("uk-cloud")).length,
      usaIt: leads.filter((l) => ((l.signalData?.sourceFile as string) || "").includes("USA_IT")).length,
      clutch: leads.filter((l) => ((l.signalData?.sourceFile as string) || "").includes("clutch")).length,
      wordpress: leads.filter((l) => ((l.signalData?.sourceFile as string) || "").includes("Wordpress")).length,
      instagram: leads.filter((l) => l.source === "instagram").length,
      youtube: leads.filter((l) => l.source === "youtube").length,
      linktree: leads.filter((l) => l.source === "linktree").length,
      github: leads.filter((l) => l.source === "github").length
    };
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (selectedSourceFilter !== "all") {
        const sourceFile = (l.signalData?.sourceFile as string) || "";
        if (selectedSourceFilter === "places" && l.source !== "places") return false;
        if (selectedSourceFilter === "show_hn" && l.source !== "show_hn") return false;
        if (selectedSourceFilter === "yc" && l.source !== "yc") return false;
        if (selectedSourceFilter === "uk-cloud" && !sourceFile.includes("uk-cloud")) return false;
        if (selectedSourceFilter === "usa-it" && !sourceFile.includes("USA_IT")) return false;
        if (selectedSourceFilter === "clutch" && !sourceFile.includes("clutch")) return false;
        if (selectedSourceFilter === "wordpress" && !sourceFile.includes("Wordpress")) return false;
        if (selectedSourceFilter === "instagram" && l.source !== "instagram") return false;
        if (selectedSourceFilter === "youtube" && l.source !== "youtube") return false;
        if (selectedSourceFilter === "linktree" && l.source !== "linktree") return false;
        if (selectedSourceFilter === "github" && l.source !== "github") return false;
      }

      if (selectedStageFilter !== "all" && l.stage !== selectedStageFilter) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.companyName.toLowerCase().includes(q) ||
        l.contactName?.toLowerCase().includes(q) ||
        l.headline?.toLowerCase().includes(q) ||
        l.location?.city?.toLowerCase().includes(q) ||
        l.location?.country?.toLowerCase().includes(q) ||
        l.emailCandidates.some((e) => e.toLowerCase().includes(q))
      );
    });
  }, [leads, searchQuery, selectedSourceFilter, selectedStageFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  const readyForReviewCount = useMemo(() => {
    return leads.filter((l) => l.stage === "researched" || !!(l.signalData as any)?.draftEmail).length;
  }, [leads]);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100 font-sans relative">
      {/* Clean Minimal Header */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-950 px-6 shrink-0">
        <div className="flex items-center gap-8">
          <ArconLogo size="md" showWordmark={true} />

          {/* Simple Tab Navigation */}
          <nav className="flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab("radar")}
              className={`rounded-md px-3 py-1.5 transition ${
                activeTab === "radar"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Leads
            </button>
            <button
              onClick={() => setActiveTab("review")}
              className={`rounded-md px-3 py-1.5 transition flex items-center gap-1.5 ${
                activeTab === "review"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>Review & Send</span>
              {readyForReviewCount > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-400 font-semibold border border-emerald-500/30">
                  {readyForReviewCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("pipeline")}
              className={`rounded-md px-3 py-1.5 transition ${
                activeTab === "pipeline"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setActiveTab("inbox")}
              className={`rounded-md px-3 py-1.5 transition ${
                activeTab === "inbox"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Inbox
            </button>
            <button
              onClick={() => setActiveTab("composer")}
              className={`rounded-md px-3 py-1.5 transition ${
                activeTab === "composer"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Composer
            </button>
            {currentUser?.role === "admin" && (
              <button
                onClick={() => setActiveTab("team")}
                className={`rounded-md px-3 py-1.5 transition ${
                  activeTab === "team"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Team
              </button>
            )}
          </nav>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSourceModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-white hover:bg-zinc-800 transition font-medium shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Source leads
          </button>

          <button
            onClick={() => setIsCreatorModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
          >
            <Plus className="h-3.5 w-3.5 text-zinc-400" />
            Find creator
          </button>

          {currentUser?.role === "admin" && (
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition font-medium"
            >
              <Upload className="h-3.5 w-3.5 text-zinc-400" />
              Import CSV
            </button>
          )}

          <span className="text-xs text-zinc-500">
            {leads.length} leads loaded
          </span>

          {currentUser && (
            <div className="flex items-center gap-2.5 border-l border-zinc-800/80 pl-3">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-white leading-none">{currentUser.name}</span>
                <span className="text-[10px] text-zinc-500 capitalize">{currentUser.role}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out of Arcon"
                className="rounded-md p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">
        {/* TAB 1: LEADS (RADAR) */}
        {activeTab === "radar" && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by company, founder, or city..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 py-1.5 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
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
                  <option value="all">All sources ({sourceCounts.all})</option>
                  <option value="places">Local Places ({sourceCounts.places})</option>
                  <option value="show_hn">Show HN ({sourceCounts.showHn})</option>
                  <option value="yc">Y Combinator ({sourceCounts.yc})</option>
                  <option value="uk-cloud">UK Cloud ({sourceCounts.ukCloud})</option>
                  <option value="usa-it">USA IT ({sourceCounts.usaIt})</option>
                  <option value="clutch">Clutch IT ({sourceCounts.clutch})</option>
                  <option value="wordpress">WordPress ({sourceCounts.wordpress})</option>
                  <option value="instagram">Instagram ({sourceCounts.instagram})</option>
                  <option value="youtube">YouTube ({sourceCounts.youtube})</option>
                  <option value="linktree">Linktree ({sourceCounts.linktree})</option>
                  <option value="github">GitHub ({sourceCounts.github})</option>
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
                  <option value="sourced">Sourced</option>
                  <option value="verified">Verified</option>
                  <option value="researched">Researched</option>
                  <option value="contacted">Contacted</option>
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
                    if (lead.emailCandidates?.[0]) {
                      setTargetEmail(lead.emailCandidates[0]);
                    }
                    if (lead.notes && lead.notes.startsWith("Hi ")) {
                      setComposerText(lead.notes);
                    }
                    const properSub = (lead.signalData as any)?.properEmail?.tailoredSubject;
                    if (properSub) {
                      setTargetSubject(properSub);
                    }
                  }}
                  className="flex flex-col justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 transition hover:border-zinc-600 hover:bg-zinc-900/60 cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        {lead.source === "instagram" && <Instagram className="h-3 w-3 text-pink-400" />}
                        {lead.source === "youtube" && <Youtube className="h-3 w-3 text-red-400" />}
                        {lead.source === "github" && <Github className="h-3 w-3 text-zinc-300" />}
                        {lead.source === "linktree" && <Link2 className="h-3 w-3 text-emerald-400" />}
                        {lead.source === "places" && <MapPin className="h-3 w-3 text-cyan-400" />}
                        {lead.source === "show_hn" && <Flame className="h-3 w-3 text-orange-400" />}
                        {lead.source === "yc" && <Building2 className="h-3 w-3 text-amber-400" />}
                        <span className="capitalize">{lead.source.replace("_", " ")}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="capitalize text-zinc-400">{lead.stage}</span>
                      </div>
                      <span>{lead.location?.city ? `${lead.location.city}, ` : ""}{lead.location?.country || "Global"}</span>
                    </div>

                    <h3 className="mt-1.5 text-sm font-semibold text-zinc-100 line-clamp-1 group-hover:text-white transition">
                      {lead.companyName}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                      {lead.headline || "Technology Services"}
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
                          <span className="truncate">{lead.emailCandidates[0]}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Phone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                          <span className="truncate">{lead.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Live Technical Audit Badges if Researched */}
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

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {lead.emailCandidates.length > 0 && lead.verificationStatus !== "socket_valid" && (
                        <button
                          onClick={() => handleVerify(lead)}
                          disabled={actionLoadingId === lead.id}
                          className="text-zinc-400 hover:text-white transition"
                        >
                          {actionLoadingId === lead.id ? "Checking..." : "Verify"}
                        </button>
                      )}
                      <button
                        onClick={() => handleResearch(lead)}
                        disabled={actionLoadingId === lead.id}
                        className="text-zinc-400 hover:text-white transition"
                      >
                        Research
                      </button>
                      <button
                        onClick={() => handleComposeForLead(lead)}
                        className="font-medium text-white hover:underline flex items-center gap-0.5"
                      >
                        Pitch <ArrowRight className="h-3 w-3" />
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

        {/* TAB 2: PIPELINE (KANBAN) */}
        {activeTab === "pipeline" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Pipeline</h2>
                <p className="text-xs text-zinc-400">Track and advance leads across four stages.</p>
              </div>

              <input
                type="text"
                placeholder="Search pipeline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {STAGES.map((col) => {
                const stageLeads = filteredLeads.filter((l) => l.stage === col.id);
                return (
                  <div
                    key={col.id}
                    className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 min-h-[550px] max-h-[calc(100vh-190px)]"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                      <span className="text-xs font-medium text-zinc-300">{col.label}</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-400">
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {stageLeads.length === 0 ? (
                        <div className="flex h-32 items-center justify-center text-xs text-zinc-600">
                          No leads in this stage
                        </div>
                      ) : (
                        stageLeads.map((lead) => (
                          <div
                            key={lead.id}
                            onClick={() => {
                              setSelectedLead(lead);
                              setGeneratedSow(null);
                            }}
                            className="rounded-md border border-zinc-800 bg-zinc-900/70 p-3 text-xs transition hover:border-zinc-600 cursor-pointer"
                          >
                            <p className="font-semibold text-zinc-100 line-clamp-1">{lead.companyName}</p>
                            <p className="text-zinc-400 mt-0.5 line-clamp-1">
                              {lead.contactName || "Contact unknown"}
                            </p>

                            {lead.emailCandidates[0] && (
                              <p className="mt-1 text-zinc-500 truncate">{lead.emailCandidates[0]}</p>
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
                                className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-zinc-400 focus:outline-none"
                              >
                                <option value="sourced">Sourced</option>
                                <option value="verified">Verified</option>
                                <option value="researched">Researched</option>
                                <option value="contacted">Contacted</option>
                              </select>

                              <button
                                onClick={() => handleComposeForLead(lead)}
                                className="font-medium text-white hover:underline"
                              >
                                Pitch →
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

        {/* TAB 3: INBOX */}
        {activeTab === "inbox" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white">Inbox</h2>
              <p className="text-xs text-zinc-400">Incoming replies from Email and WhatsApp.</p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-12 text-center">
              <Inbox className="mx-auto h-8 w-8 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-300 font-medium">All inboxes are up to date.</p>
              <p className="text-xs text-zinc-500 mt-1">Incoming replies will appear here automatically.</p>
            </div>
          </div>
        )}

        {/* TAB 4: COMPOSER */}
        {activeTab === "composer" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white">Outbound Composer</h2>
              <p className="text-xs text-zinc-400">Personalized B2B outreach tailored to decision makers with verified mailbox delivery.</p>
            </div>

            {sendSuccess && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                {sendSuccess}
              </div>
            )}

            {sendError && (
              <div className="flex items-center gap-2 rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {sendError}
              </div>
            )}

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400">Dispatch Rep (From Mailbox)</label>
                  <span className="text-[10px] text-zinc-500 font-mono">Zoho Mail Auth (DKIM/SPF)</span>
                </div>
                <select
                  value={selectedSenderEmail}
                  onChange={(e) => setSelectedSenderEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-600 focus:outline-none"
                >
                  {TEAM_SENDERS.map((rep) => (
                    <option key={rep.id} value={rep.email}>
                      {rep.name} &lt;{rep.email}&gt; • {rep.role}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Sends via verified 3 Dices domain with zero bounce risk and 1-click delivery.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">Recipient</label>
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">Subject</label>
                <input
                  type="text"
                  value={targetSubject}
                  onChange={(e) => setTargetSubject(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">Body</label>
                <textarea
                  rows={4}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-100 focus:border-zinc-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between border-t border-zinc-800 pt-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">
                    Word count: <strong className="text-zinc-200">{totalWords} words</strong>
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    B2B Outreach Ready
                  </span>
                </div>

                <button
                  disabled={sendingEmail || !composerText.trim() || !targetEmail.trim()}
                  onClick={handleSendTouch}
                  className="flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 font-medium text-xs text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sendingEmail && <RefreshCw className="h-3 w-3 animate-spin" />}
                  {sendingEmail ? "Dispatching..." : "Send email"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SALES REVIEW & OUTREACH QUEUE */}
        {activeTab === "review" && (
          <SalesReviewView
            currentUser={currentUser}
            leads={leads}
            onLeadsUpdated={fetchLeads}
          />
        )}

        {/* TAB 5: TEAM & RBAC MANAGEMENT */}
        {activeTab === "team" && (
          <TeamManagementView currentUser={currentUser} />
        )}
      </main>

      {/* FULL-DETAIL SLIDE-OVER DRAWER FOR SELECTED LEAD */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setSelectedLead(null);
              setGeneratedSow(null);
            }}
          />

          {/* Slide-over Sheet */}
          <div className="relative w-full max-w-xl bg-zinc-950 border-l border-zinc-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto z-10">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                    <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 capitalize">
                      {selectedLead.source.replace("_", " ")}
                    </span>
                    {selectedLead.verificationStatus === "socket_valid" && (
                      <span className="rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-blue-400">
                        Socket Verified
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-white">{selectedLead.companyName}</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedLead.headline}</p>
                </div>

                <button
                  onClick={() => {
                    setSelectedLead(null);
                    setGeneratedSow(null);
                  }}
                  className="rounded-md p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Status and Score Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <span className="text-[11px] text-zinc-500 block">Pipeline Stage</span>
                  <select
                    value={selectedLead.stage}
                    onChange={(e) =>
                      handleMoveStage(selectedLead.id, e.target.value as StoredLead["stage"])
                    }
                    disabled={actionLoadingId === selectedLead.id}
                    className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:outline-none font-medium capitalize"
                  >
                    <option value="sourced">Sourced</option>
                    <option value="verified">Verified</option>
                    <option value="researched">Researched</option>
                    <option value="contacted">Contacted</option>
                  </select>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <span className="text-[11px] text-zinc-500 block">5-Factor Rubric Score</span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-base font-bold text-white">{selectedLead.score}%</span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                        selectedLead.score >= 70
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {selectedLead.score >= 70 ? "Qualified" : "Developing"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Audit & Diagnostic Facts */}
              {Boolean(selectedLead.signalData?.dossier) && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-zinc-400" />
                      Real-Time Technical Audit
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Domain: {(selectedLead.signalData?.dossier as any).domain || "Audited"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-zinc-800/80 bg-zinc-950/60 p-2.5">
                      <span className="text-zinc-500 text-[11px] block">DMARC Security Policy</span>
                      <div className="mt-1 flex items-center gap-1.5">
                        {(selectedLead.signalData?.dossier as any).technicalAudit?.dmarc?.policy === "reject" ||
                        (selectedLead.signalData?.dossier as any).technicalAudit?.dmarc?.policy === "quarantine" ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Enforced ({(selectedLead.signalData?.dossier as any).technicalAudit?.dmarc?.policy})
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> {(selectedLead.signalData?.dossier as any).technicalAudit?.dmarc?.policy || "Missing (Spoof Risk)"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded border border-zinc-800/80 bg-zinc-950/60 p-2.5">
                      <span className="text-zinc-500 text-[11px] block">Server Latency (TTFB)</span>
                      <div className="mt-1 flex items-center gap-1.5 font-mono text-zinc-200">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span>{(selectedLead.signalData?.dossier as any).technicalAudit?.serverHealth?.ttfbMs || 0} ms</span>
                        <span className="text-[10px] text-zinc-500 font-sans">
                          (HTTP {(selectedLead.signalData?.dossier as any).technicalAudit?.serverHealth?.status || 200})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resolved MX Servers */}
                  {Array.isArray((selectedLead.signalData?.dossier as any).technicalAudit?.dns?.mx) &&
                    (selectedLead.signalData?.dossier as any).technicalAudit.dns.mx.length > 0 && (
                      <div className="border-t border-zinc-800/80 pt-2 text-[11px]">
                        <span className="text-zinc-500 block mb-1">Mail Servers (MX)</span>
                        <div className="flex flex-wrap gap-1">
                          {(selectedLead.signalData?.dossier as any).technicalAudit.dns.mx.map(
                            (m: { exchange: string; priority: number }, i: number) => (
                              <span
                                key={i}
                                className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-zinc-300 font-mono text-[10px]"
                              >
                                {m.exchange} ({m.priority})
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* 5-Factor Rubric Breakdown */}
                  {(selectedLead.signalData?.dossier as any).qualification?.breakdown && (
                    <div className="border-t border-zinc-800/80 pt-2.5 space-y-1.5 text-[11px]">
                      <span className="text-zinc-400 font-medium block mb-1">5-Factor Rubric Breakdown</span>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-400">
                        <div className="flex justify-between">
                          <span>Pain Point Severity:</span>
                          <span className="text-zinc-200 font-medium">
                            {(selectedLead.signalData?.dossier as any).qualification.breakdown.painPointSeverity}/25
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Budget Authority:</span>
                          <span className="text-zinc-200 font-medium">
                            {(selectedLead.signalData?.dossier as any).qualification.breakdown.budgetAuthority}/20
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Technical Fit:</span>
                          <span className="text-zinc-200 font-medium">
                            {(selectedLead.signalData?.dossier as any).qualification.breakdown.technicalFit}/20
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Urgency Signals:</span>
                          <span className="text-zinc-200 font-medium">
                            {(selectedLead.signalData?.dossier as any).qualification.breakdown.urgencySignals}/20
                          </span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span>Decision-Maker Accessibility:</span>
                          <span className="text-zinc-200 font-medium">
                            {(selectedLead.signalData?.dossier as any).qualification.breakdown.decisionMakerAccessibility}/15
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Decision Maker & Contact */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Decision Maker & Authority
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Contact Person</span>
                    <span className="font-medium text-white">{selectedLead.contactName || "Undisclosed"}</span>
                  </div>
                  {selectedLead.socialUrls.linkedin && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">LinkedIn Profile</span>
                      <a
                        href={selectedLead.socialUrls.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-300 hover:text-white underline flex items-center gap-1"
                      >
                        Company LinkedIn <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {Boolean(selectedLead.signalData?.decisionMakerLinkedin) && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Executive LinkedIn</span>
                      <a
                        href={String(selectedLead.signalData?.decisionMakerLinkedin).split(";")[0]}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-300 hover:text-white underline flex items-center gap-1"
                      >
                        Profile Link <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Communications & Verification */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Communication Endpoints
                  </h4>
                  {selectedLead.emailCandidates.length > 0 && (
                    <button
                      onClick={() => handleVerify(selectedLead)}
                      disabled={actionLoadingId === selectedLead.id}
                      className="text-xs font-medium text-zinc-300 hover:text-white underline flex items-center gap-1"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {actionLoadingId === selectedLead.id ? "Checking..." : "Verify Socket"}
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block mb-1">Email Addresses</span>
                    {selectedLead.emailCandidates.length === 0 ? (
                      <span className="text-zinc-600 italic">No email found</span>
                    ) : (
                      <div className="space-y-1">
                        {selectedLead.emailCandidates.map((email, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded bg-zinc-900 px-2.5 py-1.5 text-zinc-300"
                          >
                            <span className="font-mono text-[11px]">{email}</span>
                            <span className="text-[10px] text-zinc-500 uppercase">
                              {i === 0 && selectedLead.verificationStatus === "socket_valid"
                                ? "Verified"
                                : "Candidate"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedLead.phone && (
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                      <span className="text-zinc-500">Phone Number</span>
                      <span className="font-mono text-zinc-200">{selectedLead.phone}</span>
                    </div>
                  )}

                  {selectedLead.websiteUrl && (
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                      <span className="text-zinc-500">Website</span>
                      <a
                        href={selectedLead.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-300 hover:text-white underline flex items-center gap-1"
                      >
                        {selectedLead.websiteUrl.replace(/^https?:\/\//, "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {/* Connected Channels & Social Endpoints */}
                  {Object.keys(selectedLead.socialUrls).length > 0 && (
                    <div className="pt-2 border-t border-zinc-800/80">
                      <span className="text-zinc-500 block mb-1.5">Connected Channels</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedLead.socialUrls.instagram && (
                          <a
                            href={selectedLead.socialUrls.instagram}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded bg-zinc-900 border border-zinc-800 px-2 py-1 text-[11px] text-pink-400 hover:text-white transition"
                          >
                            <Instagram className="h-3 w-3" /> Instagram
                          </a>
                        )}
                        {selectedLead.socialUrls.youtube && (
                          <a
                            href={selectedLead.socialUrls.youtube}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded bg-zinc-900 border border-zinc-800 px-2 py-1 text-[11px] text-red-400 hover:text-white transition"
                          >
                            <Youtube className="h-3 w-3" /> YouTube
                          </a>
                        )}
                        {selectedLead.socialUrls.linktree && (
                          <a
                            href={selectedLead.socialUrls.linktree}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded bg-zinc-900 border border-zinc-800 px-2 py-1 text-[11px] text-emerald-400 hover:text-white transition"
                          >
                            <Link2 className="h-3 w-3" /> Linktree
                          </a>
                        )}
                        {selectedLead.socialUrls.github && (
                          <a
                            href={selectedLead.socialUrls.github}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded bg-zinc-900 border border-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:text-white transition"
                          >
                            <Github className="h-3 w-3" /> GitHub
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Location & Firmographics */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-2 text-xs">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Location & Metadata
                </h4>
                {selectedLead.location?.rawAddress && (
                  <div className="flex items-start gap-2 text-zinc-300">
                    <MapPin className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                    <span>{selectedLead.location.rawAddress}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                  <span className="text-zinc-500">Region</span>
                  <span>{selectedLead.location?.city ? `${selectedLead.location.city}, ` : ""}{selectedLead.location?.country || "Global"}</span>
                </div>
                {Boolean(selectedLead.signalData?.rating) && (
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <span className="text-zinc-500">Google / Clutch Rating</span>
                    <span className="flex items-center gap-1 font-semibold text-zinc-200">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      {String(selectedLead.signalData?.rating).slice(0, 3)} ({String(selectedLead.signalData?.reviews || 0)} reviews)
                    </span>
                  </div>
                )}
                {Boolean(selectedLead.signalData?.subscribers) && (
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <span className="text-zinc-500">Audience / Subscribers</span>
                    <span className="font-semibold text-zinc-200">{String(selectedLead.signalData?.subscribers)}</span>
                  </div>
                )}
                {Boolean(selectedLead.signalData?.followers) && (
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <span className="text-zinc-500">Followers</span>
                    <span className="font-semibold text-zinc-200">{String(selectedLead.signalData?.followers)}</span>
                  </div>
                )}
                {Boolean(selectedLead.signalData?.publicRepos) && (
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <span className="text-zinc-500">Public Repositories</span>
                    <span className="font-semibold text-zinc-200">{String(selectedLead.signalData?.publicRepos)}</span>
                  </div>
                )}
              </div>

              {/* Brand Research & Verified B2B Outreach */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Brand Research & B2B Outreach
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResearch(selectedLead)}
                      disabled={actionLoadingId === selectedLead.id}
                      className="flex items-center gap-1 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded transition"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      {actionLoadingId === selectedLead.id ? "Researching Brand..." : "Research Brand & Decision Maker"}
                    </button>
                    <button
                      onClick={() => handleGenerateProposal(selectedLead)}
                      disabled={sowLoading}
                      className="text-xs font-medium text-zinc-400 hover:text-white underline flex items-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {sowLoading ? "Drafting SOW..." : "SOW"}
                    </button>
                  </div>
                </div>

                {/* Brand Overview & Value Proposition */}
                {Boolean(selectedLead.signalData?.dossier) ? (
                  <div className="space-y-3">
                    <div className="rounded bg-zinc-950/80 border border-zinc-800/80 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-200">Brand Overview & Proposition</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {(selectedLead.signalData?.dossier as any).company?.domain}
                        </span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed text-[11px]">
                        {(selectedLead.signalData?.dossier as any).company?.description}
                      </p>
                      {Array.isArray((selectedLead.signalData?.dossier as any).company?.techStack) &&
                        (selectedLead.signalData?.dossier as any).company.techStack.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {(selectedLead.signalData?.dossier as any).company.techStack.map(
                              (tech: string, i: number) => (
                                <span
                                  key={i}
                                  className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
                                >
                                  {tech}
                                </span>
                              )
                            )}
                          </div>
                        )}
                    </div>

                    {/* Discovered Decision Maker */}
                    <div className="rounded bg-zinc-950/80 border border-zinc-800/80 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-200">Verified Decision Maker</span>
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Socket Verified
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-white">
                            {(selectedLead.signalData?.dossier as any).decisionMaker?.fullName || selectedLead.contactName}
                          </p>
                          <p className="text-zinc-400 text-[11px]">
                            {(selectedLead.signalData?.dossier as any).decisionMaker?.role || "Founder & Leadership"}
                          </p>
                        </div>
                        <span className="font-mono text-zinc-300 text-[11px] bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                          {(selectedLead.signalData?.dossier as any).decisionMaker?.email || selectedLead.emailCandidates[0]}
                        </span>
                      </div>
                    </div>

                    {/* Drafted B2B Outreach Email */}
                    <div className="rounded bg-zinc-950/80 border border-zinc-800/80 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-200">Tailored B2B Outreach Draft</span>
                        <button
                          onClick={() => handleComposeForLead(selectedLead)}
                          className="text-[11px] font-medium text-white hover:underline flex items-center gap-1"
                        >
                          Load into Composer →
                        </button>
                      </div>
                      <div className="border-b border-zinc-800/60 pb-1.5">
                        <span className="text-zinc-500 text-[11px]">Subject: </span>
                        <span className="text-zinc-200 font-medium text-[11px]">
                          {(selectedLead.signalData?.dossier as any).recommendedOutreach?.tailoredSubject ||
                            `Question regarding ${selectedLead.companyName}'s cloud infrastructure`}
                        </span>
                      </div>
                      <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans text-[11px] bg-zinc-900/60 p-2.5 rounded border border-zinc-800/40">
                        {selectedLead.notes || (selectedLead.signalData?.dossier as any).recommendedOutreach?.tailoredBody}
                      </div>
                    </div>
                  </div>
                ) : selectedLead.notes ? (
                  <p className="rounded bg-zinc-900 p-3 text-zinc-300 leading-relaxed font-sans text-xs border border-zinc-800">
                    {selectedLead.notes}
                  </p>
                ) : (
                  <div className="p-4 text-center rounded border border-zinc-800/60 bg-zinc-900/20 space-y-2">
                    <p className="text-zinc-400 text-xs font-medium">No brand research generated yet.</p>
                    <p className="text-zinc-500 text-[11px]">
                      Click "Research Brand & Decision Maker" to scrape brand value proposition, find executive email, verify it via socket, and draft a high-converting outreach email.
                    </p>
                  </div>
                )}

                {/* Generated SOW Preview */}
                {generatedSow && (
                  <div className="mt-3 rounded border border-zinc-800 bg-zinc-900 p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="font-semibold text-zinc-200 text-xs">Statement of Work (SOW)</span>
                      <button
                        onClick={handleCopySow}
                        className="text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1"
                      >
                        {copiedSow ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedSow ? "Copied" : "Copy markdown"}
                      </button>
                    </div>
                    <pre className="text-[11px] text-zinc-300 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                      {generatedSow}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Sticky Action Footer */}
            <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-500">ID: {selectedLead.id.slice(0, 8)}...</span>
              <button
                onClick={() => handleComposeForLead(selectedLead)}
                className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition"
              >
                <Send className="h-3.5 w-3.5" />
                Draft Pitch in Composer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTONOMOUS LEAD SOURCING MODAL */}
      {isSourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!sourceLoading) {
                setIsSourceModalOpen(false);
                setSourceError(null);
              }
            }}
          />

          <div className="relative w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <h3 className="text-base font-semibold text-white">Source Leads</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Autonomous lead mining across local places, Show HN launches, and Y Combinator.
                </p>
              </div>
              <button
                onClick={() => setIsSourceModalOpen(false)}
                disabled={sourceLoading}
                className="rounded-md p-1 text-zinc-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sourcing Channel Selector */}
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
              <button
                type="button"
                onClick={() => setSourceChannel("places")}
                className={`flex items-center justify-center gap-1.5 rounded py-2 text-xs font-medium transition ${
                  sourceChannel === "places"
                    ? "bg-zinc-800 text-white shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                Google / Places
              </button>

              <button
                type="button"
                onClick={() => setSourceChannel("show_hn")}
                className={`flex items-center justify-center gap-1.5 rounded py-2 text-xs font-medium transition ${
                  sourceChannel === "show_hn"
                    ? "bg-zinc-800 text-white shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                Show HN Stream
              </button>

              <button
                type="button"
                onClick={() => setSourceChannel("yc")}
                className={`flex items-center justify-center gap-1.5 rounded py-2 text-xs font-medium transition ${
                  sourceChannel === "yc"
                    ? "bg-zinc-800 text-white shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Building2 className="h-3.5 w-3.5 text-amber-400" />
                YC Startups
              </button>
            </div>

            <form onSubmit={handleSourceLeads} className="space-y-4">
              {sourceChannel === "places" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Industry / Keyword
                      </label>
                      <input
                        type="text"
                        required
                        value={sourceKeyword}
                        onChange={(e) => setSourceKeyword(e.target.value)}
                        placeholder="e.g. Cloud Consulting"
                        className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Target City
                      </label>
                      <input
                        type="text"
                        required
                        value={sourceCity}
                        onChange={(e) => setSourceCity(e.target.value)}
                        placeholder="e.g. London, Mumbai, San Francisco"
                        className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mr-1">3 Dices Targets:</span>
                    {["SaaS", "Fintech", "Cloud Consulting", "Software Agency", "E-commerce"].map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => setSourceKeyword(kw)}
                        className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                          sourceKeyword === kw
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Mines verified business locations, contact info, and website URLs via OpenStreetMap Overpass geocoding ($0 API fees).
                  </p>
                </div>
              )}

              {sourceChannel === "show_hn" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Launch Search Topic / Query
                    </label>
                    <input
                      type="text"
                      required
                      value={sourceKeyword}
                      onChange={(e) => setSourceKeyword(e.target.value)}
                      placeholder="e.g. AI Agent or Cloud or Kubernetes"
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mr-1">3 Dices Targets:</span>
                    {["AI Agent", "LLM", "AWS", "Kubernetes", "DevOps", "Database"].map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => setSourceKeyword(kw)}
                        className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                          sourceKeyword === kw
                            ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                            : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Pulls recent real-time product launches from Hacker News via Algolia. High-intent technical founders actively reading feedback.
                  </p>
                </div>
              )}

              {sourceChannel === "yc" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        YC Batch
                      </label>
                      <input
                        type="text"
                        required
                        value={sourceBatch}
                        onChange={(e) => setSourceBatch(e.target.value)}
                        placeholder="e.g. W24, S23, W23"
                        className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Domain / Tag Filter (Optional)
                      </label>
                      <input
                        type="text"
                        value={sourceKeyword}
                        onChange={(e) => setSourceKeyword(e.target.value)}
                        placeholder="e.g. AI, B2B, Fintech"
                        className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mr-1">3 Dices Targets:</span>
                    {["AI", "DevOps", "B2B", "Fintech", "Security"].map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => setSourceKeyword(kw)}
                        className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                          sourceKeyword === kw
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Mines funded startup profiles, founders, and business propositions from the official YC directory.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-400">Limit:</label>
                  <select
                    value={sourceLimit}
                    onChange={(e) => setSourceLimit(Number(e.target.value))}
                    className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value={10}>10 leads</option>
                    <option value={15}>15 leads</option>
                    <option value={25}>25 leads</option>
                    <option value={50}>50 leads</option>
                  </select>
                </div>
                <span className="text-[11px] text-zinc-500">Autonomous deduping & validation enabled</span>
              </div>

              {sourceError && (
                <div className="flex items-center gap-2 rounded bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{sourceError}</span>
                </div>
              )}

              {sourceSuccess && (
                <div className="flex items-center gap-2 rounded bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{sourceSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsSourceModalOpen(false)}
                  disabled={sourceLoading}
                  className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sourceLoading}
                  className="flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-40"
                >
                  {sourceLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  {sourceLoading ? "Mining leads..." : "Mine & Ingest Leads"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FIND CREATOR MODAL */}
      {isCreatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!creatorLoading) {
                setIsCreatorModalOpen(false);
                setCreatorError(null);
              }
            }}
          />

          <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Find Creator</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Discover public creator bios, emails, and audience metrics.
                </p>
              </div>
              <button
                onClick={() => setIsCreatorModalOpen(false)}
                disabled={creatorLoading}
                className="rounded-md p-1 text-zinc-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Platform Selection Tabs */}
            <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
              <button
                type="button"
                onClick={() => setCreatorPlatform("instagram")}
                className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs font-medium transition ${
                  creatorPlatform === "instagram"
                    ? "bg-zinc-800 text-white shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Instagram className="h-3.5 w-3.5 text-pink-400" />
                Instagram
              </button>

              <button
                type="button"
                onClick={() => setCreatorPlatform("youtube")}
                className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs font-medium transition ${
                  creatorPlatform === "youtube"
                    ? "bg-zinc-800 text-white shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Youtube className="h-3.5 w-3.5 text-red-400" />
                YouTube
              </button>

              <button
                type="button"
                onClick={() => setCreatorPlatform("linktree")}
                className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs font-medium transition ${
                  creatorPlatform === "linktree"
                    ? "bg-zinc-800 text-white shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Link2 className="h-3.5 w-3.5 text-emerald-400" />
                Linktree
              </button>

              <button
                type="button"
                onClick={() => setCreatorPlatform("github")}
                className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs font-medium transition ${
                  creatorPlatform === "github"
                    ? "bg-zinc-800 text-white shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Github className="h-3.5 w-3.5 text-zinc-300" />
                GitHub
              </button>
            </div>

            <form onSubmit={handleScrapeCreator} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  {creatorPlatform === "instagram" && "Instagram Username"}
                  {creatorPlatform === "youtube" && "YouTube Channel Handle"}
                  {creatorPlatform === "linktree" && "Linktree Username or URL"}
                  {creatorPlatform === "github" && "GitHub Username"}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={creatorIdentifier}
                  onChange={(e) => setCreatorIdentifier(e.target.value)}
                  placeholder={
                    creatorPlatform === "instagram"
                      ? "e.g. beerbiceps or @tanmaybhat"
                      : creatorPlatform === "youtube"
                      ? "e.g. @MrBeast or @mkbhd"
                      : creatorPlatform === "linktree"
                      ? "e.g. linktr.ee/creator or creator_handle"
                      : "e.g. torvalds or shadcn"
                  }
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  {creatorPlatform === "instagram" && "Extracts public bio, contact email, and follower counts."}
                  {creatorPlatform === "youtube" && "Scrapes channel about section, business email, and subscriber stats."}
                  {creatorPlatform === "linktree" && "Mines all connected social endpoints, email, and WhatsApp links."}
                  {creatorPlatform === "github" && "Mines public developer profile, verified company, bio, and blog."}
                </p>
              </div>

              {/* Notice for India */}
              <div className="rounded border border-zinc-800/60 bg-zinc-900/30 px-3 py-2 text-[11px] text-zinc-400">
                Note: TikTok scraping is excluded (banned in India under Section 69A IT Act).
              </div>

              {creatorError && (
                <div className="flex items-center gap-2 rounded bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{creatorError}</span>
                </div>
              )}

              {creatorSuccess && (
                <div className="flex items-center gap-2 rounded bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{creatorSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsCreatorModalOpen(false)}
                  disabled={creatorLoading}
                  className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatorLoading || !creatorIdentifier.trim()}
                  className="flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-40"
                >
                  {creatorLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  {creatorLoading ? "Discovering..." : "Scrape & Ingest"}
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
            onClick={() => {
              if (!csvLoading) {
                setIsCsvModalOpen(false);
                setCsvError(null);
              }
            }}
          />

          <div className="relative w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white">Import Leads from CSV</h3>
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                    Admin
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Upload any contact or B2B list. Columns are auto-mapped and deduplicated.
                </p>
              </div>
              <button
                onClick={() => {
                  if (!csvLoading) {
                    setIsCsvModalOpen(false);
                    setCsvError(null);
                  }
                }}
                disabled={csvLoading}
                className="rounded-md p-1 text-zinc-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCsvImport} className="space-y-4">
              {/* File Dropzone Area */}
              <label
                htmlFor="csv-file-input"
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition cursor-pointer ${
                  csvFile
                    ? "border-emerald-500/50 bg-emerald-950/10"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80"
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

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 mb-3 shadow-inner">
                  {csvFile ? (
                    <FileText className="h-6 w-6 text-emerald-400" />
                  ) : (
                    <Upload className="h-6 w-6 text-zinc-400" />
                  )}
                </div>

                {csvFile ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-white">{csvFile.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {(csvFile.size / 1024).toFixed(1)} KB · Ready to import
                    </p>
                    <span className="inline-block mt-2 text-[11px] text-emerald-400 hover:underline">
                      Click to choose a different file
                    </span>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs font-medium text-zinc-200">
                      Click to upload or drag & drop a CSV file
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Supports Clutch, Google Maps, Apollo, or custom CSV exports
                    </p>
                  </div>
                )}
              </label>

              {/* Supported Columns Guide */}
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3 text-[11px] text-zinc-400 space-y-1">
                <span className="font-semibold text-zinc-300">Auto-detected Columns:</span>
                <p>
                  Company Name, Contact Name / Decision Maker, Email(s), Phone, Website, City, Country, LinkedIn, Category.
                </p>
              </div>

              {csvError && (
                <div className="flex items-center gap-2 rounded bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{csvError}</span>
                </div>
              )}

              {csvSuccess && (
                <div className="flex items-center gap-2 rounded bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{csvSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsCsvModalOpen(false);
                    setCsvFile(null);
                    setCsvError(null);
                  }}
                  disabled={csvLoading}
                  className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={csvLoading || !csvFile}
                  className="flex items-center gap-1.5 rounded-md bg-white px-4 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-40"
                >
                  {csvLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  {csvLoading ? "Processing & Ingesting..." : "Upload & Ingest Leads"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
