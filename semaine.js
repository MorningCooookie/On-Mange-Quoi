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

/* ── Fiche technique ─────────────────────────────────────── */

const PROFILES = {
  famille_jeunes_enfants: { label: 'Famille', mult: 1.0 },
  couple:                 { label: 'Couple',  mult: 0.55 },
  solo:                   { label: 'Solo',    mult: 0.3 }
};

const ficheState = { meal: null, type: null };

function getActiveProfile() {
  const saved = localStorage.getItem('omq_profile');
  return (saved && PROFILES[saved]) ? saved : 'famille_jeunes_enfants';
}

function formatQty(qty, unit, mult) {
  const v = qty * mult;
  if (unit === 'g') {
    if (v < 100) return Math.max(5, Math.round(v / 5) * 5) + ' g';
    return Math.round(v / 10) * 10 + ' g';
  }
  if (unit === 'ml') {
    if (v < 100) return Math.max(10, Math.round(v / 10) * 10) + ' ml';
    return Math.round(v / 25) * 25 + ' ml';
  }
  if (unit === 'cs' || unit === 'cc') {
    const r = Math.round(Math.max(0.5, v) * 2) / 2;
    return r + '\u00a0' + unit;
  }
  // Unités discrètes (pièce, botte, bouquet, tranche, sachet, gousse, boîte…)
  return Math.max(1, Math.round(v)) + '\u00a0' + unit;
}

function renderIngredients(meal, profileKey) {
  const mult = PROFILES[profileKey].mult;
  const el   = document.getElementById('fiche-ingredients');
  if (!el) return;
  el.innerHTML = (meal.ingredients || []).map(ing => `
    <li class="fiche-ingredient">
      <span class="fiche-ingredient-name">${ing.name}</span>
      <span class="fiche-ingredient-qty">${formatQty(ing.qty, ing.unit, mult)}</span>
    </li>`).join('');
}

function openFiche(meal, type) {
  ficheState.meal = meal;
  ficheState.type = type;

  const profileKey = getActiveProfile();

  document.getElementById('fiche-icon').textContent      = meal.icon || '🍽';
  document.getElementById('fiche-meal-type').textContent = MEAL_LABELS[type] || type;
  document.getElementById('fiche-title').textContent     = meal.name;
  document.getElementById('fiche-meta').textContent      = `⏱ ${meal.prepTime} min`;

  document.querySelectorAll('.fiche-profile-btn').forEach(btn =>
    btn.classList.toggle('is-active', btn.dataset.profile === profileKey)
  );

  renderIngredients(meal, profileKey);

  document.getElementById('fiche-steps').innerHTML =
    (meal.prepSteps || []).map(s => `<li class="fiche-step">${s}</li>`).join('');

  const noteEl = document.getElementById('fiche-note');
  noteEl.textContent = meal.note || '';

  document.getElementById('fiche-overlay').classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeFiche() {
  document.getElementById('fiche-overlay').classList.remove('is-open');
  document.body.style.overflow = '';
}

function riskDotColor(level) {
  return { low: 'var(--risk-low)', medium: 'var(--risk-medium)', high: 'var(--risk-high)' }[level] || 'var(--risk-low)';
}

function riskLabel(level) {
  if (!level || level === 'low') return 'Risque faible';
  return level === 'medium' ? 'Risque modéré' : 'Risque élevé';
}

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
    scoreEl.innerHTML = `
      <span class="semaine-score__letter">${score}</span>
      <span>Score santé</span>
      <a href="about.html" class="semaine-score__info-icon" title="Comprendre le score santé">ⓘ</a>
    `;
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
      const isClickable = type !== 'snack' && meal.ingredients?.length > 0;
      row.className = 'semaine-meal-row' + (isClickable ? ' semaine-meal-row--clickable' : '');
      const dotColor = riskDotColor(meal.riskLevel);
      const label    = riskLabel(meal.riskLevel);
      row.innerHTML = `
        <span class="semaine-meal-icon">${meal.icon || '🍽'}</span>
        <div class="semaine-meal-info">
          <div class="semaine-meal-type">${MEAL_LABELS[type]}</div>
          <div class="semaine-meal-name">${meal.name}</div>
        </div>
        ${isClickable ? `<span class="semaine-prep-badge">⏱${meal.prepTime}'</span>` : ''}
        <span class="semaine-risk-dot" style="background:${dotColor}" title="${label}" aria-label="${label}"></span>`;
      if (isClickable) row.addEventListener('click', () => openFiche(meal, type));
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

  // Fiche technique — fermeture
  document.getElementById('fiche-close')?.addEventListener('click', closeFiche);
  document.getElementById('fiche-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'fiche-overlay') closeFiche();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFiche(); });

  // Fiche technique — sélecteur de profil
  document.querySelectorAll('.fiche-profile-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fiche-profile-btn').forEach(b =>
        b.classList.toggle('is-active', b === btn)
      );
      if (ficheState.meal) renderIngredients(ficheState.meal, btn.dataset.profile);
    });
  });

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

  // ── Inscription newsletter ──────────────────────────────────
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('newsletter-email');
      const email = emailInput.value.trim();
      const btn = document.getElementById('newsletter-submit');

      btn.disabled = true;
      btn.textContent = 'Envoi…';

      try {
        const res = await fetch('/.netlify/functions/newsletter-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          emailInput.value = '';
          btn.textContent = "S'abonner →";
          btn.disabled = false;
          // Message de confirmation qui disparaît après 2 secondes
          const msg = document.createElement('p');
          msg.textContent = "✅ C'est noté — à lundi !";
          msg.style.cssText = 'color:#fff;font-size:.82rem;font-weight:600;margin:.5rem 0 0;opacity:1;transition:opacity 1s;';
          newsletterForm.after(msg);
          setTimeout(() => { msg.style.opacity = '0'; }, 1500);
          setTimeout(() => { msg.remove(); }, 2500);
        } else {
          btn.disabled = false;
          btn.textContent = "S'abonner →";
        }
      } catch {
        btn.disabled = false;
        btn.textContent = "S'abonner →";
      }
    });
  }
});
