# Unified Growth OS

> Open-source autonomous GTM and lead generation engine.
> Controlled by Google Antigravity.
> Built to the ASD-STE100 standard.

---

## 1. Description

Growth OS consolidates lead generation, verification, and outbound communication into one system.
It extracts verified public signals.
It validates contact routes with zero API fees.
It enforces clear, humanized outreach copy without corporate buzzwords.

---

## 2. Directory Structure

```
growth-os/
├── apps/
│   ├── mcp-gateway/       # MCP tool server for Google Antigravity
│   ├── web/               # Next.js 16 command dashboard and unified inbox
│   └── cli/               # Terminal management commands
├── packages/
│   ├── shared-types/      # Zod validation schemas and contracts
│   ├── copy-linter/       # Anti-slop and ASD-STE100 sentence validator
│   ├── verifier/          # Zero-cost direct socket SMTP and MX verifier
│   ├── scrapers/          # YC directory, social, and signal listeners
│   └── database/          # PostgreSQL 16 and pgvector schema
├── .agents/
│   └── rules/
│       └── ste100.md      # Antigravity ASD-STE100 active rule
├── docker-compose.yml     # PostgreSQL, Redis, and WAHA infrastructure
├── package.json           # Turborepo root workspace configuration
└── turbo.json             # Build and test pipeline definitions
```

---

## 3. Quick Start Procedure

### Step 1: Install Dependencies
Run this command from the root directory:
```bash
bun install
```

### Step 2: Run Automated Tests
Verify all packages with:
```bash
bun test
```

### Step 3: Start Infrastructure
Start the database, Redis queue, and WhatsApp containers:
```bash
docker compose up -d
```

### Step 4: Start the Antigravity MCP Server
Run the gateway server:
```bash
bun run apps/mcp-gateway/src/index.ts
```

---

## 4. Antigravity MCP Integration

Add this entry to your `mcp_config.json`:
```json
{
  "mcpServers": {
    "growth-os": {
      "command": "bun",
      "args": ["run", "C:\\Users\\DeepMehta\\Organiz\\Codes\\growth-os\\apps\\mcp-gateway\\src\\index.ts"],
      "env": {
        "STE100_STRICT_MODE": "true"
      }
    }
  }
}
```
