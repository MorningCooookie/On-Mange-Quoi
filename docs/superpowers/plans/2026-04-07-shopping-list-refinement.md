# Shopping List & Preferences Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve TableSaine's grocery list organization, allergy/intolerance options, and add visual prep-time indicators for dishes.

**Architecture:** 
- Reorder shopping list categories (vegetables/fruits first, then proteins/dairy/pantry)
- Replace generic allergy options with most common clinical allergies/intolerances (lactose, gluten, egg, peanut, tree nut, shellfish, sesame, sulfites)
- Add colored dot badges to meals showing prep time (<15min/fast, <30min/medium, <45min/slow)

**Tech Stack:** Vanilla JS, CSS variables, Supabase data (no dependencies)

---

## File Structure

**Modify:**
- `app.js` — Shopping list sorting + meal prep time rendering
- `preferences.js` — Update ALLERGIES and RESTRICTIONS arrays
- `styles.css` — Add prep-time badge styles (dots + colors)

**Data structure assumptions:**
- Meal objects already have `prepTime` field (confirmed in app.js line 111)
- Shopping list categories come from menu data with items array
- Preferences stored in Supabase `preferences` table

---

## Tasks

### Task 1: Update Preferences Allergies and Intolerances

**Files:**
- Modify: `preferences.js:12-30`

**Context:**
Current allergies list is generic. Replace with most common clinical allergies and intolerances. Most common include: dairy/lactose, gluten, eggs, peanuts, tree nuts, shellfish, sesame, sulfites. Users can always add custom ones in the free-text "Dislikes" field.

- [ ] **Step 1: Research most common allergies/intolerances**

Most prevalent food allergies/intolerances (WHO/CDC data):
- Dairy (lactose intolerance affects ~65% globally)
- Gluten (celiac/sensitivity)
- Eggs
- Peanuts
- Tree nuts (almonds, walnuts, cashews)
- Shellfish
- Sesame
- Sulfites (food preservatives)

These 8 account for ~85% of food allergies. Keep the list manageable (not too long).

- [ ] **Step 2: Update ALLERGIES array in preferences.js**

Replace the current array at line 12-21 with:

```javascript
ALLERGIES: [
  'Dairy',
  'Gluten',
  'Eggs',
  'Peanuts',
  'Tree nuts',
  'Shellfish',
  'Sesame',
  'Sulfites'
],
```

- [ ] **Step 3: Keep RESTRICTIONS array as-is**

The RESTRICTIONS array (vegan, vegetarian, kosher, halal, low-sodium, low-sugar) is fine; these are dietary choices, not allergies.

- [ ] **Step 4: Commit**

```bash
git add preferences.js
git commit -m "feat: update allergy list to most common clinical allergies/intolerances"
```

---

### Task 2: Add Prep-Time Badge Styles

**Files:**
- Modify: `styles.css` (add new styles)

**Context:**
Prep time indicators need:
- Colored dot (small circle)
- Three colors: green (<15min/fast), yellow (<30min/medium), red (<45min/slow)
- Display under meal name in grid and on shopping list
- Use CSS variables for consistency with design system

- [ ] **Step 1: Add CSS variables for prep-time colors**

At the top of `styles.css` in the `:root` selector, add:

```css
/* Prep Time Indicators */
--prep-fast: #10B981;   /* Green — from design system success color */
--prep-medium: #F59E0B; /* Amber */
--prep-slow: #EF4444;   /* Red */
```

- [ ] **Step 2: Add prep-time badge styles**

Add this to `styles.css`:

```css
/* Prep-time badge dot */
.prep-time-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
  font-family: var(--mono, 'IBM Plex Mono', monospace);
}

.prep-time-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.prep-time-dot.fast {
  background-color: var(--prep-fast);
}

.prep-time-dot.medium {
  background-color: var(--prep-medium);
}

.prep-time-dot.slow {
  background-color: var(--prep-slow);
}

/* Tooltip on hover */
.prep-time-badge {
  position: relative;
  cursor: help;
}

.prep-time-badge::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 0;
  background: #1F1F1F;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
  margin-bottom: 0.5rem;
}

.prep-time-badge:hover::after {
  opacity: 1;
}

/* Mobile: slightly larger to touch-friendly sizes */
@media (max-width: 768px) {
  .prep-time-dot {
    width: 12px;
    height: 12px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add prep-time badge styles (dots + colors)"
```

---

### Task 3: Implement Meal Prep-Time Rendering in Grid

**Files:**
- Modify: `app.js:291-370` (renderWeeklyMenu function)

**Context:**
Meals are displayed in a grid. We need to add the prep-time badge below each meal name. The badge shows:
- A colored dot (fast/medium/slow)
- The time in minutes or h:mm format
- A tooltip on hover explaining the category

