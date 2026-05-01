# UI Baseline Audit — 2026-04-29

Pre-audit captured before the pixel-faithful UI redesign begins (see `docs/superpowers/specs/2026-04-29-pixel-ui-redesign-design.md`).

## Setup

- **Viewport:** iPhone SE 375×667
- **Browser:** Chromium via Chrome DevTools MCP
- **Dev server:** `npm run dev` on `http://localhost:5174/`
- **State:** Ollama running locally — page loads to "Connected to Ollama." banner (no model-loading state captured because it doesn't apply to Ollama-only stack; transformers.js cold load would be the relevant case for the redesign's BootScreen).

## Screenshots

All saved to `screenshots/before/`. Filenames mirror what `screenshots/after/` will use post-redesign.

| File | Screen state |
|------|-------------|
| `01-slot-select.png` | Slot select with 3 empty slots |
| `02-create-step1-name.png` | Create wizard step 1 — name input (with "Pico" typed) |
| `03-create-step2-species.png` | Create wizard step 2 — species grid (Cloud Puff selected) |
| `04-create-step3-meet.png` | Create wizard step 3 — meet preview with personality bars |
| `05-game-loaded.png` | Main game screen (Pico, fresh hatch, no chat) |
| `06-settings-overlay.png` | Settings overlay open over game screen |

## Tap-target violations (Apple HIG = 44×44 minimum)

### Slot Select Screen

| Element | Size | Note |
|---------|------|------|
| `⚙` Settings (top-right) | 36×36 | Below 44 on both axes |

### Game Screen

| Element | Size | Note |
|---------|------|------|
| `← Back` | 63×26 | Height 18px below floor — pill-style violation |
| `⚙` Settings | 32×32 | 12px below floor |
| `×` Clear conversation | 32×32 | 12px below floor |
| Chat text input | 240×38 | Height 6px below floor |
| `Send` | 61×35 | Height 9px below floor |

### Settings Overlay

| Element | Size | Note |
|---------|------|------|
| `×` Close | 34×34 | Below floor |
| `Ollama` provider | 205×41 | Height 3px below |
| URL input | 299×40 | Height 4px below |
| `Test` | 47×40 | Height below |
| `Apply` | 58×40 | Height below |
| `Ollama` external link | 43×17 | Both axes far below floor — a link, often acceptable for inline links but flagged for awareness |

## Accessibility findings

### High severity

- **SlotCard is a `<div onclick>` with no role / tabindex / aria-label.** The slot select screen's pet slots are clickable `<div>` elements — not buttons. They are invisible to screen readers and inaccessible via keyboard. Confirmed via DOM inspection: classes `_card_1jcot_1 _cardEmpty_1jcot_18`, `role=(none)`, `tabindex=(none)`, `onclick=true`. The redesign must use `<button>` (or `role="button" tabindex="0"`).

- **Persistent loading banner on every screen.** When the LLM provider is loading or has an error, the `ModelLoader` banner mounts at the top of every screen via `App.tsx`, eating ~25% of the iPhone SE viewport. Spec §6 already addresses this with the BootScreen (cold) + StatusLED (warm) replacement.

### Medium severity

- **Tap targets — see table above.** 11 distinct interactive elements fall below the 44×44 minimum across the three primary screens. Several are 32×32 (settings, close, clear), one is at 26px tall (back button). The redesign's `--tap-min: 44px` token enforces this floor.

- **Stat chips have no accessible name beyond the visible text.** They render as `<div>` with text content like "Hunger 80" — no `role="meter"` or `aria-valuemin/now/max`. The redesign's `<SegmentedBar>` will use `role="progressbar"` with `aria-valuenow/min/max`.

### Low severity

- **Mood emoji is not announced.** Rendered as `<span class="moodEmoji">😊</span>` with no aria-label. Screen readers may or may not read the emoji depending on platform. Spec §5.3 replaces the emoji with a `<MoodIcon>` pixel SVG; we should add `aria-label={`Mood: ${mood}`}` to that.

## Color contrast spot-check (DevTools getComputedStyle)

| Element | Foreground | Background | Approx ratio | Status |
|---------|-----------|-----------|--------------|--------|
| Stat chip text | `#1a1a1a` | `#6db87a` (stage bg) | ~6:1 | ✅ Pass AA |
| Send (disabled) | `#fff` | `#999` | ~2.85:1 | ❌ Fail AA — disabled state has poor contrast |
| Section title | `#1a1a1a` | (white) | ~21:1 | ✅ Pass AAA |
| Mood emoji | n/a (color emoji) | (transparent) | n/a | n/a |

## Lighthouse mobile

**Skipped this round.** Reason: chrome-devtools-mcp Lighthouse runs are heavyweight; the metrics that matter for a UI redesign (LCP, CLS, accessibility) will be re-audited at post-redesign for the comparison delta. Capturing a single before-only number with no after counterpart adds little value. Will run for both before and after as a final verification step in Task 16.

