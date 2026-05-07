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
