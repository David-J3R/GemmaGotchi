import * as readline from "node:readline";
import type { PetState, GameEvent } from "./types.js";
import { createPet, tick, applyStatChanges } from "./state.js";
import { performAction } from "./actions.js";
import { rollRandomEvents, rollPetInitiatedEvent } from "./events.js";
import { getPetResponse, buildOllamaRequest, loadImageAsBase64 } from "./llm.js";
import type { PetResponse } from "./schema.js";
import { addExchange, addMemory, needsConsolidation, consolidateMemories } from "./memory.js";
import { grantXP, checkEvolution } from "./progression.js";
import { renderDisplay, renderEvents, clearScreen, renderWelcomeBack, renderHelp, startThinkingSpinner } from "./display.js";
import { TICK_INTERVAL_MS, AUTO_SAVE_INTERVAL_MS } from "./constants.js";
import { updateRelationship } from "./relationship.js";
import { computeMood } from "./state.js";
import { savePet, loadPet, deleteSave, hasSaveFile, applyOfflineTime } from "./storage.js";
import { generatePersonalityFromDescription } from "./personality.js";

/** Starts and runs the game loop until the pet dies or the user quits */
export async function startGame(name?: string, species?: string): Promise<void> {
  let pet: PetState;
  let welcomeMessage = "";

  // Try to load existing save
  const saveExists = await hasSaveFile();
  if (saveExists) {
    const loaded = await loadPet();
    if (loaded) {
      const { pet: loadedPet, meta } = loaded;
      const result = applyOfflineTime(loadedPet, meta.savedAt);
      pet = result.pet;
      if (result.summary) {
        welcomeMessage = renderWelcomeBack(pet.name, result.summary);
      }
    } else {
      // Corrupted save — start fresh
      pet = await createNewPet(name, species);
    }
  } else if (name && species) {
    // Called with explicit name/species (backwards compatible)
    pet = createPet(name, species);
    await savePet(pet);
  } else {
    // No save, no args — run creation flow
    pet = await createNewPet();
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "  > ",
  });

  let pendingEvents: GameEvent[] = [];
  let running = true;
  let interactedThisTick = false;
  let isThinking = false;

  // Re-displays the prompt + any in-progress input buffer after tick-driven
  // redraws. Without this, the 10s gameTick's clearScreen wipes the user's
  // partially-typed text off the screen while they're still typing.
  function redrawPrompt(): void {
    if (!running) return;
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);
    process.stdout.write(rl.getPrompt() + rl.line);
    if (rl.cursor < rl.line.length) {
      readline.moveCursor(process.stdout, rl.cursor - rl.line.length, 0);
    }
  }

  /** Renders the current state to the terminal */
  function render(): void {
    clearScreen();
    if (welcomeMessage) {
      process.stdout.write(welcomeMessage);
      welcomeMessage = "";
    }
    const eventOutput = renderEvents(pendingEvents);
    pendingEvents = [];
    if (eventOutput) {
      process.stdout.write(eventOutput);
    }
    process.stdout.write(renderDisplay(pet));
    redrawPrompt();
  }

  /** Processes one game tick */
  function gameTick(): void {
    if (!running || !pet.isAlive) return;

    // Pause tick processing entirely while an LLM call is in flight — prevents
    // render/spinner/auto-save from fighting over the same terminal line.
    if (isThinking) return;

    const tickEvents = tick(pet);
    const randomEvents = rollRandomEvents(pet);
    pendingEvents.push(...tickEvents, ...randomEvents);

    // Update relationship: track whether owner interacted this tick
    const mood = computeMood(pet);
    updateRelationship(pet.relationship, pet.happiness, mood, interactedThisTick);
    interactedThisTick = false;

    // Check for pet-initiated conversation (bond level 2+)
    const petInitEvent = rollPetInitiatedEvent(pet);
    if (petInitEvent) {
      pendingEvents.push(petInitEvent);
      isThinking = true;
      getPetResponse(pet, "pet initiates conversation")
        .then((response) => {
          handlePetResponse(pet, response);
          addExchange(pet.petMemory, "(pet initiated)", response.speech);
          if (response.memory) {
            addMemory(pet.petMemory, response.memory);
          }
        })
        .catch(() => {
          // Silently fail — pet just wanted to chat
        })
        .finally(() => {
          isThinking = false;
          render();
        });
      return;
    }

    render();

    if (!pet.isAlive) {
      console.log("\n  Game Over. Your pet has passed away.");
      handleDeath(rl).catch(() => shutdown());
    }
  }

  /** Processes a structured PetResponse: applies mood shifts, stores memories, shows notifications */
  function handlePetResponse(pet: PetState, response: PetResponse): void {
    // Display speech
    pendingEvents.push({
      type: "llm_response",
      message: `${pet.name} [${response.emotion}]: "${response.speech}"`,
      timestamp: Date.now(),
    });

    // Display inner thought if present
    if (response.innerThought) {
      pendingEvents.push({
        type: "inner_thought",
        message: `  (${response.innerThought})`,
        timestamp: Date.now(),
      });
    }

    // Apply mood shift to stats
    if (response.moodShift) {
      applyStatChanges(pet, {
        happiness: response.moodShift.happiness,
        energy: response.moodShift.energy,
      });
    }

    // Handle pet action requests
    if (response.action) {
      if (response.action.type === "request_food" && response.action.intensity >= 7) {
        pendingEvents.push({
          type: "notification",
          message: `${pet.name} is begging for food! (intensity: ${response.action.intensity}/10)`,
          timestamp: Date.now(),
        });
      }
    }

    // Store memory
    if (response.memory) {
      pet.memories.push(response.memory);
    }
  }

  /** Prompts the user for a line of input */
  function askUser(question: string): Promise<string> {
    return new Promise((resolve) => rl.question(question, resolve));
  }

  /** Handles death: prompt to start over */
  async function handleDeath(rl: readline.Interface): Promise<void> {
    const answer = await askUser("\n  Start a new game? (yes/no): ");
    if (answer.trim().toLowerCase() === "yes") {
      await deleteSave();
      shutdown();
      // Restart by launching a new game
      await startGame();
    } else {
      console.log("\n  Farewell...");
      shutdown();
    }
  }

  /** Handles the show command: prompts for an image path and sends it to the pet */
  async function handleShowCommand(): Promise<void> {
    const filePath = await askUser("  Enter the path to an image file: ");
    const trimmedPath = filePath.trim();

    if (!trimmedPath) {
      console.log("  No file path provided.");
      return;
    }

    const imageBase64 = await loadImageAsBase64(trimmedPath);
    if (!imageBase64) {
      console.log("  Could not load image. Make sure the file exists and is a .jpg, .jpeg, or .png file.");
      return;
    }

    const result = performAction(pet, "show");
    console.log(`\n  ${result.message}`);

    isThinking = true;
    const stopSpinner = startThinkingSpinner(`${pet.name} is thinking`);
    let response: PetResponse;
    try {
      response = await getPetResponse(pet, "show", imageBase64);
    } finally {
      stopSpinner();
      isThinking = false;
    }
    handlePetResponse(pet, response);

    addExchange(pet.petMemory, `show image: ${trimmedPath}`, response.speech);
    if (response.memory) {
      addMemory(pet.petMemory, response.memory);
      if (needsConsolidation(pet.petMemory)) {
        await consolidateMemories(pet.petMemory);
      }
    }

    // Grant XP
    if (result.events.length > 0) {
      const xpEvents = grantXP(pet, "show");
      pendingEvents.push(...xpEvents);
      const evoEvent = checkEvolution(pet);
      if (evoEvent) pendingEvents.push(evoEvent);
    }

    pendingEvents.push(...result.events);
    render();
  }

  /** Handles free-form chat: user typed a message without a slash command. */
  async function handleChat(userMessage: string): Promise<void> {
    if (!pet.isAlive) {
      console.log(`\n  ${pet.name} is no longer with us...`);
      return;
    }

    interactedThisTick = true;

    const result = performAction(pet, "talk", userMessage);
    console.log(`\n  ${result.message}`);

    isThinking = true;
    const stopSpinner = startThinkingSpinner(`${pet.name} is thinking`);
    let response: PetResponse;
    try {
      response = await getPetResponse(pet, "talk", undefined, userMessage);
    } finally {
      stopSpinner();
      isThinking = false;
    }
    handlePetResponse(pet, response);

    addExchange(pet.petMemory, userMessage, response.speech);
    if (response.memory) {
      addMemory(pet.petMemory, response.memory);
      if (needsConsolidation(pet.petMemory)) {
        await consolidateMemories(pet.petMemory);
      }
    }

    if (result.events.length > 0) {
      const xpEvents = grantXP(pet, "talk");
      pendingEvents.push(...xpEvents);
      const evoEvent = checkEvolution(pet);
      if (evoEvent) pendingEvents.push(evoEvent);
    }

    pendingEvents.push(...result.events);
    render();
  }

  /** Auto-save callback (runs silently to avoid disrupting the CLI) */
  async function autoSave(): Promise<void> {
    if (!running) return;
    try {
      await savePet(pet);
    } catch (err: unknown) {
      // Only surface errors; successful saves are silent so they don't interrupt typing/spinner.
      console.error("  Warning: Auto-save failed:", (err as Error).message);
    }
  }

  /** Valid stat-only actions that can be invoked via slash commands. */
  const STAT_ACTIONS = new Set(["feed", "play", "pet", "sleep", "heal"]);

  /** Handles a user's raw input: slash commands run actions, plain text is chat. */
  async function handleInput(input: string): Promise<void> {
    const trimmed = input.trim();
    if (!trimmed) return; // ignore empty input

    if (trimmed.startsWith("/")) {
      const command = trimmed.slice(1).toLowerCase().split(/\s+/)[0] ?? "";
      await handleSlashCommand(command);
    } else {
      await handleChat(trimmed);
    }
  }

  /** Routes a slash command to its handler. */
  async function handleSlashCommand(command: string): Promise<void> {
    if (command === "quit") {
      console.log(`\n  Saving...`);
      await savePet(pet);
      console.log(`  Goodbye! ${pet.name} will miss you.`);
      shutdown();
      return;
    }

    if (command === "help") {
      process.stdout.write(renderHelp());
      return;
    }

    if (command === "status") {
      const mood = computeMood(pet);
      const ollamaRequest = buildOllamaRequest(pet, "talk");
      console.log("\n  --- Debug Status ---");
      console.log(`  ${JSON.stringify({ pet: { ...pet, mood }, llmRequest: ollamaRequest }, null, 2)}`);
      return;
    }

    if (!pet.isAlive) {
      console.log(`\n  ${pet.name} is no longer with us...`);
      return;
    }

    interactedThisTick = true;

    if (command === "show") {
      await handleShowCommand();
      return;
    }

    if (!STAT_ACTIONS.has(command)) {
      console.log(`\n  Unknown command: /${command}. Type /help to see available commands.`);
      return;
    }

    const result = performAction(pet, command);
    console.log(`\n  ${result.message}`);

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
    clearInterval(autoSaveTimer);
    rl.close();
  }

  // SIGINT handler — save before exit
  const sigintHandler = (): void => {
    if (!running) return;
    console.log("\n\n  Saving before exit...");
    savePet(pet)
      .then(() => {
        console.log("  Saved! Goodbye!");
        shutdown();
        process.exit(0);
      })
      .catch(() => {
        console.error("  Warning: Could not save.");
        shutdown();
        process.exit(1);
      });
  };
  process.on("SIGINT", sigintHandler);

  // Initial render
  render();

  // Start the tick timer
  const tickTimer = setInterval(gameTick, TICK_INTERVAL_MS);

  // Start auto-save timer
  const autoSaveTimer = setInterval(() => { autoSave().catch(() => {}); }, AUTO_SAVE_INTERVAL_MS);

  // Process user input
  rl.on("line", (input) => {
    handleInput(input)
      .catch((err: unknown) => {
        console.error("  Error:", err);
      })
      .finally(() => {
        redrawPrompt();
      });
  });

  // Handle clean exit
  rl.on("close", () => {
    process.removeListener("SIGINT", sigintHandler);
    if (running) shutdown();
  });
}

