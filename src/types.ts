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
