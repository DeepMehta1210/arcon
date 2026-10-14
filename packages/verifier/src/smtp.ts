import * as dns from "node:dns/promises";
import * as net from "node:net";

export interface SmtpVerificationResult {
  email: string;
  domain: string;
  mxHost: string | null;
  exists: boolean;
  isCatchAll: boolean;
  score: number;
  details: string;
}

export async function resolveMxRecords(domain: string): Promise<string[]> {
  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) return [];
    return records
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange.replace(/\.$/, ""));
  } catch {
    return [];
  }
}

export function performSocketHandshake(
  host: string,
  email: string,
  domain: string,
  timeoutMs = 7000
): Promise<{ exists: boolean; isCatchAll: boolean; details: string }> {
  return new Promise((resolve) => {
    let resolved = false;
    const socket = new net.Socket();
    let stage: "banner" | "helo" | "mail" | "rcpt" | "probe_rcpt" | "quit" = "banner";
    let exists = false;
    let isCatchAll = false;
    let buffer = "";

    const finish = (result: { exists: boolean; isCatchAll: boolean; details: string }) => {
      if (resolved) return;
      resolved = true;
      try {
        socket.destroy();
      } catch {}
      resolve(result);
    };

    socket.setTimeout(timeoutMs);

    socket.on("timeout", () => {
      finish({ exists: false, isCatchAll: false, details: "Socket connection timed out" });
    });

    socket.on("error", (err) => {
      finish({ exists: false, isCatchAll: false, details: `Socket error: ${err.message}` });
    });

    socket.connect(25, host, () => {
      // connected, waiting for 220 banner
    });

    socket.on("data", (data) => {
      buffer += data.toString("utf-8");
      const lines = buffer.split("\r\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const code = parseInt(line.substring(0, 3), 10);
        if (isNaN(code)) continue;

        if (stage === "banner" && code === 220) {
          stage = "helo";
          socket.write("HELO scout-verify.local\r\n");
        } else if (stage === "helo" && (code === 250 || code === 200)) {
          stage = "mail";
          socket.write("MAIL FROM:<verify@scout-verify.local>\r\n");
        } else if (stage === "mail" && code === 250) {
          stage = "rcpt";
          socket.write(`RCPT TO:<${email}>\r\n`);
        } else if (stage === "rcpt") {
          if (code === 250) {
            exists = true;
            // Now test catch-all probe
            stage = "probe_rcpt";
            socket.write(`RCPT TO:<probe-nonexistent-${Date.now()}@${domain}>\r\n`);
          } else {
            stage = "quit";
            socket.write("QUIT\r\n");
            finish({ exists: false, isCatchAll: false, details: `Mailbox rejected: ${line}` });
          }
        } else if (stage === "probe_rcpt") {
          if (code === 250) {
            isCatchAll = true;
          }
          stage = "quit";
          socket.write("QUIT\r\n");
          finish({
            exists,
            isCatchAll,
            details: isCatchAll ? "Mailbox exists but domain is Catch-All" : "Mailbox verified exists"
          });
        }
      }
    });

    socket.on("close", () => {
      if (!resolved) {
        finish({ exists, isCatchAll, details: "Socket closed before handshake completed" });
      }
    });
  });
}

export async function verifyEmail(email: string): Promise<SmtpVerificationResult> {
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      email,
      domain: "",
      mxHost: null,
      exists: false,
      isCatchAll: false,
      score: 0,
      details: "Invalid email address format"
    };
  }

  const [, domain] = parts;
  const mxHosts = await resolveMxRecords(domain);

  if (mxHosts.length === 0) {
    return {
      email,
      domain,
      mxHost: null,
      exists: false,
      isCatchAll: false,
      score: 0,
      details: "No MX records found for domain"
    };
  }

  const primaryMx = mxHosts[0];
  const handshake = await performSocketHandshake(primaryMx, email, domain);

  let score = 20; // MX lookup passed
  if (handshake.exists) score += 70;
  if (handshake.isCatchAll) score -= 30;

  return {
    email,
    domain,
    mxHost: primaryMx,
    exists: handshake.exists,
    isCatchAll: handshake.isCatchAll,
    score: Math.max(0, Math.min(100, score)),
    details: handshake.details
  };
}
