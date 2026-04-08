import type { PetState, GameEvent } from "./types.js";
import {
  EVENT_SHINY_OBJECT_CHANCE,
  EVENT_STOMACH_GROWL_CHANCE,
  EVENT_STOMACH_GROWL_HUNGER_THRESHOLD,
  EVENT_DANCING_CHANCE,
  EVENT_DANCING_HAPPINESS_THRESHOLD,
  EVENT_YAWNING_CHANCE,
  EVENT_YAWNING_ENERGY_THRESHOLD,
  EVENT_BUTTERFLY_CHANCE,
} from "./constants.js";

/** Definition of a random event that can occur during a tick */
interface RandomEventDef {
  type: string;
  message: (pet: PetState) => string;
  probability: number;
  condition?: (pet: PetState) => boolean;
}

const RANDOM_EVENTS: RandomEventDef[] = [
  {
    type: "shiny_object",
    message: (pet) => `${pet.name} found a shiny object on the ground!`,
    probability: EVENT_SHINY_OBJECT_CHANCE,
  },
  {
    type: "stomach_growl",
    message: (pet) => `${pet.name}'s stomach is growling loudly...`,
    probability: EVENT_STOMACH_GROWL_CHANCE,
    condition: (pet) => pet.hunger < EVENT_STOMACH_GROWL_HUNGER_THRESHOLD,
  },
  {
    type: "dancing",
    message: (pet) => `${pet.name} starts dancing happily!`,
    probability: EVENT_DANCING_CHANCE,
    condition: (pet) => pet.happiness > EVENT_DANCING_HAPPINESS_THRESHOLD,
  },
  {
    type: "yawning",
    message: (pet) => `${pet.name} lets out a big yawn...`,
    probability: EVENT_YAWNING_CHANCE,
    condition: (pet) => pet.energy < EVENT_YAWNING_ENERGY_THRESHOLD,
  },
  {
    type: "butterfly",
    message: (pet) => `A butterfly lands on ${pet.name}'s head!`,
    probability: EVENT_BUTTERFLY_CHANCE,
  },
];

/** Rolls all random events for the current tick. Returns events that triggered. */
export function rollRandomEvents(pet: PetState): GameEvent[] {
  if (!pet.isAlive || pet.isSleeping) return [];

  const triggered: GameEvent[] = [];
  const now = Date.now();

  for (const event of RANDOM_EVENTS) {
    if (event.condition && !event.condition(pet)) continue;
    if (Math.random() < event.probability) {
      triggered.push({
        type: event.type,
        message: event.message(pet),
        timestamp: now,
      });
    }
  }

  return triggered;
}
