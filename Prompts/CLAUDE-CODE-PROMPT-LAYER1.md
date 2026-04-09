# AI Tamagotchi — Layer 1: React Native UI (Pixel Art Edition)

## Context

I have a fully working terminal-based Tamagotchi game engine in TypeScript:
- Layer 2: Game engine (state machine, event router, actions, tick system, progression)
- Layer 3: AI brain (personality engine, structured output via Gemma 4, conversation memory, image input, relationship system)
- Layer 4: Persistence (JSON save/load, 3 save slots, offline time, pet creation flow)

Everything runs with `npx tsx main.ts`. Now I need to wrap it in a React Native app with a pixel art visual style inspired by classic Tamagotchi devices and Pou.

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
- `display.ts` — Terminal rendering (will be replaced)
- `game.ts` — Game loop (will be adapted)

**CRITICAL**: Read ALL these files before writing any React Native code. The engine is the source of truth. The UI layer calls into these modules — it does NOT reimplement game logic.

## Tech stack

- **React Native** via Expo (managed workflow for simplicity)
- **Expo Router** for navigation (file-based routing)
- **React Native Reanimated** for sprite animations
- **expo-image** for optimized image rendering
- **expo-av** for sound effects (optional, low priority)
- **expo-file-system** for persistence (replaces Node fs/promises)
- **expo-image-picker** for the "show" action (camera/gallery)
- **AsyncStorage** for config/preferences
- **No other UI libraries** — build all components from scratch with StyleSheet

## Visual design direction

**Pixel art Tamagotchi aesthetic**:
- Chunky pixel art sprites for the pet (each species has a sprite sheet)
- Muted pastel color palette with a warm tone — think Game Boy Color era
- Rounded screen area that mimics a physical Tamagotchi device frame
- Pixel-style font for pet speech and stats (use a Google Font like "Press Start 2P" or "Silkscreen")
- Smooth background gradient that shifts based on time of day
- Stat bars styled as pixelated hearts/bars, not modern UI sliders
- Subtle CRT/scanline effect overlay on the pet viewport (optional, for nostalgia)

**Screen structure**:
```
┌──────────────────────────┐
│      Device Frame        │
│  ┌────────────────────┐  │
│  │                    │  │
│  │    Pet Viewport    │  │
│  │   (sprite + bg)    │  │
│  │                    │  │
│  │   [speech bubble]  │  │
│  │                    │  │
│  ├────────────────────┤  │
│  │    Stats Bar       │  │
│  │  ♥♥♥♡ 🍖🍖♡ ⚡⚡♡  │  │
│  ├────────────────────┤  │
│  │   Action Buttons   │  │
│  │ [Feed][Play][Talk] │  │
│  │ [Pet][Sleep][More] │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

## Subtasks

Work through these IN ORDER. Commit after each.

---

### Subtask 1: Expo Project Scaffold + Engine Integration

**Goal**: Create the React Native project and wire the existing game engine into it.

**Steps**:

1. Create a new Expo project:
```bash
npx create-expo-app@latest tamagotchi-app --template blank-typescript
cd tamagotchi-app
```

2. Install dependencies:
```bash
npx expo install react-native-reanimated expo-image expo-file-system expo-image-picker @react-native-async-storage/async-storage expo-font
```

3. Copy the game engine:
- Copy all `tamagotchi-engine/src/` files into `tamagotchi-app/engine/`
- **Adapt `storage.ts`**: Replace Node's `fs/promises` with `expo-file-system`. The save directory becomes `FileSystem.documentDirectory + 'tamagotchi/'`
- **Adapt `llm.ts`**: Keep using `fetch` (works the same in React Native). For dev, Ollama runs on `http://localhost:11434` — but on a physical device, use the machine's local IP instead. Add a config constant `LLM_BASE_URL` that can be changed.
- **Remove**: `display.ts` and `game.ts` (the UI layer replaces these)
- **Remove**: `readline` usage from anywhere (no terminal in mobile)

