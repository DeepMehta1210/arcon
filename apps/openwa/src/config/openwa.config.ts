export const OPENWA_BANNER = "YOU CAN NOW RUN WHATSAPP API ON YOUR OWN SERVER FOR FREE. 100% OPEN-SOURCE. SWIPE FOR MORE";

export interface OpenWAConfig {
  port: number;
  engineType: "baileys" | "playwright";
  storageType: "sqlite" | "postgres";
  cacheType: "memory" | "redis";
  sqliteDbPath: string;
  sessionDir: string;
  minJitterSec: number;
  maxJitterSec: number;
  typingDelayPerCharMs: number;
}

export function loadConfig(): OpenWAConfig {
  return {
    port: parseInt(process.env.OPENWA_PORT || "3050", 10),
    engineType: (process.env.OPENWA_ENGINE || "baileys") as "baileys" | "playwright",
    storageType: (process.env.OPENWA_STORAGE || "sqlite") as "sqlite" | "postgres",
    cacheType: (process.env.OPENWA_CACHE || "memory") as "memory" | "redis",
    sqliteDbPath: process.env.OPENWA_SQLITE_PATH || "./data/openwa.db",
    sessionDir: process.env.OPENWA_SESSION_DIR || "./data/sessions",
    minJitterSec: parseInt(process.env.OPENWA_MIN_JITTER_SEC || "45", 10),
    maxJitterSec: parseInt(process.env.OPENWA_MAX_JITTER_SEC || "90", 10),
    typingDelayPerCharMs: parseInt(process.env.OPENWA_TYPING_MS || "35", 10),
  };
}
