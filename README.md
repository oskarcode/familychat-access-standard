# FamilyChat Access Standard

A private AI group chat for your family, deployed to your own Cloudflare account and protected by Cloudflare Access.

## Core idea

- One Cloudflare Worker deployment = one family space.
- Cloudflare Access is the sign-in layer.
- Everyone allowed by your Access policy becomes a FamilyChat member.
- The first Access-authenticated user becomes owner.
- Messages, rooms, MCP OAuth state, and connector metadata live in your Durable Object storage.
- Workers AI powers the resident Family Agent.

## Deploy to Cloudflare

After this folder is pushed to a public GitHub repository, update the URL below and use the button:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/oskarcode/familychat-access-standard)

The deploy flow provisions:

- Worker
- SQLite Durable Object
- Workers AI binding

It does not provision the Access application automatically. After deployment, open the Worker URL and follow the on-screen Cloudflare Access setup guide.

## Cloudflare Access setup

1. Deploy the Worker and copy the `workers.dev` hostname.
2. In Cloudflare Zero Trust, create an **Access → Self-hosted application**.
3. Use the Worker hostname as the application domain.
4. Add a policy allowing your family emails.
5. Set Worker variables:
   - `ACCESS_ISSUER=https://<your-team-name>.cloudflareaccess.com`
   - `ACCESS_AUDIENCE=<Access application AUD tag>`
6. Open the protected URL. The first verified user becomes owner.

## Local development

Localhost bypasses Access and uses a fixed Developer identity.

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
pnpm exec wrangler deploy
```

Then configure Cloudflare Access and Worker variables as described above.

## MCP connectors

Owners/admins can add Streamable HTTP MCP endpoints, complete OAuth, discover tools, refresh tool lists, and manually call tools. Agent-side automatic MCP tool use is intentionally left for the next phase.
