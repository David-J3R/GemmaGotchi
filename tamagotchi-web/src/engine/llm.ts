import type { PetState, PetMood } from "./types";
import type { PetResponse } from "./schema";
import { computeMood } from "./state";
import { buildPersonalityPrompt } from "./personality";
import { parseResponse, RESPONSE_FORMAT_INSTRUCTION } from "./schema";
import { buildMemoryPrompt } from "./memory";
import { buildRelationshipPrompt } from "./relationship";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "gemma4:e2b";
const TIMEOUT_MS = 10_000;

/** Context instruction appended when an image is included */
const IMAGE_CONTEXT_INSTRUCTION = `Your owner is showing you something! Look at the image and react naturally.
- Describe what you see in your own words (as a pet would)
- React emotionally based on your personality
- If you see an animal, decide if you're jealous, curious, or excited
- If you see food, get excited or hungry
- If you see a person, try to figure out who they are to your owner`;

/** A message in the Ollama chat request */
interface OllamaChatMessage {
  role: "system" | "user";
  content: string;
  images?: string[];
}

/** Exact request body sent to Ollama's chat endpoint */
interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream: boolean;
}

/** Builds the system prompt defining the pet's personality and response rules */
export function buildSystemPrompt(pet: PetState, mood: PetMood): string {
  const personalitySection = buildPersonalityPrompt(pet.personality);
  const relationshipSection = buildRelationshipPrompt(pet.relationship);
  const memorySection = buildMemoryPrompt(pet.petMemory);

  return `You are ${pet.name}, a ${pet.species}. You are a virtual pet living on your owner's device.
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
  return `[Pet state — mood: ${mood}, hunger: ${pet.hunger}, happiness: ${pet.happiness}, energy: ${pet.energy}, health: ${pet.health}]
The owner performs action: ${userAction}`;
}

/** Re-export PetResponse for consumers */
export type { PetResponse } from "./schema";

/** Response shape from the Ollama /api/chat endpoint */
interface OllamaChatResponse {
  message?: { content?: string };
}

/** Builds the exact Ollama request metadata and body for a pet action */
export function buildOllamaRequest(pet: PetState, action: string): {
  url: string;
  body: OllamaChatRequest;
} {
  const mood = computeMood(pet);
  const systemPrompt = buildSystemPrompt(pet, mood);
  const userMessage = buildUserMessage(pet, mood, action);

  return {
    url: OLLAMA_URL,
    body: {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: false,
    },
  };
}

/** Calls Gemma 4 via Ollama's chat API. Returns the pet's response text, or a fallback on failure. */
export async function callGemma(systemPrompt: string, userMessage: string, imageBase64?: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const userMsg: OllamaChatMessage = { role: "user", content: userMessage };
  if (imageBase64) {
    userMsg.images = [imageBase64];
  }

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          userMsg,
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return "*yawns and looks at you curiously*";
    }

    const data = (await response.json()) as OllamaChatResponse;
    return data.message?.content ?? "*tilts head and blinks*";
  } catch {
    return "*looks up at you and wiggles*";
  } finally {
    clearTimeout(timeout);
  }
}

/** High-level function: given a pet and action, builds prompts, calls Gemma, and returns parsed response */
export async function getPetResponse(pet: PetState, action: string, imageBase64?: string): Promise<PetResponse> {
  const mood = computeMood(pet);
  const systemPrompt = buildSystemPrompt(pet, mood);
  let userMessage = buildUserMessage(pet, mood, action);

  if (imageBase64) {
    userMessage += `\n\n${IMAGE_CONTEXT_INSTRUCTION}`;
  }

  const raw = await callGemma(systemPrompt, userMessage, imageBase64);
  return parseResponse(raw);
}