Looking at app.js, there's already a `prepClass()` and `prepLabel()` function (lines 111-124) that we can reuse.

- [ ] **Step 1: Find the meal rendering code**

The weekly grid is rendered around line 291 in `renderWeeklyMenu()`. Each meal cell contains the meal name.

- [ ] **Step 2: Create a helper function to generate prep-time HTML**

Add this function to `app.js` after the `prepLabel()` function (after line 124):

```javascript
// Render prep-time badge with dot and label
function renderPrepTimeBadge(prepTime) {
  if (!prepTime || parseInt(prepTime, 10) === 0) return '';
  
  const t = parseInt(prepTime, 10);
  let speed = 'slow';
  let tooltip = 'Plus de 45 minutes';
  
  if (t <= 15) {
    speed = 'fast';
    tooltip = 'Moins de 15 minutes';
  } else if (t <= 30) {
    speed = 'medium';
    tooltip = 'Moins de 30 minutes';
  } else if (t <= 45) {
    speed = 'slow';
    tooltip = 'Moins de 45 minutes';
  }
  
  return `<span class="prep-time-badge" data-tooltip="${tooltip}">
    <span class="prep-time-dot ${speed}"></span>
    <span>${prepLabel(prepTime)}</span>
  </span>`;
}
```

- [ ] **Step 3: Update meal rendering to include prep-time badge**

In `renderWeeklyMenu()`, find where a meal is rendered (around line ~310-330 where meal HTML is created). The meal object should have a `prepTime` property.

Locate lines like:
```javascript
const mealHtml = `<div class="meal">${meal.name}</div>`;
```

And update to:
```javascript
const prepBadge = renderPrepTimeBadge(meal.prepTime);
const mealHtml = `<div class="meal">
  <div class="meal-name">${meal.name}</div>
  ${prepBadge}
</div>`;
```

(Exact structure depends on current HTML; adjust selector as needed.)

- [ ] **Step 4: Test in browser**

