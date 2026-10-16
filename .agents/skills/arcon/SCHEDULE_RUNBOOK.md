# Antigravity Automation Runbook

Use this runbook to configure recurring background sweeps in Google Antigravity.
All instructions adhere to the ASD-STE100 standard.

---

## 1. Recurring Automation Schedules

You can configure three autonomous background jobs using the `/schedule` slash command.

### Schedule 1: Daily Signal Radar
Runs every morning at 09:00.
Mines Show HN product launches and YC batch additions.
Flags prospects with qualification scores above 80%.

**Antigravity Command:**
```text
/schedule cron="0 9 * * *" prompt="Run arcon daily signal sweep. Search Show HN and YC W24 startups. Flag prospects scoring above 80%."
```

---

### Schedule 2: Hourly Deliverability Health Check
Runs every 60 minutes.
Inspects mailbox bounce rates and verifies MX connectivity.
Pauses mailboxes if daily send caps reach 50 touches.

**Antigravity Command:**
```text
/schedule cron="0 * * * *" prompt="Run arcon hourly deliverability check. Check mailbox send caps and verify DNS MX health."
```

---

### Schedule 3: 15-Minute Inbox Triage Radar
Runs every 15 minutes.
Inspects incoming email and WhatsApp messages.
Categorizes intent into `interested`, `objection`, or `dnc`.
Alerts you immediately when a hot lead requests a proposal.

**Antigravity Command:**
```text
/schedule cron="*/15 * * * *" prompt="Run arcon inbox triage sweep. Classify new replies and alert for hot lead responses."
```

---

## 2. Managing Scheduled Tasks

* To list running background tasks: Check your active Antigravity background tasks.
* To stop a scheduled sweep: Tell Antigravity to cancel the schedule task ID.
* To run an immediate manual sweep: Use the `/listen-signals` or `/research-company` shortcuts.
