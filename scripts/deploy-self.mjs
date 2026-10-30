#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';

// Pure planning function: redeploys never rotate credentials or silently switch auth.
export function planSecrets(bindings, exists, allowAccess = false) {
  const names = new Set(bindings.map(b => b.name));
  const access = ['ACCESS_ISSUER', 'ACCESS_AUDIENCE'].some(n => names.has(n)) || bindings.some(b => b.name === 'AUTH_MODE' && (b.type === 'secret_text' || b.text === 'access'));
  if (access && !allowAccess) throw new Error('Access configuration detected. Stop: review auth migration, or use --allow-access to preserve it unchanged.');
  if (access) return {};
  const missing = ['SESSION_SECRET', 'SETUP_TOKEN'].filter(n => !names.has(n));
  if (exists && missing.length) throw new Error('Existing Worker has incomplete app-auth secrets. Refusing to reset credentials; review it manually.');
  return Object.fromEntries(missing.map(n => [n, randomBytes(32).toString('base64url')]));
}

export function setupLink(origin, token) {
  const url = new URL(origin);
  url.hash = new URLSearchParams({ setup: token }).toString();
  return url.href;
}

export async function deploy() {
  const args = process.argv.slice(2).filter(a => a !== '--');
  const flags = new Set(['--yes', '--allow-access']);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (flags.has(arg)) options[arg] = true;
    else if (['--account', '--name'].includes(arg) && args[i + 1] && !args[i + 1].startsWith('--')) options[arg] = args[++i];
    else throw new Error('Usage: pnpm deploy:self [--account ACCOUNT_ID] [--name WORKER] [--yes] [--allow-access]');
  }
  const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8')); // This project's config is JSON-compatible.
  const name = options['--name'] || config.name;
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(name)) throw new Error('Invalid Worker name.');
  let environment = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
  const run = (commandArgs, capture = false) => {
    const result = spawnSync('pnpm', commandArgs, { encoding: 'utf8', env: environment, stdio: capture ? 'pipe' : 'inherit' });
    if (result.error || result.status !== 0) throw new Error(`Command failed: pnpm ${commandArgs.join(' ')}`);
    return result.stdout || '';
  };
  const wrangler = (commandArgs, capture = false) => run(['exec', 'wrangler', ...commandArgs], capture);
  let identity;
  try { identity = JSON.parse(wrangler(['whoami', '--json'], true)); }
  catch { wrangler(['login']); identity = JSON.parse(wrangler(['whoami', '--json'], true)); }
  const accounts = identity.accounts || [];
  let account = options['--account'] || process.env.CLOUDFLARE_ACCOUNT_ID || config.account_id;
  const terminal = process.stdin.isTTY && process.stdout.isTTY;
  const question = async (text) => {
    if (!terminal) throw new Error('Non-interactive deploy requires --account, --name and --yes after owner approval.');
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    try { return (await prompt.question(text)).trim(); } finally { prompt.close(); }
  };
  if (!account) {
    if (accounts.length === 1) account = accounts[0].id;
    else {
      accounts.forEach((a, i) => console.log(`${i + 1}. ${a.name} (${a.id})`));
      account = accounts[Number(await question('Choose account number: ')) - 1]?.id;
    }
  }
  if (!account || !accounts.some(a => a.id === account)) throw new Error('Select an account returned by Wrangler whoami.');
  if (!terminal && (!options['--account'] || !options['--name'] || !options['--yes'])) throw new Error('Agents must pass --account, --name and --yes after confirming the target with the owner.');
  environment = { ...environment, CLOUDFLARE_ACCOUNT_ID: account };
  // Capture credentials in memory only; never log token output or include it in arguments.
  const credential = JSON.parse(wrangler(['auth', 'token', '--json'], true));
  const headers = credential.type === 'api_key'
    ? { 'X-Auth-Key': credential.key, 'X-Auth-Email': credential.email }
    : { Authorization: `Bearer ${credential.token}` };
  const api = async (path, allowMissing = false) => {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, { headers });
    const data = await response.json();
    if (allowMissing && response.status === 404 && data.errors?.some(e => e.code === 10007)) return null;
    if (!response.ok || !data.success) throw new Error(`Cloudflare lookup failed (${response.status}) for ${path}. No deployment performed.`);
    return data.result;
  };
  const settings = await api(`/workers/scripts/${name}/settings`, true);
  // --keep-vars preserves omitted vars, but local definitions still override remote values.
  for (const binding of settings?.bindings || []) {
    if (['AUTH_MODE', 'ACCESS_ISSUER', 'ACCESS_AUDIENCE', 'SESSION_SECRET', 'SETUP_TOKEN'].includes(binding.name) && Object.hasOwn(config.vars || {}, binding.name) && (binding.type !== 'plain_text' || binding.text !== config.vars[binding.name])) {
      throw new Error(`Local ${binding.name} conflicts with the existing auth binding. Review the migration manually.`);
    }
  }
  // Include local vars so a configuration change cannot silently turn Access on/off.
  const bindings = [...(settings?.bindings || []), ...Object.entries(config.vars || {}).map(([name, text]) => ({ name, text, type: 'plain_text' }))];
  const secrets = planSecrets(bindings, settings !== null, Boolean(options['--allow-access']));
  const subdomain = await api('/workers/subdomain');
  if (!subdomain?.subdomain) throw new Error('Enable your workers.dev subdomain in the Cloudflare dashboard first.');
  const origin = `https://${name}.${subdomain.subdomain}.workers.dev`;
  console.log(`\n${settings ? 'UPDATE existing' : 'CREATE new'} Worker: ${name}\nAccount: ${accounts.find(a => a.id === account).name} (${account})\nURL: ${origin}\nExisting secrets will be preserved. No Access policies will be changed.`);
  if (!options['--yes'] && await question('Type the Worker name to confirm: ') !== name) throw new Error('Cancelled.');
  run(['check']);
  let setupPath;
  if (secrets.SETUP_TOKEN) {
    mkdirSync('.wrangler', { recursive: true, mode: 0o700 });
    setupPath = resolve('.wrangler', `setup-${account}-${name}-${Date.now()}.txt`);
    writeFileSync(setupPath, `PRIVATE: use once to create the owner, then delete this file.\n${setupLink(origin, secrets.SETUP_TOKEN)}\n`, { mode: 0o600, flag: 'wx' });
    console.log(`Private setup link saved to ${setupPath}. Keep it private; it is not printed to deployment logs.`);
  }
  const temporary = mkdtempSync(join(tmpdir(), 'familychat-deploy-'));
  try {
    const command = ['deploy', '--name', name, '--keep-vars'];
    if (Object.keys(secrets).length) {
      const file = join(temporary, 'secrets.json');
      writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 });
      command.push('--secrets-file', file);
    }
    wrangler(command);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
  console.log(`\nDeployed: ${origin}\n${setupPath ? 'Open the private setup link saved above. Delete that file after creating your owner account.' : 'Existing login and secrets preserved. Open your normal app URL.'}`);
  // Never follow Access redirects or send the setup credential during the smoke check.
  try {
    const response = await fetch(`${origin}/api/me`, { redirect: 'manual' });
    if (response.ok) {
      const state = await response.json();
      console.log(`Smoke check: auth=${state.mode}, owner configured=${state.setup?.configured}, secrets ready=${state.configured ?? 'Access mode'}`);
    } else console.log(`Smoke check returned HTTP ${response.status}; verify the URL in your browser.`);
  } catch { console.log('Smoke check unavailable. Verify the URL in your browser.'); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  deploy().catch(error => { console.error(error.message); process.exitCode = 1; });
}
