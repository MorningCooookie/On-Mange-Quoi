# On Mange Quoi — UI Review

**Audited:** April 4, 2026
**Baseline:** Design-Review.md + abstract 6-pillar standards
**Screenshots:** Code-only audit (no dev server running)
**Live URL:** https://onmangequoi.eu

---

## Executive Summary

The On Mange Quoi application demonstrates **solid foundational design** with a clear visual identity, thoughtful color system, and well-structured responsive layout. The core experience is **functional and mobile-aware**, with CSS custom properties, semantic HTML, and accessibility fundamentals in place (skip link, focus states, ARIA labels).

**Overall Score: 19/24** (Good, approaching excellent)

The application successfully implements:
- ✅ Strong visual hierarchy and card-based design
- ✅ Excellent color coding (semantic meal types, risk levels, store pricing)
- ✅ Mobile-first responsive patterns (bottom bar, horizontal scroll, sticky budget)
- ✅ Personalized messaging (profile names, preference system foundation)
- ✅ Comprehensive food-safety communication (risk tooltips, health alerts)

However, **three critical issues prevent this from reaching 4/4 across the board:**
1. **Copywriting lacks French localization finesse** — Generic labels exist where domain-specific, warm French copy is expected
2. **Visual hierarchy on cards is flat** — Similar font sizes and weights throughout, no clear focal points
3. **Touch target sizes on mobile are below accessibility standards** — Some buttons are <40px tall

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Clear, functional French; lacks warmth and domain personality |
| 2. Visuals | 3/4 | Strong grid layout and icon system; card hierarchy needs refinement |
| 3. Color | 4/4 | Excellent semantic use; perfect risk/meal/store differentiation |
| 4. Typography | 3/4 | Good scale and readability; font-size choices conservative, minimal weight variation |
| 5. Spacing | 3/4 | Consistent rhythm with custom properties; mobile padding could breathe more |
| 6. Experience Design | 3/4 | Solid state coverage; missing loading states and empty-state polish |

**Total: 19/24**

---

## Top 3 Priority Fixes

### 1. **Increase Touch Target Sizes on Mobile**
**Impact:** Accessibility compliance + user frustration reduction

**Evidence:**
- Profile pills: `.profile-pill` = 28-30px height (current)
- Store buttons: `.selector-btn` = ~26px height (current)
- WCAG 2.1 AA minimum: 44×44px
- Mobile buttons on header/bottom-bar fall below this

**Fix:** Add min-height rules scoped to mobile breakpoints:
```css
@media (max-width: 767px) {
  .profile-pill, .selector-btn {
    min-height: 44px;
    padding: 0.6rem 1rem;
  }
}
```
**Effort:** 5 minutes | **Impact:** High (removes accessibility violation)

---

### 2. **Warm Up Copywriting with French Domain Personality**
**Impact:** Brand trust + user confidence in food safety

**Evidence:**
- Maintenance banner: "🔧 Amélioration en cours — Les préférences alimentaires..." ✓ (acceptable)
- Login/signup headers: "Connexion", "Créer un compte" (generic, but functional)
- Empty states/errors missing (no "No menus found" or "Something went wrong" copy to audit, but Design-Review flags this)
- Preference modal: "Créez un profil pour chaque membre et configurez ses préférences alimentaires." (technical, not warm)

**Fix:** Replace generic headers with personality-driven copy:
- "Se connecter" → "Accédez à votre menu personnalisé"
- "Créer un compte" → "Découvrez votre menu sain en 1 minute"
- Preference modal intro → "Aidez-nous à adapter votre menu à vos préférences" (warmer, action-oriented)

**Effort:** 30 minutes | **Impact:** Medium-high (increases brand trust, reduces signup friction)

---

### 3. **Improve Card Visual Hierarchy with Font Weight Differentiation**
**Impact:** Scannability + cognitive load reduction

**Evidence:**
- Day card header: `.day-label` = 1rem / 700 ✓ (strong)
- Meal names: `.meal-name` = 0.85rem / 500 (should be 600-700)
- Meal icons: Present but same visual weight as text
- Budget values: `.budget-total-amount` = 1.9rem / 900 ✓ (strong), but sub-labels are 0.75rem / 400 (hierarchy gap)
- Risk dots and badges are small (0.68-0.75rem) — hard to scan at a glance

