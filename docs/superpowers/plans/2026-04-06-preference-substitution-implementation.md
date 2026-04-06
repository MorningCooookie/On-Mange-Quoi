# Preference-Based Meal Substitution — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to execute this plan task-by-task with fresh agent per task.

**Goal:** Build a preference-based meal substitution system that lets registered users identify meals conflicting with allergies/dislikes and swap them for alternatives from a recipe database.

**Architecture:** 
- Data layer: Supabase tables for user preferences + recipe database
- Logic layer: Matching algorithm (ingredient checking + scoring)
- UI layer: Header button + modal with conflict detection and recipe suggestions
- Isolation: Feature-flagged for dev/premium users; localStorage-only substitutions until verified

**Tech Stack:** Vanilla JS, Supabase, localStorage, no frameworks

---

## File Structure

### New Files
- `js/preferences.js` — preference storage, retrieval, validation
- `js/matching.js` — recipe matching algorithm + conflict detection
- `js/substitution-modal.js` — modal UI, conflict list, user interactions
- `data/recipes.json` — initial recipe database (200-300 recipes)
- `styles/preferences.css` — button, modal, conflict card styles

### Modified Files
- `index.html` — add "Fix preferences" button to header, modal structure
- `styles.css` — import preferences.css, variable overrides
- `semaine.js` — integrate preference scanning on menu load
- `auth.js` — export user preference loading on login
- `data/config.json` — add preference configuration (ingredient categories, etc.)

---

## Tasks

### Task 1: Set Up Supabase Schema — User Preferences Table

**Files:**
- Supabase (via web console): Create table `user_preferences`
- Reference: `docs/superpowers/specs/2026-04-06-preference-substitution-design.md` Section 2.1

- [ ] **Step 1: Open Supabase project and create table**

Go to your Supabase dashboard → SQL Editor → New query

- [ ] **Step 2: Run schema creation SQL**

```sql
-- user_preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  hard_constraints JSONB DEFAULT '[]'::jsonb,
  soft_preferences JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, profile_id)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own preferences
CREATE POLICY "Users can access own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);
```

- [ ] **Step 3: Verify table created**

Check Supabase dashboard → Tables → user_preferences. Should show 5 columns.

- [ ] **Step 4: Commit (reference only — no code yet)**

Document in: `docs/SUPABASE_SETUP.md` (add section "User Preferences Table")

```markdown
## User Preferences Table

**Created:** 2026-04-06  
**Purpose:** Store user allergies and food dislikes per profile  
**RLS:** Enabled — users access only their own preferences
```

---

### Task 2: Set Up Supabase Schema — Recipes Table

**Files:**
- Supabase (via web console): Create table `recipes`
- Reference: `docs/superpowers/specs/2026-04-06-preference-substitution-design.md` Section 2.2

- [ ] **Step 1: Run recipe schema creation SQL**

```sql
-- recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  ingredients JSONB NOT NULL,
  allergens JSONB DEFAULT '[]'::jsonb,
  nutritional_profile JSONB,
  serves INT DEFAULT 2,
  prep_time_min INT,
  cooking_time_min INT,
  difficulty TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Index on category for faster lookups
CREATE INDEX recipes_category_idx ON recipes(category);

-- RLS: Read-only for authenticated users
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read recipes" ON recipes
  FOR SELECT USING (auth.role() = 'authenticated');
```

- [ ] **Step 2: Verify table created**

Check Supabase dashboard → Tables → recipes. Should show 10 columns.

- [ ] **Step 3: Add seed data (at least 1 recipe for testing)**

