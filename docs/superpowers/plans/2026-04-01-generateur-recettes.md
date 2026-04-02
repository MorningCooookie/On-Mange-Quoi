# Générateur de recettes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un générateur de recettes IA (avec/sans Thermomix) à TableSaine, respectant toutes les contraintes santé du site, accessible via un bouton dédié dans la navigation.

**Architecture:** Netlify Function en proxy sécurisé vers l'API Claude (clé jamais exposée côté client). Page `recettes.html` autonome avec header/footer identiques à `index.html`. JS et CSS dans des fichiers dédiés (`recettes.js`, `recettes.css`) selon le pattern existant (`semaine.js`, `semaine.css`).

**Tech Stack:** Vanilla HTML/CSS/JS · Netlify Functions · @anthropic-ai/sdk · claude-haiku-4-5-20251001

---

## Fichiers

| Fichier | Action |
|---|---|
| `netlify.toml` | Créer — déclare le dossier functions |
| `package.json` | Créer — dépendance `@anthropic-ai/sdk` |
| `netlify/functions/generate-recipe.js` | Créer — proxy API Claude |
| `recettes.html` | Créer — page générateur |
| `recettes.css` | Créer — styles page recettes |
| `recettes.js` | Créer — logique frontend |
| `index.html` | Modifier — liens nav desktop + mobile |

---

## Task 1 : Infrastructure Netlify

**Files:**
- Create: `netlify.toml`
- Create: `package.json`

- [ ] **Step 1 : Créer `netlify.toml`**

```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

- [ ] **Step 2 : Créer `package.json`**

```json
{
  "name": "table-saine",
  "version": "1.0.0",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0"
  }
}
```

- [ ] **Step 3 : Installer la dépendance**

```bash
cd "/Users/kevinjordan/Documents/01_PROJECTS/Cowork OS/TableSaine"
npm install
```

Résultat attendu : dossier `node_modules/` créé, `package-lock.json` généré.

- [ ] **Step 4 : Vérifier `.gitignore` (node_modules doit être ignoré)**

Ouvrir `.gitignore`. Si `node_modules` n'y figure pas, l'ajouter :

```
node_modules/
.netlify/
```

- [ ] **Step 5 : Commit**

```bash
cd "/Users/kevinjordan/Documents/01_PROJECTS/Cowork OS/TableSaine"
git add netlify.toml package.json package-lock.json .gitignore
git commit -m "feat: add Netlify Functions infrastructure"
```

---

## Task 2 : Netlify Function `generate-recipe.js`

**Files:**
- Create: `netlify/functions/generate-recipe.js`

- [ ] **Step 1 : Créer le dossier**

```bash
mkdir -p "/Users/kevinjordan/Documents/01_PROJECTS/Cowork OS/TableSaine/netlify/functions"
```

- [ ] **Step 2 : Créer `netlify/functions/generate-recipe.js`**

```js
// Netlify Function : proxy sécurisé vers l'API Claude
// Clé API dans les variables d'env Netlify — jamais dans le code

const Anthropic = require("@anthropic-ai/sdk");

// Contraintes santé communes aux deux modes
const HEALTH_CONSTRAINTS = `
CONTRAINTES SANTÉ (toujours actives) :
- Anti-cadmium : limiter pommes de terre (max 3×/semaine), pain blanc, céréales industrielles
- Anti-mercure : pas de thon ni espadon, saumon max 2×/mois — préférer cabillaud, lieu noir, maquereau
- Pesticides : fruits bio recommandés pour fraises, raisins, pêches, pommes
- Élevage : préférer volailles Label Rouge ou plein air, œufs code 0 ou 1
- Privilégier légumineuses (lentilles, pois chiches, haricots), poissons blancs, légumes colorés`;

// Profils familiaux
const PROFILES = {
  famille: "Famille Jordan O'Shea : Kevin (adulte), Mina (adulte), enfant 6 ans, enfant 3 ans → 4 portions. Sans porc (pas de lardons, chorizo, jambon de charcuterie industrielle). Pas épicé (enfants) — paprika doux, cumin, curcuma OK, pas de piment ni curry fort.",
  couple: "Couple adulte : 2 portions. Sans porc. Peut être légèrement relevé mais rester accessible.",
  solo: "1 personne adulte : 1 portion. Sans porc."
};

