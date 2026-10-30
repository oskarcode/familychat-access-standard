# FamilyChat Standard

FamilyChat Standard is a self-deployable Cloudflare Worker that gives a family a private room-based group chat with a resident AI agent. Families deploy it into their own Cloudflare account so Worker code, Durable Object storage, Workers AI usage, optional Cloudflare Access, MCP connector credentials, schedules, skills, and chat history stay under their ownership.

## What It Does

- Hosts a browser chat app from one Cloudflare Worker.
- Stores members, rooms, messages, invites, settings, schedules, skills, MCP connector state, and proactive follow-ups in one SQLite Durable Object.
- Supports two auth modes:
  - **App auth** by default, with a private setup link, password login, sessions, and room invites.
  - **Cloudflare Access** as an optional family perimeter.
- Lets owners/admins invite people to a specific room with a room-scoped invite URL.
- Lets family members send human messages without requesting an immediate agent reply (background follow-up classification can still use AI).
- Lets users choose **Ask Agent** when they want the Family Agent to answer using Workers AI or a bring-your-own Anthropic key.
- Includes a Settings modal for AI model selection, a basic schedule calendar, skill files, MCP connectors, and account context.
- Can automatically post a gentle LLM-generated follow-up when an open question has no visible reply for about 30 minutes.

## How It Works

```text
Browser loads Worker URL
  -> Worker serves src/ui.ts HTML/CSS/JS
  -> browser calls /api/me
  -> src/index.ts authenticates with app session cookie or Cloudflare Access JWT
  -> src/index.ts calls the FamilyChat Durable Object
  -> src/family-chat.ts reads/writes SQLite tables
  -> Workers AI/Anthropic generate agent replies; follow-up monitoring can also use Workers AI
  -> optional MCP calls happen through the tools/settings flow
  -> JSON response updates the browser UI
```

The Worker is the HTTP boundary. The Durable Object is the application database and alarm owner. Cloudflare Access, when configured, sits in front of the whole Worker URL; FamilyChat invites then control room membership after the user reaches the app.

## Technology Stack

| Technology | Role |
|---|---|
| Cloudflare Workers | Hosts the browser UI and `/api/*` HTTP routes. |
| Cloudflare Durable Objects with SQLite | Stores all FamilyChat state and runs alarm-based proactive follow-ups. |
| Workers AI | Default model provider for Family Agent replies and follow-up classification/generation. |
| Anthropic Messages API | Optional BYO Claude provider configured by owner/admin. |
| Cloudflare Access | Optional family perimeter in front of the Worker URL. |
| `jose` | Verifies Cloudflare Access JWTs against the Access JWKS endpoint. |
| `@earendil-works/pi-mcp` | Connects to Streamable HTTP MCP servers, OAuth, tool discovery, and manual tool calls. |
| TypeScript | Keeps Worker, Durable Object, and shared contracts type-checked. |
| Vitest / Node test runner / Playwright | Access unit tests, local runtime onboarding tests, deployment safety tests and two-browser user-flow tests. |
| Wrangler | Local development, dry-run deploy, and production deploy. |

## Project Structure

| Path | Purpose |
|---|---|
| `src/index.ts` | Worker entrypoint, HTML serving, auth switching, route handling, agent response orchestration. |
| `src/family-chat.ts` | Durable Object class, SQLite schema, member/room/message/invite/skill/schedule/MCP/follow-up state. |
| `src/ui.ts` | Self-contained browser app HTML, CSS, and JavaScript. |
| `src/access.ts` | Cloudflare Access JWT verification and local developer identity fallback. |
| `src/crypto.ts` | App-auth signed sessions, random invite/setup codes, and PBKDF2 password hashing. |
| `src/mcp.ts` | MCP Streamable HTTP, OAuth, discovery, and manual tool-call adapter. |
| `src/types.ts` | Shared TypeScript types and Durable Object RPC interface. |
| `test/access.test.ts` | Vitest coverage for Access helper behavior. |
| `AGENTS.md` | Agent deployment playbook, confirmation and credential-handling rules. |
| `scripts/deploy-self.mjs` | Account-aware fresh deploy and safe update helper. |
| `scripts/test-*.mjs` | Local workerd/SQLite, mocked deployment and browser tests. |
| `wrangler.jsonc` | Worker, AI binding, Durable Object binding/export, vars, compatibility, observability. |
| `.dev.vars.example` | Local-only secret template. Copy to `.dev.vars`; do not commit real values. |

