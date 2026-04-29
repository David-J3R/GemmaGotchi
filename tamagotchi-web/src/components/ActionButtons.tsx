import type { ReactElement } from "react";
import styles from "./ActionButtons.module.css";

export type NavAction = "home" | "play" | "heal" | "eat" | "sleep";

interface Props {
  onAction: (action: NavAction) => void;
  disabled?: boolean;
}

function IconHome() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3.2 2 11h3v9h5v-6h4v6h5v-9h3z" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
      <path d="M17 4a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2h-1.3a4 4 0 0 1-2.8-1.2l-.6-.6a2 2 0 0 0-2.8 0l-.6.6A4 4 0 0 1 9.3 12H8a2 2 0 0 1-2-2V9a5 5 0 0 1 5-5zm-6 8v.8A3.2 3.2 0 0 1 7.8 16H7a3 3 0 0 0-3 3v1h16v-1a3 3 0 0 0-3-3h-.8A3.2 3.2 0 0 1 13 12.8V12z" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 21s-7.5-4.7-10-10.4C.2 5.9 3.8 2 7.8 2c2 0 3.6 1 4.2 2.3C12.6 3 14.2 2 16.2 2 20.2 2 23.8 5.9 22 10.6 19.5 16.3 12 21 12 21z" />
    </svg>
  );
}

function IconEat() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
      <path d="M7 2h2v8a3 3 0 0 1-2 2.8V22H5V12.8A3 3 0 0 1 3 10V2h2v7h1V2h2v7h1V2zm10 0c-3 0-5 3-5 7v4h3v9h2V6l2-1V2z" />
    </svg>
  );
}

function IconSleep() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
      <path d="M3 14a9 9 0 0 0 18-2 1 1 0 0 0-1.4-.9A7 7 0 0 1 11 4.4a1 1 0 0 0-1.6-1A9 9 0 0 0 3 14z" />
    </svg>
  );
}

const BUTTONS: { action: NavAction; label: string; Icon: () => ReactElement }[] =
  [
    { action: "home", label: "Home", Icon: IconHome },
    { action: "play", label: "Play", Icon: IconPlay },
    { action: "heal", label: "Heal", Icon: IconHeart },
    { action: "eat", label: "Eat", Icon: IconEat },
    { action: "sleep", label: "Sleep", Icon: IconSleep },
  ];

export function ActionButtons({ onAction, disabled }: Props) {
  return (
    <nav className={styles.nav}>
      {BUTTONS.map(({ action, label, Icon }) => (
        <button
          key={action}
          className={styles.btn}
          onClick={() => onAction(action)}
          disabled={disabled}
        >
          <Icon />
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
