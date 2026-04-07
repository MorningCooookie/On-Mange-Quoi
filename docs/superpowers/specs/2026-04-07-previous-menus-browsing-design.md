# Design Spec: Previous Menus Browsing

**Date:** 2026-04-07  
**Status:** Draft  
**Goal:** Enable users to easily browse and view past weekly menus through a simple, streamlined flow.

---

## Overview

Users can already access historical menus via the **History button** in the header, which displays "Semaines précédentes" (Previous weeks) — a card-based list of past menus. This spec defines the complete user experience for:

1. Viewing the history list
2. Navigating to a specific past menu's full details
3. Returning to history to browse more weeks

The design prioritizes **simplicity** — reusing existing pages and components, fixing a bug in the share functionality, and polishing the icon consistency.

---

## Problem Statement

Currently:
- The History page exists and displays past menu cards ✓
- But the "Share" feature shows the **previous week** instead of the **current week** ✗
- The icon on `semaine.html` doesn't match the main page icon ✗
- The back button on the menu view page exists but may not be visually prominent ✗

**What we're solving:**
- Fix the share/history bug so users see the correct week when clicking "Voir ce menu"
- Ensure visual consistency across pages (icon update)
- Make the back button clear and accessible

---

## Architecture

### Pages Involved
- **`index.html`** — Main meal planner (has History button in header)
- **`semaine.html`** — Weekly menu display page (shareable/printable view)
- **Implicit history page** — "Semaines précédentes" (already exists; accessed via History button)

### Key Components (Reused)
- **Menu Cards** on history page — display week date, health score, 3-4 meal previews, "Voir ce menu" link
- **semaine.html structure** — full 7-day grid, shopping list, health score breakdown
- **Back button** — navigate back to history from menu view

---

## User Flow

```
┌─────────────────────────────────────────┐
│ User on index.html (main planner)       │
└──────────────┬──────────────────────────┘
               │
               │ Click "History" button (header)
               ↓
┌─────────────────────────────────────────┐
│ "Semaines précédentes" page             │
│ - Card 1: 6 avr – 12 avr (current)     │
│ - Card 2: 30 mars – 5 avr              │
│ - Card 3: 23 mars – 29 mars            │
│ ...                                     │
└──────────────┬──────────────────────────┘
               │
               │ Click "Voir ce menu →" on any card
               │ (e.g., week=2026-03-30)
               ↓
┌─────────────────────────────────────────┐
│ semaine.html?week=2026-03-30            │
│ - Full 7-day grid for that week         │
│ - Shopping list                         │
│ - Health score & details                │
│ - Back button (top-left)                │
│ - Share button (still works)            │
└──────────────┬──────────────────────────┘
               │
               │ Click back button
               ↓
┌─────────────────────────────────────────┐
│ Return to "Semaines précédentes"        │
│ (ready to browse another week)          │
└─────────────────────────────────────────┘
```

---

## Visual & UI Changes

### 1. Icon Update on `semaine.html`
**Current:** `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥗</text></svg>">`

