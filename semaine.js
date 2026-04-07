/* ============================================================
   SEMAINE.JS — Vue semaine partageable
   Charge le menu depuis ?week=YYYY-MM-DD ou le plus récent
   ============================================================ */

'use strict';

const MEAL_LABELS = {
  breakfast: 'Petit-déj',
  lunch:     'Déjeuner',
  snack:     'Goûter',
  dinner:    'Dîner'
};

function formatDate(s) {
  if (!s) return '';
  return new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function formatDateShort(s) {
  if (!s) return '';
  return new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

async function getWeekParam() {
  const params = new URLSearchParams(window.location.search);
  const week = params.get('week');
  if (week) return week;

  // Fall back to most recent in history
  try {
    const hist = await fetch('/data/history.json').then(r => r.json());
    return hist.menus?.[0]?.weekStart || null;
  } catch (_) {
    return null;
  }
}

function renderError(msg) {
  const grid = document.getElementById('semaine-grid');
  if (grid) grid.innerHTML = `<div class="semaine-error">⚠️ ${msg}</div>`;
}

function renderMenu(data) {
  const score = data.healthScore || 'A';
  const ws = data.weekStart;
  const we = data.weekEnd;

  // Score badge
  const scoreEl = document.getElementById('semaine-score');
  if (scoreEl) {
    scoreEl.innerHTML = `<span class="semaine-score__letter">${score}</span> Score santé`;
    scoreEl.setAttribute('aria-label', `Score santé ${score}`);
  }

  // Date range
  const dateEl = document.getElementById('semaine-date');
  if (dateEl) {
    dateEl.textContent = `Semaine du ${formatDate(ws)} au ${formatDate(we)}`;
  }

  // Day cards
  const grid = document.getElementById('semaine-grid');
  if (!grid) return;
  grid.innerHTML = '';

  (data.days || []).forEach(day => {
    const card = document.createElement('div');
    card.className = 'semaine-day-card';

    const dateShort = new Date(day.date + 'T12:00:00')
      .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

    card.innerHTML = `
      <div class="semaine-day-header">
        <span class="semaine-day-name">${day.label}</span>
        <span class="semaine-day-date">${dateShort}</span>
      </div>
      <div class="semaine-day-meals" id="semaine-meals-${day.date}"></div>`;

    grid.appendChild(card);

    const mealsEl = card.querySelector('.semaine-day-meals');
    ['breakfast', 'lunch', 'snack', 'dinner'].forEach(type => {
      const meal = day.meals?.[type];
      if (!meal) return;

      const row = document.createElement('div');
      row.className = 'semaine-meal-row';
      row.innerHTML = `
        <span class="semaine-meal-icon">${meal.icon || '🍽'}</span>
        <div class="semaine-meal-info">
          <div class="semaine-meal-type">${MEAL_LABELS[type]}</div>
          <div class="semaine-meal-name">${meal.name}</div>
        </div>`;
      mealsEl.appendChild(row);
    });
  });
}

async function init() {
  const week = await getWeekParam();
  if (!week) {
    renderError('Aucun menu trouvé. Vérifiez l\'URL ou ouvrez le site principal.');
    return;
  }

  try {
    const data = await fetch(`/data/menus/${week}.json`).then(r => {
      if (!r.ok) throw new Error(`Menu ${week} introuvable`);
      return r.json();
    });
    renderMenu(data);
  } catch (err) {
    renderError(`Impossible de charger le menu (${err.message}).`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();

  document.getElementById('btn-partager')?.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({ url: location.href, title: 'Menu de la semaine — On mange quoi ?' });
    } else {
      navigator.clipboard
        .writeText(location.href)
        .then(() => alert('Lien copié dans le presse-papier !'))
        .catch(() => alert('Lien : ' + location.href));
    }
  });
});
