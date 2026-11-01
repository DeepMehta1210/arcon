import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { AuthController } from "./controllers/auth.controller";
import { ContactsController } from "./controllers/contacts.controller";
import { MessagesController } from "./controllers/messages.controller";
import { HealthController } from "./controllers/health.controller";
import { EngineFactory } from "./core/engines/engine.factory";
import { BaileysEngine } from "./core/engines/baileys.engine";
import { PlaywrightEngine } from "./core/engines/playwright.engine";
import { SQLiteStorageProvider } from "./core/storage/sqlite-storage.provider";
import { PostgreSqlStorageProvider } from "./core/storage/postgres-storage.provider";
import { MemoryCacheProvider } from "./core/cache/memory-cache.provider";
import { RedisCacheProvider } from "./core/cache/redis-cache.provider";
import { GaussianJitterService } from "./core/anti-ban/gaussian-jitter.service";
import { SpintaxService } from "./core/anti-ban/spintax.service";
import { NumberValidatorService } from "./core/anti-ban/number-validator.service";
import { OPENWA_BANNER } from "./config/openwa.config";

@Module({
  imports: [],
  controllers: [AuthController, ContactsController, MessagesController, HealthController],
  providers: [
    GaussianJitterService,
    SpintaxService,
    NumberValidatorService,
    SQLiteStorageProvider,
    PostgreSqlStorageProvider,
    MemoryCacheProvider,
    RedisCacheProvider,
    BaileysEngine,
    PlaywrightEngine,
    EngineFactory,
  ],
  exports: [EngineFactory, NumberValidatorService, GaussianJitterService, SpintaxService],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly engineFactory: EngineFactory) {}

  async onModuleInit() {
    this.logger.log("================================================================================");
    this.logger.log(`📢 ${OPENWA_BANNER}`);
    this.logger.log("================================================================================");

    const engine = this.engineFactory.getEngine();
    try {
      await engine.init();
    } catch (err) {
      this.logger.error(`Engine auto-init warning: ${(err as Error).message}`);
    }
  }
}
