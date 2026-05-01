import type { ReactNode } from "react";
import styles from "./HardwareButton.module.css";

interface Props {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  shortcutKey?: string;
  className?: string;
}

export function HardwareButton({
  label,
  icon,
  onClick,
  disabled,
  shortcutKey,
  className,
}: Props) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${className ?? ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={shortcutKey ? `${label} (${shortcutKey})` : label}
    >
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
