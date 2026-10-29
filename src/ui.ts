export const appHtml = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FamilyChat</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #20242c; background: #f7f8fa; --accent:#f06449; --accent-hover:#da5239; --accent-soft:#fff0eb; --blue:#2563eb; --surface:#fff; --surface-muted:#f6f7f9; --line:#e5e7eb; --text-muted:#68707d; --danger:#b4233c; --shadow-sm:0 1px 2px rgb(16 24 40 / 5%); --shadow-lg:0 16px 40px rgb(16 24 40 / 10%); }
    * { box-sizing: border-box; }
    html, body { min-height: 100%; }
    body { margin: 0; background: #f7f8fa; color: #20242c; font-size: .9375rem; line-height: 1.5; }
    body.app-ready { overflow: hidden; }
    button, input, textarea, select { font: inherit; }
    button { min-height: 2.375rem; border: 1px solid var(--line); border-radius: .625rem; padding: .5rem .75rem; background: var(--surface); color: inherit; box-shadow: var(--shadow-sm); cursor: pointer; font-weight: 700; transition: background 140ms ease, border-color 140ms ease, transform 140ms ease; }
    button:hover:not(:disabled) { border-color: #c9cdd4; background: #fafafa; }
    button:active:not(:disabled) { transform: translateY(1px); }
    button.secondary { background: var(--surface); color: #20242c; }
    button.agent, #sendFamily { border-color: var(--accent); background: var(--accent); color: white; }
    #sendFamily { border-color: var(--blue); background: var(--blue); }
    button.agent:hover:not(:disabled), #sendFamily:hover:not(:disabled) { background: var(--accent-hover); color: white; }
    input, textarea, select { width: 100%; border: 1px solid var(--line); border-radius: .625rem; padding: .625rem .75rem; background: white; color: #20242c; }
    textarea { min-height: 5rem; resize: vertical; }
    .shell { max-width: 1180px; margin: 0 auto; padding: 1.5rem; }
    body.app-ready .shell { max-width: none; height: 100dvh; padding: 0; }
    body.app-ready .hero { display: none; }
    .hero, .card { background: var(--surface); border: 1px solid var(--line); border-radius: 1rem; padding: 1rem; box-shadow: var(--shadow-lg); }
    .hero { background: linear-gradient(135deg, #fff, var(--accent-soft)); border-radius: 1.25rem; padding: 1.5rem; }
    .hero h1 { margin: 0 0 .25rem; font-size: clamp(2rem, 5vw, 3rem); letter-spacing: -.045em; }
    .auth { max-width: 1000px; margin: 1rem auto 0; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .story { background: linear-gradient(160deg, #20242c, var(--accent)); color: white; border: 0; padding: 1.4rem; }
    .story h2 { font-size: clamp(1.8rem, 4vw, 3rem); line-height: 1; letter-spacing: -.04em; margin: 0 0 1rem; }
    .story p, .story .muted { color: rgba(255,255,255,.82); }
    .pill-list { display: grid; gap: .65rem; margin-top: 1.25rem; }
    .pill { display: flex; gap: .6rem; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); border-radius: .875rem; padding: .75rem; }
    .tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: .35rem; background: var(--surface-muted); padding: .35rem; border-radius: .875rem; }
    .tabs button { background: transparent; color: var(--text-muted); box-shadow: none; padding: .55rem; }
    .tabs button.active { background: white; color: #20242c; box-shadow: var(--shadow-sm); }
    .grid { display: grid; grid-template-columns: 280px minmax(0,1fr); gap: 1rem; margin-top: 1rem; }
    body.app-ready .grid { height: 100dvh; grid-template-columns: minmax(15rem, 17.5rem) minmax(0, 1fr); gap: 0; margin: 0; background: var(--surface); }
    body.app-ready .grid > .card { min-height: 0; border-width: 0; border-radius: 0; box-shadow: none; }
    body.app-ready .grid > aside:first-child { display: flex; flex-direction: column; overflow-y: auto; border-right: 1px solid var(--line); background: var(--surface-muted); padding: 1rem; }
    body.app-ready .grid > aside:last-child { overflow-y: auto; border-left: 1px solid var(--line); background: var(--surface); padding: 1rem; }
    body.app-ready .grid > section.card { display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; gap: 0; padding: 0; overflow: hidden; }
    body.app-ready .grid > section.card > .row:first-child { padding: .875rem 1.25rem; border-bottom: 1px solid var(--line); background: rgb(255 255 255 / 92%); backdrop-filter: blur(12px); }
    body.app-ready .grid h2 { margin: .5rem 0; letter-spacing: -.02em; }
    body.app-ready aside h2 { color: var(--text-muted); font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; }
    .stack { display: grid; gap: .75rem; }
    .row { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
    .muted { color: var(--text-muted); font-size: .92rem; }
    .error { color: var(--danger); font-weight: 800; }
    .hidden { display: none !important; }
    .item { display: block; width: 100%; border: 0; box-shadow: none; text-align: left; margin-bottom: .4rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item.active { background: var(--surface); color: #20242c; box-shadow: var(--shadow-sm); font-weight: 700; }
    .messages { height: 56vh; overflow-y: auto; overflow-anchor: none; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 1.15rem; padding: 1.75rem max(1rem, calc((100% - 52rem) / 2)); background: var(--surface); scrollbar-gutter: stable; }
    body.app-ready .messages { height: auto; min-height: 0; }
    .msg { display: grid; gap: .375rem; max-width: 48rem; white-space: pre-wrap; overflow-wrap: anywhere; }
    .msg.mine { align-self: flex-end; width: fit-content; max-width: min(82%, 42rem); padding: .8rem 1rem; border: 1px solid #e9e6e2; border-radius: 1.25rem 1.25rem .35rem 1.25rem; background: #f4f2ef; color: #2f2c29; }
    .msg.agent, .msg.agent-request { align-self: stretch; padding-inline: .125rem; border: 0; background: transparent; }
    .msg.agent-request { color: var(--accent); }
    .msg:not(.mine):not(.agent):not(.agent-request) { width: fit-content; max-width: min(82%, 42rem); padding: .8rem 1rem; border: 1px solid var(--line); border-radius: 1.25rem 1.25rem 1.25rem .35rem; background: var(--surface-muted); }
    .byline { color: var(--text-muted); font-weight: 700; font-size: .6875rem; letter-spacing: .02em; }
    .msg.mine .byline { color: #837e78; }
    #composer { width: calc(100% - 2.5rem); min-height: 5rem; margin: 1rem 1.25rem .75rem; border-radius: .875rem; resize: none; }
    #composer + .row { padding: 0 1.25rem 1rem; }
    #chatError { padding: 0 1.25rem 1rem; }
    #members > div { display: grid; gap: .125rem; padding: .35rem 0; }
    #roomInviteResult { overflow-wrap: anywhere; flex-basis:100%; text-align:left; max-width:34rem; }
    .invite-guide { display:grid; gap:.35rem; padding:.7rem .8rem; border:1px solid var(--line); border-radius:.8rem; background:#fffaf8; box-shadow:var(--shadow-sm); font-size:.78rem; }
    .invite-guide ol { margin:.25rem 0 0 1.1rem; padding:0; }
    .invite-guide li { margin:.18rem 0; }
    #connectors .card { box-shadow: var(--shadow-sm); }
    code { background: var(--surface-muted); padding: .15rem .35rem; border-radius: .4rem; }
    pre { overflow: auto; max-height: 12rem; }
    /* Current pi-durable-chat inspired shell: warm FamilyOS sidebar, central transcript, floating composer. */
    body.app-ready .grid { grid-template-columns: minmax(15rem, 17.5rem) minmax(0, 1fr); background:#fff; }
    body.app-ready .session-sidebar-lite { background:#fafafa; border-right:1px solid var(--line); padding:0; }
    .workspace-brand { display:flex; min-width:0; align-items:center; gap:.65rem; padding:.95rem .9rem; border-bottom:1px solid var(--line); }
    .workspace-brand > span:last-child { display:grid; min-width:0; }
    .workspace-brand strong, .workspace-brand small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .workspace-brand small { color:var(--text-muted); font-size:.7rem; }
    .workspace-avatar, .workspace-monogram { display:inline-grid; flex:none; place-items:center; background:#e8e6e2; color:#57534e; font-weight:650; text-transform:uppercase; }
    .workspace-avatar { width:2rem; height:2rem; border-radius:.55rem; }
    .new-workspace-button { display:flex; width:calc(100% - 1.5rem); align-items:center; justify-content:flex-start; gap:.5rem; margin:.8rem .75rem .35rem; border:0; background:#e9e7e4; box-shadow:none; font-weight:600; }
    .new-workspace-button:hover:not(:disabled) { background:#dfddd9; }
    .compact-input { width:calc(100% - 1.5rem); margin:0 .75rem .7rem; min-height:2.2rem; padding:.45rem .65rem; background:#fff; }
    .sidebar-section { padding:1rem .55rem .5rem; border-top:1px solid var(--line); }
    .sidebar-label-row { display:flex; align-items:center; justify-content:space-between; gap:.5rem; padding-inline:.35rem; margin-bottom:.65rem; }
    .sidebar-label-row h2 { margin:0; color:#8a8782; font-size:.69rem; font-weight:650; letter-spacing:.09em; text-transform:uppercase; }
    .sidebar-label-row span { color:#9b9893; font-size:.68rem; }
    .nav-list { display:grid; gap:.18rem; }
    .nav-list .item { display:flex; align-items:center; gap:.55rem; min-height:2.25rem; margin:0; padding:.42rem; border-radius:.55rem; background:transparent; color:#34312e; font-size:.82rem; }
    .nav-list .item::before { content:attr(data-initials); display:inline-grid; width:1.65rem; height:1.65rem; flex:none; place-items:center; border-radius:.45rem; background:#e8e6e2; color:#57534e; font-size:.61rem; font-weight:700; }
    .nav-list .item.active { background:#ebe9e6; box-shadow:none; }
    .people-list-lite { display:grid; gap:.35rem; padding-inline:.35rem; }
    .people-list-lite > div { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; gap:.55rem; padding:.3rem 0; }
    .people-list-lite > div::before { content:attr(data-initial); display:inline-grid; width:1.7rem; height:1.7rem; place-items:center; border-radius:.45rem; background:#efede9; color:#595550; font-size:.68rem; font-weight:700; }
    .small-button { min-height:2rem; padding:.3rem .65rem; font-size:.78rem; }
    .session-sidebar-footer-lite { margin-top:auto; display:grid; gap:.4rem; padding:.8rem .9rem; border-top:1px solid var(--line); }
    .session-sidebar-footer-lite small { overflow:hidden; color:var(--text-muted); font-size:.65rem; text-overflow:ellipsis; white-space:nowrap; }
    body.app-ready .conversation-view-lite { display:grid; grid-template-rows:auto minmax(0,1fr) auto auto; background:#fff; }
    .conversation-header-lite { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.875rem 1.25rem; border-bottom:1px solid var(--line); background:rgb(255 255 255 / 92%); backdrop-filter:blur(12px); }
    .conversation-header-lite h2 { margin:0; color:#211f1d; font-size:1.05rem; }
    .conversation-header-lite small { color:var(--text-muted); font-size:.7rem; }
    .conversation-header-lite p { margin:0; }
    .room-actions { display:flex; align-items:center; justify-content:flex-end; gap:.75rem; flex-wrap:wrap; }
    body.app-ready .messages { padding:1.75rem max(1rem, calc((100% - 52rem) / 2)); }
    .msg.agent, .msg.agent-request { max-width:48rem; }
    .msg.agent .byline, .msg.agent-request .byline { color:#8a8782; }
    .msg.agent > div:last-child, .msg.agent-request > div:last-child { color:#24211f; line-height:1.55; }
    .prompt-bar { display:grid; gap:.1rem; width:min(calc(100% - 2rem), 62rem); max-width:62rem; margin:0 auto .75rem; padding:.35rem; border:1px solid #d9dce2; border-radius:1.35rem; background:#fff; box-shadow:0 10px 30px rgb(16 24 40 / 10%); transition:border-color 140ms ease, box-shadow 140ms ease; }
    .prompt-bar:focus-within { border-color:color-mix(in srgb, var(--accent) 45%, #d9dce2); box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 9%, transparent), 0 12px 34px rgb(16 24 40 / 12%); }
    #composer { width:100%; min-height:3.25rem; max-height:12rem; margin:0; padding:.7rem .9rem .2rem; resize:none; overflow-y:hidden; border:0; border-radius:1rem; background:transparent; box-shadow:none; font-size:1rem; line-height:1.5; }
    #composer:focus { outline:0; }
    .composer-footer { display:flex; min-height:2.35rem; align-items:center; justify-content:space-between; gap:.75rem; padding:.25rem .3rem .3rem .7rem; }
    .composer-status { display:grid; min-width:0; color:var(--text-muted); font-size:.7rem; }
    .composer-actions { display:flex; flex:none; gap:.45rem; }
    .prompt-bar button { min-width:5rem; min-height:2.2rem; padding:.35rem .8rem; border-radius:999px; font-weight:650; }
    .prompt-bar .ask-agent-button { min-width:6.25rem; border-color:var(--accent); background:var(--accent); color:white; box-shadow:0 4px 12px rgb(240 100 73 / 20%); }
    .prompt-bar .ask-agent-button:hover:not(:disabled) { border-color:var(--accent-hover); background:var(--accent-hover); }
    .prompt-bar .send-family-button { border-color:#ddd9d4; background:#f1efec; color:#4f4a45; box-shadow:none; }
    .prompt-bar .send-family-button:hover:not(:disabled) { border-color:#cfcbc5; background:#e7e4e0; color:#302d2a; }
    .settings-launcher { justify-content:flex-start; box-shadow:none; }
    .settings-backdrop { display:none; position:fixed; inset:0; z-index:20; background:rgb(0 0 0 / 34%); backdrop-filter:blur(5px); }
    body.settings-open .settings-backdrop { display:block; }
    .connections-panel { display:none; position:fixed; z-index:21; top:50%; left:50%; width:min(100% - 2rem, 34rem); max-height:min(82dvh, 48rem); overflow-y:auto; transform:translate(-50%, -50%); padding:1rem; border:1px solid var(--line); border-radius:1rem; background:#fff; box-shadow:0 30px 90px rgb(20 18 16 / 24%); }
    body.app-ready .grid > .connections-panel { position:fixed; min-height:0; border:1px solid var(--line); border-radius:1rem; padding:1rem; background:#fff; box-shadow:0 30px 90px rgb(20 18 16 / 24%); }
    body.settings-open .connections-panel { display:grid; }
    .settings-header { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; }
    .settings-header small { color:var(--text-muted); font-size:.72rem; }
    .settings-header h2 { margin:.1rem 0 0; color:#20242c; font-size:1.25rem; letter-spacing:-.03em; text-transform:none; }
    .settings-close { width:2.35rem; min-width:2.35rem; border:0; border-radius:.8rem; background:#f8f7f6; box-shadow:none; font-size:1.2rem; }
    .settings-tabs { display:flex; gap:.35rem; padding:.35rem; border-radius:.85rem; background:#f6f4f2; }
    .settings-tabs button { min-height:2.1rem; border:0; background:transparent; box-shadow:none; color:#605c57; font-weight:500; }
    .settings-tabs button.active { background:#fff; color:#20242c; box-shadow:var(--shadow-sm); }
    .settings-section-card { display:grid; gap:.65rem; padding:.85rem; border:1px solid var(--line); border-radius:.85rem; background:#fff; }
    .settings-panel-view.hidden { display:none; }
    .calendar-toolbar { display:grid; grid-template-columns:1fr auto; gap:.5rem; align-items:end; }
    .schedule-list { display:grid; gap:.5rem; max-height:20rem; overflow:auto; }
    .schedule-item { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:.65rem; align-items:center; padding:.7rem; border:1px solid var(--line); border-radius:.75rem; background:#fafafa; }
    .schedule-item strong, .schedule-item small { overflow:hidden; text-overflow:ellipsis; }
    .schedule-item time { color:var(--accent); font-size:.75rem; font-weight:700; }
    .connections-panel h2 { margin:.35rem 0 0; color:#8a8782; font-size:.69rem; letter-spacing:.09em; text-transform:uppercase; }
    .empty-chat { min-height:100%; display:grid; place-content:center; gap:1rem; padding:2rem; text-align:center; background:linear-gradient(180deg, transparent 0 30%, #fff 60%), repeating-linear-gradient(25deg, transparent 0 28px, rgb(233 231 228 / 35%) 29px 30px); }
    .empty-chat-mark { display:inline-grid; place-self:center; width:2.2rem; height:2.2rem; place-items:center; border-radius:.85rem; background:#fff0eb; color:var(--accent); }
    .empty-chat h2 { margin:0; color:#211f1d; font-size:clamp(2rem, 4vw, 2.7rem); line-height:1.05; letter-spacing:-.06em; }
    .empty-chat p { margin:0; color:var(--text-muted); }
    @media (max-width: 900px) { body.app-ready { overflow: auto; } .grid, .auth, body.app-ready .grid { grid-template-columns: 1fr; height: auto; } body.app-ready .grid > aside:first-child, body.app-ready .grid > aside:last-child { border: 0; } .messages { height: 44vh; } .msg, .msg.mine { max-width: 100%; } .conversation-header-lite { display:grid; } .connections-panel { width:min(100% - 1rem, 34rem); } }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <h1>FamilyChat</h1>
      <p>A private AI group chat for your family, self-deployed to your Cloudflare account.</p>
      <p id="status" class="muted">Loading…</p>
    </section>

    <section id="auth" class="auth hidden">
      <div class="card story">
        <p class="muted">Self-hosted by your Cloudflare account</p>
        <h2>Your family's AI space, owned by you.</h2>
        <p>Deploy once, create the owner account, invite family, and keep chat state plus MCP credentials in your Durable Object storage.</p>
        <div class="pill-list">
          <div class="pill">💬 <div><strong>Human chat first.</strong><br><span class="muted">Normal messages do not call AI.</span></div></div>
          <div class="pill">🤖 <div><strong>Resident Family Agent.</strong><br><span class="muted">Ask Agent when you want help.</span></div></div>
          <div class="pill">🔐 <div><strong>Optional Access mode.</strong><br><span class="muted">Default auth is one-click deploy friendly; advanced users can switch to Cloudflare Access.</span></div></div>
        </div>
      </div>
      <div class="card stack">
        <div class="tabs"><button id="tabSetup" class="active">Create owner</button><button id="tabLogin">Sign in</button><button id="tabJoin">Join</button></div>
        <div id="setupForm" class="stack">
          <h2>Create the family owner</h2><p class="muted">Use the setup token entered during Deploy to Cloudflare. The first owner can invite everyone else.</p>
          <input id="setupName" placeholder="Your name" autocomplete="name" />
          <input id="setupEmail" placeholder="Email" autocomplete="email" />
          <input id="setupPassword" placeholder="Password (8+ characters)" type="password" autocomplete="new-password" />
          <input id="setupToken" placeholder="Setup token" type="password" />
          <button id="setupButton">Create owner account</button>
        </div>
        <div id="loginForm" class="stack hidden">
          <h2>Welcome back</h2><p class="muted">Sign in to this self-deployed FamilyChat.</p>
          <input id="loginEmail" placeholder="Email" autocomplete="email" />
          <input id="loginPassword" placeholder="Password" type="password" autocomplete="current-password" />
          <button id="loginButton">Sign in</button>
        </div>
        <div id="joinForm" class="stack hidden">
          <h2>Join a family</h2><p class="muted">Ask the owner/admin for an invite code.</p>
          <input id="joinName" placeholder="Your name" autocomplete="name" />
          <input id="joinEmail" placeholder="Email" autocomplete="email" />
          <input id="joinPassword" placeholder="Password (8+ characters)" type="password" autocomplete="new-password" />
          <input id="joinCode" placeholder="Invite code" />
          <button id="joinButton">Join family</button>
        </div>
        <p id="authError" class="error"></p>
      </div>
    </section>

    <section id="accessSetup" class="auth hidden">
      <div class="card story"><h2>Cloudflare Access mode</h2><p>If AUTH_MODE is set to access, protect this Worker with Access and set ACCESS_ISSUER / ACCESS_AUDIENCE.</p></div>
      <div class="card stack"><h2>Finish Access setup</h2><p>Application domain: <code id="setupHost"></code></p><p>Current state: <code id="accessState"></code></p><p class="muted">Create an Access self-hosted application, allow your family emails, set the Worker variables, then reload.</p></div>
    </section>

    <section id="app" class="grid hidden">
      <aside class="card stack session-sidebar-lite">
        <header class="workspace-brand">
          <span class="workspace-avatar" id="memberAvatar" aria-hidden="true">F</span>
          <span><strong>FamilyChat</strong><small id="memberLabel">Family workspace</small></span>
        </header>
        <button id="newWorkspaceButton" class="new-workspace-button secondary"><span aria-hidden="true">＋</span> New room</button>
        <input id="newWorkspace" class="compact-input" placeholder="Room name" />
        <nav class="sidebar-section" aria-labelledby="roomsHeading"><div class="sidebar-label-row"><h2 id="roomsHeading">Rooms</h2><span id="roomCount">0</span></div><div id="workspaces" class="nav-list"></div></nav>
        <section class="sidebar-section"><div class="sidebar-label-row"><h2>Family</h2></div><div id="members" class="people-list-lite"></div></section>
        <footer class="session-sidebar-footer-lite"><button id="settingsButton" class="settings-launcher secondary small-button" type="button"><span aria-hidden="true">⚙</span> Settings</button><small id="signedInLabel">Signed in</small><button id="logoutButton" class="secondary small-button">Logout</button></footer>
      </aside>
      <section class="card stack conversation-view-lite">
        <header class="conversation-header-lite"><div><small>Current room</small><h2 id="roomTitle">Family room</h2></div><div class="room-actions"><p class="muted">Send to everyone, or ask the resident Family Agent.</p><button id="roomInviteButton" class="secondary small-button" type="button">Invite to this room</button><p id="roomInviteResult" class="muted"></p></div></header>
        <div id="messages" class="messages"></div>
        <form class="prompt-bar" id="composerForm"><textarea id="composer" placeholder="Start a new message…"></textarea><div class="composer-footer"><span class="composer-status" id="modelLabel">Workers AI · open-weight model</span><div class="composer-actions"><button id="sendFamily" class="send-family-button" type="button">Send to Family</button><button id="sendAgent" class="ask-agent-button agent" type="button">Ask Agent</button></div></div></form>
        <p id="chatError" class="error"></p>
      </section>
      <div id="settingsBackdrop" class="settings-backdrop"></div>
      <aside class="card stack connections-panel" role="dialog" aria-modal="true" aria-labelledby="settingsHeading">
        <header class="settings-header"><div><small>FamilyChat</small><h2 id="settingsHeading">Settings</h2></div><button id="settingsClose" class="settings-close" type="button" aria-label="Close settings">×</button></header>
        <nav class="settings-tabs" aria-label="Settings sections"><button id="settingsTabTools" class="active" type="button">Tools</button><button id="settingsTabCalendar" type="button">Calendar</button><button id="settingsTabAccount" type="button">Account</button></nav>
        <div id="settingsViewTools" class="settings-panel-view stack">
          <section class="settings-section-card"><h2>Agent model</h2><p class="muted">Choose a Workers AI open-weight model, or bring your own Anthropic key for Claude.</p><select id="aiProvider"><option value="workers-ai">Workers AI</option><option value="anthropic">Anthropic / Claude</option></select><select id="aiModel"></select><input id="anthropicKey" type="password" placeholder="Anthropic API key (only for Claude)" /><button id="aiSettingsButton" class="secondary">Save model</button><p id="aiSettingsResult" class="muted"></p></section>
          <section class="settings-section-card"><h2>Invite + Access reminder</h2><p class="muted">Cloudflare Access is the family perimeter. A room invite controls room membership, but new people must also be allowed by your Access policy before they can open the Worker URL.</p></section>
          <section class="settings-section-card"><h2>Skills</h2><p class="muted">Create small Family Agent skills stored in this Durable Object filesystem.</p><div id="skills" class="stack"></div><input id="skillTitle" placeholder="Skill title, e.g. Meal planner" /><textarea id="skillDescription" placeholder="What should this skill help with?"></textarea><button id="skillButton" class="secondary">Create skill</button><p id="skillError" class="error"></p></section>
          <section class="settings-section-card"><h2>Connections</h2><p class="muted">Connect Streamable HTTP MCP services for family tools.</p><div id="connectors" class="stack"></div><input id="connectorLabel" placeholder="Label, e.g. Gmail MCP" /><input id="connectorUrl" placeholder="https://mcp.example.com/mcp" /><button id="connectorButton" class="secondary">Add connector</button><p id="connectorError" class="error"></p></section>
        </div>
        <div id="settingsViewCalendar" class="settings-panel-view stack hidden">
          <section class="settings-section-card"><h2>Schedule calendar</h2><p class="muted">Save family reminders and planned Agent work. Full automatic background execution from pi-durable-agent is not in this standard Worker yet.</p><div class="calendar-toolbar"><label class="stack"><span class="muted">Room</span><select id="scheduleWorkspace"></select></label><button id="refreshCalendarButton" class="secondary" type="button">Refresh</button></div><input id="scheduleInstruction" placeholder="What should happen? e.g. Review tomorrow's school pickup" /><input id="scheduleRunAt" type="datetime-local" /><button id="scheduleButton" class="secondary" type="button">Create schedule</button><p id="scheduleError" class="error"></p><div id="scheduleList" class="schedule-list"></div></section>
        </div>
        <div id="settingsViewAccount" class="settings-panel-view stack hidden">
          <section class="settings-section-card"><h2>Account</h2><div class="row"><span class="workspace-avatar" id="accountAvatar" aria-hidden="true">F</span><span><strong id="accountName">Family member</strong><br><span id="accountEmail" class="muted"></span></span></div><p class="muted">Authentication mode: <code id="accountMode">app</code>. In Access mode, Cloudflare Access protects the family perimeter; FamilyChat controls room membership.</p></section>
        </div>
      </aside>
    </section>
  </main>

  <script type="module">
    const $ = (id) => document.getElementById(id);
    let state = { member: null, workspaces: [], workspaceId: null, setupConfigured: false, mode: 'app', aiModels: [], aiSettings: null, skills: [], schedules: [] };
    async function api(path, options = {}) { const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Request failed'); return data; }
    const show = (id) => $(id).classList.remove('hidden'); const hide = (id) => $(id).classList.add('hidden');
    const esc = (value) => String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
    function selectTab(name) { ['Setup','Login','Join'].forEach((n) => { $('tab'+n).classList.toggle('active', n.toLowerCase() === name); $(n.toLowerCase()+'Form').classList.toggle('hidden', n.toLowerCase() !== name); }); $('authError').textContent = ''; }
    ['Setup','Login','Join'].forEach((n) => $('tab'+n).onclick = () => selectTab(n.toLowerCase()));
    function showAuth(me) { document.body.classList.remove('app-ready'); hide('app'); hide('accessSetup'); show('auth'); state.mode = me.mode || 'app'; state.setupConfigured = me.setup?.configured === true; const invite = new URLSearchParams(location.search).get('invite'); if (invite) { $('joinCode').value = invite; selectTab('join'); } else if (state.setupConfigured) selectTab('login'); else selectTab('setup'); $('status').textContent = me.configured === false ? 'Worker secrets SESSION_SECRET and SETUP_TOKEN are required.' : 'Create or sign in to your FamilyChat account.'; }
    function showAccessSetup(access) { document.body.classList.remove('app-ready'); hide('app'); hide('auth'); show('accessSetup'); $('setupHost').textContent = location.host; $('accessState').textContent = access?.state || 'unknown'; $('status').textContent = 'Cloudflare Access setup required'; }
    const initials = (value) => String(value || 'F').trim().split(/\s+/).slice(0,2).map((part) => part[0]).join('').toUpperCase() || 'F';
    async function boot() { const me = await api('/api/me'); hide('auth'); hide('accessSetup'); hide('app'); if (me.mode === 'access' && !me.ok) { showAccessSetup(me.access); return; } if (!me.ok) { showAuth(me); return; } state.member = me.member; state.mode = me.mode; $('status').textContent = 'Signed in as ' + state.member.name + ' · ' + state.member.role; $('memberAvatar').textContent = initials(state.member.name); $('memberLabel').textContent = state.member.name; $('signedInLabel').textContent = state.member.email || state.member.name; $('accountAvatar').textContent = initials(state.member.name); $('accountName').textContent = state.member.name; $('accountEmail').textContent = (state.member.email || '') + ' · ' + state.member.role; $('accountMode').textContent = state.mode; document.body.classList.add('app-ready'); show('app'); await refreshAll(); }
    async function refreshAll() { const [workspaces, members, connectors, ai, skills] = await Promise.all([api('/api/workspaces'), api('/api/members'), api('/api/connectors'), api('/api/ai/settings'), api('/api/skills')]); state.workspaces = workspaces.workspaces; state.aiModels = ai.models; state.aiSettings = ai.settings; state.skills = skills.skills; if (!state.workspaceId && state.workspaces[0]) state.workspaceId = state.workspaces[0].id; renderWorkspaces(); renderScheduleWorkspaces(); renderMembers(members.members); renderAiSettings(); renderSkills(); renderConnectors(connectors.connectors); if (state.workspaceId) await refreshMessages(); }
    function renderMembers(members) { $('members').innerHTML = members.map((m) => '<div data-initial="' + esc(initials(m.name)) + '"><span><strong>' + esc(m.name) + '</strong><br><span class="muted">' + esc(m.email || '') + ' · ' + esc(m.role) + '</span></span></div>').join(''); }
    function renderWorkspaces() { $('workspaces').innerHTML = ''; $('roomCount').textContent = String(state.workspaces.length); for (const workspace of state.workspaces) { const b = document.createElement('button'); b.className = 'item secondary' + (workspace.id === state.workspaceId ? ' active' : ''); b.dataset.initials = initials(workspace.title); b.textContent = workspace.title; b.onclick = async () => { state.workspaceId = workspace.id; renderWorkspaces(); await refreshMessages(); }; $('workspaces').append(b); } const current = state.workspaces.find((w) => w.id === state.workspaceId); $('roomTitle').textContent = current?.title || 'Family room'; }
    async function refreshMessages() { const payload = await api('/api/workspaces/' + state.workspaceId + '/messages'); const box = $('messages'); box.innerHTML = ''; if (!payload.messages.length) { box.innerHTML = '<section class="empty-chat"><span class="empty-chat-mark" aria-hidden="true">✦</span><h2>What can I help your family with?</h2><p>Ask a question, share an update, or plan something together.</p></section>'; return; } for (const m of payload.messages) { const item = document.createElement('article'); item.className = 'msg ' + m.kind + (m.authorId === state.member.id ? ' mine' : ''); item.innerHTML = '<div class="byline">' + esc(m.authorName) + '</div><div>' + esc(m.text) + '</div>'; box.append(item); } box.scrollTop = box.scrollHeight; }
    function renderAiSettings() { const provider = state.aiSettings?.provider || 'workers-ai'; $('aiProvider').value = provider; const models = state.aiModels.filter((m) => m.provider === provider); $('aiModel').innerHTML = models.map((m) => '<option value="' + esc(m.id) + '">' + esc(m.label) + '</option>').join(''); $('aiModel').value = state.aiSettings?.model || models[0]?.id || ''; $('anthropicKey').style.display = provider === 'anthropic' ? '' : 'none'; $('anthropicKey').placeholder = state.aiSettings?.apiKeyConfigured ? 'Anthropic API key saved; enter a new one to replace' : 'Anthropic API key'; $('modelLabel').textContent = provider === 'anthropic' ? 'Claude · BYO Anthropic key' : 'Workers AI · open-weight model'; }
    function renderScheduleWorkspaces() { $('scheduleWorkspace').innerHTML = state.workspaces.map((w) => '<option value="' + esc(w.id) + '">' + esc(w.title) + '</option>').join(''); if (state.workspaceId) $('scheduleWorkspace').value = state.workspaceId; }
    async function refreshCalendar() { const start = new Date(); start.setHours(0,0,0,0); const end = new Date(start); end.setDate(end.getDate() + 60); const payload = await api('/api/schedules?from=' + start.getTime() + '&to=' + end.getTime()); state.schedules = payload.schedules || []; renderSchedules(); }
    function renderSchedules() { const root = $('scheduleList'); if (!state.schedules.length) { root.innerHTML = '<p class="muted">No schedules yet.</p>'; return; } root.innerHTML = ''; for (const schedule of state.schedules) { const item = document.createElement('article'); item.className = 'schedule-item'; item.innerHTML = '<span><time>' + esc(new Date(schedule.runAt).toLocaleString()) + '</time><br><strong>' + esc(schedule.instruction) + '</strong><br><small class="muted">' + esc(schedule.workspaceTitle || 'Room') + '</small></span>'; const remove = document.createElement('button'); remove.className = 'secondary small-button'; remove.textContent = 'Remove'; remove.onclick = async () => { await api('/api/schedules/' + encodeURIComponent(schedule.id), { method:'DELETE' }); await refreshCalendar(); }; item.append(remove); root.append(item); } }
    function setSettingsTab(name) { ['Tools','Calendar','Account'].forEach((tab) => { $('settingsTab' + tab).classList.toggle('active', tab.toLowerCase() === name); $('settingsView' + tab).classList.toggle('hidden', tab.toLowerCase() !== name); }); if (name === 'calendar') refreshCalendar().catch((e) => $('scheduleError').textContent = e.message); }
    function renderSkills() { const root = $('skills'); root.innerHTML = ''; if (!state.skills.length) { root.innerHTML = '<p class="muted">No skills yet.</p>'; return; } for (const skill of state.skills) { const card = document.createElement('div'); card.className = 'card stack'; card.style.padding = '.75rem'; card.innerHTML = '<strong>' + esc(skill.title) + '</strong><span class="muted">' + esc(skill.slug) + ' · ' + (skill.enabled ? 'enabled' : 'disabled') + '</span><span class="muted">' + esc(skill.description) + '</span>'; const toggle = document.createElement('button'); toggle.className = 'secondary'; toggle.textContent = skill.enabled ? 'Disable' : 'Enable'; toggle.onclick = async () => { await api('/api/skills/' + skill.id + '/enabled', { method:'POST', body: JSON.stringify({ enabled: !skill.enabled }) }); await refreshAll(); }; const edit = document.createElement('button'); edit.className = 'secondary'; edit.textContent = 'Edit SKILL.md'; edit.onclick = async () => { const files = await api('/api/skills/' + skill.id + '/files'); const current = files.files.find((f) => f.path === 'SKILL.md')?.content || ''; const next = prompt('Edit SKILL.md', current); if (next !== null) { await api('/api/skills/' + skill.id + '/files', { method:'PUT', body: JSON.stringify({ path:'SKILL.md', content: next }) }); await refreshAll(); } }; const row = document.createElement('div'); row.className = 'row'; row.append(toggle, edit); card.append(row); root.append(card); } }
    function renderConnectors(connectors) { const root = $('connectors'); root.innerHTML = ''; if (!connectors.length) { root.innerHTML = '<p class="muted">No connectors yet.</p>'; return; } for (const c of connectors) { const card = document.createElement('div'); card.className = 'card stack'; card.style.padding = '.75rem'; const tools = c.tools || []; card.innerHTML = '<strong>' + esc(c.label) + '</strong><span class="muted">' + esc(c.url) + '</span><span class="muted">Status: ' + esc(c.status) + '</span>' + (c.lastError ? '<span class="error">' + esc(c.lastError) + '</span>' : '') + (tools.length ? '<span class="muted">Tools: ' + tools.map((t) => esc(t.name)).join(', ') + '</span>' : '<span class="muted">No tools discovered yet.</span>'); const row = document.createElement('div'); row.className = 'row'; const refresh = document.createElement('button'); refresh.className = 'secondary'; refresh.textContent = 'Refresh'; refresh.onclick = async () => { await api('/api/connectors/' + c.id + '/refresh', { method: 'POST', body: '{}' }); await refreshAll(); }; row.append(refresh); if (c.authorizationUrl) { const auth = document.createElement('button'); auth.className = 'agent'; auth.textContent = 'Authorize'; auth.onclick = () => window.open(c.authorizationUrl, 'mcp-oauth', 'popup,width=560,height=720'); row.append(auth); } card.append(row); if (tools.length) { const select = document.createElement('select'); tools.forEach((t) => { const o = document.createElement('option'); o.value = t.name; o.textContent = t.title || t.name; select.append(o); }); const args = document.createElement('textarea'); args.value = '{}'; const call = document.createElement('button'); call.className = 'secondary'; call.textContent = 'Call tool'; const out = document.createElement('pre'); out.className = 'muted'; out.style.whiteSpace = 'pre-wrap'; call.onclick = async () => { out.textContent = 'Calling…'; try { const result = await api('/api/connectors/' + c.id + '/tools/' + encodeURIComponent(select.value) + '/call', { method: 'POST', body: JSON.stringify({ args: JSON.parse(args.value || '{}') }) }); out.textContent = JSON.stringify(result, null, 2); } catch (e) { out.textContent = e.message; } }; card.append(select, args, call, out); } root.append(card); } }
    async function send(target) { const text = $('composer').value.trim(); if (!text || !state.workspaceId) return; $('chatError').textContent = ''; $('composer').value = ''; try { await api('/api/workspaces/' + state.workspaceId + '/messages', { method: 'POST', body: JSON.stringify({ text, target }) }); await refreshMessages(); } catch (e) { $('chatError').textContent = e.message; } }
    $('setupButton').onclick = async () => { try { await api('/api/setup', { method:'POST', body: JSON.stringify({ name: $('setupName').value, email: $('setupEmail').value, password: $('setupPassword').value, token: $('setupToken').value }) }); await boot(); } catch (e) { $('authError').textContent = e.message; } };
    $('loginButton').onclick = async () => { try { await api('/api/login', { method:'POST', body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }) }); await boot(); } catch (e) { $('authError').textContent = e.message; } };
    $('joinButton').onclick = async () => { try { await api('/api/join', { method:'POST', body: JSON.stringify({ name: $('joinName').value, email: $('joinEmail').value, password: $('joinPassword').value, code: $('joinCode').value }) }); await boot(); } catch (e) { $('authError').textContent = e.message; } };
    async function createInviteLink() { if (!state.workspaceId) throw new Error('Choose or create a room first.'); const email = prompt('Family member email for the Access-policy reminder (optional)')?.trim() || ''; const invite = await api('/api/invites', { method:'POST', body: JSON.stringify({ role:'member', workspaceId: state.workspaceId }) }); const link = invite.url || (location.origin + '/?invite=' + encodeURIComponent(invite.code) + '&workspace=' + encodeURIComponent(state.workspaceId)); const accessStep = state.mode === 'access' ? '<li>In Cloudflare Zero Trust, allow ' + (email ? '<code>' + esc(email) + '</code>' : 'their email') + ' in the FamilyChat Access policy.</li>' : '<li>Access mode is off, so FamilyChat app auth will handle the join.</li>'; $('roomInviteResult').innerHTML = '<div class="invite-guide"><strong>Room invite created</strong><ol>' + accessStep + '<li>Send this room invite URL: <code>' + esc(link) + '</code></li><li>They will join only this room after sign-in.</li></ol><span class="muted">Copied to clipboard when your browser allows it.</span></div>'; try { await navigator.clipboard?.writeText(link); } catch {} }
    $('roomInviteButton').onclick = () => createInviteLink().catch((e) => $('chatError').textContent = e.message);
    $('settingsButton').onclick = () => document.body.classList.add('settings-open');
    $('settingsClose').onclick = () => document.body.classList.remove('settings-open');
    $('settingsBackdrop').onclick = () => document.body.classList.remove('settings-open');
    $('settingsTabTools').onclick = () => setSettingsTab('tools');
    $('settingsTabCalendar').onclick = () => setSettingsTab('calendar');
    $('settingsTabAccount').onclick = () => setSettingsTab('account');
    $('refreshCalendarButton').onclick = () => refreshCalendar().catch((e) => $('scheduleError').textContent = e.message);
    $('scheduleButton').onclick = async () => { $('scheduleError').textContent = ''; try { const runAt = new Date($('scheduleRunAt').value).getTime(); await api('/api/schedules', { method:'POST', body: JSON.stringify({ workspaceId: $('scheduleWorkspace').value, instruction: $('scheduleInstruction').value, runAt }) }); $('scheduleInstruction').value = ''; $('scheduleRunAt').value = ''; await refreshCalendar(); } catch (e) { $('scheduleError').textContent = e.message; } };
    $('logoutButton').onclick = async () => { await api('/api/logout', { method:'POST', body:'{}' }); location.reload(); };
    async function createRoom() { const provided = $('newWorkspace').value.trim(); const title = provided || 'New room ' + (state.workspaces.length + 1); $('chatError').textContent = ''; try { const workspace = await api('/api/workspaces', { method:'POST', body: JSON.stringify({ title }) }); state.workspaceId = workspace.id; $('newWorkspace').value = ''; await refreshAll(); } catch (e) { $('chatError').textContent = e.message; } }
    $('newWorkspaceButton').onclick = () => createRoom();
    $('newWorkspace').addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); createRoom(); } });
    $('sendFamily').onclick = () => send('family'); $('sendAgent').onclick = () => send('agent'); $('composerForm').onsubmit = (event) => { event.preventDefault(); send('agent'); };
    $('aiProvider').onchange = () => { state.aiSettings = { ...(state.aiSettings || {}), provider: $('aiProvider').value }; renderAiSettings(); };
    $('aiSettingsButton').onclick = async () => { $('aiSettingsResult').textContent = 'Saving…'; try { const payload = { provider: $('aiProvider').value, model: $('aiModel').value, apiKey: $('anthropicKey').value }; const result = await api('/api/ai/settings', { method:'POST', body: JSON.stringify(payload) }); state.aiSettings = result.settings; $('anthropicKey').value = ''; renderAiSettings(); $('aiSettingsResult').textContent = 'Saved model: ' + state.aiSettings.model; } catch (e) { $('aiSettingsResult').innerHTML = '<span class="error">' + esc(e.message) + '</span>'; } };
    $('skillButton').onclick = async () => { $('skillError').textContent = ''; try { await api('/api/skills', { method:'POST', body: JSON.stringify({ title: $('skillTitle').value, description: $('skillDescription').value }) }); $('skillTitle').value = ''; $('skillDescription').value = ''; await refreshAll(); } catch (e) { $('skillError').textContent = e.message; } };
    $('connectorButton').onclick = async () => { $('connectorError').textContent = ''; try { const c = await api('/api/connectors', { method:'POST', body: JSON.stringify({ label: $('connectorLabel').value, url: $('connectorUrl').value }) }); $('connectorLabel').value = ''; $('connectorUrl').value = ''; await refreshAll(); if (c.authorizationUrl) window.open(c.authorizationUrl, 'mcp-oauth', 'popup,width=560,height=720'); } catch (e) { $('connectorError').textContent = e.message; } };
    window.addEventListener('message', (event) => { if (event.origin !== location.origin || event.data?.type !== 'familychat:mcp-oauth') return; refreshAll().catch((e) => $('connectorError').textContent = e.message); });
    boot().catch((e) => $('status').textContent = e.message);
  </script>
</body>
</html>`;
