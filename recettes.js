/* ============================================================
   RECETTES.JS — Générateur de recettes IA
   Appelle la Netlify Function generate-recipe
   ============================================================ */

'use strict';

// ── État ────────────────────────────────────────────────────
const state = {
  mode: 'classique',    // 'classique' | 'thermomix'
  profil: 'famille'     // 'famille' | 'couple' | 'solo'
};

// ── Vérification de session Supabase ─────────────────────────
// Supabase stocke la session dans localStorage sous la clé sb-[ref]-auth-token
function isLoggedIn() {
  try {
    const raw = localStorage.getItem('sb-pozhsrnsezklfyqjoues-auth-token');
    const session = JSON.parse(raw);
    return !!(session && session.access_token);
  } catch {
    return false;
  }
}

// Affiche un message si l'utilisateur n'est pas connecté — calme, pas alarmant
function checkAuthAndShowBanner() {
  if (isLoggedIn()) return;
  const form = document.querySelector('.recettes-form');
  if (!form) return;
  const banner = document.createElement('div');
  banner.id = 'auth-banner';
  banner.className = 'auth-banner';
  banner.innerHTML = `
    <strong>Connecte-toi pour générer une recette</strong>
    <span>La génération est gratuite et illimitée.</span>
    <a href="index.html">→ Se connecter</a>
  `;
  form.insertBefore(banner, form.firstChild);
}

checkAuthAndShowBanner();

// ── Compteur de caractères ──────────────────────────────────
const textarea = document.getElementById('ingredients');
const counter = document.getElementById('textarea-count');
if (textarea && counter) {
  const updateCount = () => {
    counter.textContent = `${textarea.value.length} / 500`;
  };
  textarea.addEventListener('input', updateCount);
  updateCount();
}

// ── Chip toggles ────────────────────────────────────────────
document.querySelectorAll('.chip--toggle').forEach(chip => {
  chip.addEventListener('click', () => {
    const group = chip.dataset.group;
    const value = chip.dataset.value;

    document.querySelectorAll(`.chip--toggle[data-group="${group}"]`).forEach(c => {
      c.classList.remove('is-active');
      c.setAttribute('aria-pressed', 'false');
    });

    chip.classList.add('is-active');
    chip.setAttribute('aria-pressed', 'true');

    state[group] = value;
  });
});

// ── Génération ──────────────────────────────────────────────
const btnGenerate = document.getElementById('btn-generate');
const btnRetry = document.getElementById('btn-retry');
const btnErrorRetry = document.getElementById('btn-error-retry');

if (btnGenerate) btnGenerate.addEventListener('click', generateRecipe);
if (btnRetry) btnRetry.addEventListener('click', generateRecipe);
if (btnErrorRetry) btnErrorRetry.addEventListener('click', generateRecipe);

async function generateRecipe() {
  if (!isLoggedIn()) {
    showToast('Connecte-toi pour générer une recette');
    return;
  }

  const ingredients = document.getElementById('ingredients').value.trim();

  if (!ingredients) {
    document.getElementById('ingredients').focus();
    showToast('Décrivez ce que vous avez envie de cuisiner');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/.netlify/functions/generate-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients,
        mode: state.mode,
        profile: state.profil
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur serveur (${response.status})`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    displayRecipe(data.recipe);

  } catch (error) {
    displayError(error.message);
  } finally {
    setLoading(false);
  }
}

// ── Affichage ────────────────────────────────────────────────
function setLoading(isLoading) {
  const btn = document.getElementById('btn-generate');
  btn.disabled = isLoading;

  showState(isLoading ? 'loading' : null);
}

function showState(name) {
  const states = {
    empty: document.getElementById('result-empty'),
    loading: document.getElementById('result-loading'),
    error: document.getElementById('result-error'),
    recipe: document.getElementById('result-recipe')
  };

  Object.entries(states).forEach(([key, el]) => {
    if (!el) return;
    el.hidden = (name !== null && key !== name);
  });

  // Si name === null, on rend l'empty visible par défaut sauf si une recette est déjà là
  if (name === null) {
    const recipeShown = states.recipe && !states.recipe.hidden;
    if (states.empty) states.empty.hidden = recipeShown;
  }
}

function displayRecipe(markdown) {
  const recipeEl = document.getElementById('result-recipe');
  document.getElementById('recipe-content').innerHTML = markdownToHtml(markdown);
  showState('recipe');
  recipeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayError(msg) {
  const errEl = document.getElementById('result-error');
  const errText = document.getElementById('result-error-text');
  if (errText && msg) {
    errText.textContent = `Réessayez avec une description un peu différente. (${msg})`;
  }
  showState('error');
}

// ── Markdown → HTML ──────────────────────────────────────────
function markdownToHtml(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/<strong>💡 Astuce[^<]*<\/strong>\s*:?\s*(.+)/g,
      '<div class="astuce"><strong>Astuce</strong> — $1</div>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[^<][\s\S]*?<\/li>\n?)+(?![\s\S]*<ul>)/g, '<ol>$&</ol>')
    .replace(/\n{2,}/g, '<br>')
    .trim();
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
}
