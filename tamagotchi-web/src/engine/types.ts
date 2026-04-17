/** All possible pet moods, derived from current stats */
export type PetMood =
  | "ecstatic"
  | "happy"
  | "content"
  | "bored"
  | "sad"
  | "angry"
  | "sick"
  | "exhausted"
  | "starving"
  | "critical";

import type { PetPersonality } from "./personality";
import type { PetMemory } from "./memory";
import type { Relationship } from "./relationship";

/** Re-export PetPersonality for convenience */
export type { PetPersonality } from "./personality";
/** Re-export PetMemory for convenience */
export type { PetMemory } from "./memory";
/** Re-export Relationship for convenience */
export type { Relationship } from "./relationship";

/** Core pet state representing all vital stats and metadata */
export interface PetState {
  name: string;
  species: string;
  age: number;
  level: number;
  xp: number;
  hunger: number;
  happiness: number;
  energy: number;
  health: number;
  isAlive: boolean;
  isSleeping: boolean;
  lastInteraction: number;
  personality: PetPersonality;
  memories: string[];
  petMemory: PetMemory;
  relationship: Relationship;
}

/** Metadata stored alongside the save file */
export interface SaveMeta {
  version: number;
  savedAt: string;
  engineVersion: string;
}

/** Full save file structure: pet state + metadata */
export interface SaveData {
  _meta: SaveMeta;
  pet: PetState;
}

/** Partial stat changes to apply to a pet */
export interface StatChanges {
  hunger?: number;
  happiness?: number;
  energy?: number;
  health?: number;
  xp?: number;
}

/** An event that occurred during a tick or action */
export interface GameEvent {
  type: string;
  message: string;
  timestamp: number;
}

/** Result of performing a user action */
export interface ActionResult {
  message: string;
  events: GameEvent[];
  needsLLM: boolean;
  llmContext?: string;
}
