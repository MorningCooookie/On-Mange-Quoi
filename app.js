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
  veilleData: null,     // External health news (independent of menu)
  currentProfile: 'famille_jeunes_enfants',
  currentStore: 'discount',
  checkedItems: {},   // { "Cat__idx": true }  — progress mode
  fridgeMode: false,
  fridgeItems: {},    // { "Cat__idx": true }  — already owned
  isViewingCurrentMenu: true,
  supabaseProfileId: null,  // User profile UUID from Supabase
  supabaseProfileName: null // User profile name (for filtering)
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

// ── Profile bridge (called by ProfileManager when user selects a Supabase profile) ──
function setSupabaseProfile(profileId, profileName) {
  state.supabaseProfileId = profileId;
  state.supabaseProfileName = profileName;
  // Update user menu to show current profile name (strip emoji)
  const menuProfileName = document.getElementById('current-profile-name');
  if (menuProfileName) {
    // Remove emoji from display (regex matches common emoji ranges)
    const cleanName = (profileName || 'Mon profil').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2000}-\u{206F}]/gu, '').trim();
    menuProfileName.textContent = cleanName || 'Mon profil';
  }
  renderAll();
}

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

// ── Current week menu date ──────────────────────────────────
// Calcule le lundi de la semaine en cours au format YYYY-MM-DD
function getCurrentMenuMonday() {
  const d = new Date();
  const day = d.getDay(); // 0=dim, 1=lun, ...
  const diff = day === 0 ? -6 : 1 - day; // recule au lundi
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

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

// Render prep-time badge with dot and label
function renderPrepTimeBadge(prepTime) {
  if (!prepTime || parseInt(prepTime, 10) === 0) return '';

  const t = parseInt(prepTime, 10);
  let speed = 'slow';
  let tooltip = 'Plus de 45 minutes';

  if (t <= 15) {
    speed = 'fast';
    tooltip = 'Moins de 15 minutes';
  } else if (t <= 30) {
    speed = 'medium';
    tooltip = 'Moins de 30 minutes';
  } else if (t <= 45) {
    speed = 'slow';
    tooltip = 'Moins de 45 minutes';
  }

  return `<span class="prep-time-badge" data-tooltip="${tooltip}">
    <span class="prep-time-dot ${speed}"></span>
    <span>${prepLabel(prepTime)}</span>
  </span>`;
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
  // Chemins absolus pour éviter tout bug de résolution d'URL sur mobile
  let cfg, menu, hist;

  // Calcule la semaine courante dynamiquement — avec fallback sur la semaine précédente
  const currentMonday = getCurrentMenuMonday();
  const prevMonday = (() => {
    const d = new Date(currentMonday + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  })();

  // Essaie la semaine en cours, puis la semaine précédente si le fichier n'existe pas encore
  async function fetchMenu() {
    const r = await fetch(`/data/menus/${currentMonday}.json`);
    if (r.ok) return r.json();
    const r2 = await fetch(`/data/menus/${prevMonday}.json`);
    if (r2.ok) return r2.json();
    throw new Error(`Aucun menu trouvé pour ${currentMonday} ni ${prevMonday}`);
  }

  try {
    let cfg, menu, hist, veille;
    [cfg, menu, hist, veille] = await Promise.all([
      fetch('/data/config.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} — config.json`); return r.json(); }),
      fetchMenu(),
      fetch('/data/history.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} — history.json`); return r.json(); }),
      fetch('/data/veille.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} — veille.json`); return r.json(); })
    ]);

    state.config      = cfg;
    state.menuData    = menu;
    state.historyData = hist;
    state.veilleData  = veille;
  } catch (err) {
    showError('fetch', err);
    return;
  }

  // Render séparé du fetch pour isoler les erreurs
  try {
    renderAll();
  } catch (err) {
    showError('render', err);
  }
}

function showError(stage, err) {
  const el = document.getElementById('error-screen');
  if (!el) return;
  const card = el.querySelector('.error-card');
  if (card) {
    const isLocalFile = window.location.protocol === 'file:';
    if (isLocalFile) {
      card.innerHTML = `
        <h2>🚧 Serveur local requis</h2>
        <p>Ce site charge ses données via des fichiers JSON.<br>
           Il ne peut pas s'ouvrir en double-cliquant sur <code>index.html</code>.</p>
        <p>Lancez un serveur local depuis le terminal :</p>
        <div class="error-code">cd /chemin/vers/le/dossier
python3 -m http.server 8000</div>
        <p>Puis ouvrez <strong>http://localhost:8000</strong> dans votre navigateur.</p>`;
    } else {
      const errMsg = err instanceof Error ? err.message : (err && err.status ? `HTTP ${err.status}` : String(err));
      card.innerHTML = `
        <h2>⚠️ Erreur de chargement</h2>
        <p>Le site n'a pas pu charger ses données.<br>Essayez de <strong>rafraîchir la page</strong>.</p>
        <button onclick="window.location.reload()" style="margin:1rem auto;display:block;padding:.6rem 1.4rem;background:#1B4332;color:#fff;border:none;border-radius:8px;font-size:.95rem;cursor:pointer">↺ Rafraîchir</button>
        <details style="margin-top:.75rem;font-size:.75rem;color:#999;text-align:left">
          <summary style="cursor:pointer">Détails techniques</summary>
          <code style="display:block;margin-top:.4rem;word-break:break-all">[${stage}] ${errMsg}</code>
        </details>`;
    }
  }
  el.classList.add('visible');
  console.error(`[On mange quoi ?][${stage}]`, err);
}

// ── Render all ─────────────────────────────────────────────
function renderAll() {
  renderProfileSelectorShopping();
  renderStoreSelectorShopping();
  renderMobileProfileSelector();
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
function renderProfileSelectorShopping() {
  buildProfileButtons(document.getElementById('profile-selector-shopping'), false);
}

// ── Store selector ─────────────────────────────────────────
function buildStoreButtons(container, mobile = false) {
  if (!container || !state.config) return;
  container.innerHTML = '';
  Object.entries(state.config.stores).forEach(([key, s]) => {
    const btn = document.createElement('button');
    btn.className = `selector-btn store-${key}${key === state.currentStore ? ' active' : ''}`;
    btn.setAttribute('aria-pressed', key === state.currentStore);
    btn.dataset.storeKey = key;
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
function renderStoreSelectorShopping() {
  buildStoreButtons(document.getElementById('store-selector-shopping'), false);
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

  // Load preferences for current profile (if available)
  let currentPreferences = null;
  if (state.supabaseProfileId && typeof PreferenceManager !== 'undefined') {
    currentPreferences = PreferenceManager.getPreferences(state.supabaseProfileId);
  }

  // Check if user has preferences set
  const hasPreferences = currentPreferences && (currentPreferences.allergies?.length || currentPreferences.restrictions?.length || currentPreferences.dislikes?.length);

  // Apply preference substitution if feature is enabled
  if (hasPreferences && window.FEATURE_FLAGS?.PREFERENCES_FEATURE_ENABLED && typeof ProfileManager !== 'undefined' && ProfileManager.isSubscribed && typeof PreferenceSubstitution !== 'undefined') {
    // Apply substitution (applySubstitutions handles deep copy internally)
    PreferenceSubstitution.applySubstitutions(state.menuData, state.supabaseProfileId).then(result => {
      state.menuData = result.menu; // Update menu with substitutions
      if (result.alerts?.length) {
        PreferenceSubstitution.displayAlerts(result.alerts);
      }
      console.log(`✨ Applied ${result.substitutionCount} preference substitutions`);
      renderMenu(); // Re-render with substituted menu
    }).catch(err => {
      console.error('Preference substitution error:', err);
      renderMenu(); // Fallback: render original menu
    });
    return; // Exit early, renderMenu will be called again after substitution
  }

  // Preferences feature is disabled — no message needed
  // Users with preferences simply see the menu as-is

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
    let swipeSeen = false;
    try { swipeSeen = !!localStorage.getItem('omq_swipe_seen'); } catch (_) {}
    if (swipeSeen) {
      hint.classList.add('hidden');
    } else {
      grid.addEventListener('scroll', onFirstScroll, { passive: true });
    }
  }

  const season = getSeasonEmoji();
  grid.innerHTML = '';

  // Guidance section removed temporarily - will restore when layout is fixed

  // Preference header removed - preferences are shown inline with meals instead

  state.menuData.days.forEach(day => {
    const col = document.createElement('div');
    col.className = 'day-card';
    // Compatibilité : le JSON utilise dayName, label ou name selon les versions
    const dayLabel = day.dayName || day.label || day.name || '';
    col.innerHTML = `
      <div class="day-header">
        <span class="day-label">${dayLabel}</span>
      </div>
      <div class="day-meals" id="meals-${day.date}"></div>`;
    grid.appendChild(col);

    const mealsContainer = col.querySelector('.day-meals');
    // Compatibilité : clés françaises (dejeuner/diner) ou anglaises (breakfast/lunch/dinner)
    const mealOrder = ['breakfast', 'lunch', 'snack', 'dinner', 'dejeuner', 'diner', 'gouter'];
    mealOrder.forEach(type => {
      const meal = day.meals[type];
      if (!meal) return;

      const row = document.createElement('div');
      row.className = `meal-row ${type}`;

      const dotColor = riskDotColor(meal.riskLevel);
      const tooltip  = riskTooltip(meal.riskLevel, meal.riskType);
      const pc       = prepClass(meal.prepTime);
      const pl       = prepLabel(meal.prepTime);
      // isSeasonal peut être un booléen ou se déduire du tag "saison"
      const isSeasonal = meal.isSeasonal || meal.tags?.includes('saison') || false;
      const seasonBadge = isSeasonal
        ? `<span class="badge-season" title="De saison">${season} saison</span>` : '';

      // Check if meal is safe for current preferences
      let mealWarning = '';
      let rowClass = `meal-row ${type}`;
      if (currentPreferences && (currentPreferences.allergies?.length || currentPreferences.restrictions?.length || currentPreferences.dislikes?.length)) {
        const mealIngredients = meal.ingredients || [];
        const isSafe = PreferenceManager.isDishSafe(meal.name, mealIngredients, currentPreferences);
        if (!isSafe) {
          rowClass += ' meal-unsafe';
          mealWarning = '<div style="color:#dc2626;font-size:0.8rem;margin-top:0.25rem;font-weight:600;">⚠️ Incompatible avec vos préférences</div>';
        }
      }
      row.className = rowClass;

      const prepBadge = renderPrepTimeBadge(meal.prepTime);
      row.innerHTML = `
        <div class="meal-header">
          <span class="meal-icon">${meal.icon || '🍽'}</span>
          <span class="meal-name">${meal.name}</span>
        </div>
        <div class="meal-badges">
          <span class="risk-dot" style="background:${dotColor}" data-tooltip="${tooltip}" role="img" aria-label="${tooltip}"></span>
          ${prepBadge}
          ${seasonBadge}
        </div>
        ${mealWarning}
        <div class="meal-rating" data-meal-id="${meal.id || meal.name}" style="opacity: 0.3; transition: opacity 0.2s;">
          <button class="emoji-btn" data-rating="1" aria-label="Pas satisfait">😕</button>
          <button class="emoji-btn" data-rating="2" aria-label="Neutre">😐</button>
          <button class="emoji-btn" data-rating="3" aria-label="Satisfait">😊</button>
          <button class="emoji-btn" data-rating="4" aria-label="Très satisfait">😍</button>
        </div>

        <div class="meal-feedback-context" data-meal-id="${meal.id || meal.name}" style="display: none;">
          <p class="feedback-prompt">Pourquoi ça n'a pas marché?</p>
          <div class="feedback-options">
            <button class="feedback-option" data-reason="too-long">⏱️ Trop long à préparer</button>
            <button class="feedback-option" data-reason="not-good">😕 Pas bon</button>
            <button class="feedback-option" data-reason="ingredients">🛒 Ingrédients introuvables</button>
            <button class="feedback-option" data-reason="other">✍️ Autre (expliquez brièvement)</button>
          </div>
          <textarea class="feedback-comment" placeholder="(optionnel)" style="display: none;"></textarea>
          <div class="feedback-actions">
            <button class="feedback-submit">Envoyer</button>
            <button class="feedback-close">Non, merci</button>
          </div>
        </div>`;

      mealsContainer.appendChild(row);
    });
  });

  // Update preferences button (show/hide based on conflicts)
  if (window.preferencesButton && state.supabaseProfileId) {
    const allMeals = [];
    state.menuData.days.forEach(day => {
      ['breakfast', 'lunch', 'snack', 'dinner', 'dejeuner', 'diner', 'gouter'].forEach(type => {
        const meal = day.meals[type];
        if (meal) allMeals.push(meal);
      });
    });

    const preferences = typeof PreferenceManager !== 'undefined'
      ? PreferenceManager.getPreferences(state.supabaseProfileId)
      : null;

    if (preferences) {
      window.preferencesButton.updateButton(allMeals, preferences).catch(err => {
        console.warn('Could not update preferences button:', err);
      });
    }
  }
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

// ── Emoji par défaut selon le nom de catégorie ──────────────
const CATEGORY_EMOJIS = {
  'Poissons': '🐟', 'Viandes': '🥩', 'Légumes': '🥦', 'Légumineuses': '🫘',
  'Produits frais': '🥛', 'Épicerie': '🛒', 'Fruits': '🍎', 'Boulangerie': '🥖',
  'Boissons': '🥤', 'Surgelés': '❄️', 'Hygiène': '🧴'
};
function categoryEmoji(cat) {
  if (cat.emoji) return cat.emoji;
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (cat.category?.includes(key)) return emoji;
  }
  return '🛒';
}

// ── Normalise un item : string → objet compatible ────────────
function normalizeItem(raw) {
  if (typeof raw === 'string') return { name: raw, qty: '', label: '', isSeasonal: false };
  return raw;
}

// ── Shopping list category sort order ──────────────────────
const CATEGORY_SORT_ORDER = {
  // Group 1: Fruits & Vegetables (priority)
  'Fruits': 0,
  'Légumes': 1,
  'Fruits et légumes': 2,
  'Fresh produce': 3,

  // Group 2: Proteins
  'Viandes': 10,
  'Poissons': 11,
  'Œufs': 12,
  'Proteins': 13,

  // Group 3: Dairy
  'Produits laitiers': 20,
  'Dairy': 21,
  'Fromage': 22,

  // Group 4: Pantry & Dry Goods
  'Féculents': 30,
  'Pâtes et riz': 31,
  'Pantry': 32,
  'Épices': 33,
  'Condiments': 34,

  // Group 5: Snacks & Other
  'Autres': 50,
  'Other': 51
};

// Trier les catégories selon l'ordre défini
function sortShoppingCategories(categories) {
  return categories.slice().sort((a, b) => {
    const orderA = CATEGORY_SORT_ORDER[a.category] !== undefined
      ? CATEGORY_SORT_ORDER[a.category]
      : 100; // Unknown categories go to the end

    const orderB = CATEGORY_SORT_ORDER[b.category] !== undefined
      ? CATEGORY_SORT_ORDER[b.category]
      : 100;

    if (orderA !== orderB) return orderA - orderB;

    // If same order, sort alphabetically by category name
    return a.category.localeCompare(b.category, 'fr');
  });
}

// ── Shopping list ───────────────────────────────────────────
function renderShoppingList() {
  const container = document.getElementById('shopping-list');
  if (!container || !state.menuData) return;
  container.innerHTML = '';

  const season = getSeasonEmoji();

  const sortedCategories = sortShoppingCategories(state.menuData.shoppingList);
  sortedCategories.forEach(cat => {
    const section = document.createElement('div');
    section.className = 'shopping-category';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', 'true');
    header.innerHTML = `
      <span class="category-icon">${categoryEmoji(cat)}</span>
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

    cat.items.forEach((rawItem, idx) => {
      // Compatibilité : item peut être une string ou un objet
      const item = normalizeItem(rawItem);
      const id = itemId(cat.category, idx);
      const isChecked = state.checkedItems[id];
      const isFridgeOwned = state.fridgeMode && state.fridgeItems[id];

      const li = document.createElement('div');
      li.className = `shopping-item${isChecked ? ' is-checked' : ''}${isFridgeOwned ? ' is-fridge-owned' : ''}`;
      li.dataset.id = id;

      const price = calcItemPrice(item);
      const priceHtml = price > 0
        ? (isFridgeOwned
            ? `<span class="item-price ${state.currentStore}" style="text-decoration:line-through;opacity:.5">${fmt(price)}</span>`
            : `<span class="item-price ${state.currentStore}">${fmt(price)}</span>`)
        : '';

      const labelHtml = item.label
        ? `<span class="item-label ${itemLabelClass(item.label)}">${item.label}</span>` : '';
      const isSeasonal = item.isSeasonal || item.tags?.includes('saison') || false;
      const seasonHtml = isSeasonal
        ? `<span class="item-season-badge">${season} saison</span>` : '';
      const fridgeLbl = isFridgeOwned ? '<span class="item-label quality">J\'ai déjà</span>' : '';

      const checkboxTitle = state.fridgeMode ? "J'ai déjà cet article" : "Cocher comme acheté";

      li.innerHTML = `
        <input type="checkbox" id="item-${id}" ${(isChecked || isFridgeOwned) ? 'checked' : ''} title="${checkboxTitle}">
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          ${item.qty ? `<div class="item-qty">${item.qty}</div>` : ''}
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

  // Mise à jour du budget quick view dans la toolbar courses
  document.querySelectorAll('.budget-amount').forEach(el => { el.textContent = fmt(cur); });

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
      freshEl.innerHTML = `<span class="freshness-dot" style="background:${f.color}"></span><span>${f.msg}</span><span class="price-indicative-note">* Prix indicatifs basés sur une veille de marché</span>`;
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
      <a class="history-view-btn" href="semaine.html?week=${menu.weekStart}">Voir ce menu →</a>`;

    grid.appendChild(card);
  });
}

// ── Health alerts (Veille santé) ──────────────────────────
function renderHealthAlerts() {
  const container = document.getElementById('health-news');
  if (!container) return;
  container.innerHTML = '';

  // Load external health news from veille.json (independent of menu)
  if (!state.veilleData || !state.veilleData.news) {
    console.warn('Veille data not loaded');
    return;
  }

  state.veilleData.news.forEach(item => {
    const el = document.createElement('div');
    el.className = 'health-news-item';

    // Build news item with title, description, and sources
    let html = `<strong>${item.title}</strong>`;
    if (item.description) html += `<br><span style="font-size: 0.9em; opacity: 0.8;">${item.description}</span>`;
    if (item.sources?.length) {
      html += `<br><span style="font-size: 0.8em; opacity: 0.6; margin-top: 0.5em; display: block;">Sources : ${item.sources.join(' · ')}</span>`;
    }

    el.innerHTML = html;
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

  const btn = document.getElementById('btn-copy');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-label-icon">⏳</span>Copie...';

    navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => {
        showToast('✓ Liste copiée !');
        setTimeout(() => {
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
          btn.innerHTML = originalText;
        }, 1000);
      })
      .catch(() => {
        showToast('Copie impossible', 'error');
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.innerHTML = originalText;
      });
  } else {
    navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => showToast('✓ Liste copiée !'))
      .catch(() => showToast('Copie impossible', 'error'));
  }
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

  // Initialize feature flags first (checks URL params and localStorage)
  if (typeof initializeFeatureFlags === 'function') {
    initializeFeatureFlags();
  }

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

// ============================================
// MENU FILTERING — Dietary Personalization
// ============================================

// Get filtered menu data for current profile based on preferences
async function getFilteredMenuData() {
  if (!state.menuData || !state.currentProfile) return state.menuData;

  // Load preferences for current profile
  const prefs = await PreferenceManager.loadPreferences(state.currentProfile);
  
  if (!prefs || (!prefs.allergies?.length && !prefs.restrictions?.length && !prefs.dislikes?.length)) {
    return state.menuData; // No filtering needed
  }

  // Create a copy of menu data with filtered meals
  const filtered = JSON.parse(JSON.stringify(state.menuData));
  
  filtered.days.forEach(day => {
    const mealOrder = ['breakfast', 'lunch', 'snack', 'dinner'];
    mealOrder.forEach(type => {
      const meal = day.meals[type];
      if (meal) {
        // Check if meal is safe for preferences
        const isSafe = PreferenceManager.isDishSafe(meal.name, meal.ingredients || [], prefs);
        meal.isSafe = isSafe;
        meal.userPreferences = prefs; // Attach preferences for UI display
      }
    });
  });

  return filtered;
}

// Render preference tags in menu header
function renderPreferenceHeader() {
  const headerContainer = document.querySelector('.menu-preference-info');
  if (!headerContainer) {
    // Create header if it doesn't exist
    const menu = document.querySelector('.menu');
    if (!menu) return;
    
    const header = document.createElement('div');
    header.className = 'menu-preference-info';
    header.style.cssText = `
      padding: 1rem;
      background: #f0fdf4;
      border-bottom: 1px solid #dcfce7;
      border-radius: 8px;
      margin-bottom: 1rem;
    `;
    menu.insertBefore(header, menu.firstChild);
  }

  const container = document.querySelector('.menu-preference-info');
  if (!container) return;

  // Get current profile preferences
  const prefs = PreferenceManager.getPreferences(state.currentProfile);
  const tags = PreferenceManager.getPreferenceTags(prefs);
  
  if (tags.length === 0) {
    container.innerHTML = '<div style="font-size: 0.9rem; color: #666;">Aucune préférence alimentaire définie</div>';
    return;
  }

  const tagsHtml = tags.map(tag => 
    `<span style="display: inline-block; background: #10b981; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; margin-right: 0.5rem; font-size: 0.85rem; font-weight: 600;">${tag}</span>`
  ).join('');

  container.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 0.5rem; color: #1B4332;">✅ Votre menu</div>
    <div>${tagsHtml}</div>
  `;
}

// Filter and display unsafe meals with warning
function renderMealWithSafetyCheck(meal, mealType, dayDate) {
  if (!meal) return null;

  const isSafe = meal.isSafe !== undefined ? meal.isSafe : true;
  
  if (!isSafe) {
    // Meal is not safe for current preferences - show warning
    const row = document.createElement('div');
    row.className = `meal-row ${mealType} unsafe-meal`;
    row.style.cssText = `opacity: 0.5; background: #fef2f2; border-left: 4px solid #dc2626;`;
    
    row.innerHTML = `
      <div class="meal-header">
        <span class="meal-icon">⚠️</span>
        <span class="meal-name">${meal.name}</span>
      </div>
      <div class="meal-badges">
        <span style="font-size: 0.75rem; color: #dc2626; font-weight: 600;">Non recommandé</span>
      </div>
    `;
    
    return row;
  } else {
    // Meal is safe - render normally (existing code)
    return null; // Return null to render using original logic
  }
}

