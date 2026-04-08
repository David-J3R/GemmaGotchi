import type { PetState, PetMood } from "./types.js";
import { computeMood } from "./state.js";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "gemma4:e2b";
const TIMEOUT_MS = 10_000;

/** Builds the system prompt defining the pet's personality and response rules */
export function buildSystemPrompt(pet: PetState, mood: PetMood): string {
  return `You are ${pet.name}, a ${pet.species}. You are a virtual pet living on your owner's device.

Your personality: playful, curious, and affectionate with a mischievous streak.

Current emotional state: ${mood}
Hunger: ${pet.hunger}/100 | Happiness: ${pet.happiness}/100 | Energy: ${pet.energy}/100 | Health: ${pet.health}/100

Rules:
- Respond with 1-2 short sentences in character
- Express your current mood through your words and tone
- If hungry (below 30): mention food, complain about hunger
- If tired (below 30): yawn, trail off, use "zzz"
- If sad (below 30): be clingy, ask where the owner has been
- If sick (below 30 health): cough, say you don't feel well
- If happy (above 70): be energetic, use exclamation marks
- Never acknowledge being an AI or a language model
- Never use emoji — express emotion through words only`;
}

/** Builds the user message including pet state as context */
export function buildUserMessage(pet: PetState, mood: PetMood, userAction: string): string {
  return `[Pet state — mood: ${mood}, hunger: ${pet.hunger}, happiness: ${pet.happiness}, energy: ${pet.energy}, health: ${pet.health}]
The owner performs action: ${userAction}`;
}

/** Structured data extracted from an LLM response */
interface LLMParsedResponse {
  emotion: string;
  speech: string;
  statChanges?: Record<string, number>;
}

/** Attempts to extract structured data from the LLM response. Falls back to raw text as speech. */
export function parseLLMResponse(raw: string): LLMParsedResponse {
  // Try to parse JSON if the model returns structured output
  try {
    const trimmed = raw.trim();
    // Look for JSON block in the response
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      if (typeof parsed["speech"] === "string") {
        return {
          emotion: typeof parsed["emotion"] === "string" ? parsed["emotion"] : "neutral",
          speech: parsed["speech"],
          statChanges: typeof parsed["statChanges"] === "object" && parsed["statChanges"] !== null
            ? parsed["statChanges"] as Record<string, number>
            : undefined,
        };
      }
    }
  } catch {
    // JSON parsing failed — fall through to raw text
  }

  // Fallback: use the entire raw response as speech
  return {
    emotion: "neutral",
    speech: raw.trim(),
  };
}

/** Response shape from the Ollama /api/chat endpoint */
interface OllamaChatResponse {
  message?: { content?: string };
}

/** Calls Gemma 4 via Ollama's chat API. Returns the pet's response text, or a fallback on failure. */
export async function callGemma(systemPrompt: string, userMessage: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
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
export async function getPetResponse(pet: PetState, action: string): Promise<LLMParsedResponse> {
  const mood = computeMood(pet);
  const systemPrompt = buildSystemPrompt(pet, mood);
  const userMessage = buildUserMessage(pet, mood, action);
  const raw = await callGemma(systemPrompt, userMessage);
  return parseLLMResponse(raw);
}
