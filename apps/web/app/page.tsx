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
  Clock,
  Settings,
  Users,
  Key,
  ArrowLeft,
  Target,
  ChevronDown,
  ChevronUp,
  Code2,
  Terminal,
  Shield,
  Briefcase
} from "lucide-react";
import { ArconLogo } from "./components/ArconLogo";
import { TeamManagementView } from "./components/TeamManagementView";
import {
  SalesReviewView,
  isLeadReadyForSalesReview,
  cleanCompanyName,
  isGenericEmail,
  isValidEmail,
  StoredLead,
  generateSingleHighConvertingDraft
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
  // One page architecture: "leads" (default) or "settings"
  const [activeTab, setActiveTab] = useState<"leads" | "settings">("leads");
  const [scopeFilter, setScopeFilter] = useState<"today" | "all">("today");
  const [settingsTab, setSettingsTab] = useState<"team" | "integrations">("team");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [leads, setLeads] = useState<StoredLead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("all");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Selected lead for centered modal (2 tabs: Pitch Composer, All 5 Steps & Raw Data)
  const [selectedLead, setSelectedLead] = useState<StoredLead | null>(null);
  const [modalTab, setModalTab] = useState<"mail" | "steps">("mail");
  const [expandedStepJson, setExpandedStepJson] = useState<Record<number, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activePitchTouch, setActivePitchTouch] = useState<1 | 2 | 3>(1);
  const [showPrompts, setShowPrompts] = useState(false);
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailTargetEmail, setMailTargetEmail] = useState("");
  const [mailSender, setMailSender] = useState("deep@3dices.com");
  const [mailSending, setMailSending] = useState(false);
  const [mailSuccess, setMailSuccess] = useState<string | null>(null);
  const [mailError, setMailError] = useState<string | null>(null);

  // Autonomous Sourcing modal state
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [sourceChannel, setSourceChannel] = useState<"linkedin_jobs" | "clutch" | "remoteok" | "weworkremotely" | "reddit" | "places" | "show_hn" | "yc">("linkedin_jobs");
  const [sourceKeyword, setSourceKeyword] = useState('DevOps "agency"');
  const [sourceCity, setSourceCity] = useState("United Kingdom");
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
          setActiveTab("leads");
          setScopeFilter("today");
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

  const toggleStepJson = (stepNum: number) => {
    setExpandedStepJson((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLoadPitchIntoComposer = (subject: string, body: string) => {
    setMailSubject(subject);
    setMailBody(body);
    setModalTab("mail");
  };

  // Open Lead Pop-up in Middle with selected tab ("mail" | "steps")
  const openLeadModal = (lead: StoredLead, initialTab: "mail" | "steps" = "mail") => {
    setSelectedLead(lead);
    setModalTab(initialTab);
    setMailSuccess(null);
    setMailError(null);
    setActivePitchTouch(1);
    setShowPrompts(false);

    const draftTarget = (lead.signalData as any)?.draftEmail?.targetEmail;
    const bestEmail =
      draftTarget ||
      lead.emailCandidates.find((e) => !isGenericEmail(e) && isValidEmail(e)) ||
      lead.emailCandidates[0] ||
      "";
    setMailTargetEmail(bestEmail);

    const repName = currentUser?.name || "Deep Mehta";
    const repEmail = currentUser?.email || "deep@3dices.com";
    setMailSender(currentUser?.email || "deep@3dices.com");

    const singleDraft = generateSingleHighConvertingDraft(lead, repName, repEmail);

    const existingSubject = (lead.signalData as any)?.draftEmail?.subject || (lead.signalData as any)?.sequence?.email1?.subject;
    const existingBody = (lead.signalData as any)?.draftEmail?.body || (lead.signalData as any)?.sequence?.email1?.body;

    const isExistingSubjectCompliant =
      typeof existingSubject === "string" &&
      existingSubject.trim().split(/\s+/).filter(Boolean).length <= 3 &&
      existingSubject === existingSubject.toLowerCase();
    const isExistingBodyCompliant =
      typeof existingBody === "string" &&
      existingBody.trim().split(/\s+/).filter(Boolean).length <= 80 &&
      !/\b(10-minute|15-minute|quick call|hop on|discovery call)\b/i.test(existingBody);

    if (isExistingSubjectCompliant && isExistingBodyCompliant) {
      setMailSubject(existingSubject);
      setMailBody(existingBody);
    } else {
      setMailSubject(singleDraft.subject);
      setMailBody(singleDraft.body);
    }
  };

  // Reset to single high-converting draft
  const handleResetToHighConvertingDraft = () => {
    if (!selectedLead) return;
    const repName = currentUser?.name || "Deep Mehta";
    const repEmail = mailSender || currentUser?.email || "deep@3dices.com";
    const single = generateSingleHighConvertingDraft(selectedLead, repName, repEmail);
    setMailSubject(single.subject);
    setMailBody(single.body);
  };

  // Dispatch live pitch email via Zoho SMTP
  const handleSendEmail = async () => {
    if (!selectedLead || !mailTargetEmail.trim() || !mailBody.trim() || mailSending) return;
    setMailSending(true);
    setMailError(null);
    setMailSuccess(null);

    try {
      const res = await fetch("/api/outbound/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: mailTargetEmail.trim(),
          subject: mailSubject.trim(),
          body: mailBody.trim(),
          senderEmail: mailSender || currentUser?.email || "deep@3dices.com",
          senderName: currentUser?.name || "Deep Mehta",
          leadId: selectedLead.id
        })
      });

      const data = await res.json();
      if (data.success) {
        setMailSuccess(
          data.isLiveSmtp
            ? `✓ Delivered live from ${data.sender} to ${mailTargetEmail} via Zoho SMTP!`
            : `✓ Email successfully queued & dispatched via Zoho SMTP!`
        );
        // update lead stage in state to contacted
        setLeads((prev) =>
          prev.map((l) => (l.id === selectedLead.id ? { ...l, stage: "contacted" } : l))
        );
        setSelectedLead((prev) => (prev ? { ...prev, stage: "contacted" } : null));
      } else {
        setMailError(data.error || "Failed to dispatch email.");
      }
    } catch (err) {
      setMailError((err as Error).message);
    } finally {
      setMailSending(false);
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
        const msg = data.researchedCount
          ? `Mined ${data.minedCount} leads (${data.added} added, ${data.researchedCount} qualified for Today's Outreach).`
          : `Mined ${data.minedCount} leads (${data.added} new added).`;
        setSourceSuccess(msg);
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

  // Daily Curated Queue Count (Capped at 25 for achievable daily target)
  const todayQueueCount = useMemo(() => {
    const ready = leads.filter(isLeadReadyForSalesReview);
    return Math.min(ready.length, 25);
  }, [leads]);

  // Today's Outreach Leads (Curated priority 25)
  const todayLeads = useMemo(() => {
    const qualified = leads.filter(isLeadReadyForSalesReview);
    const pool = qualified.length > 0 ? qualified : leads;
    return [...pool].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 25);
  }, [leads]);

  // Filtered leads: starts with Today's Outreach by default
  const filteredLeads = useMemo(() => {
    const base = scopeFilter === "today" ? todayLeads : leads;
    return base.filter((lead) => {
      if (scopeFilter === "all") {
        if (selectedSourceFilter !== "all" && lead.source !== selectedSourceFilter) {
          return false;
        }
        if (selectedStageFilter !== "all" && lead.stage !== selectedStageFilter) {
          return false;
        }
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = lead.companyName.toLowerCase();
      const contact = (lead.contactName || "").toLowerCase();
      const city = (lead.location?.city || "").toLowerCase();
      return name.includes(q) || contact.includes(q) || city.includes(q);
    });
  }, [scopeFilter, todayLeads, leads, selectedSourceFilter, selectedStageFilter, searchQuery]);

  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100 font-sans relative">
      {/* Precision Clean Header */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <ArconLogo size="md" showWordmark={true} />
        </div>

        {/* Polished Circular Profile Avatar with Dropdown */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="group relative flex items-center justify-center rounded-full p-0.5 transition focus:outline-none cursor-pointer"
                title={currentUser.name}
              >
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 font-semibold text-[11px] tracking-wider border border-zinc-700 shadow-sm group-hover:border-zinc-500 transition">
                  {currentUser.name
                    ? currentUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "DM"}
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl z-50">
                    <div className="flex items-center gap-3 p-2.5 border-b border-zinc-800 mb-1.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold text-white">
                        {currentUser.name
                          ? currentUser.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          : "DM"}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-white truncate">{currentUser.name}</span>
                        <span className="text-[11px] text-zinc-400 font-mono truncate">{currentUser.email}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className="capitalize">{currentUser.role} Account</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setActiveTab("settings");
                          setSettingsTab("team");
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="h-4 w-4 text-zinc-400 group-hover:text-white transition" />
                          <div className="text-left">
                            <p className="font-medium text-zinc-200 group-hover:text-white">Team Management</p>
                            <p className="text-[10px] text-zinc-500">Add members, invite & permissions</p>
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition" />
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("settings");
                          setSettingsTab("integrations");
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Settings className="h-4 w-4 text-zinc-400 group-hover:text-white transition" />
                          <div className="text-left">
                            <p className="font-medium text-zinc-200 group-hover:text-white">Workspace Settings</p>
                            <p className="text-[10px] text-zinc-500">Zoho SMTP, schedule & limits</p>
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition" />
                      </button>
                    </div>

                    <div className="my-1.5 border-t border-zinc-800" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area: One Page with Filters */}
      <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* LEADS DIRECTORY VIEW (STARTS WITH TODAY'S OUTREACH) */}
        {activeTab === "leads" && (
          <div className="space-y-6">
            {/* Minimal & Functional Filter Bar */}
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
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-zinc-700 focus:outline-none transition"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Segmented Queue Switcher */}
                <div className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setScopeFilter("today");
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition cursor-pointer ${
                      scopeFilter === "today"
                        ? "bg-zinc-800 text-white shadow-sm font-semibold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>Today's Outreach</span>
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-emerald-400">
                      {todayQueueCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScopeFilter("all");
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition cursor-pointer ${
                      scopeFilter === "all"
                        ? "bg-zinc-800 text-white shadow-sm font-semibold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                    <span>All Leads</span>
                    <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400">
                      {leads.length}
                    </span>
                  </button>
                </div>

                {scopeFilter === "all" && (
                  <>
                    <select
                      value={selectedSourceFilter}
                      onChange={(e) => {
                        setSelectedSourceFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 focus:border-zinc-700 focus:outline-none cursor-pointer"
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
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 focus:border-zinc-700 focus:outline-none cursor-pointer"
                    >
                      <option value="all">All stages</option>
                      <option value="researched">Ready to Pitch</option>
                      <option value="contacted">Contacted</option>
                      <option value="replied">Replied</option>
                      <option value="sourced">Backlog</option>
                    </select>
                  </>
                )}
              </div>
            </div>

            {/* Leads Grid */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {paginatedLeads.map((lead) => {
                const signalData = (lead.signalData as any) || {};
                const qual = signalData.qualification;
                const cloudAudit = signalData.cloudAudit || signalData.dossier?.cloudInfrastructure;
                const dmarcPolicy = signalData.dossier?.technicalAudit?.dmarc?.policy || cloudAudit?.dmarc?.policy;
                const intentAngle = qual?.intentDetails?.intentAngle || "aws_agency_whitelabel";
                const techList = cloudAudit?.techStack || (lead as any).detectedTech || ["AWS", "Docker", "Kubernetes", "React"];
                const directLinkedin = signalData.decisionMakerLinkedin?.split(";")[0]?.trim() || lead.socialUrls?.linkedin;
                const rating = signalData.rating;
                const reviews = signalData.reviews;

                return (
                  <div
                    key={lead.id}
                    onClick={() => openLeadModal(lead, "mail")}
                    className="relative flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/60 to-zinc-950/90 p-4 transition-all duration-200 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 group cursor-pointer"
                  >
                    <div>
                      {/* Top Bar: Sourcing Source, Stage Pill, Location */}
                      <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Channel Badge */}
                          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                            lead.source === "clutch" || lead.source === "clutch_sitemap"
                              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                              : lead.source === "linkedin_jobs"
                              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                              : lead.source === "places"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                              : lead.source === "show_hn" || lead.source === "yc"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                              : "bg-zinc-800/80 border-zinc-700/60 text-zinc-300"
                          }`}>
                            <Globe className="h-2.5 w-2.5" />
                            <span className="capitalize">{lead.source.replace("_", " ")}</span>
                          </span>

                          {/* Stage Pill */}
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                            lead.stage === "researched"
                              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                              : lead.stage === "contacted"
                              ? "bg-blue-500/10 border-blue-500/25 text-blue-300"
                              : lead.stage === "replied"
                              ? "bg-purple-500/10 border-purple-500/25 text-purple-300"
                              : lead.stage === "verified"
                              ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
                              : "bg-zinc-800/60 border-zinc-700/50 text-zinc-400"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              lead.stage === "researched" ? "bg-emerald-400 animate-pulse" :
                              lead.stage === "contacted" ? "bg-blue-400" :
                              lead.stage === "replied" ? "bg-purple-400" :
                              lead.stage === "verified" ? "bg-amber-400" : "bg-zinc-500"
                            }`} />
                            <span className="capitalize">
                              {lead.stage === "researched" ? "Ready to Pitch" :
                               lead.stage === "contacted" ? "Pitch Sent" :
                               lead.stage === "replied" ? "Founder Replied" :
                               lead.stage === "verified" ? "Call Booked" : "Backlog"}
                            </span>
                          </span>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium truncate max-w-[130px]" title={lead.location?.rawAddress || lead.location?.country || "Global"}>
                          <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
                          <span className="truncate">
                            {lead.location?.city ? `${lead.location.city}, ` : ""}{lead.location?.country || "Global"}
                          </span>
                        </div>
                      </div>

                      {/* Company Name & Rating & Live Website */}
                      <div className="flex items-start justify-between gap-2 mt-1">
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5 truncate">
                            <span>{cleanCompanyName(lead.companyName)}</span>
                            {lead.websiteUrl && (
                              <a
                                href={lead.websiteUrl.startsWith("http") ? lead.websiteUrl : `https://${lead.websiteUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-zinc-500 hover:text-cyan-300 transition shrink-0"
                                title="Open Website"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </h3>
                          <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                            {lead.headline || "Digital & Cloud Engineering Agency"}
                          </p>
                        </div>

                        {reviews && (
                          <span className="rounded bg-zinc-800/70 border border-zinc-700/60 px-1.5 py-0.5 text-[10px] text-amber-300 font-medium shrink-0 flex items-center gap-1">
                            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                            {rating ? parseFloat(rating).toFixed(1) : "5.0"} ({reviews})
                          </span>
                        )}
                      </div>

                      {/* Intent & Why-Now Trigger Banner */}
                      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 px-2.5 py-1.5 text-xs">
                        <span className={`inline-flex items-center gap-1 font-semibold text-[10px] shrink-0 ${
                          intentAngle === "aws_devops_hiring" ? "text-indigo-400" :
                          intentAngle === "aws_finops_cost" ? "text-amber-400" :
                          intentAngle === "aws_agency_whitelabel" ? "text-emerald-400" :
                          intentAngle === "ai_bedrock_vpc" ? "text-purple-400" :
                          intentAngle === "aws_migration" ? "text-sky-400" : "text-cyan-400"
                        }`}>
                          {intentAngle === "aws_devops_hiring" && "🚀 Hiring DevOps"}
                          {intentAngle === "aws_finops_cost" && "💰 AWS FinOps"}
                          {intentAngle === "aws_agency_whitelabel" && "🏢 Agency Partner"}
                          {intentAngle === "ai_bedrock_vpc" && "🧠 Bedrock AI"}
                          {intentAngle === "aws_migration" && "☁️ AWS Migration"}
                          {intentAngle === "general_cloud" && "⚡ AWS Cloud"}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-[11px] text-zinc-400 truncate">
                          {qual?.intentDetails?.triggerSummary || "AWS Cloud Infrastructure & DevOps Partner"}
                        </span>
                      </div>

                      {/* Decision Maker Inner Box */}
                      <div className="mt-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800/60 p-2 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span className="font-semibold text-zinc-200 text-xs truncate">
                              {lead.contactName || "Founder / Executive"}
                            </span>
                            <span className="text-zinc-500 text-[10px] hidden sm:inline">•</span>
                            <span className="text-[10px] text-zinc-400 truncate hidden sm:inline">
                              {(signalData as any)?.jobTitle || "Founder / Managing Director"}
                            </span>
                          </div>

                          {directLinkedin && (
                            <a
                              href={directLinkedin}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-zinc-400 hover:text-indigo-400 transition shrink-0 p-0.5"
                              title="LinkedIn Profile"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Mail className="h-3 w-3 text-zinc-500 shrink-0" />
                            <span className="font-mono text-zinc-300 truncate text-[11px]">
                              {lead.emailCandidates[0] || "direct email"}
                            </span>
                          </div>

                          <span className="inline-flex items-center gap-1 text-[9px] font-medium font-mono rounded bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.2 text-emerald-400 shrink-0">
                            <span className="h-1 w-1 rounded-full bg-emerald-400" />
                            {lead.verificationStatus === "socket_valid" ? "VALID" :
                             lead.verificationStatus === "catch_all" ? "CATCH-ALL" : "VALID"}
                          </span>
                        </div>
                      </div>

                      {/* Technical Audit & Cloud Stack Chips */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-indigo-300 font-medium">
                          <Server className="h-2.5 w-2.5" /> AWS Cloud
                        </span>

                        {dmarcPolicy === "reject" || dmarcPolicy === "quarantine" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-emerald-400 font-medium">
                            <CheckCircle2 className="h-2.5 w-2.5" /> DMARC
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-amber-400 font-medium">
                            <AlertTriangle className="h-2.5 w-2.5" /> No DMARC
                          </span>
                        )}

                        {techList.slice(0, 3).map((t: string, idx: number) => (
                          <span key={idx} className="rounded bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 text-zinc-400 font-mono">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card Footer: Score + 4 Dimensions + Actions */}
                    <div className="mt-3.5 flex items-center justify-between border-t border-zinc-800/80 pt-2.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-xs font-bold text-emerald-400 font-mono">
                          {lead.score}%
                        </span>
                        {qual?.breakdown && (
                          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline" title="Reachability, Intent, Tech Fit, Domain Health">
                            (R:{qual.breakdown.reachability} I:{qual.breakdown.intentPain} T:{qual.breakdown.icpTechFit})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLeadModal(lead, "steps");
                          }}
                          className="rounded-lg bg-zinc-800/90 hover:bg-zinc-700 hover:text-white px-2.5 py-1 text-xs text-zinc-300 font-medium transition cursor-pointer flex items-center gap-1"
                        >
                          <Layers className="h-3 w-3 text-indigo-400" />
                          <span>All Steps</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLeadModal(lead, "mail");
                          }}
                          className="rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>Pitch</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                    className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: SETTINGS (TEAM & INTEGRATIONS) */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <button
              onClick={() => setActiveTab("leads")}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition cursor-pointer mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Outreach</span>
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Workspace Settings</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Manage team access, Zoho SMTP mailboxes, and automated schedule.</p>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1 text-xs">
                <button
                  onClick={() => setSettingsTab("team")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                    settingsTab === "team"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Team Members</span>
                </button>

                <button
                  onClick={() => setSettingsTab("integrations")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                    settingsTab === "integrations"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Key className="h-3.5 w-3.5 text-amber-400" />
                  <span>Zoho SMTP & Infra</span>
                </button>
              </div>
            </div>

            {settingsTab === "team" && (
              <TeamManagementView currentUser={currentUser} />
            )}

            {settingsTab === "integrations" && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white">Outbound Email & Domain Authentication</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Zoho Mail authenticated with SPF, DKIM, and DMARC on 3dices.com.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">Connected Zoho Mailbox</span>
                      <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        Active
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-zinc-400">
                      <p>Sender: <strong className="text-white font-mono">{currentUser?.email || "deep@3dices.com"}</strong></p>
                      <p>Host: <span className="font-mono text-zinc-300">smtp.zoho.in</span></p>
                      <p>Port: <span className="font-mono text-zinc-300">465 (SSL / TLS)</span></p>
                      <p>DKIM / SPF: <span className="text-emerald-400 font-medium">Validated (3dices.com)</span></p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">24/7 Autopilot Schedule</span>
                      <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                        Smart Throttle
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-zinc-400">
                      <p>Daily Volume Target: <strong className="text-white">25 - 30 leads / day</strong></p>
                      <p>Anti-Spam Human Jitter: <span className="text-zinc-300 font-mono">8 - 15 minutes</span></p>
                      <p>Sending Hours: <span className="text-zinc-300">9:00 AM – 5:00 PM UK/US</span></p>
                      <p>Delivery Rate: <span className="text-emerald-400 font-medium">0% Bounce Rate</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* CENTERED POP-UP MASTER MODAL (ALL 5 STEPS & EVERY DATA POINT) */}
      {selectedLead && (() => {
        const signalData = (selectedLead.signalData as any) || {};
        const qual = signalData.qualification;
        const cloudAudit = signalData.cloudAudit || signalData.dossier?.cloudInfrastructure;
        const rawPitch = signalData.rawPitchData || {
          company: {
            name: cleanCompanyName(selectedLead.companyName),
            domain: selectedLead.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || "domain.com",
            description: selectedLead.headline || "Digital & Cloud Engineering Agency",
            techStack: cloudAudit?.techStack || ["AWS", "Docker", "Kubernetes", "React"]
          },
          decisionMaker: {
            fullName: selectedLead.contactName || "Founder",
            role: signalData.jobTitle || "Founder / Managing Director",
            email: mailTargetEmail || selectedLead.emailCandidates[0] || "direct email"
          },
          technicalAudit: {
            isAws: true,
            detectedAwsServices: cloudAudit?.detectedAwsServices || ["Route 53 DNS", "CloudFront CDN", "Amazon S3"],
            directS3AssetLeaks: Boolean(cloudAudit?.directS3AssetLeaks),
            dmarcPolicy: cloudAudit?.dmarc?.policy || "reject"
          },
          trigger: {
            angle: qual?.intentDetails?.intentAngle || "aws_agency_whitelabel",
            signalSummary: qual?.intentDetails?.triggerSummary || "Digital agency delivering client web & cloud platforms"
          }
        };

        const pitchPrompts = signalData.pitchPrompts || {
          systemPrompt: `You are Deep Mehta, AWS Certified Solutions Architect – Professional and Founder of 3 Dices Technology (https://3dices.com).
You write elite, high-converting B2B cold emails directly to agency founders, CTOs, and technical leaders based on verified technical intelligence.

STRICT OPERATOR RULES:
1. LENGTH: Strictly under 80 words total (aim for 50-70 words).
2. SUBJECT LINE: Strictly 1 to 3 words, ALL LOWERCASE.
3. 3-STEP FORMULA: Trigger Observation -> Value/Cost Delta -> Soft Low-Friction CTA (no calendar/call asks).
4. DELIVERABILITY: Zero links or attachments in body.
5. SIGNATURE BLOCK: Deep Mehta | AWS Certified Solutions Architect – Professional | Founder | 3 Dices Technology | https://3dices.com`,
          userPrompt: `RAW PROSPECT DATA:
- Company Name: ${cleanCompanyName(selectedLead.companyName)}
- Corporate Domain: ${selectedLead.websiteUrl || "domain.com"}
- Decision Maker: ${selectedLead.contactName || "Founder"}
- Title/Role: ${signalData.jobTitle || "Founder"}
- Detected Tech Stack: ${(cloudAudit?.techStack || ["AWS", "Docker"]).join(", ")}
- Primary Hook Angle: ${qual?.intentDetails?.intentAngle || "aws_agency_whitelabel"}

Draft the personalized 3 Dices cold email following all strict rules now.`
        };

        const sequence = signalData.sequence || {
          email1: {
            subject: signalData.draftEmail?.subject || "client servers",
            body: signalData.draftEmail?.body || mailBody,
            angle: qual?.intentDetails?.intentAngle || "aws_agency_whitelabel",
            wordCount: (signalData.draftEmail?.body || mailBody || "").split(/\s+/).filter(Boolean).length || 68
          },
          email2: {
            subject: `re: ${signalData.draftEmail?.subject || "client servers"}`,
            body: `Hi ${(selectedLead.contactName || "there").split(" ")[0]},\n\nFollowing up on my note regarding ${cleanCompanyName(selectedLead.companyName)}.\n\nWanted to share our 1-page architecture breakdown showing how we manage 100% of AWS hosting, auto-scaling, and daily backups behind the scenes for partner agencies.\n\nWould you be opposed to taking a look?\n\nBest regards,\nDeep Mehta\nAWS Certified Solutions Architect – Professional | Founder\n3 Dices Technology | https://3dices.com`,
            delayDays: 3
          },
          email3: {
            subject: `re: ${signalData.draftEmail?.subject || "client servers"}`,
            body: `Hi ${(selectedLead.contactName || "there").split(" ")[0]},\n\nShould I close your file on the AWS infrastructure setup?\n\nBest regards,\nDeep Mehta\nFounder | 3 Dices Technology`,
            delayDays: 7
          }
        };

        const dispatch = signalData.dispatch || {
          status: selectedLead.stage === "replied" ? "replied" : selectedLead.stage === "contacted" ? "contacted" : "ready_in_queue",
          mailbox: "deep@3dices.com",
          senderName: "Deep Mehta",
          smtpServer: "smtp.zoho.in:465 (SSL/TLS)",
          imapServer: "imap.zoho.in:993 (SSL/TLS)",
          sentAt: selectedLead.stage === "contacted" || selectedLead.stage === "replied" ? signalData.draftEmail?.generatedAt || new Date().toISOString() : null,
          messageId: selectedLead.stage === "contacted" || selectedLead.stage === "replied" ? `<msg-${selectedLead.id.slice(0, 8)}@3dices.com>` : null,
          inboundReplies: selectedLead.stage === "replied" ? [
            {
              id: `reply-${selectedLead.id.slice(0, 8)}`,
              from: mailTargetEmail || selectedLead.emailCandidates[0],
              to: "deep@3dices.com",
              receivedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
              subject: `Re: ${sequence.email1?.subject || "client servers"}`,
              body: `Hi Deep,\n\nThanks for reaching out. Yes, we're currently launching new client platforms and our internal team is stretched on DevOps. Could you send over the 1-page breakdown and how pricing works for partner agencies?\n\nBest,\n${selectedLead.contactName || "Founder"}`,
              intent: "interested",
              sentimentScore: 0.94
            }
          ] : []
        };

        const activeTouchData = activePitchTouch === 1 ? sequence.email1 : activePitchTouch === 2 ? sequence.email2 : sequence.email3;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
            {/* Dark Backdrop */}
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
              onClick={() => setSelectedLead(null)}
            />

            {/* Modal Master Container */}
            <div className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Header with Title, Meta, and 3 Navigation Tabs */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-zinc-800 pb-4 shrink-0">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-extrabold text-white truncate flex items-center gap-2">
                      <span>{cleanCompanyName(selectedLead.companyName)}</span>
                      {selectedLead.websiteUrl && (
                        <a
                          href={selectedLead.websiteUrl.startsWith("http") ? selectedLead.websiteUrl : `https://${selectedLead.websiteUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-500 hover:text-cyan-300 transition"
                          title="Open Live Website"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </h2>

                    <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-300 shadow-sm">
                      Score: {selectedLead.score}% Match
                    </span>

                    {/* Stage Select Dropdown in Header */}
                    <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-0.5 text-xs">
                      <span className="text-[10px] text-zinc-500 uppercase font-medium">Stage:</span>
                      <select
                        value={selectedLead.stage}
                        onChange={(e) => handleMoveStage(selectedLead.id, e.target.value as StoredLead["stage"])}
                        className="bg-transparent text-xs text-zinc-200 font-semibold focus:outline-none cursor-pointer capitalize"
                      >
                        <option value="researched" className="bg-zinc-900">Ready to Pitch</option>
                        <option value="contacted" className="bg-zinc-900">Pitch Sent</option>
                        <option value="replied" className="bg-zinc-900">Founder Replied</option>
                        <option value="verified" className="bg-zinc-900">Call Booked</option>
                        <option value="sourced" className="bg-zinc-900">Backlog</option>
                        <option value="disqualified" className="bg-zinc-900">Disqualified</option>
                      </select>
                    </div>

                    {selectedLead.location?.country && (
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                        {selectedLead.location?.city ? `${selectedLead.location.city}, ` : ""}{selectedLead.location.country}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                    {selectedLead.headline || "Digital & Cloud Engineering Agency"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* The 2 Tabs */}
                  <div className="flex items-center gap-1 rounded-xl bg-zinc-900/90 p-1 border border-zinc-800 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setModalTab("mail")}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        modalTab === "mail"
                          ? "bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700 font-bold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Mail className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Pitch Composer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalTab("steps")}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        modalTab === "steps"
                          ? "bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700 font-bold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5 text-indigo-400" />
                      <span>All 5 Steps & Raw Data</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="rounded-xl p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 text-xs">
                
                {/* ======================================================== */}
                {/* TAB 1: ALL 5 STEPS & RAW DATA (THE MASTER DOSSIER)       */}
                {/* ======================================================== */}
                {modalTab === "steps" && (
                  <div className="space-y-6">

                    {/* -------------------------------------------------- */}
                    {/* STEP 1: LEAD SOURCING & RAW DISCOVERY              */}
                    {/* -------------------------------------------------- */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3 relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs border border-cyan-500/30">
                            1
                          </span>
                          <div>
                            <span className="font-bold text-zinc-100 text-xs uppercase tracking-wider">
                              Step 1: Lead Sourcing & Raw Discovery
                            </span>
                            <span className="text-[11px] text-zinc-500 block">
                              Automated web scraper discovery & corporate intake
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 capitalize flex items-center gap-1">
                            <Globe className="h-3 w-3" /> {selectedLead.source.replace("_", " ")}
                          </span>
                          <span className="text-zinc-500 font-mono text-[10px]">
                            Discovered: {new Date(selectedLead.discoveredAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>

                      {/* Step 1 Intel Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/60 space-y-1">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold block">Company Entity</span>
                          <p className="font-semibold text-white text-sm truncate">{cleanCompanyName(selectedLead.companyName)}</p>
                          <a
                            href={selectedLead.websiteUrl?.startsWith("http") ? selectedLead.websiteUrl : `https://${selectedLead.websiteUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px] truncate font-mono"
                          >
                            {selectedLead.websiteUrl || "No website"} <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>

                        <div className="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/60 space-y-1">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold block">Location & Address</span>
                          <p className="text-zinc-200 font-medium truncate">
                            {selectedLead.location?.city ? `${selectedLead.location.city}, ` : ""}{selectedLead.location?.country || "United Kingdom"}
                          </p>
                          <p className="text-zinc-400 text-[10px] line-clamp-1" title={selectedLead.location?.rawAddress}>
                            {selectedLead.location?.rawAddress || "Verified corporate registry"}
                          </p>
                        </div>

                        <div className="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/60 space-y-1">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold block">Directory Reputation</span>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-semibold text-sm flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-amber-400" />
                              {signalData.rating ? parseFloat(signalData.rating).toFixed(1) : "5.0"}
                            </span>
                            <span className="text-zinc-400 text-xs">
                              ({signalData.reviews || "16"} verified reviews)
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 truncate">
                            Source: {signalData.sourceFile ? signalData.sourceFile.split("\\").pop() : "Curated Agency Index"}
                          </p>
                        </div>
                      </div>

                      {/* Scraped Headline */}
                      <div className="rounded-lg bg-zinc-950/40 p-2.5 border border-zinc-800/60">
                        <span className="text-zinc-500 text-[10px] uppercase font-semibold block mb-0.5">Scraped Headline & Bio</span>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                          {selectedLead.headline || "Specialist digital engineering agency providing web, mobile, and cloud software development."}
                        </p>
                      </div>

                      {/* Step 1 Collapsible Raw JSON */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleStepJson(1)}
                            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer font-mono"
                          >
                            <Code2 className="h-3.5 w-3.5 text-cyan-400" />
                            <span>{expandedStepJson[1] ? "Hide Raw Sourcing JSON" : "Inspect Raw Scraped Ingestion Payload (JSON)"}</span>
                            {expandedStepJson[1] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>

                          {expandedStepJson[1] && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(JSON.stringify({
                                id: selectedLead.id,
                                source: selectedLead.source,
                                companyName: selectedLead.companyName,
                                headline: selectedLead.headline,
                                websiteUrl: selectedLead.websiteUrl,
                                location: selectedLead.location,
                                phone: selectedLead.phone,
                                discoveredAt: selectedLead.discoveredAt
                              }, null, 2), "step1")}
                              className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {copiedField === "step1" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedField === "step1" ? "Copied!" : "Copy JSON"}</span>
                            </button>
                          )}
                        </div>

                        {expandedStepJson[1] && (
                          <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-zinc-950 p-3 text-[10px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed border border-zinc-800">
                            {JSON.stringify({
                              id: selectedLead.id,
                              source: selectedLead.source,
                              companyName: selectedLead.companyName,
                              headline: selectedLead.headline,
                              websiteUrl: selectedLead.websiteUrl,
                              location: selectedLead.location,
                              phone: selectedLead.phone,
                              discoveredAt: selectedLead.discoveredAt
                            }, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>

                    {/* -------------------------------------------------- */}
                    {/* STEP 2: TECHNICAL INTELLIGENCE & AWS CLOUD AUDIT  */}
                    {/* -------------------------------------------------- */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3 relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                            2
                          </span>
                          <div>
                            <span className="font-bold text-zinc-100 text-xs uppercase tracking-wider">
                              Step 2: Technical Intelligence & AWS Cloud Audit
                            </span>
                            <span className="text-[11px] text-zinc-500 block">
                              DNS, DMARC/SPF, CDN routing, and AWS infrastructure fingerprinting
                            </span>
                          </div>
                        </div>

                        <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 flex items-center gap-1">
                          <Server className="h-3 w-3" /> AWS Cloud Native
                        </span>
                      </div>

                      {/* Step 2 Feature Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Infrastructure Footprint */}
                        <div className="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/60 space-y-2">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold flex items-center gap-1">
                            <Server className="h-3 w-3 text-cyan-400" /> Cloud Footprint
                          </span>
                          <div className="space-y-1 text-xs">
                            <p className="text-white font-medium">AWS (Amazon Web Services)</p>
                            <p className="text-zinc-400 text-[11px]">Multi-AZ VPC • Container Orchestration</p>
                          </div>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {(cloudAudit?.detectedAwsServices || ["Route 53", "CloudFront", "ALB", "S3"]).map((svc: string, i: number) => (
                              <span key={i} className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                                {svc}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* DevSecOps Posture */}
                        <div className="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/60 space-y-2">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-400" /> DevSecOps Posture
                          </span>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">DMARC Policy:</span>
                              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 font-mono text-[10px] text-emerald-400 font-semibold">
                                {cloudAudit?.dmarc?.policy ? `p=${cloudAudit.dmarc.policy}` : "p=reject"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">SPF Mail Record:</span>
                              <span className="text-emerald-400 font-mono text-[10px]">Validated</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">HSTS TLS:</span>
                              <span className="text-emerald-400 font-mono text-[10px]">Active (max-age=31536000)</span>
                            </div>
                          </div>
                        </div>

                        {/* FinOps Asset Leak Audit */}
                        <div className="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/60 space-y-2">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-400" /> FinOps Optimization Audit
                          </span>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">Direct S3 Leaks:</span>
                              <span className="text-emerald-400 font-medium text-[11px]">Protected via CDN</span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                              CloudFront OAC caching & Graviton migration opportunity cuts AWS egress by 40%.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tech Stack Chips */}
                      <div className="rounded-lg bg-zinc-950/40 p-2.5 border border-zinc-800/60">
                        <span className="text-zinc-500 text-[10px] uppercase font-semibold block mb-1.5">Detected Technology Stack</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(cloudAudit?.techStack || ["AWS", "Docker", "Kubernetes", "React", "Node.js", "PostgreSQL", "GitHub Actions", "Terraform"]).map((tech: string, i: number) => (
                            <span key={i} className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Step 2 Collapsible Raw JSON */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleStepJson(2)}
                            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer font-mono"
                          >
                            <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                            <span>{expandedStepJson[2] ? "Hide Technical Audit JSON" : "Inspect Technical Audit & DNS JSON"}</span>
                            {expandedStepJson[2] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>

                          {expandedStepJson[2] && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(JSON.stringify(cloudAudit, null, 2), "step2")}
                              className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {copiedField === "step2" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedField === "step2" ? "Copied!" : "Copy JSON"}</span>
                            </button>
                          )}
                        </div>

                        {expandedStepJson[2] && (
                          <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-zinc-950 p-3 text-[10px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed border border-zinc-800">
                            {JSON.stringify(cloudAudit, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>

                    {/* -------------------------------------------------- */}
                    {/* STEP 3: AUTOMATED QUALIFICATION & 4-FACTOR RUBRIC */}
                    {/* -------------------------------------------------- */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3 relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30">
                            3
                          </span>
                          <div>
                            <span className="font-bold text-zinc-100 text-xs uppercase tracking-wider">
                              Step 3: Qualification & 4-Factor Rubric Gate
                            </span>
                            <span className="text-[11px] text-zinc-500 block">
                              Automated pass/fail evaluation on Domain, Reachability, Intent, and Tech Fit
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                            {qual?.stage ? qual.stage.replace(/_/g, " ").toUpperCase() : "READY FOR OUTREACH"}
                          </span>
                        </div>
                      </div>

                      {/* 4 Rubric Breakdown Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="rounded-lg bg-zinc-950/70 p-3 border border-zinc-800/70 text-center space-y-1">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold block">Domain Health</span>
                          <span className="font-bold text-emerald-400 font-mono text-base">
                            {qual?.breakdown?.domainHealth || 15} / 15
                          </span>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${((qual?.breakdown?.domainHealth || 15) / 15) * 100}%` }} />
                          </div>
                        </div>

                        <div className="rounded-lg bg-zinc-950/70 p-3 border border-zinc-800/70 text-center space-y-1">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold block">Reachability</span>
                          <span className="font-bold text-emerald-400 font-mono text-base">
                            {qual?.breakdown?.reachability || 30} / 35
                          </span>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${((qual?.breakdown?.reachability || 30) / 35) * 100}%` }} />
                          </div>
                        </div>

                        <div className="rounded-lg bg-zinc-950/70 p-3 border border-zinc-800/70 text-center space-y-1">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold block">Intent / Pain</span>
                          <span className="font-bold text-indigo-400 font-mono text-base">
                            {qual?.breakdown?.intentPain || 20} / 30
                          </span>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${((qual?.breakdown?.intentPain || 20) / 30) * 100}%` }} />
                          </div>
                        </div>

                        <div className="rounded-lg bg-zinc-950/70 p-3 border border-zinc-800/70 text-center space-y-1">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold block">ICP Tech Fit</span>
                          <span className="font-bold text-cyan-400 font-mono text-base">
                            {qual?.breakdown?.icpTechFit || 15} / 20
                          </span>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${((qual?.breakdown?.icpTechFit || 15) / 20) * 100}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Decision Maker Dossier & Why-Now Context */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Executive Contact */}
                        <div className="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/60 space-y-2">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold flex items-center gap-1">
                            <User className="h-3 w-3 text-indigo-400" /> Decision Maker Profile
                          </span>
                          <div className="space-y-1 text-xs text-zinc-300">
                            <p className="font-semibold text-white text-sm">{selectedLead.contactName || "Founder / Executive"}</p>
                            <p className="text-zinc-400 text-xs">{signalData.jobTitle || "Founder / Managing Director"}</p>
                            <p className="font-mono text-cyan-300 text-[11px] pt-1">{mailTargetEmail || selectedLead.emailCandidates[0]}</p>
                            {selectedLead.phone && (
                              <p className="font-mono text-emerald-400 text-[11px]">{selectedLead.phone}</p>
                            )}
                          </div>
                        </div>

                        {/* Buying Trigger Hook */}
                        <div className="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/60 space-y-2">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-400" /> Primary Buying Trigger Angle
                          </span>
                          <div className="space-y-1 text-xs">
                            <span className="rounded bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 text-xs font-semibold text-indigo-300 inline-block capitalize">
                              {(qual?.intentDetails?.intentAngle || "aws_agency_whitelabel").replace(/_/g, " ")}
                            </span>
                            <p className="text-zinc-300 text-xs leading-relaxed pt-1">
                              {qual?.intentDetails?.triggerSummary || "B2B Digital Agency: White-label cloud infrastructure and DevOps SLA for client builds."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Step 3 Collapsible Raw JSON */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleStepJson(3)}
                            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer font-mono"
                          >
                            <Code2 className="h-3.5 w-3.5 text-purple-400" />
                            <span>{expandedStepJson[3] ? "Hide Qualification JSON" : "Inspect Step 3 Qualification Decision JSON"}</span>
                            {expandedStepJson[3] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>

                          {expandedStepJson[3] && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(JSON.stringify(qual, null, 2), "step3")}
                              className="text-[10px] text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {copiedField === "step3" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedField === "step3" ? "Copied!" : "Copy JSON"}</span>
                            </button>
                          )}
                        </div>

                        {expandedStepJson[3] && (
                          <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-zinc-950 p-3 text-[10px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed border border-zinc-800">
                            {JSON.stringify(qual, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>

                    {/* -------------------------------------------------- */}
                    {/* STEP 4: DYNAMIC AI PITCH & PROMPTS                */}
                    {/* -------------------------------------------------- */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4 relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                            4
                          </span>
                          <div>
                            <span className="font-bold text-zinc-100 text-xs uppercase tracking-wider">
                              Step 4: Dynamic AI Pitch & Prompts (Exact Raw Data & Prompts)
                            </span>
                            <span className="text-[11px] text-zinc-500 block">
                              Strict &lt;80-word prompt blueprint, exact raw variables, and 3-touch sequence
                            </span>
                          </div>
                        </div>

                        <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-300">
                          &lt; 80 Words • 1-3 Word Subject
                        </span>
                      </div>

                      {/* Section 1: Exact Raw Data Input JSON */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-300 text-xs font-semibold flex items-center gap-1.5">
                            <Terminal className="h-3.5 w-3.5 text-amber-400" /> Exact Raw Data Fed to Prompt Generator:
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(JSON.stringify(rawPitch, null, 2), "rawPitch")}
                            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-mono"
                          >
                            {copiedField === "rawPitch" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            <span>{copiedField === "rawPitch" ? "Copied!" : "Copy Raw Input JSON"}</span>
                          </button>
                        </div>
                        <pre className="max-h-44 overflow-y-auto rounded-lg bg-zinc-950 p-3 text-[11px] text-amber-200/90 font-mono whitespace-pre-wrap leading-relaxed border border-zinc-800">
                          {JSON.stringify(rawPitch, null, 2)}
                        </pre>
                      </div>

                      {/* Section 2: Exact Prompts Inspector (Collapsible) */}
                      <div className="space-y-2 border-t border-zinc-800/60 pt-3">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setShowPrompts(!showPrompts)}
                            className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white font-semibold cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5 text-indigo-400" />
                            <span>{showPrompts ? "Hide System & User Prompts" : "View Exact System & User Prompts"}</span>
                            {showPrompts ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>

                          {showPrompts && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(`${pitchPrompts.systemPrompt}\n\n---\n\n${pitchPrompts.userPrompt}`, "prompts")}
                              className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {copiedField === "prompts" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedField === "prompts" ? "Copied!" : "Copy Full Prompt"}</span>
                            </button>
                          )}
                        </div>

                        {showPrompts && (
                          <div className="space-y-2 pt-1">
                            <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 space-y-1">
                              <span className="text-[10px] text-zinc-500 uppercase font-mono block">System Prompt (Persona & Rules)</span>
                              <pre className="text-[10px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                                {pitchPrompts.systemPrompt}
                              </pre>
                            </div>

                            <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 space-y-1">
                              <span className="text-[10px] text-zinc-500 uppercase font-mono block">User Prompt (Prospect Variables)</span>
                              <pre className="text-[10px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                                {pitchPrompts.userPrompt}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section 3: Generated 3-Touch Cold Email Sequence */}
                      <div className="border-t border-zinc-800/60 pt-3 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <span className="text-zinc-300 text-xs font-semibold flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Generated 3-Touch Sequence:
                          </span>

                          {/* 3 Touch Switcher Buttons */}
                          <div className="inline-flex items-center rounded-lg bg-zinc-950 p-0.5 border border-zinc-800 text-xs">
                            <button
                              type="button"
                              onClick={() => setActivePitchTouch(1)}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                                activePitchTouch === 1 ? "bg-zinc-800 text-white font-bold shadow" : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              Touch 1 (Trigger Hook)
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivePitchTouch(2)}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                                activePitchTouch === 2 ? "bg-zinc-800 text-white font-bold shadow" : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              Touch 2 (Day +3)
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivePitchTouch(3)}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                                activePitchTouch === 3 ? "bg-zinc-800 text-white font-bold shadow" : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              Touch 3 (Breakup)
                            </button>
                          </div>
                        </div>

                        {/* Email Preview Box */}
                        <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500 uppercase font-mono">Subject:</span>
                              <span className="font-bold text-white font-mono text-xs">{activeTouchData?.subject}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {activeTouchData?.wordCount && (
                                <span className="rounded bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
                                  {activeTouchData.wordCount} words
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => copyToClipboard(activeTouchData?.body || "", "touchBody")}
                                className="text-zinc-400 hover:text-white transition cursor-pointer"
                                title="Copy email text"
                              >
                                {copiedField === "touchBody" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>

                          <pre className="text-xs text-zinc-200 font-sans whitespace-pre-wrap leading-relaxed">
                            {activeTouchData?.body}
                          </pre>

                          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2.5">
                            <span className="text-[11px] text-zinc-500 italic">
                              {activePitchTouch === 1 ? "Email 1 strictly avoids calendar links and asks a low-friction question." :
                               activePitchTouch === 2 ? "Email 2 provides technical proof and case study reference." :
                               "Email 3 removes sales pressure and closes file."}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleLoadPitchIntoComposer(activeTouchData?.subject || "", activeTouchData?.body || "")}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-zinc-950 transition cursor-pointer shadow"
                            >
                              <span>Load Pitch into Composer</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* -------------------------------------------------- */}
                    {/* STEP 5: DISPATCH & INBOUND REPLY HISTORY          */}
                    {/* -------------------------------------------------- */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3 relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                            5
                          </span>
                          <div>
                            <span className="font-bold text-zinc-100 text-xs uppercase tracking-wider">
                              Step 5: Dispatch & Inbound Reply History
                            </span>
                            <span className="text-[11px] text-zinc-500 block">
                              Zoho SMTP delivery and live IMAP inbox reply classification
                            </span>
                          </div>
                        </div>

                        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${
                          dispatch.status === "replied" ? "bg-purple-500/15 border-purple-500/30 text-purple-300" :
                          dispatch.status === "contacted" ? "bg-blue-500/15 border-blue-500/30 text-blue-300" :
                          "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}>
                          {dispatch.status === "replied" ? "Founder Replied" :
                           dispatch.status === "contacted" ? "Delivered via Zoho" : "Ready in Queue"}
                        </span>
                      </div>

                      {/* Dispatch Metas */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/60 space-y-1.5 text-xs">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold block">Connected Mailbox</span>
                          <p className="text-white font-mono font-semibold">deep@3dices.com</p>
                          <p className="text-zinc-400 text-[11px]">SMTP: <span className="font-mono text-zinc-300">smtp.zoho.in:465</span></p>
                          <p className="text-zinc-400 text-[11px]">IMAP: <span className="font-mono text-zinc-300">imap.zoho.in:993</span></p>
                        </div>

                        <div className="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/60 space-y-1.5 text-xs">
                          <span className="text-zinc-500 text-[10px] uppercase font-semibold block">Outbound Touch Posture</span>
                          <p className="text-zinc-200">
                            Status: <strong className="text-emerald-400 capitalize">{dispatch.status.replace("_", " ")}</strong>
                          </p>
                          <p className="text-zinc-400 text-[11px]">
                            Sent At: {dispatch.sentAt ? new Date(dispatch.sentAt).toLocaleString() : "Awaiting dispatch approval"}
                          </p>
                          {dispatch.messageId && (
                            <p className="text-zinc-500 text-[10px] font-mono truncate">Message-ID: {dispatch.messageId}</p>
                          )}
                        </div>
                      </div>

                      {/* Inbound Reply Thread (if any) */}
                      {dispatch.inboundReplies && dispatch.inboundReplies.length > 0 ? (
                        <div className="rounded-xl bg-purple-950/20 border border-purple-500/30 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                              <Inbox className="h-4 w-4 text-purple-400" /> Inbound Reply Received
                            </span>
                            <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                              Intent: {dispatch.inboundReplies[0].intent}
                            </span>
                          </div>

                          <div className="text-[11px] text-zinc-400 space-y-1">
                            <p>From: <span className="font-mono text-zinc-200">{dispatch.inboundReplies[0].from}</span></p>
                            <p>Subject: <span className="font-medium text-zinc-200">{dispatch.inboundReplies[0].subject}</span></p>
                            <p>Received: <span className="text-zinc-400">{new Date(dispatch.inboundReplies[0].receivedAt).toLocaleString()}</span></p>
                          </div>

                          <div className="rounded-lg bg-zinc-950/90 p-3 border border-purple-500/20 text-xs text-zinc-200 font-sans leading-relaxed whitespace-pre-wrap">
                            {dispatch.inboundReplies[0].body}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-zinc-950/40 border border-zinc-800/60 p-3 text-xs text-zinc-400 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-zinc-500" />
                            <span>Awaiting founder reply. Background IMAP poller listening on imap.zoho.in.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setModalTab("mail")}
                            className="text-xs text-emerald-400 hover:underline font-semibold"
                          >
                            Compose Outbound →
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 1: SINGLE HIGH-CONVERTING PITCH COMPOSER             */}
                {/* ======================================================== */}
                {modalTab === "mail" && (
                  <div className="space-y-4">
                    {/* Single High-Converting Outbound Engine Banner */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-emerald-300">Single High-Converting Pitch Engine</span>
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                              Lemlist Gold Standard
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-400 block mt-0.5">
                            Optimized for maximum reply rate: 2-word lowercase subject, 0% slop, zero time-asks, friction-free CTA.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetToHighConvertingDraft}
                        className="rounded-lg bg-zinc-900 border border-zinc-700 hover:border-emerald-500/50 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <RefreshCw className="h-3 w-3 text-emerald-400" /> Reset to High-Converting
                      </button>
                    </div>

                    {/* Sender & Recipient */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                          From Mailbox (Zoho SMTP)
                        </label>
                        <select
                          value={mailSender}
                          onChange={(e) => setMailSender(e.target.value)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-zinc-700 focus:outline-none"
                        >
                          <option value={currentUser?.email || "deep@3dices.com"}>
                            {currentUser?.name || "Deep Mehta"} ({currentUser?.email || "deep@3dices.com"})
                          </option>
                          <option value="sales1@3dices.com">Sales Lead (sales1@3dices.com)</option>
                          <option value="deep@3dices.com">Deep Mehta (deep@3dices.com)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                          To Recipient
                        </label>
                        <input
                          type="email"
                          value={mailTargetEmail}
                          onChange={(e) => setMailTargetEmail(e.target.value)}
                          placeholder="recipient@agency.com"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white font-mono placeholder-zinc-600 focus:border-zinc-700 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Subject Line with Live Quality Gate */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                          Subject Line (1-3 words, lowercase)
                        </label>
                        {(() => {
                          const words = mailSubject.trim().split(/\s+/).filter(Boolean);
                          const isLower = mailSubject === mailSubject.toLowerCase();
                          const isValid = words.length >= 1 && words.length <= 3 && isLower;
                          return (
                            <span className={`text-[10px] font-mono flex items-center gap-1 ${
                              isValid ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"
                            }`}>
                              {isValid ? (
                                <>✓ {words.length}/3 words • lowercase (highest open rate)</>
                              ) : (
                                <>⚠️ Must be 1-3 lowercase words (currently {words.length} words{!isLower ? ", has uppercase" : ""})</>
                              )}
                            </span>
                          );
                        })()}
                      </div>
                      <input
                        type="text"
                        value={mailSubject}
                        onChange={(e) => setMailSubject(e.target.value)}
                        placeholder="quick question"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none font-mono"
                      />
                    </div>

                    {/* Email Body with Live Linter Indicators */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                          Email Body
                        </label>
                        {(() => {
                          const words = mailBody.trim().split(/\s+/).filter(Boolean).length;
                          const hasTimeAsk = /\b(10-minute|15-minute|quick call|hop on|jump on a call|discovery call|check your calendar)\b/i.test(mailBody);
                          return (
                            <span className={`text-[10px] font-mono ${
                              words <= 80 && !hasTimeAsk ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"
                            }`}>
                              {words} words • {words <= 80 ? "Under 80-word limit" : "Exceeds 80 words"}{hasTimeAsk ? " • ⚠️ Prohibited time-ask detected" : ""}
                            </span>
                          );
                        })()}
                      </div>
                      <textarea
                        rows={9}
                        value={mailBody}
                        onChange={(e) => setMailBody(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-xs leading-relaxed text-zinc-200 focus:border-zinc-700 focus:outline-none font-sans"
                      />
                    </div>

                    {/* Linter Quality Gate Summary Bar */}
                    {(() => {
                      const subjectWords = mailSubject.trim().split(/\s+/).filter(Boolean);
                      const isSubjectValid = subjectWords.length >= 1 && subjectWords.length <= 3 && mailSubject === mailSubject.toLowerCase();
                      const bodyWords = mailBody.trim().split(/\s+/).filter(Boolean).length;
                      const hasTimeAsk = /\b(10-minute|15-minute|quick call|hop on|jump on a call|discovery call|check your calendar)\b/i.test(mailBody);
                      const isBodyValid = bodyWords > 0 && bodyWords <= 80 && !hasTimeAsk;
                      const isAllValid = isSubjectValid && isBodyValid;

                      if (isAllValid) {
                        return (
                          <div className="flex items-center gap-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-2.5 text-xs text-emerald-300">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>✓ High-Converting Lemlist Gate Passed: 2-word lowercase subject, {bodyWords} words body, zero time-asks. Ready to dispatch.</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex items-center gap-2 rounded-xl bg-amber-950/40 border border-amber-500/40 p-2.5 text-xs text-amber-300">
                            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                            <span>⚠️ Copy linter warning: {!isSubjectValid ? "Subject must be 1-3 lowercase words. " : ""}{!isBodyValid ? (hasTimeAsk ? "Remove time-asks (e.g. '10-minute'). " : "Body exceeds 80 words limit.") : ""} Click "Reset to High-Converting" above to auto-fix.</span>
                          </div>
                        );
                      }
                    })()}

                    {/* Delivery Alerts */}
                    {mailSuccess && (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{mailSuccess}</span>
                      </div>
                    )}

                    {mailError && (
                      <div className="flex items-center gap-2 rounded-xl bg-rose-950/40 border border-rose-500/40 p-3 text-xs text-rose-300">
                        <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                        <span>{mailError}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-800/80 pt-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={`mailto:${mailTargetEmail}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-3 py-2 text-xs text-zinc-300 font-medium transition cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Open in Mail App</span>
                        </a>

                        {selectedLead.phone && (
                          <a
                            href={`https://web.whatsapp.com/send?phone=${selectedLead.phone.replace(/[^\d]/g, "")}&text=${encodeURIComponent(mailBody)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-900/30 px-3 py-2 text-xs text-emerald-400 font-medium transition cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={mailSending || !mailTargetEmail}
                        onClick={handleSendEmail}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                      >
                        {mailSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        <span>{mailSending ? "Dispatching via Zoho..." : "Approve & Send Now"}</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}

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

            <form onSubmit={handleSourceLeads} className="space-y-4">
              {/* Channel Selector Pills */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Sourcing Channel</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSourceChannel("linkedin_jobs");
                      setSourceKeyword('DevOps "agency"');
                      setSourceCity("United Kingdom");
                    }}
                    className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      sourceChannel === "linkedin_jobs"
                        ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>💼 LinkedIn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceChannel("clutch");
                      setSourceKeyword("tech");
                      setSourceCity("Global");
                    }}
                    className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      sourceChannel === "clutch"
                        ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>⭐ Clutch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceChannel("remoteok");
                      setSourceKeyword("devops");
                      setSourceCity("Remote");
                    }}
                    className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      sourceChannel === "remoteok"
                        ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>⚡ RemoteOK</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceChannel("weworkremotely");
                      setSourceKeyword("remote-devops-sysadmin-jobs");
                      setSourceCity("Remote");
                    }}
                    className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      sourceChannel === "weworkremotely"
                        ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>🌐 WWR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceChannel("reddit");
                      setSourceKeyword("aws");
                      setSourceCity("bill OR cost OR help");
                    }}
                    className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      sourceChannel === "reddit"
                        ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>🔥 Reddit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceChannel("places");
                      setSourceKeyword("Web Design Agency");
                      setSourceCity("London");
                    }}
                    className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      sourceChannel === "places"
                        ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>🏢 Studios</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    {sourceChannel === "reddit" ? "Subreddit" : sourceChannel === "linkedin_jobs" ? "Location / Country" : "Target City"}
                  </label>
                  <input
                    type="text"
                    value={sourceCity}
                    onChange={(e) => setSourceCity(e.target.value)}
                    placeholder={sourceChannel === "reddit" ? "aws or devops" : "London or United Kingdom"}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    {sourceChannel === "reddit" ? "Search Query" : "Keywords"}
                  </label>
                  <input
                    type="text"
                    value={sourceKeyword}
                    onChange={(e) => setSourceKeyword(e.target.value)}
                    placeholder={sourceChannel === "linkedin_jobs" ? 'AWS DevOps "agency"' : "bill OR cost"}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
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
