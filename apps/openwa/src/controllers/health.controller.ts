import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { OPENWA_BANNER, loadConfig } from "../config/openwa.config";
import { EngineFactory } from "../core/engines/engine.factory";

@ApiTags("System Health")
@Controller("api/v1/health")
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private readonly engineFactory: EngineFactory) {}

  @Get()
  @ApiOperation({ summary: "System Health & Gateway Status" })
  getHealth() {
    const config = loadConfig();
    const engine = this.engineFactory.getEngine();
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      name: "OpenWA - Self-Hosted WhatsApp API Gateway",
      version: "1.0.0",
      license: "MIT",
      banner: OPENWA_BANNER,
      status: "healthy",
      uptime: `${uptimeSec}s`,
      engine: {
        type: engine.name,
        status: engine.getStatus(),
      },
      storage: config.storageType,
      cache: config.cacheType,
      nodeVersion: process.version,
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
