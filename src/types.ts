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

export type AiProvider = "workers-ai" | "anthropic";

export type AiSettings = {
  readonly provider: AiProvider;
  readonly model: string;
  readonly apiKeyConfigured?: boolean;
  readonly updatedAt?: number;
};

export type AiRuntimeSettings = AiSettings & {
  readonly apiKey?: string;
};

export type Skill = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly createdBy: string;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type SkillFile = {
  readonly path: string;
  readonly content: string;
  readonly updatedAt: number;
};

export type Schedule = {
  readonly id: string;
  readonly workspaceId: string;
  readonly workspaceTitle?: string;
  readonly instruction: string;
  readonly runAt: number;
  readonly createdBy: string;
  readonly createdAt: number;
};

export type SetupStatus = {
  readonly configured: boolean;
  readonly memberCount: number;
  readonly familyName?: string;
};

export interface Env {
  readonly FAMILY: DurableObjectNamespace;
  readonly AI: Ai;
  readonly AI_MODEL?: string;
  readonly AI_GATEWAY_ID?: string;
  readonly SESSION_SECRET?: string;
  readonly SETUP_TOKEN?: string;
}

export interface FamilyChat {
  setupStatus(): Promise<SetupStatus>;
  setupAppOwner(input: { token: string; expectedToken: string; name: string; email: string; passwordHash: string; familyName?: string }): Promise<Member>;
  acceptInvite(input: { actorId: string; code: string }): Promise<{ workspaceId: string }>;
  listInvites(input: { actorId: string; workspaceId: string }): Promise<{ code: string; expiresAt: number }[]>;
  revokeInvite(input: { actorId: string; code: string }): Promise<void>;
  loginAppMember(input: { email: string; password: string }): Promise<Member>;
  getMember(memberId: string): Promise<Member | null>;
  listMembers(): Promise<Member[]>;
  createInvite(input: { actorId: string; workspaceId: string; role: Role }): Promise<{ code: string; role: Role; workspaceId: string; expiresAt: number }>;
  joinWithInvite(input: { code: string; name: string; email?: string | null; passwordHash?: string | null }): Promise<Member>;
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
  getAiSettings(memberId: string): Promise<AiSettings | null>;
  getAiRuntimeSettings(memberId: string): Promise<AiRuntimeSettings | null>;
  updateAiSettings(input: { actorId: string; provider: AiProvider; model: string; apiKey?: string | null }): Promise<AiSettings>;
  listSkills(memberId: string): Promise<Skill[]>;
  createSkill(input: { actorId: string; title: string; description: string }): Promise<Skill>;
  listSkillFiles(input: { actorId: string; skillId: string }): Promise<SkillFile[]>;
  updateSkillFile(input: { actorId: string; skillId: string; path: string; content: string }): Promise<SkillFile>;
  setSkillEnabled(input: { actorId: string; skillId: string; enabled: boolean }): Promise<Skill>;
  listSchedules(input: { actorId: string; from?: number; to?: number }): Promise<Schedule[]>;
  createSchedule(input: { actorId: string; workspaceId: string; instruction: string; runAt: number }): Promise<Schedule>;
  deleteSchedule(input: { actorId: string; scheduleId: string }): Promise<boolean>;
}
