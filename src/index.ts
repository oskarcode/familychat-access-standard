import { hasRetiredAuthConfig } from "./auth-config";
import { hashPassword, signSession, verifySession } from "./crypto";
import { FamilyChat } from "./family-chat";
import type { AiProvider, ChatMessage, Env, FamilyChat as FamilyChatRpc, Member, Role } from "./types";
import { appHtml } from "./ui";

export { FamilyChat };

const FAMILY_DO_NAME = "default-family";
const SESSION_COOKIE = "familychat_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type Authed = { readonly member: Member; readonly family: FamilyChatRpc };

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

const AI_MODELS = [
  { provider: "workers-ai", id: "@cf/meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B Instruct", description: "Fast default open-weight model on Workers AI." },
  { provider: "workers-ai", id: "@cf/meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B Instruct", description: "Larger open-weight Llama model where available." },
  { provider: "workers-ai", id: "@cf/mistral/mistral-7b-instruct-v0.2", label: "Mistral 7B Instruct", description: "Small efficient open-weight model." },
  { provider: "workers-ai", id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", label: "DeepSeek R1 Distill Qwen 32B", description: "Reasoning-oriented open-weight model where available." },
  { provider: "workers-ai", id: "@cf/moonshotai/kimi-k2.5", label: "Kimi K2.5", description: "Moonshot AI frontier open model on Workers AI; older/deprecated but useful where still enabled." },
  { provider: "workers-ai", id: "@cf/moonshotai/kimi-k2.6", label: "Kimi K2.6", description: "Moonshot AI frontier open model on Workers AI; may require Workers Paid." },
  { provider: "workers-ai", id: "@cf/moonshotai/kimi-k2.7-code", label: "Kimi K2.7 Code", description: "Moonshot AI agentic coding model on Workers AI; may require Workers Paid." },
  { provider: "workers-ai", id: "@cf/zai-org/glm-4.7-flash", label: "GLM-4.7 Flash", description: "Fast multilingual Z.ai model with long context." },
  { provider: "workers-ai", id: "@cf/zai-org/glm-5.2", label: "GLM-5.2", description: "Z.ai flagship agentic model on Workers AI; may require Workers Paid." },
  { provider: "workers-ai", id: "@cf/zai-org/glm-5.3-flash", label: "GLM-5.3 Flash", description: "Fast Z.ai GLM-5 generation where available." },
  { provider: "workers-ai", id: "@cf/zai-org/glm-5.3", label: "GLM-5.3", description: "Larger Z.ai GLM-5 generation where available." },
  { provider: "anthropic", id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", description: "Bring your own Anthropic API key." },
  { provider: "anthropic", id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet", description: "Bring your own Anthropic API key." },
] as const;

const defaultAiModel = (env: Env): string => env.AI_MODEL || "@cf/meta/llama-3.1-8b-instruct";

const textField = (body: Record<string, unknown>, key: string): string => {
  const value = body[key];
  if (typeof value !== "string") throw new Error(`${key} is required`);
  return value;
};

const optionalTextField = (body: Record<string, unknown>, key: string): string | null => {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const cookieValue = (request: Request, name: string): string | null => {
  const cookie = request.headers.get("Cookie");
  if (cookie === null) return null;
  for (const part of cookie.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return rawValue.join("=");
  }
  return null;
};

const sessionCookie = async (memberId: string, secret: string, request: Request): Promise<string> => {
  const token = await signSession({ memberId, exp: Date.now() + SESSION_TTL_MS }, secret);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
};

const clearCookie = (): string => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

/**
 * Input:
 * - See the TypeScript parameters for `currentAppSession`; callers pass runtime data from HTTP requests, Durable Object state, or helper modules.
 *
 * Output:
 * - Returns the typed value or Promise declared in the signature; errors are surfaced to the route handler or caller.
 *
 * What this function does:
 * - Owns the `currentAppSession` step in the FamilyChat request, auth, state, AI, MCP, schedule, or follow-up flow.
 * - Keep validation and side effects here aligned with the route and Durable Object documentation.
 */
async function currentAppSession(request: Request, env: Env): Promise<Authed | null> {
  if (!env.SESSION_SECRET) return null;
  const token = cookieValue(request, SESSION_COOKIE);
  if (token === null) return null;
  const payload = await verifySession(token, env.SESSION_SECRET);
  if (payload === null) return null;
  const family = familyStub(env);
  const member = await family.getMember(payload.memberId);
  return member === null ? null : { member, family };
}

/**
 * Input:
 * - See the TypeScript parameters for `requireAuth`; callers pass runtime data from HTTP requests, Durable Object state, or helper modules.
 *
 * Output:
 * - Returns the typed value or Promise declared in the signature; errors are surfaced to the route handler or caller.
 *
 * What this function does:
 * - Owns the `requireAuth` step in the FamilyChat request, auth, state, AI, MCP, schedule, or follow-up flow.
 * - Keep validation and side effects here aligned with the route and Durable Object documentation.
 */
async function requireAuth(request: Request, env: Env): Promise<Authed | Response> {
  const current = await currentAppSession(request, env);
  return current ?? json({ error: "Sign in required" }, 401);
}

const formatTranscript = (messages: ChatMessage[]): string => messages.map((message) => `${message.authorName} (${message.kind}): ${message.text}`).join("\n");

const aiText = (value: unknown): string | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ["response", "text", "output_text"] as const) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
  }
  const result = record.result;
  if (typeof result === "object" && result !== null) {
    const nested = aiText(result);
    if (nested) return nested;
  }
  const choices = record.choices;
  if (Array.isArray(choices)) {
    const parts = choices.flatMap((choice) => {
      if (typeof choice !== "object" || choice === null) return [];
      const message = (choice as Record<string, unknown>).message;
      if (typeof message === "object" && message !== null && typeof (message as Record<string, unknown>).content === "string") return [(message as Record<string, string>).content];
      if (typeof (choice as Record<string, unknown>).text === "string") return [(choice as Record<string, string>).text];
      return [];
    }).filter(Boolean);
    if (parts.length > 0) return parts.join("\n").trim();
  }
  return undefined;
};

const transcriptMessages = (transcript: ChatMessage[], system: string): Array<{ role: "system" | "user" | "assistant"; content: string }> => [
  { role: "system", content: system },
  ...transcript.map((message) => ({
    role: message.kind === "agent" ? "assistant" as const : "user" as const,
    content: `${message.authorName}: ${message.text}`,
  })),
];

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

/**
 * Input:
 * - See the TypeScript parameters for `generateAgentReply`; callers pass runtime data from HTTP requests, Durable Object state, or helper modules.
 *
 * Output:
 * - Returns the typed value or Promise declared in the signature; errors are surfaced to the route handler or caller.
 *
 * What this function does:
 * - Owns the `generateAgentReply` step in the FamilyChat request, auth, state, AI, MCP, schedule, or follow-up flow.
 * - Keep validation and side effects here aligned with the route and Durable Object documentation.
 */
async function generateAgentReply(env: Env, family: FamilyChatRpc, actorId: string, workspaceId: string): Promise<string> {
  const transcript = await family.recentTranscript({ actorId, workspaceId, limit: 24 });
  const [connectors, skills, schedules] = await Promise.all([
    family.listConnectors(actorId),
    family.listSkills(actorId),
    family.listSchedules({ actorId, from: Date.now(), to: Date.now() + 14 * 24 * 60 * 60 * 1000 }),
  ]);
  const connectorNote = connectors.length === 0
    ? "No MCP connectors are configured yet."
    : `Configured MCP connectors (not invoked automatically yet): ${connectors.map((connector) => `${connector.label} (${connector.status})`).join(", ")}.`;
  const enabledSkills = skills.filter((skill) => skill.enabled);
  const skillNote = enabledSkills.length === 0
    ? "No family skills are enabled yet."
    : `Enabled family skills: ${enabledSkills.map((skill) => `${skill.title} (${skill.slug}): ${skill.description}`).join("; ")}.`;
  const scheduleNote = schedules.length === 0
    ? "No upcoming family schedules are saved."
    : `Upcoming family schedules: ${schedules.slice(0, 12).map((schedule) => `${new Date(schedule.runAt).toISOString()} ${schedule.workspaceTitle ?? "Room"}: ${schedule.instruction}`).join("; ")}. If asked to create or change a schedule, explain that this standard version currently saves schedules from Settings → Calendar.`;
  const system = `You are Family Agent, a warm resident AI participant in a private family chat. Humans can talk to each other without you. You respond only when asked through Ask Agent. Be concise, practical, family-friendly, and transparent about uncertainty. ${connectorNote} ${skillNote} ${scheduleNote}`;
  const prompt = `${system}\n\nRecent conversation:\n${formatTranscript(transcript)}\n\nReply as Family Agent.`;
  const messages = transcriptMessages(transcript, system);

  const settings = await family.getAiRuntimeSettings(actorId);
  const provider = settings?.provider ?? "workers-ai";
  const model = settings?.model ?? defaultAiModel(env);
  let failureDetail = "";
  try {
    if (provider === "anthropic") {
      if (!settings?.apiKey) return "I’m ready to use Claude, but an owner/admin still needs to save an Anthropic API key in Connections → Agent model.";
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": settings.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 800, system, messages: transcript.map((message) => ({ role: message.kind === "agent" ? "assistant" : "user", content: `${message.authorName}: ${message.text}` })) }),
      });
      const data = await response.json() as { content?: Array<{ type?: string; text?: string }>; error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message || `Anthropic request failed (${response.status})`);
      const text = data.content?.flatMap((part) => part.type === "text" && part.text ? [part.text] : []).join("\n");
      if (text && text.trim().length > 0) return text.trim();
    } else {
      const options = env.AI_GATEWAY_ID?.trim() ? { gateway: { id: env.AI_GATEWAY_ID.trim(), skipCache: true } } : undefined;
      let response: unknown;
      try {
        response = await env.AI.run(model, { messages }, options as never);
      } catch (messageError) {
        console.warn(JSON.stringify({ message: "Workers AI messages input failed; retrying prompt input", model, error: messageError instanceof Error ? messageError.message : String(messageError) }));
        response = await env.AI.run(model, { prompt }, options as never);
      }
      const text = aiText(response);
      if (text && text.trim().length > 0) return text.trim();
    }
  } catch (error) {
    failureDetail = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ message: "AI request failed", provider, model, error: failureDetail }));
  }
  return provider === "anthropic"
    ? `I’m here with the family, but I could not reach Anthropic with the saved Claude settings. Check the API key/model in Connections → Agent model.${failureDetail ? ` Details: ${failureDetail}` : ""}`
    : `I’m here with the family, but I could not reach Workers AI model ${model} from this deployment. Try GLM-4.7 Flash or Llama 3.1 8B, configure an AI Gateway with unified billing, or switch to Claude with your own Anthropic API key.${failureDetail ? ` Details: ${failureDetail}` : ""}`;
}

