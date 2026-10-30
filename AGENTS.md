# FamilyChat: agent deployment runbook

## 0. Identify the repository FIRST

Canonical source: **https://github.com/oskarcode/familychat-access-standard.git**.
This is NOT `oskarcode/family-agent`, `pi-durable-chat`, or the deploy wizard. Never infer the source from the terminal's current directory or a nearby project's remote.

For a fresh test, clone the canonical URL into a new folder, then work only there. If that folder exists, ask before reusing it. Do not scan parent directories or `node_modules` looking for another `AGENTS.md`.

Before installing or touching Cloudflare, verify:

```sh
git remote get-url origin
node -e "const p=require('./package.json'); if(p.name!=='familychat-access-standard'||p.scripts['deploy:agent']!=='node scripts/deploy-agent.mjs') process.exit(1)"
```

The origin must be the canonical repository (HTTPS/SSH), or a fork explicitly confirmed by the owner. Missing runbook/helper or a failed identity check means **STOP: wrong/outdated checkout**, not permission to improvise.

## 1. Prepare once

Read this file and `wrangler.jsonc`; do not audit application source for a routine deploy. Check Node/pnpm, then run:

```sh
pnpm install --frozen-lockfile
pnpm exec wrangler whoami --json
```

If unauthenticated, run `pnpm exec wrangler login` once and let the owner complete it. This authorizes deployment; it is **not Cloudflare Access login for family members**. Never read/copy another project's `.dev.vars` or request tokens in chat.

## 2. Confirm once

Ask one question containing the account name/ID, Worker name and **create versus update** intent. A fresh test needs a new Worker name; never default to an existing production/test deployment. Reconfirm only if the target changes. Do not edit `wrangler.jsonc` to rename the Worker.

## 3. Run ONE deployment command

After approval:

```sh
pnpm deploy:agent --account ACCOUNT_ID --name WORKER_NAME --yes
```

The helper performs remote checks, **runs `pnpm check`**, deploys code/secrets together, preserves existing secrets on updates, saves the private setup link and checks `/api/me`.

Do not separately run builds, dry-runs, tests, raw deploys, secret uploads or browser installs for an unchanged checkout. Never print `wrangler auth token` output. On failure, inspect only the named failing step/file and retry after fixing it; do not repeatedly deploy or research unrelated products. Follow any additional checks required by your environment.

## 4. Handoff, then STOP

Return the Worker URL, account/Worker, check result and **local setup-file path only**. Do not read/print the private link into tool output. The owner opens that file locally, creates their account, then deletes it. Show the Worker URL even when keeping the setup credential private; a fresh family still needs its setup token.

Let the owner test signup, invitations and Ask Agent. Do not create live test accounts, use paid AI, run browser automation, commit or push unless asked. Local browser tests are for code changes: `pnpm test:browser` (install Chromium once if missing).

## Stop conditions, not setup tasks

- **Cloudflare Access is NOT required or supported.** Do not create Access apps/policies, Google OAuth clients, VAPID keys, AI Gateways or custom domains for deployment.
- A retired-authentication error means an incompatible existing target. Stop; propose a new Worker name for a fresh test. Never remove security settings or bypass the guard.
- A redirect to an Access login means external protection or the wrong deployment. Verify repository and hostname; do not disable the policy automatically.
- Missing account permissions, workers.dev subdomain or existing secrets: report the exact blocker. Do not reset credentials/data.
- Keep `.env`, `.dev.vars`, `.wrangler/` and all credentials private. No changes to other projects or Cloudflare resources outside the approved target.
