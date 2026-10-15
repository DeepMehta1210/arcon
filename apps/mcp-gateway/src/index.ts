import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { verifyEmail } from "@growth-os/verifier";
import { lintOutreachCopy } from "@growth-os/copy-linter";
import { searchYCCompanies, fetchShowHNSignals, scrapeLocalPlaces, importLeadsFromCsv } from "@growth-os/scrapers";
import { runResearchSwarm } from "@growth-os/agent-core";
import { dispatchColdEmail } from "@growth-os/outbound-email";
import { dispatchWhatsAppTouch } from "@growth-os/outbound-wa";
import { generateCommercialProposal } from "@growth-os/doc-generator";

const server = new Server(
  {
    name: "growth-os-mcp-gateway",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "growth_scrape_yc",
        description: "Scrapes YC companies and founders by batch (e.g. W24, S23).",
        inputSchema: {
          type: "object",
          properties: {
            batch: { type: "string", description: "YC Batch identifier (e.g. W24, S23)" },
            limit: { type: "number", description: "Max companies to return", default: 10 },
          },
        },
      },
      {
        name: "growth_listen_signals",
        description: "Mines live Hacker News Show HN product launches and hiring signals.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search keyword", default: "Show HN" },
            limit: { type: "number", description: "Max signals to return", default: 10 },
          },
        },
      },
      {
        name: "growth_verify_email",
        description: "Direct socket SMTP verification with $0 API cost and MX resolution.",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string", description: "Email address to verify" },
          },
          required: ["email"],
        },
      },
      {
        name: "growth_scrape_maps",
        description: "Scrapes local business listings, contacts, and websites by keyword and city.",
        inputSchema: {
          type: "object",
          properties: {
            keyword: { type: "string", description: "Business type (e.g. dental clinic, gym, cafe)" },
            city: { type: "string", description: "City and region (e.g. Chicago, IL)" },
            limit: { type: "number", description: "Max places to return", default: 10 },
          },
          required: ["keyword", "city"],
        },
      },
      {
        name: "growth_lint_copy",
        description: "Validates text against ASD-STE100 rules, strips invisible zero-width characters, and detects 113 corporate slop words.",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "Text content to inspect and clean" },
            enforceSte100: { type: "boolean", description: "Enforce max 20 words per sentence", default: true },
          },
          required: ["text"],
        },
      },
      {
        name: "growth_research_prospect",
        description: "Runs the 5-agent research swarm to profile a company, verify decision maker email, evaluate 5-factor rubric, and generate an ASD-STE100 outreach angle.",
        inputSchema: {
          type: "object",
          properties: {
            domain: { type: "string", description: "Target company domain (e.g. stripe.com)" },
            companyName: { type: "string", description: "Company name (optional)" },
            contactName: { type: "string", description: "Target decision maker full name (optional)" },
            observedSignal: { type: "string", description: "Observed event, trigger or launch headline (optional)" },
          },
          required: ["domain"],
        },
      },
      {
        name: "growth_send_email",
        description: "Dispatches a cold email touch with rate-limiting, sender reputation caps, and ASD-STE100 linter validation.",
        inputSchema: {
          type: "object",
          properties: {
            toEmail: { type: "string", description: "Recipient email address" },
            toName: { type: "string", description: "Recipient full name (optional)" },
            subject: { type: "string", description: "Email subject line" },
            body: { type: "string", description: "Email body text (must adhere to ASD-STE100)" },
            dryRun: { type: "boolean", description: "Simulate send without network delivery", default: true },
          },
          required: ["toEmail", "subject", "body"],
        },
      },
      {
        name: "growth_send_whatsapp",
        description: "Dispatches a WhatsApp message touch via WAHA with anti-ban humanized typing jitter and ASD-STE100 validation.",
        inputSchema: {
          type: "object",
          properties: {
            phone: { type: "string", description: "Recipient phone number with country code" },
            text: { type: "string", description: "WhatsApp message text" },
            dryRun: { type: "boolean", description: "Simulate send without delivery", default: true },
          },
          required: ["phone", "text"],
        },
      },
      {
        name: "growth_generate_proposal",
        description: "Generates a structured commercial proposal and Statement of Work conforming to ASD-STE100 directly from a target company domain.",
        inputSchema: {
          type: "object",
          properties: {
            domain: { type: "string", description: "Company domain (e.g. acme.com)" },
            serviceOffering: { type: "string", description: "Service offering title", default: "Cloud & AI Architecture Optimization" },
            monthlyFeeUsd: { type: "number", description: "Proposed monthly retainer in USD", default: 5000 },
            deliveryWeeks: { type: "number", description: "Implementation schedule duration in weeks", default: 4 },
          },
          required: ["domain"],
        },
      },
      {
        name: "growth_import_leads_csv",
        description: "Imports B2B lead datasets from local CSV files into standardized RawLead records.",
        inputSchema: {
          type: "object",
          properties: {
            filePath: { type: "string", description: "Absolute path to the CSV file" },
            limit: { type: "number", description: "Maximum records to import", default: 50 },
          },
          required: ["filePath"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "growth_scrape_yc") {
      const batch = (args?.batch as string) ?? "W24";
      const limit = (args?.limit as number) ?? 10;
      const leads = await searchYCCompanies({ batch, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(leads, null, 2) }],
      };
    }

    if (name === "growth_listen_signals") {
      const query = (args?.query as string) ?? "Show HN";
      const limit = (args?.limit as number) ?? 10;
      const result = await fetchShowHNSignals({ query, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === "growth_verify_email") {
      const email = args?.email as string;
      const result = await verifyEmail(email);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === "growth_scrape_maps") {
      const keyword = args?.keyword as string;
      const city = args?.city as string;
      const limit = (args?.limit as number) ?? 10;
      const places = await scrapeLocalPlaces({ keyword, city, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(places, null, 2) }],
      };
    }

    if (name === "growth_lint_copy") {
      const text = args?.text as string;
      const enforceSte100 = (args?.enforceSte100 as boolean) ?? true;
      const result = lintOutreachCopy(text, { enforceSte100 });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === "growth_research_prospect") {
      const domain = args?.domain as string;
      const companyName = args?.companyName as string | undefined;
      const contactName = args?.contactName as string | undefined;
      const observedSignal = args?.observedSignal as string | undefined;
      const dossier = await runResearchSwarm({ domain, companyName, contactName, observedSignal });
      return {
        content: [{ type: "text", text: JSON.stringify(dossier, null, 2) }],
      };
    }

    if (name === "growth_send_email") {
      const toEmail = args?.toEmail as string;
      const toName = args?.toName as string | undefined;
      const subject = args?.subject as string;
      const body = args?.body as string;
      const dryRun = (args?.dryRun as boolean) ?? true;
      const receipt = await dispatchColdEmail({ toEmail, toName, subject, body, dryRun });
      return {
        content: [{ type: "text", text: JSON.stringify(receipt, null, 2) }],
      };
    }

    if (name === "growth_send_whatsapp") {
      const phone = args?.phone as string;
      const text = args?.text as string;
      const dryRun = (args?.dryRun as boolean) ?? true;
      const receipt = await dispatchWhatsAppTouch({ phone, text, dryRun, simulateJitter: true });
      return {
        content: [{ type: "text", text: JSON.stringify(receipt, null, 2) }],
      };
    }

    if (name === "growth_generate_proposal") {
      const domain = args?.domain as string;
      const serviceOffering = (args?.serviceOffering as string) ?? "Cloud & AI Architecture Optimization";
      const monthlyFeeUsd = (args?.monthlyFeeUsd as number) ?? 5000;
      const deliveryWeeks = (args?.deliveryWeeks as number) ?? 4;
      const dossier = await runResearchSwarm({ domain });
      const proposal = generateCommercialProposal(dossier, {
        serviceOffering,
        monthlyFeeUsd,
        deliveryWeeks,
      });
      return {
        content: [
          { type: "text", text: proposal.markdownDocument },
          { type: "text", text: JSON.stringify(proposal, null, 2) },
        ],
      };
    }

    if (name === "growth_import_leads_csv") {
      const filePath = args?.filePath as string;
      const limit = (args?.limit as number) ?? 50;
      const leads = importLeadsFromCsv(filePath, { limit });
      return {
        content: [{ type: "text", text: JSON.stringify(leads, null, 2) }],
      };
    }

    return {
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: `Tool error: ${(error as Error).message}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP Server fatal error:", err);
  process.exit(1);
});
