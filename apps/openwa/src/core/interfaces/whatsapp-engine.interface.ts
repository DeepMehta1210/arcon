export type EngineStatus =
  | "DISCONNECTED"
  | "INITIALIZING"
  | "SCAN_QR"
  | "AUTHENTICATING"
  | "CONNECTED"
  | "LOGGED_OUT";

export interface SendMessageOptions {
  simulateTyping?: boolean;
  applySpintax?: boolean;
  quotedMessageId?: string;
}

export interface SendMessageResult {
  messageId: string;
  status: "sent" | "delivered" | "failed";
  timestamp: string;
  jitterAppliedMs: number;
}

export interface ContactValidationResult {
  phone: string;
  exists: boolean;
  jid?: string;
  formattedNumber?: string;
}

export interface IWhatsAppEngine {
  readonly name: string;
  init(): Promise<void>;
  getStatus(): EngineStatus;
  getQrCode(): Promise<{ qrText: string; qrDataUrl?: string } | null>;
  pairWithPhoneNumber(phone: string): Promise<{ pairingCode: string }>;
  checkContactExists(phone: string): Promise<ContactValidationResult>;
  sendMessage(to: string, message: string, options?: SendMessageOptions): Promise<SendMessageResult>;
  logout(): Promise<void>;
}