// Prompt Thermomix
function buildThermomixPrompt(profile) {
  return `Tu es un assistant culinaire Thermomix (TM5 ou TM6) pour la famille.

PROFIL : ${PROFILES[profile] || PROFILES.famille}
${HEALTH_CONSTRAINTS}

INSTRUCTIONS :
- Génère directement la recette complète sans poser de questions
- Cuisson max 45 minutes
- Chaque étape Thermomix mentionne : température (°C), vitesse, durée
- Utilise les techniques : Varoma, sens inverse, Turbo quand approprié

FORMAT EXACT :

### 🍽️ [Nom du plat]
*Pour X personnes · Y min · Thermomix*

**Ingrédients**
- [quantité] [ingrédient]

**Préparation**
1. [action] → *[température]°C / vitesse [X] / [durée]*

**💡 Astuce famille** : [conseil adapté]`;
}

// Prompt cuisine classique
function buildClassicPrompt(profile) {
  return `Tu es un assistant culinaire pour la famille.

PROFIL : ${PROFILES[profile] || PROFILES.famille}
${HEALTH_CONSTRAINTS}

INSTRUCTIONS :
- Génère directement la recette complète sans poser de questions
- Cuisson max 45 minutes
- Techniques standards (poêle, casserole, four, vapeur)

FORMAT EXACT :

### 🍽️ [Nom du plat]
*Pour X personnes · Y min · Cuisine classique*

**Ingrédients**
- [quantité] [ingrédient]

**Préparation**
1. [action avec ustensile et durée]

**💡 Astuce famille** : [conseil adapté]`;
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let ingredients, mode, profile;
  try {
    const body = JSON.parse(event.body);
    ingredients = body.ingredients;
    mode = body.mode || "classique";       // "thermomix" ou "classique"
    profile = body.profile || "famille";   // "famille", "couple", "solo"
  } catch {
    return { statusCode: 400, body: "Corps de requête invalide" };
  }

  if (!ingredients || ingredients.trim().length === 0) {
    return { statusCode: 400, body: "Ingrédients manquants" };
  }

  const systemPrompt = mode === "thermomix"
    ? buildThermomixPrompt(profile)
    : buildClassicPrompt(profile);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: `J'ai : ${ingredients}` }]
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ recipe: message.content[0].text })
    };
  } catch (error) {
    console.error("Erreur API Claude :", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur lors de la génération de la recette" })
    };
  }
};
```

- [ ] **Step 3 : Commit**

```bash
cd "/Users/kevinjordan/Documents/01_PROJECTS/Cowork OS/TableSaine"
git add netlify/functions/generate-recipe.js
git commit -m "feat: add generate-recipe Netlify Function"
```

---

## Task 3 : Page `recettes.html`

**Files:**
- Create: `recettes.html`

- [ ] **Step 1 : Créer `recettes.html`**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recettes — On mange quoi ?</title>
  <meta name="description" content="Générateur de recettes saines : anti-cadmium, anti-mercure, faibles pesticides. Avec ou sans Thermomix.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="recettes.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍳</text></svg>">
</head>
<body>

  <!-- ── Header (identique à index.html) ─────────────────── -->
  <header id="site-header">
    <div class="header-inner">
      <a class="logo" href="index.html" aria-label="On mange quoi ? — accueil">
        <svg class="logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" stroke-width="1.6"/>
          <circle cx="10" cy="10" r="5" stroke-width="1.4"/>
        </svg>
        On mange quoi ?
      </a>
      <nav class="header-nav" aria-label="Navigation principale">
        <a class="nav-link" href="index.html#menu">Menu</a>
        <a class="nav-link" href="index.html#courses">Courses</a>
        <a class="nav-link" href="index.html#historique">Historique</a>
        <a class="nav-link" href="index.html#cadmium">Veille santé</a>
        <a class="nav-link" href="fiche.html">Fiche mémo</a>
        <a class="nav-link nav-link--active" href="recettes.html" aria-current="page">🍳 Recettes</a>
      </nav>
    </div>
  </header>

  <!-- ── Contenu principal ────────────────────────────────── -->
  <main class="recettes-page" id="main">

    <div class="recettes-hero">
      <h1 class="recettes-title">🍳 Générateur de recettes</h1>
      <p class="recettes-subtitle">Une recette saine à partir de ce que t'as dans le frigo — anti-cadmium, anti-mercure, faibles pesticides.</p>
    </div>

    <div class="recettes-form-card">

      <!-- Ingrédients -->
      <div class="form-group">
        <label class="form-label" for="ingredients">Ce que j'ai dans mon frigo</label>
        <textarea
          id="ingredients"
          class="form-textarea"
          placeholder="Ex : poulet, carottes, lentilles corail, oignon…"
          rows="3"
          aria-describedby="ingredients-hint"
        ></textarea>
        <p class="form-hint" id="ingredients-hint">Liste tes ingrédients séparés par des virgules</p>
      </div>

      <!-- Toggles -->
      <div class="form-row">

        <!-- Mode cuisson -->
        <div class="form-group form-group--half">
          <span class="form-label" id="mode-label">Mode de cuisson</span>
          <div class="pill-group" role="group" aria-labelledby="mode-label">
            <button class="pill pill--active" data-group="mode" data-value="classique" aria-pressed="true">
              🍳 Cuisine classique
            </button>
            <button class="pill" data-group="mode" data-value="thermomix" aria-pressed="false">
              ⚙️ Thermomix
            </button>
          </div>
        </div>

        <!-- Profil -->
        <div class="form-group form-group--half">
          <span class="form-label" id="profil-label">Profil</span>
          <div class="pill-group" role="group" aria-labelledby="profil-label">
            <button class="pill pill--active" data-group="profil" data-value="famille" aria-pressed="true">
              👨‍👩‍👧‍👦 Famille
            </button>
            <button class="pill" data-group="profil" data-value="couple" aria-pressed="false">
              👫 Couple
            </button>
            <button class="pill" data-group="profil" data-value="solo" aria-pressed="false">
              🧑 Solo
            </button>
          </div>
        </div>

      </div>

      <!-- Bouton -->
      <button class="btn-generate" id="btn-generate">
        Générer une recette
      </button>

    </div>

    <!-- Zone résultat -->
    <div id="result-zone" hidden>

      <!-- Loading -->
      <div id="result-loading" class="result-loading" hidden aria-live="polite">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>Génération en cours…</p>
      </div>

      <!-- Erreur -->
      <div id="result-error" class="result-error" hidden role="alert">
        <p id="result-error-text"></p>
      </div>

      <!-- Recette -->
      <div id="result-recipe" class="recipe-card" hidden aria-live="polite">
        <div id="recipe-content" class="recipe-content"></div>
        <button class="btn-retry" id="btn-retry">↻ Générer une autre recette</button>
      </div>

    </div>

  </main>

  <!-- ── Footer ────────────────────────────────────────────── -->
  <footer>
    <p>🥗 <strong>On mange quoi ?</strong> · Menus familiaux sains · Données ANSES / EFSA / Générations Futures</p>
    <p style="margin-top:.3rem"><a href="index.html">← Retour au menu</a> · <a href="fiche.html">Fiche mémo</a></p>
  </footer>

  <!-- ── Barre mobile ──────────────────────────────────────── -->
  <div class="bottom-bar" aria-label="Navigation mobile">
    <nav class="bottom-nav-row" aria-label="Navigation rapide">
      <a class="bottom-nav-link nav-link" href="index.html#menu"><span class="nav-icon">📅</span>Menu</a>
      <a class="bottom-nav-link nav-link" href="index.html#courses"><span class="nav-icon">🛒</span>Courses</a>
      <a class="bottom-nav-link nav-link" href="index.html#historique"><span class="nav-icon">📚</span>Historique</a>
      <a class="bottom-nav-link" href="fiche.html"><span class="nav-icon">📄</span>Fiche</a>
      <a class="bottom-nav-link bottom-nav-link--active" href="recettes.html" aria-current="page"><span class="nav-icon">🍳</span>Recettes</a>
    </nav>
  </div>

  <div id="toast" role="status" aria-live="polite"></div>

  <script src="recettes.js"></script>
</body>
</html>
```

