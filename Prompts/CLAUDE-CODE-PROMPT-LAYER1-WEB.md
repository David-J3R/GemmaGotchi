# AI Tamagotchi — Layer 1: Web App (WebGPU + Ollama Hybrid)

## Context

I have a fully working terminal-based Tamagotchi game engine in TypeScript:
- Layer 2: Game engine (state machine, event router, actions, tick system, progression)
- Layer 3: AI brain (personality engine, structured output via Gemma 4, conversation memory, image input, relationship system)
- Layer 4: Persistence (JSON save/load, 3 save slots, offline time, pet creation flow)

I tried building a React Native app but ran into too many native build errors. Pivoting to a web app using WebGPU for in-browser Gemma 4 inference, with Ollama as a fallback.

## What already exists

The game engine lives in `tamagotchi-engine/src/` with these modules:
- `types.ts` — All interfaces (PetState, PetPersonality, PetMemory, Relationship, PetResponse, etc.)
- `constants.ts` — All magic numbers
- `state.ts` — createPet, computeMood, tick, applyStatChanges
- `actions.ts` — performAction (feed, play, pet, sleep, heal, talk, show)
- `events.ts` — Random event definitions and roller
- `llm.ts` — Ollama bridge (buildSystemPrompt, callGemma, image support)
- `personality.ts` — Personality generation and prompt building
- `memory.ts` — Short-term + long-term memory management
- `progression.ts` — XP, levels, evolution
- `relationship.ts` — Trust, bond levels
- `schema.ts` — PetResponse parser
- `storage.ts` — Save/load, multi-slot, offline time

**CRITICAL**: Read ALL engine files before writing any code. The engine is the source of truth. The UI layer calls into these modules — it does NOT reimplement game logic.

## Tech stack

- **Vite** + **React** + **TypeScript** (scaffolded with `npm create vite@latest`)
- **@huggingface/transformers** (v4) for in-browser Gemma 4 via WebGPU
- **ONNX model**: `onnx-community/gemma-4-E2B-it-ONNX` (q4f16 quantization, ~500MB)
- **IndexedDB** (via `idb-keyval` or raw API) for persistence (replaces Node fs)
- **HTML Canvas** for pixel art sprite rendering
- **Web Audio API** for optional sound effects
- **No UI framework beyond React** — build all components from scratch with CSS modules

## Subtasks

Work through these IN ORDER. Commit after each.

---

### Subtask 1: Project Scaffold + Engine Integration

**Goal**: Create the Vite project and integrate the existing game engine.

**Steps**:

1. Create the project:
```bash
npm create vite@latest tamagotchi-web -- --template react-ts
cd tamagotchi-web
npm install
npm install @huggingface/transformers idb-keyval
```

2. Copy the game engine:
- Copy all `tamagotchi-engine/src/` files into `tamagotchi-web/src/engine/`
- **Adapt `storage.ts`**: Replace Node's `fs/promises` and file paths with IndexedDB via `idb-keyval`:
  - `savePet(pet, slot)` → `set('slot-' + slot, JSON.stringify(pet))`
  - `loadPet(slot)` → `get('slot-' + slot)` then parse
  - `deleteSave(slot)` → `del('slot-' + slot)`
  - `listSaveSlots()` → `keys()` filtered by 'slot-' prefix
  - Keep the `_meta` field, offline time computation, and validation logic
  - Atomic writes aren't needed (IndexedDB is transactional by nature)
- **Adapt `llm.ts`**: Keep the Ollama fetch path as-is. We'll add the WebGPU path in Subtask 3.
- **Remove**: `display.ts` and `game.ts` (UI layer replaces these)
- **Remove**: Any `readline`, `process.stdin`, `process.exit`, `SIGINT` handler references
- **Remove**: Any `import * as fs from 'fs/promises'` or `import * as path from 'path'`
- **Keep**: Everything else unchanged

3. Create the engine hook — `src/hooks/useGameEngine.ts`:
- Manages `PetState` in React state via `useState`
- Runs the tick timer via `useEffect` + `setInterval`
- Exposes: `pet`, `mood`, `performAction(name)`, `talkToPet(message)`, `showImage(file)`, `events[]`, `isLoading`
- Handles auto-save via the adapted storage module
- On mount: loads save or signals that creation flow is needed
- On unmount / `beforeunload`: saves state
- Uses `useRef` for the interval to avoid stale closures

