# FamilyChat Standard

A private AI group chat for your family, self-deployed to your own Cloudflare account.

## About the Author

### 🚀 About Me

My name is Oskar Ablimit, and I am a Senior Sales Engineer with an engineering mindset, holding a Master of Engineering in Cloud Computing from George Washington University. I foster long-term tech C-suite connections and specialize in Cloud Security, AI, Network, and Cybersecurity solutions across Fortune 500 tech firms, bridging technical expertise with business transformation.

### 🏆 Professional Achievements

Proven technical sales experience with $1M+ quota achievement and 8+ years of consultative-based selling for IaaS and SaaS solutions. Currently serving as a Senior Sales Engineer at Cloudflare in New York, leveraging my top 10% enterprise sales performance with deep technical expertise to drive customer success through solution architecture and technical demonstrations.

### 👨‍🏫 Teaching & Mentorship

Adjunct Professor at Yeshiva University, delivering comprehensive cloud computing courses with hands-on AWS projects to graduate students in AI, Data Science, and Cybersecurity tracks.

### 💡 Technical Focus

My technical expertise combines strong learning and hands-on experience in Cloud, Cybersecurity, and AI technologies. I enjoy building Django applications and exploring new technologies in my spare time, bridging the gap between technical solutions and business transformation through solution engineering excellence.

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
