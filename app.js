// ── T&T Dashboard — Elecnor Australia ──────────────────────────────
// Loads data.json, merges localStorage overrides, renders kanban + panel

const STORAGE_KEY = 'tt_dashboard_v1';

let allProjects = [];
let activeId    = null;

// ── BOOT ────────────────────────────────────────────────────────────
fetch('data.json')
  .then(r => r.json())
  .then(data => {
    const saved = loadOverrides();
    allProjects = data.projects.map(p => ({ ...p, ...(saved[p.id] || {}) }));
    renderMeta(data.meta);
    renderBoard();
    updateHeaderStats();
  });

// ── PERSISTENCE ──────────────────────────────────────────────────────
function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveOverrides() {
  const map = {};
  allProjects.forEach(p => {
    map[p.id] = { progress: p.progress, rag: p.rag, notes: p.notes, currentStage: p.currentStage };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// ── RENDER META ──────────────────────────────────────────────────────
function renderMeta(meta) {
  document.title = `${meta.title} — ${meta.org}`;
}

// ── HEADER STATS ─────────────────────────────────────────────────────
function updateHeaderStats() {
  const total    = allProjects.length;
  const active   = allProjects.filter(p => p.progress > 0 && p.progress < 100).length;
  const complete = allProjects.filter(p => p.progress === 100).length;
  const avgProg  = Math.round(allProjects.reduce((s, p) => s + p.progress, 0) / total);

  document.getElementById('stat-total').textContent    = total;
  document.getElementById('stat-active').textContent   = active;
  document.getElementById('stat-complete').textContent = complete;
  document.getElementById('stat-avg').textContent      = avgProg + '%';
}

// ── BOARD ────────────────────────────────────────────────────────────
function renderBoard() {
  const cols = { Now: [], Q2: [], Q3: [] };
  allProjects.forEach(p => cols[p.priority]?.push(p));

  Object.entries(cols).forEach(([priority, projects]) => {
    const body = document.getElementById(`col-${priority}`);
    body.innerHTML = '';
    const count = document.getElementById(`count-${priority}`);
    count.textContent = projects.length;
    projects.forEach(p => body.appendChild(makeCard(p)));
  });
}

function makeCard(p) {
  const card = document.createElement('div');
  card.className = `card pillar-${p.pillar.replace(/ /g,'-')}${p.id === activeId ? ' active' : ''}`;
  card.dataset.id = p.id;

  const pct = p.progress;
  const isComplete = pct === 100;

  card.innerHTML = `
    <div class="card-top">
      <div class="card-name">${p.name}</div>
      <div class="rag-dot ${p.rag}"></div>
    </div>
    <div class="card-cat">${p.category}</div>
    <div class="card-tags">
      <span class="tag ${p.pillar}">${p.pillar}</span>
      ${p.living ? '<span class="tag living">⟳ Living</span>' : ''}
    </div>
    <div class="prog-wrap">
      <div class="prog-bar">
        <div class="prog-fill${isComplete ? ' complete' : ''}" style="width:${pct}%"></div>
      </div>
      <div class="prog-pct">${pct}%</div>
    </div>
  `;

  card.addEventListener('click', () => openPanel(p.id));
  return card;
}

// ── PANEL ────────────────────────────────────────────────────────────
function openPanel(id) {
  activeId = id;
  const p  = allProjects.find(x => x.id === id);
  if (!p) return;

  const panel = document.getElementById('panel');
  const board  = document.getElementById('board');

  // Header
  document.getElementById('panel-name').textContent = p.name;

  // Meta tags
  const metaEl = document.getElementById('panel-meta');
  metaEl.innerHTML = `
    <span class="tag ${p.pillar}">${p.pillar}</span>
    <span class="tag ${p.priority.toLowerCase()}-tag" style="background:${priorityColor(p.priority)}22;color:${priorityColor(p.priority)};font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px">${p.priority}</span>
    ${p.living ? '<span class="tag living">⟳ Living</span>' : ''}
  `;

  // Description
  document.getElementById('panel-desc').textContent = p.description;

  // Goals
  const goalsEl = document.getElementById('panel-goals');
  goalsEl.innerHTML = p.goals.map(g => `
    <div class="goal-item"><div class="goal-dot"></div><span>${g}</span></div>
  `).join('');

  // Stage map
  renderStageMap(p);

  // Documents
  const docsEl = document.getElementById('panel-docs');
  const icons  = { xlsx: '📊', docx: '📄', pptx: '📑', pdf: '📋' };
  docsEl.innerHTML = p.documents.length
    ? p.documents.map(d => {
        const ext  = d.split('.').pop();
        const icon = icons[ext] || '📎';
        return `<div class="doc-item"><span class="doc-icon">${icon}</span>${d}</div>`;
      }).join('')
    : '<div class="doc-item" style="color:var(--muted)">No documents added yet</div>';

  // Info grid
  document.getElementById('info-owner').textContent     = p.owner;
  document.getElementById('info-start').textContent     = p.startDate;
  document.getElementById('info-target').textContent    = p.targetDate;
  document.getElementById('info-category').textContent  = p.category;

  // RAG
  document.querySelectorAll('.rag-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.rag === p.rag);
  });

  // Progress slider
  const slider = document.getElementById('prog-slider');
  const pctEl  = document.getElementById('prog-val');
  slider.value = p.progress;
  pctEl.textContent = p.progress + '%';
  slider.oninput = () => { pctEl.textContent = slider.value + '%'; };

  // Notes
  document.getElementById('panel-notes').value = p.notes || '';

  // Open
  panel.classList.add('open');
  board.classList.add('panel-open');

  // Mark active card
  document.querySelectorAll('.card').forEach(c => c.classList.toggle('active', +c.dataset.id === id));
}

function renderStageMap(p) {
  const el = document.getElementById('panel-stages');
  el.innerHTML = '';
  p.stages.forEach((stage, i) => {
    const isDone   = i < p.currentStage;
    const isActive = i === p.currentStage;
    const isLast   = i === p.stages.length - 1;

    el.innerHTML += `
      <div class="stage-item">
        <div class="stage-left">
          <div class="stage-circle ${isDone ? 'done' : isActive ? 'active' : ''}"
               onclick="setStage(${p.id}, ${i})"
               title="Click to set as current stage">
            ${isDone ? '✓' : i + 1}
          </div>
          ${!isLast ? `<div class="stage-line ${isDone ? 'done' : ''}"></div>` : ''}
        </div>
        <div class="stage-text ${isDone ? 'done' : isActive ? 'active' : ''}">${stage}</div>
      </div>
    `;
  });
}

function setStage(projectId, stageIndex) {
  const p = allProjects.find(x => x.id === projectId);
  if (!p) return;
  p.currentStage = stageIndex;
  // Auto-update progress based on stage
  const auto = Math.round((stageIndex / (p.stages.length - 1)) * 100);
  p.progress   = auto;
  document.getElementById('prog-slider').value = auto;
  document.getElementById('prog-val').textContent = auto + '%';
  renderStageMap(p);
  saveOverrides();
  renderBoard();
  updateHeaderStats();
}

function closePanel() {
  document.getElementById('panel').classList.remove('open');
  document.getElementById('board').classList.remove('panel-open');
  document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
  activeId = null;
}

function priorityColor(p) {
  return p === 'Now' ? '#dc2626' : p === 'Q2' ? '#d97706' : '#2563eb';
}

// ── RAG BUTTONS ──────────────────────────────────────────────────────
document.querySelectorAll('.rag-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.rag-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── SAVE ─────────────────────────────────────────────────────────────
document.getElementById('save-btn').addEventListener('click', () => {
  if (!activeId) return;
  const p = allProjects.find(x => x.id === activeId);
  if (!p) return;

  const activeRag = document.querySelector('.rag-btn.active');
  p.rag      = activeRag ? activeRag.dataset.rag : p.rag;
  p.progress = parseInt(document.getElementById('prog-slider').value);
  p.notes    = document.getElementById('panel-notes').value;

  saveOverrides();
  renderBoard();
  updateHeaderStats();

  // Feedback
  const btn = document.getElementById('save-btn');
  btn.textContent = '✓ Saved';
  btn.classList.add('saved');
  setTimeout(() => { btn.textContent = 'Save Changes'; btn.classList.remove('saved'); }, 1800);
});

// ── CLOSE PANEL ON ESC ───────────────────────────────────────────────
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
