import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { verifyEmail } from "@growth-os/verifier";
import { lintOutreachCopy } from "@growth-os/copy-linter";
import { searchYCCompanies, fetchShowHNSignals, scrapeLocalPlaces } from "@growth-os/scrapers";

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
