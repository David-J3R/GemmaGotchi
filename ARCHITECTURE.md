# Architecture — Tamagotchi Engine

A field guide to the codebase. Read this first; then read the file that
matches the part you want to change.

---

## What this project is

A browser-based AI Tamagotchi. The pet's stats decay in real time, the
player feeds/plays/talks/shows-images, and a local LLM (Ollama running
`gemma4:e2b`) drives the pet's speech, emotion, mood shifts, and
remembered facts. Saves live in the browser's IndexedDB; you can run up
to three pets in parallel slots.

The web app under `tamagotchi-web/` is the entire project. The
repository root only holds this doc and the shared `.gitignore`.

---

## Stack

| Layer | Choice |
| --- | --- |
| UI framework | React 19 + Vite |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| Persistence | `idb-keyval` (IndexedDB key-value) |
| LLM backend | Ollama HTTP API (`gemma4:e2b`, image-capable) |
| Rendering | Canvas 2D for sprites, CSS modules for chrome |
| Tests | Vitest |
| Offline | Service Worker (`public/sw.js`) caches the app shell |

No state library. No router. No CSS framework. Single HTTP dependency
target. Engine code is pure TypeScript (no React imports) so it stays
unit-testable and portable.

---

## Directory map

```
tamagotchi-engine/
├── ARCHITECTURE.md              ← you are here
├── .gitignore
└── tamagotchi-web/              ← the app
    ├── index.html               ← Vite entry — points to src/main.tsx
    ├── package.json
    ├── vite.config.ts
    ├── public/                  ← static assets served at /
    │   ├── favicon.svg
    │   ├── manifest.json        ← PWA manifest
    │   └── sw.js                ← Service Worker
    ├── src/
    │   ├── main.tsx             ← React root + SW registration
    │   ├── App.tsx              ← Top-level screen state machine
    │   ├── index.css            ← Pixel-art design tokens (CSS variables)
    │   │
    │   ├── engine/              ← Pure-TS game engine (no React)
    │   │   ├── types.ts         ← PetState, GameEvent, ActionResult, …
    │   │   ├── constants.ts     ← Every magic number in the game
    │   │   ├── state.ts         ← createPet, tick, computeMood
    │   │   ├── actions.ts       ← feed, play, pet, sleep, heal, talk, show
    │   │   ├── events.ts        ← Random ambient + pet-initiated events
    │   │   ├── progression.ts   ← XP, leveling, evolution
    │   │   ├── personality.ts   ← Species templates + prompt builder
    │   │   ├── relationship.ts  ← Trust/bond tracking + prompt builder
    │   │   ├── memory.ts        ← Short/long-term memory + consolidation
    │   │   ├── schema.ts        ← LLM JSON response contract + parser
    │   │   ├── llm.ts           ← Prompt assembly + getPetResponse()
    │   │   └── storage.ts       ← Save/load + applyOfflineTime
    │   │
    │   ├── llm/                 ← LLM backend abstraction
    │   │   ├── LLMProvider.ts   ← Provider interface
    │   │   ├── OllamaProvider.ts← Ollama HTTP implementation
    │   │   ├── LLMContext.tsx   ← React context owning the active provider
    │   │   └── cache.ts         ← Detect cached model weights
    │   │
    │   ├── hooks/
    │   │   ├── useGameEngine.ts ← Engine ↔ React bridge (THE big hook)
    │   │   └── useLLM.ts        ← Read LLMContext
    │   │
    │   ├── screens/             ← Top-level views
    │   │   ├── SlotSelectScreen.tsx
    │   │   ├── CreatePetScreen.tsx   ← name → species → meet wizard
    │   │   └── GameScreen.tsx        ← Main play view
    │   │
    │   ├── components/          ← Reusable UI pieces
    │   │   ├── DeviceFrame.tsx       ← Tamagotchi-shaped chrome
    │   │   ├── PetViewport.tsx       ← Canvas sprite host
    │   │   ├── LCDStats.tsx          ← Hunger/Happy/Energy/Health bars
    │   │   ├── SpeechBubble.tsx      ← Pet/User/Typing bubbles
    │   │   ├── BootScreen.tsx        ← First-load progress overlay
    │   │   ├── SettingsOverlay.tsx   ← Provider switcher, save export
    │   │   ├── SlotCard.tsx          ← Slot tile on the picker
    │   │   ├── StatusLED.tsx         ← Provider status dot
    │   │   ├── HardwareButton.tsx    ← Plastic-button styled action
    │   │   ├── SegmentedBar.tsx      ← Pixel meter (shared widget)
    │   │   ├── StatIcon.tsx          ← Small pixel stat glyphs
    │   │   ├── MoodIcon.tsx          ← Mood emoji-equivalent
    │   │   └── ErrorBoundary.tsx
    │   │
    │   └── sprites/
    │       ├── SpriteData.ts         ← Per-species pixel grids + animations
    │       └── SpriteRenderer.ts     ← Canvas renderer + particle FX
    │
    ├── tests/                    ← Vitest tests (mirrors src/ layout)
    │   └── llm/cache.test.ts
    │
    └── docs/superpowers/         ← Design docs for the pixel UI redesign
        ├── specs/
        ├── plans/
        └── audits/               ← Before/after screenshots
```

