# On mange quoi? — Design System (Production-Aligned)

## Product Context

**On mange quoi?** is a family meal planning application that helps families answer "what are we eating?" by:
- Building weekly meal plans in an intuitive grid interface
- Generating shopping lists organized by section
- Displaying meals with dietary preferences and restrictions
- Creating shareable memo cards (printable weekly menus)
- Managing family profiles with dietary preferences

**Audience:** Busy families managing dietary variety, preferences, and planning efficiency.

**Core Job to Be Done:** Reduce decision fatigue around meal planning while accommodating family food preferences.

---

## Aesthetic Direction: Warm, Organic, Nature-Inspired

### Philosophy
A design system grounded in the natural world. The palette is warm and forest-inspired. The layout is clean with natural breathing room. Components feel purposeful rather than ornate.

### Design Values
- **Organic** — Colors inspired by nature (forest green); typography is human-scaled
- **Clarity** — Visual hierarchy is immediate; no ambiguity in interaction
- **Breathing Room** — Generous spacing creates calm, not clutter
- **Restraint** — One accent color; minimal visual noise

---

## Typography System

### Font Stack
| Role | Font | Fallback | Usage |
|------|------|----------|-------|
| Display (Headlines) | Fraunces | serif | H1, H2, H3, section titles |
| Body (Default) | Plus Jakarta Sans | sans-serif | Paragraphs, labels, body text |
| Monospace (Data) | IBM Plex Mono | monospace | Quantities, dates, codes, data tables |

### Scale (fluide via `clamp()` — mobile → desktop)

| Token | Min (mobile) | Max (desktop) | Font | Weight | Line-height |
|-------|--------------|---------------|------|--------|-------------|
| `--fs-h1` | 1.75rem (28px) | 2rem (32px) | Fraunces | 700 | `--lh-tight` (1.2) |
| `--fs-h2` | 1.25rem (20px) | 1.5rem (24px) | Fraunces | 600 | `--lh-tight` (1.2) |
| `--fs-h3` | 1.1rem (17.6px) | 1.25rem (20px) | Fraunces | 600 | `--lh-normal` (1.4) |
| `--fs-h4` | 1rem (16px) | 1.1rem (17.6px) | Fraunces | 600 | `--lh-normal` (1.4) |
| `--fs-body` | 1rem (16px) | 1rem (16px) | Plus Jakarta Sans | 400 | `--lh-loose` (1.6) |
| `--fs-small` | 0.875rem (14px) | 0.875rem (14px) | Plus Jakarta Sans | 400 | 1.5 |
| `--fs-label` | 0.85rem (13.6px) | 0.85rem (13.6px) | Plus Jakarta Sans | 600 | 1.4 |
| `--fs-mono` | 0.9rem (14.4px) | 0.9rem (14.4px) | IBM Plex Mono | 400 | 1.5 |

### Hiérarchie globale (styles.css)

Les sélecteurs `h1, h2, h3, h4` nus reçoivent désormais leur style depuis
styles.css (font-family display + scale + line-height + margin-bottom).
Les sélecteurs scoped (`.parent h2 { … }`) gardent leur priorité grâce à
une spécificité plus élevée et peuvent override.

```css
h1 { font-size: var(--fs-h1); font-weight: 700; line-height: var(--lh-tight); margin: 0 0 var(--space-5); }
h2 { font-size: var(--fs-h2); font-weight: 600; line-height: var(--lh-tight); margin: 0 0 var(--space-4); }
h3 { font-size: var(--fs-h3); font-weight: 600; line-height: var(--lh-normal); margin: 0 0 var(--space-3); }
h4 { font-size: var(--fs-h4); font-weight: 600; line-height: var(--lh-normal); margin: 0 0 var(--space-3); }
```

### Design Rationale
- **Fraunces** for display: Organic serif with distinctive character. Warm and inviting, not corporate.
- **Plus Jakarta Sans** for body: Highly legible at small sizes. Modern sans with natural proportions.
- **IBM Plex Mono** for data: Neutral, professional. Differentiates quantitative content.

