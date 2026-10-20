const $ = (id) => document.getElementById(id);

const state = {
  projects: [],
  current: null,
  items: [],
  filter: 'all', // 'all' | 'open' | kategori adı
  expanded: new Set(), // alt işleri açık olan iş id'leri
  pickedCats: [], // ekleme formunda seçili kategoriler
};

const baseName = (p) => p.split(/[\\/]/).filter(Boolean).pop() || p;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function persist() {
  await window.api.saveTodos(state.current, state.items);
}

function categories() {
  return [...new Set(state.items.flatMap((i) => i.categories))].sort();
}

function visibleItems() {
  if (state.filter === 'all') return state.items;
  if (state.filter === 'open') return state.items.filter((i) => !i.done);
  return state.items.filter((i) => i.categories.includes(state.filter));
}

function renderProjects() {
  const ul = $('projects');
  ul.innerHTML = '';
  for (const dir of state.projects) {
    const li = document.createElement('li');
    li.title = dir;
    if (dir === state.current) li.className = 'active';
    li.innerHTML = '<span class="name"></span><button class="rm" title="listeden çıkar">×</button>';
    li.querySelector('.name').textContent = baseName(dir);
    li.onclick = () => selectProject(dir);
    li.querySelector('.rm').onclick = async (e) => {
      e.stopPropagation();
      await window.api.removeProject(dir);
      state.projects = state.projects.filter((p) => p !== dir);
      if (state.current === dir) {
        state.current = null;
        renderAll();
      } else {
        renderProjects();
      }
    };
    ul.appendChild(li);
  }
}

function renderFilters() {
  const box = $('filters');
  box.innerHTML = '';
  const defs = [['all', 'hepsi'], ['open', 'bitmeyenler'], ...categories().map((c) => [c, '#' + c])];
  if (!defs.some(([k]) => k === state.filter)) state.filter = 'all';
  for (const [key, label] of defs) {
    const b = document.createElement('button');
    b.className = 'chip' + (key === state.filter ? ' active' : '');
    b.textContent = label;
    b.onclick = () => {
      state.filter = key === state.filter ? 'all' : key;
      renderTodos();
    };
    box.appendChild(b);
  }
  renderChips();
}

function renderChips() {
  const box = $('cat-chips');
  box.innerHTML = '';
  const names = [...new Set([...categories(), ...state.pickedCats])].sort();
  for (const c of names) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cat-chip' + (state.pickedCats.includes(c) ? ' active' : '');
    b.textContent = '#' + c;
    b.style.setProperty('--cat', catColor(c));
    b.onclick = () => {
      state.pickedCats = state.pickedCats.includes(c)
        ? state.pickedCats.filter((x) => x !== c)
        : [...state.pickedCats, c];
      renderChips();
      $('new-text').focus();
    };
    box.appendChild(b);
  }
}

function startEdit(item, span) {
  const input = document.createElement('input');
  input.className = 'edit';
  input.value = item.text;
  span.replaceWith(input);
  input.focus();
  const commit = async () => {
    const v = input.value.trim();
    if (v) item.text = v;
    await persist();
    renderTodos();
  };
  input.onblur = commit;
  input.onkeydown = (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') {
      input.value = item.text;
      input.blur();
    }
  };
}

// Her yeni kategori rastgele bir renk alır; kullanımdaki renklerden en uzak ton seçilir.
// Seçim localStorage'da saklanır, kategori sonraki açılışlarda da aynı rengi korur.
function catHue(name) {
  let map = {};
  try {
    map = JSON.parse(localStorage.getItem('catHues') || '{}');
  } catch {}
  if (map[name] === undefined) {
    const used = categories().filter((c) => c !== name && map[c] !== undefined).map((c) => map[c]);
    const dist = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    let best = Math.floor(Math.random() * 360);
    let bestScore = -1;
    for (let i = 0; i < 40; i++) {
      const h = Math.floor(Math.random() * 360);
      const score = used.length ? Math.min(...used.map((u) => dist(h, u))) : 360;
      if (score > bestScore) {
        best = h;
        bestScore = score;
      }
    }
    map[name] = best;
    localStorage.setItem('catHues', JSON.stringify(map));
  }
  return map[name];
}

const catColor = (name) => `hsl(${catHue(name)}, 70%, 68%)`;

// Ton noktaları: RGB çarkından boya (kırmızı-sarı-mavi) çarkına çeviri.
// Böylece mavi + sarı yeşil, kırmızı + mavi mor, kırmızı + sarı turuncu olur.
const HUE_RGB = [0, 30, 60, 120, 240, 300, 360];
const HUE_RYB = [0, 60, 120, 180, 240, 300, 360];

