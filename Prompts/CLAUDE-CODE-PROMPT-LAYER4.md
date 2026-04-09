# AI Tamagotchi — Layer 4: Persistence

## Context

I have a fully working terminal Tamagotchi with:
- Layer 2: Game engine (state machine, event router, actions, progression)
- Layer 3: AI brain (personality engine, structured output, conversation memory, image input, relationship system)

Everything works — except the pet dies forever when I close the terminal. Time to fix that.

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
│   ├── llm.ts
│   ├── personality.ts
│   ├── memory.ts
│   ├── progression.ts
│   ├── relationship.ts
│   ├── schema.ts
│   ├── display.ts
│   ├── game.ts
│   └── __tests__/
```

**Important**: Read all existing source files first. Understand every type in `types.ts` — you need to serialize ALL of them. Do NOT restructure existing code.

## Tech constraints

- TypeScript, `npx tsx`, no external npm packages
- Use `fs/promises` for file I/O (Node built-in)
- Save data as JSON to `~/.tamagotchi/` directory
- Must handle: first launch (no save file), corrupted save files, schema migration

## Subtasks

---

### Subtask 1: Save/Load System

**Goal**: Pet state persists between sessions. Close the game, reopen it, your pet is still there.

**Create this file**:
- `src/storage.ts` — Save/load/delete operations

**Requirements**:

Save directory: `~/.tamagotchi/` (create if it doesn't exist)

Save file: `~/.tamagotchi/save.json`

Create these functions:

`savePet(pet: PetState): Promise<void>`
- Serialize the full PetState to JSON (including personality, memory, relationship — everything)
- Write to `~/.tamagotchi/save.json` atomically: write to a `.tmp` file first, then rename. This prevents corruption if the process is killed mid-write
- Include a `_meta` field in the JSON: `{ version: 1, savedAt: ISO timestamp, engineVersion: "0.1.0" }`

`loadPet(): Promise<PetState | null>`
- Read from `~/.tamagotchi/save.json`
- If file doesn't exist, return null (first launch)
- If file is corrupted (invalid JSON), log a warning, back up the corrupted file to `save.json.corrupt`, and return null
- Validate that all required fields exist on the loaded object. If any are missing (e.g., from an older save format), fill in defaults rather than crashing
- After loading, compute and apply "offline time" — see below

`deleteSave(): Promise<void>`
- Delete the save file (used when the pet dies, or for a "new game" option)

`hasSaveFile(): Promise<boolean>`
- Quick check if a save exists

**Offline time computation**:

When the player closes the game and reopens hours later, time has passed. The pet should reflect this.

Create `applyOfflineTime(pet: PetState): PetState`:
- Calculate elapsed minutes since `_meta.savedAt`
- Cap at 24 hours (1440 minutes) — don't simulate more than a day of neglect
- For each elapsed "virtual tick" (1 tick per minute while offline, since real ticks are every 10s):
  - Apply decay at **half rate** (the pet was "sleeping" / idle while you were away)
  - Do NOT apply random events (those only happen live)
  - Do NOT trigger death from offline neglect — cap health at minimum 5
- Update `lastInteraction` timestamp to now
- Log a summary: "You were away for X hours. Your pet's hunger dropped by Y, energy by Z..."

**Auto-save behavior**:
- Save every 60 seconds during gameplay (configurable constant)
- Save on clean exit (when user types "quit")
- Save before the process exits (handle SIGINT/SIGTERM)

**Update `src/game.ts`**:
- On startup: check for save file
  - If save exists: load it, apply offline time, display welcome back message
  - If no save: run pet creation flow (ask for name + species selection)
- Add auto-save timer
- Add SIGINT handler for graceful save on Ctrl+C
- On pet death: prompt "Start a new game? (yes/no)" — if yes, delete save and create new pet

**Update `src/display.ts`**:
- Show a "Saved" indicator briefly after each auto-save
- On load, show: "Welcome back! {name} missed you. You were gone for {duration}."

**Update `src/constants.ts`**:
- Add `AUTO_SAVE_INTERVAL_MS = 60_000`
- Add `MAX_OFFLINE_MINUTES = 1440`
- Add `OFFLINE_DECAY_MULTIPLIER = 0.5`
- Add `SAVE_VERSION = 1`

**Acceptance criteria**:
- Start the game, interact with the pet, type "quit"
- Restart the game — pet is loaded with the same name, stats, personality, memories, and relationship
- Close with Ctrl+C — pet is still saved
- Wait 5 minutes, reopen — pet's stats have decayed slightly, welcome back message shows elapsed time
- Delete `~/.tamagotchi/save.json`, restart — game prompts for a new pet
- Corrupt the save file (write garbage to it), restart — game warns about corruption and starts fresh
- Pet dies → game asks to start over → new pet can be created

**Test file**: `src/__tests__/storage.test.ts`
- Test save/load roundtrip (save a pet, load it, compare all fields)
- Test corrupted file handling
- Test offline time computation (mock a 2-hour gap, verify stat decay is reasonable)
- Test missing fields fallback (load a save with a field deleted, verify it fills defaults)

---

### Subtask 2: Pet Creation Flow + Multiple Save Slots

**Goal**: Give the player a proper onboarding experience and the ability to have multiple pets.

**Update these files**:
- `src/storage.ts` — Multi-slot support
- `src/game.ts` — Creation flow + slot selection

**Requirements**:

**Pet creation flow** (runs on first launch or new game):
1. "Welcome! Let's create your pet."
2. "What will you name your pet?" → free text input
3. "Choose a species:" → show numbered list of available species with preview descriptions:
   ```
   1. Slime Creature — playful, affectionate, loves food
   2. Shadow Cat — sassy, curious, independent
   3. Cloud Puff — energetic, dramatic, cuddly
   4. Ember Fox — clever, mischievous, loyal
   5. Crystal Snail — calm, wise, observant
   ```
4. Show the generated personality traits: "Your {name} is: very playful, quite curious, a bit sassy..."
5. "Ready to begin? (yes/no)"
6. If yes: create pet, save, start game
7. If no: go back to step 2

**Multiple save slots**:

Change save structure from single file to directory-based:
```
~/.tamagotchi/
├── slots/
│   ├── slot-1.json
│   ├── slot-2.json
│   └── slot-3.json
└── config.json        # last used slot, preferences
```

Maximum 3 save slots.

On startup, if saves exist, show:
```
Your pets:
  1. Blob the Slime Creature (Level 7, happy) — last played 2 hours ago
  2. Whisper the Shadow Cat (Level 3, bored) — last played yesterday
  3. [Empty slot]

