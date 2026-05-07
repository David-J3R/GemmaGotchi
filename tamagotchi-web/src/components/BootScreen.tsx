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

  useEffect(() => {
    const id = setInterval(() => setCursorOn((v) => !v), 500);
    return () => clearInterval(id);
  }, []);

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
