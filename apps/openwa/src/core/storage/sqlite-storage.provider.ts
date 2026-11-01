import { Injectable, Logger } from "@nestjs/common";
import { IStorageProvider } from "../interfaces/storage-provider.interface";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { existsSync } from "node:fs";

@Injectable()
export class SQLiteStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(SQLiteStorageProvider.name);
  private readonly storageDir: string;

  constructor(storageDir = "./data/sessions") {
    this.storageDir = path.resolve(storageDir);
  }

  async init(): Promise<void> {
    if (!existsSync(this.storageDir)) {
      await fs.mkdir(this.storageDir, { recursive: true });
    }
    this.logger.log(`SQLite / File-backed session storage initialized at: ${this.storageDir}`);
  }

  private getFilePath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9_\-]/g, "_");
    return path.join(this.storageDir, `${safeKey}.json`);
  }

  async save(key: string, value: any): Promise<void> {
    const filePath = this.getFilePath(key);
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
  }

  async get<T = any>(key: string): Promise<T | null> {
    const filePath = this.getFilePath(key);
    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
    } catch {
      // ignored if file does not exist
    }
  }

  async listKeys(prefix?: string): Promise<string[]> {
    try {
      const files = await fs.readdir(this.storageDir);
      const keys = files
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(/\.json$/, ""));
      return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
    } catch {
      return [];
    }
  }
}
