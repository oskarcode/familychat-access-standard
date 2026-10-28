export type Role = "owner" | "admin" | "member";

export type Member = {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly role: Role;
  readonly createdAt: number;
};

export type Workspace = {
  readonly id: string;
  readonly title: string;
  readonly createdBy: string;
  readonly createdAt: number;
};

export type ChatMessage = {
  readonly id: number;
  readonly workspaceId: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly kind: "family" | "agent-request" | "agent" | "system";
  readonly text: string;
  readonly createdAt: number;
};

export type McpToolSummary = {
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly inputSchema?: unknown;
};

export type Connector = {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly createdBy: string;
  readonly createdAt: number;
  readonly status: "connected" | "authorization_required" | "failed" | "untested";
  readonly authorizationUrl?: string;
  readonly tools: McpToolSummary[];
  readonly lastError: string | null;
};

export type SetupStatus = {
  readonly configured: boolean;
  readonly memberCount: number;
};

export interface Env {
  readonly FAMILY: DurableObjectNamespace;
  readonly AI: Ai;
  readonly AI_MODEL?: string;
  readonly AI_GATEWAY_ID?: string;
  readonly ACCESS_ISSUER?: string;
  readonly ACCESS_AUDIENCE?: string;
}

export interface FamilyChat {
  setupStatus(): Promise<SetupStatus>;
  ensureAccessMember(input: { id: string; name: string; email: string }): Promise<Member>;
  getMember(memberId: string): Promise<Member | null>;
  listMembers(): Promise<Member[]>;
  createInvite(input: { actorId: string; role: Role }): Promise<{ code: string; role: Role; expiresAt: number }>;
  joinWithInvite(input: { code: string; name: string; email?: string | null }): Promise<Member>;
  listWorkspaces(memberId: string): Promise<Workspace[]>;
  createWorkspace(input: { actorId: string; title: string }): Promise<Workspace>;
  listMessages(input: { actorId: string; workspaceId: string }): Promise<ChatMessage[]>;
  appendFamilyMessage(input: { actorId: string; workspaceId: string; text: string; kind: "family" | "agent-request" }): Promise<ChatMessage>;
  appendAgentMessage(input: { workspaceId: string; text: string }): Promise<ChatMessage>;
  recentTranscript(input: { actorId: string; workspaceId: string; limit: number }): Promise<ChatMessage[]>;
  listConnectors(memberId: string): Promise<Connector[]>;
  addConnector(input: { actorId: string; label: string; url: string; publicOrigin: string }): Promise<Connector>;
  refreshConnector(input: { actorId: string; connectorId: string; publicOrigin: string }): Promise<Connector>;
  completeConnectorOAuth(input: { connectorId: string; callbackUrl: string; publicOrigin: string }): Promise<Connector>;
  callConnectorTool(input: { actorId: string; connectorId: string; publicOrigin: string; toolName: string; args: Record<string, unknown> }): Promise<unknown>;
}
