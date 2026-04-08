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

// ── Progression ─────────────────────────────────────────────────────
export const XP_PER_LEVEL_MULTIPLIER = 100;

// ── Game loop ───────────────────────────────────────────────────────
export const TICK_INTERVAL_MS = 10_000;
