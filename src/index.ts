import { accessIdentity, type AccessState } from "./access";
import { FamilyChat } from "./family-chat";
import type { ChatMessage, Env, FamilyChat as FamilyChatRpc, Member, Role } from "./types";
import { appHtml } from "./ui";

export { FamilyChat };

const FAMILY_DO_NAME = "default-family";

type Authed = { readonly member: Member; readonly family: FamilyChatRpc; readonly access: AccessState };

const json = (body: unknown, status = 200, headers?: HeadersInit): Response => Response.json(body, { status, headers });
const familyStub = (env: Env): FamilyChatRpc => env.FAMILY.getByName(FAMILY_DO_NAME) as unknown as FamilyChatRpc;
const publicOrigin = (request: Request): string => new URL(request.url).origin;

const requestJson = async (request: Request): Promise<Record<string, unknown>> => {
  const text = await request.text();
  if (text.trim().length === 0) return {};
  const value: unknown = JSON.parse(text);
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Expected a JSON object");
  return value as Record<string, unknown>;
};

const textField = (body: Record<string, unknown>, key: string): string => {
  const value = body[key];
  if (typeof value !== "string") throw new Error(`${key} is required`);
  return value;
};

const optionalTextField = (body: Record<string, unknown>, key: string): string | null => {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const accessInstructions = (request: Request, env: Env, state: AccessState): Record<string, unknown> => ({
  state: state.status,
  appUrl: publicOrigin(request),
  configured: Boolean(env.ACCESS_ISSUER?.trim() && env.ACCESS_AUDIENCE?.trim()),
  accessIssuer: env.ACCESS_ISSUER || "",
  steps: [
    "Create a Cloudflare Access self-hosted application for this workers.dev hostname or custom domain.",
    "Allow your family emails in the Access policy.",
    "Copy the Access application AUD tag into Worker variable ACCESS_AUDIENCE.",
    "Set ACCESS_ISSUER to your team domain, for example https://your-team.cloudflareaccess.com.",
    "Open the protected URL again and the first Access-authenticated user becomes owner.",
  ],
});

async function currentAccess(request: Request, env: Env): Promise<Authed | AccessState> {
  const access = await accessIdentity(request, env);
  if (access.status !== "ok" && access.status !== "local") return access;
  const family = familyStub(env);
  const member = await family.ensureAccessMember(access.identity);
  return { member, family, access };
}

async function requireAuth(request: Request, env: Env): Promise<Authed | Response> {
  const current = await currentAccess(request, env);
  if ("member" in current) return current;
  return json({ error: "Cloudflare Access identity is unavailable", access: accessInstructions(request, env, current) }, current.status === "missing_config" ? 503 : 401);
}

const formatTranscript = (messages: ChatMessage[]): string => messages.map((message) => `${message.authorName} (${message.kind}): ${message.text}`).join("\n");

const popupResult = (origin: string, ok: boolean, message: string): Response => {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const payload = JSON.stringify({ type: "familychat:mcp-oauth", ok, message });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>MCP authorization</title></head><body><p>${message}</p><script nonce="${nonce}">window.opener?.postMessage(${payload}, ${JSON.stringify(origin)});window.close();</script></body></html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`,
    },
  });
};

async function generateAgentReply(env: Env, family: FamilyChatRpc, actorId: string, workspaceId: string): Promise<string> {
  const transcript = await family.recentTranscript({ actorId, workspaceId, limit: 24 });
  const connectors = await family.listConnectors(actorId);
  const connectorNote = connectors.length === 0
    ? "No MCP connectors are configured yet."
    : `Configured MCP connectors (not invoked automatically yet): ${connectors.map((connector) => `${connector.label} (${connector.status})`).join(", ")}.`;
  const prompt = `You are Family Agent, a warm resident AI participant in a private Cloudflare Access-protected family chat. Humans can talk to each other without you. You respond only when asked through Ask Agent. Be concise, practical, family-friendly, and transparent about uncertainty.\n\n${connectorNote}\n\nRecent conversation:\n${formatTranscript(transcript)}\n\nReply as Family Agent.`;

  try {
    const options = env.AI_GATEWAY_ID?.trim() ? { gateway: { id: env.AI_GATEWAY_ID.trim(), skipCache: true } } : undefined;
    const response = await env.AI.run(env.AI_MODEL || "@cf/meta/llama-3.1-8b-instruct", { prompt }, options as never) as { response?: string; result?: { response?: string } };
    const text = response.response ?? response.result?.response;
    if (typeof text === "string" && text.trim().length > 0) return text.trim();
  } catch (error) {
    console.error(JSON.stringify({ message: "Workers AI request failed", error: error instanceof Error ? error.message : String(error) }));
  }
  return "I’m here with the family, but I could not reach Workers AI from this deployment yet. Check the account’s Workers AI/model access or choose another model in the Worker variables.";
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const family = familyStub(env);

  if (url.pathname === "/api/me" && request.method === "GET") {
    const current = await currentAccess(request, env);
    const setup = await family.setupStatus();
    return "member" in current
      ? json({ ok: true, access: { state: current.access.status }, member: current.member, setup })
      : json({ ok: false, access: accessInstructions(request, env, current), member: null, setup });
  }

  if (url.pathname === "/api/mcp/callback" && request.method === "GET") {
    const connectorId = url.searchParams.get("connector");
    if (connectorId === null) return popupResult(publicOrigin(request), false, "MCP callback is missing connector id");
    const result = await family.completeConnectorOAuth({ connectorId, callbackUrl: url.href, publicOrigin: publicOrigin(request) });
    return popupResult(publicOrigin(request), result.status === "connected", result.status === "connected" ? "MCP connector authorized." : result.lastError ?? "MCP authorization failed.");
  }

  const authed = await requireAuth(request, env);
  if (authed instanceof Response) return authed;

  if (url.pathname === "/api/members" && request.method === "GET") return json({ members: await authed.family.listMembers() });

  if (url.pathname === "/api/workspaces" && request.method === "GET") return json({ workspaces: await authed.family.listWorkspaces(authed.member.id) });
  if (url.pathname === "/api/workspaces" && request.method === "POST") {
    const body = await requestJson(request);
    return json(await authed.family.createWorkspace({ actorId: authed.member.id, title: textField(body, "title") }), 201);
  }

  const workspaceMessages = /^\/api\/workspaces\/([^/]+)\/messages\/?$/u.exec(url.pathname);
  if (workspaceMessages !== null && request.method === "GET") return json({ messages: await authed.family.listMessages({ actorId: authed.member.id, workspaceId: workspaceMessages[1] }) });
  if (workspaceMessages !== null && request.method === "POST") {
    const body = await requestJson(request);
    const target = optionalTextField(body, "target") === "agent" ? "agent" : "family";
    const message = await authed.family.appendFamilyMessage({
      actorId: authed.member.id,
      workspaceId: workspaceMessages[1],
      text: textField(body, "text"),
      kind: target === "agent" ? "agent-request" : "family",
    });
    const messages = [message];
    if (target === "agent") {
      const reply = await generateAgentReply(env, authed.family, authed.member.id, workspaceMessages[1]);
      messages.push(await authed.family.appendAgentMessage({ workspaceId: workspaceMessages[1], text: reply }));
    }
    return json({ messages }, 201);
  }

  if (url.pathname === "/api/connectors" && request.method === "GET") return json({ connectors: await authed.family.listConnectors(authed.member.id) });
  if (url.pathname === "/api/connectors" && request.method === "POST") {
    if (authed.member.role !== "owner" && authed.member.role !== "admin") return json({ error: "Only owners and admins can add connectors" }, 403);
    const body = await requestJson(request);
    return json(await authed.family.addConnector({ actorId: authed.member.id, label: textField(body, "label"), url: textField(body, "url"), publicOrigin: publicOrigin(request) }), 201);
  }

  const connectorRefresh = /^\/api\/connectors\/([^/]+)\/refresh\/?$/u.exec(url.pathname);
  if (connectorRefresh !== null && request.method === "POST") {
    if (authed.member.role !== "owner" && authed.member.role !== "admin") return json({ error: "Only owners and admins can refresh connectors" }, 403);
    return json(await authed.family.refreshConnector({ actorId: authed.member.id, connectorId: connectorRefresh[1], publicOrigin: publicOrigin(request) }));
  }

  const connectorTool = /^\/api\/connectors\/([^/]+)\/tools\/([^/]+)\/call\/?$/u.exec(url.pathname);
  if (connectorTool !== null && request.method === "POST") {
    if (authed.member.role !== "owner" && authed.member.role !== "admin") return json({ error: "Only owners and admins can call connector tools in this MVP" }, 403);
    const body = await requestJson(request);
    const args = typeof body.args === "object" && body.args !== null && !Array.isArray(body.args) ? body.args as Record<string, unknown> : {};
    return json(await authed.family.callConnectorTool({ actorId: authed.member.id, connectorId: connectorTool[1], toolName: decodeURIComponent(connectorTool[2]), publicOrigin: publicOrigin(request), args }));
  }

  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env);
      if (request.method === "GET" || request.method === "HEAD") return new Response(appHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      return json({ error: "Method not allowed" }, 405);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Request failed" }, 400);
    }
  },
} satisfies ExportedHandler<Env>;