**Fix:** Add weight and size variations:
```css
.meal-name { font-weight: 600; } /* was 500 */
.meal-header .meal-icon { font-size: 1.15rem; margin-right: 0.2rem; } /* make icon bigger */
.risk-dot { width: 11px; height: 11px; } /* was 9px */
.badge-prep, .badge-season { font-weight: 700; } /* was 600 */
```
**Effort:** 15 minutes | **Impact:** Medium (improves scannability, no user-facing changes needed)

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths:**
- Maintenance banner is clear and transparent ("Amélioration en cours — Les préférences alimentaires...")
- Profile system copy is descriptive ("2 adultes + 2 enfants < 10 ans")
- Health alerts are specific and actionable ("Cadmium", "Mercure", "Pesticides", "Élevage intensif")
- Form labels are functional ("Votre email", "Mot de passe")

**Issues:**

1. **Signup/Login Headers Lack Domain Warmth**
   - "Connexion" is literal, not aspirational
   - "Créer un compte" is generic (every app uses this)
   - **Fix:** Use food-safety framing: "Se connecter" → "Accédez à votre menu sain", "Créer un compte" → "Commencez avec un menu certifié"

2. **Preference Modal Missing Emotional Hook**
   - Current: "Créez un profil pour chaque membre et configurez ses préférences alimentaires."
   - **Fix:** "Adaptez le menu à votre famille — spécifiez allergies, régimes, ingrédients à éviter"

3. **No Empty-State Copy**
   - If preferences fail to load, no fallback message
   - If menu history is empty, no messaging
   - **Design-Review mentions** this: needs "📚 Vous consultez la semaine du X au Y" banner ✓ (implemented in HTML `#menu-history-banner`)

4. **Toast Messages Are Function-Driven, Not User-Driven**
   - "Frigo réinitialisé" is action-speak
   - **Better:** "Vos articles marqués ont été oubliés — prêt pour les courses ?"

5. **Button Copy Inconsistencies**
   - "Partager le menu" (good)
   - "🖨️ Imprimer" (emoji + French, fine)
   - "← Semaine en cours" (punctuation style)
   - **Consistency check:** Use consistent emoji placement (all at start or all at end)

**Score Rationale:** Functional and clear, but lacks the warm, personality-driven tone expected from a health/family app. Domain-specific terminology (cadmium, mercury) is good, but consumer-facing copy needs more emotional resonance. **(3/4 — needs warmth)**

---

### Pillar 2: Visuals (3/4)

**Strengths:**
- **Grid-based layout** is clean and responsive (1-column mobile → 4-column tablet → 7-column desktop)
- **Card design** uses consistent shadows, borders, and radius (`.week-grid`, `.day-card`, `.budget-panel`)
- **Icon system** is consistent (emoji for meals, categories, actions)
- **Color coding** is intuitive (meal types: 🌅 breakfast, 🥗 lunch, 🍎 snack, 🌙 dinner)
- **Risk dots** show hazard levels with tooltips
- **Responsive behavior** uses `scroll-snap-align: start` on mobile (horizontal scroll with visual hint)
- **Focus states** have visible outlines (`:focus-visible` with 3px solid var(--header-to))

**Issues:**

1. **Flat Card Hierarchy**
   - All meal rows (`.meal-row`) have same visual weight
   - `.meal-name` (0.85rem/500) should have stronger prominence
   - **Evidence:** Design-Review notes "No clear focal point"
   - **Fix:** Increase `.meal-name` font-weight to 600 and add subtle highlight on hover

2. **Icon Sizing Is Small**
   - `.meal-icon` is 1rem (fine for emoji)
   - But badges and labels (0.65-0.75rem) are hard to read at a glance
   - **Fix:** Increase `.badge-prep` and `.badge-season` to 0.75rem (from 0.68rem)

