import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { planSecrets, setupLink } from './deploy-agent.mjs';

// Use the exact Miniflare version bundled with installed Wrangler, not a second runtime.
const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const code = readFileSync('.wrangler/dry-run/index.js', 'utf8');

export function localOptions(persist, extraBindings = {}) {
  return convertV4MiniflareOptions({
    modules: [
      { type: 'ESModule', path: resolve('test-runtime.js'), contents: `import handler, { FamilyChat } from './test-app.js';
        export class TestFamily extends FamilyChat {
          async testSQL(sql, ...args) { return this.ctx.storage.sql.exec(sql, ...args).toArray(); }
        }
        export default handler;` },
      { type: 'ESModule', path: resolve('test-app.js'), contents: code },
    ],
    compatibilityDate: '2025-10-21', compatibilityFlags: ['nodejs_compat'],
    durableObjects: { FAMILY: { className: 'TestFamily', useSQLite: true } },
    resourcePersistencePath: persist || undefined,
    bindings: { SESSION_SECRET: 'local-only-signing-key', SETUP_TOKEN: 'local-only-setup', ...extraBindings },
    // No remote AI binding: these tests cannot spend credits or access live data.
  });
}

async function request(mf, path, body, cookie, method = body ? 'POST' : 'GET') {
  const response = await mf.dispatchFetch('http://localhost' + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const ownerInput = { token: 'local-only-setup', name: 'Owner', email: 'owner@example.com', password: 'password-123', familyName: 'Our test family' };

if (process.argv[1]?.endsWith('test-onboarding.mjs')) {
  test('deploy planning preserves secrets and rejects incompatible configuration', () => {
    assert.deepEqual(planSecrets([{ name: 'SESSION_SECRET' }, { name: 'SETUP_TOKEN' }], true), {});
    assert.throws(() => planSecrets([{ name: 'SESSION_SECRET' }], true), /incomplete/);
    assert.throws(() => planSecrets([{ name: 'ACCESS_ISSUER' }], true), /Retired authentication/);
    assert.throws(() => planSecrets([{ name: 'AUTH_MODE', text: 'access' }], true), /Retired authentication/);
    const secrets = planSecrets([], false);
    assert.ok(secrets.SESSION_SECRET.length >= 40);
    assert.notEqual(secrets.SESSION_SECRET, secrets.SETUP_TOKEN);
    const url = new URL(setupLink('https://family.example.com', secrets.SETUP_TOKEN));
    assert.equal(url.search, ''); assert.ok(url.hash.startsWith('#setup='));
  });

  test('fresh setup, invitations, private rooms and code-only restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'family-test-'));
    let mf = new Miniflare(localOptions(directory));
    try {
      assert.equal((await request(mf, '/api/me')).data.setup.configured, false);
      assert.equal((await request(mf, '/api/setup', { ...ownerInput, token: 'wrong' })).status, 400);
      const owners = await Promise.all([request(mf, '/api/setup', ownerInput), request(mf, '/api/setup', { ...ownerInput, email: 'other@example.com' })]);
      assert.deepEqual(owners.map(r => r.status).sort(), [201, 400]);
      const owner = owners.find(r => r.status === 201);
      const ownerCookie = owner.cookie;
      assert.equal((await request(mf, '/api/me', null, ownerCookie)).data.setup.familyName, 'Our test family');
      const rooms = (await request(mf, '/api/workspaces', null, ownerCookie)).data.workspaces;
      assert.equal(rooms.length, 1); assert.equal(rooms[0].title, 'Family room');
      const familyRoom = rooms[0].id;
      const privateRoom = (await request(mf, '/api/workspaces', { title: 'Private planning' }, ownerCookie)).data.id;
      const invite = async room => (await request(mf, '/api/invites', { workspaceId: room }, ownerCookie)).data;
      const firstInvite = await invite(familyRoom);
      const joins = await Promise.all(['a', 'b'].map(n => request(mf, '/api/join', { code: firstInvite.code, name: n, email: n + '@example.com', password: 'password-123' })));
      assert.deepEqual(joins.map(r => r.status).sort(), [201, 400]);
      const guest = joins.find(r => r.status === 201);
      assert.deepEqual((await request(mf, '/api/workspaces', null, guest.cookie)).data.workspaces.map(r => r.id), [familyRoom]);
      assert.equal((await request(mf, `/api/workspaces/${privateRoom}/messages`, null, guest.cookie)).status, 400);
      const laterRoom = (await request(mf, '/api/workspaces', { title: 'New private room' }, ownerCookie)).data.id;
      assert.equal((await request(mf, `/api/workspaces/${laterRoom}/messages`, null, guest.cookie)).status, 400);
      const secondInvite = await invite(privateRoom);
      assert.equal((await request(mf, '/api/join', { code: secondInvite.code, name: 'Duplicate', email: guest.data.member.email.toUpperCase(), password: 'password-123' })).status, 400);
      const signedIn = await request(mf, '/api/login', { email: guest.data.member.email, password: 'password-123' });
      assert.equal(signedIn.status, 200);
      assert.equal((await request(mf, '/api/invites/accept', { code: secondInvite.code })).status, 401);
      const accepted = await request(mf, '/api/invites/accept', { code: secondInvite.code }, signedIn.cookie);
      assert.equal(accepted.status, 200); assert.equal(accepted.data.workspaceId, privateRoom);
      assert.equal((await request(mf, '/api/invites/accept', { code: secondInvite.code }, signedIn.cookie)).status, 400);
      assert.equal((await request(mf, '/api/me', null, signedIn.cookie)).data.member.role, 'member');
      const revoked = await invite(familyRoom);
      assert.equal((await request(mf, `/api/invites/${revoked.code}`, null, guest.cookie, 'DELETE')).status, 400);
      assert.equal((await request(mf, `/api/invites/${revoked.code}`, null, ownerCookie, 'DELETE')).status, 200);
      assert.equal((await request(mf, '/api/invites/accept', { code: revoked.code }, guest.cookie)).status, 400);
      const ns = await mf.getDurableObjectNamespace('FAMILY');
      const stub = ns.get(ns.idFromName('default-family'));
      const expired = await invite(familyRoom);
      await stub.testSQL('UPDATE invites SET expires_at = 0 WHERE code = ?', expired.code);
      assert.equal((await request(mf, '/api/invites/accept', { code: expired.code }, guest.cookie)).status, 400);
      const legacy = await invite(familyRoom);
      await stub.testSQL('UPDATE invites SET workspace_id = NULL WHERE code = ?', legacy.code);
      assert.equal((await request(mf, '/api/invites/accept', { code: legacy.code }, guest.cookie)).status, 400);
      // A storage failure rolls back member creation and leaves setup available.
      const isolated = ns.get(ns.idFromName('rollback-test'));
      await isolated.testSQL("CREATE TRIGGER fail_room BEFORE INSERT ON workspaces BEGIN SELECT RAISE(ABORT, 'test failure'); END");
      await assert.rejects(isolated.setupAppOwner({ ...ownerInput, expectedToken: ownerInput.token, passwordHash: 'test-hash' }));
      assert.equal((await isolated.setupStatus()).configured, false);
      // A code/runtime restart retains SQLite state and previously issued sessions.
      await mf.dispose(); mf = new Miniflare(localOptions(directory));
      assert.equal((await request(mf, '/api/me', null, ownerCookie)).data.member.id, owner.data.member.id);
      assert.equal((await request(mf, '/api/workspaces', null, guest.cookie)).data.workspaces.length, 2);
      assert.equal((await request(mf, '/api/setup', ownerInput)).status, 400);
    } finally { await mf.dispose(); rmSync(directory, { recursive: true, force: true }); }
  });

  test('retired deployment settings fail closed even when deployed outside the helper', async () => {
    for (const binding of [{ AUTH_MODE: 'access' }, { ACCESS_ISSUER: 'https://legacy.example.com' }, { ACCESS_AUDIENCE: 'legacy-audience' }]) {
      const mf = new Miniflare(localOptions(false, binding));
      try {
        assert.equal((await request(mf, '/api/me')).status, 503);
        assert.equal((await request(mf, '/api/setup', ownerInput)).status, 503);
        const ns = await mf.getDurableObjectNamespace('FAMILY');
        assert.equal((await ns.get(ns.idFromName('default-family')).setupStatus()).configured, false);
      } finally { await mf.dispose(); }
    }
  });

  test('identity headers no longer authenticate or auto-provision members', async () => {
    const mf = new Miniflare(localOptions(false));
    try {
      const response = await mf.dispatchFetch('http://localhost/api/me', { headers: { 'Cf-Access-Jwt-Assertion': 'not-a-session', 'Cf-Access-Authenticated-User-Email': 'outsider@example.com' } });
      const data = await response.json();
      assert.equal(data.ok, false);
      assert.equal(data.member, null);
      assert.equal(data.setup.configured, false);
      assert.equal((await request(mf, '/api/workspaces')).status, 401);
    } finally { await mf.dispose(); }
  });
}
