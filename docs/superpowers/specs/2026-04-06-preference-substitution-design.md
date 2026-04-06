# Design Spec: Preference-Based Meal Substitution (Premium Feature)

**Date:** 2026-04-06  
**Feature:** Automatic meal substitution based on user allergies and dietary preferences  
**Scope:** Premium feature for registered users with personalized preferences  
**Target Users:** 100+ registered users with individual dietary needs

---

## 1. Overview

**Problem:** Users with allergies or dietary dislikes cannot easily customize weekly meal menus. They must manually identify conflicting meals and find alternatives.

**Solution:** A preference management system that identifies meals conflicting with a user's allergies/dislikes and suggests substitutes from a categorized recipe database.

**Impact:** 
- Improves premium user satisfaction (personalization)
- Creates data foundation for future features (nutrition tracking, health dashboards)
- Scales to support diverse dietary needs across 100+ users

---

## 2. Data Model

### 2.1 User Preferences (Supabase Table: `user_preferences`)

```json
{
  "user_id": "uuid",
  "profile_id": "string (e.g., 'famille_jeunes_enfants')",
  "hard_constraints": [
    {
      "ingredient": "shellfish",
      "reason": "allergy",
      "severity": "high"
    },
    {
      "ingredient": "peanuts",
      "reason": "allergy",
      "severity": "high"
    }
  ],
  "soft_preferences": [
    {
      "ingredient": "liver",
      "reason": "dislike",
      "strength": "medium"
    },
    {
      "ingredient": "mushrooms",
      "reason": "dislike",
      "strength": "low"
    }
  ],
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### 2.2 Recipe Database (Supabase Table: `recipes`)

```json
{
  "id": "uuid",
  "name": "Salmon with lemon and dill",
  "description": "Grilled salmon fillet with fresh herbs",
  "category": "protein-fish",
  "ingredients": [
    "salmon",
    "lemon",
    "dill",
    "olive oil",
    "salt",
    "pepper"
  ],
  "allergens": ["fish"],
  "nutritional_profile": {
    "protein_g": 28,
    "carbs_g": 2,
    "fat_g": 12,
    "calories": 232
  },
  "serves": 2,
  "prep_time_min": 15,
  "cooking_time_min": 12,
  "difficulty": "easy",
  "created_at": "timestamp"
}
```

### 2.3 Weekly Menu Structure (Existing `data/menus/YYYY-MM-DD.json`)

**Change:** Add `recipeId` to each meal

```json
{
  "weekStart": "2026-04-07",
  "weekEnd": "2026-04-13",
  "days": [
    {
      "name": "Lundi",
      "meals": [
        {
          "name": "Salmon with lemon",
          "recipeId": "uuid-of-recipe",
          "category": "protein-fish",
          "ingredients": ["salmon", "lemon", "dill", "olive oil"],
          "allergens": ["fish"]
        }
      ]
    }
  ]
}
```

---

## 3. Feature Flow

### 3.1 Trigger: Manual (User-Initiated)

**User Action:** Clicks "⚠️ Fix preferences" button in header (visible only when):
- User is logged in
- User has saved preferences
- At least one meal this week conflicts with their preferences

### 3.2 Substitution Algorithm

**Step 1: Scan Meals**
```
FOR each meal in weekly_menu:
  IF meal.allergens INTERSECT user.hard_constraints:
    → HARD_CONFLICT (must substitute)
  ELSE IF meal.ingredients INTERSECT user.soft_preferences:
    → SOFT_CONFLICT (show warning, allow override)
```

**Step 2: Generate Alternatives**
```
FOR each conflicting meal:
  CANDIDATES = recipes WHERE:
    - category == conflicting_meal.category
    - NOT contains any hard_constraint ingredients
    - NOT contains user.hard_constraints
  
  SCORE each candidate BY:
    - fewest soft_preference conflicts (weight: 0.7)
    - closest nutritional match (weight: 0.2)
    - random tiebreaker (weight: 0.1)
  
  RETURN top 3 candidates
```

**Step 3: User Choice**
```
FOR each conflict:
  USER sees:
    - Current meal + reason for conflict
    - Top 3 alternative recipes (same category)
    - Options: Accept | Skip | Dismiss
```

**Step 4: Apply Changes**
```
IF user accepts substitute:
  - Replace meal in weekly menu
  - Persist change to localStorage (for session)
  - Show toast: "Salmon replaced with Trout ✓"
```

---

## 4. UI/UX Design

### 4.1 Header Button

**Visibility:**
- Shows only when user is logged in AND has preferences
- Badge shows conflict count (e.g., "⚠️ Fix preferences (2)")
- Red/amber color to indicate action needed

**Position:** Header, right side, between account button and search (if present)

### 4.2 Modal: "Fix Your Preferences"

**Layout:**
- Title: "Fix Your Preferences"
- Summary line: "2 meals this week don't match your dietary needs"
- List of conflicts:
  - Each item shows: conflicting meal + reason + 3 alternative recipes
- Actions: "Save & Close" | "Cancel"

**Conflict Card:**
```
┌─────────────────────────────────────┐
│ ❌ Salmon with lemon (Monday)       │
│    Reason: Contains fish allergen   │
│                                     │
│ Suggested alternatives (pick one):  │
│ ○ Trout with herbs [same category] │
│ ○ Mackerel & vegetables             │
│ ○ Sea bass with garlic              │
│                                     │
│ [Accept Trout] [Skip] [Keep meal]  │
└─────────────────────────────────────┘
```

### 4.3 Visual Indicators

- **Conflicting meals** in weekly menu view: subtle red badge "Allergen ⚠️"
- **Substituted meals** after user action: green checkmark "Substituted ✓"
- **Dismissed conflicts** (user chose to keep): gray label "Kept as-is"

---

## 5. Data Flow: From Menu Load to Substitution

```
User opens weekly menu (logged in)
  ↓