Choose a slot (1-3) or type "new" to create a pet:
```

Create these functions:
- `listSaveSlots(): Promise<SaveSlotSummary[]>` — returns summary of all slots (name, species, level, mood, last played)
- `savePetToSlot(pet, slotNumber)` — saves to specific slot
- `loadPetFromSlot(slotNumber)` — loads from specific slot
- `deleteSlot(slotNumber)` — deletes a specific slot

**Update `src/game.ts`**:
- Startup flow: show slot selection → load or create → game loop
- "quit" command: save to current slot and exit
- Add "switch" command: save current pet, go back to slot selection

**Update auto-save**: use the current active slot number.

**Acceptance criteria**:
- First launch shows the creation flow with species selection
- Creating a pet shows its personality preview before confirming
- Second launch shows the existing pet in the slot list
- Can create up to 3 pets in different slots
- Can switch between pets mid-session with the "switch" command
- Each pet maintains its own separate state, memories, personality, and relationship
- Selecting an empty slot triggers the creation flow
- Cannot exceed 3 slots — shows "All slots full. Delete a pet first." with option to delete

**Test file**: `src/__tests__/storage.test.ts` (extend existing)
- Test multi-slot save/load
- Test slot listing with mixed empty/occupied slots
- Test slot deletion

---

## Rules

- Same as before: no external packages, strict TypeScript, no `any`
- Extend `types.ts` with any new interfaces (SaveSlotSummary, SaveMeta, etc.)
- New constants go in `constants.ts`
- Handle ALL edge cases: missing directory, permission errors, disk full (catch and log, don't crash)
- Commit after each subtask: `feat(persistence): subtask N — description`