**Desired:** Match the icon from `index.html` (use the same emoji or SVG if it's different).

**Implementation:**
- Check what icon is on the main page
- Replace the `semaine.html` favicon to match
- One-line change in the `<head>`

### 2. Back Button Styling
**Current state:** Exists in `semaine.html` as `<button class="semaine-btn semaine-btn--back">`

**Desired state:**
- Position: Always visible in top-left or top navigation
- Styling: Matches your design system (Forest Green primary color, 6px border radius, consistent padding)
- Accessibility: High contrast, clear label ("← Retour" or similar)
- Visibility: Should be immediately obvious when user lands on the menu page

**No changes needed if already styled correctly** — verify against `DESIGN.md` button specs.

### 3. History Page (No Changes)
The "Semaines précédentes" page is already well-designed:
- Clean card layout
- Week date range, health score badge, meal previews
- "Voir ce menu →" links that are clear CTAs
- This page requires **no modifications** — only the linked pages need fixing

---

## Technical Implementation

### Fix #1: Share Bug (Incorrect Date Parameter)
**Issue:** When clicking "Voir ce menu" on a history card (e.g., `?week=2026-03-30`), the page loads the previous week's menu instead of the requested week.

**Root Cause:** Likely in `semaine.js` — the date parameter may not be read correctly from the URL, or the JSON file path is offset by a week.

**Solution:**
1. Check `semaine.js` for how `?week=` parameter is parsed
2. Verify the correct JSON file is loaded from `data/menus/YYYY-MM-DD.json`
3. Test with multiple past weeks to confirm the fix

**Success Criteria:** Clicking a card for week `2026-03-30` loads that exact week's menu, not the previous one.

### Fix #2: Icon Consistency
**Implementation:**
1. Identify the icon used on `index.html`
2. Copy that same emoji or SVG reference
3. Update the `<link rel="icon">` in `semaine.html` to match
4. Verify it displays correctly in the browser tab

### Fix #3: Back Button Confirmation
**Implementation:**
1. Verify `semaine.html` already has the back button element
2. Check its CSS styling against `DESIGN.md` button specs (6px border radius, Forest Green, proper padding)
3. If styling doesn't match, update to use CSS variables and proper spacing
4. Test on mobile (375px) and desktop (1280px) to ensure it's visible

---

## Data & Parameters

**URL Structure:**
- Current week: `semaine.html` (no params) OR `semaine.html?week=<current-monday-date>`
- Past week: `semaine.html?week=2026-03-30` (Monday of that week)

**JSON Files Expected:**
- Located at `data/menus/YYYY-MM-DD.json` (Monday of each week)
- Contains: weekStart, weekEnd, healthScore, days[], shoppingList[], healthAlerts[]

**No new data structures needed** — existing format already supports this.

---

## Error Handling

**Edge Cases:**
1. User clicks a week for which no JSON file exists → Show "Menu not available" message
2. User's browser doesn't support `history.back()` → Graceful fallback (link to history page)
3. Invalid date parameter in URL → Load current week as default

**Implementation:**
- Already handled by existing error messages in `semaine.js` (confirm they exist)
- Add a fallback "back to history" link if needed

---

## Testing Checklist

- [ ] Fix: Clicking history card for `week=2026-03-30` loads that week (not the previous week)
- [ ] Fix: Icon on `semaine.html` matches the icon on `index.html`
- [ ] Fix: Back button is visible and styled consistently
- [ ] Test: Back button works on mobile (375px) and desktop (1280px)
- [ ] Test: Clicking back from any historical week returns to history page
- [ ] Test: Share button on historical week menu still works correctly
- [ ] Test: No console errors when loading past menus
- [ ] Visual: Confirm dark mode works on both pages

---

## Success Criteria

✅ Users can click History → view past menu cards → click any card → see full menu → click back → return to history

✅ The correct week's menu loads (no off-by-one bug)

✅ Icon and button styling are consistent across pages

✅ All flows work on mobile and desktop

✅ No new code complexity introduced — only fixes and polishing

---

## Design Decisions Log

| Decision | Choice | Rationale | Trade-offs |
|----------|--------|-----------|-----------|
| **Navigation pattern** | Back button only (Option 2) | Simple, reuses existing patterns, no new UI complexity | Can't jump between weeks without returning to history; acceptable for occasional browsing |
| **Icon consistency** | Match main page emoji/SVG | Reinforces brand identity across pages | Minor visual polish; doesn't affect functionality |
| **No new components** | Reuse existing cards, buttons, layout | Faster to ship, less code to maintain, lower risk | History page stays as-is; no enhancements to card design yet |
| **Data structure** | Keep existing JSON format | Avoids migration, works with current system | No changes to backend or data | 

---

## Out of Scope

- Adding a week picker/calendar on the menu page (Option 1/3 were rejected)
- Redesigning the history page cards
- Changing the menu data structure
- Analytics tracking for history browsing
- Exporting/downloading past menus

---

## Files to Modify

1. **`semaine.html`** — Update favicon, verify back button styling
2. **`semaine.js`** — Fix the date parameter bug (if needed), verify JSON loading logic
3. **`semaine.css`** (if it exists) — Ensure back button styling matches design system

---

## Timeline & Effort

- **Fix share bug:** 10-15 min (debug + test)
- **Update icon:** 2 min
- **Back button styling verification:** 5 min
- **Testing across devices:** 10 min
- **Total:** ~30 min if bug is straightforward; up to 1 hour if date logic is complex

---

## Approval Gate

This spec is ready for review. Please confirm:
1. ✓ User journey makes sense
2. ✓ Fixes address the issues you identified
3. ✓ No missing requirements

Once approved, we'll proceed to the implementation plan.
