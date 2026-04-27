// ============================================================
//  script.js  —  SlideVault Frontend  (talks to MongoDB API)
// ============================================================

// ── Category UI config (frontend only) ──────────────────────
const CATS = {
  cs:          { label:'Computer Science',        emoji:'💻', color:'#2f6ec8', bg:'rgba(47,110,200,0.08)',  tags:['AI','Machine Learning','Algorithms','OS','Networks'] },
  math:        { label:'Mathematics',             emoji:'📐', color:'#c84b2f', bg:'rgba(200,75,47,0.08)',   tags:['Calculus','Linear Algebra','Statistics','Discrete Math'] },
  physics:     { label:'Physics',                 emoji:'⚛️', color:'#7c3aed', bg:'rgba(124,58,237,0.08)',  tags:['Quantum','Thermodynamics','Mechanics','Optics'] },
  business:    { label:'Business & Management',   emoji:'📈', color:'#c8962f', bg:'rgba(200,150,47,0.08)',  tags:['Strategy','Finance','Marketing','Entrepreneurship'] },
  biology:     { label:'Biology & Life Sciences', emoji:'🧬', color:'#2da06a', bg:'rgba(45,160,106,0.08)',  tags:['Genetics','Cell Biology','Ecology','Biochemistry'] },
  engineering: { label:'Engineering',             emoji:'⚙️', color:'#64748b', bg:'rgba(100,116,139,0.08)', tags:['Civil','Mechanical','Electrical','Chemical'] },
  social:      { label:'Social Sciences',         emoji:'🌍', color:'#0891b2', bg:'rgba(8,145,178,0.08)',   tags:['Psychology','Sociology','Economics','Political Science'] },
  design:      { label:'Design & Arts',           emoji:'🎨', color:'#db2777', bg:'rgba(219,39,119,0.08)',  tags:['UI/UX','Typography','Motion','Illustration'] },
};

// ── Slide preview HTML templates (generated in browser) ─────
function genSlides(title, cat, count) {
  const c = CATS[cat] || CATS.cs;
  const layouts = [
    (i,t,c) => `<div style="width:100%;height:100%;background:linear-gradient(135deg,${c.bg.replace('0.08','0.4')},${c.bg});display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;font-family:'IBM Plex Sans',sans-serif;"><div style="font-size:3rem;margin-bottom:16px;">${c.emoji}</div><div style="font-size:1.5rem;font-weight:700;color:#1a1714;margin-bottom:10px;font-family:'Playfair Display',serif;line-height:1.2;">${t}</div><div style="color:#9a9188;font-size:0.85rem;font-family:'IBM Plex Mono',monospace;">Slide ${i+1} of ${count}</div></div>`,
    (i,t,c) => `<div style="width:100%;height:100%;background:#1a1714;display:flex;align-items:center;padding:40px;font-family:'IBM Plex Sans',sans-serif;"><div><div style="width:40px;height:4px;background:${c.color};border-radius:2px;margin-bottom:20px;"></div><div style="font-size:1.3rem;font-weight:700;color:white;margin-bottom:12px;font-family:'Playfair Display',serif;">${t}</div><div style="color:rgba(255,255,255,0.5);font-size:0.8rem;font-family:'IBM Plex Mono',monospace;">Slide ${i+1}</div></div></div>`,
    (i,t,c) => `<div style="width:100%;height:100%;background:white;border-top:6px solid ${c.color};display:flex;flex-direction:column;padding:36px;font-family:'IBM Plex Sans',sans-serif;"><div style="font-size:1.1rem;font-weight:700;color:#1a1714;margin-bottom:20px;font-family:'Playfair Display',serif;">${t}</div><div style="display:flex;flex-direction:column;gap:10px;flex:1;">${['Key concept overview','Supporting evidence & data','Real-world application'].map(b=>`<div style="display:flex;align-items:center;gap:10px;"><div style="width:8px;height:8px;border-radius:2px;background:${c.color};flex-shrink:0;"></div><div style="color:#4a4540;font-size:0.85rem;">${b}</div></div>`).join('')}</div><div style="color:#ccc;font-size:11px;font-family:'IBM Plex Mono',monospace;margin-top:auto;">Slide ${i+1} / ${count}</div></div>`,
    (i,t,c) => `<div style="width:100%;height:100%;background:${c.color};display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Sans',sans-serif;text-align:center;"><div><div style="font-size:3.5rem;margin-bottom:8px;">${c.emoji}</div><div style="font-size:1.2rem;font-weight:700;color:white;font-family:'Playfair Display',serif;">${t}</div><div style="color:rgba(255,255,255,0.65);font-size:0.8rem;margin-top:10px;font-family:'IBM Plex Mono',monospace;">Slide ${i+1}</div></div></div>`,
  ];
  return Array.from({length:count},(_,i)=>({ html: layouts[i%layouts.length](i, i===0?title:`${title} — Part ${i+1}`, c) }));
}