4. Create the engine hook:
- `hooks/useGameEngine.ts` — a React hook that:
  - Manages `PetState` in React state
  - Runs the tick timer via `setInterval`
  - Exposes: `pet`, `mood`, `performAction(name)`, `talkToPet(message)`, `showImage(uri)`, `events[]`
  - Handles auto-save via the adapted storage module
  - On mount: loads save or triggers creation flow
  - On unmount: saves state

5. Set up Expo Router with these routes:
```
app/
├── _layout.tsx        # Root layout with font loading
├── index.tsx          # Slot selection / welcome screen
├── create.tsx         # Pet creation flow
└── pet.tsx            # Main game screen
```

**Acceptance criteria**:
- `npx expo start` launches without errors
- The engine hook loads a saved pet (or shows the welcome screen)
- Tick timer runs and updates React state
- `performAction("feed")` updates the pet's hunger in the UI
- Console.log confirms the engine is ticking and stats are decaying

---

### Subtask 2: Pixel Art Sprite System

**Goal**: Create the pet sprite rendering system with animations.

**Create these files**:
- `components/PetSprite.tsx` — Main sprite component
- `components/SpriteAnimator.tsx` — Frame-by-frame animation engine
- `assets/sprites/` — Placeholder sprite sheets (generated programmatically)

**Requirements**:

Since we don't have real sprite art yet, **generate placeholder pixel art programmatically**:

Create `utils/generateSprite.ts`:
- Generate simple 32x32 pixel art representations for each species and mood
- Use a 2D array of hex colors to define each frame
- Render as a grid of colored `View` components (each "pixel" is a small square)
- This is temporary — real sprite sheets can replace this later without changing the component API

**Species sprite designs** (keep them simple, 8-12 colors max):

Slime Creature: A round blob shape
- idle: gentle bounce (2 frames alternating)
- happy: wider smile, small jump
- sad: deflated, droopy eyes
- eating: mouth open wide
- sleeping: closed eyes, "zzz" particles

Shadow Cat: Sitting cat silhouette
- idle: tail swish (3 frames)
- happy: upright ears, wide eyes
- sad: flat ears, curled up
- eating: head down
- sleeping: curled into a ball

Create at least idle, happy, sad, eating, and sleeping animations for 2 species.

**SpriteAnimator component**:
- Takes: `species`, `mood`, `isSleeping`, `isEating` (boolean flags)
- Cycles through frames at a configurable FPS (default: 4fps for pixel art feel)
- Uses `react-native-reanimated` for smooth frame transitions
- Exposes `playOnce(animation)` for one-shot animations (eating, getting pet, etc.)

**PetSprite component**:
- Wraps SpriteAnimator
- Adds floating particles: "zzz" when sleeping, hearts when being pet, music notes when happy
- Adds a subtle bounce animation to the whole sprite (idle breathing)
- Size: fills the viewport area, centered

**Acceptance criteria**:
- Pet sprite renders on screen with the correct species appearance
- Sprite animates continuously (idle bounce/sway)
- Changing mood changes the sprite animation
- Sleeping pet shows closed eyes + "zzz" particles
- Feeding triggers a one-shot eating animation

---

### Subtask 3: Main Game Screen

**Goal**: Build the primary pet interaction screen with stats, speech, and action buttons.

**Create these files**:
- `components/DeviceFrame.tsx` — The Tamagotchi "shell" wrapper
- `components/StatsBar.tsx` — Pixelated stat display
- `components/ActionButtons.tsx` — Grid of action buttons
- `components/SpeechBubble.tsx` — Pet dialogue display
- `components/MoodIndicator.tsx` — Current mood label + emoji
- `app/pet.tsx` — Main game screen composing everything

