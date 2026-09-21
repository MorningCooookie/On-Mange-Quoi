#!/usr/bin/env node
/**
 * Génère le menu hebdomadaire de la semaine en cours et l'écrit dans
 * data/menus/YYYY-MM-DD.json. Met à jour data/history.json.
 *
 * Exécution :
 *   node scripts/generate-menu.mjs
 *
 * Variables d'environnement requises :
 *   ANTHROPIC_API_KEY : clé API Anthropic (à stocker dans GitHub Secrets)
 *
 * Variables optionnelles :
 *   MODEL : modèle à utiliser (défaut : claude-sonnet-4-5-20250929)
 *   WEEK_START : forcer une date de début de semaine (utile pour rattrapage)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MENUS_DIR = join(ROOT, 'data', 'menus');
const HISTORY_FILE = join(ROOT, 'data', 'history.json');
const PROMPT_FILE = join(__dirname, 'menu-prompt.md');

const MODEL = process.env.MODEL || 'claude-sonnet-4-5-20250929';
// 32000 tokens : marge large. Depuis la refonte "moins de friction"
// (5 dinners + 2 weekend + 2 breakfasts + 2 snacks + 2-3 lunches allégés
// au lieu de 28 repas complets), la sortie réelle est bien plus courte
// qu'avant, mais on garde la même limite haute par sécurité.
const MAX_TOKENS = 32000;

// Mois en français pour l'injection dans le prompt
const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

// Labels jours en français pour validation
const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const WEEKDAY_LABELS = DAY_LABELS.slice(0, 5);
const WEEKEND_LABELS = DAY_LABELS.slice(5);
const MAX_MAIN_INGREDIENTS = 5;

/**
 * Calcule la date du lundi de la semaine en cours (Europe/Paris)
 * Si on est dimanche, on calcule pour le lundi suivant.
 */