4. Set up routing (use simple React state, no router library needed):
- 3 screens: `SlotSelect`, `CreatePet`, `GameScreen`
- `App.tsx` manages which screen is shown via a `screen` state variable

**Acceptance criteria**:
- `npm run dev` launches at localhost:5173 without errors
- Console shows the engine ticking and decaying stats
- A simple placeholder UI shows the pet's name and hunger value
- `performAction("feed")` updates the displayed hunger
- Save/load works via IndexedDB (refresh the page, pet persists)

---

### Subtask 2: Pixel Art Sprite System (Canvas-based)

**Goal**: Render the pet as pixel art on an HTML Canvas.

**Create these files**:
- `src/sprites/SpriteData.ts` — Pixel art data for each species and animation
- `src/sprites/SpriteRenderer.ts` — Canvas rendering engine
- `src/components/PetViewport.tsx` — React component wrapping the canvas

**Sprite data format**:

Define sprites as 2D arrays of hex color strings (or null for transparent). Each sprite is 32x32 pixels, rendered at a configurable scale (e.g., 4x = 128x128 on screen).

```typescript
// Example: one frame of the slime creature idle animation
const SLIME_IDLE_1: SpriteFrame = {
  width: 32,
  height: 32,
  pixels: [
    // Row 0: 32 values, null = transparent, string = hex color
    [null, null, null, ..., "#7BC67E", "#7BC67E", ..., null, null],
    // ... 31 more rows
  ]
};
```

**Species to implement** (keep them simple, 8-12 colors max per species):

1. **Slime creature**: Round green blob
   - Idle: gentle squish (2 frames, height alternates ±1 pixel)
   - Happy: wider body, dot eyes become arcs
   - Sad: flattened, droopy
   - Eating: mouth opens
   - Sleeping: eyes closed, small "z" pixels floating above

2. **Shadow cat**: Dark sitting cat
   - Idle: tail sways (3 frames)
   - Happy: ears up, eyes wide
   - Sad: ears flat, curled posture
   - Eating: head lowered
   - Sleeping: circular curl

Design at least these two species with idle, happy, sad, eating, and sleeping animations. Each animation is 2-3 frames.

**SpriteRenderer class**:
```typescript
class SpriteRenderer {
  constructor(canvas: HTMLCanvasElement, pixelScale: number);
  setAnimation(species: string, animationName: string): void;
  playOnce(species: string, animationName: string, onComplete: () => void): void;
  update(deltaTime: number): void;  // call in requestAnimationFrame
  render(): void;
  setParticles(type: "zzz" | "hearts" | "notes" | "sparkle" | null): void;
}
```

- Runs at 4 FPS for pixel art feel (configurable)
- Particles float above the sprite (simple pixel shapes that drift upward and fade)
- Background: soft gradient that shifts based on time of day (morning=warm peach, day=sky blue, evening=orange, night=deep blue)
- The canvas clears and redraws each frame

**PetViewport component**:
- Creates a `<canvas>` element sized to fill its container
- Instantiates `SpriteRenderer` in a `useEffect`
- Runs `requestAnimationFrame` loop for smooth rendering
- Accepts props: `species`, `mood`, `isSleeping`, `isEating`, `particleType`
- Cleans up animation frame on unmount

**Acceptance criteria**:
- The pet sprite renders on the canvas at the correct scale
- Sprite animates continuously (squish/sway for idle)
- Changing mood via the engine changes the displayed animation
- Sleeping shows closed-eye sprite + floating "z" particles
- Background gradient matches current time of day
- Canvas resizes properly with the window

---

### Subtask 3: Hybrid LLM Provider (WebGPU + Ollama)

**Goal**: Run Gemma 4 E2B directly in the browser via WebGPU, with automatic Ollama fallback.

**Create these files**:
- `src/llm/LLMProvider.ts` — Unified interface for both backends
- `src/llm/WebGPUProvider.ts` — Transformers.js + WebGPU implementation
- `src/llm/OllamaProvider.ts` — Existing Ollama fetch logic (extracted from engine)
- `src/llm/ModelLoader.tsx` — React component for download progress UI
- `src/hooks/useLLM.ts` — React hook managing the active provider

**LLMProvider interface**:
```typescript
interface LLMProvider {
  name: "webgpu" | "ollama";
  isAvailable(): Promise<boolean>;
  initialize(): Promise<void>;
  generate(systemPrompt: string, userMessage: string, image?: string): Promise<string>;
  getLoadProgress(): { status: string; percent: number } | null;
  dispose(): void;
}
```