function warpHue(h, from, to) {
  for (let i = 0; i < from.length - 1; i++) {
    if (h <= from[i + 1]) return to[i] + ((h - from[i]) * (to[i + 1] - to[i])) / (from[i + 1] - from[i]);
  }
  return h;
}

// Birden fazla kategorinin renklerini boya mantığıyla karıştırır.
function mixColor(names) {
  if (names.length === 1) return catColor(names[0]);
  let x = 0;
  let y = 0;
  for (const n of names) {
    const rad = (warpHue(catHue(n), HUE_RGB, HUE_RYB) * Math.PI) / 180;
    x += Math.cos(rad);
    y += Math.sin(rad);
  }
  const ryb = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return `hsl(${warpHue(ryb, HUE_RYB, HUE_RGB)}, 70%, 68%)`;
}

// Tüm alt işler bitince ana iş de tikli olur; biri açılırsa tik kalkar.
function syncParent(item) {
  if (item.subs.length) item.done = item.subs.every((s) => s.done);
}

function subPanel(item) {
  const box = document.createElement('div');
  box.className = 'subs';

  for (const sub of item.subs) {
    const row = document.createElement('div');
    row.className = 'sub' + (sub.done ? ' done' : '');
    row.innerHTML =
      '<span class="check"></span><span class="text"></span>' +
      '<button class="edit-btn" title="düzenle">✎</button><button class="del" title="sil">×</button>';
    const check = row.querySelector('.check');
    check.textContent = sub.done ? '[x]' : '[ ]';
    check.onclick = async () => {
      sub.done = !sub.done;
      syncParent(item);
      await persist();
      renderTodos();
    };
    const subText = row.querySelector('.text');
    subText.textContent = sub.text;
    row.querySelector('.edit-btn').onclick = () => startEdit(sub, subText);
    row.querySelector('.del').onclick = async () => {
      item.subs = item.subs.filter((s) => s.id !== sub.id);
      syncParent(item);
      await persist();
      renderTodos();
    };
    box.appendChild(row);
  }

  const form = document.createElement('form');
  form.className = 'sub-add';
  form.innerHTML = '<input placeholder="alt iş ekle, Enter..." required>';
  const input = form.querySelector('input');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    item.subs.push({ id: newId(), text, done: false });
    syncParent(item);
    await persist();
    renderTodos();
    document.querySelector(`[data-sub-for="${item.id}"] input`)?.focus();
  };
  form.dataset.subFor = item.id;
  box.appendChild(form);
  return box;
}

const LANE = 12; // kategori çizgileri arası yatay boşluk (px)

// Aynı kategorideki ana işleri solda ince bir dikey çizgi ve noktalarla bağlar.
function drawRails() {
  const ul = $('todos');
  ul.querySelectorAll('.rail, .rail-dot').forEach((el) => el.remove());

  const groups = new Map();
  for (const li of ul.querySelectorAll(':scope > li')) {
    for (const cat of li.dataset.cats.split('|').filter(Boolean)) {
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(li);
    }
  }
  const linked = [...groups].filter(([, lis]) => lis.length > 1).sort(([a], [b]) => a.localeCompare(b));
  ul.style.paddingLeft = linked.length ? linked.length * LANE + 4 + 'px' : '';

  linked.forEach(([cat, lis], lane) => {
    const x = lane * LANE + 4;
    const color = catColor(cat);
    const ys = lis.map((li) => {
      const check = li.querySelector(':scope > .check');
      return check.offsetTop + check.offsetHeight / 2;
    });

    const rail = document.createElement('div');
    rail.className = 'rail';
    rail.style.left = x + 'px';
    rail.style.top = ys[0] + 'px';
    rail.style.height = ys[ys.length - 1] - ys[0] + 'px';
    rail.style.borderLeftColor = color;
    ul.appendChild(rail);

    for (const y of ys) {
      const dot = document.createElement('div');
      dot.className = 'rail-dot';
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';
      dot.style.background = color;
      ul.appendChild(dot);
    }
  });
}

window.addEventListener('resize', () => {
  if (state.current) drawRails();
});

