# FamilyChat Standard

A private AI group chat for your family, self-deployed to your own Cloudflare account.

## Default one-click-friendly mode

The default mode is app-owned authentication:

- Deploy to Cloudflare provisions the Worker, Durable Object, and Workers AI binding.
- The deployer provides two secrets: `SESSION_SECRET` and `SETUP_TOKEN`.
- The first user creates the owner account with the setup token.
- Owners/admins create invite codes for family members.
- Chat messages, room state, MCP OAuth state, and connector metadata live in the deployment's Durable Object storage.

## Optional Cloudflare Access mode

Advanced users can set `AUTH_MODE=access` and protect the Worker with Cloudflare Access. In that mode:

- Cloudflare Access is the sign-in layer.
- Everyone allowed by the Access policy becomes a FamilyChat member.
- The first Access-authenticated user becomes owner.
- Set `ACCESS_ISSUER` and `ACCESS_AUDIENCE` after creating the Access application.

## Deploy to Cloudflare

After this folder is pushed to a public GitHub repository, update the URL below and use the button:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/oskarcode/familychat-standard)

The deploy flow provisions:

- Worker
- SQLite Durable Object
- Workers AI binding

Required secrets:

```env
SESSION_SECRET=long-random-session-signing-secret
SETUP_TOKEN=temporary-owner-setup-code
```

After deploy, open the `workers.dev` URL, create the owner account, and invite family members.

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
