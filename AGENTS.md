# Deploy FamilyChat for its owner

## Goal and default

Deploy this repository into the **owner's** Cloudflare account, with app-owned password login. The Worker, SQLite Durable Object and Workers AI binding are declared in `wrangler.jsonc`. No custom wizard, GitHub deployment service or Cloudflare Access setup is required.

Example owner request:

> Deploy FamilyChat to my Cloudflare account. Guide me through Cloudflare sign-in, configure everything needed, and give me the setup link.

## Safe workflow

1. Read `README.md`, this file and `wrangler.jsonc`. Run `pnpm install --frozen-lockfile`.
2. Check `pnpm exec wrangler whoami --json`. If not authenticated, run `pnpm exec wrangler login` and let the owner complete the browser flow. Never ask for an API token in chat.
3. Confirm the exact account ID and Worker name with the owner. Existing Worker names mean **update**, not a new family. Do not change production authentication or delete data.
4. Run:

   ```sh
   pnpm deploy:self --account ACCOUNT_ID --name WORKER_NAME --yes
   ```

   `--yes` is only appropriate after the owner approves that target. Humans at an interactive terminal can just run `pnpm deploy:self`; it offers account selection and target confirmation.

5. The helper runs all checks, reads remote binding metadata, generates secrets **only for a fresh Worker**, and deploys code and secrets together. Existing credentials are preserved. Failed lookups are errors, never treated as permission to overwrite.
6. For a new install, give the owner the path to the private `.wrangler/setup-ACCOUNT-WORKER-TIMESTAMP.txt` file. It contains the setup link. Prefer opening that link locally on their machine; do not echo credentials into agent transcripts, shared logs, commits or screenshots. The file is mode `0600` and ignored by Git.
7. Owner opens the link, enters name/email/password/family name, and selects **Create my family**. The default **Family room** appears. Delete the private setup-link file after successful setup; do not delete it on a failed deploy if it might be needed to recover.
8. Owner clicks **Invite family** and shares the single-use link privately. Invitees create a password account, or sign in and explicitly accept the room invite. No Cloudflare account is required for invitees.

The setup credential is in a URL **fragment**, which is not sent with the initial HTTP request. The browser removes it from the address bar and keeps it in memory until setup. Owner setup is transactional and permanently closed after the first member exists. If the page is reloaded before setup, reopen the saved link.

## Updating an existing installation

Use the same helper with the **same account and Worker name**. It preserves secrets and dashboard vars. Never rotate `SESSION_SECRET` merely to deploy code; that invalidates sessions. Never generate a fresh `SETUP_TOKEN` to bypass completed setup.

The helper refuses incomplete existing app-auth configuration rather than guessing or resetting it. Inspect that deployment with the owner before repair. It also stops on detected Access bindings. `--allow-access` acknowledges an intentional **update of an already Access-configured deployment**, not permission to enable, disable or migrate authentication.

The helper requires an existing workers.dev account subdomain; if absent, guide the owner to configure it in the Cloudflare dashboard and retry. A private/unavailable GitHub repo must first be cloned by someone with access; this helper does not change repository visibility.

## Optional Access (advanced, separate from onboarding)

Cloudflare Access can protect the Worker hostname using a self-hosted application and an allow policy. Set `ACCESS_ISSUER` and `ACCESS_AUDIENCE` as secrets only after reviewing the auth migration with the owner. Both activate Access mode unless explicitly overridden by `AUTH_MODE=app`.

- Access users must first pass the Access policy.
- New Access identities no longer inherit every room; they accept room invites after signing in.
- Existing app/password identities are **not automatically merged** with Access identities.
- Previously granted room memberships are preserved. This update does not silently revoke access that earlier versions granted.
- Never enable Access as an automatic follow-up to a successful app-auth deploy.

## Test before committing

```sh
pnpm check
# Optional browser prerequisites, once:
pnpm exec playwright install chromium
pnpm test:browser
```

`check` includes TypeScript, Access unit tests, Wrangler dry-run, local workerd/SQLite HTTP and RPC integration tests, and a mocked deployment CLI test. Tests do not write to Cloudflare or call live AI. The browser test uses separate owner/invitee browser contexts and verifies setup, signup, existing-account invitations, room privacy, revocation and mobile layout.

After a real deployment, manually verify owner setup, a family invitation in another browser, normal chat and Ask Agent. Workers AI availability/entitlement depends on the owner's account. Report live tests separately from local/mocked tests.

## Secrets and data

Never commit `.dev.vars`, `.env` secrets, Cloudflare credentials, `.wrangler/`, private setup links, MCP credentials or local learning artifacts. Do not push commits, publish a repository, deploy to a different account or change Access policies without approval. No production data deletion is required for this workflow.
