/* ── GitPaid — app.js ───────────────────────────────────────────────────────── */

// ── State ─────────────────────────────────────────────────────────────────────
let allOpps      = [];
let agentStates  = {};  // id → { label, status, count, tier, streamingUrl }
let t2Total      = 0;
let t2Scanned    = 0;
let agentsRun    = 0;
let activeReader = null;
let filters      = { type: 'all', tier: 'all' };
let currentView  = 'results';  // 'results' | 'live'
let liveFilter   = 'all';      // 'all' | 't1t3' | 't2'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(amount, currency) {
  if (!amount) return null;
  const s = currency === 'EUR' ? '€' : '$';
  if (amount >= 1_000_000) return s + (amount / 1_000_000).toFixed(1) + 'M';
  if (amount >= 1_000)     return s + (amount / 1_000).toFixed(0) + 'k';
  return s + Math.round(amount).toLocaleString();
}

function pop(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  setTimeout(() => el.classList.remove('pop'), 400);
}

// ── View toggle ───────────────────────────────────────────────────────────────
function setView(view) {
  currentView = view;
  document.getElementById('results-view').style.display  = view === 'results' ? 'block' : 'none';
  document.getElementById('live-view').style.display     = view === 'live'    ? 'block' : 'none';
  document.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + view).classList.add('active');
  renderLiveGrid();
}