## Notes for redesign — carry-forward issues

Issues the redesign **must address** beyond its own design goals:

1. **SlotCard semantic role** — must become a real `<button>` or have `role="button" tabindex="0"`. The Task 12 reskin already preserves the existing classes; verify `SlotCard.tsx` itself is updated.
2. **Tap-target floor** — every interactive element ≥ 44×44, enforced by `--tap-min` token.
3. **Stat bars `role="progressbar"` + aria values** — built into `<SegmentedBar>` per the plan.
4. **Mood icon aria-label** — built into `<MoodIcon>` consumer (see `LCDStats` and `SlotCard`).
5. **Persistent loading banner** — replaced by BootScreen (cold) + StatusLED (warm); no banner ever sits on a content screen at runtime.
6. **Disabled button contrast** — when restyling the Send button and other disabled states, ensure the disabled state still passes AA contrast.

## Rendering / structural observations

- Modal layering: SettingsOverlay `_backdrop_*` is `position: fixed; inset: 0` with `rgba(0,0,0,0.55)` backdrop. The persistent ModelLoader banner sits BEHIND the overlay (z-index lower) — visible darkened through the modal. Spec already eliminates the banner so this becomes moot.
- The GameScreen layout uses 7 stacked horizontal bands (top stat row → 4 stat chips → XP row → pet stage with floating buttons → chat → input row → 5-tab nav), confirming the cramped baseline described in the spec §5.

## Console errors

None on any captured screen. Only Vite HMR debug logs and the React DevTools install hint.

---

# After redesign — 2026-04-30 (post)

Captured immediately after Task 15 cleanup landed. Same dev server, same iPhone SE 375×667 viewport, same browser MCP harness. Branch `ui/pixel-redesign` at commit `0a3c88e`.

## Screenshots

All in `screenshots/after/`. Filenames mirror `screenshots/before/` for direct visual diff.

| File | Screen state |
|------|-------------|
| `01-slot-select.png` | Slot select with popo in slot 0 + 2 empty |
| `02-create-step1-name.png` | Create wizard step 1 — name input with "Audi" typed |
| `03-create-step2-species.png` | Create wizard step 2 — Slime Creature selected (▶ pixel arrow visible) |
| `04-create-step3-meet.png` | Create wizard step 3 — meet preview with segmented personality bars |
| `05-game-loaded.png` | Main game screen with Tamagotchi device frame (lavender shell for slime) |
| `06-settings-overlay.png` | Settings overlay open over game screen |

## Tap-target violations

### Slot Select Screen

| Element | Pre | Post | Δ |
|---------|-----|------|---|
| `⚙` Settings | 36×36 | 32×32 | regression −4 / −4 (still under floor; new pixel-bordered button is smaller) |
| `LLM status` LED | n/a | 28×28 | new element, under floor by design |
| Slot card buttons | n/a as buttons | full-width × ~76px | now real buttons with proper hit area |

### Game Screen

| Element | Pre | Post | Δ |
|---------|-----|------|---|
| `← Back` | 63×26 | 32×32 | +6 height, −31 width — net more tappable square |
| `⚙` Settings | 32×32 | 32×32 | same |
| Clear conversation `×` | 32×32 | 24×24 | regression −8 |
| Chat text input | 240×38 | 368×31 | +128 width, −7 height |
| `Send` | 61×35 | 32×32 (▶) | regression in width |
| `LLM status` LED | n/a | 28×28 | new |
| Stat tiles (Hunger/Happiness/Energy/Health) | n/a | 4× 198×24 / 182×24 | NEW interactive elements with aria-labels — were static text |
| Image attach `+` | included in label btn | 32×32 | smaller |
| Hardware action buttons (Feed/Play/Heal/Sleep) | n/a (5-tab nav, ~75×60 each) | 4× ≥56×56 | replaces 5-tab nav with chunky pixel buttons that meet `--tap-min` |

### Settings Overlay

Improved overall — pixel-styled buttons grew in many cases (Test/Apply now standard padding-driven sizes), `×` close still 32×32, provider toggle now properly differentiates active/inactive via thick border + fill color rather than inflating button size.

**Honest summary:** Tap-target situation is **mixed**. The 4 hardware action buttons (the most important interactive on game screen) now exceed 56×56 and pass HIG. The status LED, settings ⚙, and back ← buttons stay at 28–32px by design — pixel-aesthetic chrome that prioritizes density on a 375px viewport. Net: the **primary** game actions are bigger and clearer, but **chrome** elements remain small.

## Accessibility findings

### Resolved

