#!/usr/bin/env node
/**
 * Génère une page HTML statique et indexable pour chaque recette substantielle
 * apparue dans les menus hebdomadaires (data/menus/*.json).
 *
 * Objectif : les recettes sont déjà produites chaque semaine par le générateur
 * de menu mais restent enfouies dans du JSON, invisibles pour Google. Ce script
 * les transforme en pages dédiées, ciblant des recherches de recettes précises
 * (nettement moins concurrentielles que "cadmium alimentation").
 *
 * Déduplication : une recette identique (même nom) qui revient sur plusieurs
 * semaines n'a qu'UNE SEULE page, mise à jour avec la date de dernière
 * apparition. Évite le contenu quasi dupliqué et concentre l'autorité SEO
 * sur une URL au lieu de la disperser.
 *
 * Filtre de substance : les repas trop simples (moins de 3 étapes ou moins de
 * 4 ingrédients, ex. "Fraises fraîches et yaourt nature") ne génèrent pas de
 * page dédiée. Une page avec trop peu de contenu nuit plus qu'elle n'aide.
 *
 * Exécution :
 *   node scripts/generate-recipe-pages.mjs
 *
 * Idempotent : peut être relancé après chaque génération de menu hebdo sans
 * dupliquer les pages existantes (écrase avec les données les plus récentes).
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MENUS_DIR = join(ROOT, 'data', 'menus');
const RECIPES_DIR = join(ROOT, 'recettes');
const SITEMAP_FILE = join(ROOT, 'sitemap.xml');

const MIN_STEPS = 3;
const MIN_INGREDIENTS = 4;

const MEAL_TYPE_LABELS = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Goûter',
  dinner: 'Dîner',
};

const RISK_COLORS = { low: '#16A34A', medium: '#CA8A04', high: '#DC2626' };
const RISK_LABELS = { low: 'Risque faible', medium: 'Risque modéré', high: 'Risque élevé' };
const RISK_TYPE_LABELS = {
  cadmium: 'cadmium',
  mercure: 'mercure',
  pesticides: 'pesticides',
  saison: 'saisonnalité',
};

/**
 * Convertit un nom de recette en slug URL-safe : minuscules, sans accents,
 * tirets simples. "Papillote de cabillaud au citron confit" ->
 * "papillote-de-cabillaud-au-citron-confit"
 */