- [ ] **Step 2 : Commit**

```bash
cd "/Users/kevinjordan/Documents/01_PROJECTS/Cowork OS/TableSaine"
git add recettes.html
git commit -m "feat: add recettes.html page structure"
```

---

## Task 4 : Styles `recettes.css`

**Files:**
- Create: `recettes.css`

- [ ] **Step 1 : Créer `recettes.css`**

```css
/* ============================================================
   RECETTES.CSS — Générateur de recettes
   Utilise les variables CSS de styles.css
   ============================================================ */

/* ── Hero ──────────────────────────────────────────────────── */
.recettes-page {
  max-width: 740px;
  margin: 0 auto;
  padding: 2rem 1.25rem 6rem;
}

.recettes-hero {
  text-align: center;
  margin-bottom: 2rem;
}

.recettes-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--header-from);
  margin-bottom: .5rem;
}

.recettes-subtitle {
  color: var(--text-secondary);
  font-size: .95rem;
  max-width: 480px;
  margin: 0 auto;
  line-height: 1.6;
}

/* ── Formulaire ────────────────────────────────────────────── */
.recettes-form-card {
  background: var(--white);
  border-radius: var(--r-card);
  box-shadow: var(--shadow);
  padding: 1.75rem 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group--half {
  flex: 1 1 200px;
}

.form-label {
  display: block;
  font-size: .82rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: .5rem;
}

.form-textarea {
  width: 100%;
  padding: .75rem 1rem;
  border: 1.5px solid var(--border);
  border-radius: var(--r-inner);
  font-family: var(--font-body);
  font-size: .95rem;
  color: var(--text);
  background: var(--bg);
  resize: vertical;
  min-height: 80px;
  transition: border-color .15s;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--header-to);
}

.form-hint {
  font-size: .78rem;
  color: var(--text-secondary);
  margin-top: .35rem;
}

.form-row {
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
}

/* ── Pill toggles ───────────────────────────────────────────── */
.pill-group {
  display: flex;
  gap: .4rem;
  flex-wrap: wrap;
}

.pill {
  padding: .35rem .8rem;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  font-family: var(--font-body);
  font-size: .82rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background .15s, color .15s, border-color .15s;
  white-space: nowrap;
}

.pill:hover {
  border-color: var(--header-to);
  color: var(--header-from);
}

.pill--active {
  background: var(--header-from);
  border-color: var(--header-from);
  color: #fff;
}

/* ── Bouton générer ─────────────────────────────────────────── */
.btn-generate {
  width: 100%;
  margin-top: .5rem;
  padding: .85rem 1.5rem;
  background: linear-gradient(135deg, var(--header-from), var(--header-to));
  color: #fff;
  border: none;
  border-radius: var(--r-inner);
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s, transform .1s;
}

.btn-generate:hover {
  opacity: .92;
}

.btn-generate:active {
  transform: scale(.98);
}

.btn-generate:disabled {
  opacity: .55;
  cursor: not-allowed;
}

/* ── Zone résultat ──────────────────────────────────────────── */
#result-zone {
  margin-top: .5rem;
}

/* Loading */
.result-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .75rem;
  padding: 2.5rem;
  color: var(--text-secondary);
  font-size: .9rem;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--header-to);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Erreur */
.result-error {
  background: #FEE2E2;
  border: 1px solid #FECACA;
  border-radius: var(--r-inner);
  padding: 1rem 1.25rem;
  color: #991B1B;
  font-size: .9rem;
}

/* Recette */
.recipe-card {
  background: var(--white);
  border-radius: var(--r-card);
  box-shadow: var(--shadow);
  padding: 1.75rem 1.5rem;
}

.recipe-content h3 {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--header-from);
  margin-bottom: .35rem;
}

.recipe-content em {
  display: block;
  font-style: italic;
  color: var(--text-secondary);
  font-size: .88rem;
  margin-bottom: 1.1rem;
}

.recipe-content strong {
  display: block;
  font-size: .82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: var(--header-from);
  margin: 1rem 0 .45rem;
}

.recipe-content ul,
.recipe-content ol {
  padding-left: 1.3rem;
  margin-bottom: .5rem;
}

.recipe-content li {
  font-size: .92rem;
  line-height: 1.65;
  margin-bottom: .2rem;
}

.recipe-content .astuce {
  background: #D1FAE5;
  border-left: 3px solid var(--header-to);
  border-radius: 0 var(--r-inner) var(--r-inner) 0;
  padding: .6rem .9rem;
  font-size: .88rem;
  color: var(--header-from);
  margin-top: 1rem;
}

/* Bouton retenter */
.btn-retry {
  display: block;
  margin: 1.25rem auto 0;
  padding: .5rem 1.25rem;
  background: transparent;
  border: 1.5px solid var(--border);
  border-radius: 20px;
  font-family: var(--font-body);
  font-size: .85rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color .15s, color .15s;
}

.btn-retry:hover {
  border-color: var(--header-to);
  color: var(--header-from);
}

/* ── Nav active state ───────────────────────────────────────── */
.nav-link--active {
  background: rgba(255,255,255,.18) !important;
  color: #fff !important;
}

.bottom-nav-link--active {
  color: var(--header-from) !important;
  font-weight: 600;
}

/* ── Mobile ─────────────────────────────────────────────────── */
@media (max-width: 600px) {
  .recettes-page { padding: 1.5rem 1rem 7rem; }
  .recettes-title { font-size: 1.55rem; }
  .recettes-form-card { padding: 1.25rem 1rem; }
  .recipe-card { padding: 1.25rem 1rem; }
  .form-row { flex-direction: column; gap: .75rem; }
}
```

