# Agent Deployment Guide for FamilyChat Standard

This file is for AI coding agents or human maintainers who need to deploy this repository to Cloudflare without using the custom Access wizard.

## Goal

Deploy the simple, self-owned FamilyChat app into the current Cloudflare account:

- Worker: hosts the UI and API.
- Durable Object: stores family members, rooms, messages, schedules, skills, MCP connector state, and follow-ups.
- Workers AI binding: powers the Family Agent by default.
- App-owned auth: setup token, password login, signed sessions, and room invites.

Cloudflare Access is optional and can be added later. Do not block the first deploy on Access automation.

## Safe default deploy

From the project root:

```bash
pnpm install
pnpm deploy:self
```

The helper script will:

1. confirm Wrangler login or start `wrangler login`,
2. run `pnpm check`,
3. generate `SESSION_SECRET`,
4. generate `SETUP_TOKEN`,
5. upload both as Worker secrets with `wrangler secret put`,
6. run `wrangler deploy`,
7. print the one-time owner setup token.

Save the printed setup token. It is needed once to create the first FamilyChat owner account.

## Manual deploy equivalent

Use this if a scripted deploy is not appropriate:

```bash
pnpm install
pnpm check
pnpm exec wrangler login
pnpm exec wrangler secret put SESSION_SECRET
pnpm exec wrangler secret put SETUP_TOKEN
pnpm exec wrangler deploy
```

Use long random values for both secrets. Example generation command:

```bash
node -e "console.log(crypto.randomBytes(32).toString('base64url'))"
```

## What not to commit

Never commit:

- `.dev.vars`
- `.env*` secret values
- generated setup tokens
- Cloudflare API tokens
- Anthropic API keys
- `.wrangler/`
- local learning docs under `docs/`

## Optional Cloudflare Access

The app works without Access. If Access is desired later, configure a Cloudflare Access self-hosted application for the Worker hostname and set these Worker secrets:

```env
ACCESS_ISSUER=https://<your-team-name>.cloudflareaccess.com
ACCESS_AUDIENCE=<your-access-application-aud-tag>
```

When both values are present, FamilyChat auto-detects Access mode unless `AUTH_MODE=app` is explicitly configured.

Important: Access controls who can reach the Worker URL. FamilyChat room invites control room membership after the user reaches the app.

## Verification after deploy

1. Open the deployed Worker URL.
2. Confirm the owner setup screen appears.
3. Create the owner with the printed setup token.
4. Create a room.
5. Send a family message.
6. Click **Ask Agent** and confirm Workers AI responds, or shows a helpful model/entitlement error.
7. Open Settings and confirm model settings, skills, schedules, and connectors render.

## Useful scripts

| Command | Purpose |
|---|---|
| `pnpm check` | Type-check, run tests, and run Wrangler dry-run deploy. |
| `pnpm deploy` | Raw `wrangler deploy`. Assumes secrets already exist. |
| `pnpm deploy:self` | Recommended app-auth self-deploy helper for agents. |
| `pnpm deploy:self -- --skip-check` | Deploy helper without running checks first. Use only after checks already passed. |
| `pnpm deploy:self -- --skip-secrets` | Deploy helper without changing `SESSION_SECRET` or `SETUP_TOKEN`. |
