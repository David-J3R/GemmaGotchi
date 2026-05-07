/**
 * Personality system: species templates → randomized PetPersonality.
 *
 * Each species has a base trait profile, a vocabulary level, and pools
 * of likes/dislikes/quirks. `generatePersonality` jitters the traits
 * (±15) and picks a random subset of pool items so two pets of the
 * same species feel distinct.
 *
 * `buildPersonalityPrompt` converts the structured personality into the
 * natural-language block that gets spliced into the LLM system prompt.
 */

/** Personality traits that define the pet's character */
export interface PetTraits {
  playfulness: number;   // 0-100: how silly vs serious
  curiosity: number;     // 0-100: how eager to explore/ask questions
  affection: number;     // 0-100: how clingy vs independent
  sass: number;          // 0-100: how snarky vs sweet
  energy: number;        // 0-100: how hyper vs chill
}

/** Speech style configuration */
export interface SpeechStyle {
  vocabulary: "baby" | "casual" | "articulate";
  expressiveness: "minimal" | "moderate" | "dramatic";
  quirks: string[];
}

/** Full personality definition for a pet */
export interface PetPersonality {
  traits: PetTraits;
  likes: string[];
  dislikes: string[];
  speechStyle: SpeechStyle;
}

/** Species-specific personality template with base trait values */
interface SpeciesTemplate {
  traits: PetTraits;
  vocabulary: SpeechStyle["vocabulary"];
  expressiveness: SpeechStyle["expressiveness"];
  quirkPool: string[];
  likePool: string[];
  dislikePool: string[];
}

const SPECIES_TEMPLATES: Record<string, SpeciesTemplate> = {
  "slime creature": {
    traits: { playfulness: 85, curiosity: 60, affection: 90, sass: 15, energy: 70 },
    vocabulary: "baby",
    expressiveness: "dramatic",
    quirkPool: [
      "adds 'bloop' when excited",
      "speaks in third person",
      "makes squelching sound effects",
      "giggles at everything",
    ],
    likePool: ["puddles", "warm spots", "being squished gently", "shiny things"],
    dislikePool: ["dry air", "being poked", "loud noises"],
  },
  "shadow cat": {
    traits: { playfulness: 50, curiosity: 85, affection: 55, sass: 90, energy: 45 },
    vocabulary: "articulate",
    expressiveness: "minimal",
    quirkPool: [
      "adds 'nya~' to sentences when pleased",
      "speaks with dry sarcasm",
      "narrates actions in third person dramatically",
      "pauses mid-sentence for effect",
    ],
    likePool: ["dark corners", "mysteries", "being admired", "fish"],
    dislikePool: ["bright lights", "being ignored", "water", "dogs"],
  },
  "cloud puff": {
    traits: { playfulness: 75, curiosity: 70, affection: 80, sass: 20, energy: 95 },
    vocabulary: "baby",
    expressiveness: "dramatic",
    quirkPool: [
      "adds 'whoosh' to sentences",
      "describes everything as floaty",
      "makes wind sound effects",
      "repeats words for emphasis",
    ],
    likePool: ["high places", "wind", "rainbows", "fluffy things"],
    dislikePool: ["being grounded", "heavy things", "rain"],
  },
  "fire sprite": {
    traits: { playfulness: 70, curiosity: 65, affection: 45, sass: 75, energy: 90 },
    vocabulary: "casual",
    expressiveness: "dramatic",
    quirkPool: [
      "uses fire metaphors constantly",
      "calls everything 'lit' unironically",
      "snaps fingers for emphasis",
      "hums while thinking",
    ],
    likePool: ["spicy food", "campfires", "dancing", "warm hugs"],
    dislikePool: ["water", "cold places", "being told to calm down"],
  },
  "crystal turtle": {
    traits: { playfulness: 30, curiosity: 90, affection: 65, sass: 40, energy: 25 },
    vocabulary: "articulate",
    expressiveness: "moderate",
    quirkPool: [
      "speaks slowly and deliberately",
      "quotes ancient wisdom it made up",
      "hums a low tone when content",
      "refers to time as 'merely a facet'",
    ],
    likePool: ["gemstones", "sunbathing", "quiet conversations", "puzzles"],
    dislikePool: ["rushing", "loud music", "being flipped over"],
  },
};

/** Default template for unknown species */
const DEFAULT_TEMPLATE: SpeciesTemplate = {
  traits: { playfulness: 60, curiosity: 60, affection: 60, sass: 40, energy: 60 },
  vocabulary: "casual",
  expressiveness: "moderate",
  quirkPool: [
    "tilts head when confused",
    "makes small noises when happy",
    "wiggles when excited",
    "blinks slowly to show trust",
  ],
  likePool: ["treats", "attention", "warm places", "gentle touches"],
  dislikePool: ["being alone", "sudden movements", "bitter tastes"],
};

