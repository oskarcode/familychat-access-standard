import { McpClient, StreamableHttpTransport, type CallToolResult, type Tool } from "@earendil-works/pi-mcp";
import {
  adaptOAuthProvider,
  authorizeMcp,
  McpOAuthAuthorizationRequiredError,
  McpOAuthProvider,
  type McpOAuthState,
  type McpOAuthStateStore,
} from "@earendil-works/pi-mcp/oauth";

export type StoredMcpConnector = {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly createdBy: string;
  readonly createdAt: number;
  readonly oauthState: McpOAuthState | null;
  readonly tools: Tool[];
  readonly lastError: string | null;
};

export type McpConnectResult = {
  readonly status: "connected" | "authorization_required" | "failed";
  readonly authorizationUrl?: string;
  readonly tools: Tool[];
  readonly error?: string;
};

export type McpOAuthStateAccess = {
  load(connectorId: string): McpOAuthState | null;
  save(connectorId: string, state: McpOAuthState): void;
};

const clientName = "familychat-standard";
const clientVersion = "0.1.0";

const timeoutSignal = (ms: number): AbortSignal => {
  const controller = new AbortController();
  setTimeout(() => controller.abort("MCP request timed out"), ms);
  return controller.signal;
};

class DurableMcpOAuthStore implements McpOAuthStateStore {
  constructor(private readonly connectorId: string, private readonly access: McpOAuthStateAccess) {}

  load(): McpOAuthState | undefined {
    return this.access.load(this.connectorId) ?? undefined;
  }

  save(state: McpOAuthState): void {
    this.access.save(this.connectorId, state);
  }
}

/**
 * Input:
 * - See the TypeScript parameters for `connectorCallbackUrl`; callers pass runtime data from HTTP requests, Durable Object state, or helper modules.
 *
 * Output:
 * - Returns the typed value or Promise declared in the signature; errors are surfaced to the route handler or caller.
 *
 * What this function does:
 * - Owns the `connectorCallbackUrl` step in the FamilyChat request, auth, state, AI, MCP, schedule, or follow-up flow.
 * - Keep validation and side effects here aligned with the route and Durable Object documentation.
 */
export function connectorCallbackUrl(publicOrigin: string, connectorId: string): string {
  const url = new URL("/api/mcp/callback", publicOrigin);
  url.searchParams.set("connector", connectorId);
  return url.href;
}

/**
 * Input:
 * - See the TypeScript parameters for `createMcpOAuthProvider`; callers pass runtime data from HTTP requests, Durable Object state, or helper modules.
 *
 * Output:
 * - Returns the typed value or Promise declared in the signature; errors are surfaced to the route handler or caller.
 *
 * What this function does:
 * - Owns the `createMcpOAuthProvider` step in the FamilyChat request, auth, state, AI, MCP, schedule, or follow-up flow.
 * - Keep validation and side effects here aligned with the route and Durable Object documentation.
 */
