/* ============================================================
   TABLE SAINE — app.js
   Site statique, aucune dépendance externe
   ============================================================ */

'use strict';

// ── État global ──────────────────────────────────────────────
const state = {
  config: null,
  menuData: null,
  historyData: null,
  currentProfile: localStorage.getItem('ts_profile') || 'famille_jeunes_enfants',
  currentStore: localStorage.getItem('ts_store') || 'discount',
  checkedItems: JSON.parse(localStorage.getItem('ts_checked') || '{}'),
  isViewingCurrentMenu: true,
};

// ── Utilitaires ──────────────────────────────────────────────

function fmt(value) {
  return value.toFixed(2).replace('.', ',') + ' €';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Chargement des données ───────────────────────────────────

async function fetchJSON(path) {
  // Support fichier local (file://) et serveur HTTP
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Impossible de charger ${path}`);
  return response.json();
}

async function loadData() {
  try {
    [state.config, state.historyData] = await Promise.all([
      fetchJSON('data/config.json'),
      fetchJSON('data/history.json'),
    ]);

    // Charge le menu le plus récent (premier de la liste)
    const latestMenu = state.historyData.menus[0];
    state.menuData = await fetchJSON(latestMenu.file);

    render();
  } catch (err) {
    console.error('Erreur de chargement :', err);
    document.getElementById('loading').innerHTML =
      `<p style="color:#DC2626;padding:2rem;">Erreur : ${err.message}<br>
       <small>Si vous ouvrez le site en local (file://), utilisez un petit serveur HTTP :<br>
       <code>python3 -m http.server 8080</code></small></p>`;
  }
}

// ── Rendu principal ──────────────────────────────────────────

function render() {
  document.getElementById('loading').style.display = 'none';
  const appContent = document.getElementById('app-content');
  appContent.style.display = 'block';
  // Déclenche la transition fadeIn via la classe CSS
  requestAnimationFrame(() => appContent.classList.add('is-visible'));

  renderProfileSelector();
  renderStoreSelector();
  renderWeekGrid();
  renderShoppingList();
  renderBudget();
  renderHistory();
  renderCadmiumAlerts();
  renderHistoryBanner();
  setupNav();
}

// ── Sélecteur de profil ──────────────────────────────────────

function buildProfileButtons(container) {
  container.innerHTML = '';
  Object.entries(state.config.profiles).forEach(([key, profile]) => {
    const btn = document.createElement('button');
    btn.className = 'profile-btn' + (key === state.currentProfile ? ' active' : '');
    btn.innerHTML = `${profile.emoji} ${profile.label}`;
    btn.title = profile.description;
    btn.addEventListener('click', () => {
      state.currentProfile = key;
      localStorage.setItem('ts_profile', key);
      renderProfileSelector();
      renderBudget();
      renderShoppingList();
    });
    container.appendChild(btn);
  });
}

function renderProfileSelector() {
  buildProfileButtons(document.getElementById('profile-selector'));
  const bottom = document.getElementById('profile-selector-bottom');
  if (bottom) buildProfileButtons(bottom);
}

// ── Sélecteur d'enseigne ─────────────────────────────────────

function buildStoreButtons(container) {
  container.innerHTML = '';
  Object.entries(state.config.stores).forEach(([key, store]) => {
    const btn = document.createElement('button');
    btn.className = 'store-btn' + (key === state.currentStore ? ' active' : '');
    btn.textContent = store.label.split(' (')[0];
    btn.addEventListener('click', () => {
      state.currentStore = key;
      localStorage.setItem('ts_store', key);
      renderStoreSelector();
      renderBudget();
      renderShoppingList();
    });
    container.appendChild(btn);
  });
}

function renderStoreSelector() {
  buildStoreButtons(document.getElementById('store-selector'));
  const bottom = document.getElementById('store-selector-bottom');
  if (bottom) buildStoreButtons(bottom);
}

// ── Grille des 7 jours ───────────────────────────────────────

const MEAL_META = {
  breakfast: { label: 'Petit-déjeuner', class: 'breakfast' },
  lunch:     { label: 'Déjeuner',       class: 'lunch' },
  snack:     { label: 'Goûter',         class: 'snack' },
  dinner:    { label: 'Dîner',          class: 'dinner' },
};

function renderWeekGrid() {
  const grid = document.getElementById('week-grid');
  grid.innerHTML = '';

  if (!state.menuData?.days) return;

  const todayStr = new Date().toISOString().split('T')[0];

  state.menuData.days.forEach(day => {
    const isToday = day.date === todayStr;
    const card = document.createElement('div');
    card.className = 'day-card' + (isToday ? ' day-card--today' : '');

    card.innerHTML = `
      <div class="day-card-header">
        <div class="day-name">
          ${day.label}
          ${isToday ? '<span class="today-badge">Aujourd\'hui</span>' : ''}
        </div>
        <div class="day-date">${formatDate(day.date)}</div>
      </div>
    `;

    Object.entries(MEAL_META).forEach(([mealKey, meta]) => {
      const meal = day.meals[mealKey];
      if (!meal) return;

      const slot = document.createElement('div');
      slot.className = `meal-slot ${meta.class}`;
      slot.innerHTML = `
        <span class="meal-icon">${meal.icon || ''}</span>
        <div class="meal-content">
          <div class="meal-label">${meta.label}</div>
          <div class="meal-name">${meal.name}</div>
          ${meal.note ? `<div class="meal-note">${meal.note}</div>` : ''}
        </div>
        <div class="cad-dot ${meal.cadmiumRisk || 'low'}" title="Risque cadmium : ${meal.cadmiumRisk || 'low'}"></div>
      `;
      card.appendChild(slot);
    });

    grid.appendChild(card);
  });
}

// ── Liste de courses ─────────────────────────────────────────

function getItemPrice(item) {
  const storeKey = `price_${state.currentStore}`;
  return item[storeKey] || 0;
}

function getProfileMultiplier() {
  return state.config.profiles[state.currentProfile]?.multiplier || 1;
}

function calcItemTotal(item) {
  return getItemPrice(item) * getProfileMultiplier();
}

function renderShoppingList() {
  const container = document.getElementById('shopping-list');
  container.innerHTML = '';

  if (!state.menuData?.shoppingList) return;

  state.menuData.shoppingList.forEach(cat => {
    const catTotal = cat.items.reduce((sum, item) => sum + calcItemTotal(item), 0);

    const section = document.createElement('div');
    section.className = 'shopping-category';

    section.innerHTML = `
      <div class="category-header">
        <span class="category-emoji">${cat.emoji}</span>
        <span>${cat.category}</span>
        <span class="category-total">${fmt(catTotal)}</span>
      </div>
    `;

    cat.items.forEach(item => {
      const itemId = `${cat.category}__${item.name}`;
      const isChecked = !!state.checkedItems[itemId];
      const price = calcItemTotal(item);

      const row = document.createElement('div');
      row.className = 'shopping-item';
      row.innerHTML = `
        <input type="checkbox" id="${CSS.escape(itemId)}" ${isChecked ? 'checked' : ''}>
        <label for="${CSS.escape(itemId)}" class="item-name ${isChecked ? 'checked' : ''}">${item.name}</label>
        <span class="item-qty">${item.qty}</span>
        <span class="item-price">${fmt(price)}</span>
      `;

      const checkbox = row.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', () => {
        state.checkedItems[itemId] = checkbox.checked;
        localStorage.setItem('ts_checked', JSON.stringify(state.checkedItems));
        row.querySelector('.item-name').classList.toggle('checked', checkbox.checked);
      });

      section.appendChild(row);
    });

    container.appendChild(section);
  });
}

// ── Budget ───────────────────────────────────────────────────

function calcTotalForStore(storeKey) {
  if (!state.menuData?.shoppingList) return 0;
  const profileMul = getProfileMultiplier();
  return state.menuData.shoppingList.reduce((total, cat) => {
    return total + cat.items.reduce((sum, item) => {
      return sum + (item[`price_${storeKey}`] || 0) * profileMul;
    }, 0);
  }, 0);
}

function renderBudget() {
  const stores = state.config.stores;
  const persons = state.config.profiles[state.currentProfile]?.persons || 4;

  const totals = {};
  Object.keys(stores).forEach(k => { totals[k] = calcTotalForStore(k); });
  const maxTotal = Math.max(...Object.values(totals));

  // Cards
  const cardsContainer = document.getElementById('budget-store-cards');
  cardsContainer.innerHTML = '';

  Object.entries(stores).forEach(([key, store]) => {
    const card = document.createElement('div');
    card.className = `budget-store-card ${key}${key === state.currentStore ? ' active' : ''}`;
    card.innerHTML = `
      <div class="store-label">${store.label.split(' (')[0]}</div>
      <div class="store-total ${key}">${fmt(totals[key])}</div>
    `;
    cardsContainer.appendChild(card);
  });

  // Barres
  const barsContainer = document.getElementById('budget-bars');
  barsContainer.innerHTML = '';

  Object.entries(stores).forEach(([key, store]) => {
    const pct = maxTotal > 0 ? (totals[key] / maxTotal * 100) : 0;
    const row = document.createElement('div');
    row.className = 'budget-bar-row';
    row.innerHTML = `
      <span class="budget-bar-label">${store.label.split(' (')[0]}</span>
      <div class="budget-bar-track">
        <div class="budget-bar-fill ${key}" style="width: ${pct}%"></div>
      </div>
      <span class="budget-bar-value">${fmt(totals[key])}</span>
    `;
    barsContainer.appendChild(row);
  });

  // Stats
  const currentTotal = totals[state.currentStore] || 0;
  document.getElementById('budget-total').textContent = fmt(currentTotal);
  document.getElementById('budget-per-day').textContent = fmt(currentTotal / 7);
  document.getElementById('budget-per-person').textContent = fmt(currentTotal / persons);
  document.getElementById('budget-per-person-day').textContent = fmt(currentTotal / persons / 7);
}

// ── Historique ───────────────────────────────────────────────

function renderHistory() {
  const grid = document.getElementById('history-grid');
  grid.innerHTML = '';

  if (!state.historyData?.menus) return;

  state.historyData.menus.forEach((menu, index) => {
    const isCurrent = index === 0;
    const card = document.createElement('div');
    card.className = 'history-card' + (isCurrent ? ' current' : '');

    const highlightsHtml = (menu.highlights || [])
      .map(h => `<li>${h}</li>`)
      .join('');

    card.innerHTML = `
      <div class="history-card-label">
        Semaine
        ${isCurrent ? '<span class="badge-current">En cours</span>' : ''}
      </div>
      <div class="history-card-title">${menu.label}</div>
      <ul class="history-highlights">${highlightsHtml}</ul>
      <a class="history-view-btn" href="#menu">Voir ce menu →</a>
    `;

    card.querySelector('.history-view-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      if (menu.file !== state.historyData.menus[0].file) {
        try {
          state.menuData = await fetchJSON(menu.file);
          state.isViewingCurrentMenu = false;
          renderWeekGrid();
          renderShoppingList();
          renderBudget();
          renderHistoryBanner();
        } catch {}
      } else {
        state.isViewingCurrentMenu = true;
        renderHistoryBanner();
      }
      document.getElementById('menu').scrollIntoView({ behavior: 'smooth' });
    });

    grid.appendChild(card);
  });
}

// ── Actualités cadmium ───────────────────────────────────────

function renderCadmiumAlerts() {
  const container = document.getElementById('cadmium-news');
  container.innerHTML = '';

  const news = state.menuData?.cadmiumAlerts?.news || [];
  news.forEach(item => {
    const el = document.createElement('div');
    el.className = 'cadmium-news-item';
    el.textContent = item;
    container.appendChild(el);
  });
}

// ── Bandeau menu historique ──────────────────────────────────

function renderHistoryBanner() {
  const banner = document.getElementById('menu-history-banner');
  if (!banner) return;

  if (state.isViewingCurrentMenu) {
    banner.hidden = true;
    return;
  }

  const current = state.historyData?.menus[0];
  const text = document.getElementById('menu-history-banner-text');
  if (text && state.menuData) {
    const start = formatDate(state.menuData.weekStart);
    const end = formatDate(state.menuData.weekEnd);
    text.textContent = `📚 Semaine du ${start} au ${end} — `;
  }

  const link = document.getElementById('menu-history-banner-link');
  if (link) {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      if (current) {
        try {
          state.menuData = await fetchJSON(current.file);
          state.isViewingCurrentMenu = true;
          renderWeekGrid();
          renderShoppingList();
          renderBudget();
          renderHistoryBanner();
        } catch {}
      }
    }, { once: true });
  }

  banner.hidden = false;
}

// ── Copier la liste de courses ────────────────────────────────

function copyShoppingList() {
  if (!state.menuData?.shoppingList) return;

  const profile = state.config.profiles[state.currentProfile];
  const store = state.config.stores[state.currentStore];
  const lines = [`🛒 Liste de courses — Table Saine`, `Profil : ${profile.emoji} ${profile.label}`, `Enseigne : ${store.label}`, ``];

  state.menuData.shoppingList.forEach(cat => {
    lines.push(`${cat.emoji} ${cat.category}`);
    cat.items.forEach(item => {
      const price = calcItemTotal(item);
      lines.push(`  ☐ ${item.name} (${item.qty}) — ${fmt(price)}`);
    });
    lines.push('');
  });

  const currentTotal = calcTotalForStore(state.currentStore);
  lines.push(`💰 Total estimé : ${fmt(currentTotal)}`);

  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => showToast('✓ Liste copiée dans le presse-papier !'))
    .catch(() => showToast('Copie impossible — essayez avec Chrome'));
}

// ── Imprimer la liste ─────────────────────────────────────────

function printShoppingList() {
  window.print();
}

// ── Navigation active au scroll ──────────────────────────────

function setupNav() {
  const sections = ['menu', 'courses', 'historique', 'cadmium', 'apropos'];
  const navLinks = document.querySelectorAll('.nav-link');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
          });
        }
      });
    },
    { rootMargin: '-30% 0px -65% 0px', threshold: 0 }
  );

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

// ── Événements globaux ────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-copy').addEventListener('click', copyShoppingList);
  document.getElementById('btn-print').addEventListener('click', printShoppingList);
  loadData();
});
