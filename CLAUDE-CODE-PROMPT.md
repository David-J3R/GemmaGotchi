# AI Tamagotchi — Layer 2: Game Engine

## Context

I'm building a cross-platform Tamagotchi/Pou-style app where a virtual pet's "brain" is powered by Gemma 4 E2B running on-device. The final stack will be React Native + TypeScript, with Ollama for local dev and LiteRT-LM/AICore for mobile deployment.

Right now I need to build **Layer 2: the game engine** — the core logic between the UI and the AI brain. This is a terminal-based TypeScript prototype I can run with `npx tsx` before any UI exists.

I already have Ollama installed with `gemma4:e2b` running at `http://localhost:11434`.

## Architecture

The game engine has 4 key systems that must work together:

```
┌─────────────────────────────────────────────────────┐
│                   GAME ENGINE                       │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  State    │  │  Event   │  │  Progression      │  │
│  │  Machine  │──│  Router  │──│  System           │  │
│  │          │  │          │  │                   │  │
│  └──────────┘  └────┬─────┘  └───────────────────┘  │
│                     │                               │
│              ┌──────┴──────┐                        │
│              │  Ollama     │                        │
│              │  Bridge     │                        │
│              └─────────────┘                        │
└─────────────────────────────────────────────────────┘
```

## Tech constraints

- **Language**: TypeScript, runnable with `npx tsx`
- **Dependencies**: Minimal. Only `readline` (built-in) and `fetch` (built-in Node 18+). No external packages.
- **LLM**: Ollama REST API at `http://localhost:11434/api/chat`
- **Model**: `gemma4:e2b`
- **Architecture pattern**: Each system in its own file, clean imports, no god objects
- **Testing**: Include a test file for the state machine using Node's built-in `node:test`

## Subtasks

Work through these IN ORDER. Complete each one fully, commit, then move to the next. Do NOT skip ahead.

---

### Subtask 1: Project scaffold + Pet State Machine

**Goal**: Create the core data model and state management.

**Create these files**:
- `src/types.ts` — All shared types and interfaces
- `src/state.ts` — Pet state machine (create, update, mood computation)
- `src/constants.ts` — All magic numbers (decay rates, thresholds, XP per level)

**Requirements**:
- `PetState` interface with: name, species, age (ticks), level, xp, hunger (0-100), happiness (0-100), energy (0-100), health (0-100), isAlive, isSleeping, lastInteraction (timestamp)
- `PetMood` type with at least: ecstatic, happy, content, bored, sad, angry, sick, exhausted, starving, critical
- `createPet(name, species)` → returns a new PetState with sensible defaults
- `computeMood(pet)` → derives mood from current stats using priority rules (health critical > starving > exhausted > sad > bored > happy tiers)
- `applyStatChanges(pet, changes)` → mutates pet stats with clamping to 0-100
- `tick(pet)` → called every interval, applies decay, checks neglect penalties, handles sleep recovery, triggers auto-sleep if energy < 10, checks death. Returns array of GameEvent objects describing what happened
- All decay rates and thresholds must be in `constants.ts`, never hardcoded

**Acceptance criteria**:
- A pet created with `createPet("Blob", "slime")` starts with hunger=80, happiness=70, energy=90, health=100
- Calling `tick()` 20 times in a row causes hunger to visibly decrease
- `computeMood()` returns "starving" when hunger < 15
- When hunger AND energy are both below 30, health starts decaying
- When energy < 10, pet auto-sleeps. While sleeping, energy recovers and hunger decays at half rate
- When health reaches 0, isAlive becomes false

**Test file**: `src/__tests__/state.test.ts` using `node:test` — test all the above criteria.

---

### Subtask 2: Event Router + Actions

**Goal**: Build the decision layer that determines what needs the LLM vs what's handled deterministically.

**Create these files**:
- `src/actions.ts` — All user-performable actions
- `src/events.ts` — Random event definitions and roller

**Requirements**:
- `performAction(pet, actionName)` → returns `ActionResult` with: message, events array, needsLLM boolean, and optional llmContext string
- **Deterministic actions** (NO LLM call): feed (+25 hunger, +5 happiness), play (+20 happiness, -15 energy, -8 hunger), pet (+12 happiness), sleep (sets isSleeping), heal (+30 health, -5 happiness)
- **LLM-routed actions**: talk, show (photo) — these set `needsLLM: true` and build an `llmContext` object
- Each action must handle edge cases: can't feed if full (>90), can't play if sleeping or energy <15, can't heal if healthy (>80)
- `rollRandomEvents(pet)` → checks a list of random events, each with a probability per tick and optional stat conditions. Returns events that triggered.
- At least 5 random events: finding a shiny object, stomach growling (if hungry), dancing (if happy), yawning (if tired), seeing a butterfly

**Acceptance criteria**:
- `performAction(pet, "feed")` increases hunger by 25, returns needsLLM=false
- `performAction(sleepingPet, "play")` returns a rejection message, no stat changes
- `performAction(pet, "talk")` returns needsLLM=true with a populated llmContext
- Random events only fire when their conditions are met

**Test file**: `src/__tests__/actions.test.ts`

---

### Subtask 3: Ollama Bridge (Gemma 4 integration)

**Goal**: Wire the LLM-routed actions to actual Gemma 4 calls via Ollama.

**Create this file**:
- `src/llm.ts` — Ollama API integration

