# Search Improvements Design

**Date:** 2026-04-27  
**Status:** Approved

## Summary

Three independent improvements to the search controls in `AppClient`:

1. Unlock keyword/landmark search in `LocationSearch`
2. Add calendar date picker to `DateScroll`
3. Replace radius pills with a slider in `RadiusSelector`

---

## 1. LocationSearch — Keyword & Landmark Support

**File:** `src/components/LocationSearch.tsx`

**Change:** Replace `types: ['(regions)']` with `types: ['geocode', 'establishment']` in the Places Autocomplete options. This unblocks: neighborhoods (Navigli), landmarks (Duomo), routes, and POIs alongside cities and regions.

**Name extraction logic** already handles the sublocality+locality case ("Navigli, Milano"), so no changes needed there.

**No UI changes.** Placeholder already reads "Città, quartiere, zona..."

---

## 2. DateScroll — Calendar Icon Button

**File:** `src/components/DateScroll.tsx`

**Change:** Add a calendar icon button at the far right of the pill row (after all 7 pills). On click it triggers a hidden `<input type="date">`.

Behavior:
- If the selected date matches one of the 7 pill values → activates that pill as normal.
- If it falls outside the 7-day window → shows an extra active pill displaying the date (e.g. "Lun 5 mag") with an × to clear it. This pill replaces the calendar button while active.
- Clearing via × (or clicking the active pill) resets `value` to `undefined`.

The calendar button uses the same `bg-bg-card border border-white/10` style as inactive pills, with a calendar SVG icon inside.

---

## 3. RadiusSelector — Drag Slider

**File:** `src/components/RadiusSelector.tsx`

**Change:** Replace the 4 fixed pills with an `<input type="range" min={5} max={50} step={5}>`.

Layout: single row with a label showing the live value on the left (e.g. **15 km** in accent color) and the range input filling remaining space.

- Min: 5 km (left)
- Max: 50 km (right)  
- Step: 5 km
- Default: preserves current default from `useAppState`
- Value updates live on `onChange` (no debounce needed — API call is already gated by `useAppState`)

Slider thumb and track styled with `accent-color: var(--color-accent)` via a Tailwind utility or inline style.

---

## Affected Files

| File | Change |
|------|--------|
| `src/components/LocationSearch.tsx` | Change autocomplete `types` |
| `src/components/DateScroll.tsx` | Add calendar button + hidden date input |
| `src/components/RadiusSelector.tsx` | Replace pills with range slider |

No changes to `AppClient.tsx`, `useAppState.ts`, or `types.ts` — props/interfaces are unchanged.