**WebGPUProvider** (`src/llm/WebGPUProvider.ts`):

```typescript
import { pipeline, TextGenerationPipeline } from "@huggingface/transformers";
```

- On `initialize()`:
  - Check if WebGPU is available: `navigator.gpu !== undefined`
  - Load the model: `pipeline("text-generation", "onnx-community/gemma-4-E2B-it-ONNX", { dtype: "q4f16", device: "webgpu" })`
  - Track download progress via the `progress_callback` option
  - Cache the pipeline instance for reuse
- On `generate()`:
  - Format messages using Gemma 4 chat template with system + user roles
  - Call the pipeline with `max_new_tokens: 256`, `temperature: 0.8`, `top_p: 0.95`, `do_sample: true`
  - Return the generated text
- On `dispose()`: release the pipeline
- Report loading progress as: "Downloading model (X%)" → "Loading into GPU" → "Ready"

**OllamaProvider** (`src/llm/OllamaProvider.ts`):
- Extract the existing `callGemma` logic from `engine/llm.ts` into this class
- `isAvailable()`: try `fetch(baseUrl + '/api/tags')` with a 3-second timeout
- `initialize()`: just verify connectivity
- `generate()`: POST to `/api/chat` as before
- Accept a configurable base URL (default: `http://localhost:11434`)

**useLLM hook** (`src/hooks/useLLM.ts`):
```typescript
function useLLM() {
  // Returns: { provider, isReady, loadProgress, generate, switchProvider, error }
}
```

**Provider selection logic** (runs on mount):
1. Check if WebGPU is available in this browser
2. If yes → use WebGPUProvider, start model download
3. If no → check if Ollama is reachable
4. If yes → use OllamaProvider
5. If neither → show error with instructions

User can manually switch between providers in settings.

**ModelLoader component** (`src/llm/ModelLoader.tsx`):
- Shows during WebGPU model download
- Displays: model name, download progress bar, estimated size (~500MB)
- Once loaded: "Gemma 4 is ready! Running entirely in your browser."
- On error: "WebGPU failed. Falling back to Ollama..." then auto-switches
- The model is cached by the browser after first download (transformers.js uses Cache API)

**Update `src/hooks/useGameEngine.ts`**:
- Accept the `generate` function from `useLLM` instead of calling `engine/llm.ts` directly
- When an action has `needsLLM: true`, call the active provider's `generate()`
- Pass the system prompt and user message built by the engine's existing `buildSystemPrompt` and `buildUserMessage`

**Acceptance criteria**:
- On Chrome with WebGPU: model downloads, progress shows, inference works in-browser
- On a browser without WebGPU: automatically falls back to Ollama
- If neither is available: clear error message with instructions
- Switching providers in settings works without restarting
- Model download is cached — second visit loads instantly
- Response quality from WebGPU matches Ollama responses
- Loading/thinking states shown during inference

---

### Subtask 4: Main Game Screen

**Goal**: Build the primary pet interaction screen with stats, speech, and action buttons.

**Create these files**:
- `src/components/DeviceFrame.tsx` + `DeviceFrame.module.css`
- `src/components/StatsBar.tsx` + `StatsBar.module.css`
- `src/components/ActionButtons.tsx` + `ActionButtons.module.css`
- `src/components/SpeechBubble.tsx` + `SpeechBubble.module.css`
- `src/components/MoodIndicator.tsx`
- `src/screens/GameScreen.tsx`

**Visual design — pixel art Tamagotchi aesthetic**:

Load a pixel font via Google Fonts. Add to `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap" rel="stylesheet">
```

**Color palette** (CSS custom properties in `:root`):
```css
:root {
  --device-shell: #E8D5B7;
  --device-shell-dark: #C9B396;
  --screen-bg: #C4CFA1;
  --screen-bg-night: #2A2A4A;
  --button-face: #D4A574;
  --button-pressed: #B8895A;
  --button-disabled: #C0B8A8;
  --stat-green: #5B8C3E;
  --stat-yellow: #C4A020;
  --stat-red: #A03030;
  --text-primary: #2A2A2A;
  --text-pixel: #1A1A2E;
  --bubble-bg: #FFFFF0;
  --bubble-user: #A8C8E8;
  --bubble-pet: #F0E8D0;
}
```

