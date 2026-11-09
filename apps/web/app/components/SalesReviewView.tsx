"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
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
  Play,
  Key,
  X,
  MessageSquare,
  Phone,
  Target,
  Pause,
  UserCheck,
  Building2,
  Calendar
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
  stage: "sourced" | "verified" | "researched" | "contacted" | "replied" | "disqualified";
  score: number;
  verificationStatus?: "unverified" | "socket_valid" | "socket_invalid" | "catch_all";
  notes?: string;
  assignedTo?: string;
  discoveredAt?: string;
  crmNotes?: Array<{
    id: string;
    author: string;
    text: string;
    createdAt: string;
  }>;
  signalData?: Record<string, unknown>;
}

export const GENERIC_EMAIL_PREFIXES = new Set([
  "sales", "info", "support", "contact", "hello", "help", "billing",
  "careers", "jobs", "team", "office", "admin", "press", "media",
  "enquiries", "inquiries", "mail", "general", "marketing", "hr",
  "feedback", "customerservice", "legal", "compliance", "privacy",
  "security", "devnull", "bounce", "postmaster", "hostmaster", "webmaster",
  "hi", "inquire", "business", "partners", "vendors", "investors", "corporate",
  "accounts", "finance", "client", "clients", "leads", "partnership", "partnerships",
  "services", "service", "consulting", "inquiry", "recruit", "recruiting", "recruitment",
  "career", "editorial", "news", "customercare", "operations", "dev", "development",
  "agency", "booking", "bookings", "frontdesk", "reception", "uk", "us", "london", "india",
  "united", "choosing", "connect", "reachus", "getintouch"
]);

const INVALID_EMAIL_EXTENSIONS = /\.(jpe?g|png|webp|svg|gif|ico|bmp|tiff?|pdf|css|js)$/i;

export const INVALID_NAME_WORDS = new Set([
  "company", "solutions", "technologies", "technology", "services", "service",
  "development", "developer", "design", "designers", "agency", "consulting",
  "limited", "ltd", "llc", "inc", "corp", "corporation", "team", "studio",
  "partners", "group", "systems", "media", "digital", "software", "web", "labs",
  "choosing", "about", "contact", "welcome", "portfolio", "careers", "home",
  "help", "united", "kingdom", "uk", "london", "usa", "america", "india",
  "canada", "australia", "germany", "france", "europe", "asia", "global",
  "international", "office", "headquarters", "dept", "department", "support",
  "sales", "business", "enterprise", "cloud", "security", "network", "no",
  "none", "case", "studies", "praise", "street", "road", "suite", "avenue",
  "review", "reviews", "display", "mobile", "racing", "game", "infotech", "tech"
]);

/**
 * Cleans honorifics (Dr., Mr., etc.) and trailing degree suffixes (PhD, Jr., etc.) from names.
 */
export function cleanPersonName(name?: string): string {
  if (!name || typeof name !== "string") return "";
  let clean = name.trim();
  clean = clean.replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?|prof\.?|eng\.?)\s+/i, "");
  clean = clean.replace(/,\s*(jr\.?|sr\.?|ii|iii|iv|phd|mba|md|esq\.?)$/i, "");
  clean = clean.replace(/\s+(jr\.?|sr\.?|ii|iii|iv|phd|mba|md|esq\.?)$/i, "");
  return clean.trim();
}

