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
  const filledCount = clamped <= 0 ? 0 : Math.ceil(clamped * segments);
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
