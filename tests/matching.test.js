/**
 * Tests pour le module matching
 * Tests unitaires pour l'algorithme de détection de conflits et classement de recettes
 */

const {
  detectConflicts,
  scoreRecipeMatch,
  findAlternatives
} = require('../js/matching.js');

describe('matching algorithm', () => {
  test('detectConflicts returns hard conflicts for allergens', () => {
    const meals = [{
      name: 'Salmon',
      allergens: ['fish'],
      ingredients: ['salmon', 'lemon', 'dill']
    }];
    const preferences = {
      hard_constraints: [{ ingredient: 'fish', reason: 'allergy' }],
      soft_preferences: []
    };

    const conflicts = detectConflicts(meals, preferences);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('hard');
    expect(conflicts[0].reason).toContain('fish');
  });

  test('detectConflicts returns soft conflicts for dislikes', () => {
    const meals = [{
      name: 'Liver Pâté',
      allergens: [],
      ingredients: ['liver', 'onion', 'butter']
    }];
    const preferences = {
      hard_constraints: [],
      soft_preferences: [{ ingredient: 'liver', reason: 'dislike' }]
    };

    const conflicts = detectConflicts(meals, preferences);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('soft');
  });

  test('detectConflicts returns empty array if no conflicts', () => {
    const meals = [{
      name: 'Grilled Chicken',
      allergens: [],
      ingredients: ['chicken', 'herbs', 'lemon']
    }];
    const preferences = {
      hard_constraints: [{ ingredient: 'fish', reason: 'allergy' }],
      soft_preferences: []
    };

    const conflicts = detectConflicts(meals, preferences);
    expect(conflicts).toHaveLength(0);
  });

  test('scoreRecipeMatch ranks recipes by ingredient overlap', () => {
    const target = { ingredients: ['chicken', 'herbs', 'lemon'] };
    const candidate1 = { id: '1', ingredients: ['chicken', 'rosemary'] };
    const candidate2 = { id: '2', ingredients: ['beef', 'garlic'] };

    const score1 = scoreRecipeMatch(target, candidate1);
    const score2 = scoreRecipeMatch(target, candidate2);

    expect(score1).toBeGreaterThan(score2);
  });

  test('scoreRecipeMatch penalizes recipes with hard constraint ingredients', () => {
    const target = { ingredients: ['chicken'] };
    const clean = { id: '1', ingredients: ['chicken', 'herbs'] };
    const hasConflict = { id: '2', ingredients: ['chicken', 'nuts'] };
    const preferences = {
      hard_constraints: [{ ingredient: 'nuts', reason: 'allergy' }],
      soft_preferences: []
    };

    const scoreClean = scoreRecipeMatch(target, clean, preferences);
    const scoreConflict = scoreRecipeMatch(target, hasConflict, preferences);

    expect(scoreClean).toBeGreaterThan(scoreConflict);
  });

  test('findAlternatives returns recipes in same category without hard constraint conflicts', () => {
    const conflictingMeal = {
      name: 'Salmon',
      category: 'protein-fish',
      ingredients: ['salmon', 'lemon']
    };
    const allRecipes = [
      { id: '1', name: 'Trout', category: 'protein-fish', ingredients: ['trout'] },
      { id: '2', name: 'Chicken', category: 'protein-poultry', ingredients: ['chicken'] },
      { id: '3', name: 'Fish with nuts', category: 'protein-fish', ingredients: ['fish', 'nuts'] }
    ];
    const preferences = {
      hard_constraints: [{ ingredient: 'nuts', reason: 'allergy' }],
      soft_preferences: []
    };

    const alternatives = findAlternatives(conflictingMeal, allRecipes, preferences, 3);

    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives[0].category).toBe('protein-fish');
    expect(alternatives[0].name).toBe('Trout');
  });

  test('findAlternatives respects topN parameter', () => {
    const meal = { name: 'Fish', category: 'protein-fish', ingredients: ['fish'] };
    const recipes = [
      { id: '1', name: 'R1', category: 'protein-fish', ingredients: ['fish'] },
      { id: '2', name: 'R2', category: 'protein-fish', ingredients: ['fish'] },
      { id: '3', name: 'R3', category: 'protein-fish', ingredients: ['fish'] },
      { id: '4', name: 'R4', category: 'protein-fish', ingredients: ['fish'] }
    ];

    const top2 = findAlternatives(meal, recipes, { hard_constraints: [], soft_preferences: [] }, 2);
    expect(top2).toHaveLength(2);

    const top10 = findAlternatives(meal, recipes, { hard_constraints: [], soft_preferences: [] }, 10);
    expect(top10.length).toBeLessThanOrEqual(4);
  });
});