---

## Data flow at a glance

```
              ┌─────────────────────────────────────────┐
              │                App.tsx                  │
              │  (slots ↔ create ↔ game state machine)  │
              └─────────────────────────────────────────┘
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
       SlotSelectScreen  CreatePetScreen   GameScreen
                              │                │
                              ▼                ▼
                        ┌───────────────────────┐
                        │   useGameEngine       │  ← React glue
                        │  (timers + LLM glue)  │
                        └───────────────────────┘
                              │             │
                              ▼             ▼
                       engine/* (pure)  llm/LLMContext
                          │ │ │              │
                          │ │ └─ storage.ts ─→ IndexedDB
                          │ └─── llm.ts ─────→ generate()  ← OllamaProvider
                          └───── state/actions/events/…
```

---

## The two layers

### 1. Engine (`src/engine/`) — pure TypeScript

No React, no DOM, no `idb-keyval` outside `storage.ts`. The engine is a
synchronous library that mutates a `PetState` object. You can call it
from a Node script, a worker, or a UI.

Mental model:
- `PetState` is the world.
- `tick(pet)` advances time once.
- `performAction(pet, name)` is a player input.
- `rollRandomEvents(pet)` and `rollPetInitiatedEvent(pet)` add flavor.
- `getPetResponse(generate, pet, action)` asks the LLM what to say.

Every tunable number lives in `constants.ts` — no magic numbers
elsewhere. Don't add a literal threshold inside an engine file; declare
it in `constants.ts` and import it.

### 2. UI (`src/App.tsx`, `screens/`, `components/`, `hooks/`) — React

The UI never mutates `PetState` directly; it always goes through
`useGameEngine`. The hook owns:
- The active pet ref (synchronous reads inside the tick).
- The setInterval for `tick()` (`TICK_INTERVAL_MS`, 10s).
- The setInterval for auto-save (`AUTO_SAVE_INTERVAL_MS`, 60s).
- An `interactedRef` flag the relationship system reads each tick.
- LLM-routed action plumbing: call → mood shift → memory → events log.

LLM provider state (which backend, ready/loading/error) is owned by
`LLMContext` and consumed via `useLLM()`.

---

## Lifecycle of one play session

1. **Boot** — `main.tsx` mounts `<App>`, registers the SW (prod only).
2. **Provider init** — `LLMContextProvider` checks Ollama availability;
   if cold (no cached model) `App.tsx` shows the `<BootScreen>`.
3. **Slot pick** — `SlotSelectScreen` lists IndexedDB slots; user picks.
4. **Hydrate** — `useGameEngine.loadSlot` reads the save and runs
   `applyOfflineTime` to fast-forward stats based on real-world elapsed
   time (capped at 24 h, decayed at half rate, health floored).
5. **Play loop** — every 10 s `tick()` decays stats, may auto-sleep or
   wake, may emit ambient events. `updateRelationship` runs each tick.