export function createMcpOAuthProvider(options: {
  connectorId: string;
  serverUrl: string;
  redirectUrl: string;
  state: McpOAuthStateAccess;
  onRedirect(url: URL): void;
}): McpOAuthProvider {
  return new McpOAuthProvider({
    serverUrl: options.serverUrl,
    redirectUrl: options.redirectUrl,
    clientMetadata: {
      client_name: "FamilyChat",
      client_uri: new URL(options.redirectUrl).origin,
      redirect_uris: [options.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    store: new DurableMcpOAuthStore(options.connectorId, options.state),
    onRedirect: options.onRedirect,
  });
}

/**
 * Input:
 * - See the TypeScript parameters for `withClient<T>`; callers pass runtime data from HTTP requests, Durable Object state, or helper modules.
 *
 * Output:
 * - Returns the typed value or Promise declared in the signature; errors are surfaced to the route handler or caller.
 *
 * What this function does:
 * - Owns the `withClient<T>` step in the FamilyChat request, auth, state, AI, MCP, schedule, or follow-up flow.
 * - Keep validation and side effects here aligned with the route and Durable Object documentation.
 */
async function withClient<T>(connector: StoredMcpConnector, oauthProvider: McpOAuthProvider | null, run: (client: McpClient) => Promise<T>): Promise<T> {
  const client = new McpClient({ name: clientName, version: clientVersion, requestTimeoutMs: 20_000 });
  await client.connect(
    new StreamableHttpTransport({
      url: connector.url,
      openGetStream: false,
      authProvider: oauthProvider === null ? undefined : adaptOAuthProvider(oauthProvider),
    }),
  );
  try {
    return await run(client);
  } finally {
    await client.close().catch(() => undefined);
  }
}

/**
 * Input:
 * - See the TypeScript parameters for `connectAndListTools`; callers pass runtime data from HTTP requests, Durable Object state, or helper modules.
 *
 * Output:
 * - Returns the typed value or Promise declared in the signature; errors are surfaced to the route handler or caller.
 *
 * What this function does:
 * - Owns the `connectAndListTools` step in the FamilyChat request, auth, state, AI, MCP, schedule, or follow-up flow.
 * - Keep validation and side effects here aligned with the route and Durable Object documentation.
 */
export async function connectAndListTools(options: {
  connector: StoredMcpConnector;
  publicOrigin: string;
  state: McpOAuthStateAccess;
}): Promise<McpConnectResult> {
  let authorizationUrl: string | undefined;
  const oauth = createMcpOAuthProvider({
    connectorId: options.connector.id,
    serverUrl: options.connector.url,
    redirectUrl: connectorCallbackUrl(options.publicOrigin, options.connector.id),
    state: options.state,
    onRedirect: (url) => {
      authorizationUrl = url.href;
    },
  });

  try {
    const tools = await withClient(options.connector, oauth, (client) => client.listTools({ signal: timeoutSignal(20_000) }));
    return { status: "connected", tools };
  } catch (error) {
    if (error instanceof McpOAuthAuthorizationRequiredError) {
      return { status: "authorization_required", authorizationUrl, tools: [] };
    }
    return { status: "failed", tools: [], error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Input:
 * - See the TypeScript parameters for `completeMcpOAuth`; callers pass runtime data from HTTP requests, Durable Object state, or helper modules.
 *
 * Output:
 * - Returns the typed value or Promise declared in the signature; errors are surfaced to the route handler or caller.
 *
 * What this function does:
 * - Owns the `completeMcpOAuth` step in the FamilyChat request, auth, state, AI, MCP, schedule, or follow-up flow.
 * - Keep validation and side effects here aligned with the route and Durable Object documentation.
 */
export async function completeMcpOAuth(options: {
  connector: StoredMcpConnector;
  callbackUrl: string;
  publicOrigin: string;
  state: McpOAuthStateAccess;
}): Promise<McpConnectResult> {
  let authorizationUrl: string | undefined;
  const oauth = createMcpOAuthProvider({
    connectorId: options.connector.id,
    serverUrl: options.connector.url,
    redirectUrl: connectorCallbackUrl(options.publicOrigin, options.connector.id),
    state: options.state,
    onRedirect: (url) => {
      authorizationUrl = url.href;
    },
  });
  const url = new URL(options.callbackUrl);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error !== null) return { status: "failed", tools: [], error: url.searchParams.get("error_description") ?? error };
  if (code === null) return { status: "failed", tools: [], error: "OAuth callback is missing code" };

  const result = await authorizeMcp(oauth, {
    serverUrl: options.connector.url,
    authorizationCode: code,
    iss: url.searchParams.get("iss") ?? undefined,
  });
  if (result !== "AUTHORIZED") return { status: "authorization_required", authorizationUrl, tools: [] };
  return connectAndListTools(options);
}

/**
 * Input:
 * - See the TypeScript parameters for `callMcpTool`; callers pass runtime data from HTTP requests, Durable Object state, or helper modules.
 *
 * Output:
 * - Returns the typed value or Promise declared in the signature; errors are surfaced to the route handler or caller.
 *
 * What this function does:
 * - Owns the `callMcpTool` step in the FamilyChat request, auth, state, AI, MCP, schedule, or follow-up flow.
 * - Keep validation and side effects here aligned with the route and Durable Object documentation.
 */
export async function callMcpTool(options: {
  connector: StoredMcpConnector;
  publicOrigin: string;
  state: McpOAuthStateAccess;
  toolName: string;
  args: Record<string, unknown>;
}): Promise<CallToolResult> {
  const oauth = createMcpOAuthProvider({
    connectorId: options.connector.id,
    serverUrl: options.connector.url,
    redirectUrl: connectorCallbackUrl(options.publicOrigin, options.connector.id),
    state: options.state,
    onRedirect: () => undefined,
  });
  return withClient(options.connector, oauth, (client) =>
    client.callTool(options.toolName, options.args, { signal: timeoutSignal(30_000) }),
  );
}
