# Pixel-Faithful UI Redesign — Design Spec

**Date:** 2026-04-29
**Status:** Approved (brainstorming phase complete, ready for implementation plan)
**Surface:** `tamagotchi-web/` (React + Vite frontend; engine code untouched)

## 1. Goal

Replace the current generic mobile-flat UI with a pixel-faithful, Tamagotchi-device-themed visual system. Mobile-first. Mid-scope: full visual reskin plus targeted layout fixes on the GameScreen; minimal reskin on secondary screens; engine code and animation work out of scope.

## 2. Non-goals

- Pet sprite animation work — separate redesign later (existing animations stay as-is).
- Real environment / background art on the LCD — solid `--lcd-bg` for now.
- Sound effects, haptics, day-night cycle, weather.
- New gameplay mechanics or engine changes.
- Desktop-specific polish — mobile takes priority; desktop just needs to not break.
- Automated visual-regression tests — manual verification via Chrome DevTools MCP screenshots.

## 3. Design decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Aesthetic direction | Retro pixel / Tamagotchi-faithful |
| 2 | Redesign depth | Mid — reskin + targeted layout fixes |
| 3 | Bottom-of-screen real estate | Floating pixel hardware buttons around the pet (D-pad style) |
| 4 | Stats display | Pixel LCD-style indicators on the device frame |
| 5 | LLM loading state | Hybrid — boot screen on first download, status LED afterward |
| 6 | Pet animation work | Skipped this round |
| 7 | Secondary screens (SlotSelect, CreatePet) | Minimal reskin only — pixel font + recolored buttons, no device frame |

## 4. Visual system

All consumed via CSS custom properties in `tamagotchi-web/src/index.css`. No hardcoded colors or sizes anywhere else.

### 4.1 Palette

```
--lcd-bg:           #a8c08a  (pale-green LCD)
--lcd-ink:          #2d3a1f  (near-black-green pixel ink)
--device-shell:     dynamic — picks dominant color of selected species
                    (pink / blue / yellow / mint variants)
--device-shell-shadow: darker tone of --device-shell
--device-bezel:     #1a1a1a (dark plastic ring)
--led-red:          #e84545
--led-amber:        #f5a524
--led-green:        #5b8c3e
--stage-bg:         existing — repurposed as wallpaper behind the device
```

### 4.2 Typography

```
--pixel:        "Silkscreen", "Press Start 2P", monospace  (already declared, unused)
--display-pixel: same family, heavier weight, used for screen titles
--sans:         "Nunito" — body text in chat bubbles only (readability)
```

Pixel font drives: headings, button labels, stat readouts, status strings, slot/species names.
Sans font: chat bubble bodies, long-form text in CreatePet personality / loves / dislikes / quirks.

### 4.3 Pixel scale & borders

```
--px:            2px  (base pixel unit; all spacing/borders snap to multiples)
--border-thick:  calc(var(--px) * 2)   = 4px solid black
--border-chunky: calc(var(--px) * 4)   = 8px solid black (active/selected states)
```

No gradients. No `border-radius` except integer multiples of `--px` for the LCD screen and shell corners. Solid black borders only.

### 4.4 Shadows

Hard-edge offset shadows (no blur):

```
--shadow-pixel:        4px 4px 0 var(--device-bezel)
--shadow-pixel-press:  2px 2px 0 var(--device-bezel)  (active button state)
```

### 4.5 Tap targets

```
--tap-min: 44px   (Apple HIG)
```

Enforced on every interactive element. Pre-audit captures current violations; redesign fixes them.

### 4.6 Rendering rule

Add `image-rendering: pixelated` globally to `canvas`, `img.pixel`, and pixel-art SVG icons. Pin pixel-art assets to integer scaling to avoid blurry edges at non-integer device pixel ratios.

## 5. GameScreen layout

### 5.1 Anatomy (top → bottom)