---

## Color Palette

### Primary Colors
| Name | Hex | RGB | Usage | Notes |
|------|-----|-----|-------|-------|
| Grove Sage (Primary) | `#3A7D5C` | 58, 125, 92 | Buttons, links, accent elements, active states | Direction solaire — vert sauge lumineux. Plus aéré que le Forest Green initial. |
| Sun Accent | `#D4902A` | 212, 144, 42 | Accents secondaires, highlights chaleureux | Direction solaire — touche dorée. Usage sélectif, jamais sur du texte courant (contraste). |
| Warm Cream (Background) | `#FAFAF9` | 250, 250, 249 | Page background, card backgrounds | Almost-white. Reduces eye strain. |
| Dark Gray (Text) | `#1F1F1F` | 31, 31, 31 | Primary text, headings | Not pure black; warmer and more readable. |
| Muted Gray (Secondary Text) | `#6B6B6B` | 107, 107, 107 | Helper text, labels, metadata | Distinct from primary text but not distracting. |
| Light Border | `#E5E5E5` | 229, 229, 229 | Dividers, borders, subtle separation | Very light; doesn't dominate. |
| Alert/Warning | `#D97706` | 217, 119, 6 | Warnings, required fields, errors | Amber; warm and visible. |
| Success | `#10B981` | 16, 185, 129 | Confirmation, success states, checks | Bright, distinct. Clear signal. |
| Prep-Time Fast (dot) | `#10B981` | 16, 185, 129 | `.prep-time-dot.fast` — point 10×10 saturé | Token `--prep-fast`. Vert success. |
| Prep-Time Medium (dot) | `#F59E0B` | 245, 158, 11 | `.prep-time-dot.medium` — point 10×10 saturé | Token `--prep-medium`. Amber. |
| Prep-Time Slow (dot) | `#EF4444` | 239, 68, 68 | `.prep-time-dot.slow` — point 10×10 saturé | Token `--prep-slow`. Rouge. |
| Prep-Time Fast (pill bg/text) | `#DCFCE7` / `#14532D` | — | `.badge-prep.prep-fast` — pill pastel | Tokens `--prep-fast-bg/--prep-fast-text`. Axe sémantique distinct du score-band. |
| Prep-Time Medium (pill bg/text) | `#FEF3C7` / `#78350F` | — | `.badge-prep.prep-medium` — pill pastel | Tokens `--prep-medium-bg/--prep-medium-text`. |
| Prep-Time Slow (pill bg/text) | `#FEE2E2` / `#7F1D1D` | — | `.badge-prep.prep-slow` — pill pastel | Tokens `--prep-slow-bg/--prep-slow-text`. |
| Discount Text | `#B45309` | 180, 83, 9 | Prix tier discount sur shopping list | Token `--discount-text`. Lisible sur fond clair. |
| Standard Text | `#0369A1` | 3, 105, 161 | Prix tier standard sur shopping list | Token `--standard-text`. |
| Bio Text | `#15803D` | 21, 128, 61 | Prix tier bio sur shopping list | Token `--bio-text`. |

### Dark Mode Overrides
```
--bg: #1F1F1F (dark background)
--text-dark: #FAFAF9 (light text)
--text-muted: #A0A0A0 (medium gray for secondary text)
--border-light: #333333 (subtle light borders on dark)
```

### Color Usage Guidelines
- **Primary (Forest Green)**: Default button state, active links, selected states, accent lines
- **Neutral (Creams/Grays)**: Backgrounds, borders, disabled states, metadata
- **Alert (Amber)**: Required fields, validation errors, warnings
- **Success (Teal)**: Confirmed actions, meal added, shopping item checked
- **Prep-Time Indicators (Fast/Medium/Slow)**: Green for quick meals, amber for moderate, red for longer prep time. Used on meal cards and shopping list items.

---

## Spacing System

