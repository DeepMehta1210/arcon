import { pgTable, uuid, text, timestamp, integer, jsonb, customType } from "drizzle-orm/pg-core";

// Custom vector type for pgvector (1024 dimensions for Amazon Titan / Cohere)
const vector1024 = customType<{ data: number[] }>({
  dataType() {
    return "vector(1024)";
  },
});

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  description: text("description"),
  stage: text("stage").default("bootstrapped"),
  techStack: jsonb("tech_stack").$type<string[]>().default([]),
  socialUrls: jsonb("social_urls").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  companyId: uuid("company_id").references(() => companies.id),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  title: text("title"),
  linkedinUrl: text("linkedin_url"),
  verificationStatus: text("verification_status").default("unverified").notNull(), // valid, invalid, catch_all, unverified
  leadScore: integer("lead_score").default(0).notNull(),
  pipelineStage: text("pipeline_stage").default("lead_identified").notNull(),
  customAttributes: jsonb("custom_attributes").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const signals = pgTable("signals", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(), // hacker_news, yc, hiring, funding
  signalType: text("signal_type").notNull(), // product_launch, hiring, funding, complaint
  companyDomain: text("company_domain").notNull(),
  companyName: text("company_name").notNull(),
  headline: text("headline").notNull(),
  url: text("url").notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

export const outreachTouches = pgTable("outreach_touches", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  channel: text("channel").notNull(), // email, whatsapp, linkedin, direct_mail
  status: text("status").default("queued").notNull(), // queued, sent, delivered, bounced, replied
  subject: text("subject"),
  body: text("body").notNull(),
  ste100Compliant: text("ste100_compliant").default("true"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  channel: text("channel").notNull(), // whatsapp, email, linkedin
  externalThreadId: text("external_thread_id"),
  status: text("status").default("active").notNull(), // active, resolved, blocked
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  senderType: text("sender_type").notNull(), // lead, agent, human
  content: text("content").notNull(),
  intentClassification: text("intent_classification"), // interested, objection, referral, dnc
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // case_study, objection_handling, pricing, company_faq
  embedding: vector1024("embedding"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