function renderTodos() {
  renderFilters();
  const ul = $('todos');
  ul.innerHTML = '';
  let dragId = null;

  for (const item of visibleItems()) {
    const li = document.createElement('li');
    li.draggable = true;
    li.className = item.done ? 'done' : '';
    li.dataset.cats = item.categories.join('|');
    if (item.categories.length) li.style.setProperty('--cat', mixColor(item.categories));
    item.subs = item.subs || [];
    li.innerHTML =
      '<span class="check"></span><span class="text" title="alt işleri aç/kapat"></span>' +
      '<span class="count"></span>' +
      '<span class="tags"></span><button class="edit-btn" title="düzenle">✎</button>' +
      '<button class="del" title="sil">×</button>';

    const check = li.querySelector('.check');
    check.textContent = item.done ? '[x]' : '[ ]';
    check.onclick = async () => {
      item.done = !item.done;
      await persist();
      renderTodos();
    };

    const text = li.querySelector('.text');
    text.textContent = item.text;
    text.onclick = () => {
      if (state.expanded.has(item.id)) state.expanded.delete(item.id);
      else state.expanded.add(item.id);
      renderTodos();
    };
    li.querySelector('.edit-btn').onclick = () => startEdit(item, text);

    const open = state.expanded.has(item.id);
    const count = li.querySelector('.count');
    const subsDone = item.subs.filter((s) => s.done).length;
    count.textContent = (open ? '▾ ' : '▸ ') + (item.subs.length ? `${subsDone}/${item.subs.length}` : '');

    const tags = li.querySelector('.tags');
    for (const c of item.categories) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = '#' + c;
      tag.style.setProperty('--cat', catColor(c));
      tag.onclick = () => {
        state.filter = c;
        renderTodos();
      };
      tags.appendChild(tag);
    }

    li.querySelector('.del').onclick = async () => {
      state.items = state.items.filter((i) => i.id !== item.id);
      await persist();
      renderTodos();
    };

    li.ondragstart = () => {
      dragId = item.id;
      li.classList.add('dragging');
    };
    li.ondragend = () => li.classList.remove('dragging');
    li.ondragover = (e) => {
      e.preventDefault();
      li.classList.add('over');
    };
    li.ondragleave = () => li.classList.remove('over');
    li.ondrop = async (e) => {
      e.preventDefault();
      if (!dragId || dragId === item.id) return;
      const from = state.items.findIndex((i) => i.id === dragId);
      const [moved] = state.items.splice(from, 1);
      const to = state.items.findIndex((i) => i.id === item.id);
      state.items.splice(to, 0, moved);
      await persist();
      renderTodos();
    };

    if (open) li.appendChild(subPanel(item));
    ul.appendChild(li);
  }

  drawRails();

  const done = state.items.filter((i) => i.done).length;
  $('stats').textContent = `${done}/${state.items.length} tamamlandı`;
}

function renderAll() {
  renderProjects();
  const has = !!state.current;
  $('empty').hidden = has;
  $('view').hidden = !has;
  if (!has) return;
  $('project-name').textContent = baseName(state.current);
  $('project-path').textContent = state.current;
  renderTodos();
}

async function selectProject(dir) {
  state.current = dir;
  state.filter = 'all';
  state.pickedCats = [];
  const loaded = await window.api.loadTodos(dir);
  // Eski kayıtlar tek `category` tutuyordu; çoklu `categories` biçimine çevrilir.
  state.items = loaded.map(({ category, ...i }) => ({
    ...i,
    categories: i.categories || (category ? [category] : []),
  }));
  renderAll();
}

$('add-project').onclick = async () => {
  const dir = await window.api.addProject();
  if (!dir) return;
  if (!state.projects.includes(dir)) state.projects.push(dir);
  selectProject(dir);
};

// Yazılan kategoriyi seçili kategorilere ekler; bir iş birden fazla kategoride olabilir.
function addTypedCat() {
  const v = $('new-cat').value.trim().replace(/^#/, '');
  if (!v) return;
  if (!state.pickedCats.includes(v)) state.pickedCats.push(v);
  $('new-cat').value = '';
  renderChips();
}

$('add-cat').onclick = () => {
  addTypedCat();
  $('new-cat').focus();
};

$('new-cat').onkeydown = (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  addTypedCat();
};

$('add-form').onsubmit = async (e) => {
  e.preventDefault();
  const text = $('new-text').value.trim();
  if (!text) return;
  addTypedCat();
  state.items.push({ id: newId(), text, done: false, categories: [...state.pickedCats] });
  $('new-text').value = '';
  await persist();
  renderTodos();
  $('new-text').focus();
};

(async () => {
  const { projects, initial } = await window.api.listProjects();
  state.projects = projects;
  if (initial) await selectProject(initial);
  else if (projects.length) await selectProject(projects[0]);
  else renderAll();
})();
