import type { PetState, PetMood, GameEvent } from "./types.js";
import { computeMood } from "./state.js";
import { getBondLabel } from "./relationship.js";

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
    `  Level ${pet.level} | Age: ${pet.age} ticks | Mood: ${mood} | Bond: ${getBondLabel(pet.relationship)}`,
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
    "\x1b[90m  Commands: /feed /play /pet /sleep /heal /show /status /help /quit\x1b[0m",
    "\x1b[90m  Or just type anything to talk to your pet.\x1b[0m",
    "",
  ];

  return lines.join("\n");
}

/** Renders the /help screen listing available slash commands */
export function renderHelp(): string {
  const lines: string[] = [
    "",
    "  \x1b[36m── Help ──\x1b[0m",
    "  \x1b[1m/feed\x1b[0m    Feed your pet",
    "  \x1b[1m/play\x1b[0m    Play with your pet",
    "  \x1b[1m/pet\x1b[0m     Pet your pet",
    "  \x1b[1m/sleep\x1b[0m   Put your pet to sleep",
    "  \x1b[1m/heal\x1b[0m    Give your pet medicine",
    "  \x1b[1m/show\x1b[0m    Show your pet an image file",
    "  \x1b[1m/status\x1b[0m  Show debug status",
    "  \x1b[1m/help\x1b[0m    Show this help",
    "  \x1b[1m/quit\x1b[0m    Save and exit",
    "",
    "  Anything else you type will be spoken to your pet.",
    "",
  ];
  return lines.join("\n");
}

/** Starts an animated "thinking" spinner. Returns a function that stops it and clears the line. */
export function startThinkingSpinner(label = "thinking"): () => void {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  process.stdout.write(`  \x1b[90m${frames[0]} ${label}...\x1b[0m`);
  const interval = setInterval(() => {
    i = (i + 1) % frames.length;
    process.stdout.write(`\r  \x1b[90m${frames[i]} ${label}...\x1b[0m`);
  }, 100);
  return () => {
    clearInterval(interval);
    process.stdout.write("\r" + " ".repeat(label.length + 20) + "\r");
  };
}

/** Renders game events as notification lines */
export function renderEvents(events: GameEvent[]): string {
  if (events.length === 0) return "";
  const lines = events.map((e) => `  \x1b[33m★\x1b[0m ${e.message}`);
  return "\n" + lines.join("\n") + "\n";
}

/** Renders a welcome-back message after loading a save */
export function renderWelcomeBack(name: string, summary: string): string {
  const lines: string[] = [
    "",
    `  \x1b[36mWelcome back! ${name} missed you.\x1b[0m`,
    `  ${summary}`,
    "",
  ];
  return lines.join("\n");
}

/** Renders a brief "Saved" indicator */
export function renderSaveIndicator(): string {
  return "  \x1b[32m[Saved]\x1b[0m";
}

/** Clears the terminal screen */
export function clearScreen(): void {
  process.stdout.write("\x1b[2J\x1b[H");
}
