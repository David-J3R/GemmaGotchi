import * as readline from "node:readline";
import type { PetState, GameEvent } from "./types.js";
import { createPet, tick, applyStatChanges } from "./state.js";
import { performAction } from "./actions.js";
import { rollRandomEvents, rollPetInitiatedEvent } from "./events.js";
import { getPetResponse, buildOllamaRequest, loadImageAsBase64 } from "./llm.js";
import type { PetResponse } from "./schema.js";
import { addExchange, addMemory, needsConsolidation, consolidateMemories } from "./memory.js";
import { grantXP, checkEvolution } from "./progression.js";
import { renderDisplay, renderEvents, clearScreen, renderWelcomeBack, renderSaveIndicator } from "./display.js";
import { TICK_INTERVAL_MS, AUTO_SAVE_INTERVAL_MS } from "./constants.js";
import { updateRelationship } from "./relationship.js";
import { computeMood } from "./state.js";
import { savePet, loadPet, deleteSave, hasSaveFile, applyOfflineTime } from "./storage.js";

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
  });

  let pendingEvents: GameEvent[] = [];
  let running = true;
  let interactedThisTick = false;

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
  }

  /** Processes one game tick */
  function gameTick(): void {
    if (!running || !pet.isAlive) return;

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
      // Fire an LLM call where the pet starts the conversation
      getPetResponse(pet, "pet initiates conversation")
        .then((response) => {
          handlePetResponse(pet, response);
          addExchange(pet.petMemory, "(pet initiated)", response.speech);
          if (response.memory) {
            addMemory(pet.petMemory, response.memory);
          }
          render();
        })
        .catch(() => {
          // Silently fail — pet just wanted to chat
        });
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
    console.log("  (thinking...)");

    const response = await getPetResponse(pet, "show", imageBase64);
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

  /** Auto-save callback */
  async function autoSave(): Promise<void> {
    if (!running) return;
    try {
      await savePet(pet);
      process.stdout.write(renderSaveIndicator() + "\n");
    } catch (err: unknown) {
      console.error("  Warning: Auto-save failed:", (err as Error).message);
    }
  }

  /** Handles a user command */
  async function handleCommand(input: string): Promise<void> {
    const command = input.trim().toLowerCase();

    if (command === "quit") {
      console.log(`\n  Saving...`);
      await savePet(pet);
      console.log(`  Goodbye! ${pet.name} will miss you.`);
      shutdown();
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

    // Mark that the owner interacted this tick
    interactedThisTick = true;

    // Special handling for show command — needs image file path
    if (command === "show") {
      await handleShowCommand();
      return;
    }

    const result = performAction(pet, command);
    console.log(`\n  ${result.message}`);

    if (result.needsLLM) {
      console.log("  (thinking...)");
      const response = await getPetResponse(pet, command);
      handlePetResponse(pet, response);

      // Store conversation exchange in short-term memory
      addExchange(pet.petMemory, command, response.speech);

      // Store pet-generated memory in long-term memory
      if (response.memory) {
        addMemory(pet.petMemory, response.memory);
        if (needsConsolidation(pet.petMemory)) {
          await consolidateMemories(pet.petMemory);
        }
      }
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
    handleCommand(input).catch((err: unknown) => {
      console.error("  Error:", err);
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

    console.log("\n  Choose a species:");
    console.log("    1. Slime Creature  — playful, affectionate, loves food");
    console.log("    2. Shadow Cat      — sassy, curious, independent");
    console.log("    3. Cloud Puff      — energetic, dramatic, cuddly");
    console.log("    4. Fire Sprite     — clever, mischievous, loyal");
    console.log("    5. Crystal Turtle  — calm, wise, observant");

    const speciesChoice = await ask("\n  Enter number (1-5): ");
    const speciesMap: Record<string, string> = {
      "1": "slime creature",
      "2": "shadow cat",
      "3": "cloud puff",
      "4": "fire sprite",
      "5": "crystal turtle",
    };
    const species = speciesMap[speciesChoice.trim()];
    if (!species) {
      console.log("  Invalid choice. Let's try again.\n");
      continue;
    }

    pet = createPet(trimmedName, species);

    // Show personality preview
    const t = pet.personality.traits;
    const traitDesc = (name: string, val: number): string => {
      if (val >= 70) return `very ${name}`;
      if (val >= 50) return `quite ${name}`;
      if (val >= 30) return `a bit ${name}`;
      return `not very ${name}`;
    };
    console.log(`\n  Your ${trimmedName} is: ${traitDesc("playful", t.playfulness)}, ${traitDesc("curious", t.curiosity)}, ${traitDesc("affectionate", t.affection)}, ${traitDesc("sassy", t.sass)}`);

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