### Base Unit: 8px (avec demi-pas 4px et intercalaires)
Tous les espacements reposent sur une grille 8px (incréments principaux) avec des
demi-pas 4px pour les détails. Des **intercalaires** (2/6/10/14/18/28/40/44 px)
sont tokenisés pour les valeurs hors-grille déjà présentes en production — à
utiliser uniquement quand on-grid casse le rythme visuel.

| Token | Valeur | Pixels | Usage |
|-------|--------|--------|-------|
| `--space-0` | 0 | 0 | Reset |
| `--space-px` | 1px | 1 | Bordures, séparateurs |
| `--space-half` | 0.125rem | 2 | Intercalaire — détails fins |
| `--space-1` | 0.25rem | 4 | Espacement tight (gaps icônes/boutons) |
| `--space-1-5` | 0.375rem | 6 | Intercalaire |
| `--space-2` | 0.5rem | 8 | Tight default |
| `--space-2-5` | 0.625rem | 10 | Intercalaire |
| `--space-3` | 0.75rem | 12 | Padding inputs, boutons |
| `--space-3-5` | 0.875rem | 14 | Intercalaire |
| `--space-4` | 1rem | 16 | **Base** — espacement par défaut |
| `--space-4-5` | 1.125rem | 18 | Intercalaire |
| `--space-5` | 1.5rem | 24 | Padding cards, sections |
| `--space-5-5` | 1.75rem | 28 | Intercalaire |
| `--space-6` | 2rem | 32 | Marges de section |
| `--space-6-5` | 2.5rem | 40 | Intercalaire |
| `--space-7` | 3rem | 48 | Hero, blocs majeurs |
| `--space-7-5` | 2.75rem | 44 | Touch target minimum (WCAG) |
| `--space-8` | 4rem | 64 | Espacement page-level |
| `--space-9` | 5rem | 80 | Gaps extra-larges |

### Règles d'usage

1. **Pour tout nouveau composant** : utiliser uniquement `var(--space-*)`. Pas de rem ou px hardcodé.
2. **Pour les composants existants** : migration progressive composant par composant — pas de search/replace en masse (les rem peuvent être en font-size, line-height, width, etc.).
3. **Privilégier on-grid** : --space-2, -4, -5, -6, -7, -8 sont la colonne vertébrale. Les intercalaires sont une commodité, pas une norme.

### Application
- **Component Padding**: 1rem (8px) minimum
- **Margin Between Elements**: 1rem default
- **Section Spacing**: 3-4rem between sections
- **Line Height**: 1.6 for body text (loose), 1.5 for labels (tight)

---

## Layout Approach

### Grid System
- **Mobile First**: Design starts at 320px, scales up
- **Responsive Breakpoints**:
  - Mobile: 320px – 767px (1 column, stacked)
  - Tablet: 768px – 1023px (2-3 columns)
  - Desktop: 1024px+ (3-4 columns, max-width 1200px)

### Containers
- **Max Content Width**: 1200px (centered with padding)
- **Page Padding**: 2rem (mobile), 3rem (desktop)
- **Card Layouts**: 12-column responsive grid

### Meal Planning Grid
- **7-Day Table**: Days as columns, meal slots as rows
- **Cell Height**: 120px minimum to allow meal image + title + snippet
- **Responsive**: Horizontal scroll on mobile; full width on desktop
- **Visual Hierarchy**: Today's column highlighted with subtle background tint

---

## Component Specifications

### Buttons
```css
/* Primary Button */
background: var(--primary);
color: white;
padding: 0.75rem 1.5rem;
border-radius: 6px;
border: none;
font-weight: 600;
font-size: 1rem;
cursor: pointer;
transition: all 200ms ease-in-out;

/* Hover State */
transform: translateY(-2px);
box-shadow: 0 8px 16px rgba(27, 67, 50, 0.2);

/* Active State */
transform: translateY(0);
opacity: 0.95;
```