function slugify(name) {
  return name
    .replace(/Œ/g, 'OE').replace(/œ/g, 'oe') // ligatures non gérées par NFD
    .replace(/Æ/g, 'AE').replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function formatDateFr(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${d.getUTCDate()} ${mois[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Génère une phrase d'intro variée selon le contexte (type de repas, risque,
 * saisonnalité) pour éviter un paragraphe identique sur 380+ pages.
 */
function buildIntro(recipe) {
  const { mealType, riskLevel, riskType, isSeasonal, note, prepTime } = recipe;
  const mealLabel = MEAL_TYPE_LABELS[mealType] || 'repas';
  const templates = [];

  if (isSeasonal) {
    templates.push(
      `Cette recette de ${mealLabel.toLowerCase()} met en avant des ingrédients de saison, prête en ${prepTime} minutes.`
    );
  }
  if (riskLevel === 'medium' && riskType) {
    templates.push(
      `Ce ${mealLabel.toLowerCase()} demande une petite vigilance côté ${RISK_TYPE_LABELS[riskType] || riskType} : on vous explique comment l'intégrer sans souci dans votre semaine.`
    );
  }
  templates.push(
    `Une recette de ${mealLabel.toLowerCase()} simple, pensée pour la famille, prête en ${prepTime} minutes.`
  );
  templates.push(
    `Un ${mealLabel.toLowerCase()} accessible et gourmand, testé dans les menus hebdomadaires d'On mange quoi ?, prêt en ${prepTime} minutes.`
  );

  // Sélection déterministe (pas aléatoire) basée sur le nom pour rester stable
  // entre deux régénérations du même contenu.
  const idx = (recipe.name.length + prepTime.length) % templates.length;
  let intro = templates[idx];
  if (note) intro += ` ${note}`;
  return intro;
}

function renderIngredientsTable(ingredients) {
  const rows = ingredients
    .map((ing) => `          <tr><td>${escapeHtml(ing.name)}</td><td>${escapeHtml(String(ing.qty))} ${escapeHtml(ing.unit || '')}</td></tr>`)
    .join('\n');
  return `        <table class="ingredients-table" aria-label="Liste des ingrédients">
          <thead><tr><th>Ingrédient</th><th>Quantité</th></tr></thead>
          <tbody>
${rows}
          </tbody>
        </table>`;
}

function renderSteps(steps) {
  return steps
    .map((step, i) => `          <li><span class="step-num">${i + 1}</span><span class="step-text">${escapeHtml(step)}</span></li>`)
    .join('\n');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderRiskCallout(recipe) {
  if (recipe.riskLevel !== 'medium' && recipe.riskLevel !== 'high') return '';
  const color = RISK_COLORS[recipe.riskLevel];
  const label = RISK_LABELS[recipe.riskLevel];
  const typeLabel = RISK_TYPE_LABELS[recipe.riskType] || '';
  return `
        <div class="callout warning">
          <p><strong style="color:${color}">${label}${typeLabel ? ` : ${typeLabel}` : ''}.</strong> Cette recette contient un ingrédient à surveiller selon les seuils ANSES et EFSA. Consultez notre <a href="/fiche.html">mémo aliments à limiter</a> pour l'intégrer sereinement dans votre semaine.</p>
        </div>`;
}

function renderBreadcrumbSchema(recipe, canonical) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://onmangequoi.eu' },
      { '@type': 'ListItem', position: 2, name: 'Recettes', item: 'https://onmangequoi.eu/recettes/' },
      { '@type': 'ListItem', position: 3, name: recipe.name, item: canonical },
    ],
  };
  return `  <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>`;
}

function renderPage(recipe) {
  const mealLabel = MEAL_TYPE_LABELS[recipe.mealType] || 'Repas';
  const title = `${recipe.name} | On mange quoi ?`;
  const description = `${recipe.name}. Recette de ${mealLabel.toLowerCase()} en ${recipe.prepTime} minutes, ${recipe.ingredients.length} ingrédients, basée sur les recommandations ANSES et EFSA.`;
  const canonical = `https://onmangequoi.eu/recettes/${recipe.slug}.html`;
  const intro = buildIntro(recipe);
  const lastSeenFr = formatDateFr(recipe.lastSeen);

  const schemaRecipe = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    description,
    recipeCategory: mealLabel,
    recipeCuisine: 'Française',
    totalTime: `PT${recipe.prepTime}M`,
    recipeYield: '4 portions',
    recipeIngredient: recipe.ingredients.map((i) => `${i.qty} ${i.unit || ''} ${i.name}`.trim()),
    recipeInstructions: recipe.prepSteps.map((s) => ({ '@type': 'HowToStep', text: s })),
    author: { '@type': 'Organization', name: 'On mange quoi ?', url: 'https://onmangequoi.eu' },
    dateModified: recipe.lastSeen,
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escapeHtml(recipe.name)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">

  <script type="application/ld+json">
${JSON.stringify(schemaRecipe, null, 2)}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <noscript><link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"></noscript>

  <script async src="https://plausible.io/js/pa-ZaRseIh-nGhXVtbtWwn2-.js"></script>
  <script>window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()</script>
  <script defer src="/js/consent-analytics.js"></script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #F7F3EE;
      --white: #FFFFFF;
      --text: #1A1A1A;
      --text-secondary: #686E7C;
      --border: #E5E0D8;
      --green-dark: #1B4332;
      --green-mid: #40916C;
      --green-light: #D1FAE5;
      --amber: #FEF3C7;
      --font-display: 'Fraunces', Georgia, serif;
      --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
      --font-mono: 'IBM Plex Mono', monospace;
      --r-card: 14px;
    }
    html { scroll-behavior: smooth; font-size: 16px; }
    body { font-family: var(--font-body); background: var(--bg); color: var(--text); line-height: 1.6; min-height: 100vh; }
    .site-header { background: linear-gradient(135deg, var(--green-dark), var(--green-mid)); padding: 0.75rem 1.25rem; }
    .header-inner { max-width: 740px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-family: var(--font-display); font-weight: 600; font-size: 1rem; color: #fff; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
    .logo svg { width: 20px; height: 20px; }
    .header-cta { font-size: 0.8rem; font-weight: 600; color: var(--green-dark); background: #fff; border-radius: 8px; padding: 0.35rem 0.85rem; text-decoration: none; transition: opacity 0.2s; }
    .header-cta:hover { opacity: 0.88; }
    .site-nav { display: none; align-items: center; gap: 18px; }
    .site-nav a { font-size: 13px; font-weight: 500; color: rgba(255,255,255,.85); text-decoration: none; transition: color 150ms; }
    .site-nav a:hover { color: #fff; }
    @media (min-width: 600px) { .site-nav { display: flex; } }
    .breadcrumb { max-width: 740px; margin: 1.5rem auto 0; padding: 0 1.25rem; font-size: 0.8rem; color: var(--text-secondary); }
    .breadcrumb a { color: #367A5B; text-decoration: underline; }
    .breadcrumb a:hover { text-decoration: underline; }
    .article-wrap { max-width: 740px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    .recipe-meta { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; align-items: center; }
    .tag { display: inline-block; background: var(--green-light); color: var(--green-dark); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; padding: 0.2rem 0.65rem; border-radius: 100px; }
    .prep-time { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-secondary); }
    h1 { font-family: var(--font-display); font-weight: 700; font-size: 2rem; line-height: 1.2; margin-bottom: 1rem; }
    h2 { font-family: var(--font-display); font-weight: 600; font-size: 1.35rem; line-height: 1.3; margin: 2.5rem 0 0.75rem; }
    @media (max-width: 600px) { h1 { font-size: 1.5rem; } h2 { font-size: 1.15rem; } }
    .article-intro { font-size: 1.08rem; color: var(--text-secondary); line-height: 1.75; margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 2rem; }
    p { font-size: 1rem; line-height: 1.75; margin-bottom: 1.1rem; color: var(--text); }
    .ingredients-table { width: 100%; border-collapse: collapse; margin: 1rem 0 1.75rem; font-size: 0.95rem; }
    .ingredients-table th { background: var(--green-dark); color: #fff; text-align: left; padding: 0.6rem 1rem; font-weight: 600; font-size: 0.8rem; letter-spacing: 0.3px; }
    .ingredients-table td { padding: 0.55rem 1rem; border-bottom: 1px solid var(--border); }
    .ingredients-table tr:nth-child(even) td { background: rgba(0,0,0,0.02); }
    .steps-list { list-style: none; margin: 1rem 0 1.75rem; }
    .steps-list li { display: flex; gap: 0.85rem; margin-bottom: 1rem; align-items: flex-start; }
    .step-num { flex-shrink: 0; width: 1.6rem; height: 1.6rem; border-radius: 50%; background: var(--green-dark); color: #fff; font-family: var(--font-mono); font-size: 0.78rem; font-weight: 600; display: flex; align-items: center; justify-content: center; }
    .step-text { padding-top: 0.15rem; }
    .callout { border-radius: var(--r-card); padding: 1.25rem 1.5rem; margin: 1.75rem 0; }
    .callout.warning { background: var(--amber); border-left: 3px solid #D97706; }
    .callout p { margin-bottom: 0; font-size: 0.95rem; }
    .cta-block { background: var(--green-dark); border-radius: var(--r-card); padding: 1.75rem; margin: 2.5rem 0; text-align: center; }
    .cta-block p { color: rgba(255,255,255,.9); margin-bottom: 1rem; }
    .cta-btn { display: inline-block; background: #fff; color: var(--green-dark); font-weight: 600; padding: 0.65rem 1.5rem; border-radius: 999px; text-decoration: none; font-size: 0.9rem; }
    .cta-btn:hover { opacity: 0.9; }
    .last-seen { font-size: 0.8rem; color: var(--text-secondary); margin-top: 2.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border); }
    .landing-footer { max-width: 740px; margin: 0 auto; padding: 2rem 1.25rem; display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; align-items: center; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary); }
    .landing-footer a { color: #367A5B; text-decoration: none; }
    .skip-link { position: absolute; top: -999px; left: 0; background: var(--green-dark); color: var(--white); padding: 0.75rem 1.25rem; border-radius: 0 0 8px 0; font-size: 0.9rem; font-weight: 600; text-decoration: none; z-index: 9999; }
    .skip-link:focus-visible { top: 0; }
  </style>
${renderBreadcrumbSchema(recipe, canonical)}
</head>
<body>

  <a class="skip-link" href="#main">Aller au contenu principal</a>

  <header class="site-header">
    <div class="header-inner">
      <a class="logo" href="https://onmangequoi.eu" aria-label="On mange quoi ? accueil">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" stroke-width="1.6"/>
          <circle cx="10" cy="10" r="5" stroke-width="1.4"/>
        </svg>
        On mange quoi ?
      </a>
      <nav class="site-nav" aria-label="Navigation principale">
        <a href="/semaine.html">Mon menu</a>
        <a href="/recettes/">Toutes les recettes</a>
        <a href="/score-sante.html">Score santé</a>
        <a href="/fiche.html">Aliments à éviter</a>
      </nav>
      <a class="header-cta" href="/?signup=1">Commencer, c'est gratuit</a>
    </div>
  </header>

  <nav class="breadcrumb" aria-label="Fil d'Ariane">
    <a href="https://onmangequoi.eu">Accueil</a> &rsaquo;
    <a href="/recettes/">Recettes</a> &rsaquo;
    ${escapeHtml(recipe.name)}
  </nav>

  <main id="main">
    <article class="article-wrap">

      <div class="recipe-meta">
        <span class="tag">${mealLabel}</span>
        <span class="prep-time">${recipe.prepTime} min</span>
      </div>

      <h1>${escapeHtml(recipe.name)}</h1>

      <p class="article-intro">${escapeHtml(intro)}</p>
${renderRiskCallout(recipe)}

      <h2>Ingrédients (4 personnes)</h2>
${renderIngredientsTable(recipe.ingredients)}

      <h2>Préparation</h2>
      <ol class="steps-list">
${renderSteps(recipe.prepSteps)}
      </ol>

      <div class="cta-block">
        <p>Cette recette fait partie d'un menu complet de sept dîners, avec liste de courses et score santé ANSES/EFSA.</p>
        <a class="cta-btn" href="/semaine.html">Voir le menu de la semaine</a>
      </div>

      <p class="last-seen">Recette proposée dans les menus d'On mange quoi ? Dernière apparition : semaine du ${lastSeenFr}.</p>

    </article>
  </main>

  <footer class="landing-footer">
    <a href="https://onmangequoi.eu">onmangequoi.eu</a>
    <span>&copy; 2026 &middot; Paris &middot; Basé sur les recommandations ANSES + EFSA</span>
  </footer>

</body>
</html>
`;
}

function renderIndexPage(recipes) {
  const grouped = { breakfast: [], lunch: [], snack: [], dinner: [] };
  for (const r of recipes) grouped[r.mealType]?.push(r);
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  const section = (key) => {
    const label = MEAL_TYPE_LABELS[key];
    const items = grouped[key];
    if (!items.length) return '';
    const links = items
      .map((r) => `          <li><a href="/recettes/${r.slug}.html">${escapeHtml(r.name)}</a> <span class="prep-time">${r.prepTime} min</span></li>`)
      .join('\n');
    return `
      <section class="recipe-section">
        <h2>${label} <span class="count">(${items.length})</span></h2>
        <ul class="recipe-list">
${links}
        </ul>
      </section>`;
  };

  const total = recipes.length;
  const title = `Toutes nos recettes : ${total} idées de repas | On mange quoi ?`;
  const description = `${total} recettes testées dans nos menus hebdomadaires, classées par petit-déjeuner, déjeuner, goûter et dîner. Basées sur les recommandations ANSES et EFSA.`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="https://onmangequoi.eu/recettes/">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://onmangequoi.eu/recettes/">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <noscript><link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"></noscript>

  <script async src="https://plausible.io/js/pa-ZaRseIh-nGhXVtbtWwn2-.js"></script>
  <script>window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()</script>
  <script defer src="/js/consent-analytics.js"></script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #F7F3EE; --white: #FFFFFF; --text: #1A1A1A; --text-secondary: #686E7C;
      --border: #E5E0D8; --green-dark: #1B4332; --green-mid: #40916C; --green-light: #D1FAE5;
      --font-display: 'Fraunces', Georgia, serif; --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
      --font-mono: 'IBM Plex Mono', monospace;
    }
    html { scroll-behavior: smooth; font-size: 16px; }
    body { font-family: var(--font-body); background: var(--bg); color: var(--text); line-height: 1.6; min-height: 100vh; }
    .site-header { background: linear-gradient(135deg, var(--green-dark), var(--green-mid)); padding: 0.75rem 1.25rem; }
    .header-inner { max-width: 900px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-family: var(--font-display); font-weight: 600; font-size: 1rem; color: #fff; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
    .logo svg { width: 20px; height: 20px; }
    .header-cta { font-size: 0.8rem; font-weight: 600; color: var(--green-dark); background: #fff; border-radius: 8px; padding: 0.35rem 0.85rem; text-decoration: none; }
    .site-nav { display: none; align-items: center; gap: 18px; }
    .site-nav a { font-size: 13px; font-weight: 500; color: rgba(255,255,255,.85); text-decoration: none; }
    .site-nav a:hover { color: #fff; }
    @media (min-width: 600px) { .site-nav { display: flex; } }
    .wrap { max-width: 900px; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
    h1 { font-family: var(--font-display); font-weight: 700; font-size: clamp(1.75rem, 4vw, 2.4rem); line-height: 1.15; margin-bottom: 0.75rem; }
    .intro { font-size: 1.05rem; color: var(--text-secondary); max-width: 620px; margin-bottom: 2.5rem; }
    .recipe-section { margin-bottom: 2.5rem; }
    .recipe-section h2 { font-family: var(--font-display); font-weight: 600; font-size: 1.3rem; margin-bottom: 1rem; padding-bottom: 0.6rem; border-bottom: 1px solid var(--border); }
    .recipe-section .count { font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-secondary); font-weight: 400; }
    .recipe-list { list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.4rem 1.5rem; }
    .recipe-list li { padding: 0.5rem 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; gap: 0.75rem; align-items: baseline; }
    .recipe-list a { color: var(--text); text-decoration: none; font-size: 0.92rem; }
    .recipe-list a:hover { color: var(--green-dark); text-decoration: underline; }
    .recipe-list .prep-time { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; }
    .landing-footer { max-width: 900px; margin: 0 auto; padding: 2rem 1.25rem; font-size: 0.8rem; color: var(--text-secondary); }
    .landing-footer a { color: #367A5B; text-decoration: none; }
    .skip-link { position: absolute; top: -999px; left: 0; background: var(--green-dark); color: var(--white); padding: 0.75rem 1.25rem; border-radius: 0 0 8px 0; font-size: 0.9rem; font-weight: 600; text-decoration: none; z-index: 9999; }
    .skip-link:focus-visible { top: 0; }
  </style>
</head>
<body>

  <a class="skip-link" href="#main">Aller au contenu principal</a>

  <header class="site-header">
    <div class="header-inner">
      <a class="logo" href="https://onmangequoi.eu" aria-label="On mange quoi ? accueil">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" stroke-width="1.6"/>
          <circle cx="10" cy="10" r="5" stroke-width="1.4"/>
        </svg>
        On mange quoi ?
      </a>
      <nav class="site-nav" aria-label="Navigation principale">
        <a href="/semaine.html">Mon menu</a>
        <a href="/score-sante.html">Score santé</a>
        <a href="/fiche.html">Aliments à éviter</a>
      </nav>
      <a class="header-cta" href="/?signup=1">Commencer, c'est gratuit</a>
    </div>
  </header>

  <main class="wrap" id="main">
    <h1>Toutes nos recettes</h1>
    <p class="intro">${total} recettes testées dans nos menus hebdomadaires, classées par moment de la journée. Basées sur les recommandations ANSES et EFSA, sans additif superflu.</p>
${section('breakfast')}
${section('lunch')}
${section('snack')}
${section('dinner')}
  </main>

  <footer class="landing-footer">
    <a href="https://onmangequoi.eu">onmangequoi.eu</a> &middot; &copy; 2026 &middot; Paris
  </footer>

</body>
</html>
`;
}

async function updateSitemap(recipes) {
  const sitemap = await readFile(SITEMAP_FILE, 'utf8');

  // Reconstruction plutôt que substitution par regex sur l'espacement :
  // l'ancienne version retirait les entrées /recettes/ avec un motif qui
  // supposait un espacement exact entre entrées, laissant un \n orphelin
  // par suppression (bug constaté le 22/09 : des centaines d'entrées
  // retirées d'un coup -> un bloc de ~385 lignes vides), et une variante
  // plus stricte du motif en a laissé d'autres non retirées -> doublons.
  // Ici on extrait chaque bloc <url>...</url> indépendamment de l'espacement
  // autour, on retire ceux qui pointent vers /recettes/, et on reconstruit
  // avec un espacement uniforme (une ligne vide entre chaque entrée).
  const urlBlockRe = /<url>[\s\S]*?<\/url>/g;
  const blocks = sitemap.match(urlBlockRe) || [];
  const keptBlocks = blocks.filter((b) => !/<loc>https:\/\/onmangequoi\.eu\/recettes\//.test(b));

  const header = sitemap.slice(0, sitemap.indexOf('<url>')).replace(/[ \t]+$/, '');

  const today = new Date().toISOString().slice(0, 10);
  const newRecipeBlocks = [
    `<url>\n    <loc>https://onmangequoi.eu/recettes/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
    ...recipes.map(
      (r) =>
        `<url>\n    <loc>https://onmangequoi.eu/recettes/${r.slug}.html</loc>\n    <lastmod>${r.lastSeen}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`
    ),
  ];

  const allBlocks = [...keptBlocks, ...newRecipeBlocks];
  const body = allBlocks.map((b) => '  ' + b).join('\n\n');

  const rebuilt = `${header}${body}\n\n</urlset>\n`;
  await writeFile(SITEMAP_FILE, rebuilt, 'utf8');
}

async function main() {
  const files = (await readdir(MENUS_DIR)).filter((f) => f.endsWith('.json')).sort();
  const recipes = new Map(); // slug -> recipe data (première rencontre gagne pour le contenu, lastSeen mis à jour)

  for (const file of files) {
    const weekStart = file.replace('.json', '');
    const data = JSON.parse(await readFile(join(MENUS_DIR, file), 'utf8'));

    // Deux formats possibles : la nouvelle structure "moins de friction"
    // (dinners/weekend/breakfasts/snacks/lunches) depuis la refonte, ou
    // l'ancien format (days[7] x meals{4}) pour les semaines archivées
    // générées avant. `lunches` est volontairement ignoré ici : ce sont
    // des idées légères sans ingrédients ni étapes, jamais de fiche page.
    const candidates = [];
    if (Array.isArray(data.dinners)) {
      for (const meal of data.dinners || []) candidates.push({ mealType: 'dinner', meal });
      for (const meal of data.weekend || []) candidates.push({ mealType: 'dinner', meal });
      for (const meal of data.breakfasts || []) candidates.push({ mealType: 'breakfast', meal });
      for (const meal of data.snacks || []) candidates.push({ mealType: 'snack', meal });
    } else {
      for (const day of data.days || []) {
        for (const [mealType, meal] of Object.entries(day.meals || {})) {
          candidates.push({ mealType, meal });
        }
      }
    }

    for (const { mealType, meal } of candidates) {
      if (!meal?.name) continue;
      const steps = meal.prepSteps || [];
      const ingredients = meal.ingredients || [];
      if (steps.length < MIN_STEPS || ingredients.length < MIN_INGREDIENTS) continue;

      const slug = slugify(meal.name);
      if (!slug) continue;

      const existing = recipes.get(slug);
      if (existing) {
        // Déjà vue : on garde le contenu, on met juste à jour la date de dernière apparition
        if (weekStart > existing.lastSeen) existing.lastSeen = weekStart;
        continue;
      }

      recipes.set(slug, {
        slug,
        name: meal.name,
        mealType,
        prepTime: String(meal.prepTime || '20'),
        riskLevel: meal.riskLevel || 'low',
        riskType: meal.riskType || null,
        isSeasonal: !!meal.isSeasonal,
        note: meal.note || '',
        ingredients,
        prepSteps: steps,
        lastSeen: weekStart,
      });
    }
  }

  const list = [...recipes.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  await mkdir(RECIPES_DIR, { recursive: true });

  // N'écrit que les pages qui n'existent pas encore. Les pages déjà
  // publiées peuvent porter des ajustements faits directement dessus
  // (ex. "Recettes similaires", corrections ponctuelles) que ce template
  // ne reproduit pas forcément : les réécrire à chaque run effacerait ces
  // ajustements. Conforme au but déjà documenté en tête de fichier
  // ("Idempotent... sans dupliquer les pages existantes").
  let written = 0;
  let skipped = 0;
  for (const recipe of list) {
    const path = join(RECIPES_DIR, `${recipe.slug}.html`);
    if (existsSync(path)) {
      skipped++;
      continue;
    }
    const html = renderPage(recipe);
    await writeFile(path, html, 'utf8');
    written++;
  }

  const indexHtml = renderIndexPage(list);
  await writeFile(join(RECIPES_DIR, 'index.html'), indexHtml, 'utf8');

  await updateSitemap(list);

  console.log(`✓ ${written} nouvelle(s) page(s) recette écrite(s) dans ${RECIPES_DIR} (${skipped} déjà existantes, inchangées)`);
  console.log(`✓ Index généré : recettes/index.html`);
  console.log(`✓ sitemap.xml mis à jour (${list.length + 1} URLs)`);
}

main().catch((err) => {
  console.error('✗ Erreur :', err);
  process.exit(1);
});
