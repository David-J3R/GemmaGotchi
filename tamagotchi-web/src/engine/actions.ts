/**
 * Player-initiated actions (feed, play, pet, sleep, heal, talk, show).
 *
 * `performAction` is the single entry point used by the UI. Each action
 * either mutates stats locally and returns `needsLLM: false`, or sets
 * `needsLLM: true` with an `llmContext` — in which case `useGameEngine`
 * calls into `llm.ts` to get a structured pet response.
 */
import type { PetState, ActionResult, GameEvent } from "./types";
import { applyStatChanges, computeMood } from "./state";
import {
  FEED_HUNGER,
  FEED_HAPPINESS,
  FEED_FULL_THRESHOLD,
  PLAY_HAPPINESS,
  PLAY_ENERGY,
  PLAY_HUNGER,
  PLAY_ENERGY_THRESHOLD,
  PET_HAPPINESS,
  HEAL_HEALTH,
  HEAL_HAPPINESS,
  HEAL_HEALTHY_THRESHOLD,
} from "./constants";

/** Creates a GameEvent with the current timestamp */
function makeEvent(type: string, message: string): GameEvent {
  return { type, message, timestamp: Date.now() };
}

/** Creates a rejection ActionResult (no stat changes, no LLM) */
function reject(message: string): ActionResult {
  return { message, events: [], needsLLM: false };
}

/** Feeds the pet: +hunger, +happiness. Rejected if hunger > 90. */
function feed(pet: PetState): ActionResult {
  if (pet.hunger > FEED_FULL_THRESHOLD) {
    return reject(`${pet.name} is already full!`);
  }
  applyStatChanges(pet, { hunger: FEED_HUNGER, happiness: FEED_HAPPINESS });
  pet.lastInteraction = Date.now();
  return {
    message: `You fed ${pet.name}! Yummy!`,
    events: [makeEvent("feed", `${pet.name} was fed`)],
    needsLLM: false,
  };
}

/** Plays with the pet: +happiness, -energy, -hunger. Rejected if sleeping or energy < 15. */
function play(pet: PetState): ActionResult {
  if (pet.isSleeping) {
    return reject(`${pet.name} is sleeping! Let them rest.`);
  }
  if (pet.energy < PLAY_ENERGY_THRESHOLD) {
    return reject(`${pet.name} is too tired to play!`);
  }
  applyStatChanges(pet, {
    happiness: PLAY_HAPPINESS,
    energy: PLAY_ENERGY,
    hunger: PLAY_HUNGER,
  });
  pet.lastInteraction = Date.now();
  return {
    message: `You played with ${pet.name}! So much fun!`,
    events: [makeEvent("play", `${pet.name} played`)],
    needsLLM: false,
  };
}

/** Pets the pet: +happiness. */
function petAction(pet: PetState): ActionResult {
  applyStatChanges(pet, { happiness: PET_HAPPINESS });
  pet.lastInteraction = Date.now();
  return {
    message: `You pet ${pet.name}. They seem to enjoy it!`,
    events: [makeEvent("pet", `${pet.name} was petted`)],
    needsLLM: false,
  };
}

/** Puts the pet to sleep. Rejected if already sleeping. */
function sleep(pet: PetState): ActionResult {
  if (pet.isSleeping) {
    return reject(`${pet.name} is already sleeping!`);
  }
  pet.isSleeping = true;
  pet.lastInteraction = Date.now();
  return {
    message: `${pet.name} curls up and falls asleep...`,
    events: [makeEvent("sleep", `${pet.name} was put to sleep`)],
    needsLLM: false,
  };
}

/** Heals the pet: +health, -happiness. Rejected if health > 80. */
function heal(pet: PetState): ActionResult {
  if (pet.health > HEAL_HEALTHY_THRESHOLD) {
    return reject(`${pet.name} is already healthy!`);
  }
  applyStatChanges(pet, { health: HEAL_HEALTH, happiness: HEAL_HAPPINESS });
  pet.lastInteraction = Date.now();
  return {
    message: `You gave ${pet.name} some medicine. They don't love the taste...`,
    events: [makeEvent("heal", `${pet.name} was healed`)],
    needsLLM: false,
  };
}

/** Builds the LLM context string for LLM-routed actions */
function buildLLMContext(pet: PetState, action: string, userInput?: string): string {
  const mood = computeMood(pet);
  return JSON.stringify({
    action,
    petName: pet.name,
    species: pet.species,
    mood,
    hunger: pet.hunger,
    happiness: pet.happiness,
    energy: pet.energy,
    health: pet.health,
    level: pet.level,
    isSleeping: pet.isSleeping,
    userInput,
  });
}

/** Talks to the pet — requires LLM to generate a response. */
function talk(pet: PetState): ActionResult {
  pet.lastInteraction = Date.now();
  return {
    message: `You talk to ${pet.name}...`,
    events: [makeEvent("talk", `Owner talked to ${pet.name}`)],
    needsLLM: true,
    llmContext: buildLLMContext(pet, "talk"),
  };
}

/** Shows the pet something — requires LLM to generate a reaction. */
function show(pet: PetState): ActionResult {
  pet.lastInteraction = Date.now();
  return {
    message: `You show something to ${pet.name}...`,
    events: [makeEvent("show", `Owner showed something to ${pet.name}`)],
    needsLLM: true,
    llmContext: buildLLMContext(pet, "show"),
  };
}

/** Routes a user action to the appropriate handler. Returns an ActionResult. */
export function performAction(pet: PetState, actionName: string): ActionResult {
  if (!pet.isAlive) {
    return reject(`${pet.name} is no longer with us...`);
  }

  switch (actionName) {
    case "feed": return feed(pet);
    case "play": return play(pet);
    case "pet": return petAction(pet);
    case "sleep": return sleep(pet);
    case "heal": return heal(pet);
    case "talk": return talk(pet);
    case "show": return show(pet);
    default: return reject(`Unknown action: ${actionName}`);
  }
}
