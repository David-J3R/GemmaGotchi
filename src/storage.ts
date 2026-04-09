import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { PetState, SaveData, SaveMeta } from "./types.js";
import { createMemory } from "./memory.js";
import { createRelationship } from "./relationship.js";
import { generatePersonality } from "./personality.js";
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
} from "./constants.js";

const SAVE_DIR = path.join(os.homedir(), ".tamagotchi");
const SAVE_FILE = path.join(SAVE_DIR, "save.json");
const SAVE_TMP = path.join(SAVE_DIR, "save.json.tmp");
const SAVE_CORRUPT = path.join(SAVE_DIR, "save.json.corrupt");

/** Clamps a value between STAT_MIN and STAT_MAX */
function clamp(value: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, value));
}

/** Ensures the save directory exists */
async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(SAVE_DIR, { recursive: true });
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "EEXIST") throw err;
  }
}

/** Saves the full PetState to disk atomically */
export async function savePet(pet: PetState): Promise<void> {
  await ensureDir();

  const meta: SaveMeta = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };

  const data: SaveData = { _meta: meta, pet };
  const json = JSON.stringify(data, null, 2);

  // Atomic write: write to tmp, then rename
  await fs.writeFile(SAVE_TMP, json, "utf-8");
  await fs.rename(SAVE_TMP, SAVE_FILE);
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

/** Loads the pet from disk. Returns null on first launch or corruption. */
export async function loadPet(): Promise<{ pet: PetState; meta: SaveMeta } | null> {
  let raw: string;
  try {
    raw = await fs.readFile(SAVE_FILE, "utf-8");
  } catch {
    // File doesn't exist — first launch
    return null;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Corrupted JSON — back up and return null
    console.warn("  Warning: Save file is corrupted. Backing up and starting fresh.");
    try {
      await fs.rename(SAVE_FILE, SAVE_CORRUPT);
    } catch {
      // If backup fails, just delete
      try { await fs.unlink(SAVE_FILE); } catch { /* ignore */ }
    }
    return null;
  }

  // Extract meta
  const metaObj = parsed["_meta"] as Record<string, unknown> | undefined;
  const meta: SaveMeta = {
    version: typeof metaObj?.["version"] === "number" ? metaObj["version"] : SAVE_VERSION,
    savedAt: typeof metaObj?.["savedAt"] === "string" ? metaObj["savedAt"] : new Date().toISOString(),
    engineVersion: typeof metaObj?.["engineVersion"] === "string" ? metaObj["engineVersion"] : ENGINE_VERSION,
  };

  // Extract pet (support both wrapped { pet: ... } and flat format)
  const petObj = (parsed["pet"] ?? parsed) as Record<string, unknown>;
  const pet = fillDefaults(petObj);

  return { pet, meta };
}

/** Deletes the save file */
export async function deleteSave(): Promise<void> {
  try {
    await fs.unlink(SAVE_FILE);
  } catch {
    // Already gone — fine
  }
}

/** Returns true if a save file exists */
export async function hasSaveFile(): Promise<boolean> {
  try {
    await fs.access(SAVE_FILE);
    return true;
  } catch {
    return false;
  }
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

  // Track initial values for the summary
  const initialHunger = pet.hunger;
  const initialHappiness = pet.happiness;
  const initialEnergy = pet.energy;

  // Apply half-rate decay for each offline tick
  for (let i = 0; i < ticks; i++) {
    pet.hunger = clamp(pet.hunger - HUNGER_DECAY * OFFLINE_DECAY_MULTIPLIER);
    pet.happiness = clamp(pet.happiness - HAPPINESS_DECAY * OFFLINE_DECAY_MULTIPLIER);
    pet.energy = clamp(pet.energy - ENERGY_DECAY * OFFLINE_DECAY_MULTIPLIER);

    // Health decay from neglect is possible but capped at MIN_OFFLINE_HEALTH
    if (pet.health > MIN_OFFLINE_HEALTH) {
      // Don't let health drop below MIN_OFFLINE_HEALTH from offline neglect
      pet.health = Math.max(MIN_OFFLINE_HEALTH, pet.health);
    }
  }

  // Cap health — never die from offline neglect
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