- [ ] **Step 2 : Commit**

```bash
cd "/Users/kevinjordan/Documents/01_PROJECTS/Cowork OS/TableSaine"
git add recettes.css
git commit -m "feat: add recettes.css styles"
```

---

## Task 5 : JS Frontend `recettes.js`

**Files:**
- Create: `recettes.js`

- [ ] **Step 1 : Créer `recettes.js`**

```js
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
    // Italique *...*
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    // Gras **...**
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    // Astuce famille 💡 → bloc coloré
    .replace(/<strong>💡 Astuce famille<\/strong>\s*:?\s*(.+)/g,
      '<div class="astuce">💡 <strong>Astuce famille</strong> : $1</div>')
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
```

- [ ] **Step 2 : Commit**

```bash
cd "/Users/kevinjordan/Documents/01_PROJECTS/Cowork OS/TableSaine"
git add recettes.js
git commit -m "feat: add recettes.js frontend logic"
```

---

## Task 6 : Mise à jour `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1 : Ajouter le lien dans la nav desktop**

Dans `index.html`, trouver le bloc `<nav class="header-nav">` (ligne ~35) et ajouter le lien Recettes **après** le lien Fiche mémo :

```html
        <a class="nav-link" href="fiche.html">Fiche mémo</a>
        <a class="nav-link" href="recettes.html">🍳 Recettes</a>
```

