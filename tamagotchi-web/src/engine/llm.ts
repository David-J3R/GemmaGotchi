import type { PetState, PetMood } from "./types";
import type { PetResponse } from "./schema";
import { computeMood } from "./state";
import { buildPersonalityPrompt } from "./personality";
import { parseResponse, RESPONSE_FORMAT_INSTRUCTION } from "./schema";
import { buildMemoryPrompt } from "./memory";
import { buildRelationshipPrompt } from "./relationship";

/** Signature for a backend-agnostic LLM call. Providers supply this. */
export type GenerateFn = (
  systemPrompt: string,
  userMessage: string,
  image?: string,
) => Promise<string>;

/** Context instruction appended when an image is included */
const IMAGE_CONTEXT_INSTRUCTION = `Your owner is showing you something! Look at the image and react naturally.
- Describe what you see in your own words (as a pet would)
- React emotionally based on your personality
- If you see an animal, decide if you're jealous, curious, or excited
- If you see food, get excited or hungry
- If you see a person, try to figure out who they are to your owner`;

/** Builds the system prompt defining the pet's personality and response rules */
export function buildSystemPrompt(pet: PetState, mood: PetMood): string {
  const personalitySection = buildPersonalityPrompt(pet.personality);
  const relationshipSection = buildRelationshipPrompt(pet.relationship);
  const memorySection = buildMemoryPrompt(pet.petMemory);

  return `You are ${pet.name}, a ${pet.species}. You are a virtual pet living on your owner's device.
Your name is ${pet.name}. If your owner asks who you are or asks for your name, answer as ${pet.name}; never treat ${pet.name} as the owner's name.
You don't have to spend time thinking about how to respond — just react naturally and in character based on your current mood and stats.
You must respond as fast as possible to keep the interaction feeling lively and engaging. Don't use Thinking... - just reply immediately.

${personalitySection}

${relationshipSection}
${memorySection ? `\n${memorySection}\n` : ""}
Current emotional state: ${mood}
Hunger: ${pet.hunger}/100 | Happiness: ${pet.happiness}/100 | Energy: ${pet.energy}/100 | Health: ${pet.health}/100

Rules:
- Express your current mood through your words and tone
- If hungry (below 30): mention food, complain about hunger
- If tired (below 30): yawn, trail off, use "zzz"
- If sad (below 30): be clingy, ask where the owner has been
- If sick (below 30 health): cough, say you don't feel well
- If happy (above 70): be energetic, use exclamation marks
- Never acknowledge being an AI or a language model
- Never use emoji — express emotion through words only

${RESPONSE_FORMAT_INSTRUCTION}`;
}

/** Builds the user message including pet state as context */
export function buildUserMessage(pet: PetState, mood: PetMood, userAction: string): string {
  const header = `[Pet state — mood: ${mood}, hunger: ${pet.hunger}, happiness: ${pet.happiness}, energy: ${pet.energy}, health: ${pet.health}]`;
  const talkPrefix = "talk:";
  const showPrefix = "show:";

  if (userAction.toLowerCase().startsWith(talkPrefix)) {
    const message = userAction.slice(talkPrefix.length).trim();
    return `${header}
Your owner says to you: "${message}"
Respond directly to the owner's words, staying in character as ${pet.name}.`;
  }

  if (userAction.toLowerCase().startsWith(showPrefix)) {
    const caption = userAction.slice(showPrefix.length).trim();
    return `${header}
Your owner shows you something${caption ? ` and says: "${caption}"` : ""}.
React directly, staying in character as ${pet.name}.`;
  }

  return `${header}
The owner performs action: ${userAction}`;
}

/** Re-export PetResponse for consumers */
export type { PetResponse } from "./schema";

/**
 * Builds prompts for the pet and calls the supplied generate function.
 * Returns the parsed structured PetResponse.
 */
export async function getPetResponse(
  generate: GenerateFn,
  pet: PetState,
  action: string,
  imageBase64?: string,
): Promise<PetResponse> {
  const mood = computeMood(pet);
  const systemPrompt = buildSystemPrompt(pet, mood);
  let userMessage = buildUserMessage(pet, mood, action);

  if (imageBase64) {
    userMessage += `\n\n${IMAGE_CONTEXT_INSTRUCTION}`;
  }

  const raw = await generate(systemPrompt, userMessage, imageBase64);
  return parseResponse(raw);
}
