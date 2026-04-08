import type { PetState, PetMood, GameEvent } from "./types.js";
import { computeMood } from "./state.js";

/** ASCII faces indexed by mood */
const FACES: Record<PetMood, string> = {
  ecstatic:  "\\(^▽^)/",
  happy:     "(◕‿◕)",
  content:   "(・ω・)",
  bored:     "(−_−)",
  sad:       "(╥_╥)",
  angry:     "(╬ Ò﹏Ó)",
  sick:      "(×_×;)",
  exhausted: "(−.−) zzz",
  starving:  "(;﹏;)",
  critical:  "(x_x)",
};

/** Returns a colored stat bar string: green >= 60, yellow >= 30, red < 30 */
function statBar(label: string, value: number): string {
  const filled = Math.round(value / 5);
  const empty = 20 - filled;
  let color: string;
  if (value >= 60) color = "\x1b[32m"; // green
  else if (value >= 30) color = "\x1b[33m"; // yellow
  else color = "\x1b[31m"; // red
  const reset = "\x1b[0m";
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `  ${label.padEnd(10)} ${color}${bar}${reset} ${value}/100`;
}

/** Renders the full pet display to a string */
export function renderDisplay(pet: PetState): string {
  const mood = computeMood(pet);
  const face = FACES[mood];
  const sleepIndicator = pet.isSleeping ? " 💤 (sleeping)" : "";
  const aliveIndicator = pet.isAlive ? "" : " [DECEASED]";

  const lines: string[] = [
    "",
    "\x1b[36m" + "═".repeat(40) + "\x1b[0m",
    "",
    `       ${face}`,
    "",
    `  ${pet.name} the ${pet.species}${sleepIndicator}${aliveIndicator}`,
    `  Level ${pet.level} | Age: ${pet.age} ticks | Mood: ${mood}`,
    "",
    statBar("Hunger", pet.hunger),
    statBar("Happiness", pet.happiness),
    statBar("Energy", pet.energy),
    statBar("Health", pet.health),
    "",
    `  XP: ${pet.xp}`,
    "",
    "\x1b[36m" + "═".repeat(40) + "\x1b[0m",
    "",
    "\x1b[90m  Commands: feed | play | pet | sleep | heal | talk | show | status | quit\x1b[0m",
    "",
  ];

  return lines.join("\n");
}

/** Renders game events as notification lines */
export function renderEvents(events: GameEvent[]): string {
  if (events.length === 0) return "";
  const lines = events.map((e) => `  \x1b[33m★\x1b[0m ${e.message}`);
  return "\n" + lines.join("\n") + "\n";
}

/** Clears the terminal screen */
export function clearScreen(): void {
  process.stdout.write("\x1b[2J\x1b[H");
}
