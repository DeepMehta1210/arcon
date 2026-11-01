import { Injectable, Logger } from "@nestjs/common";
import { IWhatsAppEngine } from "../interfaces/whatsapp-engine.interface";
import { BaileysEngine } from "./baileys.engine";
import { PlaywrightEngine } from "./playwright.engine";
import { loadConfig } from "../../config/openwa.config";

@Injectable()
export class EngineFactory {
  private readonly logger = new Logger(EngineFactory.name);
  private activeEngine: IWhatsAppEngine;

  constructor(
    private readonly baileysEngine: BaileysEngine,
    private readonly playwrightEngine: PlaywrightEngine
  ) {
    const config = loadConfig();
    if (config.engineType === "playwright") {
      this.logger.log("Pluggable Engine selected: Playwright (Browser fallback)");
      this.activeEngine = this.playwrightEngine;
    } else {
      this.logger.log("Pluggable Engine selected: Baileys (Headless WebSocket)");
      this.activeEngine = this.baileysEngine;
    }
  }

  getEngine(): IWhatsAppEngine {
    return this.activeEngine;
  }
}