**DeviceFrame**:
- A rounded rectangle that mimics a physical Tamagotchi device
- Background color: warm cream/beige (#F5E6D0 or similar)
- Inner "screen" area with a subtle inset shadow
- The pet viewport sits inside this screen area
- Below the screen: stats and buttons

**StatsBar**:
- 4 stat indicators in a row: hunger, happiness, energy, health
- Each stat shown as a row of small pixel hearts or squares (5 total, filled/empty based on percentage)
- Color coding: green (>60%), yellow (30-60%), red (<30%)
- Small pixel icon before each stat row
- Show pet level + XP bar below the stats

**ActionButtons**:
- 2 rows of 3 buttons each:
  - Row 1: Feed, Play, Talk
  - Row 2: Pet, Sleep, More...
- "More..." opens a bottom sheet with: Heal, Show (photo), Status, Switch Pet, Settings
- Buttons styled as chunky pixel-art buttons with press animation (scale down on press)
- Disabled state for invalid actions (can't play while sleeping, etc.)
- Each button has a small pixel icon + label

**SpeechBubble**:
- Appears above the pet when it speaks
- Pixel-art styled bubble (not smooth rounded — use stepped corners)
- Typewriter effect for text (characters appear one by one)
- Shows `innerThought` in smaller italic text below if present
- Auto-dismisses after 5 seconds, or on tap
- Queue system: if multiple messages come in, show them sequentially

**MoodIndicator**:
- Small label in the top-right of the pet viewport
- Shows current mood as text in pixel font
- Color matches mood (green for happy, red for angry, blue for sad, etc.)

**Main game screen layout**:
```typescript
<DeviceFrame>
  <PetViewport>
    <MoodIndicator mood={mood} />
    <SpeechBubble message={lastSpeech} thought={lastThought} />
    <PetSprite species={pet.species} mood={mood} isSleeping={pet.isSleeping} />
  </PetViewport>
  <StatsBar pet={pet} />
  <ActionButtons onAction={handleAction} pet={pet} />
</DeviceFrame>
```

**Wire actions to engine**:
- Tapping "Feed" calls `performAction("feed")` via the hook
- If the action is deterministic, show feedback immediately (stat bars update, speech bubble shows message)
- If the action needs LLM (`talk`, `show`), show a loading state ("thinking...") then display the response
- Disable buttons during LLM calls

**Acceptance criteria**:
- The main screen shows the pet sprite, stats, and action buttons
- Tapping Feed visually updates the hunger bar and triggers eating animation
- Tapping Talk shows "thinking..." then displays Gemma 4's response in a speech bubble
- Stats visibly decay over time without interaction
- Speech bubble has typewriter effect
- Buttons are disabled when actions aren't valid (e.g., Play while sleeping)
- The whole screen feels like a physical Tamagotchi device

---

### Subtask 4: Pet Creation + Slot Selection Screens

**Goal**: Build the onboarding and save slot screens.

**Create these files**:
- `components/PixelInput.tsx` — Styled text input for pet naming
- `components/SpeciesCard.tsx` — Species selection card with preview sprite
- `components/SlotCard.tsx` — Save slot display card
- `app/index.tsx` — Slot selection screen
- `app/create.tsx` — Pet creation flow

**Slot selection screen** (`app/index.tsx`):
- Title: "Your Pets" in pixel font
- 3 slot cards stacked vertically
- Occupied slots show: pet sprite (small), name, species, level, last played time
- Empty slots show: "Empty" with a "+" icon
- Tapping an occupied slot loads that pet → navigates to `pet.tsx`
- Tapping an empty slot → navigates to `create.tsx`
- Long-pressing an occupied slot shows a "Delete?" confirmation

**Pet creation flow** (`app/create.tsx`):
- Step 1: "Name your pet" — pixel-styled text input with blinking cursor
- Step 2: "Choose a species" — horizontal scrollable list of SpeciesCards
- Each SpeciesCard shows: animated sprite preview, species name, short personality description, trait summary (e.g., "Playful ●●●●○  Sassy ●○○○○")
- Step 3: "Meet your pet!" — shows the generated personality in detail, pet sprite animates happily
- "Hatch!" button to confirm and start the game
- Smooth transitions between steps (slide animation)

**Acceptance criteria**:
- First launch shows slot selection with 3 empty slots
- Tapping a slot goes to creation flow
- Can name the pet and select a species
- Species cards show animated sprite previews
- After creation, pet is saved and game screen loads
- Second launch shows the created pet in the slot list
- Can delete a pet with long-press

---

### Subtask 5: Chat Interface for Talk Action

**Goal**: Build a proper chat-style interface for conversations with the pet.

**Create these files**:
- `components/ChatOverlay.tsx` — Full-screen chat modal
- `components/ChatBubble.tsx` — Individual message bubble
- `components/TypingIndicator.tsx` — "Pet is thinking" animation

**Requirements**:

When the user taps "Talk", instead of a single response, open a **chat overlay** that slides up from the bottom:

- Shows recent conversation history (from memory.shortTerm)
- User can type messages in a text input at the bottom
- Each user message triggers an LLM call
- Pet responses appear with typing indicator → speech bubble
- Pet's `emotion` from the structured response controls a small sprite face next to its messages
- `innerThought` shown as a faded italic line under the pet's message
- "Close" button (X) at the top to dismiss and return to the main screen

**Chat bubble styling**:
- User messages: right-aligned, solid color background
- Pet messages: left-aligned, pixel-art bubble with small pet sprite avatar
- Pixel font for pet messages, regular font for user messages
- Messages animate in with a slide-up

**Typing indicator**:
- Three bouncing dots in pixel style
- Shows while waiting for Gemma 4 response
- Positioned where the next pet message will appear

**Integration**:
- Each exchange is automatically saved to the pet's short-term memory
- If the pet returns a `memory` field, it's added to long-term memory
- `moodShift` from the response updates stats in real-time (visible on main screen when chat closes)
- Stat changes from chat are shown as small inline notifications: "(happiness +5)"

**Acceptance criteria**:
- Tapping "Talk" opens the chat overlay with conversation history
- Can send multiple messages in a row
- Pet responses come from Gemma 4 with typing indicator
- Pet's emotion shows as a mini sprite next to its messages
- Closing chat and reopening shows the previous messages
- Stat changes from conversation are reflected on the main screen

---

### Subtask 6: Image Sharing (Show Action)

**Goal**: Let the user take or pick a photo and show it to the pet.

**Update these files**:
- `components/ActionButtons.tsx` — Update "Show" action
- Create `utils/imageHandler.ts` — Image picker and base64 conversion

**Requirements**:

When the user taps "Show" (from the More menu):
1. Show an action sheet: "Take a photo" or "Choose from gallery"
2. Use `expo-image-picker` to get the image
3. Show the image in the chat overlay (or a dedicated view) with "Showing to {pet.name}..."
4. Convert to base64, send to Gemma 4 via the engine's multimodal support
5. Display the pet's reaction as a PetResponse (speech + emotion + possible stat changes)

**Image display**:
- Show the selected image in a pixelated frame (apply a subtle pixelation CSS filter or just show it normally with a pixel border)
- Below the image: pet's reaction speech bubble
- Pet sprite plays a reaction animation (excited, confused, scared, etc. based on `emotion`)

**Acceptance criteria**:
- Tapping "Show" offers camera/gallery choice
- Selecting an image sends it to Gemma 4
- Pet reacts in character to the image content
- Reaction is saved to memory (pet remembers what you showed it)
- Works with both camera and gallery images
- Handles permission denied gracefully (shows a message, no crash)

---

### Subtask 7: Notifications + Background Behavior

**Goal**: The pet exists even when the app is closed.

**Requirements**:

**Local notifications** (using `expo-notifications`):
- Install: `npx expo install expo-notifications`
- Schedule notifications when the app goes to background:
  - 1 hour after close: "{name} is getting hungry..."
  - 3 hours: "{name} misses you! Come back and play!"
  - 8 hours: "{name} is feeling lonely... 😢"
  - 24 hours: "{name} needs you! Health is dropping!"
- Cancel all scheduled notifications when the app reopens
- Notification text should reflect the pet's personality (a sassy cat says something different than a sweet slime)

**App state handling**:
- When app goes to background: save state immediately
- When app comes to foreground: load state, apply offline time, show welcome back message
- Use React Native's `AppState` API to detect foreground/background transitions

**Update `hooks/useGameEngine.ts`**:
- Add AppState listener
- Schedule notifications on background
- Cancel notifications + apply offline time on foreground
- Show a "Welcome back!" speech bubble with time-away summary

**Acceptance criteria**:
- Closing and reopening the app loads the pet correctly with offline decay applied
- Notifications fire at the scheduled intervals (test by setting shorter intervals during dev)
- Notification text varies by pet personality
- Reopening the app cancels pending notifications
- Welcome back message shows how long you were away

---

## File structure

When done, the project should look like:
```
tamagotchi-app/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx            # Slot selection
│   ├── create.tsx           # Pet creation
│   └── pet.tsx              # Main game screen
├── components/
│   ├── DeviceFrame.tsx
│   ├── PetSprite.tsx
│   ├── SpriteAnimator.tsx
│   ├── StatsBar.tsx
│   ├── ActionButtons.tsx
│   ├── SpeechBubble.tsx
│   ├── MoodIndicator.tsx
│   ├── ChatOverlay.tsx
│   ├── ChatBubble.tsx
│   ├── TypingIndicator.tsx
│   ├── PixelInput.tsx
│   ├── SpeciesCard.tsx
│   └── SlotCard.tsx
├── hooks/
│   └── useGameEngine.ts     # Main engine hook
├── engine/                  # Copied + adapted from tamagotchi-engine
│   ├── types.ts
│   ├── constants.ts
│   ├── state.ts
│   ├── actions.ts
│   ├── events.ts
│   ├── llm.ts              # Adapted for React Native fetch
│   ├── personality.ts
│   ├── memory.ts
│   ├── progression.ts
│   ├── relationship.ts
│   ├── schema.ts
│   └── storage.ts          # Adapted for expo-file-system
├── utils/
│   ├── generateSprite.ts    # Programmatic pixel art
│   └── imageHandler.ts     # Image picker + base64
├── assets/
│   ├── fonts/               # Pixel fonts
│   └── sprites/             # Sprite data (or generated)
└── app.json
```

## Design tokens

Use these consistently across all components:

```typescript
const COLORS = {
  // Backgrounds
  deviceShell: '#E8D5B7',      // Warm beige device frame
  screenBg: '#C4CFA1',         // Game Boy green-ish screen
  screenBgNight: '#2A2A4A',    // Night mode screen
  
  // UI elements
  buttonFace: '#D4A574',       // Warm button color
  buttonPressed: '#B8895A',    // Pressed state
  buttonDisabled: '#C0B8A8',   // Greyed out
  
  // Stats
  statGreen: '#5B8C3E',
  statYellow: '#C4A020',
  statRed: '#A03030',
  
  // Text
  textPrimary: '#2A2A2A',
  textSecondary: '#6A6A5A',
  textPixel: '#1A1A2E',        // For pixel font text
  
  // Speech bubbles
  bubbleBg: '#FFFFF0',
  bubbleUser: '#A8C8E8',
  bubblePet: '#F0E8D0',
  
  // Mood colors
  moodHappy: '#5BAA3E',
  moodSad: '#4A6FA5',
  moodAngry: '#C04040',
  moodSick: '#8A7AB0',
};

const PIXEL_SIZE = 4; // Base pixel size for sprite rendering
const SPRITE_SIZE = 32; // Sprite grid dimensions (32x32 pixels)
const ANIMATION_FPS = 4; // Frame rate for pixel art animations
```

## Rules

- Use Expo managed workflow — no native module ejection
- StyleSheet.create for all styles — no inline style objects
- All game logic stays in `engine/` — components only call hooks
- No game logic in components — they receive data and dispatch actions
- Use react-native-reanimated for animations, NOT Animated API
- Pixel font loaded via expo-font in the root layout
- Handle all loading states (font loading, save loading, LLM calls)
- Test on iOS simulator or Android emulator (or Expo Go for quick iteration)
- Commit after each subtask: `feat(ui): subtask N — description`

## LLM connectivity note

For development:
- Ollama runs on your dev machine at `http://localhost:11434`
- iOS Simulator: `localhost` works directly
- Android Emulator: use `http://10.0.2.2:11434` (Android's alias for host machine)
- Physical device: use your machine's LAN IP (e.g., `http://192.168.1.100:11434`)

Add a dev settings screen (accessible from More → Settings) where the user can input the Ollama URL. Save it in AsyncStorage.
