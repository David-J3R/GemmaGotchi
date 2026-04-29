import type { PetState, PetMood } from "../engine/types";
import { getBondLabel } from "../engine/relationship";
import styles from "./StatsBar.module.css";

interface Props {
  pet: PetState;
  mood: PetMood;
}

const MOOD_EMOJI: Record<PetMood, string> = {
  ecstatic: "🤩",
  happy: "😊",
  content: "🙂",
  bored: "😐",
  sad: "😢",
  angry: "😠",
  sick: "🤒",
  exhausted: "😴",
  starving: "😵",
  critical: "💀",
};

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function statFillColor(pct: number): string {
  if (pct >= 60) return "var(--stat-fill-green)";
  if (pct >= 30) return "var(--stat-fill-yellow)";
  return "var(--stat-fill-red)";
}

function StatChip({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={styles.chip}>
      <div className={styles.chipLabel}>{label}</div>
      <div className={styles.chipValue}>{Math.round(value)}</div>
      <div className={styles.chipFill}>
        <div
          className={styles.chipFillInner}
          style={{ width: `${pct}%`, background: statFillColor(pct) }}
        />
      </div>
    </div>
  );
}

export function StatsBar({ pet, mood }: Props) {
  const bond = capitalize(getBondLabel(pet.relationship));
  return (
    <>
      <div className={styles.topBar}>
        <span className={styles.topBarItem}>Level {pet.level}</span>
        <span className={styles.sep}>|</span>
        <span className={styles.topBarItem}>Age: {pet.age}</span>
        <span className={styles.sep}>|</span>
        <span className={styles.topBarItem}>
          Mood: <span className={styles.moodEmoji}>{MOOD_EMOJI[mood]}</span>
        </span>
        <span className={styles.sep}>|</span>
        <span className={styles.topBarItem}>Bond: {bond}</span>
      </div>
      <div className={styles.chipsRow}>
        <StatChip label="Hunger" value={pet.hunger} />
        <StatChip label="Happiness" value={pet.happiness} />
        <StatChip label="Energy" value={pet.energy} />
        <StatChip label="Health" value={pet.health} />
      </div>
      <div className={styles.xpRow}>XP: {pet.xp}</div>
    </>
  );
}
