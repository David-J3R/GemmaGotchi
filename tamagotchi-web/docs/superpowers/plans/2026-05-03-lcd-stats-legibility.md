# LCD Stats Legibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the LCD stat bars in `LCDStats` legible at a glance — taller bars, distinguishable empty segments, always-visible numeric values, and a red critical-threshold cue — without disturbing other `SegmentedBar` usages.

**Architecture:** Extend `SegmentedBar` with an additive `lcd` size and an optional `emptyFillColor` prop (defaults preserve current callers). `LCDStats` opts in to both, adds a numeric value next to each bar, and switches the filled color to red when the stat is below 30. No engine, hook, storage, or test changes.

**Tech Stack:** React 19, TypeScript (strict), CSS Modules, Vite.

**Spec:** `tamagotchi-web/docs/superpowers/specs/2026-05-03-lcd-stats-legibility-design.md`

**Working directory for all commands:** `tamagotchi-web/`

---

## Task 1: Extend `SegmentedBar` with `lcd` size + `emptyFillColor` prop

**Files:**
- Modify: `tamagotchi-web/src/components/SegmentedBar.tsx`
- Modify: `tamagotchi-web/src/components/SegmentedBar.module.css`

- [ ] **Step 1: Add the `lcd` size class to the stylesheet**

In `tamagotchi-web/src/components/SegmentedBar.module.css`, after the existing `.sm`, add a new `.lcd` rule. Final ordering of size rules should be:

```css
.sm  { height: 8px; }
.lcd { height: 12px; }
.md  { height: 14px; }
.lg  { height: 22px; }
```

No other CSS changes — `.bar`, `.seg` defaults stay exactly as they are. Existing callers (`BootScreen`, `CreatePetScreen`) continue to render identically.

- [ ] **Step 2: Extend the `SegmentedBar` props and rendering**

Replace the entire contents of `tamagotchi-web/src/components/SegmentedBar.tsx` with:

```tsx
import styles from "./SegmentedBar.module.css";

interface Props {
  /** 0–1 fill value. */
  value: number;
  /** Number of segments. Default 5. */
  segments?: number;
  /** CSS color for filled segments. */
  fillColor?: string;
  /** CSS color for empty segments. Defaults to "transparent". */
  emptyFillColor?: string;
  /** CSS color for the bar's ink/border. Defaults to current text color. */
  inkColor?: string;
  /** Background color behind segments. */
  bgColor?: string;
  /** Optional aria-label. */
  ariaLabel?: string;
  /** Visual size — "sm" (compact), "lcd" (LCD stats, 12px), "md" (default), "lg" (boot/personality). */
  size?: "sm" | "lcd" | "md" | "lg";
  className?: string;
}

export function SegmentedBar({
  value,
  segments = 5,
  fillColor,
  emptyFillColor = "transparent",
  inkColor,
  bgColor,
  ariaLabel,
  size = "md",
  className,
}: Props) {
  const clamped = Math.max(0, Math.min(1, value));
  const filledCount = Math.round(clamped * segments);
  const sizeClass =
    size === "sm"
      ? styles.sm
      : size === "lcd"
        ? styles.lcd
        : size === "lg"
          ? styles.lg
          : styles.md;

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
            background:
              i < filledCount ? fillColor ?? "currentColor" : emptyFillColor,
          }}
        />
      ))}
    </div>
  );
}
```

The only behavioral changes vs. the prior file:
- New `"lcd"` arm in the `size` union and the `sizeClass` ladder.
- New `emptyFillColor` prop, defaulting to `"transparent"` (preserves current rendering for every existing caller).
- The empty-segment inline `background` reads from `emptyFillColor` instead of the hard-coded `"transparent"`.

- [ ] **Step 3: Type-check the change**

Run: `npm run build`
Expected: TypeScript build succeeds (the `tsc -b` step passes; Vite then produces a bundle). No errors mentioning `SegmentedBar`, `size`, or `emptyFillColor`.