**DeviceFrame**:
- A centered container (max-width 400px) styled to look like a physical Tamagotchi device
- Rounded corners, warm beige background, subtle border that simulates plastic
- Inner "screen" area with inset shadow effect
- The PetViewport canvas sits inside this screen area
- Below the screen: stats bar and action buttons
- Responsive: scales down on mobile viewports

**StatsBar**:
- 4 stats in a horizontal row: hunger, happiness, energy, health
- Each stat: a small pixel icon (drawn with CSS box-shadow pixel art or inline SVG) + a row of 5 small squares
- Squares fill from left to right based on percentage: 0-20% = 1 filled, 21-40% = 2, etc.
- Color: green above 60%, yellow 30-60%, red below 30%
- Below stats: XP bar as a thin pixel-styled progress bar + level number
- Bond level shown as a small heart icon with level number

**ActionButtons**:
- 2 rows × 3 columns of chunky buttons
- Row 1: Feed, Play, Talk
- Row 2: Pet, Sleep, More
- Styled as raised pixel-art buttons: solid color, 2px dark border on bottom/right (3D effect)
- On click: button visually "presses" (border shifts)
- Disabled state: grayed out, no hover effect
- "More" opens a dropdown/overlay with: Heal, Show Photo, Status, Settings, Switch Pet
- Each button has a label in pixel font

**SpeechBubble**:
- Positioned above the pet viewport
- Pixel-art styled: white background, 2px stepped border (not smooth rounded — use rectangular steps to simulate pixel corners)
- Small triangle pointer at the bottom
- Text types in character-by-character (typewriter effect, 30ms per char)
- Shows `innerThought` below in smaller, italic, slightly transparent text
- Auto-dismisses after 6 seconds or on click
- Queue: if multiple messages arrive, show sequentially

**MoodIndicator**:
- Small pill in the top corner of the pet viewport
- Shows mood text in pixel font
- Background color matches mood

**GameScreen composition**:
```tsx
<div className={styles.gameScreen}>
  <DeviceFrame>
    <div className={styles.screenArea}>
      <MoodIndicator mood={mood} />
      <SpeechBubble message={speech} thought={thought} />
      <PetViewport species={pet.species} mood={mood} isSleeping={pet.isSleeping} />
    </div>
    <StatsBar pet={pet} />
    <ActionButtons onAction={handleAction} pet={pet} isThinking={isThinking} />
  </DeviceFrame>
</div>
```

**Wiring actions**:
- Each button calls `performAction` via the engine hook
- Deterministic actions: immediate stat bar update + speech bubble with feedback
- LLM actions (`talk`, `show`): show "thinking..." in speech bubble → call provider → display response
- Disable all buttons during LLM calls (`isThinking` state)

**Acceptance criteria**:
- The game screen renders with a pixel art Tamagotchi look
- Pet sprite animates inside the screen area
- Stat bars update in real time as stats decay
- Tapping Feed updates hunger bar + shows eating animation + speech bubble
- Tapping Talk shows thinking state → Gemma 4 response in speech bubble
- Speech bubble has working typewriter effect
- Buttons are disabled during LLM calls and when actions aren't valid
- The whole thing feels like a virtual Tamagotchi device in the browser

---

### Subtask 5: Pet Creation + Slot Selection Screens

**Goal**: Build onboarding and save management.

**Create these files**:
- `src/screens/SlotSelectScreen.tsx` + CSS module
- `src/screens/CreatePetScreen.tsx` + CSS module
- `src/components/SlotCard.tsx`
- `src/components/SpeciesSelector.tsx`

**SlotSelectScreen**:
- Title: "Your Pets" in pixel font, centered
- 3 slot cards stacked vertically (or in a row on wide screens)
- Occupied slots show: small pet sprite preview (static frame), pet name, species, level, last played (relative time like "2 hours ago")
- Empty slots: dashed border, "+" icon, "New Pet" label
- Click occupied → load pet → navigate to GameScreen
- Click empty → navigate to CreatePetScreen
- Right-click or long-press on occupied → "Delete this pet?" confirmation dialog

**CreatePetScreen**:
- Step 1: "Name your pet" — styled input with blinking pixel cursor, pixel font
- Step 2: "Choose a species" — grid of species cards, each showing:
  - Animated sprite preview (small canvas)
  - Species name
  - Short description ("playful, affectionate, loves food")
  - Trait bars: small horizontal bars for playfulness, curiosity, affection, sass, energy
  - Selected card gets a highlighted border
- Step 3: "Meet your new pet!" — large animated sprite, generated personality description, "Hatch!" button
- Transitions: simple fade or slide between steps
- Back button on steps 2 and 3

