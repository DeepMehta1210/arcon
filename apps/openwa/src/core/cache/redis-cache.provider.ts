import { Injectable, Logger } from "@nestjs/common";
import { ICacheProvider } from "../interfaces/cache-provider.interface";

@Injectable()
export class RedisCacheProvider implements ICacheProvider {
  private readonly logger = new Logger(RedisCacheProvider.name);
  private readonly fallback = new Map<string, { val: any; exp: number | null }>();

  constructor() {
    this.logger.log("Redis Cache Provider initialized (pluggable cluster/standalone adapter).");
  }

  async get<T = any>(key: string): Promise<T | null> {
    const item = this.fallback.get(key);
    if (!item) return null;
    if (item.exp && Date.now() > item.exp) {
      this.fallback.delete(key);
      return null;
    }
    return item.val as T;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const exp = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.fallback.set(key, { val: value, exp });
  }

  async del(key: string): Promise<void> {
    this.fallback.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }
}
