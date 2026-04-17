import type { PetMood } from "./types";

/** Bond level labels indexed by level number */
const BOND_LABELS: readonly string[] = [
  "stranger",
  "acquaintance",
  "friend",
  "best friend",
  "soulmate",
  "bonded",
];

/** Trust thresholds for each bond level upgrade */
const BOND_THRESHOLDS: readonly number[] = [0, 20, 40, 60, 80, 95];

/** Bond behavior descriptions for each level */
const BOND_BEHAVIORS: readonly string[] = [
  "You are shy and give short, cautious responses.",
  "You are warming up and may use your owner's name if you remember it.",
  "You freely initiate conversations and share your feelings.",
  "You share your inner thoughts openly and treat your owner as your closest companion.",
  "You get separation anxiety if neglected, but recover faster when your owner returns.",
  "You occasionally give gifts (XP bonuses, stat buffs) to show your deep bond.",
];

/** Owner-pet relationship tracking */
export interface Relationship {
  trust: number;
  bondLevel: number;
  interactionCount: number;
  neglectStreak: number;
  careStreak: number;
  lastMoodWhenInteracted: PetMood;
}

/** Creates a new relationship at stranger level */
export function createRelationship(): Relationship {
  return {
    trust: 0,
    bondLevel: 0,
    interactionCount: 0,
    neglectStreak: 0,
    careStreak: 0,
    lastMoodWhenInteracted: "content",
  };
}

/** Clamps trust to 0-100 */
function clampTrust(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Calculates bond level from trust value */
function computeBondLevel(trust: number): number {
  for (let i = BOND_THRESHOLDS.length - 1; i >= 0; i--) {
    if (trust >= BOND_THRESHOLDS[i]!) return i;
  }
  return 0;
}

/** Updates the relationship based on whether the owner interacted this tick */
export function updateRelationship(
  rel: Relationship,
  happiness: number,
  mood: PetMood,
  interacted: boolean,
): void {
  if (interacted) {
    // Trust gain scales with pet's happiness: 1 at low, 3 at high
    const trustGain = happiness >= 60 ? 3 : happiness >= 30 ? 2 : 1;
    rel.trust = clampTrust(rel.trust + trustGain);
    rel.neglectStreak = 0;
    rel.careStreak += 1;
    rel.interactionCount += 1;
    rel.lastMoodWhenInteracted = mood;
  } else {
    rel.trust = clampTrust(rel.trust - 0.5);
    rel.neglectStreak += 1;
    rel.careStreak = 0;
  }

  rel.bondLevel = computeBondLevel(rel.trust);
}

/** Returns the human-readable label for the current bond level */
export function getBondLabel(rel: Relationship): string {
  return BOND_LABELS[rel.bondLevel] ?? "stranger";
}

/** Returns the behavior description for the current bond level */
export function getBondBehavior(rel: Relationship): string {
  return BOND_BEHAVIORS[rel.bondLevel] ?? BOND_BEHAVIORS[0]!;
}

/** Builds the relationship context string for the system prompt */
export function buildRelationshipPrompt(rel: Relationship): string {
  const label = getBondLabel(rel);
  const behavior = getBondBehavior(rel);

  const lines: string[] = [
    `Relationship with owner: ${label} (trust: ${Math.round(rel.trust)}/100)`,
  ];

  if (rel.interactionCount > 0) {
    lines.push(`You've known your owner for ${rel.interactionCount} interactions.`);
  }

  if (rel.trust >= 60) {
    lines.push("You trust them deeply.");
  } else if (rel.trust >= 30) {
    lines.push("You're starting to trust them.");
  } else if (rel.trust > 0) {
    lines.push("You're still getting to know them.");
  }

  lines.push(`Bond behavior: ${behavior}`);

  if (rel.neglectStreak >= 5) {
    lines.push(`You haven't been interacted with for ${rel.neglectStreak} ticks and feel neglected.`);
  }

  return lines.join("\n");
}
