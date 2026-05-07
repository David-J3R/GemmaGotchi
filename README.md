# Tamagotchi Engine

A browser-based AI Tamagotchi. Stats decay in real time, the player
feeds / plays / heals / talks / shows-images, and a **local LLM**
(Ollama running `gemma4:e2b`) drives the pet's speech, emotion, mood
shifts, and remembered facts. Everything — saves, sprites, the LLM
brain — runs on your own machine. No cloud, no account.

The repository root holds documentation only. The actual app lives in
[`tamagotchi-web/`](./tamagotchi-web).

---

## Features

- **Up to 3 pets in parallel save slots**, persisted to IndexedDB.
- **Five species** (Slime Creature, Shadow Cat, Cloud Puff, Fire
  Sprite, Crystal Turtle), each with its own pixel sprite, palette,
  and personality template.
- **Pure-TypeScript engine**: stats, mood, decay, neglect, sleep/wake,
  XP, leveling, evolution, ambient events.
- **Two-tier pet memory**: rolling 8-exchange short-term + summarized
  long-term memories that the LLM can consolidate when they pile up.
- **Trust + bond progression** (stranger → bonded) wired into the LLM
  system prompt, so the pet's tone changes as you build a relationship.
- **Image input**: send a photo from the chat panel and the model
  reacts in character (Ollama's `gemma4:e2b` is image-capable).
- **Flappy Bird mini-game** when the pet is fed enough to play.
- **Offline catch-up**: stats fast-forward (capped, decayed at half
  rate, health floored) when you reopen the tab after time away.
- **Service Worker** caches the app shell for offline launching.
- **Save export / import / wipe** from the in-app Settings panel.

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
| Offline | Service Worker (`tamagotchi-web/public/sw.js`) |

No state library. No router. No CSS framework. Engine is pure TS so
you can call it from a Node script, a worker, or any UI.

---

## Requirements

- **Node.js** ≥ 18 (Vite 8 requirement) — 20 LTS recommended.
- **npm** (other package managers should work but aren't tested).
- **Ollama** running locally on `http://localhost:11434` with the
  `gemma4:e2b` model pulled. Without it the app loads but every reply
  falls back to a stub like `*tilts head and blinks*`.
- A browser that supports IndexedDB and Service Workers (any modern
  Chromium / Firefox / Safari).

### Installing the LLM brain

```bash
# Install Ollama from https://ollama.com/, then:
ollama pull gemma4:e2b
ollama serve
```

You can change the model or base URL at runtime from the in-app
Settings panel; the defaults live in
[`src/llm/OllamaProvider.ts`](./tamagotchi-web/src/llm/OllamaProvider.ts).

---

## Quickstart

```bash
cd tamagotchi-web
npm install
npm run dev          # http://localhost:5173
```

Open the URL, pick a slot, name your pet, and pick a species. The
first time the LLM provider initializes you'll see a Boot Screen; once
it goes green you can talk to your pet.

### Other scripts

```bash
npm run build        # tsc -b && vite build  (output → tamagotchi-web/dist)
npm run preview      # serve the production build locally
npm run lint         # eslint .
npm test             # vitest run
```

---

## Controls

In the game screen:

| Input | Action |
| --- | --- |
| `F` | Feed |
| `P` | Play (opens Flappy Bird mini-game if stats allow) |
| `H` | Heal |
| `S` | Sleep |
| `T` | Focus the chat input |
| Enter (in chat) | Send the message |
| `+` (in chat) | Attach an image — pet reacts to it |
| Space / ↑ (in mini-game) | Flap |

The same actions are reachable via the four hardware-style buttons
under the LCD. Talk and Show have no hardware buttons — only the
chat panel.

---

## Project layout

```
tamagotchi-engine/
├── README.md                  ← you are here
├── ARCHITECTURE.md            ← deep dive: engine, hooks, data flow, gotchas
├── .gitignore
└── tamagotchi-web/            ← the React app
    ├── src/
    │   ├── engine/            ← pure-TS game logic (no React)
    │   ├── llm/               ← LLM provider abstraction (Ollama today)
    │   ├── hooks/             ← React ↔ engine glue
    │   ├── screens/           ← Slot picker, Create wizard, Game screen
    │   ├── components/        ← Reusable pixel-art UI
    │   └── sprites/           ← Per-species pixel grids + canvas renderer
    └── tests/                 ← Vitest tests, mirroring src/ layout
```

For everything else — data flow diagrams, the LLM call lifecycle, the
save format, conventions, and a "if I want to change X, look at Y"
table — read **[`ARCHITECTURE.md`](./ARCHITECTURE.md)**. It's the
canonical map of the codebase.

---

## Troubleshooting

- **"Ollama unreachable" on the Boot Screen** — make sure `ollama
  serve` is running and the URL in Settings matches (default
  `http://localhost:11434`). The Boot Screen has a Retry button.
- **Pet replies are placeholder text like `*looks up at you and
  wiggles*`** — that's the runtime fallback after a failed
  `generate` call; check the browser console and the Ollama logs for
  the underlying error.
- **Pet reset / lost saves** — saves are scoped to the current
  browser profile's IndexedDB. Clearing site data wipes them. Use
  Settings → *Export save* to back up before clearing.
- **Service Worker caching stale assets** — only active in the built
  app (`npm run build && npm run preview`); bump `CACHE_VERSION` in
  `tamagotchi-web/public/sw.js` to force a refresh.

---

## License

Not yet specified.