```
┌──────────── --device-shell ────────────┐
│  ● status-LED          pixel ID strip   │  top chrome (~40px)
│                                          │
│  ┌────────── LCD screen ──────────┐     │
│  │  ─────── XP segmented bar ───── │     │
│  │   ♥▓▓▓░  🍴▓▓▓▓░               │     │  LCD top: 2 stat bars
│  │                                 │     │
│  │            [pet sprite]         │     │  ~50–55dvh
│  │                                 │     │
│  │   ⚡▓▓░░░  ✚▓▓▓▓▓               │     │  LCD bottom: 2 stat bars
│  │                          (😊)    │     │  + mood pixel-icon
│  └─────────────────────────────────┘     │
│                                          │
│   [A]    [B]    [C]    [D]              │  4 hardware pixel buttons
│   FEED  PLAY  HEAL  SLEEP                │  (shell-inset, --shadow-pixel)
└──────────────────────────────────────────┘
              ↓
   ┌─ chat scroll area ──────────┐
   │  user bubble                 │
   │            pet bubble        │
   └──────────────────────────────┘
   [+]  Say something to Pico…  [▶]   chat input row, single line
```

### 5.2 Top chrome of the device shell

- **Status LED (top-left):** circular pixel dot, 28×28px tap target. Reflects `LLMContext` state — see §7.
- **ID strip (top-right):** single line of pixel text — `Lv 3 · Age 7 · Bond ♥♥♥♡`. Bond shown as 4 heart pips (filled count = bond level / max). No mood here (mood lives on the LCD).
- **Settings button (top-right corner of shell, separate from ID strip):** small pixel-bordered ⚙ button, 32×32. Replaces current floating settings button.
- **Back button:** small pixel "←" pill in top-left of the device shell. Replaces current `.backBtn`.

### 5.3 LCD screen contents

- **XP bar:** thin segmented strip across the very top of the LCD (1 segment per level threshold; partial fill of current segment).
- **Stat bars (4):** `Hunger`, `Happiness`, `Energy`, `Health`. Each is a 5-segment chunky pixel bar in `--lcd-ink` on `--lcd-bg`. Two on top edge of LCD, two on bottom edge. Pixel icon next to each (♥ 🍴 ⚡ ✚ — final icons TBD during implementation; pixel SVGs).
- **Pet sprite:** existing `<PetViewport>` canvas rendered inside the LCD area. Solid `--lcd-bg` background. `pixelScale` likely raised from 6 → 7 or 8 to fill the larger area; final value picked during implementation based on iPhone SE rendering.
- **Mood icon:** pixel-art mood icon in the bottom-right LCD corner. Replaces emoji. Maps `PetMood` → pixel sprite (10 moods × 1 frame each — small art task within scope of pixel reskin).
- **No numeric values shown by default.** Tap any LCD stat bar → small pixel popover near the bar with `Hunger 77/100`. Tap outside to dismiss.

### 5.4 Hardware action buttons

Replaces the current 5-tab `ActionButtons` bottom nav. The 5th tab (Home) was navigation, not gameplay, so it moves to the back-button.

- **4 buttons:** `FEED`, `PLAY`, `HEAL`, `SLEEP`. Existing keyboard shortcuts in `GameScreen.tsx` are `F=feed`, `P=play`, `S=sleep`, `T=focus chat input`. Redesign keeps all four and **adds `H=heal`** so every action button has a key. Talk (`T`) stays bound to the chat input — chat is no longer a button on the device, so the shortcut is the primary keyboard path to talking on desktop.
- **Visual:** chunky pixel buttons inset on the device shell. Black border, hard offset shadow. Active/pressed state: button moves down 4px and shadow shrinks (`--shadow-pixel-press`). Disabled state (during `isThinking`): grayed-out shell color, no shadow.
- **Min size:** 56×56px to comfortably exceed `--tap-min`.

### 5.5 Chat panel

Below the device, separated by wallpaper-green margin.

- **Card style:** pixel-bordered container (`--border-thick` black, `--shadow-pixel`). Background `#fff` (current chat background works as paper).
- **Scroll area:** existing chat list. Bubble styles get pixel-bordered (no rounded radii beyond `--px` multiples) and reduced max-width for visual balance.
- **Input row:** pixel-bordered row, single line. `+` image button moves *inside* the input field on the left (icon-only, no "Show image" label) to free horizontal space. Send button replaced by a pixel ▶ icon button.
- **Clear-chat × button:** moves from the device frame into the chat panel header (only renders when `history.length > 0`).
- **Image-error inline message:** keeps existing logic, restyled with pixel border + amber background.

