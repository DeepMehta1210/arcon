import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { OPENWA_BANNER, loadConfig } from "./config/openwa.config";

async function bootstrap() {
  const logger = new Logger("OpenWABootstrap");
  const config = loadConfig();

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    })
  );

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("OpenWA - Open Source WhatsApp API Gateway")
    .setDescription(
      `${OPENWA_BANNER}\n\n` +
        `Self-hosted, vendor-free WhatsApp HTTP API with pluggable architecture (SQLite / PostgreSQL / Baileys / Playwright) ` +
        `and native anti-ban Gaussian pacing engine.`
    )
    .setVersion("1.0.0")
    .setLicense("MIT", "https://opensource.org/licenses/MIT")
    .setContact("Deep Mehta", "https://3dices.com", "deep@3dices.com")
    .addTag("Authentication", "Pairing codes, session status, QR authentication")
    .addTag("Contacts & Numbers", "E.164 and Indian mobile validation (+91)")
    .addTag("Messages", "Single message dispatch and bulk Gaussian jitter queuing")
    .addTag("System Health", "Gateway telemetry and engine status")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document, {
    customSiteTitle: "OpenWA API Gateway Docs",
  });

  await app.listen(config.port);

  logger.log(`🚀 OpenWA Gateway is running on: http://localhost:${config.port}`);
  logger.log(`📚 Interactive OpenAPI Docs available at: http://localhost:${config.port}/docs`);
  logger.log(`⚙️  Active Engine: ${config.engineType.toUpperCase()} | Storage: ${config.storageType.toUpperCase()} | Cache: ${config.cacheType.toUpperCase()}`);
}

bootstrap();