If the build fails for unrelated reasons, only the `SegmentedBar`-related lines need to be clean.

- [ ] **Step 4: Run the existing test suite**

Run: `npm test`
Expected: All currently-passing tests still pass. (The repo currently only has `tests/llm/cache.test.ts`; nothing depends on `SegmentedBar`.)

- [ ] **Step 5: Commit**

```bash
git add src/components/SegmentedBar.tsx src/components/SegmentedBar.module.css
git commit -m "feat(ui): add lcd size + emptyFillColor to SegmentedBar"
```

---

## Task 2: Rewire `LCDStats` for legibility

**Files:**
- Modify: `tamagotchi-web/src/components/LCDStats.tsx`
- Modify: `tamagotchi-web/src/components/LCDStats.module.css`

- [ ] **Step 1: Add the `.statValue` style and tighten the tile gap**

Replace the entire contents of `tamagotchi-web/src/components/LCDStats.module.css` with:

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
  white-space: nowrap;
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

.statValue {
  font-family: var(--pixel);
  font-size: 9px;
  min-width: 14px;
  text-align: right;
  letter-spacing: 0.02em;
}

.statValueCritical {
  color: var(--stat-fill-red);
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

Net additions vs. the prior file: `.statValue`, `.statValueCritical`, and `white-space: nowrap` on `.xpLabel`. Everything else is unchanged.

- [ ] **Step 2: Update `LCDStats.tsx` to use the new API**

Replace the entire contents of `tamagotchi-web/src/components/LCDStats.tsx` with:

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

const CRITICAL_THRESHOLD = 30;
const STAT_SEGMENTS = 4;
const XP_PER_LEVEL = 100;
const XP_SEGMENTS = 10;

export function LCDStats({ pet, mood }: Props) {
  const [peeking, setPeeking] = useState<StatKey | null>(null);

  const stats: { key: StatKey; value: number; label: string }[] = [
    { key: "hunger",    value: pet.hunger,    label: "Hunger" },
    { key: "happiness", value: pet.happiness, label: "Happiness" },
    { key: "energy",    value: pet.energy,    label: "Energy" },
    { key: "health",    value: pet.health,    label: "Health" },
  ];

  const xpInLevel = pet.xp % XP_PER_LEVEL;

  return (
    <div className={styles.lcd}>
      <div className={styles.xpRow}>
        <span className={styles.xpLabel}>{`XP ${xpInLevel}/${XP_PER_LEVEL}`}</span>
        <SegmentedBar
          value={xpInLevel / XP_PER_LEVEL}
          segments={XP_SEGMENTS}
          size="lcd"
          fillColor="var(--lcd-ink)"
          emptyFillColor="var(--lcd-ink-faint)"
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
  const rounded = Math.round(stat.value);
  const isCritical = stat.value < CRITICAL_THRESHOLD;
  const fillColor = isCritical ? "var(--stat-fill-red)" : "var(--lcd-ink)";

  return (
    <button
      type="button"
      className={styles.statTile}
      onClick={onPeek}
      aria-label={`${stat.label} ${rounded} of 100`}
    >
      <StatIcon kind={stat.key} size={12} color="var(--lcd-ink)" />
      <SegmentedBar
        value={stat.value / 100}
        segments={STAT_SEGMENTS}
        size="lcd"
        fillColor={fillColor}
        emptyFillColor="var(--lcd-ink-faint)"
        inkColor="var(--lcd-ink)"
        ariaLabel={stat.label}
      />
      <span
        className={`${styles.statValue} ${isCritical ? styles.statValueCritical : ""}`}
        aria-hidden
      >
        {rounded}
      </span>
      {peeking && <span className={styles.peek}>{rounded}/100</span>}
    </button>
  );
}
```

Behavioral notes for review:
- `STAT_SEGMENTS` is 4 (was 5) per the spec.
- `XP_SEGMENTS` stays at 10.
- `CRITICAL_THRESHOLD = 30` matches the spec; the comparison is `< 30` (so 30 itself is not red).
- `aria-hidden` on the value span avoids screen-readers double-announcing — the button's `aria-label` already states the stat and value.
- Layout is otherwise identical, so the sprite overlay positioning in `DeviceFrame.module.css` (`inset: 32px 8px 32px 8px`) does not need adjusting.

- [ ] **Step 3: Type-check and lint**

Run: `npm run build`
Expected: success.

Run: `npm run lint`
Expected: no new errors introduced by the modified files.

- [ ] **Step 4: Run the test suite**

Run: `npm test`
Expected: all tests pass (no test exercises `LCDStats` or `SegmentedBar` directly).

- [ ] **Step 5: Manual verification in the browser**

Run: `npm run dev` and open `http://localhost:5173`.

Walk through these scenarios — for each, confirm the listed expectations:

| Scenario | How to reach it | Expected |
| --- | --- | --- |
| Fresh pet, full stats | Create a new pet | All four bars show 4/4 dark filled segments, value `100`, no red. XP row shows `XP 0/100` with empty bar (10 faint segments). |
| Mid stats | Open an existing pet, wait for tick decay or play once | Bars partially filled, faint empty segments clearly distinguishable from filled ones, value matches. |
| Critical stat (`<30`) | Let a stat decay (or load a depleted save) | Filled segments and the numeric value both render red (`--stat-fill-red`). Other stats stay dark. |
| XP progression | Trigger an action that grants XP | `XP n/100` updates and the bar segments fill proportionally. |
| Existing usages unaffected | Visit the boot screen and the pet-creation wizard | Their `SegmentedBar` instances render exactly as before (no faint-empty fill, no height change). |

If any scenario fails, fix it before proceeding.

- [ ] **Step 6: Capture before/after screenshots for the audit trail**

Save a screenshot of the LCD with mid-range stats to:
`tamagotchi-web/docs/superpowers/audits/2026-05-03-lcd-stats-after.png`

(Optional: also save the original screenshot the user provided as `2026-05-03-lcd-stats-before.png` in the same directory if available.)

- [ ] **Step 7: Commit**

```bash
git add src/components/LCDStats.tsx src/components/LCDStats.module.css docs/superpowers/specs/2026-05-03-lcd-stats-legibility-design.md docs/superpowers/plans/2026-05-03-lcd-stats-legibility.md
# include the audit screenshot if you saved one:
# git add docs/superpowers/audits/2026-05-03-lcd-stats-after.png
git commit -m "feat(ui): make LCD stats legible — taller bars, faint empty segs, inline values, red <30 cue"
```

---

## Self-review notes

- **Spec coverage:**
  - Bar geometry (12px `lcd` size, 4 segments for stats, 10 for XP) → Task 1 step 1, Task 2 step 2.
  - Empty-segment visibility via `emptyFillColor` prop → Task 1 step 2, Task 2 step 2.
  - Always-visible numeric value → Task 2 step 1 (`.statValue`) + Task 2 step 2 (rendered inside `StatTile`).
  - Critical threshold red → Task 2 step 2 (`fillColor` and `statValueCritical`).
  - XP `n/100` label → Task 2 step 2 (`xpLabel` text).
  - "No engine, hook, storage changes" → only the four files in the table are touched.
  - "Existing callers untouched" → `emptyFillColor` defaults to `"transparent"`, no CSS default shifted; verified manually in Task 2 step 5.
- **Placeholder scan:** no TBD, TODO, "implement later", or "similar to Task N" entries; every code step contains the literal code to write.
- **Type consistency:** the `size` union is `"sm" | "lcd" | "md" | "lg"` in both Task 1 step 2 and Task 2 step 2 usages (`size="lcd"`). `emptyFillColor` is spelled identically in both tasks. The CSS class `.lcd` defined in Task 1 step 1 is the one referenced by `styles.lcd` in Task 1 step 2.
