/* ============================================================
   ON MANGE QUOI ? — app.js
   Vanilla JS · Fetch-based · No dependencies
   ============================================================ */

// Fix 3 — reset URL hash avant tout scroll automatique du navigateur
if (window.location.hash) {
  history.replaceState(null, null, ' ');
  window.scrollTo(0, 0);
}

'use strict';

// ── State ──────────────────────────────────────────────────
const state = {
  config: null,
  menuData: null,
  historyData: null,
  currentProfile: 'famille_jeunes_enfants',
  currentStore: 'discount',
  checkedItems: {},   // { "Cat__idx": true }  — progress mode
  fridgeMode: false,
  fridgeItems: {},    // { "Cat__idx": true }  — already owned
  isViewingCurrentMenu: true
};

// ── localStorage ───────────────────────────────────────────
const LS = {
  load() {
    try {
      state.currentProfile = localStorage.getItem('omq_profile') || state.currentProfile;
      state.currentStore   = localStorage.getItem('omq_store')   || state.currentStore;
      state.fridgeMode     = localStorage.getItem('omq_fridge_mode') === 'true';
      const ci = localStorage.getItem('omq_checked');
      const fi = localStorage.getItem('omq_fridge_items');
      if (ci) state.checkedItems  = JSON.parse(ci);
      if (fi) state.fridgeItems   = JSON.parse(fi);
    } catch (_) { /* ignore */ }
  },
  save() {
    try {
      localStorage.setItem('omq_profile',      state.currentProfile);
      localStorage.setItem('omq_store',        state.currentStore);
      localStorage.setItem('omq_fridge_mode',  state.fridgeMode);
      localStorage.setItem('omq_checked',      JSON.stringify(state.checkedItems));
      localStorage.setItem('omq_fridge_items', JSON.stringify(state.fridgeItems));
    } catch (_) { /* ignore */ }
  }
};

// ── Utilities ──────────────────────────────────────────────
function fmt(n) { return n.toFixed(2).replace('.', ',') + '\u202f€'; }