function getCurrentMonday(forcedDate) {
  if (forcedDate) return forcedDate;
  const now = new Date();
  // Décale à minuit pour éviter les soucis de fuseaux
  const day = now.getDay(); // 0 = dim, 1 = lun, ..., 6 = sam
  let diff;
  if (day === 0) {
    // Dimanche → lundi suivant (demain)
    diff = 1;
  } else {
    // Tous les autres jours → lundi de cette semaine
    diff = 1 - day;
  }
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatLabel(isoDate) {
  const d = new Date(isoDate + 'T00:00:00Z');
  const day = d.getUTCDate();
  const month = MONTHS_FR[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `Semaine du ${day} ${month} ${year}`;
}

/**
 * Valide un plat complet (dinners / weekend / breakfasts / snacks) :
 * champs communs, nombre d'ingrédients, présence de twist/conservation.
 */
function validateDish(dish, pathLabel, errors, { maxPrepTime } = {}) {
  if (!dish) {
    errors.push(`${pathLabel} manquant`);
    return;
  }
  if (!dish.name) errors.push(`${pathLabel}.name manquant`);
  if (!Array.isArray(dish.ingredients) || dish.ingredients.length === 0) {
    errors.push(`${pathLabel}.ingredients manquant ou vide`);
  } else if (dish.ingredients.length > MAX_MAIN_INGREDIENTS) {
    errors.push(`${pathLabel}.ingredients dépasse ${MAX_MAIN_INGREDIENTS} ingrédients principaux (reçu ${dish.ingredients.length})`);
  }
  if (!Array.isArray(dish.prepSteps) || dish.prepSteps.length === 0) {
    errors.push(`${pathLabel}.prepSteps manquant ou vide`);
  }
  if (!dish.twist) errors.push(`${pathLabel}.twist manquant`);
  if (!dish.conservation) errors.push(`${pathLabel}.conservation manquant`);
  if (maxPrepTime && Number(dish.prepTime) > maxPrepTime) {
    errors.push(`${pathLabel}.prepTime dépasse ${maxPrepTime} min (reçu ${dish.prepTime})`);
  }
}

/**
 * Valide grossièrement la structure du menu généré.
 * Lance une erreur si quelque chose de critique manque.
 *
 * Structure (depuis la refonte "moins de friction") : 5 dinners (Lundi à
 * Vendredi, 20 min max), 2 weekend (Samedi + Dimanche), 2 breakfasts
 * réutilisables (sucré/salé), 2 snacks réutilisables (rapide/dense), 2 ou 3
 * lunches allégés (juste name + note, pas de fiche recette complète).
 */
function validateMenu(menu, expectedWeekStart) {
  const errors = [];

  if (!menu || typeof menu !== 'object') {
    throw new Error('Menu invalide : pas un objet JSON.');
  }

  if (menu.weekStart !== expectedWeekStart) {
    errors.push(`weekStart attendu ${expectedWeekStart}, reçu ${menu.weekStart}`);
  }

  if (!menu.weekEnd) errors.push('weekEnd manquant');
  if (!['A', 'B', 'C'].includes(menu.healthScore)) {
    errors.push(`healthScore invalide : ${menu.healthScore}`);
  }
  if (!Array.isArray(menu.healthScoreHighlights) || menu.healthScoreHighlights.length < 3) {
    errors.push('healthScoreHighlights doit contenir au moins 3 éléments');
  }

  if (!Array.isArray(menu.dinners) || menu.dinners.length !== 5) {
    errors.push(`dinners doit contenir exactement 5 plats, reçu ${menu.dinners?.length}`);
  } else {
    menu.dinners.forEach((dish, i) => {
      if (dish.day !== WEEKDAY_LABELS[i]) {
        errors.push(`dinners[${i}].day attendu ${WEEKDAY_LABELS[i]}, reçu ${dish.day}`);
      }
      const expectedDate = addDays(expectedWeekStart, i);
      if (dish.date !== expectedDate) {
        errors.push(`dinners[${i}].date attendu ${expectedDate}, reçu ${dish.date}`);
      }
      validateDish(dish, `dinners[${i}]`, errors, { maxPrepTime: 20 });
    });
  }

  if (!Array.isArray(menu.weekend) || menu.weekend.length !== 2) {
    errors.push(`weekend doit contenir exactement 2 plats, reçu ${menu.weekend?.length}`);
  } else {
    menu.weekend.forEach((dish, i) => {
      if (dish.day !== WEEKEND_LABELS[i]) {
        errors.push(`weekend[${i}].day attendu ${WEEKEND_LABELS[i]}, reçu ${dish.day}`);
      }
      const expectedDate = addDays(expectedWeekStart, 5 + i);
      if (dish.date !== expectedDate) {
        errors.push(`weekend[${i}].date attendu ${expectedDate}, reçu ${dish.date}`);
      }
      validateDish(dish, `weekend[${i}]`, errors);
    });
  }

  if (!Array.isArray(menu.breakfasts) || menu.breakfasts.length !== 2) {
    errors.push(`breakfasts doit contenir exactement 2 options, reçu ${menu.breakfasts?.length}`);
  } else {
    const expectedVariants = ['sucre', 'sale'];
    menu.breakfasts.forEach((dish, i) => {
      if (dish.variant !== expectedVariants[i]) {
        errors.push(`breakfasts[${i}].variant attendu ${expectedVariants[i]}, reçu ${dish.variant}`);
      }
      validateDish(dish, `breakfasts[${i}]`, errors);
    });
  }

  if (!Array.isArray(menu.snacks) || menu.snacks.length !== 2) {
    errors.push(`snacks doit contenir exactement 2 options, reçu ${menu.snacks?.length}`);
  } else {
    const expectedVariants = ['rapide', 'dense'];
    menu.snacks.forEach((dish, i) => {
      if (dish.variant !== expectedVariants[i]) {
        errors.push(`snacks[${i}].variant attendu ${expectedVariants[i]}, reçu ${dish.variant}`);
      }
      validateDish(dish, `snacks[${i}]`, errors);
    });
  }

  if (!Array.isArray(menu.lunches) || menu.lunches.length < 2 || menu.lunches.length > 3) {
    errors.push(`lunches doit contenir 2 ou 3 idées, reçu ${menu.lunches?.length}`);
  } else {
    menu.lunches.forEach((dish, i) => {
      if (!dish.name) errors.push(`lunches[${i}].name manquant`);
      if (!dish.note) errors.push(`lunches[${i}].note manquant`);
    });
  }

  if (!Array.isArray(menu.shoppingList) || menu.shoppingList.length === 0) {
    errors.push('shoppingList manquant ou vide');
  }
  if (!Array.isArray(menu.healthAlerts)) {
    errors.push('healthAlerts doit être un tableau');
  }

  // Check tirets longs dans tout le contenu sérialisé
  const serialized = JSON.stringify(menu);
  if (serialized.includes('—')) {
    errors.push('Tirets longs (—) détectés dans le menu. Règle stricte du projet.');
  }

  // Check emojis dans tout le contenu sérialisé (le site a son propre
  // système d'icônes côté frontend, les emojis dans la data cassent
  // le ton sobre de la marque)
  const emojiRegex = /\p{Extended_Pictographic}/u;
  if (emojiRegex.test(serialized)) {
    const found = serialized.match(/\p{Extended_Pictographic}/gu).slice(0, 5).join(' ');
    errors.push(`Emojis détectés dans le menu (premiers : ${found}). Règle stricte du projet : pas d'emoji dans la data.`);
  }

  if (errors.length > 0) {
    throw new Error('Validation menu échouée :\n  - ' + errors.join('\n  - '));
  }
}

/**
 * Met à jour data/history.json en ajoutant la nouvelle semaine en tête.
 */
async function updateHistory(menu) {
  let history = { menus: [] };
  if (existsSync(HISTORY_FILE)) {
    const raw = await readFile(HISTORY_FILE, 'utf8');
    history = JSON.parse(raw);
  }

  // Si la semaine existe déjà, on la remplace (idempotence)
  history.menus = history.menus.filter((m) => m.weekStart !== menu.weekStart);

  const entry = {
    weekStart: menu.weekStart,
    weekEnd: menu.weekEnd,
    file: `data/menus/${menu.weekStart}.json`,
    label: formatLabel(menu.weekStart),
    healthScore: menu.healthScore,
    highlights: menu.healthScoreHighlights
  };

  history.menus.unshift(entry);
  history.menus.sort((a, b) => (a.weekStart > b.weekStart ? -1 : 1));

  await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2) + '\n', 'utf8');
}