### Input Fields
```css
/* Base Input */
padding: 0.75rem 1rem;
border: 1px solid var(--border-light);
border-radius: 6px;
font-family: var(--sans);
font-size: 1rem;
background: white;
transition: all 200ms ease-in-out;

/* Focus State */
border-color: var(--primary);
box-shadow: 0 0 0 3px rgba(27, 67, 50, 0.1);
outline: none;

/* Placeholder */
color: var(--text-muted);
```

### Cards
```css
/* Card Base */
background: white;
border-radius: 6px;
padding: 1.5rem;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
transition: box-shadow 200ms ease-in-out;

/* Hover State (on desktop) */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
transform: translateY(-2px);
```

### Checkboxes & Toggles
```css
/* Checkbox */
width: 20px;
height: 20px;
border: 2px solid var(--primary);
border-radius: 4px;
background: white;
cursor: pointer;

/* Checked State */
background: var(--primary);
color: white;
content: "✓";
```

### Pills & Badges
```css
/* Badge Style */
display: inline-block;
padding: 0.5rem 0.875rem;
border-radius: 20px;
font-size: 0.85rem;
font-weight: 600;
background: var(--primary);
color: white;
```

---

## Motion & Animation

### Timing
- **Fast Feedback**: 150-200ms (button hover, focus states)
- **Standard Interaction**: 250-300ms (modal open, dropdown expand)
- **Playful**: 400-600ms (page transition, celebration)

### Easing
- **UI Interaction**: `ease-in-out` (smooth, natural)
- **Entrance**: `ease-out` (snappy reveal)
- **Exit**: `ease-in` (gentle departure)

### Rules
- No animation longer than 600ms
- Use `transform` and `opacity` for performance (GPU-accelerated)
- Avoid animating `width`, `height`, `left`, `top`
- Never animate text color rapidly (eye strain)

---

## Memo Card Design (Shareable)

### Format
- **Dimensions**: 8.5" × 11" (printable) or 1080px × 1400px (digital)
- **Purpose**: Weekly menu snapshot for family reference

### Layout
```
[Header: Week of DATE]
[7-Day Grid]
  Monday  | Breakfast [icon] Lunch [icon] Dinner [icon]
  Tuesday | ...
  ...
[Footer: Powered by On mange quoi?]
```

### Typography on Memo
- **Day Names**: Fraunces 600, 1.1rem, primary color
- **Meals**: Plus Jakarta Sans 500, 0.95rem, dark gray
- **Icons**: Emoji or simple SVG (2rem size)

