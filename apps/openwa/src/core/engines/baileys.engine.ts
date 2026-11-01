import { Injectable, Logger } from "@nestjs/common";
import {
  IWhatsAppEngine,
  EngineStatus,
  SendMessageOptions,
  SendMessageResult,
  ContactValidationResult,
} from "../interfaces/whatsapp-engine.interface";
import { GaussianJitterService } from "../anti-ban/gaussian-jitter.service";
import { SpintaxService } from "../anti-ban/spintax.service";
import { NumberValidatorService } from "../anti-ban/number-validator.service";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import * as QRCode from "qrcode";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { existsSync } from "node:fs";

@Injectable()
export class BaileysEngine implements IWhatsAppEngine {
  readonly name = "baileys";
  private readonly logger = new Logger(BaileysEngine.name);

  private socket: WASocket | null = null;
  private status: EngineStatus = "DISCONNECTED";
  private currentQrText: string | null = null;
  private currentQrDataUrl: string | null = null;
  private sessionDir: string;

  constructor(
    private readonly jitterService: GaussianJitterService,
    private readonly spintaxService: SpintaxService,
    private readonly numberValidator: NumberValidatorService,
    sessionDir = "./data/sessions/baileys"
  ) {
    this.sessionDir = path.resolve(sessionDir);
  }

  async init(): Promise<void> {
    if (!existsSync(this.sessionDir)) {
      await fs.mkdir(this.sessionDir, { recursive: true });
    }

    this.status = "INITIALIZING";
    this.logger.log(`Initializing Baileys Multi-Device Engine (Session path: ${this.sessionDir})`);

    const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    this.socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      defaultQueryTimeoutMs: 60000,
      syncFullHistory: false,
    });

    this.socket.ev.on("creds.update", saveCreds);

    this.socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.status = "SCAN_QR";
        this.currentQrText = qr;
        try {
          this.currentQrDataUrl = await QRCode.toDataURL(qr);
        } catch {
          this.currentQrDataUrl = null;
        }
        this.logger.log("New QR Code generated. Ready to scan from WhatsApp mobile app.");
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.logger.warn(`Connection closed (status code: ${statusCode}). Reconnect: ${shouldReconnect}`);
        this.status = statusCode === DisconnectReason.loggedOut ? "LOGGED_OUT" : "DISCONNECTED";
        this.currentQrText = null;
        this.currentQrDataUrl = null;

        if (shouldReconnect) {
          setTimeout(() => this.init(), 3000);
        }
      } else if (connection === "open") {
        this.status = "CONNECTED";
        this.currentQrText = null;
        this.currentQrDataUrl = null;
        this.logger.log("WhatsApp Web WebSocket connected successfully! Session is active.");
      }
    });
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  async getQrCode(): Promise<{ qrText: string; qrDataUrl?: string } | null> {
    if (!this.currentQrText) return null;
    return {
      qrText: this.currentQrText,
      qrDataUrl: this.currentQrDataUrl || undefined,
    };
  }

  async pairWithPhoneNumber(phone: string): Promise<{ pairingCode: string }> {
    if (!this.socket) {
      throw new Error("WhatsApp engine is not initialized");
    }

    const formatted = this.numberValidator.format(phone);
    this.status = "AUTHENTICATING";
    this.logger.log(`Requesting 8-digit pairing code for phone: ${formatted.cleanDigits}`);

    const code = await this.socket.requestPairingCode(formatted.cleanDigits);
    return { pairingCode: code };
  }

  async checkContactExists(phone: string): Promise<ContactValidationResult> {
    if (!this.socket || this.status !== "CONNECTED") {
      throw new Error("WhatsApp socket is not connected. Scan QR code first.");
    }

    const formatted = this.numberValidator.format(phone);
    const results = await this.socket.onWhatsApp(formatted.jid);

    if (results && results.length > 0 && results[0]?.exists) {
      return {
        phone: formatted.e164,
        exists: true,
        jid: results[0].jid,
        formattedNumber: formatted.e164,
      };
    }

    return {
      phone: formatted.e164,
      exists: false,
      formattedNumber: formatted.e164,
    };
  }

  async sendMessage(
    to: string,
    message: string,
    options?: SendMessageOptions
  ): Promise<SendMessageResult> {
    if (!this.socket || this.status !== "CONNECTED") {
      throw new Error("WhatsApp socket is not connected. Please authenticate first.");
    }

    const formatted = this.numberValidator.format(to);

    // 1. Process Spintax & Byte-Hash mutation
    const finalMessage = this.spintaxService.process(message, options?.applySpintax ?? true);

    // 2. Pre-send human typing presence simulation
    if (options?.simulateTyping ?? true) {
      const typingDuration = this.jitterService.getTypingDurationMs(finalMessage.length);
      try {
        await this.socket.presenceSubscribe(formatted.jid);
        await this.socket.sendPresenceUpdate("composing", formatted.jid);
        await this.jitterService.sleep(typingDuration);
        await this.socket.sendPresenceUpdate("paused", formatted.jid);
      } catch (err) {
        this.logger.warn(`Could not send typing presence indicator: ${(err as Error).message}`);
      }
    }

    // 3. Dispatch payload over Baileys WebSocket
    const sent = await this.socket.sendMessage(formatted.jid, {
      text: finalMessage,
    });

    const messageId = sent?.key?.id || `msg_${Date.now()}`;
    return {
      messageId,
      status: "sent",
      timestamp: new Date().toISOString(),
      jitterAppliedMs: options?.simulateTyping ? 3000 : 0,
    };
  }

  async logout(): Promise<void> {
    if (this.socket) {
      try {
        await this.socket.logout();
      } catch {
        // ignore
      }
      this.socket = null;
      this.status = "LOGGED_OUT";
      this.currentQrText = null;
      this.currentQrDataUrl = null;
    }
  }
}