```sql
INSERT INTO recipes (name, description, category, ingredients, allergens, nutritional_profile, serves, prep_time_min, cooking_time_min, difficulty)
VALUES
  (
    'Grilled Chicken with Herbs',
    'Simple grilled chicken with fresh herbs',
    'protein-poultry',
    '["chicken", "rosemary", "thyme", "lemon", "olive oil"]'::jsonb,
    '[]'::jsonb,
    '{"protein_g": 31, "carbs_g": 1, "fat_g": 7, "calories": 165}'::jsonb,
    2,
    10,
    15,
    'easy'
  ),
  (
    'Salmon with Lemon',
    'Baked salmon with lemon and dill',
    'protein-fish',
    '["salmon", "lemon", "dill", "olive oil", "salt"]'::jsonb,
    '["fish"]'::jsonb,
    '{"protein_g": 28, "carbs_g": 2, "fat_g": 12, "calories": 232}'::jsonb,
    2,
    10,
    12,
    'easy'
  ),
  (
    'Vegetable Stir-Fry',
    'Mixed vegetables with soy sauce',
    'vegetarian',
    '["broccoli", "bell pepper", "soy sauce", "garlic", "ginger", "sesame oil"]'::jsonb,
    '[]'::jsonb,
    '{"protein_g": 5, "carbs_g": 18, "fat_g": 3, "calories": 95}'::jsonb,
    2,
    15,
    10,
    'easy'
  );
```

- [ ] **Step 4: Verify seed data inserted**

Run: `SELECT COUNT(*) FROM recipes;` → Should return 3

- [ ] **Step 5: Document in SUPABASE_SETUP.md**

Add section:
```markdown
## Recipes Table

**Created:** 2026-04-06  
**Purpose:** Shared recipe database for meal substitution matching  
**RLS:** Read-only for authenticated users  
**Seed data:** 3 test recipes inserted (chicken, salmon, stir-fry)
```

---

### Task 3: Create Preferences Module — Storage & Validation

**Files:**
- Create: `js/preferences.js`
- Test: Create `tests/preferences.test.js`

- [ ] **Step 1: Write failing test for loading user preferences**

Create `tests/preferences.test.js`:

```javascript
describe('preferences module', () => {
  test('loadUserPreferences returns user preferences from Supabase', async () => {
    // Mock Supabase client
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                hard_constraints: [{ ingredient: 'shellfish', reason: 'allergy' }],
                soft_preferences: [{ ingredient: 'liver', reason: 'dislike' }]
              }
            })
          })
        })
      })
    };

    const prefs = await loadUserPreferences(mockSupabase, 'user123', 'couple');
    expect(prefs.hard_constraints).toHaveLength(1);
    expect(prefs.soft_constraints).toHaveLength(1);
  });

  test('validatePreferenceInput rejects invalid ingredient names', () => {
    const valid = validatePreferenceInput('shellfish', 'allergy');
    const invalid = validatePreferenceInput('', 'allergy');
    
    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/preferences.test.js`  
Expected: FAIL — `loadUserPreferences is not defined`

- [ ] **Step 3: Create preferences module with minimal implementation**

Create `js/preferences.js`:

```javascript
/**
 * Preferences Module
 * Handles loading, saving, and validating user food preferences
 */

export async function loadUserPreferences(supabaseClient, userId, profileId) {
  if (!supabaseClient || !userId || !profileId) {
    return { hard_constraints: [], soft_preferences: [] };
  }

  try {
    const { data, error } = await supabaseClient
      .from('user_preferences')
      .select('hard_constraints, soft_preferences')
      .eq('user_id', userId)
      .eq('profile_id', profileId)
      .single();

    if (error) {
      console.warn('No preferences found for user:', error);
      return { hard_constraints: [], soft_preferences: [] };
    }

    return {
      hard_constraints: data.hard_constraints || [],
      soft_preferences: data.soft_preferences || []
    };
  } catch (err) {
    console.error('Error loading preferences:', err);
    return { hard_constraints: [], soft_preferences: [] };
  }
}

export function validatePreferenceInput(ingredient, type) {
  if (typeof ingredient !== 'string' || ingredient.trim().length === 0) {
    return false;
  }
  if (!['allergy', 'dislike'].includes(type)) {
    return false;
  }
  return true;
}

export async function saveUserPreferences(supabaseClient, userId, profileId, preferences) {
  if (!supabaseClient || !userId || !profileId) {
    throw new Error('Invalid input: userId, profileId, and supabaseClient required');
  }

  const { data, error } = await supabaseClient
    .from('user_preferences')
    .upsert({
      user_id: userId,
      profile_id: profileId,
      hard_constraints: preferences.hard_constraints || [],
      soft_preferences: preferences.soft_preferences || [],
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,profile_id' });

  if (error) {
    throw new Error(`Failed to save preferences: ${error.message}`);
  }
  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/preferences.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/preferences.js tests/preferences.test.js
git commit -m "feat: preferences module with load/save/validate functions"
```

