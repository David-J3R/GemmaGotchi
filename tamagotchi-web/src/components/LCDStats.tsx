import { useState } from "react";
import type { PetState, PetMood } from "../engine/types";
import { xpForLevel } from "../engine/progression";
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
const XP_SEGMENTS = 10;

export function LCDStats({ pet, mood }: Props) {
  const [peeking, setPeeking] = useState<StatKey | null>(null);

  const stats: { key: StatKey; value: number; label: string }[] = [
    { key: "hunger",    value: pet.hunger,    label: "Hunger" },
    { key: "happiness", value: pet.happiness, label: "Happiness" },
    { key: "energy",    value: pet.energy,    label: "Energy" },
    { key: "health",    value: pet.health,    label: "Health" },
  ];

  const xpThreshold = xpForLevel(pet.level);

  return (
    <div className={styles.lcd}>
      <div className={styles.xpRow}>
        <span className={styles.xpLabel}>{`XP ${pet.xp}/${xpThreshold}`}</span>
        <SegmentedBar
          value={pet.xp / xpThreshold}
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
