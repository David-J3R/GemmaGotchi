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
