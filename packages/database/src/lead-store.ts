import type { RawLead } from "@arcon/shared-types";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

export interface StoredLead extends RawLead {
  stage: "sourced" | "verified" | "researched" | "contacted" | "replied";
  score: number;
  verificationStatus?: "unverified" | "socket_valid" | "socket_invalid" | "catch_all";
  notes?: string;
}

function getDataDir(): string {
  const candidates = [
    join(process.cwd(), "packages/database/data"),
    join(process.cwd(), "../../packages/database/data"),
    "C:/Users/DeepMehta/Organiz/Codes/arcon/packages/database/data"
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "C:/Users/DeepMehta/Organiz/Codes/arcon/packages/database/data";
}

const DATA_DIR = getDataDir();
const DATA_FILE = join(DATA_DIR, "imported-leads.json");

export class LeadStore {
  private static instance: LeadStore;
  private leads: Map<string, StoredLead> = new Map();

  private constructor() {
    this.loadFromDisk();
  }

  public static getInstance(): LeadStore {
    if (!LeadStore.instance) {
      LeadStore.instance = new LeadStore();
    }
    return LeadStore.instance;
  }

  private loadFromDisk(): void {
    try {
      if (existsSync(DATA_FILE)) {
        const raw = readFileSync(DATA_FILE, "utf-8");
        const list: StoredLead[] = JSON.parse(raw);
        this.leads.clear();
        for (const lead of list) {
          this.leads.set(lead.id, lead);
        }
      }
    } catch {
      // In-memory fallback
    }
  }

  private saveToDisk(): void {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }
      const list = Array.from(this.leads.values());
      writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.warn("Failed to save leads to disk:", err);
    }
  }

  public addLeads(newLeads: RawLead[]): { added: number; total: number } {
    let added = 0;
    for (const lead of newLeads) {
      // Deduplicate by company website or name
      const existing = Array.from(this.leads.values()).find(
        (l) =>
          (lead.websiteUrl && l.websiteUrl === lead.websiteUrl) ||
          (lead.companyName && l.companyName.toLowerCase() === lead.companyName.toLowerCase())
      );

      if (!existing) {
        // Calculate initial rubric score heuristic
        const hasEmail = lead.emailCandidates.length > 0 ? 30 : 0;
        const hasPhone = lead.phone ? 20 : 0;
        const hasDecisionMaker = lead.contactName ? 30 : 0;
        const hasWebsite = lead.websiteUrl ? 20 : 0;
        const score = hasEmail + hasPhone + hasDecisionMaker + hasWebsite;

        this.leads.set(lead.id, {
          ...lead,
          stage: "sourced",
          score,
          verificationStatus: "unverified"
        });
        added++;
      }
    }

    if (added > 0) {
      this.saveToDisk();
    }

    return { added, total: this.leads.size };
  }

  public getAllLeads(): StoredLead[] {
    return Array.from(this.leads.values());
  }

  public getLeadById(id: string): StoredLead | undefined {
    return this.leads.get(id);
  }

  public updateLead(id: string, updates: Partial<StoredLead>): StoredLead | undefined {
    const current = this.leads.get(id);
    if (!current) return undefined;

    const updated = { ...current, ...updates };
    this.leads.set(id, updated);
    this.saveToDisk();
    return updated;
  }

  public getStats(): {
    total: number;
    sourced: number;
    verified: number;
    researched: number;
    contacted: number;
    replied: number;
    withEmail: number;
    withPhone: number;
  } {
    const list = Array.from(this.leads.values());
    return {
      total: list.length,
      sourced: list.filter((l) => l.stage === "sourced").length,
      verified: list.filter((l) => l.stage === "verified").length,
      researched: list.filter((l) => l.stage === "researched").length,
      contacted: list.filter((l) => l.stage === "contacted").length,
      replied: list.filter((l) => l.stage === "replied").length,
      withEmail: list.filter((l) => l.emailCandidates.length > 0).length,
      withPhone: list.filter((l) => Boolean(l.phone)).length
    };
  }
}