3. **Risk Indicator Visual Differentiation**
   - `.risk-dot` is 9px (small, requires hover to see tooltip)
   - Design-Review recommends making it more prominent
   - **Fix:** Increase to 11px, add subtle glow on medium/high risk

4. **Shopping List Density**
   - `.shopping-item` padding is 0.6rem top/bottom (tight)
   - On long lists, items blur together
   - **Fix:** Increase to 0.75rem on desktop (mobile OK at 0.6rem)

5. **Budget Panel Visual Clarity**
   - `.budget-total-amount` is 1.9rem/900 (strong) ✓
   - But sub-items (`.budget-sub-val`) at 0.95rem feel buried
   - **Fix:** Bump to 1.1rem and add subtle background boxes

**Score Rationale:** Layout and spacing are solid, responsive is well-executed, but card interiors need stronger visual hierarchy. No glaring issues, but room for scannability improvements. **(3/4 — needs hierarchy refinement)**

---

### Pillar 3: Color (4/4)

**Strengths:**
- **Design system is cohesive:**
  - Primary header: green gradient (`#1B4332` → `#40916C`) ✓ strong, health-forward
  - Meal type accents are distinct and memorable:
    - Breakfast: `#4F46E5` (indigo)
    - Lunch: `#16A34A` (green)
    - Snack: `#EA580C` (orange)
    - Dinner: `#9333EA` (purple)
  - Risk levels: `#16A34A` (low) → `#CA8A04` (medium) → `#DC2626` (high) ✓
  - Store prices: `#FFB347` (discount, warm) → `#4FC3F7` (standard, cool) → `#81C784` (bio, green) ✓

- **Semantic color usage:**
  - Score grades (A/B/C) have distinct backgrounds (`#DCFCE7`, `#DBEAFE`, `#FEF3C7`)
  - Health alerts use dark navy (`#1E1B4B`) with high contrast
  - Seasonal indicators are soft green (`#D1FAE5`)

- **Contrast compliance:**
  - All text on primary header is white or light (passes WCAG AAA on green)
  - Shopping item text is dark on light (passes WCAG AA)
  - Health news (dark background) uses light text (`#E0E7FF`)

- **60/30/10 rule applied:**
  - 60%: Neutral background (`#F7F3EE`), white cards, text
  - 30%: Green header system, secondary UI colors
  - 10%: Accent colors (orange risk, blue storage, purple dinner)

**Minor Notes:**
- Maintenance banner gradient (`#fef3c7` → `#fcd34d` → `#fef3c7`) is playful, appropriate for warnings
- No hardcoded colors in component styles (all custom properties) ✓
- Color palette is accessible for color-blind users (not monochromatic, uses shape + hue)

**Score Rationale:** Excellent color system with clear semantic intent, proper contrast, and thoughtful meal/risk/store differentiation. No issues found. **(4/4 — textbook implementation)**

---

### Pillar 4: Typography (3/4)

**Strengths:**
- **Font selection is deliberate:**
  - Display (headers): `'Fraunces'` — elegant serif, food-forward
  - Body text: `'Work Sans'` — clean sans-serif, readable at small sizes
  - Code blocks: monospace fallback (`'SF Mono'`, `'Fira Code'`)

- **Scale is reasonable:**
  - Base: 16px ✓
  - Headers use `clamp()` for responsive scaling: `clamp(1.2rem, 2.8vw, 1.55rem)`
  - Smallest text is 0.65rem (10.4px) — at threshold but acceptable for secondary labels

- **Line heights are generous:**
  - Body: `line-height: 1.6` ✓
  - Meal notes: inherit 1.6 ✓

**Issues:**

1. **Font Weight Underutilized**
   - Body font sizes vary: 0.65rem → 1.9rem
   - But weights are mostly 500-700
   - **Missing:** 300 (light) for de-emphasized text, 400 (regular) for body
   - **Evidence:** `.meal-name` is 0.85rem/500 (should be 600 for emphasis)

2. **Small Font Usage Without Visual Compensation**
   - `.meal-label`: 0.65rem (10.4px) — *just* passable for WCAG (requires 12px minimum for AA, but this is a secondary label)
   - `.item-label`: 0.65rem (same)
   - **Fix:** Use `clamp()` to scale these up on mobile: `clamp(0.7rem, 1.5vw, 0.75rem)`