- [ ] **Step 2 : Ajouter le lien dans la barre mobile**

Dans `index.html`, trouver `<nav class="bottom-nav-row">` (ligne ~246) et ajouter le lien Recettes **après** le lien Fiche :

```html
      <a class="bottom-nav-link" href="fiche.html"><span class="nav-icon">📄</span>Fiche</a>
      <a class="bottom-nav-link" href="recettes.html"><span class="nav-icon">🍳</span>Recettes</a>
```

- [ ] **Step 3 : Commit**

```bash
cd "/Users/kevinjordan/Documents/01_PROJECTS/Cowork OS/TableSaine"
git add index.html
git commit -m "feat: add Recettes link to navigation"
```

---

## Task 7 : Vérification manuelle

- [ ] **Step 1 : Lancer `netlify dev`**

```bash
cd "/Users/kevinjordan/Documents/01_PROJECTS/Cowork OS/TableSaine"
netlify dev
```

Résultat attendu : serveur local sur `http://localhost:8888`

- [ ] **Step 2 : Vérifier la navigation**

Ouvrir `http://localhost:8888`. Vérifier :
- Le lien "🍳 Recettes" apparaît dans le nav desktop
- Le lien "🍳 Recettes" apparaît dans la barre mobile
- Le clic amène sur `recettes.html`

- [ ] **Step 3 : Tester mode Classique**

Sur `recettes.html` :
1. Saisir "poulet, carottes, lentilles corail"
2. Mode : Cuisine classique · Profil : Famille
3. Cliquer "Générer une recette"
4. Vérifier : spinner → recette affichée avec titre, ingrédients, étapes, astuce famille

- [ ] **Step 4 : Tester mode Thermomix**

1. Cliquer le pill "Thermomix"
2. Cliquer "↻ Générer une autre recette"
3. Vérifier : les étapes mentionnent température °C / vitesse / durée

- [ ] **Step 5 : Tester les profils Couple et Solo**

1. Passer au profil "Couple" → vérifier les portions dans la recette (2 personnes)
2. Passer au profil "Solo" → vérifier (1 personne)

- [ ] **Step 6 : Vérifier les contraintes santé**

La recette ne doit pas contenir de porc, ne doit pas être épicée, et ne doit pas suggérer de thon. Si l'IA viole une contrainte, le system prompt est à ajuster dans `generate-recipe.js`.

- [ ] **Step 7 : Commit final**

```bash
cd "/Users/kevinjordan/Documents/01_PROJECTS/Cowork OS/TableSaine"
git add .
git commit -m "feat: recipe generator complete — recettes.html + Netlify Function"
```

---

## Note déploiement

Avant de déployer sur Netlify, ajouter la variable d'environnement dans le dashboard :
- Site : **table-saine** (ou le nom du site Netlify)
- Variable : `ANTHROPIC_API_KEY`
- Valeur : la même clé API que le projet Thermomix

`Site settings → Environment variables → Add variable`
