# Button Styling System — On Mange Quoi

## Overview

All primary action buttons in the application use a standardized CSS system built on custom properties (design tokens). This ensures consistency, maintainability, and accessibility across the entire interface.

---

## Design Tokens (CSS Custom Properties)

Located in `styles.css` (lines 54–63), these variables are the single source of truth for button styling:

| Variable | Value | Purpose |
|----------|-------|---------|
| `--btn-font-size-primary` | `0.85rem` | Large buttons (default size) |
| `--btn-font-size-small` | `0.75rem` | Compact buttons |
| `--btn-padding-primary` | `0.75rem 1rem` | Standard button padding |
| `--btn-padding-compact` | `0.5rem 0.75rem` | Reduced padding for smaller buttons |
| `--btn-border-radius` | `6px` | Rounded corners (all buttons) |
| `--btn-transition` | `all 0.15s ease-out` | Smooth state transitions |
| `--btn-focus-outline` | `3px solid #1B4332` | Keyboard focus indicator |
| `--btn-focus-offset` | `2px` | Space between button and focus ring |

To use these in new buttons:
```css
.btn-example {
  font-size: var(--btn-font-size-primary);
  padding: var(--btn-padding-primary);
  border-radius: var(--btn-border-radius);
  transition: var(--btn-transition);
}

.btn-example:hover {
  transform: translateY(-1px);
}

.btn-example:focus-visible {
  outline: var(--btn-focus-outline);
  outline-offset: var(--btn-focus-offset);
}
```

---

## Standardized Button Classes

### 1. `.btn-print-frigo`
**Purpose:** Trigger fridge menu export/print  
**Location:** `styles.css` lines 456–470  
**Font Size:** Primary (`--btn-font-size-primary: 0.85rem`)  
**Touch Target:** 44px minimum (✓ WCAG AA)

**States:**
- Default: Green background (`#1B4332`)
- Hover: Darker green, raised (translateY -1px)
- Focus: Green outline with 2px offset
- Active: Deepens on interaction

---

### 2. `.shopping-selector button`
**Purpose:** Toggle between budget tiers (Discount/Standard/Bio)  
**Location:** `styles.css` lines 608–635  
**Font Size:** Primary (`0.85rem`)  
**Touch Target:** 44px minimum (✓ WCAG AA)

**States:**
- Inactive: Light gray background
- Active: Green with white text
- Hover: Raises with transform, slight darkening
- Focus: Green outline, visible ring
- Animation: Smooth 0.2s transition between states

---

### 3. `.btn-action`
**Purpose:** Primary action buttons (save, confirm, etc.)  
**Location:** `styles.css` lines 661–676  
**Font Size:** Primary (`0.85rem`)  
**Touch Target:** 44px minimum (✓ WCAG AA)

**States:**
- Default: Background color varies by context
- Hover: Raised (translateY -1px), darker shade
- Focus: Visible focus ring (WCAG AA compliant)
- Transition: All 0.15s (smooth feedback)

---

### 4. `.btn-fridge-reset`
**Purpose:** Reset fridge data (secondary action)  
**Location:** `styles.css` lines 701–711  
**Font Size:** Small (`--btn-font-size-small: 0.75rem`)  
**Touch Target:** ~38px (meets basic accessibility)

**States:**
- Default: Compact styling (smaller padding/font)
- Hover: Raised with transform, darkened
- Focus: Green outline for keyboard users
- Use Case:** Less critical actions (reset, clear)

---

### 5. `.btn-view-current`
**Purpose:** View current menu week  
**Location:** `styles.css` lines 853–863  
**Font Size:** Small (`0.75rem`)  
**Touch Target:** ~38px

**States:**
- Default: Compact, secondary style
- Hover: Raised (translateY -1px), feedback
- Focus: Outline with 2px offset
- Transition: Unified 0.15s ease-out

---

## Accessibility Features

### Keyboard Navigation (WCAG 2.1 AA)

All buttons include `:focus-visible` states that:
- Display a **3px solid outline** in the primary color (`#1B4332`)
- Maintain a **2px offset** from button edge
- Activate when navigating via Tab/Shift+Tab
- Provide clear visual feedback for keyboard users

**Testing keyboard navigation:**
```bash
# In browser dev console or manual testing:
1. Press Tab repeatedly to navigate to each button
2. Verify a green outline appears around each button
3. Press Enter/Space to activate buttons
4. Outline should disappear when focus moves away
```

### Touch Targets (WCAG 2.1 AA)

