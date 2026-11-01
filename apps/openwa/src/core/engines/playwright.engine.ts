import { Injectable, Logger } from "@nestjs/common";
import {
  IWhatsAppEngine,
  EngineStatus,
  SendMessageOptions,
  SendMessageResult,
  ContactValidationResult,
} from "../interfaces/whatsapp-engine.interface";
import { NumberValidatorService } from "../anti-ban/number-validator.service";
import { SpintaxService } from "../anti-ban/spintax.service";

@Injectable()
export class PlaywrightEngine implements IWhatsAppEngine {
  readonly name = "playwright";
  private readonly logger = new Logger(PlaywrightEngine.name);
  private status: EngineStatus = "DISCONNECTED";

  constructor(
    private readonly numberValidator: NumberValidatorService,
    private readonly spintaxService: SpintaxService
  ) {}

  async init(): Promise<void> {
    this.logger.log("Playwright Browser Engine initialized (pluggable visual fallback).");
    this.status = "INITIALIZING";
    // Pluggable browser driver interface
    this.status = "DISCONNECTED";
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  async getQrCode(): Promise<{ qrText: string; qrDataUrl?: string } | null> {
    return null;
  }

  async pairWithPhoneNumber(phone: string): Promise<{ pairingCode: string }> {
    const formatted = this.numberValidator.format(phone);
    return { pairingCode: `PW-${formatted.cleanDigits.slice(-4)}` };
  }

  async checkContactExists(phone: string): Promise<ContactValidationResult> {
    const formatted = this.numberValidator.format(phone);
    return {
      phone: formatted.e164,
      exists: formatted.isValidMobile,
      jid: formatted.jid,
    };
  }

  async sendMessage(
    to: string,
    message: string,
    options?: SendMessageOptions
  ): Promise<SendMessageResult> {
    const formatted = this.numberValidator.format(to);
    const finalMessage = this.spintaxService.process(message, options?.applySpintax ?? true);

    this.logger.log(`[PlaywrightEngine] Mock dispatch to ${formatted.e164}: ${finalMessage.slice(0, 30)}...`);

    return {
      messageId: `pw_${Date.now()}`,
      status: "sent",
      timestamp: new Date().toISOString(),
      jitterAppliedMs: 1500,
    };
  }

  async logout(): Promise<void> {
    this.status = "LOGGED_OUT";
  }
}
