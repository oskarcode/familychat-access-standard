# FamilyChat Standard

A private AI group chat for your family, self-deployed to your own Cloudflare account.

## Default one-click-friendly mode

The default mode is app-owned authentication:

- Deploy to Cloudflare provisions the Worker, Durable Object, and Workers AI binding.
- If you do not use the Access wizard, set `SESSION_SECRET` and `SETUP_TOKEN` manually.
- The first user creates the owner account with the setup token.
- Owners/admins create invite codes for family members.
- Chat messages, room state, MCP OAuth state, and connector metadata live in the deployment's Durable Object storage.

## Optional Cloudflare Access mode

The custom deploy wizard can set `AUTH_MODE=access` and protect the Worker with Cloudflare Access. In that mode:

- Cloudflare Access is the sign-in layer.
- Everyone allowed by the Access policy becomes a FamilyChat member.
- The first Access-authenticated user becomes owner.
- The wizard sets `ACCESS_ISSUER` and `ACCESS_AUDIENCE` automatically.

## Deploy to Cloudflare

After this folder is pushed to a public GitHub repository, update the URL below and use the button:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/oskarcode/familychat-standard)

The deploy flow provisions:

- Worker
- SQLite Durable Object
- Workers AI binding

For the Cloudflare Access-first flow, use the custom wizard after deploy:

```text
https://familychat-deploy-wizard.oskarmansanqu.workers.dev
```

The wizard creates the Cloudflare Access application/policy and writes these Worker secrets for you:

```env
ACCESS_ISSUER=https://your-team.cloudflareaccess.com
ACCESS_AUDIENCE=your-access-app-aud
```

FamilyChat automatically switches to Access mode when both Access values are present, unless `AUTH_MODE=app` is explicitly configured.

For the fallback app-auth mode, manually set these secrets and then open the Worker URL:

```env
SESSION_SECRET=long-random-session-signing-secret
SETUP_TOKEN=temporary-owner-setup-code
```

After Access setup, opening the `workers.dev` URL should trigger Cloudflare Access directly. In app-auth mode, the URL shows the owner setup screen.

## Local development

```sh
pnpm install
cp .dev.vars.example .dev.vars
pnpm check
pnpm exec wrangler dev
```

## Manual deploy

```sh
pnpm install
pnpm check
pnpm exec wrangler deploy --secrets-file .wrangler/deploy-secrets.env
```

## MCP connectors

Owners/admins can add Streamable HTTP MCP endpoints, complete OAuth, discover tools, refresh tool lists, and manually call tools. Agent-side automatic MCP tool use is intentionally left for the next phase.