async function main() {
  const weekStart = getCurrentMonday(process.env.WEEK_START);
  const weekEnd = addDays(weekStart, 6);
  const monthIndex = new Date(weekStart + 'T00:00:00Z').getUTCMonth();
  const month = MONTHS_FR[monthIndex];
  const year = weekStart.slice(0, 4);

  const targetFile = join(MENUS_DIR, `${weekStart}.json`);

  // Idempotence : si le fichier existe déjà, ne rien faire
  if (existsSync(targetFile)) {
    console.log(`✓ Menu de la semaine ${weekStart} déjà présent, rien à générer.`);
    process.exit(0);
  }

  console.log(`▸ Génération du menu pour la semaine du ${weekStart} au ${weekEnd}`);
  console.log(`  Mois courant : ${month} ${year}`);
  console.log(`  Modèle : ${MODEL}`);

  // Lire le prompt système
  let systemPrompt = await readFile(PROMPT_FILE, 'utf8');
  systemPrompt = systemPrompt
    .replaceAll('{{WEEK_START}}', weekStart)
    .replaceAll('{{WEEK_END}}', weekEnd)
    .replaceAll('{{MONTH}}', month)
    .replaceAll('{{YEAR}}', year);

  const userMessage = `Génère le menu hebdomadaire pour la semaine du ${weekStart} (lundi) au ${weekEnd} (dimanche) : 5 dinners (Lundi à Vendredi), 2 weekend (Samedi, Dimanche), 2 breakfasts (sucré, salé), 2 snacks (rapide, dense), 2 ou 3 lunches allégés. Mois courant : ${month} ${year}. Respecte scrupuleusement la saisonnalité française de ce mois, l'esprit "moins de friction" du menu, toutes les contraintes santé (ANSES/EFSA), les contraintes pratiques et éditoriales. Retourne uniquement le JSON valide, sans aucun texte avant ou après.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('✗ ANTHROPIC_API_KEY manquante. Aborter.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });
  } catch (err) {
    console.error('✗ Erreur API Anthropic :', err.message);
    process.exit(1);
  }

  // Récupérer le texte de la réponse
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) {
    console.error('✗ Pas de bloc texte dans la réponse Anthropic.');
    process.exit(1);
  }
  let raw = textBlock.text.trim();

  // Tolérance : si Claude entoure le JSON par ```json ... ```, on retire
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
  }

  let menu;
  try {
    menu = JSON.parse(raw);
  } catch (err) {
    console.error('✗ JSON invalide retourné par Claude :', err.message);
    console.error('   Aperçu (200 premiers caractères) :', raw.slice(0, 200));
    process.exit(1);
  }

  // Forcer weekStart/End pour éviter qu'un format JS de date dérape
  menu.weekStart = weekStart;
  menu.weekEnd = weekEnd;

  try {
    validateMenu(menu, weekStart);
  } catch (err) {
    console.error('✗', err.message);
    console.error('   JSON écrit quand même dans /tmp/menu-rejected.json pour debug.');
    await writeFile('/tmp/menu-rejected.json', JSON.stringify(menu, null, 2), 'utf8');
    process.exit(1);
  }

  await mkdir(MENUS_DIR, { recursive: true });
  await writeFile(targetFile, JSON.stringify(menu, null, 2) + '\n', 'utf8');
  await updateHistory(menu);

  console.log(`✓ Menu écrit : ${targetFile}`);
  console.log(`✓ history.json mis à jour`);
  console.log(`✓ Score : ${menu.healthScore} · ${menu.dinners.length} dîners · ${menu.weekend.length} week-end · ${menu.breakfasts.length} petit-déj · ${menu.snacks.length} encas · ${menu.lunches.length} déjeuners · ${menu.shoppingList.length} catégories de courses`);
}

// Ne lance main() que si le fichier est exécuté directement (node
// scripts/generate-menu.mjs), pas quand il est importé (ex. par un test
// qui a besoin de valider la structure du menu sans appeler l'API).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('✗ Erreur inattendue :', err);
    process.exit(1);
  });
}

export { validateMenu, validateDish };
