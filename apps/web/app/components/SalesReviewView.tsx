"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Sparkles,
  Send,
  RefreshCw,
  Globe,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Cpu,
  Mail,
  User,
  Zap,
  Check,
  Clock,
  Layers,
  ArrowRight,
  Play
} from "lucide-react";

export interface StoredLead {
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

interface SalesReviewViewProps {
  currentUser?: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
  leads: StoredLead[];
  onLeadsUpdated: () => Promise<void>;
}

export function SalesReviewView({ currentUser, leads, onLeadsUpdated }: SalesReviewViewProps) {
  // Filter leads ready for sales review (Stage 'researched' or with pre-generated draft)
  const readyLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.stage === "contacted" || l.stage === "replied") return false;
      const hasDraft = !!(l.signalData as any)?.draftEmail;
      return l.stage === "researched" || hasDraft;
    });
  }, [leads]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentLead = readyLeads[currentIndex] || null;

  // Editable email state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState(currentUser?.email || "deep@3dices.com");

  // Status feedback
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Re-generating pitch state
  const [regenerating, setRegenerating] = useState(false);

  // Background pipeline engine runner state
  const [processingBatch, setProcessingBatch] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState<string | null>(null);

  // Synchronize form when selected lead changes
  useEffect(() => {
    if (currentLead) {
      const draft = (currentLead.signalData as any)?.draftEmail;
      const dossier = (currentLead.signalData as any)?.dossier;

      const initialSubject =
        draft?.subject ||
        dossier?.recommendedOutreach?.tailoredSubject ||
        `Question regarding ${currentLead.companyName}'s cloud infrastructure`;

      const initialBody =
        draft?.body ||
        currentLead.notes ||
        dossier?.recommendedOutreach?.tailoredBody ||
        `Hi there,\n\nI was reviewing ${currentLead.companyName}'s infrastructure and noticed your engineering team is actively scaling.\n\nAt 3 Dices, we partner with technical founders to eliminate backend bottlenecks, automate CI/CD release pipelines, and cut AWS spend—routinely reducing monthly cloud bills by ~40%.\n\nWould you be open to a quick 10-minute call this Thursday to see if there are easy wins for your team?\n\nBest regards,\n${currentUser?.name || "Deep Mehta"}\nAWS Certified Solutions Architect – Professional | Founder, 3 Dices`;

      const initialEmail =
        draft?.targetEmail ||
        currentLead.emailCandidates[0] ||
        dossier?.decisionMaker?.email ||
        "";

      setSubject(initialSubject);
      setBody(initialBody);
      setTargetEmail(initialEmail);
      setSendSuccess(null);
      setSendError(null);
    }
  }, [currentLead, currentUser]);

  // Word count and basic ASD-STE100 metrics
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const containsCorporateSlop = useMemo(() => {
    const slopWords = ["synergy", "paradigm", "cutting-edge", "game-changer", "revolutionary", "best-in-class"];
    return slopWords.filter((w) => body.toLowerCase().includes(w));
  }, [body]);

  // Send Approved Email
  const handleSendEmail = async () => {
    if (!currentLead || !targetEmail.trim() || !subject.trim() || !body.trim() || sending) return;

    setSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const res = await fetch("/api/outbound/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: targetEmail.trim(),
          subject: subject.trim(),
          body: body.trim(),
          senderEmail: senderEmail.trim(),
          senderName: currentUser?.name || "Deep Mehta",
          leadId: currentLead.id
        })
      });

      const data = await res.json();
      if (data.success) {
        setSendSuccess(
          `Dispatched to ${targetEmail} (Receipt: ${data.receipt?.messageId || data.receipt?.receiptId || "OK"})`
        );
        await onLeadsUpdated();
        // Advance to next lead after short pause
        setTimeout(() => {
          if (currentIndex < readyLeads.length - 1) {
            setCurrentIndex((prev) => prev + 1);
          }
          setSendSuccess(null);
        }, 1500);
      } else {
        setSendError(data.error || "Failed to dispatch email.");
      }
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  // Re-generate pitch angle
  const handleRegenerate = async () => {
    if (!currentLead || regenerating) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/research`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.lead) {
        const pitchText = data.dossier?.recommendedOutreach?.tailoredBody || data.dossier?.suggestedAngle;
        const pitchSub = data.dossier?.recommendedOutreach?.tailoredSubject;
        if (pitchSub) setSubject(pitchSub);
        if (pitchText) setBody(pitchText);
        await onLeadsUpdated();
      }
    } catch (err) {
      console.error("Regenerate failed:", err);
    } finally {
      setRegenerating(false);
    }
  };

  // Run continuous engine to enrich next batch
  const handleRunEngineBatch = async () => {
    setProcessingBatch(true);
    setBatchSuccess(null);
    try {
      const res = await fetch("/api/pipeline/auto-process?limit=10", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setBatchSuccess(
          `Processed ${data.processedCount} leads: ${data.readyForSalesCount} validated & ready for review!`
        );
        await onLeadsUpdated();
        setTimeout(() => setBatchSuccess(null), 4000);
      }
    } catch (err) {
      console.error("Engine batch error:", err);
    } finally {
      setProcessingBatch(false);
    }
  };

  const dossier = (currentLead?.signalData as any)?.dossier;
  const techStack = dossier?.company?.techStack || (currentLead?.signalData as any)?.techStack || ["AWS", "Cloud Infrastructure"];

  return (
    <div className="space-y-6">
      {/* Top Banner & Pipeline Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Sales Outreach Command Center</h2>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                {readyLeads.length} Ready for Review
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Every lead here has a verified mailbox, deep company research, and an AI-tailored pitch ready for your approval.
            </p>
          </div>
        </div>

        {/* Engine Runner & Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunEngineBatch}
            disabled={processingBatch}
            title="Automatically run SMTP verification and AI research on next 10 unprocessed leads"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition shadow-sm disabled:opacity-40"
          >
            <Play className={`h-3.5 w-3.5 text-emerald-400 ${processingBatch ? "animate-spin" : ""}`} />
            {processingBatch ? "Enriching Next Batch..." : "Auto-Enrich Leads (+10)"}
          </button>

          {readyLeads.length > 0 && (
            <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition disabled:opacity-30"
                title="Previous Lead"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-zinc-400 px-1 font-mono">
                {currentIndex + 1} / {readyLeads.length}
              </span>
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(readyLeads.length - 1, prev + 1))}
                disabled={currentIndex >= readyLeads.length - 1}
                className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition disabled:opacity-30"
                title="Next Lead"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {batchSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{batchSuccess}</span>
        </div>
      )}

      {/* Main Review Workspace */}
      {readyLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 py-20 text-center px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 mb-4">
            <Clock className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No Leads Pending Sales Review</h3>
          <p className="text-xs text-zinc-400 max-w-md mt-1 mb-5">
            All researched leads have been dispatched or reviewed. Click below to have the continuous engine verify and research new leads from your database.
          </p>
          <button
            onClick={handleRunEngineBatch}
            disabled={processingBatch}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition"
          >
            <Play className={`h-3.5 w-3.5 text-emerald-600 ${processingBatch ? "animate-spin" : ""}`} />
            {processingBatch ? "Processing Leads..." : "Enrich & Verify Next 10 Leads"}
          </button>
        </div>
      ) : currentLead ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: Lead Dossier & Deep Context (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{currentLead.companyName}</h3>
                  {currentLead.headline && (
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{currentLead.headline}</p>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                    Score: {currentLead.score}/100
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 capitalize">{currentLead.source}</span>
                </div>
              </div>

              {/* Website & Location */}
              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center gap-1.5 truncate">
                  <Globe className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  {currentLead.websiteUrl ? (
                    <a
                      href={currentLead.websiteUrl.startsWith("http") ? currentLead.websiteUrl : `https://${currentLead.websiteUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline truncate inline-flex items-center gap-1"
                    >
                      {currentLead.websiteUrl.replace(/^https?:\/\//, "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-zinc-500">No website URL</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span>
                    {[currentLead.location?.city, currentLead.location?.country].filter(Boolean).join(", ") || "Global"}
                  </span>
                </div>
              </div>

              {/* Decision Maker & Verification Status */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Verified Contact
                  </span>
                  <span className="flex items-center gap-1 rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800/40">
                    <ShieldCheck className="h-3 w-3" />
                    SMTP Validated
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 text-xs font-semibold">
                    {(currentLead.contactName || "D")[0]}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">
                      {currentLead.contactName || dossier?.decisionMaker?.fullName || "Engineering Leader"}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {dossier?.decisionMaker?.role || "Founder / CTO / VP Engineering"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900/60 rounded px-2.5 py-1.5 font-mono">
                  <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{targetEmail || currentLead.emailCandidates[0] || "No email"}</span>
                </div>
              </div>

              {/* Detected Tech Stack & Cloud Signals */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Detected Infrastructure & Signals
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {techStack.map((tech: string, i: number) => (
                    <span
                      key={i}
                      className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Strategic Pitch Angle */}
              <div className="rounded-lg border border-indigo-950/60 bg-indigo-950/20 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                  <Zap className="h-3.5 w-3.5" />
                  Recommended Angle
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {(currentLead.signalData as any)?.draftEmail?.angle ||
                    dossier?.recommendedOutreach?.selectedPlay ||
                    "Complimentary 30-Minute AWS Architecture & Cost Leak Audit for Scaling Technical Founders."}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Interactive Email Studio & Dispatch (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div>
                  <h3 className="text-sm font-semibold text-white">Review & Edit Outreach Email</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Personalized draft generated for {currentLead.contactName || currentLead.companyName}.
                  </p>
                </div>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                  title="Re-run AI to craft a different strategic hook"
                >
                  <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin text-indigo-400" : ""}`} />
                  {regenerating ? "Re-crafting..." : "Re-roll Angle"}
                </button>
              </div>

              {/* Sender & Target Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Send As</label>
                  <input
                    type="text"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-zinc-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">To Verified Recipient</label>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-zinc-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Subject Line */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white focus:border-zinc-700 focus:outline-none"
                />
              </div>

              {/* Body Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-zinc-400">Email Body (Markdown / Plain Text)</label>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {wordCount} words {wordCount > 130 ? "⚠️ (Keep under 125 words)" : "✓ (Concise)"}
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-200 font-sans focus:border-zinc-700 focus:outline-none"
                />
              </div>

              {/* Quality & Deliverability Check Alert */}
              {containsCorporateSlop.length > 0 && (
                <div className="flex items-center gap-2 rounded bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Detected buzzwords: <strong>{containsCorporateSlop.join(", ")}</strong>. Consider rewording for a more natural tone.
                  </span>
                </div>
              )}

              {sendError && (
                <div className="flex items-center gap-2 rounded bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              {sendSuccess && (
                <div className="flex items-center gap-2 rounded bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{sendSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(readyLeads.length - 1, prev + 1))}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                >
                  Skip to Next Lead →
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={sending || !targetEmail.trim()}
                    onClick={handleSendEmail}
                    className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-5 py-2 text-xs font-semibold text-zinc-950 transition shadow-lg shadow-emerald-950/20 disabled:opacity-40"
                  >
                    {sending ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {sending ? "Dispatching..." : "Approve & Send Email"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
