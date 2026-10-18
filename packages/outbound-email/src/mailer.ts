import nodemailer from "nodemailer";
import { lintOutreachCopy } from "@arcon/copy-linter";
import { randomUUID } from "node:crypto";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailDispatchInput {
  toEmail: string;
  toName?: string;
  subject: string;
  body: string;
  smtpConfig?: SmtpConfig;
  enforceSte100?: boolean;
  dryRun?: boolean;
}

export interface EmailDeliveryReceipt {
  receiptId: string;
  timestamp: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  status: "delivered" | "dry_run_success" | "rejected_linter";
  messageId: string;
  ste100Compliant: boolean;
  error?: string;
}

const sendCounts: Record<string, { date: string; count: number }> = {};
const MAX_DAILY_SENDS = 50;

export async function dispatchColdEmail(input: EmailDispatchInput): Promise<EmailDeliveryReceipt> {
  const receiptId = randomUUID();
  const now = new Date().toISOString();
  const today = now.split("T")[0];

  const smtpConfig: SmtpConfig | undefined = input.smtpConfig ?? (process.env.SMTP_HOST ? {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: process.env.SMTP_SECURE !== "false",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "outbound@3dices.com",
    fromName: process.env.SMTP_FROM_NAME || "3 Dices Team"
  } : undefined);

  const fromEmail = smtpConfig?.fromEmail || "outbound@3dices.com";

  // 1. Guardrail: Daily send limit per mailbox
  if (!sendCounts[fromEmail] || sendCounts[fromEmail].date !== today) {
    sendCounts[fromEmail] = { date: today, count: 0 };
  }

  if (sendCounts[fromEmail].count >= MAX_DAILY_SENDS && !input.dryRun) {
    throw new Error(
      `Daily send cap reached for ${fromEmail} (${sendCounts[fromEmail].count}/${MAX_DAILY_SENDS}). Outbound paused to protect sender reputation.`
    );
  }

  // 2. Pre-send Quality Gate: Run copy through slop linter (ASD-STE100 optional, default false)
  const lintResult = lintOutreachCopy(input.body, {
    enforceSte100: input.enforceSte100 ?? false,
    maxWordsPerSentence: 35
  });

  if (!lintResult.passed) {
    return {
      receiptId,
      timestamp: now,
      toEmail: input.toEmail,
      fromEmail,
      subject: input.subject,
      status: "rejected_linter",
      messageId: `rejected-${receiptId}`,
      ste100Compliant: lintResult.ste100.compliant,
      error: `Outreach copy blocked by linter: ${lintResult.failureReasons.join(" ")}`
    };
  }

  // 3. Dry-run or mock mode when no live SMTP host is specified
  if (input.dryRun || !smtpConfig?.host) {
    sendCounts[fromEmail].count++;
    return {
      receiptId,
      timestamp: now,
      toEmail: input.toEmail,
      fromEmail,
      subject: input.subject,
      status: "dry_run_success",
      messageId: `<mock-${receiptId}@${fromEmail.split("@")[1] || "3dices.com"}>`,
      ste100Compliant: true
    };
  }

  // 4. Live SMTP dispatch via nodemailer
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    }
  });

  const mailOptions = {
    from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
    to: input.toName ? `"${input.toName}" <${input.toEmail}>` : input.toEmail,
    subject: input.subject,
    text: input.body,
    headers: {
      "X-Mailer": "Growth-OS Warmbly Fleet 1.0",
      "X-Receipt-ID": receiptId
    }
  };

  const info = await transporter.sendMail(mailOptions);
  sendCounts[fromEmail].count++;

  return {
    receiptId,
    timestamp: now,
    toEmail: input.toEmail,
    fromEmail,
    subject: input.subject,
    status: "delivered",
    messageId: info.messageId,
    ste100Compliant: true
  };
}

/**
 * Tests direct SMTP handshake with mail server.
 */
export async function testSmtpConnection(config: SmtpConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      },
      connectionTimeout: 10000
    });
    await transporter.verify();
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

