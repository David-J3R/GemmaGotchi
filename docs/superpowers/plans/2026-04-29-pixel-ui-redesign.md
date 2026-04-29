# Pixel-Faithful UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-04-29-pixel-ui-redesign-design.md`

**Goal:** Replace the current generic mobile-flat UI with a pixel-faithful Tamagotchi-device-themed visual system, mobile-first, with a virtual device frame on the GameScreen and a minimal pixel reskin elsewhere.

**Architecture:** All design tokens live in `tamagotchi-web/src/index.css`. New small composable components (`SegmentedBar`, `StatIcon`, `MoodIcon`, `HardwareButton`, `StatusLED`, `BootScreen`, `LCDStats`, `DeviceFrame`) are added under `tamagotchi-web/src/components/`. The GameScreen rewrites its layout to compose `DeviceFrame` + chat. Secondary screens consume only the new tokens — no structural changes. Engine and LLM context untouched.

**Tech Stack:** React 19 + Vite 8, TypeScript, CSS Modules, existing pixel-art `<PetViewport>` canvas, existing `LLMContext` for boot/LED state, existing `node:test` for engine tests (untouched).

**Branch:** `ui/pixel-redesign` (create at start of Task 1).

**Mobile target:** iPhone SE 375×667 is the binding viewport — all screenshot verification uses it.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `tamagotchi-web/src/components/SegmentedBar.tsx` + `.module.css` | Reusable N-segment chunky pixel bar (used by LCD stats, XP bar, CreatePet personality bars). |
| `tamagotchi-web/src/components/StatIcon.tsx` | Pixel-art SVG icons for the 4 stats (Hunger=fork, Happiness=heart, Energy=lightning, Health=plus). |
| `tamagotchi-web/src/components/MoodIcon.tsx` | Pixel-art SVG icons for 10 `PetMood` states. |
| `tamagotchi-web/src/components/HardwareButton.tsx` + `.module.css` | Chunky pixel button with hard offset shadow + press animation. |
| `tamagotchi-web/src/components/StatusLED.tsx` + `.module.css` | Circular pixel status dot reflecting LLM context state. |
| `tamagotchi-web/src/components/BootScreen.tsx` + `.module.css` | Full-screen pixel boot UI for first-time model download. |
| `tamagotchi-web/src/components/LCDStats.tsx` + `.module.css` | LCD-style stat strip rendered inside the device's screen area. |
| `tamagotchi-web/src/components/DeviceFrame.tsx` + `.module.css` | The Tamagotchi device shell (chrome, LCD area, hardware buttons). |
| `tamagotchi-web/src/llm/cache.ts` | Pure function `hasCachedModel()` for cold-vs-warm boot detection. |
| `tamagotchi-web/tests/llm/cache.test.ts` | Tests for `hasCachedModel`. |
| `docs/superpowers/audits/2026-04-29-ui-baseline.md` | Pre-audit report. |
| `docs/superpowers/audits/screenshots/before/*.png` | Baseline screenshots. |
| `docs/superpowers/audits/screenshots/after/*.png` | Post-redesign screenshots. |

### Modified files

| Path | Reason |
|---|---|
| `tamagotchi-web/src/index.css` | Replace `:root` with new design tokens. |
| `tamagotchi-web/src/App.tsx` | Mount `BootScreen` conditionally; remove `<ModelLoader>` mount; replace floating settings button with `StatusLED` consumer. |
| `tamagotchi-web/src/screens/GameScreen.tsx` | Recompose around `DeviceFrame` + chat panel; drop old `StatsBar` + `ActionButtons`. |
| `tamagotchi-web/src/screens/GameScreen.module.css` | Rewrite for new layout. |
| `tamagotchi-web/src/screens/SlotSelectScreen.module.css` | Pixel reskin. |
| `tamagotchi-web/src/screens/CreatePetScreen.module.css` | Pixel reskin. |
| `tamagotchi-web/src/components/SettingsOverlay.module.css` | Pixel reskin. |
| `tamagotchi-web/src/components/SpeechBubble.module.css` | Pixel borders on bubbles. |
| `tamagotchi-web/src/components/SlotCard.module.css` | Pixel reskin. |
| `tamagotchi-web/src/llm/ModelLoader.tsx` | Deleted — replaced by BootScreen + StatusLED. |

### Deleted files (in cleanup task)

| Path | Reason |
|---|---|
| `tamagotchi-web/src/components/StatsBar.tsx` + `.module.css` | Replaced by LCDStats. |
| `tamagotchi-web/src/components/ActionButtons.tsx` + `.module.css` | Replaced by hardware buttons inside DeviceFrame. |
| `tamagotchi-web/src/llm/ModelLoader.tsx` | Replaced by BootScreen + StatusLED. |

---

## Task Index

