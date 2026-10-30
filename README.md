# FamilyChat

A private family chat with a resident AI assistant, hosted in your family's own Cloudflare account. Your family owns the app, chat history, integrations and AI usage.

## Get started with your coding agent

You need a Cloudflare account and a coding agent that can run terminal commands. Clone this repository and open it in the agent:

```sh
git clone https://github.com/oskarcode/familychat-access-standard.git
cd familychat-access-standard
```

Then ask:

> Read AGENTS.md and deploy FamilyChat to my Cloudflare account. Confirm the account and Worker name with me before deploying. Configure everything needed and tell me where to open the private owner setup link. Do not print secrets in chat.

Your agent installs dependencies, guides you through Cloudflare sign-in, runs checks and deploys the app. There is one deployment flow and one login system: FamilyChat accounts with passwords.

The repository must be accessible to the person cloning it. A private repository requires GitHub permission.

## Create your family

1. Open the private setup link your agent saves locally.
2. Enter your name, email, password and family name.
3. Select **Create my family**. Your **Family room** is ready.
4. Delete the local setup-link file after setup.

Keep the setup link private—it authorizes creation of the first owner. It works only before the family is configured. The browser removes its token from the address bar immediately; reopen the saved link if you reload before finishing.

## Invite and chat

- Click **Invite family** in a room and share the link privately.
- New members enter their name, email and password. Existing members sign in and select **Join invited room**.
- Invites work once, expire after seven days, and can be revoked using **Manage invites**.
- A new room includes only its creator until others are invited.
- Send messages to your family, or tap **Ask Agent** for AI help.

Family members do not need Cloudflare accounts. Settings contains AI models, MCP integrations, skill files and a basic calendar; none is required before chatting. Background AI follow-ups may respond to unanswered questions. Calendar entries are stored reminders, not automatically executed tasks.

## Updates

Ask your agent to update the **same account and Worker name**. Existing secrets, sessions and stored data are preserved. The agent stops if the target or authentication configuration is incompatible; it does not reset your family.

**Older installations:** the previous Cloudflare Access login integration has been removed. Existing installations using it must stay on their previous release until an explicit migration is planned. The deploy helper rejects them, and the runtime fails closed if retired settings remain. Do not simply delete those settings or redeploy over that installation.

## How it works

- **Cloudflare Worker:** serves the browser app and authenticates API requests using signed, HTTP-only session cookies.
- **SQLite Durable Object:** stores family accounts, room memberships, chat, invites and settings. First-owner setup and invite redemption are atomic.
- **Workers AI:** powers the default assistant and background follow-up monitoring. Usage is billed to the deployment owner's account.

Passwords are hashed with PBKDF2. Deployment credentials and setup links must never be committed. Keep `.dev.vars`, `.env` and `.wrangler/` private. There is no automatic password recovery or member-deletion flow yet.

## Development and tests

Deployment and maintenance instructions are in [`AGENTS.md`](AGENTS.md).

```sh
pnpm check
pnpm exec playwright install chromium
pnpm test:browser
```

Checks cover authentication, first-owner races, invite acceptance/expiry/revocation, private rooms, persistence, deployment safeguards and separate owner/invitee browser sessions. They run locally with isolated test data; deployment API calls are mocked. Live Cloudflare login, deployment and Workers AI require a real-account smoke test.

Key files: `src/index.ts` (API), `src/family-chat.ts` (storage), `src/ui.ts` (browser), `src/crypto.ts` (passwords/sessions), and `scripts/deploy-agent.mjs` (agent deployment).

## License

No license file is included yet. Add a license before publishing this repository for reuse.