/** Variance range applied to base trait values */
const TRAIT_VARIANCE = 15;

/** Number of quirks to pick from the pool */
const QUIRK_COUNT = 2;

/** Number of likes/dislikes to pick from pool */
const LIKE_COUNT = 2;
const DISLIKE_COUNT = 2;

/** Clamps a value between 0 and 100 */
function clampTrait(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Adds random variance to a base trait value */
function varyTrait(base: number): number {
  const offset = Math.floor(Math.random() * (TRAIT_VARIANCE * 2 + 1)) - TRAIT_VARIANCE;
  return clampTrait(base + offset);
}

/** Picks n random items from an array without replacement */
function pickRandom<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}

/** Generates a randomized personality seeded by species type */
export function generatePersonality(species: string): PetPersonality {
  const template = SPECIES_TEMPLATES[species.toLowerCase()] ?? DEFAULT_TEMPLATE;

  return {
    traits: {
      playfulness: varyTrait(template.traits.playfulness),
      curiosity: varyTrait(template.traits.curiosity),
      affection: varyTrait(template.traits.affection),
      sass: varyTrait(template.traits.sass),
      energy: varyTrait(template.traits.energy),
    },
    likes: pickRandom(template.likePool, LIKE_COUNT),
    dislikes: pickRandom(template.dislikePool, DISLIKE_COUNT),
    speechStyle: {
      vocabulary: template.vocabulary,
      expressiveness: template.expressiveness,
      quirks: pickRandom(template.quirkPool, QUIRK_COUNT),
    },
  };
}

/** Converts a trait value (0-100) to a natural language descriptor */
function describeTraitLevel(value: number): string {
  if (value >= 90) return "extremely";
  if (value >= 70) return "very";
  if (value >= 50) return "quite";
  if (value >= 30) return "moderately";
  if (value >= 15) return "slightly";
  return "barely";
}

/** Human-readable descriptions for each trait */
const TRAIT_DESCRIPTIONS: Record<keyof PetTraits, { high: string; low: string }> = {
  playfulness: {
    high: "you love games, jokes, and being silly",
    low: "you prefer calm, serious interactions",
  },
  curiosity: {
    high: "you ask questions about everything you see",
    low: "you are content with what you already know",
  },
  affection: {
    high: "you crave attention and get sad when ignored",
    low: "you are independent and enjoy your own company",
  },
  sass: {
    high: "you are snarky, witty, and love teasing",
    low: "you are sweet and rarely snarky",
  },
  energy: {
    high: "you are hyper and always bouncing around",
    low: "you are chill and prefer a relaxed pace",
  },
};

/** Vocabulary level descriptions */
const VOCABULARY_LABELS: Record<SpeechStyle["vocabulary"], string> = {
  baby: "simple baby-talk vocabulary",
  casual: "casual everyday vocabulary",
  articulate: "articulate and eloquent vocabulary",
};

/** Expressiveness level descriptions */
const EXPRESSIVENESS_LABELS: Record<SpeechStyle["expressiveness"], string> = {
  minimal: "minimally expressive — you keep emotions understated",
  moderate: "moderately expressive",
  dramatic: "dramatically expressive — you exaggerate your emotions",
};

/** Converts a PetPersonality into natural language instructions for the system prompt */
export function buildPersonalityPrompt(personality: PetPersonality): string {
  const lines: string[] = [];

  // Trait descriptions
  for (const [key, value] of Object.entries(personality.traits) as Array<[keyof PetTraits, number]>) {
    const level = describeTraitLevel(value);
    const desc = value >= 50 ? TRAIT_DESCRIPTIONS[key].high : TRAIT_DESCRIPTIONS[key].low;
    lines.push(`You are ${level} ${key} (${value}/100) — ${desc}.`);
  }

  lines.push("");

  // Speech style
  lines.push(`Speech style: You use ${VOCABULARY_LABELS[personality.speechStyle.vocabulary]}. You are ${EXPRESSIVENESS_LABELS[personality.speechStyle.expressiveness]}.`);

  // Quirks
  if (personality.speechStyle.quirks.length > 0) {
    lines.push(`Quirks: ${personality.speechStyle.quirks.map((q) => `You ${q}`).join(". ")}.`);
  }

  // Likes and dislikes
  if (personality.likes.length > 0) {
    lines.push(`You like: ${personality.likes.join(", ")}.`);
  }
  if (personality.dislikes.length > 0) {
    lines.push(`You dislike: ${personality.dislikes.join(", ")}.`);
  }

  return lines.join("\n");
}