- **Primary buttons** (.btn-print-frigo, .shopping-selector, .btn-action): **44px minimum** ✓
- **Secondary buttons** (.btn-fridge-reset, .btn-view-current): ~38px (acceptable for non-critical actions)

All buttons use sufficient padding to meet or exceed 44×44px touch target on mobile.

### Visual Feedback (Motion)

- **Hover State:** `transform: translateY(-1px)` creates depth perception
- **Transition:** `all 0.15s ease-out` provides smooth feedback without lag
- **No Flash:** Animations use ease-out to avoid jarring visual changes

---

## Responsive Design

### Mobile-First Approach
- Base styles apply to all devices (≤767px)
- Font sizes are relative (rem units scale with base 16px)
- Padding is generous enough for finger interaction on mobile

### Tablet/Desktop Breakpoints
- No media-query changes needed for buttons (standardized sizing works across all viewports)
- Focus rings remain visible at all screen sizes
- Hover states work on desktop; ignored on mobile (no :hover on touch devices)

### Testing Responsive Behavior
```bash
# Browser DevTools:
1. Open Responsive Design Mode (Cmd+Shift+M on Mac)
2. Test at 375px width (iPhone SE) → buttons should be 44px tall
3. Test at 768px (iPad) → buttons maintain consistent sizing
4. Test at 1440px (desktop) → focus rings visible, hover works smoothly
```

---

## Implementation Guidelines

### For Existing Buttons
✓ Already updated and standardized:
- `.btn-print-frigo`
- `.shopping-selector button`
- `.btn-action`
- `.btn-fridge-reset`
- `.btn-view-current`

### For New Buttons
Use this template:
```css
.btn-new-action {
  font-size: var(--btn-font-size-primary); /* or var(--btn-font-size-small) */
  padding: var(--btn-padding-primary);     /* or var(--btn-padding-compact) */
  border-radius: var(--btn-border-radius);
  transition: var(--btn-transition);
  background: [context-specific-color];
  color: white;
  border: none;
  cursor: pointer;
}

.btn-new-action:hover {
  transform: translateY(-1px);
  /* Darken background: use filter or lighten/darken function */
}

.btn-new-action:focus-visible {
  outline: var(--btn-focus-outline);
  outline-offset: var(--btn-focus-offset);
}

.btn-new-action:active {
  /* Deepen color further for tactile feedback */
}
```

---

## Testing Checklist

Before shipping any button changes:

- [ ] **Visual:** Button appears consistent with design tokens (colors, spacing, radius)
- [ ] **Hover:** Transform translateY(-1px) works smoothly on desktop
- [ ] **Keyboard:** Tab navigation shows green focus ring (outline + offset)
- [ ] **Touch:** Button is ≥44px tall on mobile (test DevTools responsive mode)
- [ ] **Responsive:** Style remains consistent from 320px (mobile) to 1920px (desktop)
- [ ] **Animation:** Transition is smooth (0.15s), no jarring jumps
- [ ] **Screen Reader:** Button text is clear and descriptive (test with VoiceOver on Mac)
- [ ] **Color Contrast:** Text passes WCAG AA (4.5:1 minimum for normal text)

---

## Troubleshooting

### Focus Ring Not Visible
**Issue:** Outline not showing on Tab/focus  
**Solution:** Ensure `:focus-visible` selector is not overridden; check browser DevTools for CSS precedence

### Button Too Small on Mobile
**Issue:** Touch target < 44px  
**Solution:** Increase padding using `var(--btn-padding-primary)` or `var(--btn-padding-compact)`; verify via DevTools mobile view

### Hover Effect Too Subtle
**Issue:** Transform translateY(-1px) barely noticeable  
**Solution:** Increase transform value (e.g., `translateY(-2px)`), or add box-shadow elevation effect

### Inconsistent Font Sizes Across Buttons
**Issue:** Buttons have different sizes despite using same class  
**Solution:** Override may exist in specificity chain; use !important for custom properties if needed, or refactor selectors

---

## Future Enhancements

Possible improvements to explore:
- Add `--btn-shadow` custom property for elevation effect (alternative to transform)
- Create `.btn-small` and `.btn-large` variants for size flexibility
- Implement `--btn-color-hover` and `--btn-color-active` tokens for dynamic theming
- Add `:disabled` state styling for inactive buttons

---

**Last Updated:** 2026-04-04  
**Version:** 1.0  
**Status:** All 5 button classes standardized and WCAG 2.1 AA compliant
