import { describe, expect, it } from "bun:test";
import {
  extractPhoneFromText,
  scrapeGitHubCreator,
  scrapeB2CCreator
} from "../src/b2c";

describe("B2C creator scrapers", () => {
  it("extracts phone numbers from free-form bio text", () => {
    const text = "Business inquiries: contact@agency.com or call +1 (555) 234-5678 for bookings.";
    const phone = extractPhoneFromText(text);
    expect(phone).toBe("+1 (555) 234-5678");
  });

  it("scrapes public GitHub creator profile", async () => {
    const lead = await scrapeGitHubCreator("octocat");
    expect(lead.source).toBe("github");
    expect(lead.contactName).toBeDefined();
    expect(lead.websiteUrl).toBeDefined();
  });

  it("routes scrapeB2CCreator across platforms with structured schema", async () => {
    const lead = await scrapeB2CCreator("github", "octocat");
    expect(lead.id).toBeDefined();
    expect(lead.source).toBe("github");
    expect(lead.discoveredAt).toBeDefined();
  });
});
