import { useEffect, useState } from "react";
import styles from "./SpeechBubble.module.css";

interface MoodShift {
  happiness?: number;
  energy?: number;
}

interface PetBubbleProps {
  petName: string;
  text: string;
  thought?: string;
  emotion?: string;
  typewriter?: boolean;
  moodShift?: MoodShift;
}

function formatDelta(value: number, label: string): string {
  const sign = value > 0 ? "+" : "";
  return `${label} ${sign}${value}`;
}

export function PetBubble({
  petName,
  text,
  thought,
  emotion,
  typewriter = true,
  moodShift,
}: PetBubbleProps) {
  const displayed = useTypewriter(text, typewriter);
  const deltaParts: string[] = [];
  if (moodShift?.happiness) deltaParts.push(formatDelta(moodShift.happiness, "happiness"));
  if (moodShift?.energy) deltaParts.push(formatDelta(moodShift.energy, "energy"));

  return (
    <div className={`${styles.row} ${styles.rowPet} ${styles.slideIn}`}>
      <div className={styles.speakerLabel}>{petName}</div>
      <div className={`${styles.bubble} ${styles.bubblePet}`}>
        {emotion && <div className={styles.emotion}>[{emotion}]</div>}
        <div>{displayed}</div>
        {thought && displayed === text && (
          <div className={styles.thought}>{thought}</div>
        )}
        {deltaParts.length > 0 && displayed === text && (
          <div className={styles.moodChip}>({deltaParts.join(", ")})</div>
        )}
      </div>
    </div>
  );
}

interface UserBubbleProps {
  text?: string;
  imageSrc?: string;
}

export function UserBubble({ text, imageSrc }: UserBubbleProps) {
  return (
    <div className={`${styles.row} ${styles.rowUser} ${styles.slideIn}`}>
      <div className={`${styles.bubble} ${styles.bubbleUser}`}>
        {imageSrc && (
          <img src={imageSrc} alt="shared" className={styles.sharedImage} />
        )}
        {text && <div>{text}</div>}
      </div>
    </div>
  );
}

export function TypingBubble({ petName }: { petName: string }) {
  return (
    <div className={`${styles.row} ${styles.rowPet}`}>
      <div className={styles.speakerLabel}>{petName}</div>
      <div className={`${styles.bubble} ${styles.bubblePet}`}>
        <span className={styles.typing} aria-label="thinking">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );
}

function useTypewriter(text: string, enabled: boolean): string {
  const [out, setOut] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) {
      setOut(text);
      return;
    }
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [text, enabled]);

  return out;
}
