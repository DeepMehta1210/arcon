export interface IStorageProvider {
  init(): Promise<void>;
  save(key: string, value: any): Promise<void>;
  get<T = any>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  listKeys(prefix?: string): Promise<string[]>;
}