/** Runs the interactive pet creation flow */
async function createNewPet(defaultName?: string, defaultSpecies?: string): Promise<PetState> {
  if (defaultName && defaultSpecies) {
    const pet = createPet(defaultName, defaultSpecies);
    await savePet(pet);
    return pet;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question: string): Promise<string> =>
    new Promise((resolve) => rl.question(question, resolve));

  console.log("\n  Welcome! Let's create your pet.\n");

  let confirmed = false;
  let pet!: PetState;

  while (!confirmed) {
    const name = await ask("  What will you name your pet? ");
    const trimmedName = name.trim();
    if (!trimmedName) {
      console.log("  Please enter a name.");
      continue;
    }

    const presetResult = await pickPreset(ask);
    if (!presetResult) {
      // User selected "describe your own" — run the custom flow
      const custom = await createCustomPet(ask, trimmedName);
      if (!custom) {
        // User bailed out entirely during custom flow — restart from name prompt
        console.log("\n  Let's try again!\n");
        continue;
      }
      pet = custom;
    } else {
      pet = createPet(trimmedName, presetResult);
    }

    // Show personality preview
    printPersonalityPreview(pet);

    const ready = await ask("\n  Ready to begin? (yes/no): ");
    if (ready.trim().toLowerCase() === "yes") {
      confirmed = true;
    } else {
      console.log("\n  Let's try again!\n");
    }
  }

  rl.close();
  await savePet(pet);
  return pet;
}

