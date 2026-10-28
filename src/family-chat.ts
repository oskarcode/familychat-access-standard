import { DurableObject } from "cloudflare:workers";
import { randomCode } from "./crypto";
import { callMcpTool, completeMcpOAuth, connectAndListTools, type McpOAuthStateAccess, type StoredMcpConnector } from "./mcp";
import type { ChatMessage, Connector, Env, McpToolSummary, Member, Role, SetupStatus, Workspace } from "./types";

const now = (): number => Date.now();
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 8000;

const safeText = (value: string, label: string, max = 200): string => {
  const text = value.trim();
  if (text.length === 0) throw new Error(`${label} is required`);
  if (text.length > max) throw new Error(`${label} is too long`);
  return text;
};

const normalizeRole = (role: Role): Role => (role === "owner" || role === "admin" ? role : "member");

export class FamilyChat extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(() => this.initialize());
  }

  private async initialize(): Promise<void> {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL,
        password_hash TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS invites (
        code TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        used_by TEXT
      );
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workspace_members (
        workspace_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (workspace_id, member_id)
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        kind TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS connectors (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        url TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'untested',
        oauth_state TEXT,
        tool_cache TEXT NOT NULL DEFAULT '[]',
        authorization_url TEXT,
        last_error TEXT
      );
      CREATE INDEX IF NOT EXISTS messages_workspace_created ON messages(workspace_id, created_at, id);
    `);
    this.addColumnIfMissing("members", "password_hash", "TEXT");
    this.addColumnIfMissing("connectors", "status", "TEXT NOT NULL DEFAULT 'untested'");
    this.addColumnIfMissing("connectors", "oauth_state", "TEXT");
    this.addColumnIfMissing("connectors", "tool_cache", "TEXT NOT NULL DEFAULT '[]'");
    this.addColumnIfMissing("connectors", "authorization_url", "TEXT");
    this.addColumnIfMissing("connectors", "last_error", "TEXT");
  }

  async setupStatus(): Promise<SetupStatus> {
    const count = this.ctx.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM members").one().count;
    return { configured: count > 0, memberCount: count };
  }

  async setupAppOwner(input: { token: string; expectedToken: string; name: string; email: string; passwordHash: string }): Promise<Member> {
    if ((await this.setupStatus()).configured) throw new Error("Family is already configured");
    if (!input.expectedToken || input.token !== input.expectedToken) throw new Error("Setup token is invalid");
    const member: Member = {
      id: crypto.randomUUID(),
      name: safeText(input.name, "Name"),
      email: input.email.trim().toLowerCase(),
      role: "owner",
      createdAt: now(),
    };
    this.ctx.storage.sql.exec(
      "INSERT INTO members (id, name, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      member.id,
      member.name,
      member.email,
      member.role,
      input.passwordHash,
      member.createdAt,
    );
    const workspace = await this.createWorkspace({ actorId: member.id, title: "Family room" });
    await this.appendAgentMessage({
      workspaceId: workspace.id,
      text: "Hi — I’m your family agent. I live in this self-deployed family chat. Send normal family messages with “Send to Family”, or invite me in with “Ask Agent”.",
    });
    return member;
  }

  async loginAppMember(input: { email: string; password: string }): Promise<Member> {
    const email = input.email.trim().toLowerCase();
    const row = this.ctx.storage.sql
      .exec<{ id: string; name: string; email: string | null; role: Role; created_at: number; password_hash: string | null }>(
        "SELECT id, name, email, role, created_at, password_hash FROM members WHERE lower(email) = ?",
        email,
      )
      .toArray()[0];
    if (row === undefined) throw new Error("Invalid email or password");
    const { verifyPassword } = await import("./crypto");
    if (!(await verifyPassword(input.password, row.password_hash))) throw new Error("Invalid email or password");
    return { id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at };
  }

  async ensureAccessMember(input: { id: string; name: string; email: string }): Promise<Member> {
    const existing = await this.getMember(input.id);
    if (existing !== null) {
      if (existing.name !== input.name || existing.email !== input.email) {
        this.ctx.storage.sql.exec("UPDATE members SET name = ?, email = ? WHERE id = ?", input.name, input.email, input.id);
        return { ...existing, name: input.name, email: input.email };
      }
      return existing;
    }

    const first = !(await this.setupStatus()).configured;
    const member: Member = {
      id: input.id,
      name: safeText(input.name, "Name"),
      email: input.email.trim().toLowerCase(),
      role: first ? "owner" : "member",
      createdAt: now(),
    };
    this.ctx.storage.sql.exec(
      "INSERT INTO members (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)",
      member.id,
      member.name,
      member.email,
      member.role,
      member.createdAt,
    );

    const workspaces = await this.listAllWorkspaces();
    if (workspaces.length === 0) {
      const workspace = await this.createWorkspace({ actorId: member.id, title: "Family room" });
      await this.appendAgentMessage({
        workspaceId: workspace.id,
        text: "Hi — I’m your family agent. I live in this Cloudflare Access-protected family chat. Send normal family messages with “Send to Family”, or invite me in with “Ask Agent”.",
      });
    } else {
      for (const workspace of workspaces) {
        this.ctx.storage.sql.exec(
          "INSERT OR IGNORE INTO workspace_members (workspace_id, member_id, role, created_at) VALUES (?, ?, ?, ?)",
          workspace.id,
          member.id,
          "member",
          now(),
        );
      }
    }
    return member;
  }

  async getMember(memberId: string): Promise<Member | null> {
    const row = this.ctx.storage.sql
      .exec<{ id: string; name: string; email: string | null; role: Role; created_at: number }>(
        "SELECT id, name, email, role, created_at FROM members WHERE id = ?",
        memberId,
      )
      .toArray()[0];
    return row === undefined
      ? null
      : { id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at };
  }

  async listMembers(): Promise<Member[]> {
    return this.ctx.storage.sql
      .exec<{ id: string; name: string; email: string | null; role: Role; created_at: number }>(
        "SELECT id, name, email, role, created_at FROM members ORDER BY created_at ASC",
      )
      .toArray()
      .map((row) => ({ id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at }));
  }

  async createInvite(input: { actorId: string; role: Role }): Promise<{ code: string; role: Role; expiresAt: number }> {
    const actor = await this.requireMember(input.actorId);
    if (actor.role !== "owner" && actor.role !== "admin") throw new Error("Only owners and admins can invite members");
    const code = randomCode(10);
    const role = normalizeRole(input.role);
    const createdAt = now();
    const expiresAt = createdAt + INVITE_TTL_MS;
    this.ctx.storage.sql.exec(
      "INSERT INTO invites (code, role, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
      code,
      role,
      actor.id,
      createdAt,
      expiresAt,
    );
    return { code, role, expiresAt };
  }

  async joinWithInvite(input: { code: string; name: string; email?: string | null; passwordHash?: string | null }): Promise<Member> {
    const code = safeText(input.code, "Invite code", 200);
    const invite = this.ctx.storage.sql
      .exec<{ code: string; role: Role; expires_at: number; used_by: string | null }>(
        "SELECT code, role, expires_at, used_by FROM invites WHERE code = ?",
        code,
      )
      .toArray()[0];
    if (invite === undefined || invite.used_by !== null || invite.expires_at < now()) throw new Error("Invite is invalid or expired");
    const member: Member = {
      id: crypto.randomUUID(),
      name: safeText(input.name, "Name"),
      email: input.email?.trim().toLowerCase() || null,
      role: invite.role,
      createdAt: now(),
    };
    this.ctx.storage.sql.exec(
      "INSERT INTO members (id, name, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      member.id,
      member.name,
      member.email,
      member.role,
      input.passwordHash ?? null,
      member.createdAt,
    );
    this.ctx.storage.sql.exec("UPDATE invites SET used_by = ? WHERE code = ?", member.id, code);
    for (const workspace of await this.listAllWorkspaces()) {
      this.ctx.storage.sql.exec(
        "INSERT OR IGNORE INTO workspace_members (workspace_id, member_id, role, created_at) VALUES (?, ?, ?, ?)",
        workspace.id,
        member.id,
        "member",
        now(),
      );
    }
    return member;
  }

  async listWorkspaces(memberId: string): Promise<Workspace[]> {
    await this.requireMember(memberId);
    return this.ctx.storage.sql
      .exec<{ id: string; title: string; created_by: string; created_at: number }>(
        `SELECT w.id, w.title, w.created_by, w.created_at
         FROM workspaces w JOIN workspace_members wm ON wm.workspace_id = w.id
         WHERE wm.member_id = ? ORDER BY w.created_at DESC`,
        memberId,
      )
      .toArray()
      .map(this.workspaceFromRow);
  }

  async createWorkspace(input: { actorId: string; title: string }): Promise<Workspace> {
    const actor = await this.requireMember(input.actorId);
    const workspace: Workspace = {
      id: crypto.randomUUID(),
      title: safeText(input.title, "Workspace title"),
      createdBy: actor.id,
      createdAt: now(),
    };
    this.ctx.storage.sql.exec(
      "INSERT INTO workspaces (id, title, created_by, created_at) VALUES (?, ?, ?, ?)",
      workspace.id,
      workspace.title,
      workspace.createdBy,
      workspace.createdAt,
    );
    for (const member of await this.listMembers()) {
      this.ctx.storage.sql.exec(
        "INSERT OR IGNORE INTO workspace_members (workspace_id, member_id, role, created_at) VALUES (?, ?, ?, ?)",
        workspace.id,
        member.id,
        member.id === actor.id ? "owner" : "member",
        now(),
      );
    }
    return workspace;
  }

  async listMessages(input: { actorId: string; workspaceId: string }): Promise<ChatMessage[]> {
    await this.requireWorkspaceMember(input.actorId, input.workspaceId);
    return this.ctx.storage.sql
      .exec<{ id: number; workspace_id: string; author_id: string; author_name: string; kind: ChatMessage["kind"]; text: string; created_at: number }>(
        "SELECT id, workspace_id, author_id, author_name, kind, text, created_at FROM messages WHERE workspace_id = ? ORDER BY id ASC LIMIT 300",
        input.workspaceId,
      )
      .toArray()
      .map(this.messageFromRow);
  }

  async recentTranscript(input: { actorId: string; workspaceId: string; limit: number }): Promise<ChatMessage[]> {
    await this.requireWorkspaceMember(input.actorId, input.workspaceId);
    return this.ctx.storage.sql
      .exec<{ id: number; workspace_id: string; author_id: string; author_name: string; kind: ChatMessage["kind"]; text: string; created_at: number }>(
        "SELECT id, workspace_id, author_id, author_name, kind, text, created_at FROM messages WHERE workspace_id = ? ORDER BY id DESC LIMIT ?",
        input.workspaceId,
        Math.max(1, Math.min(input.limit, 40)),
      )
      .toArray()
      .reverse()
      .map(this.messageFromRow);
  }

  async appendFamilyMessage(input: { actorId: string; workspaceId: string; text: string; kind: "family" | "agent-request" }): Promise<ChatMessage> {
    const actor = await this.requireWorkspaceMember(input.actorId, input.workspaceId);
    return this.insertMessage(input.workspaceId, actor.id, actor.name, input.kind, safeText(input.text, "Message", MAX_MESSAGE_LENGTH));
  }

  async appendAgentMessage(input: { workspaceId: string; text: string }): Promise<ChatMessage> {
    return this.insertMessage(input.workspaceId, "agent", "Family Agent", "agent", safeText(input.text, "Agent message", MAX_MESSAGE_LENGTH));
  }

  async listConnectors(memberId: string): Promise<Connector[]> {
    await this.requireMember(memberId);
    return this.listStoredConnectors().map(this.connectorFromStored);
  }

  async addConnector(input: { actorId: string; label: string; url: string; publicOrigin: string }): Promise<Connector> {
    const actor = await this.requireMember(input.actorId);
    if (actor.role !== "owner" && actor.role !== "admin") throw new Error("Only owners and admins can add connectors");
    const url = new URL(safeText(input.url, "MCP server URL", 1000));
    if (url.protocol !== "https:") throw new Error("MCP server URL must use https");
    const id = crypto.randomUUID();
    const createdAt = now();
    this.ctx.storage.sql.exec(
      "INSERT INTO connectors (id, label, url, created_by, created_at, status, tool_cache) VALUES (?, ?, ?, ?, ?, 'untested', '[]')",
      id,
      safeText(input.label, "Connector label", 100),
      url.href,
      actor.id,
      createdAt,
    );
    return this.refreshConnector({ actorId: actor.id, connectorId: id, publicOrigin: input.publicOrigin });
  }

  async refreshConnector(input: { actorId: string; connectorId: string; publicOrigin: string }): Promise<Connector> {
    const actor = await this.requireMember(input.actorId);
    if (actor.role !== "owner" && actor.role !== "admin") throw new Error("Only owners and admins can refresh connectors");
    const connector = this.requireStoredConnector(input.connectorId);
    const result = await connectAndListTools({ connector, publicOrigin: input.publicOrigin, state: this.mcpStateAccess() });
    this.saveMcpResult(input.connectorId, result.status, result.tools, result.authorizationUrl, result.error);
    return this.connectorFromStored(this.requireStoredConnector(input.connectorId));
  }

  async completeConnectorOAuth(input: { connectorId: string; callbackUrl: string; publicOrigin: string }): Promise<Connector> {
    const connector = this.requireStoredConnector(input.connectorId);
    const result = await completeMcpOAuth({
      connector,
      callbackUrl: input.callbackUrl,
      publicOrigin: input.publicOrigin,
      state: this.mcpStateAccess(),
    });
    this.saveMcpResult(input.connectorId, result.status, result.tools, result.authorizationUrl, result.error);
    return this.connectorFromStored(this.requireStoredConnector(input.connectorId));
  }

  async callConnectorTool(input: { actorId: string; connectorId: string; publicOrigin: string; toolName: string; args: Record<string, unknown> }): Promise<unknown> {
    const actor = await this.requireMember(input.actorId);
    if (actor.role !== "owner" && actor.role !== "admin") throw new Error("Only owners and admins can call connector tools in this starter");
    const connector = this.requireStoredConnector(input.connectorId);
    return callMcpTool({
      connector,
      publicOrigin: input.publicOrigin,
      state: this.mcpStateAccess(),
      toolName: safeText(input.toolName, "Tool name", 200),
      args: input.args,
    });
  }

  private addColumnIfMissing(table: string, column: string, definition: string): void {
    const columns = this.ctx.storage.sql.exec<{ name: string }>(`PRAGMA table_info(${table})`).toArray();
    if (columns.some((existing) => existing.name === column)) return;
    this.ctx.storage.sql.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }

  private listStoredConnectors(): StoredMcpConnector[] {
    return this.ctx.storage.sql
      .exec<{
        id: string;
        label: string;
        url: string;
        created_by: string;
        created_at: number;
        status: Connector["status"];
        oauth_state: string | null;
        tool_cache: string | null;
        authorization_url: string | null;
        last_error: string | null;
      }>(
        "SELECT id, label, url, created_by, created_at, status, oauth_state, tool_cache, authorization_url, last_error FROM connectors ORDER BY created_at DESC",
      )
      .toArray()
      .map((row) => ({
        id: row.id,
        label: row.label,
        url: row.url,
        createdBy: row.created_by,
        createdAt: row.created_at,
        oauthState: row.oauth_state === null ? null : JSON.parse(row.oauth_state) as StoredMcpConnector["oauthState"],
        tools: this.parseTools(row.tool_cache),
        lastError: row.last_error,
      }));
  }

  private requireStoredConnector(connectorId: string): StoredMcpConnector {
    const row = this.ctx.storage.sql
      .exec<{
        id: string;
        label: string;
        url: string;
        created_by: string;
        created_at: number;
        oauth_state: string | null;
        tool_cache: string | null;
        last_error: string | null;
      }>(
        "SELECT id, label, url, created_by, created_at, oauth_state, tool_cache, last_error FROM connectors WHERE id = ?",
        connectorId,
      )
      .toArray()[0];
    if (row === undefined) throw new Error("Connector not found");
    return {
      id: row.id,
      label: row.label,
      url: row.url,
      createdBy: row.created_by,
      createdAt: row.created_at,
      oauthState: row.oauth_state === null ? null : JSON.parse(row.oauth_state) as StoredMcpConnector["oauthState"],
      tools: this.parseTools(row.tool_cache),
      lastError: row.last_error,
    };
  }

  private connectorFromStored = (connector: StoredMcpConnector): Connector => {
    const row = this.ctx.storage.sql
      .exec<{ status: Connector["status"]; authorization_url: string | null }>(
        "SELECT status, authorization_url FROM connectors WHERE id = ?",
        connector.id,
      )
      .one();
    return {
      id: connector.id,
      label: connector.label,
      url: connector.url,
      createdBy: connector.createdBy,
      createdAt: connector.createdAt,
      status: row.status,
      ...(row.authorization_url === null ? {} : { authorizationUrl: row.authorization_url }),
      tools: this.summarizeTools(connector.tools),
      lastError: connector.lastError,
    };
  };

  private parseTools(value: string | null): StoredMcpConnector["tools"] {
    if (value === null || value.trim() === "") return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as StoredMcpConnector["tools"] : [];
    } catch {
      return [];
    }
  }

  private summarizeTools(tools: StoredMcpConnector["tools"]): McpToolSummary[] {
    return tools.map((tool) => ({
      name: tool.name,
      ...(tool.title === undefined ? {} : { title: tool.title }),
      ...(tool.description === undefined ? {} : { description: tool.description }),
      inputSchema: tool.inputSchema,
    }));
  }

  private saveMcpResult(connectorId: string, status: Connector["status"], tools: StoredMcpConnector["tools"], authorizationUrl?: string, error?: string): void {
    this.ctx.storage.sql.exec(
      "UPDATE connectors SET status = ?, tool_cache = ?, authorization_url = ?, last_error = ? WHERE id = ?",
      status,
      JSON.stringify(tools),
      authorizationUrl ?? null,
      error ?? null,
      connectorId,
    );
  }

  private mcpStateAccess(): McpOAuthStateAccess {
    return {
      load: (connectorId) => this.requireStoredConnector(connectorId).oauthState,
      save: (connectorId, state) => {
        this.ctx.storage.sql.exec(
          "UPDATE connectors SET oauth_state = ? WHERE id = ?",
          JSON.stringify(state),
          connectorId,
        );
      },
    };
  }

  private async requireMember(memberId: string): Promise<Member> {
    const member = await this.getMember(memberId);
    if (member === null) throw new Error("Member not found");
    return member;
  }

  private async requireWorkspaceMember(memberId: string, workspaceId: string): Promise<Member> {
    const member = await this.requireMember(memberId);
    const row = this.ctx.storage.sql
      .exec<{ count: number }>(
        "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = ? AND member_id = ?",
        workspaceId,
        memberId,
      )
      .one();
    if (row.count === 0) throw new Error("Workspace not found");
    return member;
  }

  private async listAllWorkspaces(): Promise<Workspace[]> {
    return this.ctx.storage.sql
      .exec<{ id: string; title: string; created_by: string; created_at: number }>(
        "SELECT id, title, created_by, created_at FROM workspaces ORDER BY created_at DESC",
      )
      .toArray()
      .map(this.workspaceFromRow);
  }

  private insertMessage(workspaceId: string, authorId: string, authorName: string, kind: ChatMessage["kind"], text: string): ChatMessage {
    const createdAt = now();
    const id = this.ctx.storage.sql
      .exec<{ id: number }>(
        "INSERT INTO messages (workspace_id, author_id, author_name, kind, text, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
        workspaceId,
        authorId,
        authorName,
        kind,
        text,
        createdAt,
      )
      .one().id;
    return { id, workspaceId, authorId, authorName, kind, text, createdAt };
  }

  private workspaceFromRow(row: { id: string; title: string; created_by: string; created_at: number }): Workspace {
    return { id: row.id, title: row.title, createdBy: row.created_by, createdAt: row.created_at };
  }

  private messageFromRow(row: { id: number; workspace_id: string; author_id: string; author_name: string; kind: ChatMessage["kind"]; text: string; created_at: number }): ChatMessage {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      authorId: row.author_id,
      authorName: row.author_name,
      kind: row.kind,
      text: row.text,
      createdAt: row.created_at,
    };
  }
}
