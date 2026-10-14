import { z } from "zod";

export const ContactSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  title: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  verificationStatus: z.enum(["unverified", "valid", "invalid", "catch_all"]),
  leadScore: z.number().int().min(0).max(100).default(0),
  pipelineStage: z.enum([
    "lead_identified",
    "researched",
    "ready_to_send",
    "touch_sent",
    "replied_substance",
    "meeting_booked",
    "opportunity",
    "closed_won",
    "closed_lost",
    "dnc"
  ]).default("lead_identified"),
  customAttributes: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Contact = z.infer<typeof ContactSchema>;

export const SignalEventSchema = z.object({
  id: z.string().uuid(),
  source: z.string(),
  signalType: z.enum(["funding", "hiring", "product_launch", "complaint", "tech_change", "github_spike"]),
  companyDomain: z.string(),
  companyName: z.string(),
  headline: z.string(),
  url: z.string().url(),
  detectedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).default({})
});

export type SignalEvent = z.infer<typeof SignalEventSchema>;

export const OutreachTouchSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  channel: z.enum(["email", "whatsapp", "linkedin", "direct_mail"]),
  status: z.enum(["queued", "sent", "delivered", "bounced", "opened", "replied", "failed"]),
  subject: z.string().optional(),
  body: z.string(),
  metadata: z.record(z.unknown()).default({}),
  sentAt: z.string().datetime().optional(),
  createdAt: z.string().datetime()
});

export type OutreachTouch = z.infer<typeof OutreachTouchSchema>;