/** Prints a short personality preview for the user to review. */
function printPersonalityPreview(pet: PetState): void {
  const t = pet.personality.traits;
  const traitDesc = (name: string, val: number): string => {
    if (val >= 70) return `very ${name}`;
    if (val >= 50) return `quite ${name}`;
    if (val >= 30) return `a bit ${name}`;
    return `not very ${name}`;
  };
  console.log(
    `\n  Your ${pet.name} the ${pet.species} is: ${traitDesc("playful", t.playfulness)}, ${traitDesc("curious", t.curiosity)}, ${traitDesc("affectionate", t.affection)}, ${traitDesc("sassy", t.sass)}`
  );
  if (pet.personality.likes.length > 0) {
    console.log(`  Likes: ${pet.personality.likes.join(", ")}`);
  }
  if (pet.personality.dislikes.length > 0) {
    console.log(`  Dislikes: ${pet.personality.dislikes.join(", ")}`);
  }
  if (pet.personality.speechStyle.quirks.length > 0) {
    console.log(`  Quirks: ${pet.personality.speechStyle.quirks.join("; ")}`);
  }
}

/** Prompts for a species choice. Returns the preset species name, or null if the user picked "describe your own". */
async function pickPreset(ask: (q: string) => Promise<string>): Promise<string | null> {
  const presets: Record<string, string> = {
    "1": "slime creature",
    "2": "shadow cat",
    "3": "cloud puff",
    "4": "fire sprite",
    "5": "crystal turtle",
  };

  while (true) {
    console.log("\n  Choose a species:");
    console.log("    1. Slime Creature  — playful, affectionate, loves food");
    console.log("    2. Shadow Cat      — sassy, curious, independent");
    console.log("    3. Cloud Puff      — energetic, dramatic, cuddly");
    console.log("    4. Fire Sprite     — clever, mischievous, loyal");
    console.log("    5. Crystal Turtle  — calm, wise, observant");
    console.log("    6. Describe your own!");

    const choice = (await ask("\n  Enter number (1-6): ")).trim();
    if (choice === "6") return null;
    if (choice in presets) return presets[choice]!;
    console.log("  Invalid choice. Let's try again.");
  }
}