### 5.6 Mobile real-estate budget (iPhone SE 375×667)

| Region | Height |
|--------|--------|
| Status bar / safe-area | 44px |
| Device shell (top chrome + LCD + buttons) | ~440px |
| Wallpaper margin | 12px |
| Chat scroll area | ~135px (4–5 visible bubbles) |
| Chat input row | ~48px |
| Bottom safe-area | ~16px |

Larger viewports get the extra space distributed to chat scroll area first, then LCD pet area.

## 6. Loading state (boot screen + status LED)

Hybrid per Q5 D.

### 6.1 First-time boot (cold load)

Full-screen takeover. Replaces the current `ModelLoader` banner entirely. Mounts before any screen renders if model isn't ready and no cached weights exist in IDB.

Visual:
- Wallpaper-green background (same `--stage-bg`) so the device shell appearing afterward feels continuous.
- Pixel display title: `TAMA-OS / v1.0` (chunky, centered).
- Existing pet sprite at 2× scale, idle animation, centered.
- Status lines in pixel monospace with a CRT-style blinking cursor on the active line:
  - `> BOOTING NEURAL CORE...`
  - `> Loading <model-name>  37%`
  - chunky segmented progress bar (8–10 segments; fills as percent passes thresholds).
- Subtitle: `This only happens once.`
- No skip button — the model is required.

Wired to existing `ModelLoader` events (download phase, init phase, ready). One commit boundary swaps banner → boot screen; no other behavior change.

### 6.2 Error state

Red `> CONNECTION LOST` line + pixel `[ TRY AGAIN ]` button. Falls through to current error-handling semantics, just restyled.

### 6.3 Subsequent loads (warm)