| # | Task | Commit |
|---|---|---|
| 0 | Pre-audit baseline | `chore(audit): UI baseline before pixel redesign` |
| 1 | Design tokens (`index.css`) | `style(tokens): introduce pixel design tokens` |
| 2 | `SegmentedBar` component | (rolled into Task 1's commit — small enough) |
| 3 | `StatIcon` + `MoodIcon` components | `feat(ui): pixel stat and mood icons` |
| 4 | `HardwareButton` component | `feat(ui): pixel hardware button` |
| 5 | `StatusLED` component | `feat(ui): pixel status LED` |
| 6 | Cache detection (`cache.ts`) + tests | `feat(llm): cold-vs-warm cache detection` |
| 7 | `BootScreen` component | `feat(ui): pixel boot screen` |
| 8 | Wire BootScreen + StatusLED into App; delete ModelLoader | `feat(ui): pixel boot screen and status LED replace loading banner` |
| 9 | `LCDStats` component | (rolled into Task 11's GameScreen commit) |
| 10 | `DeviceFrame` component | (rolled into Task 11's GameScreen commit) |
| 11 | GameScreen rewrite | `feat(ui): tamagotchi device frame on game screen` |
| 12 | SlotSelectScreen reskin | `style(ui): pixel reskin slot select screen` |
| 13 | CreatePetScreen reskin | `style(ui): pixel reskin create pet wizard` |
| 14 | SettingsOverlay reskin | `style(ui): pixel reskin settings overlay` |
| 15 | Cleanup | `refactor(ui): cleanup after pixel redesign` |
| 16 | Post-audit comparison | `chore(audit): UI post-redesign comparison` |

---

## Task 0: Pre-audit baseline

**Files:**
- Create: `docs/superpowers/audits/2026-04-29-ui-baseline.md`
- Create: `docs/superpowers/audits/screenshots/before/*.png`

- [ ] **Step 1: Start dev server in background**

```bash
cd tamagotchi-web
npm install   # only if node_modules absent
npm run dev
```

Expected: Vite serves on `http://localhost:5173`. Note the URL.

- [ ] **Step 2: Screenshot every screen at iPhone SE (375×667)**

Use Chrome DevTools MCP. For each screen state below, take a full-page screenshot and save to `docs/superpowers/audits/screenshots/before/<name>.png`.

States to capture (force the state in the running app):
- `slot-select-empty.png` — fresh state, 3 empty slots
- `slot-select-with-pets.png` — at least one pet exists
- `create-step1-name.png`
- `create-step2-species.png`
- `create-step3-meet.png`
- `game-loading.png` — model loading banner visible
- `game-loaded-happy.png` — happy mood
- `game-loaded-with-chat.png` — at least 2 messages in chat
- `settings-overlay.png` — overlay open

- [ ] **Step 3: Capture computed metrics**

For the GameScreen at 375×667, run in DevTools console:

```js
const els = document.querySelectorAll('button, input, [role="button"]');
const tooSmall = [...els].filter(e => {
  const r = e.getBoundingClientRect();
  return r.width < 44 || r.height < 44;
}).map(e => ({
  text: e.textContent?.trim().slice(0, 30) || e.ariaLabel,
  w: Math.round(r.width),
  h: Math.round(r.height),
}));
console.table(tooSmall);
```

Save the output as a code block in the audit report.

- [ ] **Step 4: Run a11y skill pass**

Use `chrome-devtools-mcp:a11y-debugging` skill to audit the GameScreen. Save findings into the audit report under "Accessibility findings".

- [ ] **Step 5: Lighthouse mobile audit**

Run Lighthouse mobile on the GameScreen via Chrome DevTools MCP. Capture LCP, CLS, accessibility score. Save to audit report.

- [ ] **Step 6: Write the audit report**

Create `docs/superpowers/audits/2026-04-29-ui-baseline.md` with this structure:

```markdown
# UI Baseline Audit — 2026-04-29

## Viewport
iPhone SE 375×667

## Screenshots
See `screenshots/before/`.

## Findings (severity-ranked)

### High
- [issue + screenshot reference]

### Medium
- ...

### Low
- ...

## Tap-target violations
[code block from Step 3]

## Accessibility findings
[from Step 4]

## Lighthouse mobile
- LCP: X.Xs
- CLS: X.XX
- Accessibility: XX/100

## Notes for redesign
- Specific issues the redesign must address (carry-forward list).
```

- [ ] **Step 7: Commit on a fresh branch**

```bash
git checkout -b ui/pixel-redesign
git add docs/superpowers/audits/
git commit -m "chore(audit): UI baseline before pixel redesign"
```

Expected: clean commit, no other files staged.

---

## Task 1: Design tokens (`index.css`)

**Files:**
- Modify: `tamagotchi-web/src/index.css` (full rewrite of `:root` block)

- [ ] **Step 1: Replace the `:root` block**

Open `tamagotchi-web/src/index.css`. Replace the existing `:root { ... }` block (lines 1–39) with:

```css
:root {
  /* === Pixel design tokens === */

  /* Pixel scale unit — all spacing/borders snap to multiples */
  --px: 2px;
  --border-thin:   var(--px);                /* 2px */
  --border-thick:  calc(var(--px) * 2);      /* 4px */
  --border-chunky: calc(var(--px) * 4);      /* 8px */

  /* Hard-edge offset shadows (no blur) */
  --shadow-pixel:        4px 4px 0 #1a1a1a;
  --shadow-pixel-press:  2px 2px 0 #1a1a1a;

  /* Tap target floor (Apple HIG) */
  --tap-min: 44px;

  /* LCD palette */
  --lcd-bg:            #a8c08a;
  --lcd-ink:           #2d3a1f;
  --lcd-ink-faint:     rgba(45, 58, 31, 0.35);

  /* Device shell — defaults; overridden per species via inline style on root device element */
  --device-shell:        #f0c8d0;
  --device-shell-shadow: #c89aa3;
  --device-bezel:        #1a1a1a;

  /* Status LED colors */
  --led-red:    #e84545;
  --led-amber:  #f5a524;
  --led-green:  #5b8c3e;
  --led-off:    #555555;

  /* Wallpaper behind the device (replaces old --stage-bg use as page background) */
  --stage-bg:      #6db87a;
  --stage-bg-dark: #4d9a5e;

  /* Text */
  --text-primary: #1a1a1a;
  --text-muted:   #555555;
  --text-inverse: #ffffff;

  /* Chat bubbles */
  --bubble-pet-bg:        #6ba1d8;
  --bubble-pet-text:      #ffffff;
  --bubble-user-bg:       #ffffff;
  --bubble-user-text:     #1a1a1a;
  --bubble-user-border:   #1a1a1a;

  /* Stat fill (used by SegmentedBar when explicit color not set) */
  --stat-fill-green:  #5b8c3e;
  --stat-fill-yellow: #c4a020;
  --stat-fill-red:    #a03030;

  /* Fonts */
  --pixel:         "Silkscreen", "Press Start 2P", "Courier New", monospace;
  --display-pixel: "Silkscreen", "Press Start 2P", "Courier New", monospace;
  --sans:          "Nunito", system-ui, "Segoe UI", Roboto, sans-serif;

  font: 16px/1.4 var(--sans);
  color: var(--text-primary);
  background: var(--stage-bg);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Pixel art rendering — pin canvases and pixel-marked images to integer scaling */
canvas,
img.pixel,
svg.pixel {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: var(--stage-bg);
  overflow: hidden;
}

#root {
  height: 100dvh;
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  background: var(--stage-bg);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

button {
  font-family: inherit;
  cursor: pointer;
}

button:disabled {
  cursor: default;
}

h1, h2, h3 {
  font-family: var(--display-pixel);
  font-weight: 400; /* pixel fonts are inherently chunky; normal weight reads bold */
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 0.05em;
}

p {
  margin: 0;
}
```

- [ ] **Step 2: Add Silkscreen font import**

At the very top of `tamagotchi-web/src/index.css`, before the `:root` block, add:

```css
@import url("https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap");
```

- [ ] **Step 3: Type-check and lint**

```bash
cd tamagotchi-web
npm run lint
npx tsc -b
```

Expected: both pass with no errors.

- [ ] **Step 4: Visual smoke check**

Reload the dev server. Verify the app still renders (it will look largely the same since no components have been updated yet — just headings will start rendering in the pixel font). Confirm no console errors.

- [ ] **Step 5: Commit**

```bash
git add tamagotchi-web/src/index.css
git commit -m "style(tokens): introduce pixel design tokens"
```

---

## Task 2: `SegmentedBar` component

**Files:**
- Create: `tamagotchi-web/src/components/SegmentedBar.tsx`
- Create: `tamagotchi-web/src/components/SegmentedBar.module.css`

This component is reused by `LCDStats`, the XP bar, the BootScreen progress bar, and the CreatePet personality bars. Build it once.

- [ ] **Step 1: Create the component**

Create `tamagotchi-web/src/components/SegmentedBar.tsx`:

```tsx
import styles from "./SegmentedBar.module.css";

interface Props {
  /** 0–1 fill value. */
  value: number;
  /** Number of segments. Default 5. */
  segments?: number;
  /** CSS color for filled segments. */
  fillColor?: string;
  /** CSS color for the bar's ink/border. Defaults to current text color. */
  inkColor?: string;
  /** Background color behind segments. */
  bgColor?: string;
  /** Optional aria-label. */
  ariaLabel?: string;
  /** Visual size — "sm" (LCD stats), "md" (default), "lg" (boot/personality). */
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SegmentedBar({
  value,
  segments = 5,
  fillColor,
  inkColor,
  bgColor,
  ariaLabel,
  size = "md",
  className,
}: Props) {
  const clamped = Math.max(0, Math.min(1, value));
  const filledCount = Math.round(clamped * segments);
  const sizeClass =
    size === "sm" ? styles.sm : size === "lg" ? styles.lg : styles.md;

  return (
    <div
      className={`${styles.bar} ${sizeClass} ${className ?? ""}`}
      style={{
        ["--seg-ink" as string]: inkColor,
        ["--seg-bg" as string]: bgColor,
      }}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={styles.seg}
          style={{
            background: i < filledCount ? fillColor ?? "currentColor" : "transparent",
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create the CSS module**

Create `tamagotchi-web/src/components/SegmentedBar.module.css`:

```css
.bar {
  --seg-ink: currentColor;
  --seg-bg: transparent;
  display: inline-flex;
  align-items: stretch;
  gap: var(--px);
  padding: var(--px);
  background: var(--seg-bg);
  border: var(--border-thin) solid var(--seg-ink);
}

.seg {
  flex: 1 1 0;
  min-width: calc(var(--px) * 2);
  border-right: var(--px) solid var(--seg-ink);
}

.seg:last-child {
  border-right: none;
}

.sm { height: 8px; }
.md { height: 14px; }
.lg { height: 22px; }
```

- [ ] **Step 3: Type-check**

```bash
cd tamagotchi-web
npx tsc -b
```

Expected: no errors. Do not commit yet — `SegmentedBar` will go in with Task 3's commit since both are small util pieces.

---

## Task 3: `StatIcon` + `MoodIcon` components

**Files:**
- Create: `tamagotchi-web/src/components/StatIcon.tsx`
- Create: `tamagotchi-web/src/components/MoodIcon.tsx`

Both are pure SVG components — no CSS module needed (sized via prop).

- [ ] **Step 1: Create `StatIcon.tsx`**

Create `tamagotchi-web/src/components/StatIcon.tsx`:

```tsx
type StatKind = "hunger" | "happiness" | "energy" | "health";

interface Props {
  kind: StatKind;
  size?: number;
  color?: string;
  className?: string;
}

/**
 * 8x8 pixel-art icons rendered as SVG with crisp pixels.
 * Each path describes one filled pixel (1×1 unit) on an 8×8 grid.
 */
const PIXELS: Record<StatKind, string[]> = {
  // fork: tines + handle
  hunger: [
    "1,0","3,0","5,0",
    "1,1","3,1","5,1",
    "1,2","3,2","5,2",
    "1,3","2,3","3,3","4,3","5,3",
    "3,4","3,5","3,6","3,7",
  ],
  // heart
  happiness: [
    "1,1","2,1","5,1","6,1",
    "0,2","1,2","2,2","3,2","4,2","5,2","6,2","7,2",
    "0,3","1,3","2,3","3,3","4,3","5,3","6,3","7,3",
    "1,4","2,4","3,4","4,4","5,4","6,4",
    "2,5","3,5","4,5","5,5",
    "3,6","4,6",
  ],
  // lightning bolt
  energy: [
    "4,0","5,0",
    "3,1","4,1",
    "2,2","3,2","4,2","5,2",
    "3,3","4,3",
    "2,4","3,4","4,4","5,4",
    "3,5","4,5",
    "2,6","3,6",
  ],
  // plus / cross
  health: [
    "3,1","4,1",
    "3,2","4,2",
    "1,3","2,3","3,3","4,3","5,3","6,3",
    "1,4","2,4","3,4","4,4","5,4","6,4",
    "3,5","4,5",
    "3,6","4,6",
  ],
};

export function StatIcon({ kind, size = 16, color = "currentColor", className }: Props) {
  const pixels = PIXELS[kind];
  return (
    <svg
      className={`pixel ${className ?? ""}`}
      width={size}
      height={size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      aria-hidden
    >
      {pixels.map((p, i) => {
        const [x, y] = p.split(",");
        return <rect key={i} x={x} y={y} width={1} height={1} fill={color} />;
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Create `MoodIcon.tsx`**

Create `tamagotchi-web/src/components/MoodIcon.tsx`:

```tsx
import type { PetMood } from "../engine/types";

interface Props {
  mood: PetMood;
  size?: number;
  color?: string;
  className?: string;
}

/**
 * 8x8 pixel-art mood icons. Each entry lists the filled pixels.
 * Designed to read at 16–24px on the LCD.
 */
const PIXELS: Record<PetMood, string[]> = {
  ecstatic: [ // wide grin + sparkle eyes
    "2,2","5,2","2,3","5,3",
    "1,5","2,5","3,5","4,5","5,5","6,5",
    "2,6","5,6",
    "0,1","7,1",
  ],
  happy: [ // smile + dot eyes
    "2,2","5,2",
    "2,5","5,5",
    "3,6","4,6",
  ],
  content: [ // small smile + dot eyes
    "2,2","5,2",
    "3,5","4,5",
  ],
  bored: [ // flat mouth + dot eyes
    "2,2","5,2",
    "2,5","3,5","4,5","5,5",
  ],
  sad: [ // frown + dot eyes
    "2,2","5,2",
    "3,6","4,6",
    "2,5","5,5",
  ],
  angry: [ // angled brows + frown
    "1,1","2,2","5,2","6,1",
    "2,3","5,3",
    "2,5","5,5","3,6","4,6",
  ],
  sick: [ // x eyes + flat mouth
    "1,2","3,2","1,3","3,3",
    "5,2","6,2","6,3","5,3",
    "2,5","3,5","4,5","5,5",
  ],
  exhausted: [ // closed eyes ~ + zzz dot
    "1,2","2,2","3,2",
    "5,2","6,2",
    "3,5","4,5",
    "6,0",
  ],
  starving: [ // open mouth + spiral eyes
    "2,2","3,2","4,2","5,2",
    "2,3","5,3",
    "3,5","4,5","2,5","5,5","2,6","3,6","4,6","5,6",
  ],
  critical: [ // skull-ish: hollow eyes + grimace
    "1,2","2,2","3,2","1,3","3,3",
    "4,2","5,2","6,2","4,3","6,3",
    "1,5","2,5","3,5","4,5","5,5","6,5",
    "2,6","4,6","6,6",
  ],
};

export function MoodIcon({ mood, size = 16, color = "currentColor", className }: Props) {
  const pixels = PIXELS[mood];
  return (
    <svg
      className={`pixel ${className ?? ""}`}
      width={size}
      height={size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      aria-hidden
    >
      {pixels.map((p, i) => {
        const [x, y] = p.split(",");
        return <rect key={i} x={x} y={y} width={1} height={1} fill={color} />;
      })}
    </svg>
  );
}
```

Note: the pixel coordinates above are starter art — refine them by eye on a real screen during Task 11's visual verification. The function shape and prop API stay stable.

- [ ] **Step 3: Type-check**

```bash
cd tamagotchi-web
npx tsc -b
```

Expected: no errors. The import of `PetMood` from `../engine/types` must resolve — if it doesn't, search for the actual export location with `grep -rn "type PetMood" tamagotchi-web/src/engine/`.

- [ ] **Step 4: Commit Tasks 2 + 3 together**

```bash
git add tamagotchi-web/src/components/SegmentedBar.tsx
git add tamagotchi-web/src/components/SegmentedBar.module.css
git add tamagotchi-web/src/components/StatIcon.tsx
git add tamagotchi-web/src/components/MoodIcon.tsx
git commit -m "feat(ui): pixel stat and mood icons + segmented bar primitive"
```

---

## Task 4: `HardwareButton` component

**Files:**
- Create: `tamagotchi-web/src/components/HardwareButton.tsx`
- Create: `tamagotchi-web/src/components/HardwareButton.module.css`

- [ ] **Step 1: Create the component**

Create `tamagotchi-web/src/components/HardwareButton.tsx`:

```tsx
import type { ReactNode } from "react";
import styles from "./HardwareButton.module.css";

interface Props {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  shortcutKey?: string;
  className?: string;
}

export function HardwareButton({
  label,
  icon,
  onClick,
  disabled,
  shortcutKey,
  className,
}: Props) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${className ?? ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={shortcutKey ? `${label} (${shortcutKey})` : label}
    >
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
```

- [ ] **Step 2: Create the CSS module**

Create `tamagotchi-web/src/components/HardwareButton.module.css`:

```css
.btn {
  --btn-bg: var(--device-shell);
  --btn-bg-shadow: var(--device-shell-shadow);
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 56px;
  min-height: 56px;
  padding: 6px 4px;
  background: var(--btn-bg);
  border: var(--border-thick) solid var(--device-bezel);
  border-radius: calc(var(--px) * 2); /* 4px — multiple of px */
  box-shadow: var(--shadow-pixel);
  font-family: var(--pixel);
  font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--text-primary);
  transition: transform 0.05s linear, box-shadow 0.05s linear;
}

.btn:active:not(:disabled),
.btn[data-pressed="true"]:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-press);
}

.btn:disabled {
  background: var(--btn-bg-shadow);
  box-shadow: none;
  opacity: 0.6;
}

.icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
}

.label {
  text-transform: uppercase;
  font-weight: 700;
}
```

- [ ] **Step 3: Type-check + lint**

```bash
cd tamagotchi-web
npx tsc -b && npm run lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add tamagotchi-web/src/components/HardwareButton.tsx tamagotchi-web/src/components/HardwareButton.module.css
git commit -m "feat(ui): pixel hardware button"
```

---

## Task 5: `StatusLED` component

**Files:**
- Create: `tamagotchi-web/src/components/StatusLED.tsx`
- Create: `tamagotchi-web/src/components/StatusLED.module.css`

- [ ] **Step 1: Create the component**

Create `tamagotchi-web/src/components/StatusLED.tsx`:

```tsx
import { useState } from "react";
import { useLLM } from "../hooks/useLLM";
import styles from "./StatusLED.module.css";

type LEDColor = "red" | "amber" | "green" | "off";

interface Props {
  /** When the pet engine is mid-inference. Optional — passed by GameScreen. */
  isThinking?: boolean;
  className?: string;
}

function deriveColor(args: {
  isLoading: boolean;
  isReady: boolean;
  providerName: string | null;
  error: string | null;
  isThinking?: boolean;
}): LEDColor {
  if (args.error || args.providerName === null) return "off";
  if (args.isLoading) return "red";
  if (args.isThinking) return "amber";
  if (args.isReady) return "green";
  return "off";
}

export function StatusLED({ isThinking, className }: Props) {
  const { isLoading, isReady, providerName, error, loadProgress } = useLLM();
  const [open, setOpen] = useState(false);
  const color = deriveColor({ isLoading, isReady, providerName, error, isThinking });
  const blink = color === "red";

  return (
    <>
      <button
        type="button"
        className={`${styles.led} ${styles[color]} ${blink ? styles.blink : ""} ${className ?? ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="LLM status"
        aria-expanded={open}
      />
      {open && (
        <div className={styles.popover} role="dialog" aria-label="LLM status detail">
          <div className={styles.popRow}>
            <strong>Provider</strong>
            <span>{providerName ?? "none"}</span>
          </div>
          <div className={styles.popRow}>
            <strong>State</strong>
            <span>
              {error
                ? "error"
                : isLoading
                ? "loading"
                : isThinking
                ? "thinking"
                : isReady
                ? "ready"
                : "idle"}
            </span>
          </div>
          {loadProgress && (
            <div className={styles.popRow}>
              <strong>Progress</strong>
              <span>
                {Math.round(loadProgress.percent ?? 0)}% — {loadProgress.status ?? ""}
              </span>
            </div>
          )}
          {error && <div className={styles.popError}>{error}</div>}
          <button className={styles.popClose} onClick={() => setOpen(false)}>
            CLOSE
          </button>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Create the CSS module**

Create `tamagotchi-web/src/components/StatusLED.module.css`:

```css
.led {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  border: var(--border-thin) solid var(--device-bezel);
  border-radius: 50%;
  background: var(--led-off);
  box-shadow: inset 2px 2px 0 rgba(255, 255, 255, 0.25);
  cursor: pointer;
}

.red    { background: var(--led-red);    }
.amber  { background: var(--led-amber);  }
.green  { background: var(--led-green);  }
.off    { background: var(--led-off);    }

@keyframes ledBlink {
  0%, 60% { opacity: 1; }
  61%, 100% { opacity: 0.3; }
}

.blink {
  animation: ledBlink 1s steps(2, end) infinite;
}

.popover {
  position: absolute;
  top: 36px;
  left: 0;
  z-index: 30;
  min-width: 200px;
  padding: 10px;
  background: #fff;
  border: var(--border-thick) solid var(--device-bezel);
  box-shadow: var(--shadow-pixel);
  font-family: var(--pixel);
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.popRow {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.popError {
  color: var(--led-red);
  word-break: break-word;
}

.popClose {
  align-self: flex-end;
  font-family: var(--pixel);
  background: var(--device-shell);
  border: var(--border-thin) solid var(--device-bezel);
  padding: 4px 8px;
  font-size: 10px;
}
```

- [ ] **Step 3: Type-check**

```bash
cd tamagotchi-web
npx tsc -b
```

Expected: no errors. The popover uses `loadProgress.percent` and `.status` — confirm these are real fields on `LoadProgress` by checking `tamagotchi-web/src/llm/LLMProvider.ts`. If field names differ, adjust the JSX accordingly (do not silently change the design).

- [ ] **Step 4: Commit**

```bash
git add tamagotchi-web/src/components/StatusLED.tsx tamagotchi-web/src/components/StatusLED.module.css
git commit -m "feat(ui): pixel status LED"
```

---

## Task 6: Cache detection + tests

**Files:**
- Create: `tamagotchi-web/src/llm/cache.ts`
- Create: `tamagotchi-web/tests/llm/cache.test.ts`

This is the only task with real testable logic. Use TDD.

- [ ] **Step 1: Write the failing test**

Create `tamagotchi-web/tests/llm/cache.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { hasCachedModel } from "../../src/llm/cache";

describe("hasCachedModel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns false when no cache API is available", async () => {
    const result = await hasCachedModel({ caches: undefined as unknown as CacheStorage });
    expect(result).toBe(false);
  });

  it("returns false when transformers cache is empty", async () => {
    const fakeCaches = {
      keys: vi.fn().mockResolvedValue([]),
    } as unknown as CacheStorage;
    const result = await hasCachedModel({ caches: fakeCaches });
    expect(result).toBe(false);
  });

  it("returns true when at least one transformers-related cache exists", async () => {
    const fakeCaches = {
      keys: vi.fn().mockResolvedValue(["transformers-cache", "other-cache"]),
    } as unknown as CacheStorage;
    const result = await hasCachedModel({ caches: fakeCaches });
    expect(result).toBe(true);
  });

  it("returns false when caches.keys throws", async () => {
    const fakeCaches = {
      keys: vi.fn().mockRejectedValue(new Error("boom")),
    } as unknown as CacheStorage;
    const result = await hasCachedModel({ caches: fakeCaches });
    expect(result).toBe(false);
  });
});
```

Note: this assumes `vitest` is installed. If `package.json` doesn't have it yet, add it as a devDependency (`npm i -D vitest`) and add a `"test": "vitest run"` script. Since this is the first test in the web project, also create a minimal `vitest.config.ts` if Vite's defaults aren't enough.

- [ ] **Step 2: Run the test — expect failure**

```bash
cd tamagotchi-web
npm test
```

Expected: fail with `Cannot find module '../../src/llm/cache'`.

- [ ] **Step 3: Implement `cache.ts`**

Create `tamagotchi-web/src/llm/cache.ts`:

```ts
/**
 * Returns true if the browser has any cache entries that look like
 * transformers.js / WebGPU model weights. Used to decide whether to
 * show the full BootScreen (cold) or just the StatusLED (warm).
 *
 * Uses the global Cache API which transformers.js writes to. We don't
 * inspect contents — presence of any namespace name containing
 * "transformers" is sufficient evidence that this isn't a first launch.
 */
export interface HasCachedModelDeps {
  caches?: CacheStorage;
}

export async function hasCachedModel(deps: HasCachedModelDeps = {}): Promise<boolean> {
  const c = deps.caches ?? (typeof caches !== "undefined" ? caches : undefined);
  if (!c) return false;
  try {
    const keys = await c.keys();
    return keys.some((k) => k.toLowerCase().includes("transformers"));
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the test — expect pass**

```bash
cd tamagotchi-web
npm test
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tamagotchi-web/src/llm/cache.ts tamagotchi-web/tests/llm/cache.test.ts tamagotchi-web/package.json tamagotchi-web/package-lock.json
# Also stage vitest.config.ts if you created one.
git commit -m "feat(llm): cold-vs-warm cache detection"
```

---

## Task 7: `BootScreen` component

**Files:**
- Create: `tamagotchi-web/src/components/BootScreen.tsx`
- Create: `tamagotchi-web/src/components/BootScreen.module.css`

- [ ] **Step 1: Create the component**

Create `tamagotchi-web/src/components/BootScreen.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useLLM } from "../hooks/useLLM";
import { SegmentedBar } from "./SegmentedBar";
import styles from "./BootScreen.module.css";

interface Props {
  /** Called once isReady flips true. Parent unmounts BootScreen on this signal. */
  onReady: () => void;
  /** Called when user clicks "Try again" after an error. */
  onRetry: () => void;
}

export function BootScreen({ onReady, onRetry }: Props) {
  const { isReady, error, loadProgress } = useLLM();
  const [cursorOn, setCursorOn] = useState(true);

  // Blinking cursor.
  useEffect(() => {
    const id = setInterval(() => setCursorOn((v) => !v), 500);
    return () => clearInterval(id);
  }, []);

  // Notify parent once ready.
  useEffect(() => {
    if (isReady) onReady();
  }, [isReady, onReady]);

  const pct = loadProgress?.percent ?? 0;
  const status = loadProgress?.status ?? "INITIALIZING";

  return (
    <div className={styles.boot} role="status" aria-live="polite">
      <div className={styles.title}>
        <div>TAMA-OS</div>
        <div className={styles.version}>v1.0</div>
      </div>

      <div className={styles.spriteSlot} aria-hidden>
        {/* Placeholder sprite — replaced by real PetViewport canvas at integration. */}
        <div className={styles.placeholderEgg} />
      </div>

      <div className={styles.statusLines}>
        {error ? (
          <>
            <div className={styles.errLine}>
              &gt; CONNECTION LOST{cursorOn ? "_" : " "}
            </div>
            <div className={styles.errDetail}>{error}</div>
            <button className={styles.retryBtn} onClick={onRetry}>
              [ TRY AGAIN ]
            </button>
          </>
        ) : (
          <>
            <div className={styles.line}>&gt; BOOTING NEURAL CORE...</div>
            <div className={styles.line}>
              &gt; {status} {Math.round(pct)}%{cursorOn ? "_" : " "}
            </div>
            <SegmentedBar
              value={pct / 100}
              segments={10}
              size="lg"
              fillColor="var(--lcd-ink)"
              inkColor="var(--lcd-ink)"
              bgColor="var(--lcd-bg)"
              ariaLabel="Model load progress"
            />
            <div className={styles.subtitle}>This only happens once.</div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the CSS module**

Create `tamagotchi-web/src/components/BootScreen.module.css`:

```css
.boot {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--stage-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 32px 24px;
  font-family: var(--pixel);
  color: var(--text-primary);
}

.title {
  text-align: center;
  font-family: var(--display-pixel);
  font-size: 28px;
  letter-spacing: 0.1em;
  background: var(--lcd-bg);
  color: var(--lcd-ink);
  border: var(--border-chunky) solid var(--device-bezel);
  padding: 16px 32px;
  box-shadow: var(--shadow-pixel);
}

.version {
  font-size: 14px;
  margin-top: 4px;
  letter-spacing: 0.15em;
}

.spriteSlot {
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholderEgg {
  width: 64px;
  height: 64px;
  background: var(--lcd-bg);
  border: var(--border-thick) solid var(--device-bezel);
  border-radius: 50%;
}

.statusLines {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 320px;
  font-size: 12px;
  letter-spacing: 0.05em;
}

.line, .errLine, .errDetail {
  white-space: pre;
  font-family: var(--pixel);
}

.errLine {
  color: var(--led-red);
  font-weight: 700;
}

.errDetail {
  font-family: var(--sans);
  color: var(--text-muted);
  white-space: normal;
  font-size: 12px;
}

.subtitle {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
}

.retryBtn {
  align-self: flex-start;
  font-family: var(--pixel);
  font-size: 12px;
  background: var(--lcd-bg);
  color: var(--lcd-ink);
  border: var(--border-thick) solid var(--device-bezel);
  box-shadow: var(--shadow-pixel);
  padding: 8px 16px;
  margin-top: 8px;
}

.retryBtn:active {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-press);
}
```

- [ ] **Step 3: Type-check**

```bash
cd tamagotchi-web
npx tsc -b
```

Expected: no errors. Do not commit yet — Task 8 will commit BootScreen + the integration into App.tsx as one logical change.

---

## Task 8: Wire BootScreen + StatusLED into App; delete ModelLoader

**Files:**
- Modify: `tamagotchi-web/src/App.tsx`
- Delete: `tamagotchi-web/src/llm/ModelLoader.tsx`

- [ ] **Step 1: Replace `App.tsx`**

Open `tamagotchi-web/src/App.tsx` and replace its contents with:

```tsx
import { useEffect, useState } from "react";
import { SlotSelectScreen } from "./screens/SlotSelectScreen";
import { CreatePetScreen } from "./screens/CreatePetScreen";
import { GameScreen } from "./screens/GameScreen";
import { LLMContextProvider } from "./llm/LLMContext";
import { SettingsOverlay } from "./components/SettingsOverlay";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BootScreen } from "./components/BootScreen";
import { StatusLED } from "./components/StatusLED";
import { hasCachedModel } from "./llm/cache";
import { useLLM } from "./hooks/useLLM";
import "./App.css";

type Screen = "slots" | "create" | "game";

function AppInner() {
  const [screen, setScreen] = useState<Screen>("slots");
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [slotsReloadKey, setSlotsReloadKey] = useState(0);

  // Boot-screen visibility: shown if cold-cache and not yet ready.
  const [shouldShowBoot, setShouldShowBoot] = useState<boolean | null>(null);
  const { isReady, switchProvider, providerName } = useLLM();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const warm = await hasCachedModel();
      if (!cancelled) setShouldShowBoot(!warm);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectSlot = (slot: number) => {
    setActiveSlot(slot);
    setScreen("game");
  };
  const handleCreateNew = (slot: number) => {
    setActiveSlot(slot);
    setScreen("create");
  };
  const handlePetCreated = () => setScreen("game");
  const handleBackToSlots = () => setScreen("slots");

  const showBoot = shouldShowBoot === true && !isReady;

  let content: React.ReactNode;
  switch (screen) {
    case "slots":
      content = (
        <SlotSelectScreen
          key={slotsReloadKey}
          onSelectSlot={handleSelectSlot}
          onCreateNew={handleCreateNew}
        />
      );
      break;
    case "create":
      content = (
        <CreatePetScreen
          slot={activeSlot}
          onCreated={handlePetCreated}
          onBack={handleBackToSlots}
        />
      );
      break;
    case "game":
      content = (
        <GameScreen
          slot={activeSlot}
          onBack={handleBackToSlots}
          onOpenSettings={() => setShowSettings(true)}
        />
      );
      break;
  }

  return (
    <>
      {showBoot && (
        <BootScreen
          onReady={() => setShouldShowBoot(false)}
          onRetry={() => providerName && switchProvider(providerName)}
        />
      )}

      {/* Status LED — visible on slots/create screens (GameScreen has its own embedded in DeviceFrame). */}
      {!showBoot && screen !== "game" && (
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 10,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <StatusLED />
          <button
            onClick={() => setShowSettings(true)}
            style={{
              width: 32,
              height: 32,
              minWidth: 32,
              borderRadius: 4,
              background: "var(--device-shell)",
              border: "var(--border-thick) solid var(--device-bezel)",
              boxShadow: "var(--shadow-pixel)",
              fontFamily: "var(--pixel)",
              fontSize: 14,
              cursor: "pointer",
            }}
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      )}

      {content}

      {showSettings && (
        <SettingsOverlay
          onClose={() => setShowSettings(false)}
          onDataCleared={() => setSlotsReloadKey((k) => k + 1)}
        />
      )}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LLMContextProvider>
        <AppInner />
      </LLMContextProvider>
    </ErrorBoundary>
  );
}

export default App;
```

- [ ] **Step 2: Delete `ModelLoader.tsx`**

```bash
git rm tamagotchi-web/src/llm/ModelLoader.tsx
```

If git complains the file is untracked, just `rm` it instead.

- [ ] **Step 3: Type-check + lint**

```bash
cd tamagotchi-web
npx tsc -b && npm run lint
```

Expected: no errors. If `useLLM` import path is wrong (it's `./hooks/useLLM`), confirm.

- [ ] **Step 4: Visual smoke check at iPhone SE**

Reload dev server. Take a Chrome DevTools MCP screenshot of the slots screen at 375×667. Confirm:
- No old yellow loading banner anywhere.
- Status LED visible in top-right.
- BootScreen shows on a hard refresh + cleared cache (test by clearing site data in DevTools then refreshing).

Save the screenshot to a scratch file (do not commit yet).

- [ ] **Step 5: Commit**

```bash
git add tamagotchi-web/src/App.tsx
git add tamagotchi-web/src/components/BootScreen.tsx tamagotchi-web/src/components/BootScreen.module.css
git add -u  # picks up the deleted ModelLoader.tsx
git commit -m "feat(ui): pixel boot screen and status LED replace loading banner"
```

---

## Task 9: `LCDStats` component

**Files:**
- Create: `tamagotchi-web/src/components/LCDStats.tsx`
- Create: `tamagotchi-web/src/components/LCDStats.module.css`

- [ ] **Step 1: Create the component**

Create `tamagotchi-web/src/components/LCDStats.tsx`:

```tsx
import { useState } from "react";
import type { PetState, PetMood } from "../engine/types";
import { SegmentedBar } from "./SegmentedBar";
import { StatIcon } from "./StatIcon";
import { MoodIcon } from "./MoodIcon";
import styles from "./LCDStats.module.css";

interface Props {
  pet: PetState;
  mood: PetMood;
}

type StatKey = "hunger" | "happiness" | "energy" | "health";

export function LCDStats({ pet, mood }: Props) {
  const [peeking, setPeeking] = useState<StatKey | null>(null);

  const stats: { key: StatKey; value: number; label: string }[] = [
    { key: "hunger",    value: pet.hunger,    label: "Hunger" },
    { key: "happiness", value: pet.happiness, label: "Happiness" },
    { key: "energy",    value: pet.energy,    label: "Energy" },
    { key: "health",    value: pet.health,    label: "Health" },
  ];

  // XP bar — segments and current-segment fill calculated from pet.xp + pet.level.
  // Engine semantics may differ; default to 100 XP per level.
  const xpPerLevel = 100;
  const xpInLevel = pet.xp % xpPerLevel;

  return (
    <div className={styles.lcd}>
      <div className={styles.xpRow}>
        <span className={styles.xpLabel}>XP</span>
        <SegmentedBar
          value={xpInLevel / xpPerLevel}
          segments={10}
          size="sm"
          fillColor="var(--lcd-ink)"
          inkColor="var(--lcd-ink)"
        />
      </div>

      <div className={styles.statsRow}>
        {stats.slice(0, 2).map((s) => (
          <StatTile
            key={s.key}
            stat={s}
            peeking={peeking === s.key}
            onPeek={() => setPeeking((p) => (p === s.key ? null : s.key))}
          />
        ))}
      </div>

      {/* Pet sprite slot — caller composes this around LCDStats; LCDStats only renders the bars. */}
      <div className={styles.spriteSpacer} />

      <div className={styles.statsRowBottom}>
        {stats.slice(2).map((s) => (
          <StatTile
            key={s.key}
            stat={s}
            peeking={peeking === s.key}
            onPeek={() => setPeeking((p) => (p === s.key ? null : s.key))}
          />
        ))}
        <div className={styles.moodSlot} aria-label={`Mood: ${mood}`}>
          <MoodIcon mood={mood} size={20} color="var(--lcd-ink)" />
        </div>
      </div>
    </div>
  );
}

function StatTile({
  stat,
  peeking,
  onPeek,
}: {
  stat: { key: StatKey; value: number; label: string };
  peeking: boolean;
  onPeek: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.statTile}
      onClick={onPeek}
      aria-label={`${stat.label} ${Math.round(stat.value)} of 100`}
    >
      <StatIcon kind={stat.key} size={12} color="var(--lcd-ink)" />
      <SegmentedBar
        value={stat.value / 100}
        segments={5}
        size="sm"
        fillColor="var(--lcd-ink)"
        inkColor="var(--lcd-ink)"
        ariaLabel={stat.label}
      />
      {peeking && <span className={styles.peek}>{Math.round(stat.value)}/100</span>}
    </button>
  );
}
```

Important: this component renders ONLY the LCD chrome (XP + 4 stats + mood). The pet sprite is rendered by `DeviceFrame` overlapping this layout. `LCDStats` reserves the sprite area via `.spriteSpacer`.

- [ ] **Step 2: Create the CSS module**

Create `tamagotchi-web/src/components/LCDStats.module.css`:

```css
.lcd {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--lcd-bg);
  color: var(--lcd-ink);
  font-family: var(--pixel);
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 6px;
}

.xpRow {
  display: flex;
  align-items: center;
  gap: 6px;
}

.xpLabel {
  font-size: 9px;
  letter-spacing: 0.05em;
}

.statsRow,
.statsRowBottom {
  display: flex;
  gap: 8px;
  align-items: center;
}

.statsRowBottom {
  margin-top: auto;
}

.statTile {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  padding: 4px 0;
  color: var(--lcd-ink);
  min-height: 24px;
}

.peek {
  position: absolute;
  bottom: -16px;
  left: 0;
  background: var(--lcd-ink);
  color: var(--lcd-bg);
  font-size: 9px;
  padding: 2px 4px;
  z-index: 2;
}

.spriteSpacer {
  flex: 1 1 auto;
}

.moodSlot {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 3: Type-check**

```bash
cd tamagotchi-web
npx tsc -b
```

Expected: no errors. Do not commit yet — bundled with Task 11's GameScreen commit.

---

## Task 10: `DeviceFrame` component

**Files:**
- Create: `tamagotchi-web/src/components/DeviceFrame.tsx`
- Create: `tamagotchi-web/src/components/DeviceFrame.module.css`

- [ ] **Step 1: Create the component**

Create `tamagotchi-web/src/components/DeviceFrame.tsx`:

```tsx
import type { ReactNode } from "react";
import type { PetState, PetMood } from "../engine/types";
import { getBondLabel } from "../engine/relationship";
import { LCDStats } from "./LCDStats";
import { StatusLED } from "./StatusLED";
import { HardwareButton } from "./HardwareButton";
import { StatIcon } from "./StatIcon";
import styles from "./DeviceFrame.module.css";

interface Props {
  pet: PetState;
  mood: PetMood;
  isThinking: boolean;
  /** Pre-rendered pet viewport (canvas). Slotted into the LCD area. */
  petSprite: ReactNode;
  onAction: (action: "feed" | "play" | "heal" | "sleep") => void;
  onBack: () => void;
  onOpenSettings: () => void;
}

const SHELL_BY_SPECIES: Record<string, [string, string]> = {
  // [shell, shadow] — pastel pairings
  slime:   ["#cdb4ff", "#9d80d6"],   // lavender
  shadow:  ["#bcd2ff", "#8ea4d0"],   // ice-blue
  cloud:   ["#ffd7e1", "#d99fae"],   // pink
  fire:    ["#ffd5a8", "#d6a368"],   // peach
  crystal: ["#bff0d6", "#7dc7a3"],   // mint
};

export function DeviceFrame({
  pet,
  mood,
  isThinking,
  petSprite,
  onAction,
  onBack,
  onOpenSettings,
}: Props) {
  const [shell, shadow] = SHELL_BY_SPECIES[pet.species] ?? SHELL_BY_SPECIES.cloud;
  const bondLabel = getBondLabel(pet.relationship);

  return (
    <div
      className={styles.device}
      style={{
        ["--device-shell" as string]: shell,
        ["--device-shell-shadow" as string]: shadow,
      }}
    >
      <header className={styles.chrome}>
        <div className={styles.chromeLeft}>
          <StatusLED isThinking={isThinking} />
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBack}
            aria-label="Back to slots"
          >
            ←
          </button>
        </div>
        <div className={styles.chromeMid}>
          <span>Lv {pet.level}</span>
          <span>·</span>
          <span>Age {pet.age}</span>
          <span>·</span>
          <span>{bondLabel}</span>
        </div>
        <button
          type="button"
          className={styles.settingsBtn}
          onClick={onOpenSettings}
          aria-label="Settings"
        >
          ⚙
        </button>
      </header>

      <div className={styles.lcdWrap}>
        <LCDStats pet={pet} mood={mood} />
        <div className={styles.spriteOverlay}>{petSprite}</div>
      </div>

      <div className={styles.buttons}>
        <HardwareButton
          label="Feed"
          shortcutKey="F"
          icon={<StatIcon kind="hunger" size={18} />}
          onClick={() => onAction("feed")}
          disabled={isThinking}
        />
        <HardwareButton
          label="Play"
          shortcutKey="P"
          icon={<StatIcon kind="happiness" size={18} />}
          onClick={() => onAction("play")}
          disabled={isThinking}
        />
        <HardwareButton
          label="Heal"
          shortcutKey="H"
          icon={<StatIcon kind="health" size={18} />}
          onClick={() => onAction("heal")}
          disabled={isThinking}
        />
        <HardwareButton
          label="Sleep"
          shortcutKey="S"
          icon={<StatIcon kind="energy" size={18} />}
          onClick={() => onAction("sleep")}
          disabled={isThinking}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the CSS module**

Create `tamagotchi-web/src/components/DeviceFrame.module.css`:

```css
.device {
  width: 100%;
  background: var(--device-shell);
  border: var(--border-chunky) solid var(--device-bezel);
  box-shadow: var(--shadow-pixel);
  border-radius: calc(var(--px) * 6);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  font-family: var(--pixel);
}

.chrome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 4px;
  min-height: 32px;
  position: relative;
}

.chromeLeft {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.chromeMid {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--text-primary);
  white-space: nowrap;
}

.backBtn,
.settingsBtn {
  width: 32px;
  height: 32px;
  background: var(--device-shell);
  border: var(--border-thin) solid var(--device-bezel);
  font-family: var(--pixel);
  font-size: 14px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.lcdWrap {
  position: relative;
  width: 100%;
  flex: 0 0 auto;
  aspect-ratio: 1 / 1;
  background: var(--lcd-bg);
  border: var(--border-thick) solid var(--device-bezel);
  border-radius: calc(var(--px) * 4);
  overflow: hidden;
}

.spriteOverlay {
  position: absolute;
  inset: 32px 8px 32px 8px; /* leave room for top XP+stats and bottom stats+mood */
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 4px;
}
```

- [ ] **Step 3: Type-check**

```bash
cd tamagotchi-web
npx tsc -b
```

Expected: no errors. Bundled with Task 11.

---

## Task 11: GameScreen rewrite

**Files:**
- Modify: `tamagotchi-web/src/screens/GameScreen.tsx` (full rewrite of JSX + small wiring)
- Modify: `tamagotchi-web/src/screens/GameScreen.module.css` (full rewrite)
- Modify: `tamagotchi-web/src/components/SpeechBubble.module.css` (pixel borders only)

- [ ] **Step 1: Rewrite `GameScreen.tsx`**

Open `tamagotchi-web/src/screens/GameScreen.tsx`. Replace its contents with:

```tsx
import { useEffect, useRef, useState } from "react";
import { useGameEngine } from "../hooks/useGameEngine";
import { useLLM } from "../hooks/useLLM";
import { PetViewport } from "../components/PetViewport";
import { DeviceFrame } from "../components/DeviceFrame";
import {
  PetBubble,
  UserBubble,
  TypingBubble,
} from "../components/SpeechBubble";
import styles from "./GameScreen.module.css";

interface Props {
  slot: number;
  onBack: () => void;
  onOpenSettings: () => void;
}

export function GameScreen({ slot, onBack, onOpenSettings }: Props) {
  const {
    pet,
    mood,
    isLoading,
    isThinking,
    lastResponse,
    doAction,
    talkToPet,
    clearConversation,
    loadSlot,
  } = useGameEngine(slot);

  const { supportsImages } = useLLM();
  const [isEating, setIsEating] = useState(false);
  const [pendingMsg, setPendingMsg] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadSlot(slot);
  }, [slot, loadSlot]);

  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [pet?.petMemory.shortTerm.length, isThinking, pendingMsg, pendingImage]);

  // Keyboard shortcuts: F=feed, P=play, H=heal, S=sleep, T=focus chat input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case "f":
          e.preventDefault();
          handleAction("feed");
          break;
        case "p":
          e.preventDefault();
          handleAction("play");
          break;
        case "h":
          e.preventDefault();
          handleAction("heal");
          break;
        case "s":
          e.preventDefault();
          handleAction("sleep");
          break;
        case "t":
          e.preventDefault();
          textInputRef.current?.focus();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return <div className={styles.loadingCenter}>Loading...</div>;

  if (!pet || !mood) {
    return (
      <div className={styles.loadingCenter}>
        <p>No pet found in this slot.</p>
        <button onClick={onBack} className={styles.fallbackBackBtn}>Back to Slots</button>
      </div>
    );
  }

  const handleAction = (action: "feed" | "play" | "heal" | "sleep") => {
    if (action === "feed") {
      setIsEating(true);
      setTimeout(() => setIsEating(false), 900);
    }
    doAction(action);
  };

  const handleSend = () => {
    const trimmed = userMessage.trim();
    if (!trimmed || isThinking) return;
    setPendingMsg(trimmed);
    setUserMessage("");
    talkToPet(trimmed).finally(() => setPendingMsg(""));
  };

  const handleClearConversation = () => {
    if (isThinking || history.length === 0) return;
    if (!window.confirm("Delete this conversation history?")) return;
    clearConversation().catch(() => setImageError("Could not delete the conversation."));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageClick = () => {
    setImageError(null);
    if (!supportsImages) {
      setImageError("Current model doesn't support images.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result as string;
      const base64 = raw.split(",")[1] ?? raw;
      const caption = userMessage.trim();
      setPendingImage(raw);
      setPendingMsg(caption);
      setUserMessage("");
      talkToPet(caption, base64).finally(() => {
        setPendingImage(null);
        setPendingMsg("");
      });
    };
    reader.readAsDataURL(file);
  };

  const history = pet.petMemory.shortTerm;
  const petSprite = (
    <PetViewport
      species={pet.species}
      mood={mood}
      isSleeping={pet.isSleeping}
      isEating={isEating}
      pixelScale={7}
      background={false}
    />
  );

  return (
    <div className={styles.screen}>
      <DeviceFrame
        pet={pet}
        mood={mood}
        isThinking={isThinking}
        petSprite={petSprite}
        onAction={handleAction}
        onBack={onBack}
        onOpenSettings={onOpenSettings}
      />

      <div className={styles.chatPanel}>
        <div className={styles.chatHeader}>
          <span className={styles.chatTitle}>CHAT</span>
          <button
            type="button"
            className={styles.clearChatBtn}
            onClick={handleClearConversation}
            disabled={isThinking || history.length === 0}
            aria-label="Clear conversation"
          >
            ×
          </button>
        </div>
        <div className={styles.chat} ref={chatRef}>
          <div className={styles.chatList}>
            {history.map((ex, i) => {
              const isLatest = i === history.length - 1;
              return (
                <div key={`h-${i}`}>
                  {ex.userMessage && !ex.userMessage.startsWith("[action:") && (
                    <UserBubble text={ex.userMessage} />
                  )}
                  <PetBubble
                    petName={pet.name}
                    text={ex.petResponse}
                    typewriter={false}
                    emotion={isLatest ? lastResponse?.emotion : undefined}
                    thought={isLatest ? lastResponse?.innerThought : undefined}
                    moodShift={isLatest ? lastResponse?.moodShift : undefined}
                  />
                </div>
              );
            })}
            {(pendingMsg || pendingImage) && (
              <UserBubble
                text={pendingMsg || undefined}
                imageSrc={pendingImage ?? undefined}
              />
            )}
            {isThinking && <TypingBubble petName={pet.name} />}
            <div ref={chatEndRef} />
          </div>
        </div>

        {imageError && (
          <div className={styles.imageError} onClick={() => setImageError(null)}>
            {imageError}
          </div>
        )}

        <div className={styles.inputRow}>
          <button
            type="button"
            className={styles.imageBtn}
            onClick={handleImageClick}
            disabled={isThinking}
            aria-label="Send image"
          >
            +
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenFile}
            onChange={handleFileChange}
          />
          <input
            ref={textInputRef}
            type="text"
            className={styles.textInput}
            placeholder={`Say something to ${pet.name}...`}
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
          />
          <button
            type="button"
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={isThinking || !userMessage.trim()}
            aria-label="Send"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `GameScreen.module.css`**

Replace the entire contents of `tamagotchi-web/src/screens/GameScreen.module.css` with:

```css
.screen {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  max-height: 100dvh;
  min-height: 0;
  background: var(--stage-bg);
  overflow: hidden;
  padding: 8px;
  gap: 8px;
}

.chatPanel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: var(--border-thick) solid var(--device-bezel);
  box-shadow: var(--shadow-pixel);
  font-family: var(--pixel);
  overflow: hidden;
}

.chatHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: var(--lcd-bg);
  color: var(--lcd-ink);
  border-bottom: var(--border-thin) solid var(--device-bezel);
}

.chatTitle {
  font-size: 11px;
  letter-spacing: 0.1em;
  font-weight: 700;
}

.clearChatBtn {
  width: 24px;
  height: 24px;
  border: var(--border-thin) solid var(--device-bezel);
  background: var(--lcd-bg);
  font-family: var(--pixel);
  font-size: 14px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.clearChatBtn:disabled {
  opacity: 0.45;
}

.chat {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px;
  scrollbar-width: thin;
  background: #fff;
}

.chatList {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
}

.inputRow {
  flex: 0 0 auto;
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px;
  border-top: var(--border-thin) solid var(--device-bezel);
  background: var(--lcd-bg);
}

.imageBtn,
.sendBtn {
  width: 32px;
  height: 32px;
  border: var(--border-thin) solid var(--device-bezel);
  background: var(--device-shell);
  font-family: var(--pixel);
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.imageBtn:disabled,
.sendBtn:disabled {
  opacity: 0.45;
}

.textInput {
  flex: 1;
  min-width: 0;
  border: var(--border-thin) solid var(--device-bezel);
  padding: 6px 8px;
  background: #fff;
  font-family: var(--pixel);
  font-size: 12px;
  outline: none;
}

.textInput:focus {
  background: #fffae0;
}

.hiddenFile {
  display: none;
}

.imageError {
  margin: 6px 8px;
  padding: 8px;
  background: #fff3d6;
  border: var(--border-thin) solid var(--led-amber);
  color: var(--text-primary);
  font-family: var(--sans);
  font-size: 12px;
  cursor: pointer;
}

.loadingCenter {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  padding: 32px;
  font-family: var(--pixel);
  color: var(--text-primary);
}

.fallbackBackBtn {
  font-family: var(--pixel);
  background: var(--device-shell);
  border: var(--border-thick) solid var(--device-bezel);
  box-shadow: var(--shadow-pixel);
  padding: 8px 16px;
}
```

- [ ] **Step 3: Pixel-border the speech bubbles**

Open `tamagotchi-web/src/components/SpeechBubble.module.css`. For each bubble class (find them by reading the file first), make these changes:
- Replace any `border-radius: <large value>` with `border-radius: calc(var(--px) * 2);` (4px).
- Replace any `border: <Npx solid #color>` with `border: var(--border-thin) solid var(--device-bezel);`.
- Replace any `box-shadow` (if blurred) with `box-shadow: var(--shadow-pixel);`.
- Keep colors (`--bubble-pet-bg` etc.) unchanged.

If there are typewriter or `TypingBubble` styles, leave their animation alone — only restyle borders/shadows.

- [ ] **Step 4: Type-check + lint**

```bash
cd tamagotchi-web
npx tsc -b && npm run lint
```

Expected: no errors. If `useGameEngine` returns a type that doesn't include the props referenced (e.g. `lastResponse.emotion`), confirm shape by reading `tamagotchi-web/src/hooks/useGameEngine.ts` and adjust without changing behavior.

- [ ] **Step 5: Visual verification at iPhone SE**

Reload dev server. Take a Chrome DevTools MCP screenshot of the GameScreen at 375×667 with a real loaded pet. Save to a scratch file. Confirm:
- Device frame is visible with shell color matching species.
- Pet sprite is centered inside the LCD area.
- 4 hardware buttons below the LCD, all ≥ 56×56.
- Status LED visible top-left of device chrome.
- Chat panel below device with pixel borders.
- No old yellow stat chips, no old 5-tab bottom nav, no old back/settings/clear floating buttons clustered at the top of the stage.

If any of these fail visually, inspect with DevTools and adjust spacing/sizing — do NOT change the design intent.

- [ ] **Step 6: a11y skill pass**

Use `chrome-devtools-mcp:a11y-debugging` skill on the GameScreen. Expected fixes if needed:
- Tap targets ≥ 44×44 (hardware buttons are 56, settings/back/LED at minimum 28 — acceptable but borderline).
- Each interactive has an `aria-label`.
- Color contrast for `--lcd-ink` on `--lcd-bg` ≥ 4.5:1 (it should — `#2d3a1f` on `#a8c08a` ≈ 6.8:1).

Fix issues inline; do not stop on this step until a11y is clean.

- [ ] **Step 7: Commit**

```bash
git add tamagotchi-web/src/components/LCDStats.tsx tamagotchi-web/src/components/LCDStats.module.css
git add tamagotchi-web/src/components/DeviceFrame.tsx tamagotchi-web/src/components/DeviceFrame.module.css
git add tamagotchi-web/src/screens/GameScreen.tsx tamagotchi-web/src/screens/GameScreen.module.css
git add tamagotchi-web/src/components/SpeechBubble.module.css
git commit -m "feat(ui): tamagotchi device frame on game screen"
```

---

## Task 12: SlotSelectScreen reskin

**Files:**
- Modify: `tamagotchi-web/src/screens/SlotSelectScreen.module.css`
- Modify: `tamagotchi-web/src/components/SlotCard.module.css`

- [ ] **Step 1: Rewrite `SlotSelectScreen.module.css`**

Replace the entire contents with:

```css
.screen {
  height: 100dvh;
  min-height: 0;
  background: var(--stage-bg);
  padding: 32px 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  font-family: var(--pixel);
}

.title {
  text-align: center;
  font-family: var(--display-pixel);
  font-size: 24px;
  letter-spacing: 0.1em;
  color: var(--text-primary);
  margin-bottom: 4px;
  text-shadow: 2px 2px 0 var(--device-bezel);
}

.subtitle {
  text-align: center;
  font-family: var(--sans);
  font-size: 14px;
  color: var(--text-primary);
  opacity: 0.8;
  margin-bottom: 8px;
}

.slots {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading {
  text-align: center;
  padding: 48px 16px;
  color: var(--text-primary);
  font-family: var(--pixel);
}
```

- [ ] **Step 2: Read and rewrite `SlotCard.module.css`**

Read `tamagotchi-web/src/components/SlotCard.module.css` first to understand the existing class names. Then replace its contents with pixel-styled equivalents — preserving the same class names so the React component doesn't need to change. Suggested rewrite:

```css
.card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: var(--device-shell);
  border: var(--border-thick) solid var(--device-bezel);
  box-shadow: var(--shadow-pixel);
  color: var(--text-primary);
  font-family: var(--pixel);
  text-align: left;
  cursor: pointer;
}

.card:active {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-press);
}

.cardEmpty {
  composes: card;
  justify-content: center;
  background: var(--device-shell);
  font-size: 14px;
  letter-spacing: 0.1em;
}

.preview {
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  background: var(--lcd-bg);
  border: var(--border-thin) solid var(--device-bezel);
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.name {
  font-size: 14px;
  letter-spacing: 0.05em;
  font-weight: 700;
}

.meta {
  font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.mood {
  margin-left: auto;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

If the existing class names differ (`.empty`, `.slotCard`, etc.), preserve the actual names — read the file before editing. The `composes: card` pattern only works if class names match.

- [ ] **Step 3: Type-check + lint**

```bash
cd tamagotchi-web
npx tsc -b && npm run lint
```

Expected: no errors. If `composes:` fails due to a name mismatch with `SlotCard.tsx`, fall back to repeating the rules instead.

- [ ] **Step 4: Visual verification**

Take screenshot at 375×667. Confirm:
- Title `YOUR PETS` in pixel font with offset shadow.
- Slot cards have black borders and offset shadows.
- No dashed borders anywhere.

- [ ] **Step 5: Commit**

```bash
git add tamagotchi-web/src/screens/SlotSelectScreen.module.css
git add tamagotchi-web/src/components/SlotCard.module.css
git commit -m "style(ui): pixel reskin slot select screen"
```

---

## Task 13: CreatePetScreen reskin

**Files:**
- Modify: `tamagotchi-web/src/screens/CreatePetScreen.module.css`

- [ ] **Step 1: Rewrite `CreatePetScreen.module.css`**

Replace the entire contents with:

```css
.screen {
  height: 100dvh;
  min-height: 0;
  background: var(--stage-bg);
  padding: 16px 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  font-family: var(--pixel);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.backBtn {
  background: var(--device-shell);
  border: var(--border-thin) solid var(--device-bezel);
  font-family: var(--pixel);
  font-size: 16px;
  padding: 6px 10px;
  line-height: 1;
}

.backBtnSpacer {
  width: 40px;
}

.stepIndicator {
  display: flex;
  gap: 6px;
}

.dot,
.dotActive {
  width: 14px;
  height: 14px;
  background: var(--device-shell-shadow);
  border: var(--border-thin) solid var(--device-bezel);
}

.dotActive {
  background: var(--device-bezel);
}

.stepContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.title {
  text-align: center;
  font-family: var(--display-pixel);
  font-size: 22px;
  letter-spacing: 0.08em;
  color: var(--text-primary);
}

.subtitle {
  text-align: center;
  font-family: var(--sans);
  font-size: 14px;
  color: var(--text-primary);
  opacity: 0.8;
  margin-bottom: 8px;
}

.nameInput {
  width: 100%;
  padding: 12px 14px;
  font-family: var(--pixel);
  font-size: 16px;
  letter-spacing: 0.05em;
  background: #fff;
  color: var(--text-primary);
  border: var(--border-thick) solid var(--device-bezel);
  text-align: center;
  outline: none;
}

.nameInput:focus {
  background: #fffae0;
}

.primaryBtn,
.secondaryBtn {
  font-family: var(--pixel);
  font-size: 14px;
  letter-spacing: 0.1em;
  padding: 12px 16px;
  border: var(--border-thick) solid var(--device-bezel);
  box-shadow: var(--shadow-pixel);
  text-transform: uppercase;
}

.primaryBtn {
  width: 100%;
  background: var(--lcd-ink);
  color: var(--lcd-bg);
  margin-top: auto;
}

.primaryBtn:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-press);
}

.primaryBtn:disabled {
  background: var(--device-shell-shadow);
  color: var(--text-muted);
  box-shadow: none;
}

.secondaryBtn {
  background: #fff;
  color: var(--text-primary);
}

.secondaryBtn:active {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-press);
}

.speciesGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.speciesCard,
.speciesCardActive {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 8px;
  background: #fff;
  border: var(--border-thick) solid var(--device-bezel);
  box-shadow: var(--shadow-pixel);
  font-family: var(--pixel);
  cursor: pointer;
  text-align: center;
}

.speciesCardActive {
  border-width: var(--border-chunky);
  background: var(--lcd-bg);
}

.speciesCardActive::before {
  content: "▶";
  position: absolute;
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--device-bezel);
  font-family: var(--pixel);
  font-size: 14px;
}

.speciesPreview {
  width: 64px;
  height: 64px;
  background: var(--lcd-bg);
  border: var(--border-thin) solid var(--device-bezel);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.speciesName {
  font-size: 12px;
  letter-spacing: 0.05em;
}

.speciesTagline {
  font-family: var(--sans);
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.3;
}

.meetPreview {
  width: 100%;
  aspect-ratio: 1;
  max-height: 240px;
  margin: 0 auto;
  background: var(--lcd-bg);
  border: var(--border-thick) solid var(--device-bezel);
  box-shadow: var(--shadow-pixel);
  overflow: hidden;
}

.traitCard {
  background: #fff;
  border: var(--border-thick) solid var(--device-bezel);
  box-shadow: var(--shadow-pixel);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--pixel);
}

.traitHeader {
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--text-primary);
  text-transform: uppercase;
}

.traitRow {
  display: grid;
  grid-template-columns: 60px 1fr 28px;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.traitLabel {
  letter-spacing: 0.05em;
}

.traitBarBg,
.traitBarFill {
  /* These are now provided by SegmentedBar in the React tree.
     Keep selectors as no-ops for backward compatibility — the
     React component should be updated in this task too. */
}

.traitValue {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  font-family: var(--pixel);
  font-size: 11px;
}

.likesCard {
  background: #fff;
  border: var(--border-thick) solid var(--device-bezel);
  padding: 10px 12px;
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.4;
}

.meetActions {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  margin-top: auto;
}
```

- [ ] **Step 2: Replace personality bars with `SegmentedBar`**

Open `tamagotchi-web/src/screens/CreatePetScreen.tsx`. Find the JSX that renders trait bars (look for `traitBarBg` / `traitBarFill` class usage). Replace each instance with:

```tsx
<SegmentedBar
  value={value / 100}
  segments={5}
  size="md"
  fillColor="var(--lcd-ink)"
  inkColor="var(--lcd-ink)"
  bgColor="var(--lcd-bg)"
  ariaLabel={label}
/>
```

Add at the top of the file:

```tsx
import { SegmentedBar } from "../components/SegmentedBar";
```

This replaces continuous bars with segmented LCD-style bars to match the GameScreen aesthetic.

- [ ] **Step 3: Type-check + lint**

```bash
cd tamagotchi-web
npx tsc -b && npm run lint
```

- [ ] **Step 4: Visual verification at all 3 wizard steps**

Take screenshots at 375×667 of step 1 (name), step 2 (species), step 3 (meet). Confirm:
- Step indicator: 3 chunky pixel squares, active filled solid.
- Name input has thick black border, pixel font.
- Species cards have offset shadows; active card shows a `▶` pixel arrow on the left.
- Personality bars are 5-segment chunky bars matching the LCD style.
- Reroll/Hatch buttons have pixel font + offset shadow + press animation.

- [ ] **Step 5: Commit**

```bash
git add tamagotchi-web/src/screens/CreatePetScreen.module.css
git add tamagotchi-web/src/screens/CreatePetScreen.tsx
git commit -m "style(ui): pixel reskin create pet wizard"
```

---

## Task 14: SettingsOverlay reskin

**Files:**
- Modify: `tamagotchi-web/src/components/SettingsOverlay.module.css`

(No JSX changes needed — preserve existing class names.)

- [ ] **Step 1: Read existing CSS module first**

```bash
cat tamagotchi-web/src/components/SettingsOverlay.module.css
```

Note all class names — your rewrite must preserve every name used in `SettingsOverlay.tsx` (lines 97–198 of that file).

- [ ] **Step 2: Rewrite the CSS**

Replace the file contents with:

```css
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 12px;
  overflow-y: auto;
}

.panel {
  width: 100%;
  max-width: 420px;
  background: var(--stage-bg);
  border: var(--border-chunky) solid var(--device-bezel);
  box-shadow: var(--shadow-pixel);
  font-family: var(--pixel);
  display: flex;
  flex-direction: column;
  gap: 0;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--lcd-bg);
  color: var(--lcd-ink);
  border-bottom: var(--border-thin) solid var(--device-bezel);
}

.title {
  font-family: var(--display-pixel);
  font-size: 18px;
  letter-spacing: 0.1em;
}

.closeBtn {
  width: 32px;
  height: 32px;
  background: var(--device-shell);
  border: var(--border-thin) solid var(--device-bezel);
  font-family: var(--pixel);
  font-size: 16px;
  line-height: 1;
}

.section {
  padding: 12px;
  border-top: var(--border-thin) solid var(--device-bezel);
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section:first-of-type {
  border-top: none;
}

.sectionTitle {
  font-family: var(--display-pixel);
  font-size: 12px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  letter-spacing: 0.05em;
}

.label {
  font-family: var(--pixel);
}

.value {
  font-family: var(--pixel);
  color: var(--text-muted);
}

.providerBtns {
  display: flex;
  gap: 8px;
}

.providerBtn,
.providerBtnActive {
  flex: 1;
  font-family: var(--pixel);
  font-size: 12px;
  padding: 8px;
  background: #fff;
  border: var(--border-thin) solid var(--device-bezel);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.providerBtnActive {
  background: var(--lcd-ink);
  color: var(--lcd-bg);
  border-width: var(--border-thick);
}

.urlRow {
  display: flex;
  gap: 6px;
  align-items: stretch;
}

.urlInput {
  flex: 1;
  min-width: 0;
  padding: 8px;
  font-family: var(--pixel);
  font-size: 11px;
  background: #fff;
  border: var(--border-thin) solid var(--device-bezel);
  outline: none;
}

.smallBtn {
  font-family: var(--pixel);
  font-size: 11px;
  padding: 6px 10px;
  background: var(--device-shell);
  border: var(--border-thin) solid var(--device-bezel);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.statusOk     { font-size: 11px; color: var(--led-green); font-family: var(--pixel); }
.statusFail   { font-size: 11px; color: var(--led-red);   font-family: var(--pixel); }
.statusNeutral{ font-size: 11px; color: var(--text-muted); font-family: var(--pixel); }

.dataBtn {
  width: 100%;
  font-family: var(--pixel);
  font-size: 12px;
  padding: 10px;
  background: var(--device-shell);
  border: var(--border-thick) solid var(--device-bezel);
  box-shadow: var(--shadow-pixel);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dataBtn:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-press);
}

.dangerBtn {
  background: #fff;
  border-color: var(--led-red);
  color: var(--led-red);
}

.hiddenFile {
  display: none;
}

.aboutText {
  font-family: var(--sans);
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-primary);
}

.link {
  color: var(--lcd-ink);
  text-decoration: underline;
}
```

- [ ] **Step 3: Type-check + lint**

```bash
cd tamagotchi-web
npx tsc -b && npm run lint
```

Expected: no errors. If a class name was removed that the JSX uses, restore it.

- [ ] **Step 4: Visual verification**

Open settings overlay from any screen at 375×667. Confirm:
- Title `Settings` in pixel display font on the LCD-green header.
- Section titles in uppercase pixel font.
- Buttons (Test, Apply, Export, Import, Delete all data) all pixel-styled with offset shadows.
- "Delete all data" has a red border (visually distinct as destructive).

- [ ] **Step 5: Commit**

```bash
git add tamagotchi-web/src/components/SettingsOverlay.module.css
git commit -m "style(ui): pixel reskin settings overlay"
```

---

## Task 15: Cleanup

**Files:**
- Delete: `tamagotchi-web/src/components/StatsBar.tsx`
- Delete: `tamagotchi-web/src/components/StatsBar.module.css`
- Delete: `tamagotchi-web/src/components/ActionButtons.tsx`
- Delete: `tamagotchi-web/src/components/ActionButtons.module.css`

- [ ] **Step 1: Verify no remaining usages**

```bash
cd tamagotchi-web
grep -rn "StatsBar" src/
grep -rn "ActionButtons" src/
```

Expected: no results, or only matches inside the to-delete files themselves.

If `StatsBar` is still imported somewhere (e.g. by a leftover GameScreen branch), the import must be removed first.

- [ ] **Step 2: Delete the files**

```bash
git rm tamagotchi-web/src/components/StatsBar.tsx
git rm tamagotchi-web/src/components/StatsBar.module.css
git rm tamagotchi-web/src/components/ActionButtons.tsx
git rm tamagotchi-web/src/components/ActionButtons.module.css
```

- [ ] **Step 3: Run `simplify` skill**

Invoke `simplify` skill on the changed files in this branch:

```
files: src/screens/GameScreen.tsx, src/components/DeviceFrame.tsx, src/components/LCDStats.tsx, src/components/StatusLED.tsx, src/components/BootScreen.tsx, src/App.tsx
```

Apply only mechanical simplifications it suggests (dead code, redundant state, duplicate styles). Do not let it relitigate design decisions.

- [ ] **Step 4: Type-check, lint, build**

```bash
cd tamagotchi-web
npx tsc -b && npm run lint && npm run build
```

Expected: all pass. The production build sanity-checks that nothing references deleted files.

- [ ] **Step 5: Sanity-load production build**

```bash
cd tamagotchi-web
npm run preview
```

Open at iPhone SE viewport. Click through every screen — slots → create wizard → game → settings — and confirm no console errors.

- [ ] **Step 6: Commit**

```bash
git add -u
git add tamagotchi-web/src/  # picks up any simplify edits
git commit -m "refactor(ui): cleanup after pixel redesign"
```

---

## Task 16: Post-audit comparison

**Files:**
- Modify: `docs/superpowers/audits/2026-04-29-ui-baseline.md`
- Create: `docs/superpowers/audits/screenshots/after/*.png`

- [ ] **Step 1: Re-run the same screenshot script as Task 0 Step 2**

Capture identical states to `docs/superpowers/audits/screenshots/after/`. Use exact same filenames so before/after pairs are obvious.

- [ ] **Step 2: Re-run tap-target script (Task 0 Step 3)**

Save updated output.

- [ ] **Step 3: Re-run a11y skill pass and Lighthouse**

Save updated metrics.

- [ ] **Step 4: Append "After redesign" section to the audit report**

At the bottom of `docs/superpowers/audits/2026-04-29-ui-baseline.md`, add:

```markdown
---

## After redesign — 2026-04-29 (post)

### Screenshots
See `screenshots/after/` (filenames mirror `screenshots/before/`).

### Tap-target violations
[updated code block]

### Accessibility findings
[updated]

### Lighthouse mobile
- LCP: X.Xs (delta vs baseline: ±X.Xs)
- CLS: X.XX (delta: ±X.XX)
- Accessibility: XX/100 (delta: ±X)

### Issue resolution

| Baseline issue | Status | Notes |
|---|---|---|
| [issue text] | resolved / partial / deferred | ... |

### Issues introduced by redesign

(if any — be honest)
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/audits/
git commit -m "chore(audit): UI post-redesign comparison"
```

- [ ] **Step 6: Open PR**

```bash
git push -u origin ui/pixel-redesign
gh pr create --title "Pixel-faithful UI redesign" --body "$(cat <<'EOF'
## Summary
- Pixel-faithful redesign of the web Tamagotchi UI per spec.
- Virtual Tamagotchi device frame on GameScreen with LCD stats and 4 hardware action buttons.
- Boot screen + status LED replace persistent loading banner.
- Pixel reskin of slot select, create-pet wizard, and settings overlay.
- Pre/post audit reports with screenshots in `docs/superpowers/audits/`.

## Out of scope (filed for later)
- Pet animation work
- LCD environment / background art
- Sound, haptics, day-night cycle

## Test plan
- [ ] Visual smoke at iPhone SE (375×667) — every screen renders.
- [ ] Cold-cache flow: clear browser cache, refresh — boot screen appears, then game loads.
- [ ] Warm-cache flow: refresh after one successful load — no boot screen, status LED appears.
- [ ] Action buttons respond to F/P/H/S keyboard shortcuts.
- [ ] Talk shortcut (T) focuses the chat input.
- [ ] LCD stat tap reveals exact value.
- [ ] Status LED click opens detail popover.
- [ ] No console errors on any screen.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR opens. Return URL to user.

---

## Self-Review — Spec Coverage

Going through the spec section by section to confirm coverage:

- **§3 design decisions table:** A=pixel-faithful → tokens (Task 1), components throughout. C=mid scope → only GameScreen restructured (Task 11), others reskinned only (Tasks 12–14). B=device frame → DeviceFrame (Task 10), HardwareButton (Task 4). A=LCD stats → LCDStats (Task 9), StatIcon/MoodIcon (Task 3). D=boot+LED → BootScreen (Task 7), StatusLED (Task 5), cache (Task 6). D=skip animations → no animation tasks. C=minimal secondary reskin → Tasks 12–14 are CSS-module-only. ✓
- **§4.1 palette tokens:** Task 1 Step 1. ✓
- **§4.2 typography:** Task 1 Steps 1–2. ✓
- **§4.3 pixel scale & borders:** Task 1 Step 1. ✓
- **§4.4 hard-edge shadows:** Task 1 Step 1, used in `HardwareButton`/`DeviceFrame`/`SlotCard`/buttons. ✓
- **§4.5 tap-target floor:** Task 1 token, verified in Task 0 + Task 11 Step 6 + Task 16. ✓
- **§4.6 image-rendering pixelated:** Task 1 Step 1 (global rule on canvas/img.pixel/svg.pixel). ✓
- **§5.1–5.6 GameScreen layout:** Task 11. Top chrome with LED + ID strip + settings (Task 10 DeviceFrame). LCD stats and pet sprite (Task 11). Hardware buttons (Task 4 + Task 10). Chat panel (Task 11). Mobile budget verified visually in Task 11 Step 5. ✓
- **§6.1 boot screen first-time:** Task 7. ✓
- **§6.2 boot error state:** Task 7 (errLine + retryBtn). ✓
- **§6.3 status LED state mapping:** Task 5 (deriveColor). ✓
- **§6.4 cold-vs-warm detection:** Task 6 (cache.ts). ✓
- **§7.1 SlotSelectScreen:** Task 12. ✓
- **§7.2 CreatePetScreen:** Task 13 (including segmented personality bars). ✓
- **§7.3 SettingsOverlay:** Task 14. ✓
- **§8 execution plan / commit boundaries:** mirrored in Task Index above. ✓
- **§9 verification:** Task 0 (pre-audit), per-step `tsc + lint`, Task 11 Step 6 (a11y on GameScreen), Task 15 Step 4 (final build), Task 16 (post-audit). ✓
- **§10 rollback:** branch `ui/pixel-redesign` created Task 0 Step 7; PR opened Task 16 Step 6. ✓
- **§11 open implementation questions:** PetViewport pixelScale set to 7 in Task 11 Step 1; species→shell mapping in Task 10 Step 1; cache freshness simplified to "any cache exists" (no time threshold — simpler and equally correct given the goal); per-species shell pastels are the 5 entries in `SHELL_BY_SPECIES`. ✓

No gaps found.

## Self-Review — Placeholder scan

Searched for "TBD", "TODO", "implement later", "fill in details", "appropriate error handling". Findings:
- The MoodIcon Task 3 Step 2 says "starter art — refine them by eye on a real screen during Task 11's visual verification." This is intentional (the API is locked; only pixel coordinates may need touch-up). The plan's instruction to refine in Task 11 is concrete.
- No other placeholders.

## Self-Review — Type consistency

- `LLMContextValue` field names in Task 5 (`isLoading`, `isReady`, `providerName`, `error`, `loadProgress`) and Task 7 (`isReady`, `error`, `loadProgress`) and Task 8 (`isReady`, `switchProvider`, `providerName`) all match the actual context shape verified in `tamagotchi-web/src/llm/LLMContext.tsx`.
- `LoadProgress` fields used: `.percent`, `.status`. Task 5 Step 3 explicitly tells the engineer to verify these in `LLMProvider.ts` and adjust if names differ.
- `PetState`/`PetMood` types referenced in `LCDStats`, `DeviceFrame`, `MoodIcon` come from `../engine/types`, same import path as existing components.
- `getBondLabel` import in `DeviceFrame` from `../engine/relationship` matches existing `StatsBar.tsx` import path.
- `useGameEngine` shape used in GameScreen (Task 11): `pet, mood, isLoading, isThinking, lastResponse, doAction, talkToPet, clearConversation, loadSlot` — all preserved from the existing GameScreen.
- Hardware action keys: `"feed" | "play" | "heal" | "sleep"` — matches the engine action names referenced in the existing `NAV_TO_ENGINE` map (just dropping the `"home"` nav case which now lives on the back button).

No type drift.
