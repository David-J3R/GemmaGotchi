# AI Tamagotchi — Layer 3: AI Brain (Gemma 4 Deep Integration)

## Context

I have a working terminal-based Tamagotchi game engine in TypeScript. Layer 2 is complete:
- State machine with hunger, happiness, energy, health, mood computation
- Event router that decides LLM vs deterministic actions
- Basic Ollama bridge that calls `gemma4:e2b` for `talk` commands
- Progression system with XP, levels, and evolution
- Terminal display with ASCII pet faces

The basic `talk` command works — Gemma 4 responds in character. But the integration is shallow: it's just a plain text prompt/response. Now I need to make the pet's brain **deep and believable**.

## What already exists

```
tamagotchi-engine/
├── main.ts
├── src/
│   ├── types.ts
│   ├── constants.ts
│   ├── state.ts
│   ├── actions.ts
│   ├── events.ts
│   ├── llm.ts              ← this is the main file we'll evolve
│   ├── progression.ts
│   ├── display.ts
│   ├── game.ts
│   └── __tests__/
│       ├── state.test.ts
│       └── actions.test.ts
```

**Important**: Read all existing source files before making changes. Understand the current architecture. Do NOT restructure or rewrite Layer 2 code unless necessary for integration.

## Tech constraints

- Same as before: TypeScript, `npx tsx`, no external npm packages
- Ollama at `http://localhost:11434/api/chat`, model `gemma4:e2b`
- Gemma 4 E2B supports: text, images (base64), system prompts, and structured output
- Ollama API accepts images as base64 in the `images` field of a message
- Keep all LLM calls non-blocking with timeouts (10s max)

## Subtasks

Work through these IN ORDER. Commit after each.

---

### Subtask 1: Personality Engine

**Goal**: Replace the flat system prompt with a layered personality system that makes the pet feel like a real character.

**Create this file**:
- `src/personality.ts` — Personality definition and prompt assembly

**Requirements**:

Create a `PetPersonality` interface:
```typescript
interface PetPersonality {
  // Core traits (fixed at creation, define the pet's character)
  traits: {
    playfulness: number;   // 0-100: how silly vs serious
    curiosity: number;     // 0-100: how eager to explore/ask questions
    affection: number;     // 0-100: how clingy vs independent
    sass: number;          // 0-100: how snarky vs sweet
    energy: number;        // 0-100: how hyper vs chill
  };

  // Preferences (discovered over time)
  likes: string[];         // things the pet has reacted positively to
  dislikes: string[];      // things the pet has reacted negatively to

  // Speech patterns
  speechStyle: {
    vocabulary: "baby" | "casual" | "articulate";  // word complexity
    expressiveness: "minimal" | "moderate" | "dramatic";  // how much emotion shows
    quirks: string[];  // unique speech habits, e.g. ["adds 'nya~' to sentences", "speaks in third person"]
  };
}
```

Create `generatePersonality(species)` that returns a randomized personality seeded by species type. Different species should have different trait distributions:
- "slime creature" → high playfulness, high affection, low sass
- "shadow cat" → high sass, high curiosity, moderate affection
- "cloud puff" → high energy, dramatic expressiveness, baby vocabulary
- Add at least 2 more species with distinct personalities

Create `buildPersonalityPrompt(personality)` that converts the personality struct into natural language instructions for the system prompt. Example output:
```
You are extremely playful (92/100) — you love games, jokes, and being silly.
You are quite curious (78/100) — you ask questions about everything you see.
You are very affectionate (85/100) — you crave attention and get sad when ignored.
You have low sass (20/100) — you're sweet and rarely snarky.

Speech style: You use simple baby-talk vocabulary. You are dramatically expressive.
Quirks: You sometimes speak in third person. You add "bloop" when excited.
```

**Update `src/llm.ts`**:
- `buildSystemPrompt` now takes a `PetPersonality` parameter and incorporates the personality prompt
- The personality prompt goes BEFORE the mood/stats section in the system prompt

**Update `src/types.ts`**:
- Add `personality: PetPersonality` to `PetState`

**Update `src/state.ts`**:
- `createPet` now also generates and stores a personality

**Acceptance criteria**:
- Creating a "slime creature" vs a "shadow cat" produces visibly different personalities
- Talking to the pet, its responses reflect its traits (a high-sass cat is snarky, a high-affection slime is clingy)
- `buildPersonalityPrompt` produces readable, natural language — not raw JSON

---

### Subtask 2: Structured Output via Function Calling

**Goal**: Make Gemma 4 return structured JSON instead of free text, so the game engine can react to the pet's "decisions."

**Create this file**:
- `src/schema.ts` — Response schema definitions and parser

**Requirements**:

Define the expected response schema:
```typescript
interface PetResponse {
  speech: string;          // what the pet says out loud
  emotion: string;         // animation to play: "happy", "excited", "sleepy", "angry", "scared", "love", "confused", "mischievous"
  innerThought?: string;   // optional internal monologue (shown as small italic text)
  action?: {               // optional game state modification
    type: "request_food" | "request_play" | "request_sleep" | "refuse" | "gift" | "trick" | "explore";
    intensity: number;     // 1-10, how urgently
  };
  moodShift?: {            // how this interaction affected the pet emotionally
    happiness?: number;    // -10 to +10
    energy?: number;       // -10 to +10
  };
  memory?: string;         // something the pet wants to remember about this interaction
}
```

Update the system prompt to instruct Gemma 4 to respond ONLY in this JSON format. Add this instruction block:
```
RESPONSE FORMAT: You must respond with ONLY a JSON object, no other text. Schema:
{
  "speech": "what you say out loud (1-2 sentences, in character)",
  "emotion": "one of: happy, excited, sleepy, angry, scared, love, confused, mischievous",
  "innerThought": "optional: your private thought (short, max 10 words)",
  "action": { "type": "request_food|request_play|request_sleep|refuse|gift|trick|explore", "intensity": 1-10 },
  "moodShift": { "happiness": -10 to +10, "energy": -10 to +10 },
  "memory": "optional: something to remember about this moment"
}
Only include optional fields when relevant. Always include speech and emotion.
```

Create `parseResponse(raw: string): PetResponse`:
- Try to extract JSON from the response (handle cases where Gemma wraps it in markdown code blocks)
- Validate all required fields exist
- Clamp numeric values to valid ranges
- If parsing fails completely, return a fallback: `{ speech: raw, emotion: "confused" }`

**Update `src/actions.ts`**:
- When `needsLLM` is true and we get a `PetResponse`, apply `moodShift` to pet stats
- If the pet's `action` is "request_food" with high intensity, show a notification
- Store `memory` (just append to an array on PetState for now)

**Update `src/display.ts`**:
- Show the pet's `innerThought` in parentheses below the speech bubble
- Show the `emotion` label next to the pet's face

**Acceptance criteria**:
- Typing "talk" now returns structured JSON from Gemma 4, parsed into a PetResponse
- The pet's speech is displayed, its emotion updates the face, and mood shifts apply to stats
- If the pet requests food (action.type = "request_food"), a notification appears
- If Gemma returns malformed JSON, the fallback kicks in gracefully — no crashes
- The `memory` field accumulates across interactions (visible via `status` command)

---

### Subtask 3: Conversation Memory

**Goal**: Give the pet short-term and long-term memory so it feels like it knows you.

**Create this file**:
- `src/memory.ts` — Memory management system

**Requirements**:

Implement two memory tiers:

**Short-term memory** (recent context):
- Store the last 5 conversation exchanges (user message + pet response)
- Include these in the prompt as conversation history
- Auto-evict oldest when buffer is full

**Long-term memory** (summarized):
- Store the `memory` strings returned by Gemma 4 from Subtask 2
- Maximum 20 memories
- When full, ask Gemma 4 to summarize the oldest 10 into 3 condensed memories (a "memory consolidation" call)
- Include long-term memories in the system prompt as "Things you remember"

Create these functions:
- `addExchange(memory, userMessage, petResponse)` — adds to short-term
- `addMemory(memory, memoryString)` — adds to long-term
- `consolidateMemories(memory)` — triggers LLM-based summarization when over limit
- `buildMemoryPrompt(memory)` — formats both tiers for inclusion in the system prompt

Example memory prompt output:
```
Things you remember about your owner:
- They showed you a photo of a dog once, and you got jealous
- They always feed you when you ask nicely
- Their name might be Alex (they mentioned it yesterday)

Recent conversation:
Owner: "How are you feeling today?"
You: "Bloop! Me is hungry... when is food time?"
Owner: "I just fed you!"
You: "...more food? Bloop bloop?"
```

**Update `src/llm.ts`**:
- `buildSystemPrompt` now includes the memory prompt between personality and current stats sections

**Update `src/types.ts`**:
- Add `PetMemory` interface with shortTerm and longTerm arrays
- Add `memory: PetMemory` to `PetState`

**Acceptance criteria**:
- Talk to the pet 6+ times. The 6th exchange should NOT include the 1st in context (eviction works)
- Mention your name in a conversation. In a later conversation, the pet's memory section should reference it
- Type `status` to see the full prompt with memories included
- Memory consolidation doesn't crash when triggered (test by lowering the limit to 5 temporarily)

---

### Subtask 4: Multimodal Input — Image Understanding

**Goal**: Let the user show photos to the pet and get in-character reactions.

**Update these files**:
- `src/llm.ts` — Add image support to Ollama calls
- `src/actions.ts` — Update "show" action
- `src/game.ts` — Handle image file path input

**Requirements**:

Update `callGemma` to accept an optional image parameter:
- Ollama API accepts images as base64 strings in the message's `images` array
- Read image from a local file path, convert to base64
- Support: .jpg, .jpeg, .png