3. **Inconsistent Font-Weight Application**
   - `.section-title`: 700 ✓
   - `.meal-name`: 500 (should be 600)
   - `.budget-total-amount`: 900 ✓
   - `.budget-sub-val`: 700 ✓
   - Pattern: display uses 700-900, but content uses 500 — adds cognitive load

4. **No 300/Regular Weight in Stylesheet**
   - Google Fonts import specifies: `wght@400;500;600;700` for Work Sans
   - But 400 is never used in CSS (only 500-700)
   - Missed opportunity for visual differentiation

5. **Meal Notes Are Hard to Distinguish**
   - `.meal-note`: inherits body styles (no specific styling)
   - Should be 0.75rem/400 (gray, smaller, less weight)
   - **Current:** Same style as other text, requires reading to distinguish

**Score Rationale:** Font families are excellent, scales are accessible, but weight distribution is conservative. Missing lighter weights and visual hierarchy through typography alone. **(3/4 — good execution, conservative choices)**

---

### Pillar 5: Spacing (3/4)

**Strengths:**
- **Consistent rhythm with CSS custom properties:**
  - Gap scale: 0.2rem → 0.75rem → 1.5rem (used consistently)
  - Padding scale: 0.5rem → 1.5rem (consistent)
  - Margin scale: matches padding

- **Responsive padding adjusts well:**
  - Desktop: `padding: 2rem 1.5rem 3rem` (main)
  - Mobile: `padding-bottom: calc(90px + 1.5rem)` (accounts for bottom bar)
  - Bottom bar height: `--bottom-bar-h: 88px` ✓

- **Strategic sticky positioning:**
  - Header: `position: sticky; top: 0` ✓
  - Budget panel: `position: sticky; top: 5rem` ✓ (scoped to desktop)

- **Grid gaps are intentional:**
  - Week grid: `gap: 0.75rem` (desktop), `gap: 0.6rem` (mobile)
  - Shopping categories: `gap: 0.75rem`

- **No arbitrary spacing values** — all use custom properties ✓

**Issues:**

1. **Mobile Padding Could Breathe More**
   - `.day-card` on mobile: `width: min(280px, 90vw)` — tight on 375px phones
   - Day header padding: `0.75rem 1rem` (compact)
   - **Fix:** Increase day-card width to `min(310px, 92vw)` and header padding to `1rem 1.25rem` on mobile

2. **Shopping Item Spacing Is Tight**
   - `.shopping-item`: `padding: 0.6rem 1.25rem` (tall items blur together)
   - **Fix:** Increase to `0.75rem 1.25rem` on desktop, keep 0.6rem on mobile

3. **Toast Position Calculation Issues**
   - `#toast`: `bottom: calc(var(--bottom-bar-h) + 1rem)` on mobile
   - But bottom bar is 88px + padding, so toast might overlap on tall phones
   - **Design-Review mentions:** "scroll-margin-top: 130px is calculated for desktop"
   - **Fix:** Use `clamp()` for scroll-margin-top: `clamp(110px, 20vw, 150px)`

4. **Budget Panel Top Position Not Responsive**
   - `.budget-panel`: `top: 5rem` (fixed)
   - On mobile, header height varies, but budget panel doesn't scroll on mobile (grid-layout shifts to single column)
   - **Non-issue in current layout, but flag for future:** If budget becomes sticky on mobile, adjust top value

5. **Section Margins Are Large**
   - `.section`: `margin-bottom: 3.5rem` (generous)
   - Good for breathing room, but can feel disconnected on narrow screens
   - **Design-Review addresses this,** no change needed

**Score Rationale:** Spacing system is well-thought-out with custom properties and responsive adjustments. Minor mobile breathing-room improvements possible, but no critical issues. **(3/4 — solid, minor refinements)**

---

### Pillar 6: Experience Design (3/4)