// ── API helper ───────────────────────────────────────────────
const API = '/api/presentations';

async function apiFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(e.error || res.statusText);
    }
    return res.json();
  } catch (err) {
    showToast('Error: ' + err.message, true);
    throw err;
  }
}

// ── App state ────────────────────────────────────────────────
let presentations   = [];
let likedIds        = new Set(JSON.parse(localStorage.getItem('sv_liked') || '[]'));
let currentFilter   = 'all';
let currentModalId  = null;
let currentSlideIdx = 0;
let currentSlides   = [];
let formTags        = [];
let selectedSlideCount = '21-35';
let searchTimer;

// ── Navigation ───────────────────────────────────────────────
function showPage(p) {
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
  document.getElementById('page-' + p).classList.add('active');
  const map = {home:0, categories:1, upload:2};
  if (map[p] !== undefined) document.querySelectorAll('.nav-btn')[map[p]].classList.add('active');
  window.scrollTo({top:0, behavior:'smooth'});
  if (p === 'categories') renderCatPage();
}

// ── Load data from MongoDB ───────────────────────────────────
async function loadPresentations(cat='all', search='', sort='recent') {
  const p = new URLSearchParams();
  if (cat && cat !== 'all') p.set('cat', cat);
  if (search) p.set('search', search);
  if (sort)   p.set('sort', sort);
  presentations = await apiFetch(`${API}?${p}`);
  presentations.forEach(x => { x.liked = likedIds.has(x._id); });
}

// ── Stats ────────────────────────────────────────────────────
async function updateStats() {
  try {
    const s = await apiFetch('/api/stats');
    animNum('stat-slides', s.presentations);
    animNum('stat-dl',     s.downloads);
    animNum('stat-views',  s.views);
  } catch(_){}
}

function animNum(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur >= 1000 ? (cur/1000).toFixed(1)+'k' : cur;
    if (cur >= target) clearInterval(t);
  }, 25);
}

// ── Category pills ───────────────────────────────────────────
function renderPills() {
  const container = document.getElementById('cat-pills');
  container.innerHTML =
    `<div class="cat-pill active" data-cat="all" onclick="setFilter(this)"><span class="pill-dot" style="background:#1a1714"></span>All</div>` +
    Object.entries(CATS).map(([k,v]) =>
      `<div class="cat-pill" data-cat="${k}" onclick="setFilter(this)"><span class="pill-dot" style="background:${v.color}"></span>${v.label}</div>`
    ).join('');
}

function setFilter(el) {
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  currentFilter = el.dataset.cat;
  renderCards();
}

// ── Trending bar ─────────────────────────────────────────────
function renderTrending() {
  const top = [...presentations].sort((a,b) => b.downloads - a.downloads).slice(0,6);
  document.getElementById('trending-items').innerHTML = top.map((p,i) =>
    `<div class="trending-item" onclick="openModal('${p._id}')">
       <span class="trending-rank">#${i+1}</span>
       <span>${p.title.length>30 ? p.title.slice(0,30)+'…' : p.title}</span>
       <span style="color:var(--muted);font-size:11px;font-family:'IBM Plex Mono',monospace;">⬇ ${p.downloads}</span>
     </div>`
  ).join('');
}

// ── Render cards grid ────────────────────────────────────────
async function renderCards() {
  const search = (document.getElementById('search-input')?.value || '').trim();
  const sort   = document.getElementById('sort-select')?.value || 'recent';

  setGridLoading(true);
  await loadPresentations(currentFilter, search, sort);
  setGridLoading(false);

  const grid  = document.getElementById('slides-grid');
  const empty = document.getElementById('empty-state');
  document.getElementById('result-count').textContent =
    `${presentations.length} result${presentations.length !== 1 ? 's' : ''}`;

  if (presentations.length === 0) {
    grid.innerHTML = ''; empty.style.display = 'block'; return;
  }
  empty.style.display = 'none';
  grid.innerHTML = presentations.map(cardHTML).join('');
  renderTrending();
}

