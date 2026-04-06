/**
 * Algorithme de correspondance des recettes
 * Détecte les conflits repas/préférences et classe les recettes alternatives
 */

/**
 * Détecte les conflits entre les repas et les préférences de l'utilisateur
 * @param {Array} meals — Tableau de repas { name, allergens, ingredients, ... }
 * @param {Object} preferences — { hard_constraints, soft_preferences }
 * @returns {Array} Tableau des conflits détectés
 */
function detectConflicts(meals, preferences) {
  const conflicts = [];

  meals.forEach((meal, index) => {
    // Vérifier les contraintes dures (allergies)
    preferences.hard_constraints.forEach(constraint => {
      if (meal.allergens && meal.allergens.includes(constraint.ingredient)) {
        conflicts.push({
          mealIndex: index,
          mealName: meal.name,
          type: 'hard',
          ingredient: constraint.ingredient,
          reason: `Contient ${constraint.ingredient} (${constraint.reason})`
        });
      }
    });

    // Vérifier les préférences douces (dégoûts)
    preferences.soft_preferences.forEach(pref => {
      if (meal.ingredients && meal.ingredients.includes(pref.ingredient)) {
        conflicts.push({
          mealIndex: index,
          mealName: meal.name,
          type: 'soft',
          ingredient: pref.ingredient,
          reason: `Contient ${pref.ingredient} (${pref.reason})`
        });
      }
    });
  });

  return conflicts;
}

/**
 * Évalue la similarité entre un repas cible et une recette candidate
 * Basé sur: chevauchement des ingrédients (0.5), absence de conflits (0.35), catégorie (0.15)
 * @param {Object} targetMeal — Repas cible
 * @param {Object} candidateRecipe — Recette candidate
 * @param {Object} preferences — { hard_constraints, soft_preferences } (optional)
 * @returns {Number} Score entre 0 et 1
 */
function scoreRecipeMatch(targetMeal, candidateRecipe, preferences = {}) {
  let score = 0;

  // Chevauchement des ingrédients (poids: 0.5)
  const targetIngredients = new Set(targetMeal.ingredients || []);
  const candidateIngredients = new Set(candidateRecipe.ingredients || []);
  const overlap = [...targetIngredients].filter(i => candidateIngredients.has(i)).length;
  score += (overlap / Math.max(targetIngredients.size, 1)) * 0.5;

  // Éviter les ingrédients conflictuels (poids: 0.35)
  const hardConstraintIngredients = new Set(
    (preferences.hard_constraints || []).map(c => c.ingredient)
  );
  const softPreferenceIngredients = new Set(
    (preferences.soft_preferences || []).map(p => p.ingredient)
  );

  const hardConflicts = [...(candidateRecipe.ingredients || [])].filter(i =>
    hardConstraintIngredients.has(i)
  ).length;
  const softConflicts = [...(candidateRecipe.ingredients || [])].filter(i =>
    softPreferenceIngredients.has(i)
  ).length;

  score -= (hardConflicts * 0.2) + (softConflicts * 0.15);

  // Bonus pour catégorie identique (poids: 0.15)
  if (targetMeal.category === candidateRecipe.category) {
    score += 0.15;
  }

  return Math.max(0, score);
}

/**
 * Trouve les meilleures alternatives à un repas conflictuel
 * @param {Object} conflictingMeal — Repas problématique
 * @param {Array} allRecipes — Toutes les recettes disponibles
 * @param {Object} preferences — Préférences de l'utilisateur
 * @param {Number} topN — Nombre de suggestions (défaut: 3)
 * @returns {Array} N meilleures alternatives
 */
function findAlternatives(conflictingMeal, allRecipes, preferences, topN = 3) {
  // Filtrer les recettes: même catégorie, sans violations de contrainte dure
  const hardConstraintIngredients = new Set(
    (preferences.hard_constraints || []).map(c => c.ingredient)
  );

  const candidates = allRecipes.filter(recipe => {
    // Même catégorie
    if (recipe.category !== conflictingMeal.category) return false;

    // Pas de violation de contrainte dure
    const hasHardConflict = (recipe.ingredients || []).some(i =>
      hardConstraintIngredients.has(i)
    );
    if (hasHardConflict) return false;

    return true;
  });

  // Évaluer et trier les candidats
  const scored = candidates.map(recipe => ({
    ...recipe,
    matchScore: scoreRecipeMatch(conflictingMeal, recipe, preferences)
  }));

  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, topN);
}

module.exports = {
  detectConflicts,
  scoreRecipeMatch,
  findAlternatives
};