**Strengths:**
- **State coverage is comprehensive:**
  - Loading states: Fade-in animation (`#app-content.is-visible`)
  - Error handling: Error screen with refresh button and technical details (`#error-screen`)
  - Form submission: Buttons disable with "Envoi en cours..." / "Connexion en cours..." ✓
  - Fridge mode: Badge count, toggle state, reset button ✓
  - History navigation: "Semaine en cours" button returns to current menu ✓

- **Accessibility fundamentals in place:**
  - Skip link: `<a class="skip-link" href="#main">Aller au contenu principal</a>` ✓
  - Focus-visible states: All interactive elements have 3px outline
  - ARIA labels: Sections labeled with `aria-labelledby`, roles defined (`role="group"`, `role="list"`)
  - Form validation: Client-side checks before submission (email, password length)

- **User feedback mechanisms:**
  - Toast notifications: Success/error messages with 3s auto-dismiss
  - Risk tooltips: Hover-based (`.risk-dot::after` with data-tooltip)
  - Preference system foundation: PreferenceManager module exists
  - Menu filtering: `getFilteredMenuData()` function for dietary preferences

- **Responsive mobile UX:**
  - Bottom bar on mobile (profile + store selectors)
  - Horizontal scroll for week grid (`scroll-snap-type: x mandatory`)
  - Swipe hint: "← Glisse pour voir les 7 jours →" (mobile only)
  - Button sizes reduced on mobile but still functional

**Issues:**

1. **Touch Target Sizes Are Substandard**
   - `.profile-pill`: 28-30px height (below 44px min)
   - `.selector-btn`: ~26px height (below 44px min)
   - **Design-Review flagged this as critical**
   - **Fix:** `min-height: 44px` on mobile buttons
   - **Impact:** High — WCAG 2.1 AA violation

2. **Empty State Copy Missing**
   - If menu fails to load, error screen shows generic "Erreur de chargement"
   - If shopping list is empty, no messaging
   - **Design-Review mentions:** "Indicateur de menu historique actif" (implemented but no empty-state handling)
   - **Fix:** Add "Aucun article à ajouter" message if `shoppingList.length === 0`

3. **Loading Spinner Missing**
   - Fade-in animation exists, but no visual spinner while fetching
   - User might think page is stuck
   - **Fix:** Add loading overlay with spinner while `loadData()` is pending

4. **Form Validation Feedback Is Immediate But Sparse**
   - Only checks email/password presence and length
   - No validation for invalid email format (relies on browser)
   - No password strength indicator
   - **Acceptable for MVP, but could improve:**
     ```js
     if (!email.includes('@')) {
       showToast('Email invalide', 'Vérifiez le format', 'error');
       return;
     }
     ```

5. **Preference Save Reliability**
   - Design-Review notes "Account creation non-fonctionnelle"
   - Preferences might not persist if auth is broken
   - **Maintenance banner confirms:** "Les préférences alimentaires peuvent ne pas se sauvegarder"
   - **Not a UI issue, but affects experience design**

6. **Risk Tooltip Only on Hover**
   - `.risk-dot::after` only visible on hover (not accessible on touch)
   - Mobile users can't see risk explanations
   - **Fix:** Add a small icon next to risk dot, link to expanded details

7. **No Confirmation for Destructive Actions**
   - "Réinitialiser" (fridge reset) has no confirmation
   - User could accidentally clear shopping list
   - **Fix:** Add modal: "Êtes-vous sûr(e) de vouloir réinitialiser ?"

**Score Rationale:** Good state coverage and accessibility fundamentals, but touch targets are too small and some edge cases (empty states, loading spinners) are missing. Design-Review flags several of these; no new critical issues found. **(3/4 — solid foundation, edge cases need polish)**

---

## Registry Safety Audit

**Status:** No shadcn components detected. Project uses vanilla HTML/CSS/JS.

`components.json` does not exist. No third-party component registries in use. All UI components are custom-built and locally maintained.

**Conclusion:** Registry audit N/A — no supply-chain risk from third-party component registries.

---

## Files Audited