function setGridLoading(on) {
  if (on) document.getElementById('slides-grid').innerHTML =
    `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted);font-family:'IBM Plex Mono',monospace;font-size:13px;">Loading from database…</div>`;
}

function cardHTML(p) {
  const cfg = CATS[p.cat] || CATS.cs;
  const thumb = genSlides(p.title, p.cat, 1)[0].html;
  const accessLabel = {free:'Free', preview:'Preview', request:'Request'}[p.access] || 'Free';
  const tagsHTML = (p.tags||[]).slice(0,3).map(t =>
    `<span style="background:${cfg.bg};color:${cfg.color};font-size:11px;padding:2px 8px;border-radius:4px;font-weight:500;">${t}</span>`
  ).join('');
  return `
    <div class="slide-card" onclick="openModal('${p._id}')">
      <div class="slide-thumb">
        <div class="thumb-canvas">${thumb}</div>
        <div class="thumb-slide-count">▣ ${p.slideCount} slides</div>
        <div class="cat-badge" style="background:${cfg.bg};color:${cfg.color};">${cfg.emoji} ${cfg.label}</div>
        <div class="thumb-preview-btn"><button class="preview-icon">▶</button></div>
      </div>
      <div class="card-body">
        <div class="card-title">${p.title}</div>
        <div class="card-author">${p.author}${p.institution?' · '+p.institution:''}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">${tagsHTML}</div>
        <div class="card-desc">${p.desc}</div>
        <div class="card-footer">
          <div class="card-meta-left">
            <span class="meta-chip">⬇ ${p.downloads}</span>
            <span class="meta-chip">👁 ${p.views}</span>
            <span class="meta-chip">♡ ${p.likes}</span>
          </div>
          <button class="card-dl-btn" onclick="event.stopPropagation();quickDownload('${p._id}')">
            <span style="font-size:10px;">⬇</span> ${accessLabel}
          </button>
        </div>
      </div>
    </div>`;
}

