/**
 * Two-tier pet memory:
 *   • shortTerm — rolling buffer of the last 5 conversation exchanges,
 *     replayed verbatim into the system prompt.
 *   • longTerm  — summarized "things I remember about my owner". When
 *     this list exceeds 20 entries, `consolidateMemories` asks the LLM
 *     to compress the oldest 10 down to 3 sentences.
 *
 * Memory survives across save/load via `storage.ts`.
 */

/** LLM generate function signature for memory consolidation */
export type LLMGenerateFn = (systemPrompt: string, userMessage: string) => Promise<string>;

/** A single conversation exchange */
export interface Exchange {
  userMessage: string;
  petResponse: string;
}

/** Two-tier memory system for the pet */
export interface PetMemory {
  /** Last N conversation exchanges (rolling buffer) */
  shortTerm: Exchange[];
  /** Summarized memories the pet wants to keep */
  longTerm: string[];
}

/** Maximum number of short-term exchanges to keep */
const SHORT_TERM_LIMIT = 5;

/** Maximum number of long-term memories before consolidation */
const LONG_TERM_LIMIT = 20;

/** Number of oldest memories to consolidate */
const CONSOLIDATE_COUNT = 10;

/** Number of condensed memories after consolidation */
const CONDENSED_COUNT = 3;

/** Creates an empty PetMemory */
export function createMemory(): PetMemory {
  return {
    shortTerm: [],
    longTerm: [],
  };
}

/** Adds a conversation exchange to short-term memory, evicting the oldest if full */
export function addExchange(memory: PetMemory, userMessage: string, petResponse: string): void {
  memory.shortTerm.push({ userMessage, petResponse });
  if (memory.shortTerm.length > SHORT_TERM_LIMIT) {
    memory.shortTerm.shift();
  }
}

/** Adds a memory string to long-term memory */
export function addMemory(memory: PetMemory, memoryString: string): void {
  memory.longTerm.push(memoryString);
}

/** Returns true if long-term memory needs consolidation */
export function needsConsolidation(memory: PetMemory): boolean {
  return memory.longTerm.length > LONG_TERM_LIMIT;
}

/** Triggers LLM-based summarization of the oldest memories when over the limit */
export async function consolidateMemories(memory: PetMemory, callLLM?: LLMGenerateFn): Promise<void> {
  if (!needsConsolidation(memory)) return;

  const oldest = memory.longTerm.slice(0, CONSOLIDATE_COUNT);
  const remaining = memory.longTerm.slice(CONSOLIDATE_COUNT);

  const systemPrompt = `You are a memory consolidation helper. Given a list of memories, summarize them into exactly ${CONDENSED_COUNT} concise memories. Each memory should be one short sentence. Respond with ONLY a JSON array of ${CONDENSED_COUNT} strings, no other text.`;

  const userMessage = `Consolidate these ${oldest.length} memories into ${CONDENSED_COUNT}:\n${oldest.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;

  if (!callLLM) {
    // No LLM available — keep oldest memories as-is
    memory.longTerm = [...oldest.slice(0, CONDENSED_COUNT), ...remaining];
    return;
  }

  const raw = await callLLM(systemPrompt, userMessage);

  let condensed: string[];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as unknown;
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
        condensed = (parsed as string[]).slice(0, CONDENSED_COUNT);
      } else {
        condensed = oldest.slice(0, CONDENSED_COUNT);
      }
    } else {
      condensed = oldest.slice(0, CONDENSED_COUNT);
    }
  } catch {
    // Fallback: keep the first CONDENSED_COUNT oldest memories as-is
    condensed = oldest.slice(0, CONDENSED_COUNT);
  }

  memory.longTerm = [...condensed, ...remaining];
}

/** Formats both memory tiers for inclusion in the system prompt */
export function buildMemoryPrompt(memory: PetMemory): string {
  const sections: string[] = [];

  // Long-term memories
  if (memory.longTerm.length > 0) {
    const lines = memory.longTerm.map((m) => `- ${m}`);
    sections.push(`Things you remember about your owner:\n${lines.join("\n")}`);
  }

  // Short-term conversation history
  if (memory.shortTerm.length > 0) {
    const lines = memory.shortTerm.map(
      (ex) => `Owner: "${ex.userMessage}"\nYou: "${ex.petResponse}"`
    );
    sections.push(`Recent conversation:\n${lines.join("\n")}`);
  }

  return sections.join("\n\n");
}
