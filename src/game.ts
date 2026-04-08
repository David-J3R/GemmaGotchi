import * as readline from "node:readline";
import type { PetState, GameEvent } from "./types.js";
import { createPet, tick } from "./state.js";
import { performAction } from "./actions.js";
import { rollRandomEvents } from "./events.js";
import { getPetResponse } from "./llm.js";
import { grantXP, checkEvolution } from "./progression.js";
import { renderDisplay, renderEvents, clearScreen } from "./display.js";
import { TICK_INTERVAL_MS } from "./constants.js";

/** Starts and runs the game loop until the pet dies or the user quits */
export async function startGame(name: string, species: string): Promise<void> {
  const pet = createPet(name, species);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let pendingEvents: GameEvent[] = [];
  let running = true;

  /** Renders the current state to the terminal */
  function render(): void {
    clearScreen();
    const eventOutput = renderEvents(pendingEvents);
    pendingEvents = [];
    if (eventOutput) {
      process.stdout.write(eventOutput);
    }
    process.stdout.write(renderDisplay(pet));
  }

  /** Processes one game tick */
  function gameTick(): void {
    if (!running || !pet.isAlive) return;

    const tickEvents = tick(pet);
    const randomEvents = rollRandomEvents(pet);
    pendingEvents.push(...tickEvents, ...randomEvents);

    render();

    if (!pet.isAlive) {
      console.log("\n  Game Over. Your pet has passed away.");
      shutdown();
    }
  }

  /** Handles a user command */
  async function handleCommand(input: string): Promise<void> {
    const command = input.trim().toLowerCase();

    if (command === "quit") {
      console.log(`\n  Goodbye! ${pet.name} will miss you.`);
      shutdown();
      return;
    }

    if (command === "status") {
      const { computeMood } = await import("./state.js");
      const mood = computeMood(pet);
      console.log("\n  --- Debug Status ---");
      console.log(`  ${JSON.stringify({ ...pet, mood }, null, 2)}`);
      return;
    }

    if (!pet.isAlive) {
      console.log(`\n  ${pet.name} is no longer with us...`);
      return;
    }

    const result = performAction(pet, command);
    console.log(`\n  ${result.message}`);

    if (result.needsLLM) {
      console.log("  (thinking...)");
      const response = await getPetResponse(pet, command);
      console.log(`\n  ${pet.name}: "${response.speech}"\n`);
    }

    // Grant XP and check for evolution
    if (result.events.length > 0) {
      const xpEvents = grantXP(pet, command);
      pendingEvents.push(...xpEvents);
      const evoEvent = checkEvolution(pet);
      if (evoEvent) pendingEvents.push(evoEvent);
    }

    pendingEvents.push(...result.events);
    render();
  }

  /** Shuts down the game cleanly */
  function shutdown(): void {
    running = false;
    clearInterval(tickTimer);
    rl.close();
  }

  // Initial render
  render();

  // Start the tick timer
  const tickTimer = setInterval(gameTick, TICK_INTERVAL_MS);

  // Process user input
  rl.on("line", (input) => {
    handleCommand(input).catch((err: unknown) => {
      console.error("  Error:", err);
    });
  });

  // Handle clean exit
  rl.on("close", () => {
    if (running) shutdown();
  });
}