// ── Modal / Slide Preview ────────────────────────────────────
async function openModal(id) {
  try {
    const p = await apiFetch(`${API}/${id}/view`, {method:'PATCH'});
    p.liked = likedIds.has(p._id);
    currentModalId  = id;
    currentSlideIdx = 0;

    const cfg = CATS[p.cat] || CATS.cs;
    document.getElementById('m-title').textContent    = p.title;
    document.getElementById('m-subtitle').textContent =
      `${p.author}${p.institution?' · '+p.institution:''} · ${cfg.emoji} ${cfg.label}`;

    const accessLabel = {free:'Free Download', preview:'Preview Only', request:'Request Access'}[p.access]||'Free';
    const dateStr = p.createdAt ? p.createdAt.split('T')[0] : '';
    document.getElementById('m-meta').innerHTML = `
      <div class="meta-item"><span class="meta-icon">▣</span>${p.slideCount} Slides</div>
      <div class="meta-item"><span class="meta-icon">⬇</span>${p.downloads} Downloads</div>
      <div class="meta-item"><span class="meta-icon">👁</span>${p.views} Views</div>
      <div class="meta-item"><span class="meta-icon">♡</span>${p.likes} Likes</div>
      <div class="meta-item"><span class="meta-icon">🔓</span>${accessLabel}</div>
      <div class="meta-item"><span class="meta-icon">📅</span>${dateStr}</div>`;
    document.getElementById('m-desc').textContent = p.desc;

    const lb = document.getElementById('m-like-btn');
    lb.className = 'btn-like' + (p.liked ? ' liked' : '');
    lb.innerHTML  = (p.liked ? '♥' : '♡') + ' ' + p.likes;

    currentSlides = genSlides(p.title, p.cat, Math.min(p.slideCount, 8));
    renderSlideViewer();

    document.getElementById('modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCards();
  } catch(_) {}
}

function renderSlideViewer() {
  document.getElementById('slide-display').innerHTML  = currentSlides[currentSlideIdx].html;
  document.getElementById('slide-counter').textContent = `${currentSlideIdx+1} / ${currentSlides.length}`;
  document.getElementById('btn-prev').disabled = currentSlideIdx === 0;
  document.getElementById('btn-next').disabled = currentSlideIdx === currentSlides.length - 1;
  document.getElementById('slide-dots').innerHTML = currentSlides.map((_,i) =>
    `<div class="slide-dot ${i===currentSlideIdx?'active':''}" onclick="goSlide(${i})"></div>`
  ).join('');
}

function prevSlide() { if (currentSlideIdx > 0) { currentSlideIdx--; renderSlideViewer(); } }
function nextSlide() { if (currentSlideIdx < currentSlides.length-1) { currentSlideIdx++; renderSlideViewer(); } }
function goSlide(i)  { currentSlideIdx = i; renderSlideViewer(); }

function closeModal(event) {
  if (event && event.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  currentModalId = null;
}

// ── Download ─────────────────────────────────────────────────
async function downloadSlide() {
  if (!currentModalId) return;
  const p = await apiFetch(`${API}/${currentModalId}/download`, {method:'PATCH'});
  if (p.filename) triggerDownload(`/uploads/${p.filename}`, p.filename);
  showToast(`Downloading "${p.title}" ⬇`);
  renderCards();
  openModal(currentModalId);
}

async function quickDownload(id) {
  const p = await apiFetch(`${API}/${id}/download`, {method:'PATCH'});
  if (p.filename) triggerDownload(`/uploads/${p.filename}`, p.filename);
  showToast(`Downloading "${p.title.slice(0,30)}…" ⬇`);
  renderCards();
}

function triggerDownload(href, filename) {
  const a = document.createElement('a');
  a.href = href; a.download = filename; a.click();
}

// ── Like / Unlike ────────────────────────────────────────────
async function toggleLike() {
  if (!currentModalId) return;
  const wasLiked = likedIds.has(currentModalId);
  const p = await apiFetch(`${API}/${currentModalId}/like`, {
    method: 'PATCH',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ action: wasLiked ? 'unlike' : 'like' }),
  });
  wasLiked ? likedIds.delete(currentModalId) : likedIds.add(currentModalId);
  localStorage.setItem('sv_liked', JSON.stringify([...likedIds]));
  p.liked = likedIds.has(p._id);
  const lb = document.getElementById('m-like-btn');
  lb.className = 'btn-like' + (p.liked ? ' liked' : '');
  lb.innerHTML  = (p.liked ? '♥' : '♡') + ' ' + p.likes;
  showToast(p.liked ? 'Added to liked! ♥' : 'Removed from liked');
  renderCards();
}

// ── Categories page ──────────────────────────────────────────
function renderCatPage() {
  document.getElementById('cat-page-grid').innerHTML = Object.entries(CATS).map(([k,v]) => {
    const count   = presentations.filter(p => p.cat === k).length;
    const totalDL = presentations.filter(p => p.cat === k).reduce((s,p) => s+p.downloads, 0);
    const tagsHTML = v.tags.slice(0,4).map(t =>
      `<span class="mini-tag" style="background:${v.bg};color:${v.color};border-color:${v.color}30;">${t}</span>`
    ).join('');
    return `
      <div class="cat-page-card" onclick="filterByCat('${k}')" style="border-top-color:${v.color};">
        <span class="cat-emoji">${v.emoji}</span>
        <div class="cat-card-name" style="color:${v.color};">${v.label}</div>
        <div class="cat-card-desc">${v.tags.join(', ')} and more.</div>
        <div class="cat-card-count" style="color:${v.color};">📊 ${count} presentation${count!==1?'s':''} &nbsp;·&nbsp; ⬇ ${totalDL} downloads</div>
        <div class="cat-top-tags">${tagsHTML}</div>
      </div>`;
  }).join('');
}

function filterByCat(cat) {
  showPage('home');
  setTimeout(() => {
    currentFilter = cat;
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.toggle('active', p.dataset.cat===cat));
    renderCards();
    document.getElementById('browse-section').scrollIntoView({behavior:'smooth'});
  }, 350);
}

