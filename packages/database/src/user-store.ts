import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

export type UserRole = "admin" | "sales" | "viewer";

export interface StoredUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<StoredUser, "passwordHash">;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(":");
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
  } catch {
    return false;
  }
}

function getDataDir(): string {
  const candidates = [
    join(process.cwd(), "packages/database/data"),
    join(process.cwd(), "../../packages/database/data"),
    "C:/Users/DeepMehta/Organiz/Codes/arcon/packages/database/data"
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "C:/Users/DeepMehta/Organiz/Codes/arcon/packages/database/data";
}

const DATA_DIR = getDataDir();
const USERS_FILE = join(DATA_DIR, "users.json");

export class UserStore {
  private static instance: UserStore;
  private users: Map<string, StoredUser> = new Map();

  private constructor() {
    this.loadFromDisk();
    this.seedDefaultAdmin();
  }

  public static getInstance(): UserStore {
    if (!UserStore.instance) {
      UserStore.instance = new UserStore();
    }
    return UserStore.instance;
  }

  private loadFromDisk(): void {
    try {
      if (existsSync(USERS_FILE)) {
        const raw = readFileSync(USERS_FILE, "utf-8");
        const list: StoredUser[] = JSON.parse(raw);
        this.users.clear();
        for (const user of list) {
          this.users.set(user.id, user);
        }
      }
    } catch {
      // In-memory fallback
    }
  }

  private saveToDisk(): void {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }
      const list = Array.from(this.users.values());
      writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch {
      // Ignore disk write errors in non-persisted environments
    }
  }

  private seedDefaultAdmin(): void {
    const adminEmail = "deep@3dices.com";
    const existing = this.getUserByEmail(adminEmail);
    if (!existing) {
      const defaultPassword = process.env.ADMIN_PASSWORD || "ArconAdmin2026!";
      const now = new Date().toISOString();
      const admin: StoredUser = {
        id: "user-admin-deep",
        email: adminEmail,
        fullName: "Deep Mehta",
        passwordHash: hashPassword(defaultPassword),
        role: "admin",
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      this.users.set(admin.id, admin);
      this.saveToDisk();
    }
  }

  public getUserByEmail(email: string): StoredUser | null {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  public getUserById(id: string): StoredUser | null {
    return this.users.get(id) || null;
  }

  public getAllUsers(): SafeUser[] {
    return Array.from(this.users.values()).map(({ passwordHash: _, ...rest }) => rest);
  }

  public verifyCredentials(email: string, password: string): SafeUser | null {
    const user = this.getUserByEmail(email);
    if (!user || user.status !== "active") return null;

    // Check hashed password
    if (verifyPassword(password, user.passwordHash)) {
      const { passwordHash: _, ...safe } = user;
      return safe;
    }

    // Support legacy/env password fallback during rollout
    const legacyAdminPass = process.env.ADMIN_PASSWORD || "ArconAdmin2026!";
    if (user.email.toLowerCase() === "deep@3dices.com" && (password === legacyAdminPass || password === "arcon2026!")) {
      // Auto-migrate to current password hash
      user.passwordHash = hashPassword(password);
      this.saveToDisk();
      const { passwordHash: _, ...safe } = user;
      return safe;
    }

    return null;
  }

  public createUser(params: {
    email: string;
    fullName: string;
    password: string;
    role: UserRole;
  }): SafeUser {
    const normalizedEmail = params.email.trim().toLowerCase();
    if (this.getUserByEmail(normalizedEmail)) {
      throw new Error(`User with email "${normalizedEmail}" already exists`);
    }

    const now = new Date().toISOString();
    const newUser: StoredUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email: normalizedEmail,
      fullName: params.fullName.trim(),
      passwordHash: hashPassword(params.password),
      role: params.role,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(newUser.id, newUser);
    this.saveToDisk();

    const { passwordHash: _, ...safe } = newUser;
    return safe;
  }

  public deleteUser(id: string, requesterId?: string): boolean {
    if (requesterId && requesterId === id) {
      throw new Error("You cannot delete your own admin account");
    }

    const user = this.users.get(id);
    if (!user) return false;

    if (user.email.toLowerCase() === "deep@3dices.com") {
      throw new Error("The primary super admin account cannot be deleted");
    }

    const deleted = this.users.delete(id);
    if (deleted) {
      this.saveToDisk();
    }
    return deleted;
  }
}
