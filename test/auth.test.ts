import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "../src/crypto";
import { hasRetiredAuthConfig } from "../src/auth-config";

describe("FamilyChat password authentication", () => {
  it("hashes and verifies passwords without storing plaintext", async () => {
    const hash = await hashPassword("a-local-test-password");
    expect(hash).not.toContain("a-local-test-password");
    expect(await verifyPassword("a-local-test-password", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
    expect(await verifyPassword("a-local-test-password", null)).toBe(false);
    await expect(hashPassword("short")).rejects.toThrow("at least 8");
  });

  it("rejects expired sessions and signatures from another secret", async () => {
    const token = await signSession({ memberId: "test-member", exp: 2000 }, "test-secret");
    expect(await verifySession(token, "test-secret", 1000)).toEqual({ memberId: "test-member", exp: 2000 });
    expect(await verifySession(token, "test-secret", 2000)).toBeNull();
    expect(await verifySession(token, "different-secret", 1000)).toBeNull();
  });

  it("blocks retired auth configuration without adding another login mode", () => {
    expect(hasRetiredAuthConfig({})).toBe(false);
    expect(hasRetiredAuthConfig({ AUTH_MODE: "app" })).toBe(false);
    expect(hasRetiredAuthConfig({ AUTH_MODE: "access" })).toBe(true);
    expect(hasRetiredAuthConfig({ AUTH_MODE: "unknown-provider" })).toBe(true);
    expect(hasRetiredAuthConfig({ ACCESS_ISSUER: "https://legacy.example.com" })).toBe(true);
    expect(hasRetiredAuthConfig({ ACCESS_AUDIENCE: "legacy-audience" })).toBe(true);
  });
});