// ── Upload form ──────────────────────────────────────────────
function handleFileSelect(input) {
  const file = input.files[0]; if (!file) return;
  document.getElementById('file-name').textContent = file.name;
  document.getElementById('file-size').textContent = (file.size/1024/1024).toFixed(2)+' MB';
  document.getElementById('file-chosen').classList.add('show');
  document.getElementById('dropzone').classList.add('has-file');
}

const dz = document.getElementById('dropzone');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
dz.addEventListener('drop', e => {
  e.preventDefault(); dz.classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) { document.getElementById('file-input').files = e.dataTransfer.files; handleFileSelect({files:[file]}); }
});

function selectCount(el) {
  document.querySelectorAll('.count-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedSlideCount = el.dataset.v;
}

function handleTagKey(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(',','');
    if (val && !formTags.includes(val) && formTags.length < 8) { formTags.push(val); renderFormTags(); }
    e.target.value = '';
  }
}
function removeTag(t) { formTags = formTags.filter(x => x!==t); renderFormTags(); }
function renderFormTags() {
  const list = document.getElementById('tags-list');
  const input = document.getElementById('tag-input');
  list.innerHTML = formTags.map(t =>
    `<div class="tag-item"><span>${t}</span><button onclick="removeTag('${t}')">×</button></div>`
  ).join('') + input.outerHTML;
  document.getElementById('tag-input').addEventListener('keydown', handleTagKey);
}

async function submitPresentation() {
  const title  = document.getElementById('f-title').value.trim();
  const author = document.getElementById('f-author').value.trim();
  const cat    = document.getElementById('f-category').value;
  const desc   = document.getElementById('f-desc').value.trim();

  if (!title)  { showToast('Please enter a title ⚠️', true); return; }
  if (!author) { showToast('Please enter your name ⚠️', true); return; }
  if (!cat)    { showToast('Please select a category ⚠️', true); return; }
  if (!desc)   { showToast('Please add a description ⚠️', true); return; }

  const countMap = {'5-10':8,'11-20':15,'21-35':28,'36-50':42,'50+':55};
  const slideCount = countMap[selectedSlideCount] || 20;

  const fd = new FormData();
  fd.append('title',       title);
  fd.append('author',      author);
  fd.append('institution', document.getElementById('f-institution').value.trim());
  fd.append('cat',         cat);
  fd.append('desc',        desc);
  fd.append('tags',        JSON.stringify(formTags));
  fd.append('slideCount',  slideCount);
  fd.append('access',      document.getElementById('f-access').value);
  const fi = document.getElementById('file-input');
  if (fi.files[0]) fd.append('file', fi.files[0]);

  const btn = document.querySelector('.form-submit');
  btn.disabled = true; btn.textContent = 'Publishing…';

  try {
    await apiFetch(API, {method:'POST', body:fd});
    showToast('Published to MongoDB! 🎉');
    resetForm();
    await updateStats();
    setTimeout(() => showPage('home'), 1200);
  } finally {
    btn.disabled = false; btn.innerHTML = '<span>↑</span> Publish Presentation';
  }
}

function resetForm() {
  ['f-title','f-author','f-institution','f-desc'].forEach(id => document.getElementById(id).value='');
  document.getElementById('f-category').value = '';
  document.getElementById('f-access').value   = 'free';
  formTags = []; renderFormTags();
  document.getElementById('file-chosen').classList.remove('show');
  document.getElementById('dropzone').classList.remove('has-file');
  document.getElementById('file-input').value = '';
  document.querySelectorAll('.count-opt').forEach(o => o.classList.toggle('selected', o.dataset.v==='21-35'));
  selectedSlideCount = '21-35';
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, error=false) {
  const t = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = error ? '⚠️' : '✅';
  document.getElementById('toast-msg').textContent  = msg;
  t.style.borderLeftColor = error ? 'var(--accent)' : 'var(--accent3)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ── Keyboard shortcuts ───────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!currentModalId) return;
  if (e.key === 'Escape')     closeModal();
  if (e.key === 'ArrowLeft')  prevSlide();
  if (e.key === 'ArrowRight') nextSlide();
});

// ── Search debounce ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderCards, 380);
  });
});

// ── Bootstrap ────────────────────────────────────────────────
(async () => {
  renderPills();
  await renderCards();   // pulls from MongoDB
  await updateStats();   // pulls aggregate stats from MongoDB
})();