/**
 * Input:
 * - See the TypeScript parameters for `handleApi`; callers pass runtime data from HTTP requests, Durable Object state, or helper modules.
 *
 * Output:
 * - Returns the typed value or Promise declared in the signature; errors are surfaced to the route handler or caller.
 *
 * What this function does:
 * - Owns the `handleApi` step in the FamilyChat request, auth, state, AI, MCP, schedule, or follow-up flow.
 * - Keep validation and side effects here aligned with the route and Durable Object documentation.
 */
async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const family = familyStub(env);

  if (url.pathname === "/api/me" && request.method === "GET") {
    const setup = await family.setupStatus();
    const current = await currentAppSession(request, env);
    return json({ ok: current !== null, configured: Boolean(env.SESSION_SECRET && env.SETUP_TOKEN), member: current?.member ?? null, setup });
  }

  if (url.pathname === "/api/setup" && request.method === "POST") {
    if (!env.SESSION_SECRET || !env.SETUP_TOKEN) return json({ error: "SESSION_SECRET and SETUP_TOKEN must be configured" }, 500);
    const body = await requestJson(request);
    const member = await family.setupAppOwner({
      token: textField(body, "token"),
      expectedToken: env.SETUP_TOKEN,
      familyName: optionalTextField(body, "familyName") || undefined,
      name: textField(body, "name"),
      email: textField(body, "email"),
      passwordHash: await hashPassword(textField(body, "password")),
    });
    return json({ member }, 201, { "Set-Cookie": await sessionCookie(member.id, env.SESSION_SECRET, request) });
  }

  if (url.pathname === "/api/login" && request.method === "POST") {
    if (!env.SESSION_SECRET) return json({ error: "SESSION_SECRET is not configured" }, 500);
    const body = await requestJson(request);
    const member = await family.loginAppMember({ email: textField(body, "email"), password: textField(body, "password") });
    return json({ member }, 200, { "Set-Cookie": await sessionCookie(member.id, env.SESSION_SECRET, request) });
  }

  if (url.pathname === "/api/join" && request.method === "POST") {
    if (!env.SESSION_SECRET) return json({ error: "SESSION_SECRET is not configured" }, 500);
    const body = await requestJson(request);
    const member = await family.joinWithInvite({
      code: textField(body, "code"),
      name: textField(body, "name"),
      email: textField(body, "email"),
      passwordHash: await hashPassword(textField(body, "password")),
    });
    return json({ member }, 201, { "Set-Cookie": await sessionCookie(member.id, env.SESSION_SECRET, request) });
  }

  if (url.pathname === "/api/logout" && request.method === "POST") return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });

  if (url.pathname === "/api/mcp/callback" && request.method === "GET") {
    const connectorId = url.searchParams.get("connector");
    if (connectorId === null) return popupResult(publicOrigin(request), false, "MCP callback is missing connector id");
    const result = await family.completeConnectorOAuth({ connectorId, callbackUrl: url.href, publicOrigin: publicOrigin(request) });
    return popupResult(publicOrigin(request), result.status === "connected", result.status === "connected" ? "MCP connector authorized." : result.lastError ?? "MCP authorization failed.");
  }

  const authed = await requireAuth(request, env);
  if (authed instanceof Response) return authed;

  if (url.pathname === "/api/members" && request.method === "GET") return json({ members: await authed.family.listMembers() });

  if (url.pathname === "/api/invites/accept" && request.method === "POST") {
    const body = await requestJson(request);
    return json(await authed.family.acceptInvite({ actorId: authed.member.id, code: textField(body, "code") }));
  }
  if (url.pathname === "/api/invites" && request.method === "GET") {
    return json({ invites: await authed.family.listInvites({ actorId: authed.member.id, workspaceId: url.searchParams.get("workspaceId") || "" }) });
  }
  const inviteMatch = /^\/api\/invites\/([^/]+)$/u.exec(url.pathname);
  if (inviteMatch && request.method === "DELETE") {
    await authed.family.revokeInvite({ actorId: authed.member.id, code: decodeURIComponent(inviteMatch[1]) });
    return json({ ok: true });
  }

  if (url.pathname === "/api/invites" && request.method === "POST") {
    if (authed.member.role !== "owner" && authed.member.role !== "admin") return json({ error: "Only owners and admins can invite members" }, 403);
    const body = await requestJson(request);
    const role: Role = optionalTextField(body, "role") === "admin" ? "admin" : "member";
    const workspaceId = textField(body, "workspaceId");
    const invite = await authed.family.createInvite({ actorId: authed.member.id, workspaceId, role });
    return json({ ...invite, url: `${publicOrigin(request)}/?invite=${encodeURIComponent(invite.code)}&workspace=${encodeURIComponent(invite.workspaceId)}` }, 201);
  }

  if (url.pathname === "/api/schedules" && request.method === "GET") {
    const from = Number(url.searchParams.get("from") ?? Date.now() - 24 * 60 * 60 * 1000);
    const to = Number(url.searchParams.get("to") ?? Date.now() + 60 * 24 * 60 * 60 * 1000);
    return json({ schedules: await authed.family.listSchedules({ actorId: authed.member.id, from, to }) });
  }
  if (url.pathname === "/api/schedules" && request.method === "POST") {
    const body = await requestJson(request);
    return json(await authed.family.createSchedule({ actorId: authed.member.id, workspaceId: textField(body, "workspaceId"), instruction: textField(body, "instruction"), runAt: Number(body.runAt) }), 201);
  }
  const scheduleMatch = /^\/api\/schedules\/([^/]+)\/?$/u.exec(url.pathname);
  if (scheduleMatch !== null && request.method === "DELETE") return json({ deleted: await authed.family.deleteSchedule({ actorId: authed.member.id, scheduleId: decodeURIComponent(scheduleMatch[1]) }) });

  if (url.pathname === "/api/ai/settings" && request.method === "GET") {
    const settings = await authed.family.getAiSettings(authed.member.id);
    return json({
      models: AI_MODELS,
      settings: settings ?? { provider: "workers-ai", model: defaultAiModel(env), apiKeyConfigured: false },
    });
  }
  if (url.pathname === "/api/ai/settings" && request.method === "POST") {
    if (authed.member.role !== "owner" && authed.member.role !== "admin") return json({ error: "Only owners and admins can update AI settings" }, 403);
    const body = await requestJson(request);
    const provider = optionalTextField(body, "provider") === "anthropic" ? "anthropic" : "workers-ai";
    const settings = await authed.family.updateAiSettings({
      actorId: authed.member.id,
      provider: provider as AiProvider,
      model: textField(body, "model"),
      apiKey: optionalTextField(body, "apiKey"),
    });
    return json({ settings });
  }

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

  if (url.pathname === "/api/skills" && request.method === "GET") return json({ skills: await authed.family.listSkills(authed.member.id) });
  if (url.pathname === "/api/skills" && request.method === "POST") {
    if (authed.member.role !== "owner" && authed.member.role !== "admin") return json({ error: "Only owners and admins can create skills" }, 403);
    const body = await requestJson(request);
    return json(await authed.family.createSkill({ actorId: authed.member.id, title: textField(body, "title"), description: textField(body, "description") }), 201);
  }
  const skillFiles = /^\/api\/skills\/([^/]+)\/files\/?$/u.exec(url.pathname);
  if (skillFiles !== null && request.method === "GET") return json({ files: await authed.family.listSkillFiles({ actorId: authed.member.id, skillId: skillFiles[1] }) });
  if (skillFiles !== null && request.method === "PUT") {
    const body = await requestJson(request);
    return json(await authed.family.updateSkillFile({ actorId: authed.member.id, skillId: skillFiles[1], path: optionalTextField(body, "path") || "SKILL.md", content: textField(body, "content") }));
  }
  const skillEnable = /^\/api\/skills\/([^/]+)\/enabled\/?$/u.exec(url.pathname);
  if (skillEnable !== null && request.method === "POST") {
    const body = await requestJson(request);
    return json(await authed.family.setSkillEnabled({ actorId: authed.member.id, skillId: skillEnable[1], enabled: body.enabled !== false }));
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
  /**
   * Input:
   * - See the TypeScript parameters for `fetch`; callers pass runtime data from HTTP requests, Durable Object state, or helper modules.
   *
   * Output:
   * - Returns the typed value or Promise declared in the signature; errors are surfaced to the route handler or caller.
   *
   * What this function does:
   * - Owns the `fetch` step in the FamilyChat request, auth, state, AI, MCP, schedule, or follow-up flow.
   * - Keep validation and side effects here aligned with the route and Durable Object documentation.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      // Fail closed for old deployments; removing a login provider must not silently change auth.
      if (hasRetiredAuthConfig(env)) return json({ error: "This installation uses retired authentication settings. Keep its previous release until an explicit migration is planned; use a new Worker for this edition." }, 503);
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env);
      if (request.method === "GET" || request.method === "HEAD") return new Response(appHtml, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
      return json({ error: "Method not allowed" }, 405);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Request failed" }, 400);
    }
  },
} satisfies ExportedHandler<Env>;
