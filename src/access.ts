import { createRemoteJWKSet, jwtVerify } from "jose";

export type AccessIdentity = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
};

export type AccessState =
  | { readonly status: "ok"; readonly identity: AccessIdentity }
  | { readonly status: "local"; readonly identity: AccessIdentity }
  | { readonly status: "missing_config" }
  | { readonly status: "missing_jwt" }
  | { readonly status: "invalid_jwt" };

const jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function displayNameFromEmail(email: string): string {
  const local = email.split("@", 1)[0] || "Family member";
  const words = local
    .replace(/[._+-]+/gu, " ")
    .trim()
    .split(/\s+/gu)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`);
  return words.join(" ") || "Family member";
}

const accessJwks = (issuer: string): ReturnType<typeof createRemoteJWKSet> => {
  const normalized = issuer.replace(/\/+$/u, "");
  const existing = jwksByIssuer.get(normalized);
  if (existing !== undefined) return existing;
  const jwks = createRemoteJWKSet(new URL(`${normalized}/cdn-cgi/access/certs`));
  jwksByIssuer.set(normalized, jwks);
  return jwks;
};

export async function accessIdentity(request: Request, env: { ACCESS_ISSUER?: string; ACCESS_AUDIENCE?: string }): Promise<AccessState> {
  const url = new URL(request.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return { status: "local", identity: { id: "local-development", email: "developer@localhost", name: "Developer" } };
  }

  if (!env.ACCESS_ISSUER?.trim() || !env.ACCESS_AUDIENCE?.trim()) return { status: "missing_config" };

  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (assertion === null) return { status: "missing_jwt" };

  try {
    const issuer = env.ACCESS_ISSUER.replace(/\/+$/u, "");
    const { payload } = await jwtVerify(assertion, accessJwks(issuer), {
      issuer,
      audience: env.ACCESS_AUDIENCE,
      algorithms: ["RS256"],
    });
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!email.includes("@") || typeof payload.sub !== "string" || payload.sub.length === 0) return { status: "invalid_jwt" };
    const claimedName = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : displayNameFromEmail(email);
    return { status: "ok", identity: { id: payload.sub, email, name: claimedName } };
  } catch {
    return { status: "invalid_jwt" };
  }
}
