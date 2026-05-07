# LCD Stats Legibility — Design

**Date:** 2026-05-03
**Author:** David
**Scope:** `tamagotchi-web/src/components/LCDStats.*`, `SegmentedBar.*`
**Status:** Approved

---

## Problem

The status bars on the LCD viewport are not readable. A player cannot
tell at a glance whether the pet is hungry, sad, tired, or sick.

Root causes (verified in current code):

1. Bars use `size="sm"` — 8px tall. With 2px padding and 2px border,
   only ~4px of vertical space is the actual fill.
2. Filled segments use `var(--lcd-ink)` and the bar's outer border /
   segment dividers also use `var(--lcd-ink)`. At sm size, filled
   versus empty segments are nearly indistinguishable.
3. Numeric values are hidden behind a tap-to-peek interaction; they
   should be visible without interaction.
4. Each tile only gets half the LCD width, with the icon eating part
   of that, so each bar is ~50–60px wide split into 5 segments.

## Goal

A player glancing at the device can immediately read every stat's
approximate value, while preserving the LCD-monochrome aesthetic
(dark ink on green) of the pixel redesign.

## Non-goals

- Moving stats out of the LCD viewport.
- Animating the bars or adding flashing/pulsing effects.
- Color-coding the entire UI; color is reserved for the critical
  threshold only.
- Adding new tests; this change is purely visual.

---

## Visual rules

### Bar geometry

- Introduce a new `lcd` size on `SegmentedBar`: **12px tall**.
- LCD stat bars use **4 segments** (down from 5). Fewer, wider
  segments read better at the LCD's constrained width and each "tick"
  represents a more meaningful 25% jump.
- The XP bar keeps **10 segments** but uses the new 12px height.

### Empty-segment visibility

- Add a new `emptyFillColor` prop on `SegmentedBar`, defaulting to
  `"transparent"` so existing callers (`BootScreen`,
  `CreatePetScreen`) are unaffected.
- `LCDStats` opts in by passing
  `emptyFillColor="var(--lcd-ink-faint)"`. The token is already
  defined in `index.css` as `rgba(45, 58, 31, 0.35)`.
- Filled segments keep their explicit `fillColor` override (currently
  `var(--lcd-ink)`).
- Net effect inside the LCD: filled = solid dark, empty = ghosted
  dark — reads as a proper meter at any size. Outside the LCD, bars
  look exactly as they do today.

### Numeric value, always visible

- Each stat tile renders the integer value to the right of its bar,
  in 9px Silkscreen, right-aligned in a 14px-min slot:
  `[icon] [████░] 78`.
- The tap-to-peek (`78/100`) interaction stays — it now adds the
  `/100` denominator and any flavor text, rather than being the only
  way to read the number.

### Critical threshold

- When `value < 30`, the bar's filled-segment color switches from
  `var(--lcd-ink)` to `var(--stat-fill-red)`, and the numeric value
  next to the bar uses the same red.
- No motion, no blink — static color shift.
- Above 30, everything stays LCD-monochrome.

### XP row

- The XP label is rewritten as `XP n/100` so the player sees exact
  progression without parsing the bar.
- Bar height matches the new `lcd` size; segment count stays at 10.

---

## File-level changes

| File | Change |
| --- | --- |
| `src/components/SegmentedBar.tsx` | Extend `size` prop union to `"sm" \| "lcd" \| "md" \| "lg"`. Map `lcd` to `styles.lcd`. Add new optional `emptyFillColor` prop (default `"transparent"`); use it as the empty-segment inline background instead of the current hard-coded `"transparent"`. |
| `src/components/SegmentedBar.module.css` | Add `.lcd { height: 12px; }`. No change to `.seg` defaults (existing callers untouched). |
| `src/components/LCDStats.tsx` | Switch each `StatTile` bar and the XP bar to `size="lcd"` and `emptyFillColor="var(--lcd-ink-faint)"`. Pass `fillColor={value < 30 ? "var(--stat-fill-red)" : "var(--lcd-ink)"}`. Render numeric value next to each bar (red when `<30`). Update XP label to `XP n/100`. |
| `src/components/LCDStats.module.css` | Add `.statValue { font-size: 9px; min-width: 14px; text-align: right; font-family: var(--pixel); }`. Adjust `.statTile` gap if needed. |

No engine, hook, or storage changes. No new dependencies. No
component-API ripples beyond `LCDStats`.

---

## Verification

- `npm test` (no targeted test exists for these components and we are
  not adding one; visual change only).
- Manual: `npm run dev`, walk through:
  - Fresh pet (full stats) — all four bars 4/4 dark, value `100`.
  - Mid-range pet (~50) — bars 2/4, dark, value `50`.
  - Low pet (`<30`) — bars red, value red.
  - XP at 0, mid, near-100 — denominator visible, segments fill.
- Capture before/after screenshots into
  `docs/superpowers/audits/` for the audit trail.

---

## Risk

Very low. Changes are CSS + a small component prop, isolated to two
files plus their stylesheets. No data shape, no async behavior, no
engine semantics touched. The new `lcd` size is additive and does not
remove existing usages of `sm`/`md`/`lg`.