**Acceptance criteria**:
- First visit shows slot select with 3 empty slots
- Creating a pet walks through all 3 steps
- Species cards show animated sprite previews
- After creation, pet is saved to IndexedDB and game screen loads
- Refreshing the page shows the pet in the slot list
- Can create up to 3 pets
- Can delete a pet from slot selection

---

### Subtask 6: Chat Interface

**Goal**: Full conversation screen for talking with the pet.

**Create these files**:
- `src/components/ChatOverlay.tsx` + CSS module
- `src/components/ChatBubble.tsx`
- `src/components/TypingIndicator.tsx`

**ChatOverlay**:
- Slides up from the bottom when "Talk" is pressed (or can be a full-screen overlay)
- Shows conversation history from `pet.memory.shortTerm`
- Text input at the bottom with a Send button
- Close button (X) at the top-right

**ChatBubble**:
- User messages: right-aligned, colored background (`--bubble-user`)
- Pet messages: left-aligned, pixel-art bubble (`--bubble-pet`), with a tiny sprite avatar (16x16 static frame)
- Pet's `emotion` label shown as a small tag above the bubble
- `innerThought` shown as faded italic text under the pet's message
- Stat change notifications inline: small text like "(happiness +5)" when moodShift is applied
- New messages animate in with a slide-up

**TypingIndicator**:
- Three small pixel squares that bounce sequentially
- Positioned where the next pet message will appear
- Shown while waiting for LLM response

**Integration**:
- Each exchange calls the active LLM provider
- Response is parsed via `schema.ts` into PetResponse
- `moodShift` applied to pet stats immediately
- `memory` field added to long-term memory
- Short-term memory updated with the exchange
- All of this uses the existing engine functions

**Image sharing** (the "Show" action):
- When triggered from the More menu, use `<input type="file" accept="image/*" capture="environment">` to pick/take a photo
- Convert to base64 using FileReader
- Display the image in the chat or in a dedicated view
- Send to LLM with the pet's image reaction prompt
- Show the pet's reaction as a ChatBubble
- If using WebGPU provider: note that transformers.js may or may not support image input for this model. If it doesn't, fall back to Ollama for image inputs, or show a message explaining the limitation.

**Acceptance criteria**:
- Tapping Talk opens the chat overlay
- Can send multiple messages in conversation
- Pet responds via the active LLM provider with typing indicator
- Conversation history persists (visible on reopen)
- Stat changes from conversation reflected on game screen
- Image sharing works (picks file, sends to LLM, shows reaction)
- Closing and reopening chat shows previous messages

---

### Subtask 7: Settings, PWA, and Polish

**Goal**: Make it feel like a complete, installable web app.

**Create these files**:
- `src/components/SettingsOverlay.tsx` + CSS module
- `public/manifest.json` — PWA manifest
- `public/sw.js` — Service worker for offline support

**Settings overlay** (opened from More → Settings):
- **LLM Provider**: toggle between WebGPU and Ollama
  - Show current provider status (loaded/connected/error)
  - If WebGPU: show model size, cache status, GPU info
  - If Ollama: text input for base URL (default `http://localhost:11434`)
  - "Test connection" button for Ollama
- **Pet preferences**: nothing gameplay-affecting, just:
  - Toggle sound effects (if implemented)
  - Toggle time-of-day background
  - Toggle particle effects
- **Data management**:
  - "Export save" — downloads the save data as a JSON file
  - "Import save" — uploads a JSON file to restore
  - "Delete all data" — clears IndexedDB with confirmation
- **About**: Version, credits, link to Gemma 4 and the project

