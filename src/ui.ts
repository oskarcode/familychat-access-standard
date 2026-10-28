export const appHtml = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FamilyChat</title>
  <style>
    :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #201b16; background: #f7f2ea; }
    body { margin: 0; }
    button, input, textarea, select { font: inherit; box-sizing: border-box; }
    button { border: 0; border-radius: 999px; padding: .72rem 1rem; background: #2f6fed; color: white; cursor: pointer; font-weight: 850; }
    button.secondary { background: #ece3d8; color: #2d251d; }
    button.agent { background: #6d3fd3; }
    input, textarea, select { border: 1px solid #d8caba; border-radius: 14px; padding: .78rem; background: white; color: #201b16; width: 100%; }
    textarea { min-height: 5rem; resize: vertical; }
    .shell { max-width: 1180px; margin: 0 auto; padding: 1.5rem; }
    .hero, .card { background: rgba(255,255,255,.84); border: 1px solid #eadbc9; border-radius: 24px; padding: 1rem; box-shadow: 0 10px 30px rgba(70,42,18,.06); }
    .hero { background: linear-gradient(135deg, #fffaf3, #efe1ff); border-radius: 30px; padding: 1.5rem; }
    .auth { max-width: 1000px; margin: 1rem auto 0; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .story { background: linear-gradient(160deg, #2f241c, #5d3bd6); color: white; border: 0; padding: 1.4rem; }
    .story h2 { font-size: clamp(1.8rem, 4vw, 3rem); line-height: 1; letter-spacing: -.04em; margin: 0 0 1rem; }
    .story p, .story .muted { color: rgba(255,255,255,.82); }
    .pill-list { display: grid; gap: .65rem; margin-top: 1.25rem; }
    .pill { display: flex; gap: .6rem; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); border-radius: 18px; padding: .75rem; }
    .tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: .35rem; background: #f5eadf; padding: .35rem; border-radius: 999px; }
    .tabs button { background: transparent; color: #5d5147; padding: .55rem; }
    .tabs button.active { background: white; color: #201b16; box-shadow: 0 3px 12px rgba(70,42,18,.08); }
    .grid { display: grid; grid-template-columns: 280px minmax(0,1fr) 300px; gap: 1rem; margin-top: 1rem; }
    .stack { display: grid; gap: .75rem; }
    .row { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
    .muted { color: #6d6258; font-size: .92rem; }
    .error { color: #9f1239; font-weight: 800; }
    .hidden { display: none !important; }
    .item { display: block; width: 100%; text-align: left; margin-bottom: .4rem; }
    .item.active { background: #1f2937; color: white; }
    .messages { height: 56vh; overflow: auto; display: flex; flex-direction: column; gap: .75rem; }
    .msg { border-radius: 20px; padding: .8rem .9rem; background: white; border: 1px solid #eadbc9; max-width: 78%; white-space: pre-wrap; }
    .msg.mine { align-self: flex-end; background: #eaf1ff; }
    .msg.agent, .msg.agent-request { background: #f0eaff; border-color: #d6c6ff; }
    .byline { font-weight: 900; font-size: .84rem; margin-bottom: .25rem; }
    code { background: #f1e8dc; padding: .15rem .35rem; border-radius: 8px; }
    pre { overflow: auto; max-height: 12rem; }
    @media (max-width: 900px) { .grid, .auth { grid-template-columns: 1fr; } .messages { height: 44vh; } .msg { max-width: 100%; } }
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
      <aside class="card stack">
        <div><h2>Family</h2><div id="members" class="stack"></div></div>
        <div><h2>Invite</h2><button id="inviteButton" class="secondary">Create invite</button><p id="inviteResult" class="muted"></p></div>
        <div><h2>Rooms</h2><div id="workspaces"></div></div>
        <div class="row"><input id="newWorkspace" placeholder="New room" /><button id="newWorkspaceButton" class="secondary">Add</button></div>
      </aside>
      <section class="card stack">
        <div class="row" style="justify-content:space-between"><div><h2 id="roomTitle">Family room</h2><p class="muted">Send normal messages to family, or explicitly invite the resident agent.</p></div><button id="logoutButton" class="secondary">Logout</button></div>
        <div id="messages" class="messages"></div>
        <textarea id="composer" placeholder="Write to your family, or ask the agent…"></textarea>
        <div class="row"><button id="sendFamily">Send to Family</button><button id="sendAgent" class="agent">Ask Agent</button></div>
        <p id="chatError" class="error"></p>
      </section>
      <aside class="card stack"><h2>MCP connectors</h2><p class="muted">Owners/admins can connect Streamable HTTP MCP services.</p><div id="connectors" class="stack"></div><input id="connectorLabel" placeholder="Label, e.g. Gmail MCP" /><input id="connectorUrl" placeholder="https://mcp.example.com/mcp" /><button id="connectorButton" class="secondary">Add connector</button><p id="connectorError" class="error"></p></aside>
    </section>
  </main>

  <script type="module">
    const $ = (id) => document.getElementById(id);
    let state = { member: null, workspaces: [], workspaceId: null, setupConfigured: false, mode: 'app' };
    async function api(path, options = {}) { const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Request failed'); return data; }
    const show = (id) => $(id).classList.remove('hidden'); const hide = (id) => $(id).classList.add('hidden');
    const esc = (value) => String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
    function selectTab(name) { ['Setup','Login','Join'].forEach((n) => { $('tab'+n).classList.toggle('active', n.toLowerCase() === name); $(n.toLowerCase()+'Form').classList.toggle('hidden', n.toLowerCase() !== name); }); $('authError').textContent = ''; }
    ['Setup','Login','Join'].forEach((n) => $('tab'+n).onclick = () => selectTab(n.toLowerCase()));
    function showAuth(me) { hide('app'); hide('accessSetup'); show('auth'); state.mode = me.mode || 'app'; state.setupConfigured = me.setup?.configured === true; if (state.setupConfigured) selectTab('login'); else selectTab('setup'); $('status').textContent = me.configured === false ? 'Worker secrets SESSION_SECRET and SETUP_TOKEN are required.' : 'Create or sign in to your FamilyChat account.'; }
    function showAccessSetup(access) { hide('app'); hide('auth'); show('accessSetup'); $('setupHost').textContent = location.host; $('accessState').textContent = access?.state || 'unknown'; $('status').textContent = 'Cloudflare Access setup required'; }
    async function boot() { const me = await api('/api/me'); hide('auth'); hide('accessSetup'); hide('app'); if (me.mode === 'access' && !me.ok) { showAccessSetup(me.access); return; } if (!me.ok) { showAuth(me); return; } state.member = me.member; state.mode = me.mode; $('status').textContent = 'Signed in as ' + state.member.name + ' · ' + state.member.role; show('app'); await refreshAll(); }
    async function refreshAll() { const [workspaces, members, connectors] = await Promise.all([api('/api/workspaces'), api('/api/members'), api('/api/connectors')]); state.workspaces = workspaces.workspaces; if (!state.workspaceId && state.workspaces[0]) state.workspaceId = state.workspaces[0].id; renderWorkspaces(); renderMembers(members.members); renderConnectors(connectors.connectors); if (state.workspaceId) await refreshMessages(); }
    function renderMembers(members) { $('members').innerHTML = members.map((m) => '<div><strong>' + esc(m.name) + '</strong><br><span class="muted">' + esc(m.email || '') + ' · ' + esc(m.role) + '</span></div>').join(''); }
    function renderWorkspaces() { $('workspaces').innerHTML = ''; for (const workspace of state.workspaces) { const b = document.createElement('button'); b.className = 'item secondary' + (workspace.id === state.workspaceId ? ' active' : ''); b.textContent = workspace.title; b.onclick = async () => { state.workspaceId = workspace.id; renderWorkspaces(); await refreshMessages(); }; $('workspaces').append(b); } const current = state.workspaces.find((w) => w.id === state.workspaceId); $('roomTitle').textContent = current?.title || 'Family room'; }
    async function refreshMessages() { const payload = await api('/api/workspaces/' + state.workspaceId + '/messages'); const box = $('messages'); box.innerHTML = ''; for (const m of payload.messages) { const item = document.createElement('article'); item.className = 'msg ' + m.kind + (m.authorId === state.member.id ? ' mine' : ''); item.innerHTML = '<div class="byline">' + esc(m.authorName) + '</div><div>' + esc(m.text) + '</div>'; box.append(item); } box.scrollTop = box.scrollHeight; }
    function renderConnectors(connectors) { const root = $('connectors'); root.innerHTML = ''; if (!connectors.length) { root.innerHTML = '<p class="muted">No connectors yet.</p>'; return; } for (const c of connectors) { const card = document.createElement('div'); card.className = 'card stack'; card.style.padding = '.75rem'; const tools = c.tools || []; card.innerHTML = '<strong>' + esc(c.label) + '</strong><span class="muted">' + esc(c.url) + '</span><span class="muted">Status: ' + esc(c.status) + '</span>' + (c.lastError ? '<span class="error">' + esc(c.lastError) + '</span>' : '') + (tools.length ? '<span class="muted">Tools: ' + tools.map((t) => esc(t.name)).join(', ') + '</span>' : '<span class="muted">No tools discovered yet.</span>'); const row = document.createElement('div'); row.className = 'row'; const refresh = document.createElement('button'); refresh.className = 'secondary'; refresh.textContent = 'Refresh'; refresh.onclick = async () => { await api('/api/connectors/' + c.id + '/refresh', { method: 'POST', body: '{}' }); await refreshAll(); }; row.append(refresh); if (c.authorizationUrl) { const auth = document.createElement('button'); auth.className = 'agent'; auth.textContent = 'Authorize'; auth.onclick = () => window.open(c.authorizationUrl, 'mcp-oauth', 'popup,width=560,height=720'); row.append(auth); } card.append(row); if (tools.length) { const select = document.createElement('select'); tools.forEach((t) => { const o = document.createElement('option'); o.value = t.name; o.textContent = t.title || t.name; select.append(o); }); const args = document.createElement('textarea'); args.value = '{}'; const call = document.createElement('button'); call.className = 'secondary'; call.textContent = 'Call tool'; const out = document.createElement('pre'); out.className = 'muted'; out.style.whiteSpace = 'pre-wrap'; call.onclick = async () => { out.textContent = 'Calling…'; try { const result = await api('/api/connectors/' + c.id + '/tools/' + encodeURIComponent(select.value) + '/call', { method: 'POST', body: JSON.stringify({ args: JSON.parse(args.value || '{}') }) }); out.textContent = JSON.stringify(result, null, 2); } catch (e) { out.textContent = e.message; } }; card.append(select, args, call, out); } root.append(card); } }
    async function send(target) { const text = $('composer').value.trim(); if (!text || !state.workspaceId) return; $('chatError').textContent = ''; $('composer').value = ''; try { await api('/api/workspaces/' + state.workspaceId + '/messages', { method: 'POST', body: JSON.stringify({ text, target }) }); await refreshMessages(); } catch (e) { $('chatError').textContent = e.message; } }
    $('setupButton').onclick = async () => { try { await api('/api/setup', { method:'POST', body: JSON.stringify({ name: $('setupName').value, email: $('setupEmail').value, password: $('setupPassword').value, token: $('setupToken').value }) }); await boot(); } catch (e) { $('authError').textContent = e.message; } };
    $('loginButton').onclick = async () => { try { await api('/api/login', { method:'POST', body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }) }); await boot(); } catch (e) { $('authError').textContent = e.message; } };
    $('joinButton').onclick = async () => { try { await api('/api/join', { method:'POST', body: JSON.stringify({ name: $('joinName').value, email: $('joinEmail').value, password: $('joinPassword').value, code: $('joinCode').value }) }); await boot(); } catch (e) { $('authError').textContent = e.message; } };
    $('inviteButton').onclick = async () => { const invite = await api('/api/invites', { method:'POST', body: JSON.stringify({ role:'member' }) }); $('inviteResult').innerHTML = 'Invite code: <code>' + esc(invite.code) + '</code>'; };
    $('logoutButton').onclick = async () => { await api('/api/logout', { method:'POST', body:'{}' }); location.reload(); };
    $('newWorkspaceButton').onclick = async () => { const title = $('newWorkspace').value.trim(); if (!title) return; const workspace = await api('/api/workspaces', { method:'POST', body: JSON.stringify({ title }) }); state.workspaceId = workspace.id; $('newWorkspace').value = ''; await refreshAll(); };
    $('sendFamily').onclick = () => send('family'); $('sendAgent').onclick = () => send('agent');
    $('connectorButton').onclick = async () => { $('connectorError').textContent = ''; try { const c = await api('/api/connectors', { method:'POST', body: JSON.stringify({ label: $('connectorLabel').value, url: $('connectorUrl').value }) }); $('connectorLabel').value = ''; $('connectorUrl').value = ''; await refreshAll(); if (c.authorizationUrl) window.open(c.authorizationUrl, 'mcp-oauth', 'popup,width=560,height=720'); } catch (e) { $('connectorError').textContent = e.message; } };
    window.addEventListener('message', (event) => { if (event.origin !== location.origin || event.data?.type !== 'familychat:mcp-oauth') return; refreshAll().catch((e) => $('connectorError').textContent = e.message); });
    boot().catch((e) => $('status').textContent = e.message);
  </script>
</body>
</html>`;
