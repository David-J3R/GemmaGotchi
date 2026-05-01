import type { PetState } from "../engine/types";
import { computeMood } from "../engine/state";
import { PetViewport } from "./PetViewport";
import styles from "./SlotCard.module.css";

interface OccupiedProps {
  pet: PetState;
  lastPlayed?: string;
  onClick: () => void;
  onDelete: () => void;
}

interface EmptyProps {
  onClick: () => void;
}

function relativeTime(iso?: string): string {
  if (!iso) return "just now";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SlotCard({
  pet,
  lastPlayed,
  onClick,
  onDelete,
}: OccupiedProps) {
  const mood = computeMood(pet);
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      aria-label={`Open ${pet.name}`}
    >
      <div className={styles.previewWrap}>
        <PetViewport
          species={pet.species}
          mood={mood}
          isSleeping={pet.isSleeping}
          pixelScale={2}
          background={false}
        />
      </div>
      <div className={styles.info}>
        <div className={styles.name}>{pet.name}</div>
        <div className={styles.meta}>
          {pet.species} · Lv {pet.level}
        </div>
        <div className={styles.meta}>{relativeTime(lastPlayed)}</div>
      </div>
      <button
        className={styles.deleteBtn}
        aria-label="Delete pet"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        ×
      </button>
    </button>
  );
}

export function EmptySlotCard({ onClick }: EmptyProps) {
  return (
    <button
      type="button"
      className={`${styles.card} ${styles.cardEmpty}`}
      onClick={onClick}
      aria-label="Create new pet in this slot"
    >
      <span className={styles.plusIcon}>+</span>
      <span className={styles.emptyLabel}>New Pet</span>
    </button>
  );
}
