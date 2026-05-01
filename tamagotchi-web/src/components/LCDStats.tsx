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
