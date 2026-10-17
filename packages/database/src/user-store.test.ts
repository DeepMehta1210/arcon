import { describe, expect, it } from "bun:test";
import { UserStore, hashPassword, verifyPassword } from "./user-store";

describe("UserStore & Cryptographic RBAC", () => {
  it("hashes and securely verifies passwords using salt and scrypt", () => {
    const raw = "SuperSecretPassword2026!";
    const hash = hashPassword(raw);
    expect(hash).toContain(":");
    expect(verifyPassword(raw, hash)).toBe(true);
    expect(verifyPassword("WrongPassword123", hash)).toBe(false);
  });

  it("seeds primary super admin deep@3dices.com with admin role", () => {
    const store = UserStore.getInstance();
    const admin = store.getUserByEmail("deep@3dices.com");
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe("admin");
    expect(admin?.email).toBe("deep@3dices.com");
  });

  it("authenticates valid credentials for admin", () => {
    const store = UserStore.getInstance();
    const authed = store.verifyCredentials("deep@3dices.com", "ArconAdmin2026!");
    expect(authed).not.toBeNull();
    expect(authed?.role).toBe("admin");
    expect(authed?.email).toBe("deep@3dices.com");
  });

  it("rejects invalid password for existing user", () => {
    const store = UserStore.getInstance();
    const authed = store.verifyCredentials("deep@3dices.com", "InvalidPasswordXYZ");
    expect(authed).toBeNull();
  });

  it("creates, retrieves, and enforces role for new team member", () => {
    const store = UserStore.getInstance();
    const testEmail = `sales-${Date.now()}@3dices.com`;
    const created = store.createUser({
      email: testEmail,
      fullName: "Test Sales Rep",
      password: "TestPassword123!",
      role: "sales",
    });

    expect(created.email).toBe(testEmail);
    expect(created.role).toBe("sales");

    // Verify credentials
    const authed = store.verifyCredentials(testEmail, "TestPassword123!");
    expect(authed).not.toBeNull();
    expect(authed?.role).toBe("sales");

    // Clean up
    const deleted = store.deleteUser(created.id);
    expect(deleted).toBe(true);
  });

  it("prevents deleting primary super admin", () => {
    const store = UserStore.getInstance();
    const admin = store.getUserByEmail("deep@3dices.com");
    expect(admin).not.toBeNull();
    if (admin) {
      expect(() => store.deleteUser(admin.id)).toThrow();
    }
  });
});
