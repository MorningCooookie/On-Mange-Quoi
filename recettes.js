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

// ── Pill toggles ────────────────────────────────────────────
document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const group = pill.dataset.group;
    const value = pill.dataset.value;

    // Désactiver tous les pills du groupe
    document.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => {
      p.classList.remove('pill--active');
      p.setAttribute('aria-pressed', 'false');
    });

    // Activer celui cliqué
    pill.classList.add('pill--active');
    pill.setAttribute('aria-pressed', 'true');

    // Mettre à jour l'état
    state[group] = value;
  });
});

// ── Génération ──────────────────────────────────────────────
document.getElementById('btn-generate').addEventListener('click', generateRecipe);
document.getElementById('btn-retry').addEventListener('click', generateRecipe);

async function generateRecipe() {
  const ingredients = document.getElementById('ingredients').value.trim();

  if (!ingredients) {
    document.getElementById('ingredients').focus();
    showToast('Dis-moi ce que t\'as dans le frigo 🥕');
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
        profile: state.profil   // clé "profile" = ce que lit la Netlify Function
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur serveur (${response.status})`);
    }

    const data = await response.json();

    if (data.error) throw new Error(data.error);

    displayRecipe(data.recipe);

  } catch (error) {
    displayError('Oups : ' + error.message);
  } finally {
    setLoading(false);
  }
}

// ── Affichage ────────────────────────────────────────────────
function setLoading(isLoading) {
  const btn = document.getElementById('btn-generate');
  const zone = document.getElementById('result-zone');
  const loading = document.getElementById('result-loading');
  const error = document.getElementById('result-error');
  const recipe = document.getElementById('result-recipe');

  btn.disabled = isLoading;
  zone.hidden = false;

  if (isLoading) {
    loading.hidden = false;
    error.hidden = true;
    recipe.hidden = true;
  } else {
    loading.hidden = true;
  }
}

function displayRecipe(markdown) {
  const el = document.getElementById('result-recipe');
  document.getElementById('recipe-content').innerHTML = markdownToHtml(markdown);
  el.hidden = false;
  document.getElementById('result-error').hidden = true;
  // Scroll doux vers la recette
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayError(msg) {
  const el = document.getElementById('result-error');
  document.getElementById('result-error-text').textContent = msg;
  el.hidden = false;
  document.getElementById('result-recipe').hidden = true;
}

// ── Markdown → HTML ──────────────────────────────────────────
// Convertit le format Claude (markdown simplifié) en HTML lisible
function markdownToHtml(text) {
  return text
    // Titres ### 🍽️ ...
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // Gras **...** (doit être traité AVANT l'italique)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    // Italique *...*
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    // Astuce 💡 → bloc coloré
    .replace(/<strong>💡 Astuce[^<]*<\/strong>\s*:?\s*(.+)/g,
      '<div class="astuce">💡 <strong>Astuce</strong> : $1</div>')
    // Listes à puces
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Listes numérotées
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[^<][\s\S]*?<\/li>\n?)+(?![\s\S]*<ul>)/g, '<ol>$&</ol>')
    // Nettoyage sauts de ligne
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
