/**
 * Single source of truth for every tunable game number.
 *
 * Per project policy: NO magic numbers in any other engine file. If you
 * need a threshold, decay rate, probability, or duration, declare it
 * here and import it. `state.ts`, `actions.ts`, `events.ts`,
 * `progression.ts`, and `storage.ts` all draw from this file.
 */

// ── Default stats for a new pet ──────────────────────────────────────
export const DEFAULT_HUNGER = 80;
export const DEFAULT_HAPPINESS = 70;
export const DEFAULT_ENERGY = 90;
export const DEFAULT_HEALTH = 100;
export const DEFAULT_LEVEL = 1;
export const DEFAULT_XP = 0;

// ── Stat boundaries ─────────────────────────────────────────────────
export const STAT_MIN = 0;
export const STAT_MAX = 100;

// ── Decay rates per tick ────────────────────────────────────────────
export const HUNGER_DECAY = 3;
export const HAPPINESS_DECAY = 2;
export const ENERGY_DECAY = 2;

// ── Sleep modifiers ─────────────────────────────────────────────────
export const SLEEP_ENERGY_RECOVERY = 8;
export const SLEEP_HUNGER_DECAY_MULTIPLIER = 0.5;

// ── Auto-sleep / wake thresholds ────────────────────────────────────
export const AUTO_SLEEP_THRESHOLD = 10;
export const WAKE_ENERGY_THRESHOLD = 80;

// ── Health decay ────────────────────────────────────────────────────
export const NEGLECT_STAT_THRESHOLD = 30;
export const HEALTH_DECAY_RATE = 5;

// ── Mood thresholds ─────────────────────────────────────────────────
export const CRITICAL_HEALTH_THRESHOLD = 15;
export const SICK_HEALTH_THRESHOLD = 30;
export const STARVING_HUNGER_THRESHOLD = 15;
export const EXHAUSTED_ENERGY_THRESHOLD = 15;
export const SAD_HAPPINESS_THRESHOLD = 20;
export const ANGRY_HUNGER_THRESHOLD = 30;
export const ANGRY_HAPPINESS_THRESHOLD = 30;
export const BORED_HAPPINESS_THRESHOLD = 35;
export const HAPPY_HAPPINESS_THRESHOLD = 60;
export const ECSTATIC_HAPPINESS_THRESHOLD = 80;

// ── Action stat effects ─────────────────────────────────────────────
export const FEED_HUNGER = 25;
export const FEED_HAPPINESS = 5;
export const PLAY_HAPPINESS = 20;
export const PLAY_ENERGY = -15;
export const PLAY_HUNGER = -8;
export const PET_HAPPINESS = 12;
export const HEAL_HEALTH = 30;
export const HEAL_HAPPINESS = -5;

// ── Action edge-case thresholds ─────────────────────────────────────
export const FEED_FULL_THRESHOLD = 90;
export const PLAY_HUNGER_THRESHOLD = 45;
export const PLAY_ENERGY_THRESHOLD = 30;
export const PLAY_HEALTH_THRESHOLD = 30;
export const HEAL_HEALTHY_THRESHOLD = 80;

// ── Random event probabilities (per tick, 0-1) ──────────────────────
export const EVENT_SHINY_OBJECT_CHANCE = 0.05;
export const EVENT_STOMACH_GROWL_CHANCE = 0.3;
export const EVENT_STOMACH_GROWL_HUNGER_THRESHOLD = 30;
export const EVENT_DANCING_CHANCE = 0.15;
export const EVENT_DANCING_HAPPINESS_THRESHOLD = 70;
export const EVENT_YAWNING_CHANCE = 0.25;
export const EVENT_YAWNING_ENERGY_THRESHOLD = 30;
export const EVENT_BUTTERFLY_CHANCE = 0.08;

// ── Progression ─────────────────────────────────────────────────────
export const XP_PER_LEVEL_MULTIPLIER = 100;

// ── Relationship events ────────────────────────────────────────────
export const EVENT_PET_INITIATES_CHANCE = 0.1;

// ── Persistence ────────────────────────────────────────────────────
export const AUTO_SAVE_INTERVAL_MS = 60_000;
export const MAX_OFFLINE_MINUTES = 1440;
export const OFFLINE_DECAY_MULTIPLIER = 0.5;
export const SAVE_VERSION = 1;
export const MIN_OFFLINE_HEALTH = 5;
export const ENGINE_VERSION = "0.1.0";

// ── Game loop ───────────────────────────────────────────────────────
export const TICK_INTERVAL_MS = 10_000;
