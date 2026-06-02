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
const MAX_TOKENS = 16000;

// Mois en français pour l'injection dans le prompt
const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

// Labels jours en français pour validation
const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

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
 * Valide grossièrement la structure du menu généré.
 * Lance une erreur si quelque chose de critique manque.
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
  if (!Array.isArray(menu.days) || menu.days.length !== 7) {
    errors.push(`days doit contenir exactement 7 jours, reçu ${menu.days?.length}`);
  } else {
    menu.days.forEach((day, i) => {
      if (day.label !== DAY_LABELS[i]) {
        errors.push(`day[${i}].label attendu ${DAY_LABELS[i]}, reçu ${day.label}`);
      }
      const expectedDate = addDays(expectedWeekStart, i);
      if (day.date !== expectedDate) {
        errors.push(`day[${i}].date attendu ${expectedDate}, reçu ${day.date}`);
      }
      ['breakfast', 'lunch', 'snack', 'dinner'].forEach((mealKey) => {
        const meal = day.meals?.[mealKey];
        if (!meal) {
          errors.push(`day[${i}].meals.${mealKey} manquant`);
        } else {
          if (!meal.name) errors.push(`day[${i}].meals.${mealKey}.name manquant`);
          if (!Array.isArray(meal.ingredients) || meal.ingredients.length === 0) {
            errors.push(`day[${i}].meals.${mealKey}.ingredients manquant ou vide`);
          }
          if (!Array.isArray(meal.prepSteps) || meal.prepSteps.length === 0) {
            errors.push(`day[${i}].meals.${mealKey}.prepSteps manquant ou vide`);
          }
        }
      });
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

  const userMessage = `Génère le menu hebdomadaire complet pour la semaine du ${weekStart} (lundi) au ${weekEnd} (dimanche). Mois courant : ${month} ${year}. Respecte scrupuleusement la saisonnalité française de ce mois, toutes les contraintes santé (ANSES/EFSA), les contraintes pratiques et éditoriales. Retourne uniquement le JSON valide, sans aucun texte avant ou après.`;

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
  console.log(`✓ Score : ${menu.healthScore} · ${menu.days.length} jours · ${menu.shoppingList.length} catégories de courses`);
}

main().catch((err) => {
  console.error('✗ Erreur inattendue :', err);
  process.exit(1);
});
