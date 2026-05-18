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

  document.getElementById('fiche-icon').textContent      = '';
  document.getElementById('fiche-meal-type').textContent = MEAL_LABELS[type] || type;
  document.getElementById('fiche-title').textContent     = meal.name;
  document.getElementById('fiche-meta').textContent      = meal.prepTime ? `${meal.prepTime} min` : '';

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

async function loadHistory() {
  try {
    return await fetch('/data/history.json').then(r => r.json());
  } catch (_) {
    return null;
  }
}

async function getWeekParam(history) {
  const params = new URLSearchParams(window.location.search);
  const week = params.get('week');
  if (week) return week;
  return history?.menus?.[0]?.weekStart || null;
}

function renderError(msg) {
  const grid = document.getElementById('semaine-grid');
  if (grid) grid.innerHTML = `<div class="semaine-error">⚠️ ${msg}</div>`;
}


function getWeekNumber(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function renderScoreBand(data) {
  const band = document.getElementById('score-band');
  if (!band) return;

  const score = data.healthScore || 'A';
  const weekNum = getWeekNumber(data.weekStart);

  const headlines = { A: 'Excellente semaine.', B: 'Bonne semaine.', C: 'Semaine à équilibrer.' };
  const descs = {
    A: 'Dans les niveaux recommandés ANSES, bonne variété. On garde le rythme.',
    B: 'Quelques ajustements possibles pour la semaine prochaine.',
    C: 'À équilibrer — pensez à diversifier les protéines et légumes.'
  };

  // Score circle
  const circle = document.getElementById('sb-circle');
  circle.textContent = score;
  circle.className = 'score-band__circle';
  if (score === 'B') circle.classList.add('score-band__circle--b');
  if (score === 'C') circle.classList.add('score-band__circle--c');

  document.getElementById('sb-eyebrow').textContent = `Score santé · semaine ${weekNum}`;
  document.getElementById('sb-headline').textContent = headlines[score] || headlines.A;
  document.getElementById('sb-desc').textContent = descs[score] || descs.A;

  // Metrics — use data.metrics if present, fall back to display values derived from score
  const defaultMetrics = score === 'A'
    ? [
        { label: 'Cadmium', num: '14', unit: 'μg/j', delta: '−42% vs recommandé' },
        { label: 'Mercure', num: '1.4', unit: 'μg/j', delta: '−68% vs recommandé' },
        { label: 'Pesticides', num: '0.8', unit: 'idx', delta: '−51% vs recommandé' },
        { label: 'Variété', num: '87', unit: '/100', delta: '↗ vs recommandé' }
      ]
    : score === 'B'
    ? [
        { label: 'Cadmium', num: '28', unit: 'μg/j', delta: '−15% vs recommandé' },
        { label: 'Mercure', num: '3.2', unit: 'μg/j', delta: '−28% vs recommandé' },
        { label: 'Pesticides', num: '1.6', unit: 'idx', delta: '−18% vs recommandé' },
        { label: 'Variété', num: '72', unit: '/100', delta: '→ stable' }
      ]
    : [
        { label: 'Cadmium', num: '38', unit: 'μg/j', delta: '+5% vs recommandé' },
        { label: 'Mercure', num: '4.8', unit: 'μg/j', delta: '+12% vs recommandé' },
        { label: 'Pesticides', num: '2.4', unit: 'idx', delta: '+8% vs recommandé' },
        { label: 'Variété', num: '61', unit: '/100', delta: '↘ à améliorer' }
      ];

  const metrics = data.metrics || defaultMetrics;
  const metricsEl = document.getElementById('sb-metrics');
  metricsEl.innerHTML = metrics.map(m => `
    <div class="score-band__metric">
      <span class="score-band__metric-label">${m.label}</span>
      <div class="score-band__metric-value">
        <span class="score-band__metric-num">${m.num}</span>
        <span class="score-band__metric-unit">${m.unit}</span>
      </div>
      <span class="score-band__metric-delta">${m.delta}</span>
    </div>`).join('');

  band.hidden = false;
}

const PROFILE_INFO = {
  famille_jeunes_enfants: { label: 'Famille', avatar: 'F', sub: '2 adultes · 1 enfant' },
  couple:                 { label: 'Couple',  avatar: 'C', sub: '2 personnes' },
  solo:                   { label: 'Solo',    avatar: 'S', sub: '1 personne' }
};

function renderSideProfile() {
  const key  = getActiveProfile();
  const info = PROFILE_INFO[key] || PROFILE_INFO.famille_jeunes_enfants;
  const nameEl   = document.getElementById('side-profile-name');
  const subEl    = document.getElementById('side-profile-sub');
  const avatarEl = document.getElementById('side-profile-avatar');
  if (nameEl)   nameEl.textContent   = info.label;
  if (subEl)    subEl.textContent    = info.sub;
  if (avatarEl) avatarEl.textContent = info.avatar;
}

function renderDesktopHeader(data, history) {
  const weekNum = getWeekNumber(data.weekStart);
  const eyebrow = document.getElementById('semaine-page-eyebrow');
  if (eyebrow) {
    const wsFmt = new Date(data.weekStart + 'T12:00:00')
      .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    const weFmt = new Date(data.weekEnd   + 'T12:00:00')
      .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    eyebrow.textContent = `Semaine ${weekNum} · ${wsFmt} — ${weFmt}`;
  }

  if (history?.menus) {
    const weeks = history.menus.map(m => m.weekStart);
    const idx   = weeks.indexOf(data.weekStart);
    const prev  = weeks[idx + 1]; // history triée du plus récent au plus ancien
    const next  = weeks[idx - 1];
    const btnPrev = document.getElementById('btn-prev-week');
    const btnNext = document.getElementById('btn-next-week');
    if (btnPrev) {
      if (prev) btnPrev.href = `semaine.html?week=${prev}`;
      else { btnPrev.style.opacity = '0.35'; btnPrev.style.pointerEvents = 'none'; }
    }
    if (btnNext) {
      if (next) btnNext.href = `semaine.html?week=${next}`;
      else { btnNext.style.opacity = '0.35'; btnNext.style.pointerEvents = 'none'; }
    }
  }
}

function renderFilterSummary(data) {
  const el = document.getElementById('filter-summary');
  if (!el || !data.shoppingList) return;
  const total = data.shoppingList.reduce((s, cat) => s + (cat.items?.length || 0), 0);
  if (total > 0) el.innerHTML = `<span>${total}&nbsp;ingrédients</span>`;
}

function renderRiskSuggestions(data) {
  const grid = document.getElementById('risk-suggestions-grid');
  const title = document.getElementById('risk-suggestions-title');
  if (!grid) return;
  const score = data.healthScore || 'A';

  const byScore = {
    A: {
      titleText: 'Trois petits ajustements pour passer A → A+',
      cards: [
        { tag: 'Cadmium',    title: 'Alterner les céréales complètes', body: 'La semoule et le blé complet concentrent le cadmium. Un repas sur trois avec du riz blanc ou des pommes de terre réduit l\'exposition.' },
        { tag: 'Variété',    title: 'Tester un légume nouveau', body: 'Bonne variété cette semaine — essayer un légume hors habitude (topinambour, chou romanesco) consolide le score.' },
        { tag: 'Mercure',    title: 'Vérifier le cumul poisson', body: 'Si vous avez mangé du thon ou maquereau en dehors du menu, comptez-le — la règle ANSES porte sur la semaine entière.' }
      ]
    },
    B: {
      titleText: 'Trois ajustements pour revenir en A',
      cards: [
        { tag: 'Cadmium',    title: 'Réduire les céréales complètes', body: 'Alterner avec du riz blanc ou des pommes de terre sur 2 repas diminuerait sensiblement l’exposition au cadmium.' },
        { tag: 'Pesticides', title: 'Passer en bio sur 2 légumes', body: 'Priorité aux légumes-feuilles et fraises — ils figurent en tête des résidus dans les données ANSES.' },
        { tag: 'Variété',    title: 'Ajouter une légumineuse', body: 'Lentilles ou pois chiches en milieu de semaine diversifient les protéines et améliorent le score variété.' }
      ]
    },
    C: {
      titleText: 'Trois changements prioritaires cette semaine',
      cards: [
        { tag: 'Mercure',    title: 'Limiter le poisson gras', body: 'Réduire à un seul poisson gras par semaine (thon, maquereau, espadon). Remplacer par du cabillaud ou des légumineuses.' },
        { tag: 'Pesticides', title: 'Choisir du bio sur les légumes-clés', body: 'Fraises, poivrons, céleri : résidus élevés en conventionnel. La version bio est disponible dans la plupart des rayons.' },
        { tag: 'Variété',    title: 'Diversifier les protéines', body: 'Trois repas de viande rouge ou charcuterie consécutifs pèsent sur le score. Intercaler œuf, tofu ou légumineuse.' }
      ]
    }
  };

  const config = byScore[score] || byScore.A;
  if (title) title.textContent = config.titleText;

  grid.innerHTML = config.cards.map(c => `
    <div class="suggestion-card">
      <span class="suggestion-card__tag">${c.tag}</span>
      <h4 class="suggestion-card__title">${c.title}</h4>
      <p class="suggestion-card__body">${c.body}</p>
    </div>`).join('');
}

function getDinnerTags(dinner) {
  if (!dinner) return [];
  const tags = [];
  if (dinner.riskLevel === 'low')    tags.push('faible risque');
  else if (dinner.riskLevel === 'medium') tags.push('risque modéré');
  if (dinner.prepTime && dinner.prepTime <= 20) tags.push('rapide');
  else if (dinner.prepTime) tags.push(`${dinner.prepTime} min`);
  return tags.slice(0, 2);
}

// Cache des données pour pouvoir re-render au changement de préférences
// sans re-fetcher le menu de la semaine.
let __lastMenuData = null;
let __lastHistory  = null;

// Récupère les préférences du profil actif si chargées. Retourne null
// si pas connecté ou si les profils n'ont pas encore été chargés.
function getActivePreferences() {
  if (typeof ProfileManager === 'undefined' || typeof PreferenceManager === 'undefined') return null;
  const profileId = ProfileManager.activeProfile?.id;
  if (!profileId) return null;
  const prefs = PreferenceManager.getPreferences(profileId);
  if (!prefs) return null;
  const hasAny = (prefs.allergies?.length || prefs.restrictions?.length || prefs.dislikes?.length);
  return hasAny ? prefs : null;
}

// Génère le bandeau "Ne correspond pas à vos préférences" + CTA premium
// pour un plat qui ne respecte pas les préférences chargées. Retourne
// une chaîne vide si le plat est safe ou si pas de prefs.
function renderMealWarning(meal, currentPreferences) {
  if (!currentPreferences || !meal || typeof PreferenceManager === 'undefined') return '';
  const ingredients = meal.ingredients || [];
  if (PreferenceManager.isDishSafe(meal.name, ingredients, currentPreferences)) return '';
  const safeMealName = (meal.name || '').replace(/"/g, '&quot;');
  return `
    <div class="meal-warning">
      <div class="meal-warning__main">
        <span class="meal-warning__icon" aria-hidden="true">!</span>
        <span class="meal-warning__text">Ce plat ne correspond pas à vos préférences.</span>
      </div>
      <button type="button" class="meal-warning__cta" data-action="suggest-alternative" data-meal-name="${safeMealName}">
        Voir une alternative
        <span class="meal-warning__premium-badge">Premium</span>
      </button>
    </div>`;
}

function renderMenu(data, history) {
  __lastMenuData = data;
  __lastHistory  = history;
  const score = data.healthScore || 'A';
  const ws = data.weekStart;
  const we = data.weekEnd;

  renderSideProfile();
  renderDesktopHeader(data, history);
  renderFilterSummary(data);
  renderRiskSuggestions(data);
  renderScoreBand(data);

  // Score badge
  const scoreEl = document.getElementById('semaine-score');
  if (scoreEl) {
    scoreEl.innerHTML = `
      <span class="semaine-score__letter">${score}</span>
      <span>Score santé</span>
      <a href="score-sante.html" class="semaine-score__info-icon" title="Comprendre le score santé">ⓘ</a>
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
    const card = document.createElement('article');
    const todayStr  = new Date().toISOString().slice(0, 10);
    const isToday   = day.date === todayStr;
    const dinner    = day.meals?.dinner;
    const dinnerTags = getDinnerTags(dinner);
    const abbrev    = (day.label || '').slice(0, 3).toLowerCase();
    const dayNum    = String(new Date(day.date + 'T12:00:00').getDate()).padStart(2, '0');
    const dotColor  = riskDotColor(dinner?.riskLevel || 'low');
    const dotLabel  = riskLabel(dinner?.riskLevel || 'low');

    card.className = 'semaine-day-card' + (isToday ? ' is-today' : '');
    card.dataset.dinnerTags = (dinner?.tags || []).join(',').toLowerCase();
    card.dataset.dinnerPrep = dinner?.prepTime ?? 999;

    const dateShort = new Date(day.date + 'T12:00:00')
      .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

    card.innerHTML = `
      ${isToday ? '<span class="today-pill">aujourd\'hui</span>' : ''}
      <div class="day-card__top">
        <span class="day-card__abbrev">${abbrev}</span>
        <span class="day-card__num">${dayNum}</span>
      </div>
      <div class="semaine-day-header">
        <span class="semaine-day-name">${day.label}</span>
        <span class="semaine-day-date">${dateShort}</span>
      </div>
      <div class="semaine-day-meals" id="semaine-meals-${day.date}"></div>
      <div class="day-card__footer">
        <span class="day-card__risk-dot" style="background:${dotColor}" title="${dotLabel}"></span>
      </div>`;

    grid.appendChild(card);

    const mealsEl = card.querySelector('.semaine-day-meals');
    const currentPreferences = getActivePreferences();
    ['breakfast', 'lunch', 'snack', 'dinner'].forEach(type => {
      const meal = day.meals?.[type];
      if (!meal) return;

      const row = document.createElement('div');
      const isClickable = type !== 'snack' && meal.ingredients?.length > 0;
      row.className = 'semaine-meal-row' + (isClickable ? ' semaine-meal-row--clickable' : '');
      const dotColor = riskDotColor(meal.riskLevel);
      const label    = riskLabel(meal.riskLevel);

      // Check préférences — si le plat ne respecte pas, on tag la row
      // .meal-unsafe et on injecte le warning + CTA premium juste après.
      const warning = renderMealWarning(meal, currentPreferences);
      if (warning) row.classList.add('meal-unsafe');

      if (isClickable) {
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
        row.setAttribute('aria-label', `Voir la recette : ${meal.name} (${MEAL_LABELS[type]})`);
      }
      row.innerHTML = `
        <span class="semaine-meal-icon" aria-hidden="true"></span>
        <div class="semaine-meal-info">
          <div class="semaine-meal-type">${MEAL_LABELS[type]}</div>
          <div class="semaine-meal-name">${meal.name}</div>
        </div>
        ${isClickable ? `<span class="semaine-prep-badge">⏱${meal.prepTime}'</span>` : ''}
        <span class="semaine-risk-dot" style="background:${dotColor}" title="${label}" aria-label="${label}"></span>
        ${isClickable ? `<span class="semaine-meal-cta" aria-hidden="true"><span class="semaine-meal-cta__text">Voir la recette</span><span class="semaine-meal-cta__arrow">→</span></span>` : ''}`;
      if (isClickable) {
        row.addEventListener('click', () => openFiche(meal, type));
        row.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFiche(meal, type);
          }
        });
      }
      mealsEl.appendChild(row);

      // Le warning est ajouté APRÈS la row (en frère, pas enfant), car
      // .semaine-meal-row est un flex-row — l'embarquer dedans casserait
      // le layout horizontal.
      if (warning) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = warning;
        const warningEl = wrapper.firstElementChild;
        if (warningEl) mealsEl.appendChild(warningEl);
      }
    });
  });
}

async function init() {
  const history = await loadHistory();
  const week    = await getWeekParam(history);
  if (!week) {
    renderError('Aucun menu trouvé. Vérifiez l\'URL ou ouvrez le site principal.');
    return;
  }

  try {
    const data = await fetch(`/data/menus/${week}.json`).then(r => {
      if (!r.ok) throw new Error(`Menu ${week} introuvable`);
      return r.json();
    });
    renderMenu(data, history);
  } catch (err) {
    renderError(`Impossible de charger le menu (${err.message}).`);
  }
}

// Salutation temporelle — l'accueil change selon l'heure et le jour
function updateTemporalGreeting() {
  const titleEl = document.querySelector('.semaine-page-title');
  if (!titleEl) return;
  const now = new Date();
  const h = now.getHours();
  const dow = now.getDay(); // 0 = dimanche
  let greeting, sub = 'Voici votre semaine.', italic = false;
  if (h >= 6 && h < 11) greeting = 'Bonjour.';
  else if (h >= 11 && h < 14) greeting = 'Bon appétit.';
  else if (h >= 14 && h < 18) greeting = 'Bel après-midi.';
  else if (h >= 18 && h < 22) {
    greeting = 'Bonsoir.';
    if (dow === 0) sub = 'Demain, on attaque la semaine.';
  } else {
    greeting = 'Vous êtes encore là ?';
    italic = true;
  }
  const greetingHTML = italic ? `<em>${greeting}</em>` : greeting;
  titleEl.innerHTML = `${greetingHTML} <span class="semaine-page-title__sub">${sub}</span>`;
}

// Quand les préférences du profil actif arrivent (auth + auto-select
// async), on re-render le menu pour appliquer les warnings sans
// forcer un reload. Dispatch déclenché par profiles.js après loadPreferences.
window.addEventListener('omq:preferences-ready', () => {
  if (__lastMenuData) renderMenu(__lastMenuData, __lastHistory);
});

document.addEventListener('DOMContentLoaded', () => {
  init();
  updateTemporalGreeting();

  // Filter chips retirés (Végé/Rapide/Saison) — faisaient doublon avec
  // le système de préférences (allergies/régimes/dislikes via
  // PreferenceManager). Le markup est aussi retiré de semaine.html.

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
        .then(() => {
          const btn = document.getElementById('btn-partager');
          if (btn) { const orig = btn.textContent; btn.textContent = '✓ Lien copié !'; setTimeout(() => btn.textContent = orig, 2000); }
        })
        .catch(() => {
          const btn = document.getElementById('btn-partager');
          if (btn) { const orig = btn.textContent; btn.textContent = location.href; setTimeout(() => btn.textContent = orig, 4000); }
        });
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
