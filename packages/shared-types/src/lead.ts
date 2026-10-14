import { z } from "zod";

export const LeadSourceSchema = z.enum([
  "google_maps",
  "instagram",
  "tiktok",
  "linkedin",
  "github",
  "youtube",
  "twitch",
  "pinterest",
  "linktree",
  "yc_directory",
  "signal_finder",
  "csv_import"
]);

export type LeadSource = z.infer<typeof LeadSourceSchema>;

export const EmailVerificationStatusSchema = z.enum([
  "unverified",
  "socket_valid",
  "socket_invalid",
  "catch_all",
  "api_verified"
]);

export type EmailVerificationStatus = z.infer<typeof EmailVerificationStatusSchema>;

export const RawLeadSchema = z.object({
  id: z.string().uuid(),
  source: LeadSourceSchema,
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  headline: z.string().optional(),
  emailCandidates: z.array(z.string().email()),
  phone: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  location: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    rawAddress: z.string().optional()
  }).optional(),
  socialUrls: z.record(z.string()).default({}),
  signalData: z.record(z.unknown()).optional(),
  discoveredAt: z.string().datetime()
});

export type RawLead = z.infer<typeof RawLeadSchema>;
