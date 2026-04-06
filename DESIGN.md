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
| Body (Default) | Work Sans | sans-serif | Paragraphs, labels, body text |
| Monospace (Data) | IBM Plex Mono | monospace | Quantities, dates, codes, data tables |

### Scale
```
H1:  2rem / 1.75rem (mobile)    — Fraunces 700
H2:  1.5rem / 1.25rem (mobile)  — Fraunces 600
H3:  1.25rem / 1.1rem (mobile)  — Fraunces 600
H4:  1.1rem / 1rem (mobile)     — Fraunces 600
Body: 1rem / 0.95rem (mobile)   — Work Sans 400, line-height 1.6
Small: 0.875rem                 — Work Sans 400, line-height 1.5
Label: 0.85rem / 0.8rem         — Work Sans 600, letter-spacing 0.3px
Mono: 0.9rem / 0.85rem          — IBM Plex Mono 400
```

### Design Rationale
- **Fraunces** for display: Organic serif with distinctive character. Warm and inviting, not corporate.
- **Work Sans** for body: Highly legible at small sizes. Modern sans with natural proportions.
- **IBM Plex Mono** for data: Neutral, professional. Differentiates quantitative content.

---

## Color Palette

### Primary Colors
| Name | Hex | RGB | Usage | Notes |
|------|-----|-----|-------|-------|
| Forest Green (Primary) | `#1B4332` | 27, 67, 50 | Buttons, links, accent elements, active states | Deep, nature-inspired green. Not clinical. |
| Warm Cream (Background) | `#FAFAF9` | 250, 250, 249 | Page background, card backgrounds | Almost-white. Reduces eye strain. |
| Dark Gray (Text) | `#1F1F1F` | 31, 31, 31 | Primary text, headings | Not pure black; warmer and more readable. |
| Muted Gray (Secondary Text) | `#6B6B6B` | 107, 107, 107 | Helper text, labels, metadata | Distinct from primary text but not distracting. |
| Light Border | `#E5E5E5` | 229, 229, 229 | Dividers, borders, subtle separation | Very light; doesn't dominate. |
| Alert/Warning | `#D97706` | 217, 119, 6 | Warnings, required fields, errors | Amber; warm and visible. |
| Success | `#10B981` | 16, 185, 129 | Confirmation, success states, checks | Bright, distinct. Clear signal. |

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

---

## Spacing System

### Base Unit: 8px
All spacing follows an 8px grid. This creates visual harmony and predictability.

| Scale | Value | Usage |
|-------|-------|-------|
| xs | 0.5rem (4px) | Tight inline spacing (button icon gaps) |
| sm | 1rem (8px) | Default spacing between elements |
| md | 1.5rem (12px) | Cards, sections, component padding |
| lg | 2rem (16px) | Section margins, larger blocks |
| xl | 3rem (24px) | Major section breaks, hero spacing |
| 2xl | 4rem (32px) | Page-level spacing |

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
- **Meals**: Work Sans 500, 0.95rem, dark gray
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
| **Primary Color** | Forest Green (#1B4332) | Nature-inspired, warm, food-adjacent. Family-friendly. Matches production site. | Slightly darker than initial system; requires careful text contrast. |
| **Font Stack** | Fraunces + Work Sans + IBM Plex Mono | Organic serif + modern sans + neutral mono. Covers all roles without clash. | Three fonts; adds slight download weight. Serif display is unusual in apps but fits warm aesthetic. |
| **Button Radius** | 6px | Clean, modern, subtle rounding. Balances warmth and restraint. Matches production. | Less rounded than initial system (was 12px); requires consistency. |
| **Spacing Base** | 8px | Industry standard; scales cleanly to 16, 24, 32. | Occasionally rigid; some designs benefit from 6px adjustments. |
| **Shadow Depth** | 0 4px 12px / 0.08 opacity | Subtle elevation. Functional without drama. | Very soft; dark backgrounds may need adjustment. |
| **Dark Mode** | CSS variables only | No separate stylesheet; low maintenance. | All colors must be accessible in both modes. |
| **Grid System** | Responsive breakpoints at 768/1024 | Aligns with common devices; simple to implement. | May not optimize perfectly for every device size. |

---

## Implementation Checklist

- [ ] Export color palette as CSS variables (use #1B4332 as primary)
- [ ] Load web fonts from Google Fonts (Fraunces, Work Sans, IBM Plex Mono)
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
- **Web Fonts**: Google Fonts (Fraunces, Work Sans, IBM Plex Mono) — CDN linked, no local files needed
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

**Last Updated**: April 5, 2026  
**Design System Version**: 2.0 (Production-Aligned)  
**Status**: Ready for implementation
**Source of Truth**: https://onmangequoi.eu