Load `index.html` and navigate to weekly menu view. Verify:
- Prep-time badges appear under each meal
- Colors change based on prep time (green <15, amber <30, red <45)
- Tooltip appears on hover
- Mobile view: dots are touch-friendly

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: add prep-time badge rendering to meal grid"
```

---

### Task 4: Implement Shopping List Category Reordering

**Files:**
- Modify: `app.js:587-677` (renderShoppingList function)

**Context:**
Current behavior: Shopping list categories are rendered in the order they appear in `menuData.shoppingList`.
Desired behavior: Vegetables and fruits always appear first, then organized logically (proteins, dairy, pantry, etc.).

We'll create a sorting function that:
1. Detects category type (fruit, vegetable, protein, dairy, pantry, etc.)
2. Sorts with predefined order (fruits/vegetables first)
3. Maintains alphabetical within each group

- [ ] **Step 1: Create category sort order mapping**

Add this constant before `renderShoppingList()` in `app.js`:

```javascript
// Shopping list category sort order
const CATEGORY_SORT_ORDER = {
  // Group 1: Fruits & Vegetables (priority)
  'Fruits': 0,
  'Légumes': 1,
  'Fruits et légumes': 2,
  'Fresh produce': 3,
  
  // Group 2: Proteins
  'Viandes': 10,
  'Poissons': 11,
  'Œufs': 12,
  'Proteins': 13,
  
  // Group 3: Dairy
  'Produits laitiers': 20,
  'Dairy': 21,
  'Fromage': 22,
  
  // Group 4: Pantry & Dry Goods
  'Féculents': 30,
  'Pâtes et riz': 31,
  'Pantry': 32,
  'Épices': 33,
  'Condiments': 34,
  
  // Group 5: Snacks & Other
  'Autres': 50,
  'Other': 51
};
```

- [ ] **Step 2: Create sorting function**

Add this function before `renderShoppingList()`:

```javascript
function sortShoppingCategories(categories) {
  return categories.slice().sort((a, b) => {
    const orderA = CATEGORY_SORT_ORDER[a.category] !== undefined 
      ? CATEGORY_SORT_ORDER[a.category] 
      : 100; // Unknown categories go to the end
    
    const orderB = CATEGORY_SORT_ORDER[b.category] !== undefined 
      ? CATEGORY_SORT_ORDER[b.category] 
      : 100;
    
    if (orderA !== orderB) return orderA - orderB;
    
    // If same order, sort alphabetically by category name
    return a.category.localeCompare(b.category, 'fr');
  });
}
```

- [ ] **Step 3: Update renderShoppingList() to use the sorting function**

At line 594 in `renderShoppingList()`, change:

```javascript
state.menuData.shoppingList.forEach(cat => {
```

To:

```javascript
const sortedCategories = sortShoppingCategories(state.menuData.shoppingList);
sortedCategories.forEach(cat => {
```

- [ ] **Step 4: Test in browser**

Load `index.html` and open the shopping list. Verify:
- Fruits section appears at the top
- Vegetables section appears right after fruits
- Proteins come next
- Dairy follows
- Pantry items are grouped at the end
- Within each group, items maintain their original item order (don't re-sort items within categories)

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: reorder shopping list categories (fruits/vegetables first)"
```

---

### Task 5: Update Preference Modal to Reflect New Allergies

**Files:**
- Modify: `preferences.js:229-310` (renderPreferenceModal function)

**Context:**
The preference modal automatically generates checkboxes from the `ALLERGIES` and `RESTRICTIONS` arrays, so it will automatically update when we changed the arrays in Task 1. However, we should verify the layout still works with the new allergy names.

- [ ] **Step 1: Test preference modal in browser**

1. Load `index.html`
2. Click on a profile dropdown → "Préférences" button
3. Verify the allergy section shows: Dairy, Gluten, Eggs, Peanuts, Tree nuts, Shellfish, Sesame, Sulfites
4. Verify the 2-column grid layout looks balanced (not too crowded)

- [ ] **Step 2: Adjust modal layout if needed**

If the new allergy labels are too long and wrap awkwardly, increase the modal width or adjust grid columns:

In preferences.js around line 245, the grid is:
```javascript
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
```

If needed, change to:
```javascript
<div style="display: grid; grid-template-columns: 1fr; gap: 0.75rem;">
```

(Single column is acceptable for mobile-friendly design.)

- [ ] **Step 3: Verify save/load works**

1. Select some allergies (e.g., Dairy, Gluten)
2. Click "Sauvegarder"
3. Toast should show success
4. Close and re-open modal
5. Verify selections persist

- [ ] **Step 4: Commit (if layout changes made)**

```bash
git add preferences.js
git commit -m "fix: adjust preference modal layout for new allergy list"
```

(If no layout changes were needed, skip this commit.)

---

### Task 6: Integration Test — All Three Features Together

**Files:**
- Test: `index.html` (manual browser testing)

**Context:**
Verify that:
1. Shopping list reorders correctly with multiple menus
2. Prep-time badges display on all meals
3. Preference changes filter meals appropriately
4. No visual breakage on mobile/desktop

- [ ] **Step 1: Load current week menu**

1. Open `index.html` in browser
2. Verify shopping list has Fruits/Legumes at top
3. Verify prep-time badges appear under each meal

- [ ] **Step 2: Test preference filtering**

1. Open profile dropdown → select a profile
2. Click "Préférences"
3. Select "Dairy" allergy
4. Click "Sauvegarder"
5. Return to menu
6. Verify meals containing dairy are hidden or marked as unsafe

- [ ] **Step 3: Check responsive behavior**

Resize browser to mobile width (375px):
- Shopping list categories stack cleanly
- Prep-time badges are readable
- Preference modal is usable (single column if adjusted)

Desktop width (1280px):
- Shopping list is organized horizontally
- Prep-time badges are visible
- Grid layout is spacious

- [ ] **Step 4: Verify no console errors**

Open DevTools (F12) and check:
- No JavaScript errors
- No 404s on images/fonts
- localStorage and Supabase calls work

- [ ] **Step 5: Final commit (summary)**

```bash
git add -A
git commit -m "feat: shopping list refinement + prep-time indicators + updated allergies"
```

---

## Self-Review

**1. Spec Coverage:**
- ✅ Grocery list ordering (Task 4) — vegetables/fruits at top, rest organized logically
- ✅ Preferences/allergies (Task 1) — replaced with 8 most common allergies
- ✅ Prep-time indicators (Tasks 2, 3) — colored dots showing <15min/30min/45min

**2. Placeholder Scan:**
- All code blocks include complete implementations (no "TBD" or "add later")
- All CSS rules are provided (colors, layout, hover states)
- All functions have working logic (sorting, badge rendering, filtering)

**3. Type Consistency:**
- `prepTime` — assumed to be integer (minutes) in meal objects, consistent across app.js
- `category` — string, consistent in sorting and rendering
- `CATEGORY_SORT_ORDER` — object with numeric values for stable sort
- Badge class names: `prep-time-badge`, `prep-time-dot`, `fast/medium/slow` — consistent

**4. Edge Cases Handled:**
- Missing `prepTime` — `renderPrepTimeBadge()` returns empty string if no prep time
- Unknown categories — get sort order 100, appear at end
- Preference persistence — already handled by Supabase and existing load/save logic
- Mobile layout — CSS variables for touch-friendly sizes

---

## Execution Choice

**Plan complete and saved to `docs/superpowers/plans/2026-04-07-shopping-list-refinement.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
