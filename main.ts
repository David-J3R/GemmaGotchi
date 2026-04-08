import * as readline from "node:readline";
import { startGame } from "./src/game.js";

/** Entry point: prompts for pet name and species, then starts the game */
async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question: string): Promise<string> =>
    new Promise((resolve) => rl.question(question, resolve));

  console.log("\n  Welcome to Tamagotchi Engine!\n");

  const name = (await ask("  What will you name your pet? ")) || "Blob";
  const species = (await ask("  What species is it? ")) || "slime";

  rl.close();

  console.log(`\n  Creating ${name} the ${species}...\n`);
  await startGame(name.trim(), species.trim());
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