function formatDate(s) {
  if (!s) return '';
  return new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function formatDateShort(s) {
  if (!s) return '';
  return new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().slice(0, 10);
}

function itemId(catName, idx) { return `${catName}__${idx}`; }

// ── Season detection ───────────────────────────────────────
function getCurrentSeason() {
  const m = new Date().getMonth(); // 0-11
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

function getSeasonEmoji() {
  return { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' }[getCurrentSeason()];
}

// ── Prep time badge ────────────────────────────────────────
function prepClass(prepTime) {
  const t = parseInt(prepTime, 10) || 0;
  if (t <= 10) return 'prep-fast';
  if (t <= 25) return 'prep-medium';
  return 'prep-slow';
}

function prepLabel(prepTime) {
  const t = parseInt(prepTime, 10) || 0;
  if (t < 60) return `${t} min`;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h} h`;
}

// ── Risk dot ───────────────────────────────────────────────
function riskDotColor(level) {
  return { low: 'var(--risk-low)', medium: 'var(--risk-medium)', high: 'var(--risk-high)' }[level] || 'transparent';
}

function riskTooltip(level, type) {
  if (!level || level === 'low') return 'Risque faible';
  const labels = {
    cadmium:    'Cadmium',
    mercury:    'Mercure',
    pesticides: 'Pesticides',
    elevage:    'Élevage intensif'
  };
  const l = level === 'medium' ? 'modéré' : 'élevé';
  const t = labels[type] ? ` — ${labels[type]}` : '';
  return `Risque ${l}${t}`;
}

// ── Price freshness ────────────────────────────────────────
function getPriceFreshness(dateStr) {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / 86400000);
  if (days < 30) return { color: '#16A34A', msg: 'Prix mis à jour ce mois-ci ✓' };
  if (days < 90) {
    const d = new Date(dateStr + 'T12:00:00');
    const m = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return { color: '#CA8A04', msg: `Prix de ${m} — à vérifier en magasin` };
  }
  const d = new Date(dateStr + 'T12:00:00');
  return { color: '#DC2626', msg: `Prix potentiellement obsolètes — mis à jour le ${d.toLocaleDateString('fr-FR')}` };
}

// ── Item label class ───────────────────────────────────────
function itemLabelClass(label) {
  if (!label) return '';
  if (label.includes('bio')) return 'bio-rec';
  if (label.includes('max') || label.includes('occasionnel')) return 'limit-lbl';
  return 'quality';
}

// ── Budget calculations ────────────────────────────────────
function calcItemPrice(item) {
  const base = item[`price_${state.currentStore}`] || 0;
  const mult = state.config?.profiles[state.currentProfile]?.portionMultiplier || 1;
  return base * mult;
}

function calcTotalForStore(storeKey) {
  if (!state.menuData?.shoppingList) return 0;
  let total = 0;
  state.menuData.shoppingList.forEach(cat => {
    cat.items.forEach((item, idx) => {
      const id = itemId(cat.category, idx);
      if (state.fridgeMode && state.fridgeItems[id]) return;
      const base = item[`price_${storeKey}`] || 0;
      const mult = state.config?.profiles[state.currentProfile]?.portionMultiplier || 1;
      total += base * mult;
    });
  });
  return total;
}

function calcSavings() {
  if (!state.menuData?.shoppingList) return { count: 0, amount: 0 };
  let count = 0, amount = 0;
  state.menuData.shoppingList.forEach(cat => {
    cat.items.forEach((item, idx) => {
      const id = itemId(cat.category, idx);
      if (state.fridgeItems[id]) {
        count++;
        const base = item[`price_${state.currentStore}`] || 0;
        const mult = state.config?.profiles[state.currentProfile]?.portionMultiplier || 1;
        amount += base * mult;
      }
    });
  });
  return { count, amount };
}

// ── Data loading ───────────────────────────────────────────
async function loadData() {
  try {
    const [cfg, menu, hist] = await Promise.all([
      fetch('data/config.json').then(r => { if (!r.ok) throw r; return r.json(); }),
      fetch('data/menus/2026-03-30.json').then(r => { if (!r.ok) throw r; return r.json(); }),
      fetch('data/history.json').then(r => { if (!r.ok) throw r; return r.json(); })
    ]);
    state.config      = cfg;
    state.menuData    = menu;
    state.historyData = hist;
    renderAll();
  } catch (err) {
    showError(err);
  }
}

function showError(err) {
  const el = document.getElementById('error-screen');
  if (el) el.classList.add('visible');
  console.error('[On mange quoi ?]', err);
}

// ── Render all ─────────────────────────────────────────────
function renderAll() {
  renderProfileSelector();
  renderMobileProfileSelector();
  renderStoreSelector();
  renderMobileStoreSelector();
  renderHealthScore();
  renderMenu();
  renderShoppingList();
  updateFridgeBar();
  renderBudget();
  renderHistory();
  renderHealthAlerts();
  setupNav();
  requestAnimationFrame(() => {
    document.getElementById('app-content')?.classList.add('is-visible');
  });
}

// Fix 1 — labels courts pour la bottom bar mobile
const PROFILE_SHORT_LABELS = {
  famille_jeunes_enfants: 'Famille',
  couple:                 'Couple',
  solo:                   'Solo'
};

// ── Profile selector ───────────────────────────────────────
function buildProfileButtons(container, mobile = false) {
  if (!container || !state.config) return;
  container.innerHTML = '';
  if (!mobile) {
    const lbl = document.createElement('label');
    lbl.textContent = 'Profil :';
    container.appendChild(lbl);
  }
  Object.entries(state.config.profiles).forEach(([key, p]) => {
    const btn = document.createElement('button');
    const isActive = key === state.currentProfile;
    btn.title = p.description || p.label;
    btn.setAttribute('aria-pressed', isActive);
    btn.className = `profile-pill${isActive ? ' active' : ''}`;
    btn.textContent = PROFILE_SHORT_LABELS[key] || p.label.split('·')[0].trim();
    btn.addEventListener('click', () => {
      state.currentProfile = key;
      LS.save();
      renderAll();
    });
    container.appendChild(btn);
  });
}

function renderProfileSelector() {
  buildProfileButtons(document.getElementById('profile-selector'), false);
}
function renderMobileProfileSelector() {
  buildProfileButtons(document.getElementById('profile-selector-mobile'), true);
}

// ── Store selector ─────────────────────────────────────────
function buildStoreButtons(container, mobile = false) {
  if (!container || !state.config) return;
  container.innerHTML = '';
  if (!mobile) {
    const lbl = document.createElement('label');
    lbl.textContent = 'Enseigne :';
    container.appendChild(lbl);
  }
  Object.entries(state.config.stores).forEach(([key, s]) => {
    const btn = document.createElement('button');
    btn.className = `selector-btn store-${key}${key === state.currentStore ? ' active' : ''}`;
    btn.setAttribute('aria-pressed', key === state.currentStore);
    const shortLabel = s.label.split(' (')[0];
    btn.textContent = shortLabel;
    btn.addEventListener('click', () => {
      state.currentStore = key;
      LS.save();
      renderShoppingList();
      renderBudget();
      updateFridgeBar();
      syncStoreSelectorStates();
    });
    container.appendChild(btn);
  });
}

function renderStoreSelector() {
  buildStoreButtons(document.getElementById('store-selector'), false);
}
function renderMobileStoreSelector() {
  buildStoreButtons(document.getElementById('store-selector-mobile'), true);
}

function syncStoreSelectorStates() {
  document.querySelectorAll('[data-store-key]').forEach(btn => {
    const key = btn.dataset.storeKey;
    btn.classList.toggle('active', key === state.currentStore);
    btn.setAttribute('aria-pressed', key === state.currentStore);
  });
}

// ── Health score ────────────────────────────────────────────
function renderHealthScore() {
  if (!state.menuData) return;

  const score = state.menuData.healthScore || 'A';
  const highlights = state.menuData.healthScoreHighlights || [];
  const ws = state.menuData.weekStart;
  const we = state.menuData.weekEnd;

  // Inline badge in section header
  const badgeEl = document.getElementById('score-badge-inline');
  if (badgeEl) {
    badgeEl.className = `score-badge score-badge--${score.toLowerCase()}`;
    badgeEl.innerHTML = `<span class="score-badge__letter">${score}</span> Score santé`;
    badgeEl.setAttribute('aria-label', `Score santé ${score}`);
  }

  // Date range
  const dateEl = document.getElementById('score-date-inline');
  if (dateEl) {
    dateEl.textContent = `${formatDate(ws)} – ${formatDate(we)}`;
  }

  // Highlights chips + print button
  const highlightsEl = document.getElementById('score-highlights');
  if (highlightsEl) {
    highlightsEl.innerHTML = highlights.map(h => `<span class="score-highlight-chip">${h}</span>`).join('');
  }
}

// ── Menu grid ───────────────────────────────────────────────
function renderMenu() {
  const grid = document.getElementById('week-grid');
  if (!grid || !state.menuData) return;

  // History banner
  renderHistoryBanner();

  // Fix 2 — swipe hint: hide on first scroll
  const hint = document.getElementById('swipe-hint');
  if (hint) {
    const onFirstScroll = () => {
      hint.classList.add('hidden');
      grid.removeEventListener('scroll', onFirstScroll);
      try { localStorage.setItem('omq_swipe_seen', '1'); } catch (_) {}
    };
    if (localStorage.getItem('omq_swipe_seen')) {
      hint.classList.add('hidden');
    } else {
      grid.addEventListener('scroll', onFirstScroll, { passive: true });
    }
  }

  const season = getSeasonEmoji();
  grid.innerHTML = '';

  state.menuData.days.forEach(day => {
    const col = document.createElement('div');
    col.className = 'day-card';
    const todayBadge = isToday(day.date) ? '<span class="badge-today">Aujourd\'hui</span>' : '';
    col.innerHTML = `
      <div class="day-header">
        <span class="day-label">${day.label}</span>
        ${todayBadge}
      </div>
      <div class="day-meals" id="meals-${day.date}"></div>`;
    grid.appendChild(col);

    const mealsContainer = col.querySelector('.day-meals');
    const mealOrder = ['breakfast', 'lunch', 'snack', 'dinner'];
    mealOrder.forEach(type => {
      const meal = day.meals[type];
      if (!meal) return;

      const row = document.createElement('div');
      row.className = `meal-row ${type}`;

      const dotColor = riskDotColor(meal.riskLevel);
      const tooltip  = riskTooltip(meal.riskLevel, meal.riskType);
      const pc       = prepClass(meal.prepTime);
      const pl       = prepLabel(meal.prepTime);
      const seasonBadge = meal.isSeasonal
        ? `<span class="badge-season" title="De saison">${season} saison</span>` : '';

      row.innerHTML = `
        <div class="meal-header">
          <span class="meal-icon">${meal.icon || '🍽'}</span>
          <span class="meal-name">${meal.name}</span>
        </div>
        <div class="meal-badges">
          <span class="risk-dot" style="background:${dotColor}" data-tooltip="${tooltip}" role="img" aria-label="${tooltip}"></span>
          <span class="badge-prep ${pc}" title="Temps de préparation">⏱ ${pl}</span>
          ${seasonBadge}
        </div>`;

      mealsContainer.appendChild(row);
    });
  });
}

// ── History banner ──────────────────────────────────────────
function renderHistoryBanner() {
  const banner = document.getElementById('menu-history-banner');
  if (!banner) return;
  if (state.isViewingCurrentMenu) { banner.hidden = true; return; }
  const txt = document.getElementById('menu-history-banner-text');
  if (txt && state.menuData) {
    txt.textContent = `📚 Semaine du ${formatDate(state.menuData.weekStart)} au ${formatDate(state.menuData.weekEnd)}`;
  }
  banner.hidden = false;
}

// ── Shopping list ───────────────────────────────────────────
function renderShoppingList() {
  const container = document.getElementById('shopping-list');
  if (!container || !state.menuData) return;
  container.innerHTML = '';

  const season = getSeasonEmoji();

  state.menuData.shoppingList.forEach(cat => {
    const section = document.createElement('div');
    section.className = 'shopping-category';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', 'true');
    header.innerHTML = `
      <span class="category-icon">${cat.emoji}</span>
      <span>${cat.category}</span>
      <span class="category-count">${cat.items.length} articles</span>
      <span class="category-toggle">▾</span>`;

    const body = document.createElement('div');
    body.className = 'category-body';

    header.addEventListener('click', () => {
      const isOpen = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', !isOpen);
      header.querySelector('.category-toggle').textContent = isOpen ? '▸' : '▾';
      body.style.display = isOpen ? 'none' : '';
    });

    cat.items.forEach((item, idx) => {
      const id = itemId(cat.category, idx);
      const isChecked = state.checkedItems[id];
      const isFridgeOwned = state.fridgeMode && state.fridgeItems[id];

      const li = document.createElement('div');
      li.className = `shopping-item${isChecked ? ' is-checked' : ''}${isFridgeOwned ? ' is-fridge-owned' : ''}`;
      li.dataset.id = id;

      const price = calcItemPrice(item);
      const priceHtml = isFridgeOwned
        ? `<span class="item-price ${state.currentStore}" style="text-decoration:line-through;opacity:.5">${fmt(price)}</span>`
        : `<span class="item-price ${state.currentStore}">${fmt(price)}</span>`;

      const labelHtml = item.label
        ? `<span class="item-label ${itemLabelClass(item.label)}">${item.label}</span>` : '';
      const seasonHtml = item.isSeasonal
        ? `<span class="item-season-badge">${season} saison</span>` : '';
      const fridgeLbl = isFridgeOwned ? '<span class="item-label quality">J\'ai déjà</span>' : '';

      const checkboxTitle = state.fridgeMode ? "J'ai déjà cet article" : "Cocher comme acheté";

      li.innerHTML = `
        <input type="checkbox" id="item-${id}" ${(isChecked || isFridgeOwned) ? 'checked' : ''} title="${checkboxTitle}">
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-qty">${item.qty}</div>
          <div class="item-meta">${labelHtml}${seasonHtml}${fridgeLbl}</div>
        </div>
        ${priceHtml}`;

      li.querySelector('input').addEventListener('change', e => {
        if (state.fridgeMode) {
          if (e.target.checked) state.fridgeItems[id] = true;
          else delete state.fridgeItems[id];
          LS.save();
          renderShoppingList();
          updateFridgeBar();
          renderBudget();
        } else {
          if (e.target.checked) state.checkedItems[id] = true;
          else delete state.checkedItems[id];
          LS.save();
          li.classList.toggle('is-checked', e.target.checked);
        }
      });

      body.appendChild(li);
    });

    section.appendChild(header);
    section.appendChild(body);
    container.appendChild(section);
  });
}

// ── Fridge mode ─────────────────────────────────────────────
function toggleFridgeMode() {
  state.fridgeMode = !state.fridgeMode;
  LS.save();
  const btn = document.getElementById('btn-fridge');
  if (btn) {
    btn.classList.toggle('active', state.fridgeMode);
    btn.title = state.fridgeMode ? 'Désactiver le mode frigo vide' : 'Activer le mode frigo vide';
  }
  renderShoppingList();
  updateFridgeBar();
  renderBudget();
}

function updateFridgeBar() {
  const bar     = document.getElementById('fridge-bar');
  const badge   = document.querySelector('.fridge-badge');
  const btn     = document.getElementById('btn-fridge');
  const { count, amount } = calcSavings();

  if (btn) {
    btn.classList.toggle('active', state.fridgeMode);
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('visible', count > 0);
    }
  }

  if (!bar) return;
  if (!state.fridgeMode || count === 0) { bar.hidden = true; return; }
  bar.hidden = false;

  const txt = bar.querySelector('.fridge-bar-text');
  if (txt) {
    txt.innerHTML = `🧊 <strong>${count} article${count > 1 ? 's' : ''} déjà disponible${count > 1 ? 's' : ''}</strong> — vous économisez <strong>${fmt(amount)}</strong>`;
  }
}

// ── Budget ──────────────────────────────────────────────────
function renderBudget() {
  if (!state.config || !state.menuData) return;
  const stores   = state.config.stores;
  const profile  = state.config.profiles[state.currentProfile];
  const persons  = profile?.persons || 4;
  const totals   = {};
  Object.keys(stores).forEach(k => { totals[k] = calcTotalForStore(k); });
  const maxTotal = Math.max(...Object.values(totals), 1);

  // Store comparison bars
  const barsEl = document.getElementById('budget-bars');
  if (barsEl) {
    barsEl.innerHTML = '';
    Object.entries(stores).forEach(([key, store]) => {
      const pct = totals[key] / maxTotal * 100;
      const r = document.createElement('div');
      r.className = 'budget-bar-row';
      r.innerHTML = `
        <span class="budget-bar-label">${store.label.split(' (')[0]}</span>
        <div class="budget-bar-track">
          <div class="budget-bar-fill ${key}" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <span class="budget-bar-value">${fmt(totals[key])}</span>`;
      barsEl.appendChild(r);
    });
  }

  // Store cards
  const cardsEl = document.getElementById('budget-store-cards');
  if (cardsEl) {
    cardsEl.innerHTML = '';
    Object.entries(stores).forEach(([key, store]) => {
      const card = document.createElement('div');
      card.className = `budget-store-card ${key}${key === state.currentStore ? ' active' : ''}`;
      card.dataset.storeKey = key;
      card.innerHTML = `
        <div class="store-label">${store.label.split(' (')[0]}</div>
        <div class="store-total ${key}">${fmt(totals[key])}</div>`;
      card.addEventListener('click', () => {
        state.currentStore = key;
        LS.save();
        renderShoppingList();
        renderBudget();
        updateFridgeBar();
      });
      cardsEl.appendChild(card);
    });
  }

  // Totals
  const cur = totals[state.currentStore] || 0;
  setText('budget-total',  fmt(cur));
  setText('budget-per-day', fmt(cur / 7));

  // Fix 4 — Solo : masquer les lignes redondantes
  const perPersonItem    = document.getElementById('budget-per-person')?.parentElement;
  const perPersonDayItem = document.getElementById('budget-per-person-day')?.parentElement;
  const personsItem      = document.getElementById('budget-persons')?.parentElement;
  const personsLabel     = personsItem?.querySelector('.budget-sub-label');

  if (persons === 1) {
    if (perPersonItem)    perPersonItem.hidden    = true;
    if (perPersonDayItem) perPersonDayItem.hidden = true;
    if (personsLabel)     personsLabel.textContent = '1 personne · 7 jours';
    setText('budget-persons', fmt(cur));
  } else {
    if (perPersonItem)    perPersonItem.hidden    = false;
    if (perPersonDayItem) perPersonDayItem.hidden = false;
    if (personsLabel)     personsLabel.textContent = 'Personnes';
    setText('budget-per-person',     fmt(cur / persons));
    setText('budget-per-person-day', fmt(cur / persons / 7));
    setText('budget-persons',        String(persons));
  }

  // Fridge savings
  const savingsEl = document.getElementById('budget-fridge-savings');
  if (savingsEl) {
    const { count, amount } = calcSavings();
    if (state.fridgeMode && count > 0) {
      savingsEl.hidden = false;
      savingsEl.innerHTML = `🧊 Économie frigo : <strong>${fmt(amount)}</strong> (${count} article${count > 1 ? 's' : ''})`;
    } else {
      savingsEl.hidden = true;
    }
  }

  // Freshness
  const freshEl = document.getElementById('price-freshness');
  if (freshEl && state.config.pricesLastUpdated) {
    const f = getPriceFreshness(state.config.pricesLastUpdated);
    if (f) {
      freshEl.innerHTML = `<span class="freshness-dot" style="background:${f.color}"></span><span>${f.msg}</span>`;
    }
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── History ─────────────────────────────────────────────────
function renderHistory() {
  const grid = document.getElementById('history-grid');
  if (!grid || !state.historyData) return;
  grid.innerHTML = '';

  state.historyData.menus.forEach((menu, i) => {
    const isCurrent = i === 0;
    const card = document.createElement('div');
    card.className = `history-card${isCurrent ? ' current' : ''}`;

    const score = menu.healthScore || '';
    const scoreHtml = score ? `<span class="history-card-score grade-${score}">Score ${score}</span>` : '';
    const hlHtml = (menu.highlights || []).map(h => `<li>${h}</li>`).join('');

    card.innerHTML = `
      <div class="history-card-label">
        ${formatDateShort(menu.weekStart)} – ${formatDateShort(menu.weekEnd)}
        ${isCurrent ? '<span class="badge-current">En cours</span>' : ''}
      </div>
      ${scoreHtml}
      <div class="history-card-title">${menu.label}</div>
      <ul class="history-highlights">${hlHtml}</ul>
      <a class="history-view-btn" href="#menu">Voir ce menu →</a>`;

    card.querySelector('.history-view-btn').addEventListener('click', e => {
      e.preventDefault();
      state.isViewingCurrentMenu = isCurrent;
      renderHistoryBanner();
      document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
    });

    grid.appendChild(card);
  });
}

// ── Health alerts ───────────────────────────────────────────
function renderHealthAlerts() {
  const container = document.getElementById('health-news');
  if (!container || !state.menuData) return;
  container.innerHTML = '';

  (state.menuData.healthAlerts?.news || []).forEach(item => {
    const el = document.createElement('div');
    el.className = 'health-news-item';
    el.textContent = item;
    container.appendChild(el);
  });
}

// ── Copy shopping list ──────────────────────────────────────
function copyShoppingList() {
  if (!state.menuData?.shoppingList || !state.config) return;
  const profile = state.config.profiles[state.currentProfile];
  const store   = state.config.stores[state.currentStore];

  const lines = [
    '🛒 Liste de courses — On mange quoi ?',
    `Profil : ${profile.emoji} ${profile.label}`,
    `Enseigne : ${store.label}`,
    ''
  ];

  state.menuData.shoppingList.forEach(cat => {
    const visibleItems = cat.items.filter((item, idx) => {
      const id = itemId(cat.category, idx);
      return !(state.fridgeMode && state.fridgeItems[id]);
    });
    if (!visibleItems.length) return;
    lines.push(`${cat.emoji} ${cat.category}`);
    visibleItems.forEach(item => lines.push(`  ☐ ${item.name} (${item.qty}) — ${fmt(calcItemPrice(item))}`));
    lines.push('');
  });

  const { amount } = calcSavings();
  lines.push(`💰 Total estimé : ${fmt(calcTotalForStore(state.currentStore))}`);
  if (state.fridgeMode && amount > 0) lines.push(`🧊 Économie frigo : ${fmt(amount)}`);

  navigator.clipboard
    .writeText(lines.join('\n'))
    .then(() => showToast('✓ Liste copiée dans le presse-papier !'))
    .catch(() => showToast('Copie impossible — essayez avec Chrome ou Firefox'));
}

// ── Reset fridge ────────────────────────────────────────────
function resetFridge() {
  state.fridgeItems = {};
  LS.save();
  renderShoppingList();
  updateFridgeBar();
  renderBudget();
  showToast('Frigo réinitialisé');
}

// ── Print frigo ─────────────────────────────────────────────
function printFrigo() {
  if (!state.menuData) return;
  const overlay = document.getElementById('print-frigo-overlay');
  if (!overlay) return;

  const mealTypeLabel = { breakfast: 'Petit-déj', lunch: 'Déjeuner', snack: 'Goûter', dinner: 'Dîner' };
  const mealTypeColor = { breakfast: '#4F46E5', lunch: '#16A34A', snack: '#EA580C', dinner: '#9333EA' };

  const daysHtml = state.menuData.days.map(day => {
    const mealsHtml = ['breakfast', 'lunch', 'snack', 'dinner']
      .map(type => {
        const meal = day.meals[type];
        if (!meal) return '';
        return `<div class="frigo-meal">
          <div class="frigo-meal-type" style="color:${mealTypeColor[type]}">${mealTypeLabel[type]}</div>
          <div class="frigo-meal-name">${meal.icon || ''} ${meal.name}</div>
        </div>`;
      }).join('');
    return `<div class="frigo-day">
      <div class="frigo-day-name">${day.label}</div>
      ${mealsHtml}
    </div>`;
  }).join('');

  overlay.innerHTML = `
    <div class="frigo-title">🥗 On mange quoi ? — Semaine du ${formatDate(state.menuData.weekStart)}</div>
    <div class="frigo-subtitle">Score santé ${state.menuData.healthScore || 'A'} · Imprimé le ${new Date().toLocaleDateString('fr-FR')}</div>
    <div class="frigo-grid">${daysHtml}</div>`;

  document.body.classList.add('print-frigo');
  window.print();
  document.body.classList.remove('print-frigo');
}

// ── Navigation ───────────────────────────────────────────────
function setupNav() {
  const allNavLinks = document.querySelectorAll('.nav-link, .bottom-nav-link');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = `#${entry.target.id}`;
          allNavLinks.forEach(l => {
            l.classList.toggle('active', l.getAttribute('href') === id);
          });
        }
      });
    },
    { rootMargin: '-30% 0px -65% 0px', threshold: 0 }
  );

  ['menu', 'courses', 'historique', 'cadmium', 'apropos'].forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

// ── Toast ────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3000);
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  LS.load();

  // Fridge toggle
  document.getElementById('btn-fridge')?.addEventListener('click', toggleFridgeMode);

  // Copy list
  document.getElementById('btn-copy')?.addEventListener('click', copyShoppingList);

  // Print shopping list
  document.getElementById('btn-print')?.addEventListener('click', () => window.print());

  // Reset fridge
  document.getElementById('btn-fridge-reset')?.addEventListener('click', resetFridge);

  // Return to current menu
  document.getElementById('btn-view-current')?.addEventListener('click', () => {
    state.isViewingCurrentMenu = true;
    renderHistoryBanner();
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Share week view
  document.getElementById('btn-vue-semaine')?.addEventListener('click', () => {
    const week = state.menuData?.weekStart || '';
    window.location.href = `semaine.html?week=${week}`;
  });

  loadData();
});