**PWA manifest** (`public/manifest.json`):
```json
{
  "name": "AI Tamagotchi",
  "short_name": "Tamagotchi",
  "description": "A virtual pet powered by Gemma 4 AI, running entirely in your browser",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#E8D5B7",
  "theme_color": "#D4A574",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Generate simple pixel-art icons for the PWA (can be a tiny slime sprite on a beige background).

**Service worker** — basic cache-first strategy:
- Cache the app shell (HTML, CSS, JS bundles) on install
- The ONNX model is already cached by transformers.js via the Cache API
- This makes the app work offline after first load (if using WebGPU)

**Notifications** (Web Notification API):
- On page visibility change (`document.hidden`):
  - When hidden: schedule notifications using `setTimeout` (not real push notifications — those need a server)
    - 1 hour: "{name} is getting hungry..."
    - 3 hours: "{name} misses you!"
  - When visible: clear scheduled notifications, apply offline time, show welcome back
- Request notification permission on first interaction
- Notification text varies by personality

**Polish**:
- Loading screen while WebGPU model downloads (show the pet sprite idle with a progress bar below)
- Smooth transitions between screens (CSS transitions)
- Responsive: works on both desktop and mobile browsers
- Mobile: action buttons should be large enough to tap
- Desktop: keyboard shortcuts (F=feed, P=play, T=talk, S=sleep)
- Error boundary: if anything crashes, show a friendly message with a "reload" button, not a white screen
- Favicon: pixel art slime creature

**Acceptance criteria**:
- Settings panel shows current LLM provider and allows switching
- Can export and import save data
- App is installable as a PWA (Chrome shows "Install" option)
- App works offline after model is cached (WebGPU mode)
- Closing the tab and reopening applies offline time correctly
- Keyboard shortcuts work on desktop
- The app feels complete and polished — no placeholder text or broken layouts

---

## File structure

When done:
```
tamagotchi-web/
├── index.html
├── vite.config.ts
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css                  # Global styles + CSS variables
│   ├── engine/                    # Copied + adapted from tamagotchi-engine
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── state.ts
│   │   ├── actions.ts
│   │   ├── events.ts
│   │   ├── personality.ts
│   │   ├── memory.ts
│   │   ├── progression.ts
│   │   ├── relationship.ts
│   │   ├── schema.ts
│   │   └── storage.ts            # Adapted for IndexedDB
│   ├── llm/
│   │   ├── LLMProvider.ts         # Interface
│   │   ├── WebGPUProvider.ts      # Transformers.js
│   │   ├── OllamaProvider.ts      # Fetch-based
│   │   └── ModelLoader.tsx        # Download progress UI
│   ├── sprites/
│   │   ├── SpriteData.ts          # Pixel art definitions
│   │   └── SpriteRenderer.ts      # Canvas rendering engine
│   ├── hooks/
│   │   ├── useGameEngine.ts       # Main engine hook
│   │   └── useLLM.ts             # LLM provider hook
│   ├── screens/
│   │   ├── SlotSelectScreen.tsx
│   │   ├── CreatePetScreen.tsx
│   │   └── GameScreen.tsx
│   └── components/
│       ├── DeviceFrame.tsx + .module.css
│       ├── PetViewport.tsx
│       ├── StatsBar.tsx + .module.css
│       ├── ActionButtons.tsx + .module.css
│       ├── SpeechBubble.tsx + .module.css
│       ├── MoodIndicator.tsx
│       ├── ChatOverlay.tsx + .module.css
│       ├── ChatBubble.tsx
│       ├── TypingIndicator.tsx
│       ├── SlotCard.tsx
│       ├── SpeciesSelector.tsx
│       └── SettingsOverlay.tsx + .module.css
```

## Rules

- CSS Modules for all component styles (`.module.css` files)
- No UI libraries (no MUI, no Chakra, no Tailwind) — write all CSS by hand
- All game logic stays in `engine/` — components only call hooks
- No game logic in components — they receive data and dispatch actions
- Use `requestAnimationFrame` for canvas animations, not `setInterval`
- Pixel font (`Silkscreen`) for all pet-related text, system font for settings/meta UI
- Handle all loading states (model download, LLM inference, save loading)
- Test in Chrome (WebGPU) and Firefox (Ollama fallback)
- Responsive: test at both 1440px desktop and 390px mobile widths
- Commit after each subtask: `feat(web): subtask N — description`
- If `@huggingface/transformers` has API issues with Gemma 4 specifically, document the error and implement the Ollama-only path first, then revisit WebGPU. Do NOT get stuck — ship a working app with Ollama, then add WebGPU.

## Important fallback rule

WebGPU + transformers.js for Gemma 4 is bleeding edge. If you encounter errors:
1. **First**: check if the model ID or API has changed — search npm for `@huggingface/transformers` latest version
2. **If model loading fails**: try `onnx-community/gemma-4-E2B-it-ONNX` with `dtype: "q4f16"` and `device: "webgpu"`
3. **If WebGPU init fails**: fall back to `device: "wasm"` (slower but wider support)
4. **If all else fails**: ship with Ollama-only and add a note in settings that WebGPU support is experimental
5. **NEVER let WebGPU issues block the entire app** — the Ollama path must always work
