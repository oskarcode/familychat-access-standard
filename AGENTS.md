# FamilyChat agent instructions

## One supported flow

Deploy FamilyChat into the owner's Cloudflare account. The Worker, SQLite Durable Object and Workers AI binding are declared in `wrangler.jsonc`. FamilyChat uses its own password accounts and room invitations. Do not introduce a separate deployment wizard or another login provider.

## Deploy

1. Read `README.md` and `wrangler.jsonc`. Check Node.js and pnpm are available, then run `pnpm install --frozen-lockfile`.
2. Run `pnpm exec wrangler whoami --json`. If unauthenticated, run `pnpm exec wrangler login` and let the owner complete the browser flow. Never ask them to paste a Cloudflare API token into chat.
3. Present the available accounts and confirm the exact **account ID and Worker name** with the owner. Reusing a Worker name updates that installation; a new name creates a separate family.
4. After approval, run:

   ```sh
   pnpm deploy:agent --account ACCOUNT_ID --name WORKER_NAME --yes
   ```

   All three arguments are required. `--yes` records that you already obtained approval; it is not permission to guess a target.

5. The helper checks remote configuration, runs tests and deploys code with newly generated secrets only for a fresh Worker. Updates preserve existing secrets and dashboard variables. Failed lookups and incomplete existing credentials stop deployment; never interpret them as permission to reset secrets.
6. The helper saves a private setup link in `.wrangler/setup-ACCOUNT-WORKER-TIMESTAMP.txt`, with mode `0600`. Give the owner that local path or open the link locally. Do not echo credentials into transcripts, commits, shared logs or screenshots.
7. The owner opens it, enters name/email/password/family name, and selects **Create my family**. Confirm **Family room** appears. Delete the private setup-link file after success, not before.
8. Verify an invitation in a second browser, a family message and **Ask Agent**. Live AI availability depends on the owner's Cloudflare account. Report real-account checks separately from local/mocked tests.

If the account has no workers.dev subdomain, guide the owner to configure one in the Cloudflare dashboard and retry. This script does not change GitHub repository visibility or grant repository access.

## Update safely

Use the same helper with the same approved account and Worker name. Never rotate `SESSION_SECRET` or `SETUP_TOKEN` merely to update code. Do not delete stored family data or remove bindings to get past deployment errors.

The former Cloudflare Access integration is **retired**, not an alternative setup path. The helper rejects its configuration with no bypass flag. The Worker also refuses requests if retired settings remain, preventing a silent authentication change when someone bypasses the helper. Existing installations using that login must remain on the previous release until an owner-approved migration is designed. Password accounts are not automatically created from old identity-provider accounts.

## Tests and local development

```sh
pnpm check
pnpm exec playwright install chromium
pnpm test:browser
```

`check` includes TypeScript, password/session and retired-configuration tests, Wrangler dry-run, local workerd/SQLite integration tests and a mocked deployment CLI test. Browser tests exercise owner setup, signup, existing-account invitations, room privacy, revocation and mobile layout. No tests call live AI or write to Cloudflare.

For development only, copy `.dev.vars.example` to `.dev.vars`, set local-only values for its two secrets, and use `pnpm exec wrangler dev`. Never reuse production credentials in tests.

The bootstrap token travels in a URL fragment and is removed from the address bar immediately. It is kept only in page memory. If the owner reloads before finishing, reopen the saved link. First-owner setup is transactional and closed after the first member exists.

## Boundaries

Do not commit `.dev.vars`, `.env` secrets, Cloudflare credentials, `.wrangler/`, private setup links, MCP credentials or local learning artifacts. Do not push, publish, deploy to another account, change external security policies, or migrate existing authentication without explicit approval. Keep changes focused; model settings, integrations, skills and the calendar are not deployment prerequisites.