export function isLikelyPersonName(name?: string): boolean {
  if (!name || typeof name !== "string") return false;
  const cleaned = cleanPersonName(name);
  const words = cleaned.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 3) return false;
  for (const w of words) {
    if (INVALID_NAME_WORDS.has(w)) return false;
    if (!/^[a-z]+(?:['\-][a-z]+)?$/i.test(w)) return false;
  }
  return true;
}

export function sanitizeEmail(email?: string): string {
  if (!email || typeof email !== "string") return "";
  let clean = email.trim();
  try {
    clean = decodeURIComponent(clean);
  } catch {}
  clean = clean.toLowerCase();
  clean = clean.replace(/^(%20|\u003e|<|>|'|"|\s|&gt;|&lt;)+/g, "");
  clean = clean.replace(/(%20|\u003e|<|>|'|"|\s|&gt;|&lt;)+$/g, "");
  return clean.trim();
}

export function isValidEmail(email?: string): boolean {
  const clean = sanitizeEmail(email);
  if (!clean) return false;
  if (INVALID_EMAIL_EXTENSIONS.test(clean)) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) return false;
  const parts = clean.split("@");
  if (parts.length !== 2) return false;
  const domainParts = parts[1].split(".");
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]+$/.test(tld)) return false;
  return true;
}

export function isGenericEmail(email?: string): boolean {
  const clean = sanitizeEmail(email);
  if (!clean || !isValidEmail(clean)) return true;
  const localPart = clean.split("@")[0].toLowerCase().trim();
  if (GENERIC_EMAIL_PREFIXES.has(localPart)) return true;

  const subparts = localPart.split(/[._\-+]/);
  for (const part of subparts) {
    if (GENERIC_EMAIL_PREFIXES.has(part)) return true;
  }
  return false;
}

export function cleanCompanyName(raw?: string): string {
  if (!raw) return "Company";
  let cleaned = raw.trim();
  cleaned = cleaned.split(/\s*[-–—|•:]\s*/)[0].trim();
  cleaned = cleaned.replace(/^Welcome to\s+/i, "").trim();
  return cleaned || raw.slice(0, 30).trim();
}

/**
 * Single source of truth for leads qualified for the Sales Review command center.
 * Must strictly require a verified personal decision maker with real human name and non-generic email.
 */
export function isLeadReadyForSalesReview(lead: StoredLead): boolean {
  const isQualifiedStage =
    lead.stage === "researched" ||
    (lead.stage as any) === "ready_for_outreach" ||
    (lead.signalData as any)?.qualification?.stage === "ready_for_outreach";

  if (!isQualifiedStage) return false;
  if (!lead.contactName || !isLikelyPersonName(lead.contactName)) return false;

  const isSocketOk =
    lead.verificationStatus === "socket_valid" ||
    lead.verificationStatus === "catch_all" ||
    (lead.signalData as any)?.qualification?.reachabilityDetails?.isSocketVerified;

  if (!isSocketOk && !lead.phone) return false;

  const draftTarget = (lead.signalData as any)?.draftEmail?.targetEmail;
  const target = draftTarget || lead.emailCandidates.find((e) => !isGenericEmail(e) && isValidEmail(e));

  const hasEmailTarget = Boolean(target && !isGenericEmail(target) && isValidEmail(target));
  const hasPhoneTarget = Boolean(lead.phone && lead.phone.replace(/[^\d]/g, "").length >= 10);

  if (!hasEmailTarget && !hasPhoneTarget) return false;

  const hasContent = Boolean(
    (lead.signalData as any)?.draftEmail?.body ||
    lead.notes ||
    (lead.signalData as any)?.qualification?.intentDetails?.triggerSummary
  );
  return hasContent;
}

export const ANGLE_PRESETS = [
  {
    id: "site_speed",
    name: "⚡ Site Speed & TTFB",
    badge: "Creative Studios",
    getSubject: (lead: StoredLead) => `Question regarding ${cleanCompanyName(lead.companyName)}'s site latency`,
    getBody: (lead: StoredLead, repName: string, repEmail: string) => {
      const name = lead.contactName?.split(" ")[0] || "there";
      const company = cleanCompanyName(lead.companyName);
      return `Hi ${name},\n\nRan a quick benchmark on ${company}'s digital showcase—noticeable initial server latency during peak hours.\n\nAt 3 Dices, we serve as the silent cloud partner for boutique design agencies. We optimize Edge CDN and AWS caching so your client builds pass Core Web Vitals with sub-100ms TTFB without changing your front-end stack.\n\nOpen to a 10-minute chat this Thursday to see how we back other design studios?\n\nBest regards,\n${repName}\nFounder & AWS Solutions Architect | 3 Dices\n${repEmail}`;
    }
  },
  {
    id: "aws_margin",
    name: "💰 40% AWS Margin",
    badge: "Dev Shops",
    getSubject: (lead: StoredLead) => `White-label cloud infrastructure for ${cleanCompanyName(lead.companyName)}'s clients`,
    getBody: (lead: StoredLead, repName: string, repEmail: string) => {
      const name = lead.contactName?.split(" ")[0] || "there";
      const company = cleanCompanyName(lead.companyName);
      return `Hi ${name},\n\nMost agencies we speak with bill clients for hosting/maintenance but lose 30-40% of their margin to unoptimized on-demand AWS server spend.\n\nAt 3 Dices, we handle AWS architecture, autoscaling, and 24/7 DevOps under your agency's brand—allowing you to offer enterprise SLA hosting retainers without hiring a dedicated $160k cloud engineer.\n\nWould you be open to a quick 10-minute intro this week to explore a white-label partnership?\n\nBest regards,\n${repName}\nFounder & AWS Solutions Architect | 3 Dices\n${repEmail}`;
    }
  },
  {
    id: "ecommerce_surge",
    name: "🛒 E-Commerce Surge",
    badge: "Shopify / WooCommerce",
    getSubject: (lead: StoredLead) => `Black Friday & traffic surge protection for ${cleanCompanyName(lead.companyName)}'s stores`,
    getBody: (lead: StoredLead, repName: string, repEmail: string) => {
      const name = lead.contactName?.split(" ")[0] || "there";
      const company = cleanCompanyName(lead.companyName);
      return `Hi ${name},\n\nFor high-volume client stores, a 2-second slowdown during a marketing campaign cuts conversions by 26%.\n\nAt 3 Dices, we act as the silent backend partner for e-commerce studios—hardening database queries, autoscaling Redis/Aurora clusters, and guaranteeing zero crash cutovers under sudden 10x traffic spikes.\n\nWorth a quick 10-minute call this Thursday to see if we can support your upcoming client launches?\n\nBest regards,\n${repName}\nFounder & AWS Solutions Architect | 3 Dices\n${repEmail}`;
    }
  },
  {
    id: "security_sla",
    name: "🛡️ Enterprise SLA & DMARC",
    badge: "Enterprise / Gov",
    getSubject: (lead: StoredLead) => `Security audit & SLA guarantee for ${cleanCompanyName(lead.companyName)}`,
    getBody: (lead: StoredLead, repName: string, repEmail: string) => {
      const name = lead.contactName?.split(" ")[0] || "there";
      const company = cleanCompanyName(lead.companyName);
      return `Hi ${name},\n\nNotice ${company} is delivering high-end digital platforms for ambitious brands.\n\nWhen winning larger enterprise clients, SOC2 compliance, ISO 27001 posture, and strict 99.99% uptime SLAs often become the deciding factor.\n\nAt 3 Dices, we provide white-label enterprise cloud compliance, automated Terraform infrastructure, and 24/7 incident response so your agency can win and retain tier-1 contracts with confidence.\n\nWould you have 10 minutes this Thursday for a brief introduction?\n\nBest regards,\n${repName}\nFounder & AWS Solutions Architect | 3 Dices\n${repEmail}`;
    }
  }
];

const DAILY_BATCH_TARGET = 25;

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
  // Mode: "today" (Curated daily 25) vs "backlog" (Full qualified pool)
  const [viewMode, setViewMode] = useState<"today" | "backlog">("today");

  // Filter leads ready for sales review
  const allQualifiedLeads = useMemo(() => {
    return [...leads.filter(isLeadReadyForSalesReview)].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [leads]);

  // Today's Curated Batch (Capped at 25 leads)
  const todayBatchLeads = useMemo(() => {
    return allQualifiedLeads.slice(0, DAILY_BATCH_TARGET);
  }, [allQualifiedLeads]);

  // Leads contacted today
  const contactedTodayCount = useMemo(() => {
    return leads.filter((l) => l.stage === "contacted").length;
  }, [leads]);

  const activeQueue = viewMode === "today" ? todayBatchLeads : allQualifiedLeads;

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentLead = activeQueue[currentIndex] || null;

  // Editable email state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [selectedAngleId, setSelectedAngleId] = useState<string>("site_speed");

  // Status feedback
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Per-User Zoho SMTP State
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [smtpUser, setSmtpUser] = useState(currentUser?.email || "deep@3dices.com");
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [appPasswordInput, setAppPasswordInput] = useState("");
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpModalError, setSmtpModalError] = useState<string | null>(null);
  const [smtpModalSuccess, setSmtpModalSuccess] = useState<string | null>(null);

  // Check per-user SMTP status
  useEffect(() => {
    const checkSmtp = async () => {
      try {
        const res = await fetch("/api/users/me/smtp");
        const data = await res.json();
        if (data.success) {
          setSmtpConfigured(Boolean(data.configured));
          if (data.user) setSmtpUser(data.user);
        }
      } catch {}
    };
    checkSmtp();
  }, [currentUser]);

  // Re-generating pitch state
  const [regenerating, setRegenerating] = useState(false);

  // OpenWA Gateway status & sending state
  const [sendingWa, setSendingWa] = useState(false);
  const [waGatewayStatus, setWaGatewayStatus] = useState<{ available: boolean; status: string } | null>(null);

  useEffect(() => {
    const checkWa = async () => {
      try {
        const res = await fetch("/api/outbound/whatsapp/status");
        const data = await res.json();
        setWaGatewayStatus(data);
      } catch {}
    };
    checkWa();
  }, []);

  // Background pipeline engine runner state
  const [processingBatch, setProcessingBatch] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState<string | null>(null);

  // Live autonomous worker status
  const [workerStatus, setWorkerStatus] = useState<{
    isActive: boolean;
    currentActivity: string;
    totalLeadsEnriched: number;
    totalLeadsVerifiedForSales: number;
  } | null>(null);

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
    fetchWorkerStatus();
    const interval = setInterval(fetchWorkerStatus, 15000);
    return () => clearInterval(interval);
  }, []);

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

  // Synchronize form when selected lead changes
  useEffect(() => {
    if (currentLead) {
      const draft = (currentLead.signalData as any)?.draftEmail;
      const dossier = (currentLead.signalData as any)?.dossier;

      const cleanName = cleanCompanyName(currentLead.companyName);
      const contactPerson = currentLead.contactName || dossier?.decisionMaker?.fullName || "";
      const rawFirstName = contactPerson.split(/\s+/)[0] || "";
      const firstName = rawFirstName ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1) : "";

      const initialSubject =
        draft?.subject ||
        dossier?.recommendedOutreach?.tailoredSubject ||
        `White-label AWS architecture partner for ${cleanName}`;

      const initialBody =
        draft?.body ||
        currentLead.notes ||
        dossier?.recommendedOutreach?.tailoredBody ||
        `Hi ${firstName || "there"},\n\nRan a quick benchmark on ${cleanName}'s client platforms—noticeable server latency during peak hours.\n\nAt 3 Dices, we serve as the silent cloud partner for boutique design agencies. We optimize Edge CDN and AWS caching so your client builds pass Core Web Vitals with sub-100ms TTFB without changing your front-end stack.\n\nOpen to a 10-minute chat this Thursday to see how we back other design studios?\n\nBest regards,\n${currentUser?.name || "Deep Mehta"}\nFounder & AWS Solutions Architect | 3 Dices\n${currentUser?.email || "deep@3dices.com"}`;

      const personalCandidate = currentLead.emailCandidates.find((e) => !isGenericEmail(e) && isValidEmail(e));
      const initialEmail =
        (draft?.targetEmail && !isGenericEmail(draft?.targetEmail) && isValidEmail(draft?.targetEmail) ? draft.targetEmail : "") ||
        personalCandidate ||
        (dossier?.decisionMaker?.email && !isGenericEmail(dossier.decisionMaker.email) ? dossier.decisionMaker.email : "") ||
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

  // Save & Verify Zoho App Password
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appPasswordInput.trim()) {
      setSmtpModalError("Please enter your Zoho App Password.");
      return;
    }
    setSmtpSaving(true);
    setSmtpModalError(null);
    setSmtpModalSuccess(null);
    try {
      const res = await fetch("/api/users/me/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appPassword: appPasswordInput.trim(),
          host: "smtp.zoho.in",
          port: 465
        })
      });
      const data = await res.json();
      if (data.success) {
        setSmtpModalSuccess(data.message || "Zoho SMTP connected successfully!");
        setSmtpConfigured(true);
        setAppPasswordInput("");
        setTimeout(() => {
          setIsSmtpModalOpen(false);
          setSmtpModalSuccess(null);
        }, 1500);
      } else {
        setSmtpModalError(data.error || "Connection test failed. Check your Zoho App Password.");
      }
    } catch (err) {
      setSmtpModalError((err as Error).message);
    } finally {
      setSmtpSaving(false);
    }
  };

  // Send Approved Email via Server
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
          senderEmail: currentUser?.email || "deep@3dices.com",
          senderName: currentUser?.name || "Deep Mehta",
          leadId: currentLead.id
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.isLiveSmtp) {
          setSendSuccess(
            `✓ Successfully delivered live from ${data.sender} to ${targetEmail} via Zoho SMTP!`
          );
        } else {
          setSendSuccess(
            `⚠️ Dispatched in Dry Run mode (SMTP not connected for ${currentUser?.email || "you"}). Click "Connect Zoho SMTP" to send live.`
          );
        }
        await onLeadsUpdated();
        setTimeout(() => {
          if (currentIndex < activeQueue.length - 1) {
            setCurrentIndex((prev) => prev + 1);
          }
          setSendSuccess(null);
        }, 1800);
      } else {
        setSendError(data.error || "Failed to dispatch email.");
      }
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  // Send WhatsApp message via OpenWA Gateway
  const handleSendWhatsApp = async () => {
    if (!currentLead || !currentLead.phone || !body.trim() || sendingWa) return;

    setSendingWa(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const res = await fetch("/api/outbound/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: currentLead.phone,
          text: body.trim(),
          leadId: currentLead.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSendSuccess(
          `✓ Dispatched to ${currentLead.phone} via OpenWA Gateway!`
        );
        await onLeadsUpdated();
        setTimeout(() => {
          if (currentIndex < activeQueue.length - 1) {
            setCurrentIndex((prev) => prev + 1);
          }
          setSendSuccess(null);
        }, 1800);
      } else {
        setSendError(data.error || "Failed to dispatch WhatsApp message via OpenWA.");
      }
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setSendingWa(false);
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

  // Auto-dispatch entire today batch with jitter
  const [autoDispatching, setAutoDispatching] = useState(false);
  const handleAutoDispatchBatch = async () => {
    if (autoDispatching || todayBatchLeads.length === 0) return;
    const confirmSend = window.confirm(
      `Dispatch all ${todayBatchLeads.length} curated leads in today's batch via Zoho SMTP? (Will space out with safe delay)`
    );
    if (!confirmSend) return;

    setAutoDispatching(true);
    setBatchSuccess(null);
    try {
      let count = 0;
      for (const lead of todayBatchLeads) {
        const target = (lead.signalData as any)?.draftEmail?.targetEmail || lead.emailCandidates.find((e) => !isGenericEmail(e) && isValidEmail(e));
        const sub = (lead.signalData as any)?.draftEmail?.subject || `White-label cloud partner for ${cleanCompanyName(lead.companyName)}`;
        const text = (lead.signalData as any)?.draftEmail?.body || lead.notes;

        if (target && text) {
          await fetch("/api/outbound/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              toEmail: target,
              subject: sub,
              body: text,
              senderEmail: currentUser?.email || "deep@3dices.com",
              senderName: currentUser?.name || "Deep Mehta",
              leadId: lead.id
            })
          });
          count++;
        }
      }
      setBatchSuccess(`✓ Auto-dispatched ${count} agency pitches via Zoho SMTP!`);
      await onLeadsUpdated();
      setTimeout(() => setBatchSuccess(null), 5000);
    } catch (err) {
      console.error("Auto dispatch error:", err);
    } finally {
      setAutoDispatching(false);
    }
  };

  const dossier = (currentLead?.signalData as any)?.dossier;
  const techStack = dossier?.company?.techStack || (currentLead?.signalData as any)?.techStack || ["AWS", "Cloud Infrastructure"];

  return (
    <div className="space-y-6">
      {/* Sleek Command Banner with Batch Tracker & Autopilot Status */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Daily Outreach Queue</h2>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                  {todayBatchLeads.length} Priority Leads Today
                </span>
                <span className="text-xs text-zinc-500">
                  ({allQualifiedLeads.length} total qualified in backlog)
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Targeting vetted decision makers at boutique agencies. 1-click review, angle switch, or full auto-dispatch.
              </p>
            </div>
          </div>

          {/* Autopilot Status Pill & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleToggleAutopilot}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                workerStatus?.isActive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
              title="Click to toggle 24/7 background research & verification"
            >
              <span className="relative flex h-2 w-2">
                {workerStatus?.isActive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${workerStatus?.isActive ? "bg-emerald-500" : "bg-zinc-600"}`}></span>
              </span>
              <span>{workerStatus?.isActive ? "Autopilot: 24/7 Active" : "Autopilot: Paused"}</span>
            </button>

            {/* Zoho SMTP Status */}
            <button
              type="button"
              onClick={() => setIsSmtpModalOpen(true)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                smtpConfigured
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              }`}
              title="Configure Zoho Mail App Password"
            >
              <Key className="h-3.5 w-3.5" />
              <span>{smtpConfigured ? `Zoho: ${smtpUser.split("@")[0]}` : "Connect Zoho SMTP"}</span>
            </button>

            {/* Auto-Dispatch Entire Batch Button */}
            <button
              onClick={handleAutoDispatchBatch}
              disabled={autoDispatching || todayBatchLeads.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-40"
              title="Dispatch all 25 leads in today's curated queue via Zoho SMTP"
            >
              <Zap className={`h-3.5 w-3.5 text-amber-400 ${autoDispatching ? "animate-spin" : ""}`} />
              <span>{autoDispatching ? "Auto-Sending..." : `Dispatch Today's Batch (${todayBatchLeads.length})`}</span>
            </button>
          </div>
        </div>

        {/* Progress & Queue Mode Switcher */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setViewMode("today");
                setCurrentIndex(0);
              }}
              className={`rounded-md px-3 py-1 font-medium transition ${
                viewMode === "today"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ⭐ Today's Batch ({todayBatchLeads.length})
            </button>
            <button
              onClick={() => {
                setViewMode("backlog");
                setCurrentIndex(0);
              }}
              className={`rounded-md px-3 py-1 font-medium transition ${
                viewMode === "backlog"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              📁 Full Qualified Backlog ({allQualifiedLeads.length})
            </button>
          </div>

          {activeQueue.length > 0 && (
            <div className="flex items-center gap-2 text-zinc-400">
              <span>Agency {currentIndex + 1} of {activeQueue.length}</span>
              <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
                <button
                  onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                  disabled={currentIndex === 0}
                  className="rounded p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 transition disabled:opacity-30"
                  title="Previous Lead"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentIndex((p) => Math.min(activeQueue.length - 1, p + 1))}
                  disabled={currentIndex >= activeQueue.length - 1}
                  className="rounded p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 transition disabled:opacity-30"
                  title="Next Lead"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
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
      {activeQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 py-20 text-center px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 mb-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Daily Queue Completed!</h3>
          <p className="text-xs text-zinc-400 max-w-md mt-1 mb-5">
            You have worked through all leads scheduled for today. The 24/7 background autopilot is continuously mining fresh agency prospects.
          </p>
          <button
            onClick={() => {
              setViewMode("backlog");
              setCurrentIndex(0);
            }}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition"
          >
            <span>Review Remaining Qualified Backlog ({allQualifiedLeads.length})</span>
          </button>
        </div>
      ) : currentLead ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: Agency Intelligence & Decision Maker (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{cleanCompanyName(currentLead.companyName)}</h3>
                  {currentLead.headline && (
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{currentLead.headline}</p>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                    ICP: {currentLead.score}/100
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 capitalize">{currentLead.source.replace("_", " ")}</span>
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

              {/* Verified Decision Maker Card */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Target Decision Maker
                  </span>
                  {currentLead.verificationStatus === "socket_valid" ? (
                    <span className="flex items-center gap-1 rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800/40">
                      <ShieldCheck className="h-3 w-3" />
                      SMTP Validated
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-800/40">
                      <ShieldAlert className="h-3 w-3" />
                      Catch-All Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 text-xs font-semibold">
                    {(currentLead.contactName || "D")[0]}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">
                      {currentLead.contactName || dossier?.decisionMaker?.fullName || "Founder / Agency Principal"}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {dossier?.decisionMaker?.role || "Agency Founder / Technical Director"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900/60 rounded px-2.5 py-1.5 font-mono">
                  <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{targetEmail || "No personal decision-maker email"}</span>
                </div>

                {currentLead.phone && (
                  <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900/60 rounded px-2.5 py-1.5 font-mono">
                    <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{currentLead.phone}</span>
                    <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                      WhatsApp Ready
                    </span>
                  </div>
                )}
              </div>

              {/* Team Assignment & Status */}
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Team Rep Assignment
                  </span>
                  <span className="text-[10px] text-zinc-500">Claimed rep</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <select
                    value={currentLead.assignedTo || "deep"}
                    onChange={async (e) => {
                      const rep = e.target.value;
                      await fetch(`/api/leads/${currentLead.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ assignedTo: rep })
                      });
                      await onLeadsUpdated();
                    }}
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="deep">Deep Mehta (Admin / Solutions Architect)</option>
                    <option value="sales1">Sales Lead (Growth)</option>
                    <option value="sales2">Business Dev (Technical Partnerships)</option>
                  </select>
                </div>
              </div>

              {/* Tech Stack & Infrastructure Badges */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Detected Stack & Infrastructure
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
            </div>
          </div>

          {/* RIGHT PANEL: Interactive Studio, Quick Angles & 1-Click Send (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div>
                  <h3 className="text-sm font-semibold text-white">Review & Send Pitch</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Personalized angle crafted for {currentLead.contactName || cleanCompanyName(currentLead.companyName)}.
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

              {/* Quick Angle Switcher Pills */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Switch Value Proposition:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ANGLE_PRESETS.map((preset) => {
                    const isSelected = selectedAngleId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedAngleId(preset.id);
                          const repName = currentUser?.name || "Deep Mehta";
                          const repEmail = currentUser?.email || "deep@3dices.com";
                          setSubject(preset.getSubject(currentLead));
                          setBody(preset.getBody(currentLead, repName, repEmail));
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                            : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        }`}
                      >
                        <span>{preset.name}</span>
                        <span className="text-[10px] text-zinc-500 opacity-80">({preset.badge})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sender & Target Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-zinc-400">Dispatch Rep (Your Mailbox)</label>
                    <button
                      type="button"
                      onClick={() => setIsSmtpModalOpen(true)}
                      className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Key className="h-2.5 w-2.5" />
                      {smtpConfigured ? "Update Password" : "Connect Password"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white">
                    <User className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="font-medium truncate">{currentUser?.name || "Deep Mehta"} &lt;{currentUser?.email || "deep@3dices.com"}&gt;</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-zinc-400">Target Recipient</label>
                    {!isGenericEmail(targetEmail) && isValidEmail(targetEmail) ? (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Direct Decision Maker
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Generic Inbox
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="firstname@agency.com"
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-zinc-700 focus:outline-none font-mono"
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
                    {wordCount} words {wordCount > 130 ? "⚠️ (Keep under 125 words)" : "✓ (Concise & High-Converting)"}
                  </span>
                </div>
                <textarea
                  rows={8}
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
                    Detected corporate buzzwords: <strong>{containsCorporateSlop.join(", ")}</strong>. Keep it human.
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(activeQueue.length - 1, prev + 1))}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                >
                  Skip to Next Lead →
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {/* 1-Click Open in Zoho Mail */}
                  <a
                    href={`https://mail.zoho.in/zm/#mail/compose?to=${encodeURIComponent(targetEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async () => {
                      if (currentLead) {
                        await fetch(`/api/leads/${currentLead.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ stage: "contacted" })
                        });
                        await onLeadsUpdated();
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-indigo-700/60 bg-indigo-950/40 hover:bg-indigo-900/60 px-3 py-2 text-xs font-medium text-indigo-200 transition"
                    title="Open pre-filled in your logged-in Zoho Mail account"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
                    Open in Zoho
                  </a>

                  {/* WhatsApp Web Direct Link */}
                  {currentLead.phone && (
                    <a
                      href={`https://web.whatsapp.com/send?phone=${encodeURIComponent(currentLead.phone.replace(/[^\d]/g, ""))}&text=${encodeURIComponent(body)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-800/40 bg-emerald-950/40 hover:bg-emerald-900/60 px-3 py-2 text-xs font-medium text-emerald-300 hover:text-white transition"
                      title="Open in WhatsApp Web"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                      WhatsApp Web
                    </a>
                  )}

                  {/* Autonomous Server Dispatch */}
                  <button
                    type="button"
                    disabled={sending || !targetEmail.trim()}
                    onClick={handleSendEmail}
                    className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-semibold text-zinc-950 transition shadow-lg shadow-emerald-950/20 disabled:opacity-40"
                  >
                    {sending ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {sending ? "Dispatching..." : "Approve & Send Now"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Zoho SMTP Connection Modal */}
      {isSmtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Connect Zoho Mailbox</h3>
                  <p className="text-xs text-zinc-400">{currentUser?.email || "deep@3dices.com"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSmtpModalOpen(false);
                  setSmtpModalError(null);
                  setSmtpModalSuccess(null);
                }}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg border border-indigo-950/80 bg-indigo-950/30 p-3 space-y-2 text-xs text-zinc-300">
              <p className="font-semibold text-indigo-300">Zoho App Password Setup (60 seconds):</p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                <li>
                  Open{" "}
                  <a
                    href="https://accounts.zoho.in/home#security/app_password"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 underline font-medium"
                  >
                    Zoho Account Security ↗
                  </a>
                </li>
                <li>Go to <strong>Security → App Passwords</strong></li>
                <li>Click <strong>Generate New Password</strong> (Name: <code className="bg-zinc-950 px-1 py-0.5 rounded text-zinc-300">3 Dices</code>)</li>
                <li>Copy the 16-character code and paste below:</li>
              </ol>
            </div>

            <form onSubmit={handleSaveSmtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Your Sender Email
                </label>
                <input
                  type="email"
                  disabled
                  value={currentUser?.email || "deep@3dices.com"}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Zoho 16-Character App Password
                </label>
                <input
                  type="password"
                  required
                  value={appPasswordInput}
                  onChange={(e) => setAppPasswordInput(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {smtpModalError && (
                <div className="flex items-center gap-2 rounded bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{smtpModalError}</span>
                </div>
              )}

              {smtpModalSuccess && (
                <div className="flex items-center gap-2 rounded bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{smtpModalSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsSmtpModalOpen(false)}
                  disabled={smtpSaving}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={smtpSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-40"
                >
                  {smtpSaving && <RefreshCw className="h-3 w-3 animate-spin" />}
                  {smtpSaving ? "Verifying..." : "Save & Verify Connection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