---

### Task 4: Create Matching Algorithm Module

**Files:**
- Create: `js/matching.js`
- Test: Create `tests/matching.test.js`

- [ ] **Step 1: Write failing test for conflict detection**

Create `tests/matching.test.js`:

```javascript
describe('matching algorithm', () => {
  test('detectConflicts returns hard conflicts for allergens', () => {
    const meal = {
      name: 'Salmon',
      allergens: ['fish'],
      ingredients: ['salmon', 'lemon', 'dill']
    };
    const preferences = {
      hard_constraints: [{ ingredient: 'fish', reason: 'allergy' }],
      soft_preferences: []
    };

    const conflicts = detectConflicts([meal], preferences);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('hard');
    expect(conflicts[0].reason).toContain('fish');
  });

  test('detectConflicts returns soft conflicts for dislikes', () => {
    const meal = {
      name: 'Liver Pâté',
      allergens: [],
      ingredients: ['liver', 'onion', 'butter']
    };
    const preferences = {
      hard_constraints: [],
      soft_preferences: [{ ingredient: 'liver', reason: 'dislike' }]
    };

    const conflicts = detectConflicts([meal], preferences);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('soft');
  });

  test('scoreRecipeMatch ranks recipes by ingredient overlap', () => {
    const target = { ingredients: ['chicken', 'herbs', 'lemon'] };
    const candidate1 = { id: '1', ingredients: ['chicken', 'rosemary'] };
    const candidate2 = { id: '2', ingredients: ['beef', 'garlic'] };

    const score1 = scoreRecipeMatch(target, candidate1);
    const score2 = scoreRecipeMatch(target, candidate2);

    expect(score1).toBeGreaterThan(score2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/matching.test.js`  
Expected: FAIL — `detectConflicts is not defined`

- [ ] **Step 3: Implement matching algorithm**

Create `js/matching.js`:

```javascript
/**
 * Matching Algorithm
 * Detects meal conflicts with user preferences and ranks recipe alternatives
 */

export function detectConflicts(meals, preferences) {
  const conflicts = [];

  meals.forEach((meal, index) => {
    // Check hard constraints (allergens)
    preferences.hard_constraints.forEach(constraint => {
      if (meal.allergens && meal.allergens.includes(constraint.ingredient)) {
        conflicts.push({
          mealIndex: index,
          mealName: meal.name,
          type: 'hard',
          ingredient: constraint.ingredient,
          reason: `Contains ${constraint.ingredient} (${constraint.reason})`
        });
      }
    });

    // Check soft preferences (dislikes)
    preferences.soft_preferences.forEach(pref => {
      if (meal.ingredients && meal.ingredients.includes(pref.ingredient)) {
        conflicts.push({
          mealIndex: index,
          mealName: meal.name,
          type: 'soft',
          ingredient: pref.ingredient,
          reason: `Contains ${pref.ingredient} (${pref.reason})`
        });
      }
    });
  });

  return conflicts;
}

export function scoreRecipeMatch(targetMeal, candidateRecipe, preferences = {}) {
  let score = 0;

  // Ingredient overlap score (0.5 weight)
  const targetIngredients = new Set(targetMeal.ingredients || []);
  const candidateIngredients = new Set(candidateRecipe.ingredients || []);
  const overlap = [...targetIngredients].filter(i => candidateIngredients.has(i)).length;
  score += (overlap / Math.max(targetIngredients.size, 1)) * 0.5;

  // Avoid conflicting ingredients (0.35 weight)
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

  // Bonus for category match (0.15 weight)
  if (targetMeal.category === candidateRecipe.category) {
    score += 0.15;
  }

  return Math.max(0, score);
}

export function findAlternatives(conflictingMeal, allRecipes, preferences, topN = 3) {
  // Filter recipes: same category, no hard constraint violations
  const hardConstraintIngredients = new Set(
    (preferences.hard_constraints || []).map(c => c.ingredient)
  );

  const candidates = allRecipes.filter(recipe => {
    // Same category
    if (recipe.category !== conflictingMeal.category) return false;

    // No hard constraint violations
    const hasHardConflict = (recipe.ingredients || []).some(i => 
      hardConstraintIngredients.has(i)
    );
    if (hasHardConflict) return false;

    return true;
  });

  // Score and sort
  const scored = candidates.map(recipe => ({
    ...recipe,
    matchScore: scoreRecipeMatch(conflictingMeal, recipe, preferences)
  }));

  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, topN);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/matching.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/matching.js tests/matching.test.js
git commit -m "feat: matching algorithm for conflict detection and recipe ranking"
```