**Requirements**:
- `buildSystemPrompt(pet, mood)` → returns the system prompt string defining the pet's personality, current emotional state, and response rules
- `buildUserMessage(pet, mood, userAction)` → returns the user message including pet state as context
- `callGemma(systemPrompt, userMessage)` → makes a POST to `http://localhost:11434/api/chat` with model `gemma4:e2b`, returns the pet's response text
- The system prompt must instruct Gemma to:
  - Respond in character as the pet (1-2 short sentences)
  - Reflect its current mood in tone and word choice
  - If hungry, mention food. If tired, trail off or yawn. If sad, be clingy.
  - Never break character or acknowledge being an AI
- Include a `parseLLMResponse(raw)` function that attempts to extract structured data (emotion, speech, optional stat changes) from the response. Fall back gracefully to just using the raw text as speech if parsing fails.
- Add a timeout (10 seconds) and fallback behavior if Ollama is unreachable

**The system prompt template** (include this exactly):
```
You are {name}, a {species}. You are a virtual pet living on your owner's device.

Your personality: playful, curious, and affectionate with a mischievous streak.

Current emotional state: {mood}
Hunger: {hunger}/100 | Happiness: {happiness}/100 | Energy: {energy}/100 | Health: {health}/100

Rules:
- Respond with 1-2 short sentences in character
- Express your current mood through your words and tone
- If hungry (below 30): mention food, complain about hunger
- If tired (below 30): yawn, trail off, use "zzz"
- If sad (below 30): be clingy, ask where the owner has been
- If sick (below 30 health): cough, say you don't feel well
- If happy (above 70): be energetic, use exclamation marks
- Never acknowledge being an AI or a language model
- Never use emoji — express emotion through words only
```

**Acceptance criteria**:
- With Ollama running, `callGemma(...)` returns a response from Gemma 4
- With Ollama stopped, `callGemma(...)` returns a fallback message within 10 seconds
- The system prompt correctly interpolates all pet stats
- Response feels in-character for the pet's current mood

**NO test file for this one** — it requires a live Ollama instance. Manual testing only.

---

### Subtask 4: Game Loop + Terminal UI

**Goal**: Wire everything together into a playable terminal prototype.

**Create these files**:
- `src/display.ts` — Terminal rendering (ASCII pet, stat bars, command list)
- `src/game.ts` — Main game loop
- `main.ts` — Entry point

**Requirements**:
- The game loop ticks every 10 seconds (configurable via constant)
- Each tick: run `tick(pet)`, run `rollRandomEvents(pet)`, re-render display
- User input is handled asynchronously between ticks via readline
- Display shows: ASCII pet face (changes with mood), stat bars with color (green/yellow/red), pet name + level + age, available commands
- Commands: feed, play, pet, sleep, heal, talk, show, status, quit
- `status` command prints the full LLM context JSON (for debugging)
- `talk` command calls Ollama and displays the pet's response
- Events that happened during a tick are printed as notifications before re-rendering
- The game runs until the pet dies or the user types "quit"

**ASCII pet faces by mood** (use these exactly):
```
ecstatic:  \(^▽^)/
happy:     (◕‿◕)
content:   (・ω・)
bored:     (−_−)
sad:       (╥_╥)
angry:     (Ò﹏Ó)
sick:      (×_×;)
exhausted: (−.−) zzz
starving:  (;﹏;)
critical:  (x_x)
```

**Acceptance criteria**:
- `npx tsx main.ts` launches the game and shows the pet
- Stats visibly decay over time without user input
- Typing "feed" increases hunger and shows feedback
- Typing "talk" calls Gemma 4 via Ollama and displays a response in character
- Pet eventually falls asleep when energy is low, wakes up when rested
- Pet dies if neglected for too long (health reaches 0)

---

### Subtask 5: Progression System

**Goal**: Add XP, leveling, and evolution to make the game engaging.

**Create this file**:
- `src/progression.ts` — XP, levels, evolution

**Requirements**:
- Actions grant XP: feed=5, play=10, pet=3, talk=8, heal=5
- XP threshold per level: `level * 100` (level 1 needs 100 XP, level 2 needs 200, etc.)
- At levels 5, 10, and 20, the pet "evolves" — its species name changes and base stats improve
- Evolution stages (for "slime creature"): "baby slime" → "young slime" → "elder slime" → "slime monarch"
- Each evolution grants: +10 max to all stats decay resistance (slower decay), a milestone event
- `checkEvolution(pet)` → returns evolution event if level threshold crossed, null otherwise
- Wire into the game loop: after XP is granted, check for evolution

**Acceptance criteria**:
- Pet gains XP from interactions
- Pet levels up when XP threshold is met
- At level 5, pet evolves and the display reflects the new species name
- Evolution is announced as a game event

---

## File structure

When done, the project should look like this:
```
tamagotchi-engine/
├── main.ts                    # Entry point
├── src/
│   ├── types.ts               # All interfaces and types
│   ├── constants.ts           # Magic numbers, decay rates, thresholds
│   ├── state.ts               # Pet state machine
│   ├── actions.ts             # User actions + event router
│   ├── events.ts              # Random events
│   ├── llm.ts                 # Ollama/Gemma 4 bridge
│   ├── progression.ts         # XP, levels, evolution
│   ├── display.ts             # Terminal rendering
│   ├── game.ts                # Main game loop
│   └── __tests__/
│       ├── state.test.ts      # State machine tests
│       └── actions.test.ts    # Action/router tests
└── tsconfig.json
```

## Rules

- Use `node:test` for tests, NOT jest or vitest
- No external npm packages — only Node built-ins and `fetch`
- All numbers must come from constants.ts, never hardcoded in logic files
- Every function must have a JSDoc comment explaining what it does
- Use strict TypeScript — no `any` types
- Run tests after each subtask: `npx tsx --test src/__tests__/*.test.ts`
- Commit after each subtask with message format: `feat(engine): subtask N — description`