## APIs and Interfaces

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/` | Serves the browser app. | Access may protect the URL before Worker execution. |
| `GET` | `/api/me` | Returns current auth/setup/member state. | Public route, but validates cookie/JWT when present. |
| `POST` | `/api/setup` | Creates first app-auth owner. | App-auth mode only; requires `SETUP_TOKEN`. |
| `POST` | `/api/login` | Signs in an app-auth member. | App-auth mode only. |
| `POST` | `/api/join` | Consumes room invite and creates member. | App-auth mode only. |
| `POST` | `/api/logout` | Clears app-auth session cookie. | App-auth mode only. |
| `GET` | `/api/members` | Lists family members. | Signed-in member. |
| `GET/POST` | `/api/workspaces` | Lists or creates rooms. | Signed-in member. |
| `GET/POST` | `/api/workspaces/:id/messages` | Lists messages, sends family message, or asks agent. | Room member. |
| `POST/GET` | `/api/invites` | Creates a room invite / lists active invites using `workspaceId`. | Owner/admin who belongs to the room. |
| `POST` | `/api/invites/accept` | Existing account accepts a single-use room invite. | Signed-in app or Access member. |
| `DELETE` | `/api/invites/:code` | Revokes an invite. | Owner/admin who belongs to the room. |
| `GET/POST/DELETE` | `/api/schedules` and `/api/schedules/:id` | Calendar schedule list/create/delete. | Signed-in member for read/create; owner/admin for delete. |
| `GET/POST` | `/api/ai/settings` | Reads model registry/settings or updates provider/model/API key. | Read: member. Write: owner/admin. |
| `GET/POST/PUT` | `/api/skills*` | Lists, creates, edits, enables/disables skill files. | Read: member. Mutations: owner/admin. |
| `GET/POST` | `/api/connectors*` | MCP connector list/add/refresh/tool call. | Owner/admin for mutations/tool calls. |
| `GET` | `/api/mcp/callback` | OAuth popup callback for MCP connectors. | Connector/OAuth state scoped. |

## Run It Locally

Prerequisites:

- Node.js compatible with Wrangler 4.
- pnpm.
- A Cloudflare account if you want to test Workers AI or deploy.

```sh
pnpm install
cp .dev.vars.example .dev.vars
pnpm check
pnpm exec wrangler dev
```

For local app-auth testing, edit `.dev.vars` and set placeholder values for:

```env
SESSION_SECRET=replace-with-a-long-random-session-signing-secret
SETUP_TOKEN=replace-with-a-temporary-owner-setup-code
```

`http://localhost:8787` can also use the local Access fallback identity when Access mode is configured, because `src/access.ts` treats `localhost` and `127.0.0.1` as local development.

## Deploy Your Own Copy

### Recommended: ask your coding agent

Clone the repository, open it in your coding agent, and ask:

> Deploy FamilyChat to my Cloudflare account. Guide me through Cloudflare sign-in, configure everything needed, and give me the setup link.

The agent follows [`AGENTS.md`](AGENTS.md). You approve Cloudflare sign-in and the target account/Worker. No separate deployment wizard or Access configuration is needed.

### Or run it yourself

```sh
pnpm install --frozen-lockfile
pnpm deploy:self
```

The helper checks authentication, offers account selection, confirms the target Worker, runs tests, and deploys. It creates `SESSION_SECRET` and `SETUP_TOKEN` only for a **new** Worker. Code and secrets deploy together. On updates, existing secrets and dashboard variables are preserved.

The private setup link is saved to `.wrangler/setup-ACCOUNT-WORKER-TIMESTAMP.txt` with owner-only file permissions, rather than printed in shared logs. Open it locally, enter your name, email, password and family name, then select **Create my family**. You land in **Family room**. Delete the file after setup.

The setup token lives in the link fragment (`#setup=…`), not its query string. The browser removes it immediately and does not store it in localStorage/sessionStorage. If you reload before completing setup, reopen the saved link. Only the first owner can complete setup; concurrent attempts cannot create extra owners.

**Invite your family:** click **Invite family**, share the link privately, and they enter name/email/password. Existing members select **Sign in**, then **Join invited room**. Invites work once, expire after seven days, and can be revoked with **Manage invites**. New rooms belong only to their creator until others are invited. Chat normally or tap **Ask Agent** for AI help; model selection and integrations can wait.

**Updates:** rerun the helper with the same account and Worker. For automation, explicitly confirm the target first, then run:

```sh
pnpm deploy:self --account ACCOUNT_ID --name WORKER_NAME --yes
```

Incomplete existing credentials cause the helper to stop rather than reset them. Detected Access configuration also stops the helper unless you deliberately acknowledge an Access-preserving update with `--allow-access`. This is not an authentication migration option. A workers.dev subdomain must exist for the account; the helper explains when dashboard setup is required.

### Optional Cloudflare Access (advanced)

Protect the Worker hostname with a Cloudflare Access self-hosted application and set:

```env
ACCESS_ISSUER=https://<your-team-name>.cloudflareaccess.com
ACCESS_AUDIENCE=<your-access-application-aud-tag>
```

