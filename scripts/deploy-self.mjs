#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";

const args = new Set(process.argv.slice(2));
const skipCheck = args.has("--skip-check");
const skipSecrets = args.has("--skip-secrets");

const run = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
    input: options.input,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(" ")} failed with exit code ${result.status}`);
  }
};

const capture = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, { cwd: process.cwd(), encoding: "utf8", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) return null;
  return result.stdout.trim();
};

const randomSecret = (bytes = 32) => randomBytes(bytes).toString("base64url");

if (!existsSync("wrangler.jsonc") || !existsSync("src/index.ts")) {
  throw new Error("Run this script from the FamilyChat project root.");
}

console.log("\nFamilyChat self-deploy helper\n");
console.log("This deploys the standard app-auth version to the currently logged-in Cloudflare account.");
console.log("It does not create Cloudflare Access. Access can be added later if desired.\n");

const whoami = capture("pnpm", ["exec", "wrangler", "whoami"]);
if (whoami === null) {
  console.log("Wrangler is not logged in yet. Opening Wrangler login...\n");
  run("pnpm", ["exec", "wrangler", "login"]);
}

if (!skipCheck) {
  console.log("\nRunning project checks before deploy...\n");
  run("pnpm", ["check"]);
}

let setupToken = null;
if (!skipSecrets) {
  const sessionSecret = randomSecret(48);
  setupToken = randomSecret(18);
  console.log("\nWriting Worker secrets for app-auth mode...\n");
  run("pnpm", ["exec", "wrangler", "secret", "put", "SESSION_SECRET"], { input: `${sessionSecret}\n` });
  run("pnpm", ["exec", "wrangler", "secret", "put", "SETUP_TOKEN"], { input: `${setupToken}\n` });
}

console.log("\nDeploying FamilyChat Worker...\n");
run("pnpm", ["exec", "wrangler", "deploy"]);

console.log("\nFamilyChat deploy complete.\n");
if (setupToken) {
  console.log("Owner setup token — save this now; it is not stored in the repository:");
  console.log(setupToken);
  console.log("\nOpen the deployed Worker URL and use this token to create the first owner account.");
} else {
  console.log("Skipped secret generation. Make sure SESSION_SECRET and SETUP_TOKEN already exist before owner setup.");
}
console.log("\nNext optional step: add Cloudflare Access later if you want an outer family perimeter.\n");
