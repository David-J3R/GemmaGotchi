import { startGame } from "./src/game.js";

/** Entry point: starts the game (loads save or runs creation flow) */
async function main(): Promise<void> {
  await startGame();
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