function setLiveFilter(f, btn) {
  liveFilter = f;
  document.querySelectorAll('.live-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLiveGrid();
}

// ── Live View grid ────────────────────────────────────────────────────────────
/**
 * Smart incremental updater — NEVER replaces existing iframes.
 * - New agents → create and append a tile
 * - Existing agents → patch header + footer only, leave iframe untouched
 * - Filter changes → hide/show tiles without destroying them
 */
function renderLiveGrid() {
  const grid = document.getElementById('live-grid');
  if (!grid) return;

  const entries = Object.entries(agentStates);

  // Show the empty state if nothing has been registered yet
  if (!entries.length) {
    if (!grid.querySelector('.live-empty')) {
      grid.innerHTML = `
        <div class="live-empty">
          <div class="live-empty-icon">🤖</div>
          <div>No agents running yet — hit Search to start</div>
        </div>`;
    }
    return;
  }

  // Remove empty placeholder once agents arrive
  const emptyEl = grid.querySelector('.live-empty');
  if (emptyEl) emptyEl.remove();

  entries.forEach(([id, s]) => {
    const visible = (
      liveFilter === 'all'  ||
      (liveFilter === 't1t3' && (s.tier === 1 || s.tier === 3)) ||
      (liveFilter === 't2'   &&  s.tier === 2)
    );

    let tile = document.getElementById(`tile-${id}`);

    // ── Create tile if it doesn't exist yet ──────────────────────────────────
    if (!tile) {
      const tierClass = ['', 'tb1', 'tb2', 'tb3'][s.tier] || '';
      tile = document.createElement('div');
      tile.className = 'live-tile';
      tile.id = `tile-${id}`;
      tile.innerHTML = `
        <div class="live-tile-header" id="hdr-${id}"></div>
        <div class="live-tile-body"  id="body-${id}">
          <div class="live-tile-placeholder" id="ph-${id}">
            <div class="live-placeholder-spinner"></div>
            <span>Waiting for agent…</span>
          </div>
        </div>
        <div class="live-tile-count" id="cnt-${id}" style="display:none"></div>`;
      grid.appendChild(tile);
    }

    // Show/hide based on current filter
    tile.style.display = visible ? '' : 'none';
    if (!visible) return;

    // ── Patch header (status badge + LIVE label) — always safe to replace ────
    const hasStream = !!s.streamingUrl;
    const isLive    = hasStream && s.status === 'scraping';
    const tierClass = ['', 'tb1', 'tb2', 'tb3'][s.tier] || '';
    const statusBadge = {
      pending:  `<span class="status-pill sp-idle">Pending</span>`,
      scraping: `<span class="status-pill sp-running"><span class="running-dot"></span>Scraping</span>`,
      done:     `<span class="status-pill sp-done">Done</span>`,
      error:    `<span class="status-pill sp-error">Error</span>`,
    }[s.status] || '';

    document.getElementById(`hdr-${id}`).innerHTML = `
      <div class="tbadge ${tierClass}" style="width:26px;height:26px;font-size:9px;border-radius:6px;flex-shrink:0">T${s.tier}</div>
      <div class="live-tile-name" title="${s.label}">${s.label}</div>
      ${isLive ? `<span class="preview-live-badge"><span class="live-dot"></span>LIVE</span>` : statusBadge}`;

    tile.classList.toggle('live-tile--active', isLive);

    // ── Inject iframe ONCE when streaming_url first arrives ──────────────────
    // We check for an existing iframe — if one is already there, leave it alone.
    const body = document.getElementById(`body-${id}`);
    const existingIframe = body.querySelector('iframe');

    if (hasStream && !existingIframe) {
      // Replace placeholder with iframe — happens exactly once per agent
      body.innerHTML = `
        <div class="live-tile-iframe-wrap">
          <iframe
            src="${s.streamingUrl}"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            allow="clipboard-read; clipboard-write"
            title="Live: ${s.label}"
          ></iframe>
          <div class="live-tile-spinner" id="spinner-${id}">
            <div class="preview-loading-spinner"></div>
          </div>
          <div class="live-tile-hover-bar">
            <a href="${s.streamingUrl}" target="_blank" rel="noopener" class="live-fullscreen-btn">⛶ Full Screen</a>
          </div>
        </div>`;

      // Hide spinner once iframe loads
      const iframe = body.querySelector('iframe');
      iframe.addEventListener('load', () => {
        const sp = document.getElementById(`spinner-${id}`);
        if (sp) sp.style.display = 'none';
      });

    } else if (!hasStream && !existingIframe) {
      // Update placeholder text to reflect current status
      const ph = document.getElementById(`ph-${id}`);
      if (ph) {
        const inner =
          s.status === 'pending'  ? `<div class="live-placeholder-spinner"></div><span>Waiting for agent…</span>` :
          s.status === 'scraping' ? `<div class="preview-loading-spinner"></div><span>Starting browser session…</span>` :
          s.status === 'done'     ? `<div class="live-done-icon">✓</div><span>Completed${s.count > 0 ? ` · +${s.count} found` : ''}</span>` :
                                    `<div class="live-err-icon">✗</div><span>Agent errored</span>`;
        ph.innerHTML = inner;
      }
    }

    // ── Update result count footer ────────────────────────────────────────────
    const cntEl = document.getElementById(`cnt-${id}`);
    if (cntEl) {
      if (s.count > 0) {
        cntEl.textContent = `+${s.count} opportunit${s.count !== 1 ? 'ies' : 'y'} found`;
        cntEl.style.display = '';
      } else {
        cntEl.style.display = 'none';
      }
    }
  });
}

function clearPreview() {} // sidebar preview removed

// ── Render: agent sidebar list ────────────────────────────────────────────────
function renderAgents() {
  const list    = document.getElementById('agent-list');
  const entries = Object.entries(agentStates).filter(([, s]) => s.tier !== 2);
  if (!entries.length) { list.innerHTML = ''; return; }

  list.innerHTML = entries.map(([id, s]) => {
    const icon  = s.tier === 3 ? '🏛️' : '🔎';
    const tl    = ['', 'T1', 'T2', 'T3'][s.tier] || '';
    const badge = {
      pending:  `<span class="status-pill sp-idle">Pending</span>`,
      scraping: `<span class="status-pill sp-running"><span class="running-dot"></span>Scraping</span>`,
      done:     `<span class="status-pill sp-done">Done</span>`,
      error:    `<span class="status-pill sp-error">Error</span>`,
    }[s.status] || '';

    return `
      <div class="agent-row">
        <span class="agent-icon">${icon}</span>
        <div class="agent-info">
          <div class="agent-name">${s.label}</div>
          <div class="agent-tier">${tl}</div>
        </div>
        ${badge}
        <span class="agent-count">${s.count > 0 ? '+' + s.count : ''}</span>
      </div>`;
  }).join('');
}

// ── Render: stats ─────────────────────────────────────────────────────────────
function renderStats() {
  document.getElementById('s-total').textContent    = allOpps.length;
  document.getElementById('s-bounties').textContent = allOpps.filter(o => o.type === 'bounty').length;
  document.getElementById('s-grants').textContent   = allOpps.filter(o => o.type === 'grant').length;
  document.getElementById('s-agents').textContent   = agentsRun;

  const rm = document.getElementById('results-meta');
  rm.style.display = allOpps.length ? 'flex' : 'none';
  document.getElementById('r-showing').textContent = getFiltered().length;
  document.getElementById('r-total').textContent   = allOpps.length;
}

// ── Render: results grid ──────────────────────────────────────────────────────
function getFiltered() {
  let list = [...allOpps];
  if (filters.type !== 'all') list = list.filter(o => o.type === filters.type);
  if (filters.tier !== 'all') list = list.filter(o => String(o.tier) === filters.tier);
  const sort = document.getElementById('sort-select').value;
  if      (sort === 'amount_desc') list.sort((a, b) => (b.bounty_amount || 0) - (a.bounty_amount || 0));
  else if (sort === 'amount_asc')  list.sort((a, b) => (a.bounty_amount || 0) - (b.bounty_amount || 0));
  else if (sort === 'tier_asc')    list.sort((a, b) => a.tier - b.tier);
  else list.reverse();
  return list;
}

function renderResults() {
  renderStats();
  document.getElementById('skel-area').innerHTML = '';
  const visible = getFiltered();

  document.getElementById('results-grid').innerHTML = visible.map((o, i) => {
    const a      = fmt(o.bounty_amount, o.currency);
    const tc     = ['', 'tb1', 'tb2', 'tb3'][o.tier];
    const skills = (o.skills || []).slice(0, 4).map(s => `<span class="ctag ctag-skill">${s}</span>`).join('');
    const diff   = o.difficulty ? `<span class="ctag ctag-${o.difficulty}">${o.difficulty}</span>` : '';
    const type   = `<span class="ctag ctag-${o.type}">${o.type}</span>`;
    const repo   = o.repo ? `<span class="meta-repo">⎇ ${o.repo}</span>` : '';
    const dl     = o.deadline    ? `<div class="card-deadline">⏰ ${o.deadline}</div>` : '';
    const desc   = o.description ? `<div class="card-desc">${o.description.slice(0, 120)}${o.description.length > 120 ? '…' : ''}</div>` : '';
    const amtHtml = a
      ? `<div class="amount-main ${a.length > 5 ? 'sm' : ''}">${a}</div><div class="amount-cur">${o.currency || 'USD'}</div>`
      : `<div class="amount-tbd">TBD</div>`;

    return `
      <a class="opp-card" href="${o.url || '#'}" target="_blank" rel="noopener"
         style="animation-delay:${Math.min(i * 0.04, 0.5)}s">
        <span class="card-arrow">↗</span>
        <div class="tbadge ${tc}">T${o.tier}</div>
        <div class="card-body">
          <div class="card-title">${o.title}</div>
          <div class="card-meta"><span class="meta-source">${o.source_label}</span>${repo}</div>
          <div class="card-tags">${type}${diff}${skills}</div>
          ${desc}${dl}
        </div>
        <div class="card-amount">${amtHtml}</div>
      </a>`;
  }).join('');

  renderLiveGrid();
}

function showSkeletons(n = 4) {
  document.getElementById('skel-area').innerHTML = Array(n).fill(0).map((_, i) => `
    <div class="skel-card" style="animation-delay:${i * 0.08}s">
      <div class="skel" style="width:34px;height:34px;border-radius:8px;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px">
        <div class="skel" style="height:14px;width:68%"></div>
        <div class="skel" style="height:11px;width:42%"></div>
        <div style="display:flex;gap:5px">
          <div class="skel" style="height:18px;width:52px;border-radius:4px"></div>
          <div class="skel" style="height:18px;width:68px;border-radius:4px"></div>
        </div>
      </div>
      <div class="skel" style="width:48px;height:24px;border-radius:5px"></div>
    </div>`).join('');
}

// ── SSE event handler ─────────────────────────────────────────────────────────
function handleEvent(evt) {
  switch (evt.type) {

    case 'sources':
      evt.sources.forEach(s => {
        agentStates[s.id] = { label: s.label, status: 'pending', count: 0, tier: s.tier, streamingUrl: null };
      });
      renderAgents();
      renderLiveGrid();
      break;

    // Pre-register T2 repo agents so Live View shows tiles immediately
    case 'repo_source_registered':
      agentStates[evt.source_id] = {
        label: evt.label, status: 'pending', count: 0, tier: 2, streamingUrl: null,
      };
      renderLiveGrid();
      break;

    case 'agent_started':
      if (agentStates[evt.source_id]) {
        agentStates[evt.source_id].status = 'scraping';
        renderAgents();
        renderLiveGrid();
      }
      break;

    // ── Live preview: TinyFish fires this as soon as browser session opens ────
    case 'streaming_url':
      if (agentStates[evt.source_id]) {
        agentStates[evt.source_id].streamingUrl = evt.url;
      }
      // Always update the live grid
      renderLiveGrid();
      // Flash the Live View tab to draw attention
      flashLiveTab();
      break;

    case 'agent_complete':
      agentsRun++;
      if (agentStates[evt.source_id]) {
        agentStates[evt.source_id].status = 'done';
        agentStates[evt.source_id].count  = evt.count;
      }
      allOpps.push(...(evt.opportunities || []));
      renderAgents();
      renderResults();
      pop('s-total');
      if (evt.count > 0) pop('s-bounties');
      renderLiveGrid();
      break;

    case 'agent_error':
      agentsRun++;
      if (agentStates[evt.source_id]) agentStates[evt.source_id].status = 'error';
      renderAgents();
      renderStats();
      renderLiveGrid();
      break;

    case 'tier2_status': {
      const ph = document.getElementById('t2-phase');
      const p  = document.getElementById('t2-prog');
      const l  = document.getElementById('t2-lbl');
      ph.textContent = evt.phase;
      if (evt.phase === 'scanning') {
        t2Total = evt.total || 0; t2Scanned = 0;
        l.textContent = `0 / ${t2Total} repos`;
        p.style.width = '0%';
      } else if (evt.phase === 'done') {
        l.textContent = `${t2Total} repos scanned`;
        p.style.width = '100%';
        agentsRun++;
      } else if (evt.phase === 'error') {
        ph.style.color = 'var(--red)';
        l.textContent = evt.error || 'error';
      }
      break;
    }

    case 'tier2_repo_done': {
      t2Scanned = evt.scanned;
      const pct = t2Total ? Math.round(t2Scanned / t2Total * 100) : 0;
      document.getElementById('t2-prog').style.width  = pct + '%';
      document.getElementById('t2-lbl').textContent   = `${t2Scanned} / ${t2Total} repos`;
      const rl  = document.getElementById('t2-repos');
      const row = document.createElement('div');
      row.className = 'repo-row';
      const hit = evt.count > 0;
      row.innerHTML = `<span class="repo-name">${evt.repo}</span><span class="repo-n ${hit ? 'hit' : 'miss'}">${hit ? '+' + evt.count : '—'}</span>`;
      rl.appendChild(row);
      rl.scrollTop = rl.scrollHeight;

      // Mark the repo agent as done in agentStates
      const sid = `tier2-${evt.repo.replace('/', '-')}`;
      if (agentStates[sid]) {
        agentStates[sid].status = 'done';
        agentStates[sid].count  = evt.count;
      }

      allOpps.push(...(evt.opportunities || []));
      renderResults();
      renderLiveGrid();
      break;
    }

    case 'done':
      setSearching(false);
      document.getElementById('skel-area').innerHTML = '';
      showStatus(`Search complete — ${allOpps.length} result${allOpps.length !== 1 ? 's' : ''} found`, 'info');
      setTimeout(hideStatus, 5000);
      renderLiveGrid();
      break;

    case 'error':
      setSearching(false);
      document.getElementById('skel-area').innerHTML = '';
      showStatus('Error: ' + (evt.message || 'Unknown error'), 'error');
      break;
  }
}

// Flash the Live tab badge when a new stream arrives
let flashTimeout = null;
function flashLiveTab() {
  const tab = document.getElementById('tab-live');
  if (!tab) return;
  tab.classList.add('flash');
  clearTimeout(flashTimeout);
  flashTimeout = setTimeout(() => tab.classList.remove('flash'), 1200);

  // Update live agent count badge
  const liveCount = Object.values(agentStates).filter(s => s.streamingUrl && s.status === 'scraping').length;
  const badge = document.getElementById('live-tab-count');
  if (badge) {
    badge.textContent = liveCount > 0 ? liveCount : '';
    badge.style.display = liveCount > 0 ? 'inline-flex' : 'none';
  }
}

// ── Search control ────────────────────────────────────────────────────────────
async function startSearch() {
  const stack     = document.getElementById('stack').value;
  const keywords  = document.getElementById('keywords').value.trim();
  const minAmount = parseFloat(document.getElementById('min-amount').value) || 0;

  // Reset state
  allOpps = []; agentStates = {}; t2Total = 0; t2Scanned = 0; agentsRun = 0;
  document.getElementById('t2-repos').innerHTML   = '';
  document.getElementById('t2-phase').textContent = 'idle';
  document.getElementById('t2-phase').style.color = '';
  document.getElementById('t2-prog').style.width  = '0%';
  document.getElementById('t2-lbl').textContent   = '—';
  document.getElementById('results-grid').innerHTML = '';
  clearPreview();

  // Clear live grid completely so tile IDs don't carry over to next search
  const lg = document.getElementById('live-grid');
  if (lg) {
    lg.innerHTML = `
      <div class="live-empty">
        <div class="live-empty-icon">🤖</div>
        <div>No agents running yet — hit Search to start</div>
      </div>`;
  }
  const badge = document.getElementById('live-tab-count');
  if (badge) { badge.textContent = ''; badge.style.display = 'none'; }

  // Show layout
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('main-layout').style.display  = 'grid';
  document.getElementById('filter-bar').classList.add('visible');
  setSearching(true);
  hideStatus();
  showSkeletons(5);

  try {
    const resp = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stack, keywords, min_amount: minAmount }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    const reader  = resp.body.getReader();
    activeReader  = reader;
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop();
      for (const part of parts) {
        for (const line of part.split('\n')) {
          if (line.startsWith('data: ')) {
            try { handleEvent(JSON.parse(line.slice(6))); } catch (e) {}
          }
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      setSearching(false);
      document.getElementById('skel-area').innerHTML = '';
      showStatus('Connection error: ' + err.message, 'error');
    }
  }
}

function stopSearch() {
  if (activeReader) { activeReader.cancel(); activeReader = null; }
  setSearching(false);
  document.getElementById('skel-area').innerHTML = '';
  showStatus('Search stopped.', 'info');
  setTimeout(hideStatus, 3000);
}

function setSearching(on) {
  const btn = document.getElementById('btn-search');
  btn.disabled = on;
  btn.classList.toggle('loading', on);
  document.getElementById('btn-stop').classList.toggle('visible', on);
  if (!on) activeReader = null;
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function showStatus(msg, type) {
  const b = document.getElementById('status-bar');
  b.textContent = msg;
  b.className = 'status-bar ' + type;
}
function hideStatus() { document.getElementById('status-bar').className = 'status-bar'; }

function setFilter(type, val, btn) {
  filters[type] = val;
  document.querySelectorAll(`[data-filter="${type}"]`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderResults();
}

['keywords', 'min-amount'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') startSearch();
  });
});
