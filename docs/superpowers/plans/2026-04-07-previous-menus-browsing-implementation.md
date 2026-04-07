# Previous Menus Browsing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the date parameter bug, update icon consistency, and ensure the back button is visually clear so users can browse previous menus seamlessly.

**Architecture:** Three targeted fixes on the `semaine.html` page and its supporting JavaScript:
1. Debug and fix the week parameter loading logic in `semaine.js`
2. Update the favicon in `semaine.html` to match the main page icon
3. Enhance the back button styling in `semaine.css` for better visibility

**Tech Stack:** Vanilla JavaScript, HTML5, CSS3 (no frameworks)

---

## File Summary

| File | Change | Purpose |
|------|--------|---------|
| `semaine.js` | Modify: Fix week parameter / JSON loading logic | Ensure correct menu loads for requested week |
| `semaine.html` | Modify: Update favicon | Visual consistency across pages |
| `semaine.css` | Modify: Add `.semaine-btn--back` styling | Make back button more prominent |

---

## Task 1: Debug and Fix the Week Parameter Bug

**Files:**
- Modify: `semaine.js` (lines 101-117: the `init()` function)

**Problem:** When clicking a history card with `week=2026-03-30`, the page loads the previous week's menu instead of the requested week.

**Root Cause:** Likely in how the week parameter is parsed or how the JSON filename is constructed.

- [ ] **Step 1: Add debug logging to `semaine.js`**

Open `semaine.js` and locate the `init()` function (line 101). Add logging after line 102:

```javascript
async function init() {
  const week = await getWeekParam();
  console.log('DEBUG: week parameter received:', week);  // ← ADD THIS
  if (!week) {
    renderError('Aucun menu trouvé. Vérifiez l\'URL ou ouvrez le site principal.');
    return;
  }

  try {
    const url = `data/menus/${week}.json`;
    console.log('DEBUG: fetching URL:', url);  // ← ADD THIS
    const data = await fetch(url).then(r => {
      if (!r.ok) throw new Error(`Menu ${week} introuvable`);
      return r.json();
    });
    renderMenu(data);
  } catch (err) {
    renderError(`Impossible de charger le menu (${err.message}).`);
  }
}
```

- [ ] **Step 2: Test in browser and check console**

1. Open the site in your browser
2. Click History button
3. Click "Voir ce menu" on a past week (e.g., 30 mars – 5 avr, which should be `week=2026-03-30`)
4. Open DevTools (F12) → Console tab
5. Look for the two debug logs:
   - `DEBUG: week parameter received: 2026-03-30`
   - `DEBUG: fetching URL: data/menus/2026-03-30.json`
6. Check if the file exists: does `data/menus/2026-03-30.json` exist and contain the correct week?

**Expected outcome:** Identify whether:
- A) The URL parameter is being read correctly but the JSON is wrong
- B) The URL parameter is being parsed incorrectly (e.g., off by one week)
- C) The history page is generating wrong links

- [ ] **Step 3: Verify the history page link generation**

Check where the history page is generated. If it's in HTML or another file, verify the "Voir ce menu" links are correctly formatted as:

```html
<a href="semaine.html?week=2026-03-30">Voir ce menu →</a>
```

Not something like:

```html
<a href="semaine.html?week=2026-04-06">Voir ce menu →</a>  <!-- Wrong! Off by a week -->
```

- [ ] **Step 4: If the parameter is correct, check the JSON file**

If debug logging shows `week=2026-03-30` and `data/menus/2026-03-30.json`, then the bug is in the JSON:

1. Open `data/menus/2026-03-30.json`
2. Check the `weekStart` and `weekEnd` fields — do they match the actual week (March 30 – April 5)?
3. If the JSON is mislabeled (e.g., contains March 23–29 instead), that's the bug

- [ ] **Step 5: Fix the identified issue**

**If Bug A (URL parameter read correctly, JSON is mislabeled):**
- Rename the JSON files to match the correct week start date
- OR, fix the data inside the JSON files

**If Bug B (URL parameter parsed wrong):**
- Example: if clicking "30 mars – 5 avr" loads "23 mars – 29 mars" instead, the code might be doing `getWeekParam()` and then adding/subtracting a week
- Check the `getWeekParam()` function (lines 25-37) — verify it returns the raw `week` parameter without modification
- If it's being modified, remove the modification

**If Bug C (history page generates wrong links):**
- The history page must pass the Monday of each week as the `week` parameter
- Update links to use the correct date

- [ ] **Step 6: Remove debug logging and test again**

Once you've identified and fixed the bug:

1. Remove the two `console.log()` debug lines from `semaine.js`
2. Test the fix: click History, click a past week, verify the correct menu loads
3. Test with multiple past weeks to confirm consistency

- [ ] **Step 7: Commit**

```bash
git add semaine.js
git commit -m "fix: correct week parameter parsing in semaine.js"
```

---

## Task 2: Update Favicon for Icon Consistency

**Files:**
- Modify: `semaine.html` (line 11)

**Goal:** Make the `semaine.html` page use the same icon as the main `index.html` page.

- [ ] **Step 1: Check the main page icon**

Open `index.html` and locate the favicon line (usually in `<head>`):

```bash
grep -n "rel=\"icon\"" index.html
```

Example output:
```
11:<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍽️</text></svg>">
```

