export type SessionPayload = {
  readonly memberId: string;
  readonly exp: number;
};

const encoder = new TextEncoder();

export const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

export const base64UrlDecode = (value: string): Uint8Array => {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const importKey = (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

const exactArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return `${body}.${base64UrlEncode(signature)}`;
}

export async function verifySession(token: string, secret: string, now = Date.now()): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) return null;
  const [body, signature] = parts;
  const key = await importKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, exactArrayBuffer(base64UrlDecode(signature)), encoder.encode(body));
  if (!ok) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as Partial<SessionPayload>;
    if (typeof parsed.memberId !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp <= now) return null;
    return { memberId: parsed.memberId, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function randomCode(bytes = 12): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return base64UrlEncode(data);
}