Check if user has preferences
  ↓
Scan meals against hard_constraints + soft_preferences
  ↓
IF conflicts found:
  Show "⚠️ Fix preferences (X)" button
  ↓
User clicks button
  ↓
Modal opens, showing conflicts + alternatives
  ↓
For each conflict, generate top 3 recipe matches
  ↓
User selects alternative or skips
  ↓
Update weekly menu (localStorage + optional Supabase save)
  ↓
Close modal, show updated menu
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Database + API)
- Create `user_preferences` table in Supabase
- Create `recipes` table with initial recipe data
- Build matching/scoring algorithm (backend or frontend utility)
- Add `recipeId` to existing menu structure

### Phase 2: UI
- Add "⚠️ Fix preferences" button to header
- Build conflict detection modal
- Add visual indicators to meals
- Connect to preference scanning logic

### Phase 3: Persistence & Edge Cases
- Save substitutions to localStorage (session)
- Optional: Save to Supabase for cross-device sync
- Handle edge cases:
  - **No alternatives found:** Show message "No alternatives available this week. Would you like to keep this meal?" with confirmation
  - **User with no preferences:** Hide "Fix preferences" button
  - **All meals conflict:** Show "All meals need review" state with bulk action option
- Add toast notifications for all outcomes (accept, skip, keep)

### Phase 4: Premium Polish (Future)
- Allergy severity levels
- Nutritional tracking dashboard
- Meal history & learning ("user always skips X, so don't suggest")
- Recipe ratings/favorites

---

## 7. Scalability Notes

**For 100+ users:**
- User preferences stored per user_id (isolated)
- Recipe database is shared (one copy for all users)
- Matching algorithm runs client-side (lazy evaluation) or as serverless function
- No continuous sync — substitutions only apply when user clicks "Fix"

**Storage:**
- `user_preferences`: ~1KB per user (assuming 5-10 constraints)
- `recipes`: ~2KB per recipe × 200-500 recipes = 400KB–1MB total
- Menu files: unchanged (already <200KB per week)

**Performance:**
- Preference scanning: O(meals × constraints) — negligible for single week
- Recipe matching: O(recipes × constraints) — can be optimized with ingredient indexing if needed

---

## 8. Success Criteria

✅ User can define allergies and dislikes  
✅ System detects conflicts in weekly menu  
✅ User can see and accept/reject alternatives  
✅ Substitutions persist for the session  
✅ No hard constraints are overridden by accident  
✅ Scales to 100+ users without performance impact  
✅ Future-proof for premium features (nutrition, history, recommendations)

---

## 9. Design Decisions Log

| Decision | Rationale | Alternative Considered |
|----------|-----------|------------------------|
| Manual trigger (Option C) | User control + safety. Prevents unwanted substitutions. | Auto-substitute on load (risky for allergies) |
| Comprehensive approach (allergies + dislikes) | Long-term premium differentiation. Supports future features. | Lightweight tags only (limits growth) |
| Recipe category matching (Option B) | Better UX. Enables discovery. Proprietary data advantage. | Any meal from week (impersonal) |
| Two-tier preferences (hard/soft) | Safety: allergies auto-block. UX: dislikes are warnings. | Single tier (less nuanced) |
| Client-side matching logic | Fast. Reduces server load. Works offline (localStorage). | Server-side (more secure, but overkill for non-sensitive data) |

---

## 10. Open Questions & Assumptions

**Assumptions:**
- User preferences are stored per profile (not per family member — TBD with Mina)
- Initial recipe database will have 200-500 recipes (diverse categories)
- Substitutions are session-only (localStorage); Supabase sync is future enhancement

**Questions for stakeholder review:**
- Should preferences be per-user or per-profile? (impacts Supabase schema)
- Do we have existing recipe data, or build from scratch?
- Should substitutions persist across sessions (Supabase save) or just for current session?

---

## 11. Testing Strategy

- Unit: Recipe matching algorithm (edge cases: no alternatives, multiple conflicts)
- Integration: Preference storage → menu scan → modal rendering
- E2E: User logs in, sets preferences, loads menu, sees conflicts, substitutes, verifies change
- Regression: Existing menu/shopping list flow unaffected

---

## Appendix: Example User Journey

**User:** Claire (family with young kids)  
**Profile:** Famille Jeunes Enfants  
**Preferences:** Allergic to peanuts/tree nuts; kids dislike mushrooms

**Week 1:**
- Loads menu for April 7-13
- System detects: Monday (Chicken with mushroom sauce), Wednesday (Pesto salad with pine nuts)
- Clicks "⚠️ Fix preferences (2)"
- Modal shows:
  - Monday: "Kids dislike mushrooms" → suggests Chicken with herbs, Chicken curry, Grilled chicken
  - Wednesday: "Allergic to tree nuts" → suggests Basil mayo salad, Arugula salad, Tomato salad
- Accepts Chicken with herbs + Basil mayo salad
- Menu updates, toast shows "✓ 2 meals updated"
- Dismisses modal, proceeds to shopping list

---

**Document Version:** 1.0  
**Status:** Ready for implementation  
**Next Step:** Invoke writing-plans skill to create detailed implementation plan