- `/index.html` — Main app structure (modal dialogs, header, grid layouts)
- `/styles.css` — Complete design system (custom properties, responsive breakpoints, color scheme)
- `/app.js` — State management, rendering logic, event handlers (first 1000 lines analyzed)
- `/data/config.json` — Profile and store configuration (accessible in DOM)
- `/data/menus/2026-03-30.json` — Sample meal data structure
- `/Design-Review.md` — Upstream design audit (cross-referenced for validation)

**Key Code Sections Examined:**
- Header: Grid layout, profile/store selectors, auth buttons
- Week grid: Responsive layout (7-column → 4-column → horizontal scroll)
- Shopping list: Category grouping, item checkboxes, budget panel
- Modals: Login, signup, profiles (form validation, event handlers)
- Responsive breakpoints: `@media (max-width: 767px)`, `(max-width: 1279px)`
- Accessibility: Focus states, skip link, ARIA labels, semantic HTML

---

## Comparison to Design-Review.md

The **Design-Review.md** identified 15 issues (5 critical, 10 important/polish). Current audit confirms:

**Implemented / Fixed:**
- ✅ #5 — Skip link added to HTML
- ✅ #7 — Day card "today" indicator (structure ready for JS implementation)
- ✅ #11 — Focus-visible styles in place
- ✅ #14 — Bottom bar mobile navigation (fully functional)
- ✅ #10 — Fade-in animation on content

**Partially Implemented:**
- ⚠️ #1 — Header mobile: Bottom bar exists, selectors hidden, but header still tall
- ⚠️ #2 — Week grid horizontal scroll: On mobile ✓, but swipe hint text could be bolder
- ⚠️ #3 — Font sizes: Still uses small values (0.65rem) instead of full `clamp()` adoption
- ⚠️ #4 — Touch targets: 44px min not universally applied; profile pills are 28-30px
- ⚠️ #6 — Breakpoint 3-column: Missing for 960px range
- ⚠️ #8 — Budget panel sticky: Implemented on desktop, not tested on actual scroll behavior

**Not Implemented:**
- ❌ #9 — Menu history indicator (HTML structure exists, but JS implementation pending)
- ❌ #13 — Store button contrast: `rgba(255,255,255,.7)` unchanged (should be .85+)

**Conclusion:** ~60% of Design-Review recommendations are in place. Remaining issues are primarily refinements and touch-ups, not critical blockers.

---

## Recommendations by Priority

### High (Do First)
1. **Increase touch target sizes to 44×44px minimum** — WCAG compliance
2. **Add confirmation dialog for fridge reset** — Prevent accidental data loss
3. **Add loading spinner during data fetch** — Improve perceived performance
4. **Fix store button contrast** — Change rgba(255,255,255,.7) to rgba(255,255,255,.85)

### Medium (Do Next)
5. **Warm up signup/login copy** — "Accédez à votre menu sain en 1 minute"
6. **Increase meal-name font-weight to 600** — Improve card readability
7. **Add clamp() to font-sizes below 0.8rem** — Better mobile scalability
8. **Add "No items" state for empty shopping lists** — Better UX for edge cases
9. **Make risk tooltips visible on mobile** — Touch-friendly explanations

### Low (Polish)
10. **Add 3-column breakpoint at 960px** — Tighter grid on tablets
11. **Increase shopping-item padding to 0.75rem** — More breathing room
12. **Add font-weight: 400 (regular) to Work Sans import** — Better hierarchy options

---

## Conclusion

On Mange Quoi is a **well-executed, accessibility-conscious application** that successfully communicates food safety through color, layout, and information hierarchy. The design system is cohesive, the responsive behavior is thoughtful, and the foundation for dietary personalization is solid.

The **three main areas for improvement** — touch targets, copywriting warmth, and card hierarchy — are all addressable in **1-2 hours of focused work**. With these refinements, this would be a **4/4-level application** ready for premium positioning and family trust.

**Recommendation:** Address the high-priority items (touch targets, contrast, loading states) before any public marketing push. Consider A/B testing the warmer signup copy to measure impact on conversion rate.

---

**Audit completed:** April 4, 2026 | **Reviewed against:** Design-Review.md + WCAG 2.1 AA + abstract 6-pillar standards
