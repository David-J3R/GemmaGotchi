/** Valid pet emotions for display/animation */
export type PetEmotion =
  | "happy"
  | "excited"
  | "sleepy"
  | "angry"
  | "scared"
  | "love"
  | "confused"
  | "mischievous";

const VALID_EMOTIONS: ReadonlySet<string> = new Set<PetEmotion>([
  "happy", "excited", "sleepy", "angry", "scared", "love", "confused", "mischievous",
]);

/** Valid action types the pet can request */
export type PetActionType =
  | "request_food"
  | "request_play"
  | "request_sleep"
  | "refuse"
  | "gift"
  | "trick"
  | "explore";

const VALID_ACTION_TYPES: ReadonlySet<string> = new Set<PetActionType>([
  "request_food", "request_play", "request_sleep", "refuse", "gift", "trick", "explore",
]);

/** Structured response from the pet's AI brain */
export interface PetResponse {
  speech: string;
  emotion: PetEmotion;
  innerThought?: string;
  action?: {
    type: PetActionType;
    intensity: number; // 1-10
  };
  moodShift?: {
    happiness?: number; // -10 to +10
    energy?: number;    // -10 to +10
  };
  memory?: string;
}

/** Clamps a number to a range */
function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Attempts to extract a JSON object from raw text, handling markdown code blocks */
function extractJSON(raw: string): string | null {
  const trimmed = raw.trim();

  // Try to extract from markdown code block first
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1]!.trim();
  }

  // Try to find a JSON object directly
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return null;
}

/** Parses and validates a raw LLM response into a PetResponse. Falls back gracefully on failure. */
export function parseResponse(raw: string): PetResponse {
  const jsonStr = extractJSON(raw);
  if (!jsonStr) {
    return { speech: raw.trim(), emotion: "confused" };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return { speech: raw.trim(), emotion: "confused" };
  }

  // Validate required field: speech
  if (typeof parsed["speech"] !== "string" || parsed["speech"].length === 0) {
    return { speech: raw.trim(), emotion: "confused" };
  }

  const speech = parsed["speech"];

  // Validate emotion
  const rawEmotion = typeof parsed["emotion"] === "string" ? parsed["emotion"].toLowerCase() : "";
  const emotion: PetEmotion = VALID_EMOTIONS.has(rawEmotion) ? rawEmotion as PetEmotion : "confused";

  const result: PetResponse = { speech, emotion };

  // Optional: innerThought
  if (typeof parsed["innerThought"] === "string" && parsed["innerThought"].length > 0) {
    result.innerThought = parsed["innerThought"];
  }

  // Optional: action
  if (typeof parsed["action"] === "object" && parsed["action"] !== null) {
    const action = parsed["action"] as Record<string, unknown>;
    const actionType = typeof action["type"] === "string" ? action["type"] : "";
    if (VALID_ACTION_TYPES.has(actionType)) {
      const intensity = typeof action["intensity"] === "number" ? action["intensity"] : 5;
      result.action = {
        type: actionType as PetActionType,
        intensity: clampRange(Math.round(intensity), 1, 10),
      };
    }
  }

  // Optional: moodShift
  if (typeof parsed["moodShift"] === "object" && parsed["moodShift"] !== null) {
    const shift = parsed["moodShift"] as Record<string, unknown>;
    const moodShift: { happiness?: number; energy?: number } = {};
    if (typeof shift["happiness"] === "number") {
      moodShift.happiness = clampRange(Math.round(shift["happiness"]), -10, 10);
    }
    if (typeof shift["energy"] === "number") {
      moodShift.energy = clampRange(Math.round(shift["energy"]), -10, 10);
    }
    if (moodShift.happiness !== undefined || moodShift.energy !== undefined) {
      result.moodShift = moodShift;
    }
  }

  // Optional: memory
  if (typeof parsed["memory"] === "string" && parsed["memory"].length > 0) {
    result.memory = parsed["memory"];
  }

  return result;
}

/** The JSON schema instruction block to include in the system prompt */
export const RESPONSE_FORMAT_INSTRUCTION = `
RESPONSE FORMAT: You must respond with ONLY a JSON object, no other text. Schema:
{
  "speech": "what you say out loud (1-2 sentences, in character)",
  "emotion": "one of: happy, excited, sleepy, angry, scared, love, confused, mischievous",
  "innerThought": "optional: your private thought (short, max 10 words)",
  "action": { "type": "request_food|request_play|request_sleep|refuse|gift|trick|explore", "intensity": 1-10 },
  "moodShift": { "happiness": -10 to +10, "energy": -10 to +10 },
  "memory": "optional: something to remember about this moment"
}
Only include optional fields when relevant. Always include speech and emotion.`.trim();