Note the exact icon emoji or SVG being used.

- [ ] **Step 2: Compare with semaine.html**

Open `semaine.html` and check line 11:

```bash
grep -n "rel=\"icon\"" semaine.html
```

Current output (from earlier):
```
11:<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥗</text></svg>">
```

Is the icon different? (🥗 vs 🍽️ or another emoji)

- [ ] **Step 3: If icons differ, update semaine.html**

Copy the exact favicon line from `index.html` and paste it into `semaine.html` line 11:

**Before:**
```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥗</text></svg>">
```

**After:**
```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍽️</text></svg>">
```

(Replace the emoji with whatever is in `index.html`)

- [ ] **Step 4: Test in browser**

1. Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)
2. Check the browser tab — does the favicon match the main page now?
3. Test on both `index.html` and `semaine.html` to confirm consistency

- [ ] **Step 5: Commit**

```bash
git add semaine.html
git commit -m "fix: update favicon to match main page icon"
```

---

## Task 3: Enhance Back Button Visibility

**Files:**
- Modify: `semaine.css` (add new rule after line 207)
- Reference: `semaine.html` (verify button structure)

**Goal:** Make the back button more visually prominent so users can easily navigate back to the history list.

- [ ] **Step 1: Verify back button exists in HTML**

Check `semaine.html` for the back button:

```bash
grep -n "semaine-btn--back" semaine.html
```

Expected output:
```
36:<button class="semaine-btn semaine-btn--back" onclick="window.history.back()">← Retour</button>
```

If not found, add it to the `.semaine-actions` div:

```html
<div class="semaine-actions">
  <button class="semaine-btn semaine-btn--back" onclick="window.history.back()">← Retour</button>
  <button class="semaine-btn semaine-btn--share" id="btn-partager">Partager ce lien</button>
</div>
```

- [ ] **Step 2: Add CSS rule for `.semaine-btn--back`**

Open `semaine.css`. Find the `.semaine-btn--share` rule (around line 201):

```css
.semaine-btn--share {
  background: var(--green);
  color: #fff;
  border-color: transparent;
}

.semaine-btn--share:hover { background: var(--green-light); }
```

After line 207, add this new rule for the back button:

```css
.semaine-btn--back {
  background: var(--card-bg);
  border-color: var(--green);
  color: var(--green);
  font-weight: 700;
}

.semaine-btn--back:hover {
  background: var(--green);
  color: #fff;
  border-color: var(--green);
}
```

This makes the back button:
- **Normal state:** Card-colored background with green border and green text (stands out from generic buttons)
- **Hover state:** Green background with white text (matches the visual language of the share button)

- [ ] **Step 3: Test on mobile and desktop**

1. **Desktop (1280px+):**
   - Load `semaine.html?week=2026-03-30`
   - Verify the back button appears next to the share button
   - Hover over it — does it turn green?

2. **Mobile (375px):**
   - Use DevTools device emulation (F12 → Device Toolbar)
   - Set to iPhone 12 (375px width)
   - Load `semaine.html?week=2026-03-30`
   - Verify back button is still readable and clickable (touch-target size ≥ 48px)
   - Click it — does `window.history.back()` work?

3. **Both modes:**
   - Verify the button doesn't overlap or break the layout
   - Check that it's still centered in `.semaine-actions`

- [ ] **Step 4: Test the complete flow**

1. Go to `index.html`
2. Click the History button
3. Click "Voir ce menu" on a past week
4. Verify the back button is visible and styled correctly
5. Click the back button
6. Verify you're back at the history page

- [ ] **Step 5: Commit**

```bash
git add semaine.css
git commit -m "style: enhance back button visibility with green border and hover state"
```

---

## Task 4: Full Integration Test

**Goal:** Verify the complete user flow works end-to-end.

- [ ] **Step 1: Test the complete journey**

1. Open the site at `index.html`
2. Click "History" button (in header)
3. View "Semaines précédentes" page with menu cards
4. Click "Voir ce menu" on any past week card
5. **Verify:** The correct week's full menu loads (check dates, meals, shopping list)
6. Verify the icon in the browser tab matches the main page icon
7. Verify the back button is visible and styled
8. Click the back button
9. **Verify:** You return to the history page

- [ ] **Step 2: Test on mobile**

1. Open DevTools (F12) → Device Toolbar
2. Select iPhone 12 (375px)
3. Repeat Step 1
4. Verify all text is readable and buttons are clickable on small screens

- [ ] **Step 3: Check for console errors**

1. Open DevTools → Console tab
2. Reload the page
3. Verify there are no red error messages
4. If there are errors, fix them before committing

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: previous menus browsing - fix date bug, update icon, enhance back button"
```

---

## Testing Checklist

- [ ] Week parameter bug is fixed (correct week loads, not previous week)
- [ ] Icon on `semaine.html` matches main page icon
- [ ] Back button is visible and styled consistently
- [ ] Back button works on desktop and mobile
- [ ] No console errors
- [ ] Complete flow works: History → View Week → Back

---

## Success Criteria

✅ Clicking history card for `week=2026-03-30` loads that exact week (not the previous week)

✅ Favicon matches across `index.html` and `semaine.html`

✅ Back button is prominent, accessible, and returns to history list

✅ All changes work on mobile (375px) and desktop (1280px)

✅ No breaking changes to existing functionality (share button still works)