FamilyChat automatically switches to Access mode when both values exist, unless `AUTH_MODE=app` is explicitly configured. Do not define the same binding name as both a Wrangler var and a Worker secret.

Review migration before enabling Access on an existing password-based family: identities are not automatically merged. Newly recognized Access users do not inherit existing rooms; after passing the Access policy, they accept a room invite. Existing memberships from earlier versions are left unchanged. Legacy family-wide invites are rejected—create a fresh room-scoped invite instead.

## Test the User Flow

```sh
pnpm check
pnpm exec playwright install chromium # once, for browser tests
pnpm test:browser
```

Checks cover transactional first-owner setup, competing signup requests, duplicate emails, existing-account invite acceptance, private rooms, revocation, expiry, Access identities and persistence/session continuity across a local runtime restart. Deployment tests mock Wrangler and Cloudflare; browser tests run owner/invitee sessions separately against local workerd. No live account, AI spend or production data is used. Live AI, OAuth and remote deployment still require an explicit real-account smoke test.

## Security Notes

- Cloudflare Access, when enabled, protects the entire Worker URL before FamilyChat code runs.
- FamilyChat room invites do not bypass Access; the invited email must be allowed by the Access policy first.
- App-auth sessions are signed with `SESSION_SECRET` and stored in an HTTP-only SameSite=Lax cookie.
- Passwords are hashed with PBKDF2-SHA256 in `src/crypto.ts`.
- Anthropic API keys are stored in the Durable Object settings table and are never returned to the browser by `/api/ai/settings`.
- MCP connector URLs must use HTTPS.
- MCP tool calls are currently manual and owner/admin-only.
- Proactive follow-ups use Workers AI and Durable Object alarms; they do not call external MCP tools automatically.
- There is no current UI for deleting members, rooms, messages, or all Durable Object data. Add those flows carefully if needed.

## Customize It

| Goal | Start here | What can break |
|---|---|---|
| Change auth behavior | `src/index.ts`, `src/access.ts`, `src/crypto.ts` | App boot, `/api/me`, setup/login/join, Access mode. |
| Add a new API route | `src/index.ts:handleApi`, `src/types.ts`, `src/family-chat.ts` | Route auth, JSON validation, Durable Object interface. |
| Change storage schema | `src/family-chat.ts:initialize` | Existing Durable Object data migrations. |
| Change UI layout | `src/ui.ts` | Browser selectors and event handlers rely on specific element IDs. |
| Add AI models | `src/index.ts:AI_MODELS` | Model availability varies by Cloudflare account/plan. |
| Add an AI provider | `src/types.ts`, `src/index.ts:generateAgentReply`, `src/family-chat.ts` settings methods | API-key storage and error messages. |
| Improve schedules | `src/family-chat.ts` schedule methods and `src/ui.ts` Calendar tab | Standard calendar currently stores schedules but does not execute scheduled work. |
| Add automatic MCP tool use | `src/mcp.ts`, `src/index.ts:generateAgentReply`, `src/family-chat.ts` connector methods | Tool permissioning, prompt injection, OAuth state, long-running calls. |
| Tune follow-ups | `src/family-chat.ts:trackFollowUp`, `messageNeedsFollowUp`, `deliverDueFollowUps` | Alarm timing, false positives, model cost. |

## Troubleshooting

| Symptom | Check |
|---|---|
| Owner setup says secrets are missing | Confirm `SESSION_SECRET` and `SETUP_TOKEN` are set as Worker secrets or in local `.dev.vars`. |
| Access-protected URL does not show Access login | Confirm the Cloudflare Access app domain matches the Worker/custom domain and policy allows your email. |
| `/api/me` returns Access setup instructions | Confirm `ACCESS_ISSUER` and `ACCESS_AUDIENCE` are present and not conflicting with Wrangler vars/secrets. |
| Invited user cannot open invite URL | If Access is enabled, add their email to its policy first. Otherwise check that the invite has not expired, been revoked or already been used. |
| Workers AI response fails | Try the default Llama 3.1 8B model, check account Workers AI access, or configure an AI Gateway. |
| Claude says API key is missing | Save an Anthropic key in Settings → Tools → Agent model. |
| MCP connector says authorization required | Click Authorize in Settings and complete the popup OAuth flow. |
| TypeScript or tests fail | Run `pnpm check` and inspect the first TypeScript/Vitest error. |

## Official References

- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/
- Cloudflare Workers AI: https://developers.cloudflare.com/workers-ai/
- Cloudflare Access: https://developers.cloudflare.com/cloudflare-one/applications/
- Wrangler: https://developers.cloudflare.com/workers/wrangler/
- Anthropic Messages API: https://docs.anthropic.com/en/api/messages
- Model Context Protocol: https://modelcontextprotocol.io/

## License

No license file is included yet. Add a license before publishing this repository for reuse.
