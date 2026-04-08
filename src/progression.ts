import type { PetState, GameEvent } from "./types.js";
import { applyStatChanges } from "./state.js";
import { XP_PER_LEVEL_MULTIPLIER } from "./constants.js";

/** XP granted per action type */
const ACTION_XP: Record<string, number> = {
  feed: 5,
  play: 10,
  pet: 3,
  talk: 8,
  heal: 5,
};

/** Evolution stages: [level threshold, species name] */
const EVOLUTION_STAGES: [number, string][] = [
  [5, "young slime"],
  [10, "elder slime"],
  [20, "slime monarch"],
];

/** Base species name before any evolution */
const BASE_SPECIES = "baby slime";

/** Stat bonus granted on evolution */
const EVOLUTION_STAT_BONUS = 10;

/** Returns the XP needed to reach the next level */
export function xpForLevel(level: number): number {
  return level * XP_PER_LEVEL_MULTIPLIER;
}

/** Grants XP for an action. Returns events for any level-ups that occurred. */
export function grantXP(pet: PetState, actionName: string): GameEvent[] {
  const xp = ACTION_XP[actionName];
  if (xp === undefined) return [];

  applyStatChanges(pet, { xp });
  const events: GameEvent[] = [];

  // Check for level-ups (possibly multiple)
  while (pet.xp >= xpForLevel(pet.level)) {
    pet.xp -= xpForLevel(pet.level);
    pet.level += 1;
    events.push({
      type: "level_up",
      message: `${pet.name} reached level ${pet.level}!`,
      timestamp: Date.now(),
    });
  }

  return events;
}

/** Checks if the pet should evolve at its current level. Returns an evolution event or null. */
export function checkEvolution(pet: PetState): GameEvent | null {
  for (const [level, speciesName] of EVOLUTION_STAGES) {
    if (pet.level === level && pet.species !== speciesName) {
      pet.species = speciesName;
      applyStatChanges(pet, {
        hunger: EVOLUTION_STAT_BONUS,
        happiness: EVOLUTION_STAT_BONUS,
        energy: EVOLUTION_STAT_BONUS,
        health: EVOLUTION_STAT_BONUS,
      });
      return {
        type: "evolution",
        message: `${pet.name} evolved into a ${speciesName}!`,
        timestamp: Date.now(),
      };
    }
  }
  return null;
}

/** Returns the species name for a given level (used for initial creation) */
export function speciesForLevel(level: number): string {
  for (let i = EVOLUTION_STAGES.length - 1; i >= 0; i--) {
    const stage = EVOLUTION_STAGES[i]!;
    if (level >= stage[0]) return stage[1];
  }
  return BASE_SPECIES;
}