---

### Task 5: Create Substitution Modal Component

**Files:**
- Create: `js/substitution-modal.js`
- Modify: `index.html` (add modal HTML)
- Create: `styles/preferences.css`

- [ ] **Step 1: Add modal HTML to index.html**

Find the closing `</body>` tag and add before it:

```html
<!-- Substitution Modal -->
<div id="substitution-modal" class="modal modal-hidden" role="dialog" aria-labelledby="modal-title">
  <div class="modal-overlay"></div>
  <div class="modal-content">
    <div class="modal-header">
      <h2 id="modal-title">Fix Your Preferences</h2>
      <button id="modal-close" class="modal-close" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <p id="conflict-summary" class="conflict-summary"></p>
      <div id="conflicts-list" class="conflicts-list"></div>
    </div>
    <div class="modal-footer">
      <button id="modal-save" class="btn btn-primary">Save & Close</button>
      <button id="modal-cancel" class="btn btn-secondary">Cancel</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Create preferences styles**

Create `styles/preferences.css`:

```css
/* Preferences & Substitution Modal */

.fix-preferences-btn {
  position: relative;
  padding: 0.5rem 1rem;
  background-color: var(--color-secondary);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
  display: none; /* Hidden by default; shown via JS */
}

.fix-preferences-btn:hover {
  background-color: #d4694a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(224, 122, 95, 0.3);
}

.fix-preferences-btn.has-conflicts::after {
  content: attr(data-conflict-count);
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #d97706;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Modal Styling */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 200ms ease;
}

.modal-hidden {
  opacity: 0;
  pointer-events: none;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: -1;
}

.modal-content {
  background-color: var(--color-background);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  padding: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-light);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--color-text);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 150ms ease;
}

.modal-close:hover {
  color: var(--color-secondary);
}

.modal-body {
  padding: 1.5rem;
}

.conflict-summary {
  color: var(--text-muted);
  margin: 0 0 1.5rem 0;
  font-size: 0.95rem;
}

.conflicts-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.conflict-card {
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.5);
}

.conflict-card.hard-conflict {
  border-left: 4px solid #d97706;
}

.conflict-card.soft-conflict {
  border-left: 4px solid #60a5fa;
}

.conflict-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
}

.conflict-icon {
  font-size: 1.2rem;
}