Boot screen suppressed. Status LED on the device shell (and on every other screen's top-right corner) reflects state:

| State | LED |
|-------|-----|
| Loading / initializing | 🔴 red, blinking |
| Mid-inference (`isThinking`) | 🟡 amber, solid |
| Ready, idle | 🟢 green, solid |
| No provider configured (e.g. Ollama disconnected) | ⚫ off |

Tap LED → small pixel modal: provider name, model, percent complete, `[ RE-TEST CONNECTION ]` button. Replaces current banner functionality at ~28×28px instead of ~25% of viewport.

### 6.4 Cold-vs-warm detection

At app boot, check IDB (existing `idb-keyval` usage) for cached `transformers.js` model files. If present and not stale (mtime within N days; N defined during implementation, default 30), skip boot screen. If missing or first launch, show boot screen.

## 7. Secondary screens

Per Q7 C — pixel font + recolored buttons + pixel borders, no device frame.

### 7.1 SlotSelectScreen

- Title `YOUR PETS` in `--display-pixel`, all caps, with 1-pixel underline shadow.
- Each slot becomes a pixel-bordered card (`--border-thick`, `--shadow-pixel`).
- **Empty slots:** solid pastel-shell background, chunky `[+ NEW PET]` pixel button label. Dashed borders removed (read as "broken" in pixel UIs).
- **Occupied slots:** small pet sprite preview on the left, pet name + level + age on the right in pixel font, mood pixel-icon.
- Status LED in top-right of the screen (same component as game screen).

### 7.2 CreatePetScreen (3-step wizard)

Layout identical (3 steps: name → species → meet). Pure visual swap.

- **Step indicator:** 3 dots → 3 chunky pixel squares; active filled solid black.
- **Name input:** pixel-bordered, `--pixel` font, `[ENTER]` hint pixel-pill on the right.
- **Species cards:** pixel-bordered with hard offset shadow. Active card: `--border-chunky` + `>` pixel-arrow indicator on the left. Replaces current ring-shadow active state.
- **Meet step preview frame:** dark navy frame already reads as a "screen" — gets pixel border. Personality bars become 5-segment chunky bars (matches LCD stat style). Loves/Dislikes/Quirks card gets pixel borders.
- **Buttons (Reroll / Hatch!):** flat → chunky pixel buttons with `--shadow-pixel`. Press state: down 4px, `--shadow-pixel-press`.

### 7.3 SettingsOverlay

- Section cards (`LLM PROVIDER` / `DATA` / `ABOUT`) get pixel borders.
- WebGPU / Ollama provider toggle becomes a 2-position pixel switch.
- Destructive `Delete all data` button gets a red pixel border (`--led-red` on white).
- Other elements (URL input, Test/Apply, Export/Import) restyled to match.

## 8. Execution plan

Each step = one commit on a feature branch (`ui/pixel-redesign`).

| # | Step | Commit message |
|---|------|---------------|
| 0 | Pre-audit | `chore(audit): UI baseline before pixel redesign` |
| 1 | Design tokens (`index.css`) | `style(tokens): introduce pixel design tokens` |
| 2 | Boot screen + status LED | `feat(ui): pixel boot screen and status LED replace loading banner` |
| 3 | GameScreen device frame | `feat(ui): tamagotchi device frame on game screen` |
| 4 | SlotSelectScreen reskin | `style(ui): pixel reskin slot select screen` |
| 5 | CreatePetScreen reskin | `style(ui): pixel reskin create pet wizard` |
| 6 | SettingsOverlay reskin | `style(ui): pixel reskin settings overlay` |
| 7 | Final cleanup (run `simplify`, drop transitional aliases) | `refactor(ui): cleanup after pixel redesign` |
| 8 | Post-audit (rerun script, append "after" to report) | `chore(audit): UI post-redesign comparison` |

## 9. Verification

### 9.1 Pre-audit (step 0)

Captures baseline before any change.

- **Tool:** Chrome DevTools MCP (primary), Playwright MCP fallback for cross-viewport screenshots.
- **Viewports:** iPhone SE (375×667), iPhone 15 (393×852), Pixel 8 (412×915).
- **Per viewport, capture:** full-screen screenshot of every screen state (slots, create-step1/2/3, game-loading, game-loaded, settings overlay), DevTools accessibility snapshot, computed tap-target sizes for interactive elements, color-contrast pairs.
- **One-shot:** Lighthouse mobile audit on the game screen (LCP, CLS, accessibility).
- **One-shot:** a11y skill pass (`chrome-devtools-mcp:a11y-debugging`) for ARIA/focus/keyboard issues.
- **Deliverable:** `docs/superpowers/audits/2026-04-29-ui-baseline.md` with severity-ranked issue list and screenshots in `docs/superpowers/audits/screenshots/`.
- **Time budget:** 15–20 minutes hard cap.

### 9.2 Per-step verification

After each commit:
- `tsc -b` (build).
- `npm run lint`.
- `npm run dev` sanity-load — page renders, no console errors.

After steps 2, 3, 4, 5, 6:
- Chrome DevTools MCP screenshot at iPhone SE (375×667). Visual goal confirmed before proceeding to next step.

After step 3 (largest visual change):
- a11y skill pass on new GameScreen — tap targets ≥ 44px, contrast on LCD ink/bg, focus rings visible, keyboard shortcuts (F/P/H/S/T) still work.

After step 7:
- Lighthouse mobile on GameScreen — accessibility ≥ 95, no LCP regression vs baseline, no new console errors.

### 9.3 Post-audit (step 8)

Re-run the same audit script against the redesigned UI. Append "after" section to the audit report with side-by-side screenshots and metrics. This is the proof that issues actually got fixed (not just papered over).

## 10. Rollback strategy

- Branch: `ui/pixel-redesign`. Each step is its own commit.
- Any step can be reverted independently via `git revert`.
- After step 7, open a PR for review before merge to `main`.
- Engine tests (`node:test`, Layer 2) continue to pass throughout — no engine code changes.

## 11. Open implementation questions

These are decisions deferred to implementation time, not unresolved design questions:

- Final pixel scale for `<PetViewport>` inside the larger LCD area (currently 6; likely 7 or 8 — pick during implementation based on iPhone SE rendering).
- Exact pixel-icon designs for the 4 stat icons (♥ 🍴 ⚡ ✚) and 10 mood icons. Small pixel-art task, in scope.
- IDB cache freshness threshold for warm-load detection (default 30 days).
- Exact `--device-shell` pastel mappings per species. Five species × one shell color each.

These are left to the implementation plan to resolve concretely.
