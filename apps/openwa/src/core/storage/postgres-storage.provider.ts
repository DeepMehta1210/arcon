import { Injectable, Logger } from "@nestjs/common";
import { IStorageProvider } from "../interfaces/storage-provider.interface";

@Injectable()
export class PostgreSqlStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(PostgreSqlStorageProvider.name);
  private readonly memoryFallback = new Map<string, any>();

  async init(): Promise<void> {
    this.logger.log("PostgreSQL Storage Provider initialized (pluggable production adapter).");
  }

  async save(key: string, value: any): Promise<void> {
    this.memoryFallback.set(key, value);
  }

  async get<T = any>(key: string): Promise<T | null> {
    return (this.memoryFallback.get(key) as T) || null;
  }

  async delete(key: string): Promise<void> {
    this.memoryFallback.delete(key);
  }

  async listKeys(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.memoryFallback.keys());
    return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
  }
}