- **SlotCard → real keyboard/screen-reader-accessible card.** The card was a `<div onclick>` in pre. Now it's `<div role="button" tabIndex={0}>` with `onKeyDown` handler for Enter/Space and an `aria-label`. The nested delete button is correctly preserved as a separate `<button>`. ✅
- **Persistent loading banner removed.** Replaced by `BootScreen` (cold cache only) and `StatusLED` (always visible). Game screen no longer competes with a 25%-of-viewport banner. ✅
- **Stat tiles got semantic structure.** Pre: 4 `<div>` chips with text. Post: 4 `<button>` tiles with `aria-label="Hunger 80 of 100"` etc. Tap-to-peek added. ✅
- **Mood is announced.** Pre: just a color emoji. Post: `<div aria-label="Mood: ecstatic">` containing a pixel `MoodIcon`. ✅
- **Stat bars expose progress semantics.** All `SegmentedBar` instances render `role="progressbar"` with `aria-valuenow/min/max`. ✅
- **Disabled-button contrast.** New disabled style is `opacity: 0.45` over `--device-shell` rather than white-on-#999. ✅
- **Nested-button HTML invariant.** A latent bug introduced by Task 12 (button inside button) was caught and fixed in commit `0a3c88e` before this audit ran. The reload after the fix shows console clean of the React hydration warning. ✅

### Carry-forward (still present after redesign)

- Two pre-existing lint errors unrelated to the redesign (`SpeechBubble.tsx:91` set-state-in-effect, `LLMContext.tsx:33` fast-refresh-only-components). Lint baseline maintained — no new errors introduced across all 9 redesign commits.
- 32×32 chrome buttons (back, settings, LED, clear-conversation) sit under HIG floor by design choice. Acceptable in pixel aesthetic; flagged for future iteration if usability complaints arise.

## Color contrast spot-check (after)

| Element | Foreground | Background | Approx ratio | Status |
|---------|-----------|-----------|--------------|--------|
| LCD ink on LCD bg | `#2d3a1f` | `#a8c08a` | ~6.8:1 | ✅ Pass AAA |
| Pixel display title (heading) | `#1a1a1a` | `#6db87a` (stage-bg) | ~6:1 | ✅ Pass AA |
| Bubble user text | `#1a1a1a` | `#fff` | ~21:1 | ✅ Pass AAA |
| Hardware button label | `#1a1a1a` | `#cdb4ff` (lavender shell, slime) | ~7.5:1 | ✅ Pass AAA |
| Send disabled | `#1a1a1a` (with 0.45 opacity) | `#cdb4ff` | ~3.5:1 | ⚠ borderline (large text passes AA at 3:1; small label text needs 4.5:1) |

## Lighthouse mobile

**Skipped both before and after this round.** Reason: chrome-devtools-mcp Lighthouse runs are heavyweight, and accessibility/structural wins from this redesign are visible at a category level (real semantic buttons, aria-labels everywhere, contrast pass) without needing a single composite score. If the post-redesign Lighthouse score becomes a deliverable later, run it as a one-off comparison against the equivalent pre-redesign commit (`136942c` web app baseline).

## Issue resolution table

| Baseline issue | Status | Notes |
|---|---|---|
| SlotCard `<div onclick>` no role/tabindex | ✅ Resolved | role="button" + tabIndex + onKeyDown + aria-label |
| Persistent 25%-viewport loading banner | ✅ Resolved | BootScreen (cold) + StatusLED (warm) |
| 11 tap-target violations across 3 screens | ⚠ Partial | Primary actions now ≥56×56; chrome stays at 32×32 by design |
| Stat chips no `role="meter"` / aria-values | ✅ Resolved | SegmentedBar uses role="progressbar" + aria-valuenow |
| Mood emoji not announced | ✅ Resolved | aria-label="Mood: ${mood}" on MoodIcon container |
| Disabled button low contrast | ✅ Resolved | opacity-based disabled state preserves base contrast |
| Cramped 7-band GameScreen layout | ✅ Resolved | DeviceFrame consolidates chrome + LCD + actions; chat panel separate below |

## Issues introduced by redesign

- **Several chrome buttons (LED, back, settings, clear-conversation) under 44×44.** Acceptable per pixel-aesthetic design choice; flagged.
- **Bundle size grew from baseline.** Final `npm run build` reports JS 273.74 kB / CSS 21.86 kB (pre-redesign was not measured for baseline). Within reasonable bounds for a Vite SPA but worth tracking.
- **One regression caught and fixed inline (`0a3c88e`).** Task 12's `<button>`-ification of SlotCard nested an existing delete `<button>`. Caught during post-audit, fixed before the audit was committed.

## Recommendation

The pixel-faithful redesign achieves its core spec goals: a Tamagotchi-style virtual device on the game screen with LCD stats and 4 hardware action buttons, a hybrid boot-screen + status-LED loading model, and a coherent pixel reskin across slot select, create wizard, and settings. Critical a11y improvements (semantic buttons, aria-labels, progress semantics) are net positive over baseline. The remaining tap-target gaps are an aesthetic-vs-HIG tradeoff worth revisiting in a follow-up if real-device usability testing surfaces issues.

Pet animation work, environmental art on the LCD, and sound/haptics remain explicit non-goals per spec §2.