6. **Action** — UI calls `doAction("feed")` → engine returns
   `ActionResult` → if `needsLLM`, hook calls `getPetResponse`, applies
   `moodShift`, stores the exchange, and pushes the response into the
   activity log. XP/level/evolution checks run after each action.
7. **Save** — every 60 s + on `beforeunload` + on hook unmount.

---

## Lifecycle of one LLM call

```
useGameEngine.doAction("talk")  or  .talkToPet(msg, image?)
        │
        ▼
performAction(pet, "talk")  →  ActionResult{needsLLM:true, llmContext:…}
        │
        ▼
getPetResponse(generate, pet, action, image?)
        │
        ├─ buildSystemPrompt(pet, mood)
        │     └─ buildPersonalityPrompt + buildRelationshipPrompt
        │        + buildMemoryPrompt + RESPONSE_FORMAT_INSTRUCTION
        ├─ buildUserMessage(pet, mood, action)   (plus image instr.)
        ├─ generate(systemPrompt, userMessage, imageBase64?)
        │     └─ OllamaProvider.generate()  →  POST /api/chat
        └─ parseResponse(raw)  →  PetResponse{speech, emotion, …}
        │
        ▼
back in useGameEngine:
  applyStatChanges(pet, response.moodShift)
  addExchange(memory, action/msg, response.speech)
  if (response.memory) addMemory + maybe consolidateMemories
  events.push({ type: "llm_response", message: … })
  syncPet()
```

---

## Save format

Each slot stores one JSON-stringified `SaveData`:

```ts
{
  _meta: { version, savedAt, engineVersion },
  pet: PetState  // fully serializable
}
```

`storage.fillDefaults` makes loads tolerant to schema growth — older
saves missing newer fields get defaulted. Bump `SAVE_VERSION` in
`constants.ts` if you make a breaking change and want to migrate.

---

## "If I want to change X, look at Y"

| Goal | File |
| --- | --- |
| Tune any number (decay, threshold, probability, timer) | `engine/constants.ts` |
| Add a new player action | `engine/actions.ts` (+ wire button in `DeviceFrame`/`GameScreen`) |
| Add a new ambient event | `engine/events.ts` (`RANDOM_EVENTS` array) |
| Add a new species | `engine/personality.ts` (`SPECIES_TEMPLATES`) and `sprites/SpriteData.ts` |
| Add a new pet emotion or action type | `engine/schema.ts` (`PetEmotion` / `PetActionType`) |
| Change how the system prompt reads | `engine/llm.ts` + `personality/relationship/memory.ts` |
| Change save schema | `engine/types.ts` + bump `SAVE_VERSION`; add migration in `storage.ts` |
| Change save backend | `engine/storage.ts` (currently `idb-keyval`) |
| Add another LLM backend | implement `LLMProvider` in `src/llm/`, register in `LLMContext` |
| Tune Ollama model / URL | `src/llm/OllamaProvider.ts` (defaults), runtime via `SettingsOverlay` |
| Change the device chrome / layout | `components/DeviceFrame.tsx` + `*.module.css` |
| Change the pet sprite or animation | `sprites/SpriteData.ts` and `sprites/SpriteRenderer.ts` |
| Change pixel design tokens | `src/index.css` (CSS variables) |

---

## Running it

```bash
cd tamagotchi-web
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm test         # vitest run
```

You'll need Ollama running locally on port 11434 with `gemma4:e2b`
pulled — otherwise the BootScreen will show an "Ollama unreachable"
error and the chat falls back to a stub response.

---

## Conventions

- **Magic numbers**: forbidden outside `engine/constants.ts`.
- **Engine purity**: no React, no DOM, no globals (other than `Date.now`
  / `Math.random`) inside `engine/` so it stays unit-testable.
- **Mutation**: engine functions mutate `PetState` in place; the React
  hook calls `syncPet()` to copy into state and trigger a render.
- **Failures**: LLM `generate` failures degrade gracefully via
  `fallbackGenerate` + `runtimeError` surfaced through `useLLM`.
- **Strict TS**: `strict: true` and `noUncheckedIndexedAccess` are on.
  Index a tuple element? You get `T | undefined`. Live with it.
