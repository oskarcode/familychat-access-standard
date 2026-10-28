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
    button { border: 0; border-radius: 999px; padding: .7rem 1rem; background: #2f6fed; color: white; cursor: pointer; font-weight: 800; }
    button.secondary { background: #ece3d8; color: #2d251d; }
    button.agent { background: #6d3fd3; }
    input, textarea, select { border: 1px solid #d8caba; border-radius: 14px; padding: .75rem; background: white; color: #201b16; width: 100%; }
    textarea { min-height: 5rem; resize: vertical; }
    .shell { max-width: 1180px; margin: 0 auto; padding: 1.5rem; }
    .hero, .card { background: rgba(255,255,255,.84); border: 1px solid #eadbc9; border-radius: 24px; padding: 1rem; box-shadow: 0 10px 30px rgba(70,42,18,.06); }
    .hero { background: linear-gradient(135deg, #fffaf3, #efe1ff); border-radius: 30px; padding: 1.5rem; }
    .setup { max-width: 980px; margin: 1rem auto 0; display: grid; grid-template-columns: .95fr 1.05fr; gap: 1rem; }
    .setup-story { background: linear-gradient(160deg, #2f241c, #5d3bd6); color: white; border: 0; padding: 1.4rem; overflow: hidden; position: relative; }
    .setup-story h2 { font-size: clamp(1.8rem, 4vw, 3rem); line-height: 1; letter-spacing: -.04em; margin: 0 0 1rem; }
    .setup-story p, .setup-story .muted { color: rgba(255,255,255,.82); }
    .pill-list { display: grid; gap: .65rem; margin-top: 1.25rem; }
    .pill { display: flex; gap: .6rem; align-items: flex-start; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); border-radius: 18px; padding: .75rem; }
    .pill strong { display: block; color: white; }
    .steps { counter-reset: step; display: grid; gap: .7rem; }
    .step { display: grid; grid-template-columns: 2rem 1fr; gap: .7rem; align-items: start; }
    .step:before { counter-increment: step; content: counter(step); background: #2f6fed; color: white; width: 2rem; height: 2rem; border-radius: 999px; display: grid; place-items: center; font-weight: 900; }
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
    pre { overflow: auto; max-height: 12rem; }
    code { background: #f1e8dc; padding: .15rem .35rem; border-radius: 8px; }
    @media (max-width: 900px) { .grid, .setup { grid-template-columns: 1fr; } .messages { height: 44vh; } .msg { max-width: 100%; } }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <h1>FamilyChat</h1>
      <p>A private AI group chat for your family, deployed to your Cloudflare account and protected by Cloudflare Access.</p>
      <p id="status" class="muted">Loading…</p>
    </section>

    <section id="accessSetup" class="setup hidden">
      <div class="card setup-story">
        <p class="muted">Cloudflare-native private family chat</p>
        <h2>You own the Worker, storage, AI usage, and connectors.</h2>
        <p>FamilyChat uses Cloudflare Access for sign-in. Everyone allowed by your Access policy becomes part of this private family space.</p>
        <div class="pill-list">
          <div class="pill"><span>🔐</span><div><strong>Access is the login.</strong><span class="muted">No app passwords or central SaaS account.</span></div></div>
          <div class="pill"><span>🏠</span><div><strong>One deployment, one family.</strong><span class="muted">Messages and MCP OAuth state live in your Durable Object.</span></div></div>
          <div class="pill"><span>🤖</span><div><strong>Resident Family Agent.</strong><span class="muted">Ask the agent only when you want AI involved.</span></div></div>
        </div>
      </div>
      <div class="card stack">
        <h2>Finish Cloudflare Access setup</h2>
        <p class="muted" id="setupReason">FamilyChat is deployed. Protect this URL with Cloudflare Access to sign in.</p>
        <div class="steps">
          <div class="step"><div>Create a <strong>Zero Trust → Access → Self-hosted application</strong>.</div></div>
          <div class="step"><div>Use this application domain:<br><code id="setupHost"></code></div></div>
          <div class="step"><div>Add an Access policy allowing your family emails.</div></div>
          <div class="step"><div>Set Worker variables:<br><code>ACCESS_ISSUER=https://&lt;team&gt;.cloudflareaccess.com</code><br><code>ACCESS_AUDIENCE=&lt;Access AUD tag&gt;</code></div></div>
          <div class="step"><div>Reload this URL through Access. The first verified user becomes owner.</div></div>
        </div>
        <p class="muted">Current state: <code id="accessState">unknown</code></p>
      </div>
    </section>

    <section id="app" class="grid hidden">
      <aside class="card stack">
        <div><h2>Family</h2><div id="members" class="stack"></div></div>
        <div><h2>Rooms</h2><div id="workspaces"></div></div>
        <div class="row"><input id="newWorkspace" placeholder="New room" /><button id="newWorkspaceButton" class="secondary">Add</button></div>
      </aside>
      <section class="card stack">
        <div><h2 id="roomTitle">Family room</h2><p class="muted">Send normal messages to the family, or explicitly invite the resident agent.</p></div>
        <div id="messages" class="messages"></div>
        <textarea id="composer" placeholder="Write to your family, or ask the agent…"></textarea>
        <div class="row"><button id="sendFamily">Send to Family</button><button id="sendAgent" class="agent">Ask Agent</button></div>
        <p id="chatError" class="error"></p>
      </section>
      <aside class="card stack">
        <div>
          <h2>MCP connectors</h2>
          <p class="muted">Owners/admins can connect Streamable HTTP MCP services, including Gmail MCP-like services.</p>
          <div id="connectors" class="stack"></div>
          <input id="connectorLabel" placeholder="Label, e.g. Gmail MCP" />
          <input id="connectorUrl" placeholder="https://mcp.example.com/mcp" />
          <button id="connectorButton" class="secondary">Add connector</button>
          <p id="connectorError" class="error"></p>
        </div>
      </aside>
    </section>
  </main>

  <script type="module">
    const $ = (id) => document.getElementById(id);
    let state = { member: null, workspaces: [], workspaceId: null };
    async function api(path, options = {}) {
      const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Request failed');
      return data;
    }
    const show = (id) => $(id).classList.remove('hidden');
    const hide = (id) => $(id).classList.add('hidden');
    const esc = (value) => String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
    function showAccessSetup(access) {
      hide('app'); show('accessSetup');
      $('setupHost').textContent = location.host;
      $('accessState').textContent = access?.state || 'unknown';
      $('setupReason').textContent = access?.state === 'missing_jwt' ? 'Access variables are set, but this request did not include an Access JWT. Make sure this hostname is protected by your Access application.' : access?.state === 'invalid_jwt' ? 'Access sent a JWT, but the Worker could not verify it. Check ACCESS_ISSUER and ACCESS_AUDIENCE.' : 'FamilyChat is deployed. Protect this URL with Cloudflare Access to sign in.';
    }
    async function boot() {
      const me = await api('/api/me');
      hide('accessSetup'); hide('app');
      if (!me.ok) { $('status').textContent = 'Cloudflare Access setup required'; showAccessSetup(me.access); return; }
      state.member = me.member;
      $('status').textContent = 'Signed in with Cloudflare Access as ' + state.member.name + ' · ' + state.member.role;
      show('app');
      await refreshAll();
    }
    async function refreshAll() {
      const [workspaces, members, connectors] = await Promise.all([api('/api/workspaces'), api('/api/members'), api('/api/connectors')]);
      state.workspaces = workspaces.workspaces;
      if (!state.workspaceId && state.workspaces[0]) state.workspaceId = state.workspaces[0].id;
      renderWorkspaces(); renderMembers(members.members); renderConnectors(connectors.connectors);
      if (state.workspaceId) await refreshMessages();
    }
    function renderMembers(members) { $('members').innerHTML = members.map((m) => '<div><strong>' + esc(m.name) + '</strong><br><span class="muted">' + esc(m.email || '') + ' · ' + esc(m.role) + '</span></div>').join(''); }
    function renderWorkspaces() {
      $('workspaces').innerHTML = '';
      for (const workspace of state.workspaces) {
        const button = document.createElement('button'); button.className = 'item secondary' + (workspace.id === state.workspaceId ? ' active' : ''); button.textContent = workspace.title;
        button.onclick = async () => { state.workspaceId = workspace.id; renderWorkspaces(); await refreshMessages(); };
        $('workspaces').append(button);
      }
      const current = state.workspaces.find((workspace) => workspace.id === state.workspaceId); $('roomTitle').textContent = current?.title || 'Family room';
    }
    async function refreshMessages() {
      const payload = await api('/api/workspaces/' + state.workspaceId + '/messages');
      const box = $('messages'); box.innerHTML = '';
      for (const message of payload.messages) { const item = document.createElement('article'); item.className = 'msg ' + message.kind + (message.authorId === state.member.id ? ' mine' : ''); item.innerHTML = '<div class="byline">' + esc(message.authorName) + '</div><div>' + esc(message.text) + '</div>'; box.append(item); }
      box.scrollTop = box.scrollHeight;
    }
    function renderConnectors(connectors) {
      const root = $('connectors'); root.innerHTML = ''; if (!connectors.length) { root.innerHTML = '<p class="muted">No connectors yet.</p>'; return; }
      for (const connector of connectors) {
        const card = document.createElement('div'); card.className = 'card stack'; card.style.padding = '.75rem'; const tools = connector.tools || [];
        card.innerHTML = '<strong>' + esc(connector.label) + '</strong><span class="muted">' + esc(connector.url) + '</span><span class="muted">Status: ' + esc(connector.status) + '</span>' + (connector.lastError ? '<span class="error">' + esc(connector.lastError) + '</span>' : '') + (tools.length ? '<span class="muted">Tools: ' + tools.map((tool) => esc(tool.name)).join(', ') + '</span>' : '<span class="muted">No tools discovered yet.</span>');
        const row = document.createElement('div'); row.className = 'row'; const refresh = document.createElement('button'); refresh.className = 'secondary'; refresh.textContent = 'Refresh'; refresh.onclick = async () => { await api('/api/connectors/' + connector.id + '/refresh', { method: 'POST', body: '{}' }); await refreshAll(); }; row.append(refresh);
        if (connector.authorizationUrl) { const auth = document.createElement('button'); auth.className = 'agent'; auth.textContent = 'Authorize'; auth.onclick = () => window.open(connector.authorizationUrl, 'mcp-oauth', 'popup,width=560,height=720'); row.append(auth); }
        card.append(row);
        if (tools.length) { const select = document.createElement('select'); tools.forEach((tool) => { const option = document.createElement('option'); option.value = tool.name; option.textContent = tool.title || tool.name; select.append(option); }); const args = document.createElement('textarea'); args.placeholder = 'Tool args as JSON'; args.value = '{}'; const call = document.createElement('button'); call.className = 'secondary'; call.textContent = 'Call tool'; const output = document.createElement('pre'); output.className = 'muted'; output.style.whiteSpace = 'pre-wrap'; call.onclick = async () => { output.textContent = 'Calling…'; try { const result = await api('/api/connectors/' + connector.id + '/tools/' + encodeURIComponent(select.value) + '/call', { method: 'POST', body: JSON.stringify({ args: JSON.parse(args.value || '{}') }) }); output.textContent = JSON.stringify(result, null, 2); } catch (error) { output.textContent = error.message; } }; card.append(select, args, call, output); }
        root.append(card);
      }
    }
    async function send(target) { const text = $('composer').value.trim(); if (!text || !state.workspaceId) return; $('chatError').textContent = ''; $('composer').value = ''; try { await api('/api/workspaces/' + state.workspaceId + '/messages', { method: 'POST', body: JSON.stringify({ text, target }) }); await refreshMessages(); } catch (error) { $('chatError').textContent = error.message; } }
    $('newWorkspaceButton').onclick = async () => { const title = $('newWorkspace').value.trim(); if (!title) return; const workspace = await api('/api/workspaces', { method: 'POST', body: JSON.stringify({ title }) }); state.workspaceId = workspace.id; $('newWorkspace').value = ''; await refreshAll(); };
    $('sendFamily').onclick = () => send('family'); $('sendAgent').onclick = () => send('agent');
    $('connectorButton').onclick = async () => { $('connectorError').textContent = ''; try { const connector = await api('/api/connectors', { method: 'POST', body: JSON.stringify({ label: $('connectorLabel').value, url: $('connectorUrl').value }) }); $('connectorLabel').value = ''; $('connectorUrl').value = ''; await refreshAll(); if (connector.authorizationUrl) window.open(connector.authorizationUrl, 'mcp-oauth', 'popup,width=560,height=720'); } catch (error) { $('connectorError').textContent = error.message; } };
    window.addEventListener('message', (event) => { if (event.origin !== window.location.origin || event.data?.type !== 'familychat:mcp-oauth') return; refreshAll().catch((error) => { $('connectorError').textContent = error.message; }); });
    boot().catch((error) => { $('status').textContent = error.message; });
  </script>
</body>
</html>`;
