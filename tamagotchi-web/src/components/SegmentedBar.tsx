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
