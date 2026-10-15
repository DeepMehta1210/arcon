---
name: growth-os
description: Autonomous Growth & Lead Generation OS. Mines signals, scrapes Google Maps & YC, verifies emails via raw socket SMTP with zero API fees, validates ASD-STE100 compliance, and generates Prospect Dossiers.
---

# Growth OS: Antigravity Agent Skill

Use this skill to research companies, qualify leads, verify emails, and generate ASD-STE100 outreach copy.

---

## 1. Available Tools via MCP (`apps/mcp-gateway`)

The `growth-os-mcp-gateway` server provides five tools:

1. **`growth_research_prospect`**:
   - Executes the 5-agent research swarm.
   - Mines corporate website and tech stack.
   - Identifies decision makers and checks email routes.
   - Evaluates the 5-Factor Rubric (Pain, Fit, Timing, Reachability, Evidence).
   - Generates an ASD-STE100 compliant outreach angle.
   - Emits a complete `ProspectDossier` JSON object.

2. **`growth_scrape_maps`**:
   - Searches local business listings by category and city.
   - Auto-geocodes coordinates via OpenStreetMap.
   - Returns websites, phone numbers, and addresses.

3. **`growth_scrape_yc`**:
   - Searches Y Combinator batches (e.g. W24, S23).
   - Extracts company names, launches, and founder links.

4. **`growth_listen_signals`**:
   - Monitors live Hacker News Show HN launches.
   - Returns product launch events and discussion threads.

5. **`growth_verify_email`**:
   - Direct raw socket SMTP handshake (`HELO` $\rightarrow$ `MAIL FROM` $\rightarrow$ `RCPT TO`).
   - Zero API fees. Detects valid mailboxes and catch-all domains.

6. **`growth_lint_copy`**:
   - Validates copy against ASD-STE100 rules (maximum 20 words per sentence).
   - Strips invisible Unicode watermark characters.
   - Detects 113 corporate slop words.

---

## 2. Command Shortcuts

### `/research-company <domain>`
Run deep investigation on a company domain:
```bash
bun run apps/mcp-gateway/src/index.ts
# Call growth_research_prospect with {"domain": "<domain>"}
```

### `/prospect-maps <keyword> <city>`
Scrape local businesses:
```bash
# Call growth_scrape_maps with {"keyword": "<keyword>", "city": "<city>"}
```

### `/ste-lint <text>`
Run ASD-STE100 compliance check on draft copy:
```bash
# Call growth_lint_copy with {"text": "<text>", "enforceSte100": true}
```

### `/verify-email <email>`
Verify an email address using socket handshake:
```bash
# Call growth_verify_email with {"email": "<email>"}
```

---

## 3. ASD-STE100 Enforcement Rules

When drafting outreach copy for prospects:
* Use a maximum of 20 words for procedural sentences.
* Use a maximum of 25 words for descriptive sentences.
* Use the active voice.
* Make one observation and ask one low-friction question (Mom-Test).
* Never ask a stranger for a meeting.
