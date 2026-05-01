import type { ReactNode } from "react";
import type { PetState, PetMood } from "../engine/types";
import { getBondLabel } from "../engine/relationship";
import { LCDStats } from "./LCDStats";
import { StatusLED } from "./StatusLED";
import { HardwareButton } from "./HardwareButton";
import { StatIcon } from "./StatIcon";
import styles from "./DeviceFrame.module.css";

interface Props {
  pet: PetState;
  mood: PetMood;
  isThinking: boolean;
  /** Pre-rendered pet viewport (canvas). Slotted into the LCD area. */
  petSprite: ReactNode;
  onAction: (action: "feed" | "play" | "heal" | "sleep") => void;
  onBack: () => void;
  onOpenSettings: () => void;
}

const SHELL_BY_SPECIES: Record<string, [string, string]> = {
  slime:   ["#cdb4ff", "#9d80d6"],
  shadow:  ["#bcd2ff", "#8ea4d0"],
  cloud:   ["#ffd7e1", "#d99fae"],
  fire:    ["#ffd5a8", "#d6a368"],
  crystal: ["#bff0d6", "#7dc7a3"],
};

export function DeviceFrame({
  pet,
  mood,
  isThinking,
  petSprite,
  onAction,
  onBack,
  onOpenSettings,
}: Props) {
  const [shell, shadow] = SHELL_BY_SPECIES[pet.species] ?? SHELL_BY_SPECIES.cloud;
  const bondLabel = getBondLabel(pet.relationship);

  return (
    <div
      className={styles.device}
      style={{
        ["--device-shell" as string]: shell,
        ["--device-shell-shadow" as string]: shadow,
      }}
    >
      <header className={styles.chrome}>
        <div className={styles.chromeLeft}>
          <StatusLED isThinking={isThinking} />
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBack}
            aria-label="Back to slots"
          >
            ←
          </button>
        </div>
        <div className={styles.chromeMid}>
          <span>Lv {pet.level}</span>
          <span>·</span>
          <span>Age {pet.age}</span>
          <span>·</span>
          <span>{bondLabel}</span>
        </div>
        <button
          type="button"
          className={styles.settingsBtn}
          onClick={onOpenSettings}
          aria-label="Settings"
        >
          ⚙
        </button>
      </header>

      <div className={styles.lcdWrap}>
        <LCDStats pet={pet} mood={mood} />
        <div className={styles.spriteOverlay}>{petSprite}</div>
      </div>

      <div className={styles.buttons}>
        <HardwareButton
          label="Feed"
          shortcutKey="F"
          icon={<StatIcon kind="hunger" size={18} />}
          onClick={() => onAction("feed")}
          disabled={isThinking}
        />
        <HardwareButton
          label="Play"
          shortcutKey="P"
          icon={<StatIcon kind="happiness" size={18} />}
          onClick={() => onAction("play")}
          disabled={isThinking}
        />
        <HardwareButton
          label="Heal"
          shortcutKey="H"
          icon={<StatIcon kind="health" size={18} />}
          onClick={() => onAction("heal")}
          disabled={isThinking}
        />
        <HardwareButton
          label="Sleep"
          shortcutKey="S"
          icon={<StatIcon kind="energy" size={18} />}
          onClick={() => onAction("sleep")}
          disabled={isThinking}
        />
      </div>
    </div>
  );
}