/** Runs the custom-pet creation flow. Returns null if the user aborts and wants to restart. */
async function createCustomPet(ask: (q: string) => Promise<string>, petName: string): Promise<PetState | null> {
  while (true) {
    const description = (await ask("\n  Describe your pet in a sentence or two: ")).trim();
    if (!description) {
      console.log("  Please enter a description.");
      continue;
    }

    console.log("");
    const stopSpinner = startThinkingSpinner("Dreaming up your pet");
    let result: { species: string; personality: import("./personality.js").PetPersonality } | null = null;
    try {
      result = await generatePersonalityFromDescription(description);
    } catch {
      result = null;
    } finally {
      stopSpinner();
    }

    if (!result) {
      console.log("  Could not reach the pet designer.");
      const next = (await ask("  (r)etry, (p)ick a preset, or (c)ancel? ")).trim().toLowerCase();
      if (next === "r" || next === "retry") continue;
      if (next === "p" || next === "preset") {
        const preset = await pickPresetLoop(ask);
        return createPet(petName, preset);
      }
      return null; // cancel
    }

    return createPet(petName, result.species, result.personality);
  }
}

/** Forces the user to pick a preset (no option to bail to custom). */
async function pickPresetLoop(ask: (q: string) => Promise<string>): Promise<string> {
  const presets: Record<string, string> = {
    "1": "slime creature",
    "2": "shadow cat",
    "3": "cloud puff",
    "4": "fire sprite",
    "5": "crystal turtle",
  };
  while (true) {
    console.log("\n  Pick a preset species:");
    console.log("    1. Slime Creature");
    console.log("    2. Shadow Cat");
    console.log("    3. Cloud Puff");
    console.log("    4. Fire Sprite");
    console.log("    5. Crystal Turtle");
    const choice = (await ask("\n  Enter number (1-5): ")).trim();
    if (choice in presets) return presets[choice]!;
    console.log("  Invalid choice.");
  }
}
