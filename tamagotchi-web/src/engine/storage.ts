import { get, set, del, keys } from "idb-keyval";
import type { PetState, SaveData, SaveMeta } from "./types";
import { createMemory } from "./memory";
import { createRelationship } from "./relationship";
import { generatePersonality } from "./personality";
import {
  SAVE_VERSION,
  ENGINE_VERSION,
  MAX_OFFLINE_MINUTES,
  OFFLINE_DECAY_MULTIPLIER,
  MIN_OFFLINE_HEALTH,
  HUNGER_DECAY,
  HAPPINESS_DECAY,
  ENERGY_DECAY,
  STAT_MIN,
  STAT_MAX,
  DEFAULT_HUNGER,
  DEFAULT_HAPPINESS,
  DEFAULT_ENERGY,
  DEFAULT_HEALTH,
  DEFAULT_LEVEL,
  DEFAULT_XP,
} from "./constants";

const SLOT_PREFIX = "slot-";

/** Clamps a value between STAT_MIN and STAT_MAX */
function clamp(value: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, value));
}

/** Fills in any missing fields on a loaded pet object using sensible defaults */
function fillDefaults(obj: Record<string, unknown>): PetState {
  const name = typeof obj["name"] === "string" ? obj["name"] : "Unknown";
  const species = typeof obj["species"] === "string" ? obj["species"] : "creature";

  return {
    name,
    species,
    age: typeof obj["age"] === "number" ? obj["age"] : 0,
    level: typeof obj["level"] === "number" ? obj["level"] : DEFAULT_LEVEL,
    xp: typeof obj["xp"] === "number" ? obj["xp"] : DEFAULT_XP,
    hunger: typeof obj["hunger"] === "number" ? obj["hunger"] : DEFAULT_HUNGER,
    happiness: typeof obj["happiness"] === "number" ? obj["happiness"] : DEFAULT_HAPPINESS,
    energy: typeof obj["energy"] === "number" ? obj["energy"] : DEFAULT_ENERGY,
    health: typeof obj["health"] === "number" ? obj["health"] : DEFAULT_HEALTH,
    isAlive: typeof obj["isAlive"] === "boolean" ? obj["isAlive"] : true,
    isSleeping: typeof obj["isSleeping"] === "boolean" ? obj["isSleeping"] : false,
    lastInteraction: typeof obj["lastInteraction"] === "number" ? obj["lastInteraction"] : Date.now(),
    personality:
      obj["personality"] && typeof obj["personality"] === "object"
        ? (obj["personality"] as PetState["personality"])
        : generatePersonality(species),
    memories: Array.isArray(obj["memories"]) ? (obj["memories"] as string[]) : [],
    petMemory:
      obj["petMemory"] && typeof obj["petMemory"] === "object"
        ? (obj["petMemory"] as PetState["petMemory"])
        : createMemory(),
    relationship:
      obj["relationship"] && typeof obj["relationship"] === "object"
        ? (obj["relationship"] as PetState["relationship"])
        : createRelationship(),
  };
}

/** Saves the pet state to IndexedDB in the given slot */
export async function savePet(pet: PetState, slot: number = 0): Promise<void> {
  const meta: SaveMeta = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };

  const data: SaveData = { _meta: meta, pet };
  await set(SLOT_PREFIX + slot, JSON.stringify(data));
}

/** Loads a pet from IndexedDB. Returns null if the slot is empty or corrupted. */
export async function loadPet(slot: number = 0): Promise<{ pet: PetState; meta: SaveMeta } | null> {
  const raw = await get<string>(SLOT_PREFIX + slot);
  if (!raw) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    console.warn("Save data corrupted for slot", slot);
    await del(SLOT_PREFIX + slot);
    return null;
  }

  const metaObj = parsed["_meta"] as Record<string, unknown> | undefined;
  const meta: SaveMeta = {
    version: typeof metaObj?.["version"] === "number" ? metaObj["version"] : SAVE_VERSION,
    savedAt: typeof metaObj?.["savedAt"] === "string" ? metaObj["savedAt"] : new Date().toISOString(),
    engineVersion: typeof metaObj?.["engineVersion"] === "string" ? metaObj["engineVersion"] : ENGINE_VERSION,
  };

  const petObj = (parsed["pet"] ?? parsed) as Record<string, unknown>;
  const pet = fillDefaults(petObj);

  return { pet, meta };
}

/** Deletes a save slot */
export async function deleteSave(slot: number = 0): Promise<void> {
  await del(SLOT_PREFIX + slot);
}

/** Lists which save slots have data. Returns an array of slot numbers. */
export async function listSaveSlots(): Promise<number[]> {
  const allKeys = await keys<string>();
  return allKeys
    .filter((k) => typeof k === "string" && k.startsWith(SLOT_PREFIX))
    .map((k) => parseInt((k as string).slice(SLOT_PREFIX.length), 10))
    .filter((n) => !isNaN(n))
    .sort();
}

/** Formats a duration in minutes to a human-readable string */
function formatDuration(minutes: number): string {
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${Math.round(minutes)} minute${minutes >= 2 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  return `${hours} hour${hours > 1 ? "s" : ""} and ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}`;
}

/** Result of applying offline time, including a summary for display */
export interface OfflineResult {
  pet: PetState;
  elapsedMinutes: number;
  summary: string;
}

/** Applies offline time decay to a pet based on how long the player was away */
export function applyOfflineTime(pet: PetState, savedAt: string): OfflineResult {
  const savedTime = new Date(savedAt).getTime();
  const now = Date.now();
  const elapsedMs = now - savedTime;
  const elapsedMinutes = Math.min(elapsedMs / 60_000, MAX_OFFLINE_MINUTES);

  if (elapsedMinutes < 1) {
    return { pet, elapsedMinutes: 0, summary: "" };
  }

  const ticks = Math.floor(elapsedMinutes);

  const initialHunger = pet.hunger;
  const initialHappiness = pet.happiness;
  const initialEnergy = pet.energy;

  for (let i = 0; i < ticks; i++) {
    pet.hunger = clamp(pet.hunger - HUNGER_DECAY * OFFLINE_DECAY_MULTIPLIER);
    pet.happiness = clamp(pet.happiness - HAPPINESS_DECAY * OFFLINE_DECAY_MULTIPLIER);
    pet.energy = clamp(pet.energy - ENERGY_DECAY * OFFLINE_DECAY_MULTIPLIER);

    if (pet.health > MIN_OFFLINE_HEALTH) {
      pet.health = Math.max(MIN_OFFLINE_HEALTH, pet.health);
    }
  }

  if (pet.health < MIN_OFFLINE_HEALTH) {
    pet.health = MIN_OFFLINE_HEALTH;
  }

  pet.lastInteraction = now;

  const hungerDrop = Math.round(initialHunger - pet.hunger);
  const happinessDrop = Math.round(initialHappiness - pet.happiness);
  const energyDrop = Math.round(initialEnergy - pet.energy);

  const duration = formatDuration(elapsedMinutes);
  const summary = `You were away for ${duration}. Your pet's hunger dropped by ${hungerDrop}, happiness by ${happinessDrop}, energy by ${energyDrop}.`;

  return { pet, elapsedMinutes, summary };
}