Update the "show" action flow:
1. User types `show`
2. Game prompts: "Enter the path to an image file:"
3. User enters a file path (e.g., `./photos/dog.jpg`)
4. Image is read, converted to base64, sent alongside the text prompt
5. The text prompt tells the pet: "Your owner is showing you a photo. Describe what you see and react in character."
6. Response is parsed as a normal PetResponse (speech, emotion, action, etc.)

Create `loadImageAsBase64(filePath: string): Promise<string | null>`:
- Read the file using `fs/promises`
- Convert to base64
- Return null if file doesn't exist or isn't a valid image extension
- Handle errors gracefully

**Update the system prompt** when an image is included:
```
Your owner is showing you something! Look at the image and react naturally.
- Describe what you see in your own words (as a pet would)
- React emotionally based on your personality
- If you see an animal, decide if you're jealous, curious, or excited
- If you see food, get excited or hungry
- If you see a person, try to figure out who they are to your owner
```

**Acceptance criteria**:
- Typing `show` prompts for a file path
- Providing a valid image path sends it to Gemma 4 and gets a reaction
- Providing an invalid path shows an error message, no crash
- The pet's reaction reflects its personality (a jealous pet reacts differently to seeing another animal than a curious one)
- The response is parsed as structured PetResponse like any other talk interaction

---

### Subtask 5: Emotional Dynamics + Relationship System

**Goal**: Make the pet's emotional responses evolve over time based on how the owner treats it.

**Create this file**:
- `src/relationship.ts` — Owner-pet relationship tracking

**Requirements**:

Create a `Relationship` interface:
```typescript
interface Relationship {
  trust: number;           // 0-100: built by consistent care, lost by neglect
  bondLevel: number;       // 0-5: milestone tiers (stranger → acquaintance → friend → best friend → soulmate → bonded)
  interactionCount: number;
  neglectStreak: number;   // consecutive ticks without interaction
  careStreak: number;      // consecutive interactions without neglect
  lastMoodWhenInteracted: PetMood;
}
```

Create `updateRelationship(rel, pet, interacted)`:
- If interacted: trust += 1-3 (based on pet's current happiness), neglectStreak = 0, careStreak++
- If not interacted this tick: trust -= 0.5, neglectStreak++, careStreak = 0
- Bond level upgrades at trust thresholds: 20, 40, 60, 80, 95
- Bond level unlocks new behaviors:
  - Level 0 (stranger): pet is shy, short responses
  - Level 1 (acquaintance): pet starts using owner's name (if remembered)
  - Level 2 (friend): pet initiates conversations (random events can trigger LLM calls)
  - Level 3 (best friend): pet shares inner thoughts more often
  - Level 4 (soulmate): pet gets separation anxiety if neglected, but recovers faster
  - Level 5 (bonded): pet occasionally gives "gifts" (XP bonuses, stat buffs)

**Update `src/personality.ts`**:
- `buildPersonalityPrompt` now includes relationship context:
```
Relationship with owner: best friend (trust: 78/100)
You've known your owner for 342 interactions. You trust them deeply.
Bond behavior: You freely share your inner thoughts and use their name.
```

**Update `src/events.ts`**:
- At bond level 2+, add random events where the pet initiates conversation (needsLLM = true)
- Example: "Blob tugs at your sleeve and looks up at you expectantly" → triggers an LLM call where the pet starts the conversation

**Update `src/types.ts`**:
- Add `relationship: Relationship` to `PetState`

**Update `src/game.ts`**:
- Call `updateRelationship` on each tick
- Display bond level in the stats HUD

**Acceptance criteria**:
- Bond level starts at 0 (stranger) and increases with interactions
- At bond level 0, the pet's responses are noticeably shorter and shyer
- At bond level 2+, the pet occasionally initiates conversation (you see an LLM-generated message without typing "talk")
- Neglecting the pet for many ticks visibly drops trust
- `status` command shows the current relationship state
- Bond level is visible in the terminal display

---

## Updated system prompt structure

After all subtasks, the full system prompt sent to Gemma 4 should be assembled in this order:

```
1. Identity: "You are {name}, a {species}."
2. Personality: traits, speech style, quirks (from personality.ts)
3. Relationship: bond level, trust, behavioral unlocks (from relationship.ts)
4. Memories: long-term memories + recent conversation history (from memory.ts)
5. Current state: mood, hunger, happiness, energy, health (from state.ts)
6. Situation: what's happening right now (user action, image shown, etc.)
7. Response format: the JSON schema instruction
```

This layered structure means the pet's identity is stable (1-2), its knowledge grows (3-4), its mood fluctuates (5), and each interaction is unique (6).

## Rules

- Same as Layer 2: no external packages, strict TypeScript, no `any`
- Do NOT rewrite Layer 2 files from scratch — extend them
- Every new function gets a JSDoc comment
- New types go in `types.ts`, new constants go in `constants.ts`
- Test personality and memory systems: `src/__tests__/personality.test.ts` and `src/__tests__/memory.test.ts`
- Commit after each subtask: `feat(brain): subtask N — description`
