import type { PetState, PetMood, StatChanges, GameEvent } from "./types";
import { generatePersonality } from "./personality";
import { createMemory } from "./memory";
import { createRelationship } from "./relationship";
import {
  DEFAULT_HUNGER,
  DEFAULT_HAPPINESS,
  DEFAULT_ENERGY,
  DEFAULT_HEALTH,
  DEFAULT_LEVEL,
  DEFAULT_XP,
  STAT_MIN,
  STAT_MAX,
  HUNGER_DECAY,
  HAPPINESS_DECAY,
  ENERGY_DECAY,
  SLEEP_ENERGY_RECOVERY,
  SLEEP_HUNGER_DECAY_MULTIPLIER,
  AUTO_SLEEP_THRESHOLD,
  WAKE_ENERGY_THRESHOLD,
  NEGLECT_STAT_THRESHOLD,
  HEALTH_DECAY_RATE,
  CRITICAL_HEALTH_THRESHOLD,
  SICK_HEALTH_THRESHOLD,
  STARVING_HUNGER_THRESHOLD,
  EXHAUSTED_ENERGY_THRESHOLD,
  SAD_HAPPINESS_THRESHOLD,
  ANGRY_HUNGER_THRESHOLD,
  ANGRY_HAPPINESS_THRESHOLD,
  BORED_HAPPINESS_THRESHOLD,
  HAPPY_HAPPINESS_THRESHOLD,
  ECSTATIC_HAPPINESS_THRESHOLD,
} from "./constants";

/** Clamps a value between STAT_MIN and STAT_MAX */
function clamp(value: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, value));
}

/** Creates a new pet with sensible default stats and a generated personality */
export function createPet(name: string, species: string): PetState {
  return {
    name,
    species,
    age: 0,
    level: DEFAULT_LEVEL,
    xp: DEFAULT_XP,
    hunger: DEFAULT_HUNGER,
    happiness: DEFAULT_HAPPINESS,
    energy: DEFAULT_ENERGY,
    health: DEFAULT_HEALTH,
    isAlive: true,
    isSleeping: false,
    lastInteraction: Date.now(),
    personality: generatePersonality(species),
    memories: [],
    petMemory: createMemory(),
    relationship: createRelationship(),
  };
}

/** Derives the pet's mood from current stats using priority rules */
export function computeMood(pet: PetState): PetMood {
  // Priority order: most critical conditions first
  if (pet.health < CRITICAL_HEALTH_THRESHOLD) return "critical";
  if (pet.health < SICK_HEALTH_THRESHOLD) return "sick";
  if (pet.hunger < STARVING_HUNGER_THRESHOLD) return "starving";
  if (pet.energy < EXHAUSTED_ENERGY_THRESHOLD) return "exhausted";
  if (pet.hunger < ANGRY_HUNGER_THRESHOLD && pet.happiness < ANGRY_HAPPINESS_THRESHOLD) return "angry";
  if (pet.happiness < SAD_HAPPINESS_THRESHOLD) return "sad";
  if (pet.happiness < BORED_HAPPINESS_THRESHOLD) return "bored";
  if (pet.happiness >= ECSTATIC_HAPPINESS_THRESHOLD) return "ecstatic";
  if (pet.happiness >= HAPPY_HAPPINESS_THRESHOLD) return "happy";
  return "content";
}

/** Applies stat changes to a pet, clamping all values to 0-100 */
export function applyStatChanges(pet: PetState, changes: StatChanges): void {
  if (changes.hunger !== undefined) pet.hunger = clamp(pet.hunger + changes.hunger);
  if (changes.happiness !== undefined) pet.happiness = clamp(pet.happiness + changes.happiness);
  if (changes.energy !== undefined) pet.energy = clamp(pet.energy + changes.energy);
  if (changes.health !== undefined) pet.health = clamp(pet.health + changes.health);
  if (changes.xp !== undefined) pet.xp += changes.xp;
}

/** Advances the pet by one tick: decays stats, handles sleep, checks neglect and death. Returns events describing what happened. */
export function tick(pet: PetState): GameEvent[] {
  if (!pet.isAlive) return [];

  const events: GameEvent[] = [];
  const now = Date.now();

  pet.age += 1;

  if (pet.isSleeping) {
    // Sleeping: recover energy, decay hunger at half rate
    applyStatChanges(pet, {
      energy: SLEEP_ENERGY_RECOVERY,
      hunger: -(HUNGER_DECAY * SLEEP_HUNGER_DECAY_MULTIPLIER),
    });

    // Wake up when energy is restored
    if (pet.energy >= WAKE_ENERGY_THRESHOLD) {
      pet.isSleeping = false;
      events.push({
        type: "wake",
        message: `${pet.name} woke up feeling refreshed!`,
        timestamp: now,
      });
    }
  } else {
    // Awake: normal stat decay
    applyStatChanges(pet, {
      hunger: -HUNGER_DECAY,
      happiness: -HAPPINESS_DECAY,
      energy: -ENERGY_DECAY,
    });

    // Auto-sleep when energy is critically low
    if (pet.energy < AUTO_SLEEP_THRESHOLD) {
      pet.isSleeping = true;
      events.push({
        type: "auto_sleep",
        message: `${pet.name} is too tired and fell asleep!`,
        timestamp: now,
      });
    }
  }

  // Neglect penalty: health decays when both hunger and energy are low
  if (pet.hunger < NEGLECT_STAT_THRESHOLD && pet.energy < NEGLECT_STAT_THRESHOLD) {
    applyStatChanges(pet, { health: -HEALTH_DECAY_RATE });
    events.push({
      type: "neglect",
      message: `${pet.name} is being neglected! Health is dropping.`,
      timestamp: now,
    });
  }

  // Death check
  if (pet.health <= STAT_MIN) {
    pet.health = STAT_MIN;
    pet.isAlive = false;
    events.push({
      type: "death",
      message: `${pet.name} has passed away from neglect...`,
      timestamp: now,
    });
  }

  return events;
}
