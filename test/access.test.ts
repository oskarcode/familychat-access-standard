import { describe, expect, it } from "vitest";
import { accessIdentity, displayNameFromEmail } from "../src/access";

describe("Cloudflare Access helpers", () => {
  it("derives a friendly display name from email", () => {
    expect(displayNameFromEmail("alex.family+test@example.com")).toBe("Alex Family Test");
  });

  it("reports missing Access configuration on deployed hosts", async () => {
    const result = await accessIdentity(new Request("https://familychat.example.com/"), {});
    expect(result.status).toBe("missing_config");
  });

  it("uses a local developer identity on localhost", async () => {
    const result = await accessIdentity(new Request("http://localhost:8787/"), {});
    expect(result.status).toBe("local");
    if (result.status === "local") expect(result.identity.email).toBe("developer@localhost");
  });
});