### Print Considerations
- **Colors**: CMYK-safe; avoid pure black (use #1F1F1F)
- **Contrast**: 4.5:1 minimum for accessibility
- **Padding**: 0.5" margins all sides
- **Font**: Embed web fonts or fallback to system fonts for printing

---

## Design Decisions Log

| Decision | Choice | Rationale | Trade-offs |
|----------|--------|-----------|-----------|
| **Direction solaire (v2.1, 2026-05)** | Grove Sage #3A7D5C + Sun Accent #D4902A | Passage du Forest Green sombre vers une palette lumineuse et solaire. Décision produit pour aérer l'identité visuelle. | Les tokens v2 (Forest Green) coexistent encore dans `styles.css` `:root` ; nettoyage à prévoir. |
| **Tokens prep-pill + item-price (v2.1, 2026-05-17)** | Pastels prep-time + texte item-price tokenisés | Axe sémantique du prep-time (vitesse de cuisine) gardé distinct du score-band (santé globale). Tokens dédiés `--prep-*-bg/text` + `--discount/standard/bio-text`. | Zéro callsite hex hardcodé restant pour ces composants. |
| **Suppression `--color-secondary` (v2.1, 2026-05-17)** | Coral #E07A5F retiré ; `.fix-preferences-btn` repose sur `--sun-500` | Coral était un vestige avant direction solaire. Sun-500 est l'accent secondaire officiel — réutilisé sur l'unique callsite. Hover/dark mode dérivés via `color-mix()`. | Token `--color-secondary` supprimé du `:root`. |
| **Scale d'espacement tokenisée (v2.1, 2026-05-17)** | --space-0 à --space-9 + 8 intercalaires | Aucune scale unifiée avant ce commit. 8 valeurs hors-grille déjà en prod (0.125, 0.375, 0.625, 0.875, 1.125, 1.75, 2.5, 2.75 rem) tokenisées plutôt que migrées vers on-grid — préserve le visuel actuel. Future migration composant par composant. | 19 tokens dans `:root`. Aucun callsite migré dans cette passe. |
| **Scale typographique + hiérarchie h1/h2/h3/h4 globale (v2.1, 2026-05-17)** | Tokens `--fs-*` via `clamp()` + règles globales dans styles.css | Aucun style global h1-h4 avant ce commit — chaque section inventait ses tailles (204 déclarations `font-size`). `clamp()` choisi pour fluidité mobile→desktop sans media query supplémentaire. | Suppression du token `--font-body: Work Sans` mort (override Plus Jakarta Sans). Sélecteurs scoped non touchés (spécificité plus élevée). |
| **Primary Color (v2)** | Forest Green (#1B4332) — **déprécié** | Nature-inspired, warm, food-adjacent. Family-friendly. | Remplacé par Grove Sage en v2.1 (voir ligne au-dessus). |
| **Font Stack** | Fraunces + Plus Jakarta Sans + IBM Plex Mono | Organic serif + modern sans + neutral mono. Covers all roles without clash. | Three fonts; adds slight download weight. Serif display is unusual in apps but fits warm aesthetic. |
| **Button Radius** | 6px | Clean, modern, subtle rounding. Balances warmth and restraint. Matches production. | Less rounded than initial system (was 12px); requires consistency. |
| **Spacing Base** | 8px | Industry standard; scales cleanly to 16, 24, 32. | Occasionally rigid; some designs benefit from 6px adjustments. |
| **Shadow Depth** | 0 4px 12px / 0.08 opacity | Subtle elevation. Functional without drama. | Very soft; dark backgrounds may need adjustment. |
| **Dark Mode** | CSS variables only | No separate stylesheet; low maintenance. | All colors must be accessible in both modes. |
| **Grid System** | Responsive breakpoints at 768/1024 | Aligns with common devices; simple to implement. | May not optimize perfectly for every device size. |

---

## Implementation Checklist

- [ ] Export color palette as CSS variables (use #1B4332 as primary)
- [ ] Load web fonts from Google Fonts (Fraunces, Plus Jakarta Sans, IBM Plex Mono)
- [ ] Create reusable component library (buttons, inputs, cards)
- [ ] Test dark mode across all components
- [ ] Validate color contrast (WCAG AA minimum)
- [ ] Create memo card printable template
- [ ] Document responsive behavior (mobile, tablet, desktop)
- [ ] Set up CSS grid and spacing utilities
- [ ] Test on actual devices (iPhone, iPad, desktop)
- [ ] Align all production UI with this system

---

## Files & Assets

- **This Document**: `DESIGN.md` — Governance and reference guide (production-aligned)
- **Web Fonts**: Google Fonts (Fraunces, Plus Jakarta Sans, IBM Plex Mono) — CDN linked, no local files needed
- **Colors**: Defined as CSS variables in `:root` scope
- **Production Site**: https://onmangequoi.eu — source of truth for design validation

---

## Next Steps

1. **Validation**: Review production site against this design system
2. **Implementation**: Apply design tokens to existing pages
3. **Testing**: Validate responsive behavior across devices
4. **Refinement**: Gather user feedback; adjust as needed
5. **Documentation**: Create component usage guide for contributors

---

**Last Updated**: 2026-05-17 (sync direction solaire)
**Design System Version**: 2.1 (Direction solaire — Grove Sage + Sun Accent)
**Status**: En vigueur en production
**Source of Truth**: https://onmangequoi.eu + `styles.css` `:root` (second bloc, lignes ~195-260)