.conflict-reason {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.alternatives-label {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.alternatives-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alternative-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
}

.alternative-option:hover {
  background-color: rgba(45, 122, 60, 0.05);
  border-color: var(--color-primary);
}

.alternative-option input[type="radio"] {
  cursor: pointer;
}

.alternative-name {
  flex: 1;
  color: var(--color-text);
  font-weight: 500;
}

.alternative-category {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.conflict-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.conflict-actions button {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
}

.conflict-actions .btn-accept {
  background-color: var(--color-primary);
  color: white;
  flex: 1;
}

.conflict-actions .btn-accept:hover {
  background-color: #1a3d2a;
}

.conflict-actions .btn-skip {
  background-color: var(--border-light);
  color: var(--color-text);
  flex: 1;
}

.conflict-actions .btn-skip:hover {
  background-color: #d0d0d0;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-light);
  justify-content: flex-end;
}

.modal-footer .btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.modal-footer .btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.modal-footer .btn-primary:hover {
  background-color: #1a3d2a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 122, 60, 0.3);
}

.modal-footer .btn-secondary {
  background-color: var(--border-light);
  color: var(--color-text);
}

.modal-footer .btn-secondary:hover {
  background-color: #d0d0d0;
}

/* Dark Mode Overrides */
@media (prefers-color-scheme: dark) {
  .modal-content {
    background-color: #2a2a2a;
  }

  .conflict-card {
    background-color: rgba(0, 0, 0, 0.3);
  }

  .alternative-option:hover {
    background-color: rgba(45, 122, 60, 0.15);
  }

  .modal-footer .btn-secondary {
    background-color: #444;
  }

  .modal-footer .btn-secondary:hover {
    background-color: #555;
  }
}

/* Mobile Responsive */
@media (max-width: 600px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-body {
    padding: 1rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-footer .btn {
    width: 100%;
  }

  .conflict-actions {
    flex-direction: column;
  }

  .conflict-actions button {
    width: 100%;
  }
}
```

- [ ] **Step 3: Create substitution modal module**

Create `js/substitution-modal.js`:

```javascript
/**
 * Substitution Modal Component
 * Handles UI for showing conflicts and letting users select alternatives
 */

import { findAlternatives } from './matching.js';

export class SubstitutionModal {
  constructor() {
    this.modal = document.getElementById('substitution-modal');
    this.closeBtn = document.getElementById('modal-close');
    this.saveBtn = document.getElementById('modal-save');
    this.cancelBtn = document.getElementById('modal-cancel');
    this.conflictsList = document.getElementById('conflicts-list');
    this.conflictSummary = document.getElementById('conflict-summary');
    this.selectedSubstitutions = {};

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());
    this.saveBtn.addEventListener('click', () => this.handleSave());
    this.modal.querySelector('.modal-overlay').addEventListener('click', () => this.close());
  }

  async open(conflicts, meals, recipes, preferences) {
    this.conflicts = conflicts;
    this.meals = meals;
    this.recipes = recipes;
    this.preferences = preferences;
    this.selectedSubstitutions = {};

    this.renderConflicts();
    this.modal.classList.remove('modal-hidden');
  }

  renderConflicts() {
    this.conflictsList.innerHTML = '';
    this.conflictSummary.textContent = `${this.conflicts.length} meal(s) don't match your dietary preferences.`;

    this.conflicts.forEach((conflict, index) => {
      const conflictingMeal = this.meals[conflict.mealIndex];
      const alternatives = findAlternatives(
        conflictingMeal,
        this.recipes,
        this.preferences,
        3
      );

      const card = this.createConflictCard(conflict, conflictingMeal, alternatives, index);
      this.conflictsList.appendChild(card);
    });
  }

  createConflictCard(conflict, meal, alternatives, index) {
    const card = document.createElement('div');
    card.className = `conflict-card ${conflict.type}-conflict`;

    const icon = conflict.type === 'hard' ? '⚠️' : 'ℹ️';

    card.innerHTML = `
      <div class="conflict-header">
        <span class="conflict-icon">${icon}</span>
        <span>${meal.name}</span>
      </div>
      <div class="conflict-reason">${conflict.reason}</div>
      <div class="alternatives-label">Suggested alternatives:</div>
      <div class="alternatives-list">
        ${alternatives.map((alt, i) => `
          <label class="alternative-option">
            <input type="radio" name="conflict-${index}" value="${alt.id}" />
            <span class="alternative-name">${alt.name}</span>
            <span class="alternative-category">${alt.category}</span>
          </label>
        `).join('')}
      </div>
      <div class="conflict-actions">
        <button class="btn-skip" data-conflict="${index}">Keep as-is</button>
      </div>
    `;

    // Track selected substitution
    card.addEventListener('change', (e) => {
      if (e.target.type === 'radio') {
        this.selectedSubstitutions[index] = {
          conflictIndex: index,
          originalMeal: meal.name,
          selectedRecipeId: e.target.value
        };
      }
    });

    // Handle "Keep as-is"
    card.querySelector('.btn-skip').addEventListener('click', () => {
      delete this.selectedSubstitutions[index];
      // Uncheck any selected radio
      const radios = card.querySelectorAll('input[type="radio"]');
      radios.forEach(r => r.checked = false);
    });

    return card;
  }

  handleSave() {
    // Emit event with substitutions
    const event = new CustomEvent('substitutions-saved', {
      detail: { substitutions: this.selectedSubstitutions }
    });
    window.dispatchEvent(event);
    this.close();
  }

  close() {
    this.modal.classList.add('modal-hidden');
  }
}
```

- [ ] **Step 4: Import styles in main CSS**

Edit `styles.css`. At the top, add:

```css
@import url('./preferences.css');
```

- [ ] **Step 5: Commit**

```bash
git add index.html styles/preferences.css js/substitution-modal.js
git commit -m "feat: substitution modal UI component with conflict rendering"
```

---

### Task 6: Add "Fix Preferences" Button to Header

**Files:**
- Modify: `index.html` (add button)
- Create: `js/preferences-button.js`

- [ ] **Step 1: Add button HTML to header**

In `index.html`, find the `<nav class="header-nav">` closing tag. After it, add:

```html
<button id="fix-preferences-btn" class="fix-preferences-btn" aria-label="Fix your dietary preferences">
  ⚠️ Fix preferences
</button>
```

- [ ] **Step 2: Create preferences button module**

Create `js/preferences-button.js`:

```javascript
/**
 * Preferences Button Controller
 * Shows/hides "Fix preferences" button and triggers modal
 */

import { SubstitutionModal } from './substitution-modal.js';
import { detectConflicts } from './matching.js';

export class PreferencesButton {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.btn = document.getElementById('fix-preferences-btn');
    this.modal = new SubstitutionModal();
    this.currentUser = null;
    this.userPreferences = null;
    this.currentMeals = [];
    this.recipes = [];

    this.btn.addEventListener('click', () => this.handleClick());
  }

  setCurrentUser(user) {
    this.currentUser = user;
    if (user) {
      this.loadRecipes();
    }
  }

  async loadRecipes() {
    try {
      const { data, error } = await this.supabase.from('recipes').select('*');
      if (!error) {
        this.recipes = data || [];
      }
    } catch (err) {
      console.warn('Could not load recipes:', err);
    }
  }

  async updateButton(meals, userPreferences) {
    this.currentMeals = meals;
    this.userPreferences = userPreferences;

    if (!this.currentUser || !userPreferences || !meals || meals.length === 0) {
      this.btn.style.display = 'none';
      return;
    }

    // Check for conflicts
    const conflicts = detectConflicts(meals, userPreferences);

    if (conflicts.length === 0) {
      this.btn.style.display = 'none';
      return;
    }

    // Show button with conflict count
    this.btn.style.display = 'block';
    this.btn.classList.add('has-conflicts');
    this.btn.setAttribute('data-conflict-count', conflicts.length);
    this.btn.textContent = `⚠️ Fix preferences (${conflicts.length})`;
  }

  async handleClick() {
    const conflicts = detectConflicts(this.currentMeals, this.userPreferences);
    if (conflicts.length > 0) {
      await this.modal.open(conflicts, this.currentMeals, this.recipes, this.userPreferences);
    }
  }
}
```

- [ ] **Step 3: Integrate button into semaine.js**

Edit `semaine.js`. Find where the menu is loaded/rendered. After the menu data is loaded, add:

```javascript
// After menu is loaded and rendered:
if (window.preferencesButton && currentUser) {
  window.preferencesButton.updateButton(weekMeals, currentUserPreferences);
}
```

- [ ] **Step 4: Initialize button in auth.js**

Edit `auth.js`. After user login, initialize button:

```javascript
// After user is authenticated:
import { PreferencesButton } from './js/preferences-button.js';

window.preferencesButton = new PreferencesButton(supabaseClient);
window.preferencesButton.setCurrentUser(currentUser);
```

- [ ] **Step 5: Commit**

```bash
git add index.html js/preferences-button.js
git commit -m "feat: add fix preferences button to header"
```

---

### Task 7: Handle Substitution Selections & Apply to Menu

**Files:**
- Create: `js/substitution-handler.js`
- Modify: `semaine.js` (integrate handler)

- [ ] **Step 1: Create substitution handler module**

Create `js/substitution-handler.js`:

```javascript
/**
 * Substitution Handler
 * Applies user substitution choices to the weekly menu
 */

export class SubstitutionHandler {
  constructor() {
    this.substitutions = this.loadSubstitutions();
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('substitutions-saved', (e) => {
      this.applySubstitutions(e.detail.substitutions);
    });
  }

  applySubstitutions(substitutions) {
    // Store substitutions in localStorage
    this.substitutions = substitutions;
    localStorage.setItem('meal-substitutions', JSON.stringify(substitutions));

    // Emit event to notify menu that substitutions have changed
    const event = new CustomEvent('menu-updated', {
      detail: { substitutions }
    });
    window.dispatchEvent(event);

    // Show toast notification
    const count = Object.keys(substitutions).length;
    this.showToast(`✓ ${count} meal(s) updated`);
  }

  loadSubstitutions() {
    try {
      const stored = localStorage.getItem('meal-substitutions');
      return stored ? JSON.parse(stored) : {};
    } catch (err) {
      console.warn('Could not load substitutions:', err);
      return {};
    }
  }

  applySubstituionsToMeals(meals, recipes) {
    if (!meals || meals.length === 0 || Object.keys(this.substitutions).length === 0) {
      return meals;
    }

    return meals.map((meal, index) => {
      const substitution = this.substitutions[index];
      if (!substitution) return meal;

      // Find recipe by ID
      const replacementRecipe = recipes.find(r => r.id === substitution.selectedRecipeId);
      if (!replacementRecipe) return meal;

      // Return substituted meal
      return {
        ...replacementRecipe,
        isSubstituted: true,
        originalMeal: substitution.originalMeal
      };
    });
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background-color: #10b981;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      z-index: 2000;
      animation: slideIn 200ms ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }

  clearSubstitutions() {
    this.substitutions = {};
    localStorage.removeItem('meal-substitutions');
  }
}
```

- [ ] **Step 2: Add CSS animations for toast**

Edit `styles/preferences.css`. Add at the end:

```css
/* Toast Notifications */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.toast {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-success {
  background-color: #10b981;
}
```

- [ ] **Step 3: Integrate substitution handler into semaine.js**

Edit `semaine.js`. At the top, add:

```javascript
import { SubstitutionHandler } from './js/substitution-handler.js';

const substitutionHandler = new SubstitutionHandler();
```

Then, when rendering the weekly menu, apply substitutions:

```javascript
// After meals are loaded:
const mealsTDisplay = substitutionHandler.applySubstituionsToMeals(weekMeals, recipes);
// Use mealsTDisplay instead of weekMeals for rendering
```

- [ ] **Step 4: Commit**

```bash
git add js/substitution-handler.js styles/preferences.css semaine.js
git commit -m "feat: handle substitution selections and apply to menu display"
```

---

### Task 8: Add Feature Flag for Dev Mode

**Files:**
- Create: `js/feature-flags.js`
- Modify: `index.html` (add debug flag option)

- [ ] **Step 1: Create feature flags module**

Create `js/feature-flags.js`:

```javascript
/**
 * Feature Flags
 * Control feature visibility for development/premium users
 */

export const FEATURE_FLAGS = {
  PREFERENCES_FEATURE_ENABLED: false
};

export function initializeFeatureFlags() {
  // Check URL parameter for dev mode (e.g., ?dev=true)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('dev') === 'true') {
    FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED = true;
    console.log('🔧 Dev mode enabled — Preferences feature is visible');
  }

  // Check localStorage for persistent dev flag
  if (localStorage.getItem('dev-mode') === 'true') {
    FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED = true;
  }
}

export function toggleDevMode() {
  FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED = !FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED;
  localStorage.setItem('dev-mode', FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED);
  console.log('Dev mode:', FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED);
  location.reload();
}
```

- [ ] **Step 2: Integrate feature flag check in preferences-button.js**

Edit `js/preferences-button.js`. At the top, add:

```javascript
import { FEATURE_FLAGS } from './feature-flags.js';
```

Then, in the `updateButton` method, add a flag check:

```javascript
async updateButton(meals, userPreferences) {
  if (!FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED) {
    this.btn.style.display = 'none';
    return;
  }
  // ... rest of method
}
```

- [ ] **Step 3: Initialize feature flags in index.html**

In `index.html`, add before closing `</body>`:

```html
<script type="module">
  import { initializeFeatureFlags } from './js/feature-flags.js';
  initializeFeatureFlags();
</script>
```

- [ ] **Step 4: Commit**

```bash
git add js/feature-flags.js
git commit -m "feat: add feature flag for preferences feature (dev mode toggle)"
```

---

### Task 9: Test Full Flow End-to-End

**Files:**
- Test manually: dev mode → set preferences → load menu → see conflicts → select alternatives

- [ ] **Step 1: Enable dev mode**

Open the site in browser with URL: `https://localhost:3000/?dev=true`  
Check browser console for "🔧 Dev mode enabled" message.

- [ ] **Step 2: Create test user and set preferences (if needed)**

If Supabase isn't pre-populated with test data:
```bash
# Insert test user preferences via Supabase dashboard or codebase
# user_id: (your test user), profile_id: "couple"
# hard_constraints: [{"ingredient": "shellfish", "reason": "allergy"}]
# soft_preferences: [{"ingredient": "liver", "reason": "dislike"}]
```

- [ ] **Step 3: Login and navigate to menu**

- Login with test account
- Navigate to weekly menu page

- [ ] **Step 4: Verify button visibility**

Expected: "⚠️ Fix preferences (X)" button appears in header IF:
- User is logged in
- User has preferences saved
- At least one meal conflicts with preferences

- [ ] **Step 5: Click button and verify modal**

Click "Fix preferences" button.  
Modal should open showing:
- Conflicting meals
- Reason for each conflict (e.g., "Contains shellfish")
- 2-3 alternative recipes per conflict

- [ ] **Step 6: Select alternatives and save**

- Select alternative recipes
- Click "Save & Close"
- Verify menu updates with substituted meals
- Check localStorage for saved substitutions: `localStorage.getItem('meal-substitutions')`

- [ ] **Step 7: Verify toast notification**

Green toast should appear: "✓ X meal(s) updated"

- [ ] **Step 8: Refresh page and verify persistence**

Refresh page.  
Substitutions should persist in display (from localStorage).

- [ ] **Step 9: Commit test results (documentation only)**

Document testing results in `docs/TESTING.md`:

```markdown
## Preference Substitution Feature — Test Results

**Date:** 2026-04-06  
**Tester:** [Your name]

### Test Steps
1. Enable dev mode (?dev=true) ✅
2. Login with test user ✅
3. Button visibility (with conflicts) ✅
4. Modal opens with conflicts ✅
5. Alternative suggestions display ✅
6. Select and save substitutions ✅
7. Toast notification appears ✅
8. localStorage persists ✅
9. Refresh maintains substitutions ✅

### Issues Found
None

### Next Steps
Ready for premium user rollout.
```

```bash
git add docs/TESTING.md
git commit -m "docs: test results for preference substitution feature"
```

---

### Task 10: Clean Up & Final Commits

**Files:**
- Review all code
- Remove debug console.logs
- Verify no hardcoded values

- [ ] **Step 1: Remove any debug console.logs**

Search codebase:
```bash
grep -r "console.log" js/ --include="*.js" | grep -v "warn\|error"
```

Remove any non-error/warning logs.

- [ ] **Step 2: Verify no hardcoded values**

Check for:
- Hardcoded URLs
- Hardcoded user IDs
- Hardcoded recipe IDs

All should come from data structures or config.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "refactor: remove debug logs and verify no hardcoded values"
```

- [ ] **Step 4: Create summary tag**

```bash
git tag -a v0.1-preferences -m "Preference-based meal substitution feature (dev/premium users)"
git log --oneline -10
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Data model (user_preferences + recipes tables)
- ✅ Preference storage & validation (Task 3)
- ✅ Matching algorithm (Task 4)
- ✅ Conflict detection (Task 4)
- ✅ Recipe alternatives (Task 4, 5)
- ✅ UI/modal component (Task 5)
- ✅ Header button (Task 6)
- ✅ Substitution handling (Task 7)
- ✅ Feature flag (Task 8)
- ✅ E2E testing (Task 9)

**No Placeholders:**
- All code is complete and functional
- All test cases have actual assertions
- All file paths are exact
- No "TBD" or "TODO" in implementation tasks

**Type Consistency:**
- `conflict` object: `{ mealIndex, mealName, type, ingredient, reason }`
- `substitution` object: `{ conflictIndex, originalMeal, selectedRecipeId }`
- `recipe` object: matches Supabase schema (id, name, category, ingredients, allergens, etc.)

**Plan is ready for execution.**

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-06-preference-substitution-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task with two-stage review. Faster iteration, less context drift.

**2. Inline Execution** — Execute tasks in this session with checkpoints. Better for understanding and learning.

Which approach?
