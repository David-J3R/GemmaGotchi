/**
 * The bridge between the pure-TS engine and React.
 *
 * Owns the active pet, runs the game tick (`TICK_INTERVAL_MS`) and
 * auto-save (`AUTO_SAVE_INTERVAL_MS`), tracks an `interactedRef` flag
 * that feeds the relationship system, and orchestrates LLM-routed
 * actions: action → engine returns `needsLLM` → call `generate` →
 * apply mood shift → store the exchange in pet memory → consolidate
 * if needed → push the response into the events log.
 *
 * Mutations happen on `petRef.current` for synchronous reads inside the
 * tick; `syncPet()` then copies into React state to trigger re-renders.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import type { PetState, PetMood, GameEvent } from "../engine/types";
import type { PetResponse } from "../engine/schema";
import { computeMood, tick, applyStatChanges } from "../engine/state";
import { performAction } from "../engine/actions";
import { rollRandomEvents, rollPetInitiatedEvent } from "../engine/events";
import { getPetResponse } from "../engine/llm";
import { useLLM } from "./useLLM";
import { addExchange, addMemory, needsConsolidation, consolidateMemories } from "../engine/memory";
import { grantXP, checkEvolution } from "../engine/progression";
import { updateRelationship } from "../engine/relationship";
import { savePet, loadPet, applyOfflineTime } from "../engine/storage";
import { TICK_INTERVAL_MS, AUTO_SAVE_INTERVAL_MS } from "../engine/constants";

export interface UseGameEngineReturn {
  pet: PetState | null;
  mood: PetMood | null;
  events: GameEvent[];
  isLoading: boolean;
  isThinking: boolean;
  welcomeMessage: string;
  lastResponse: PetResponse | null;
  doAction: (actionName: string) => void;
  talkToPet: (message: string, imageBase64?: string) => Promise<void>;
  clearConversation: () => Promise<void>;
  createNewPet: (pet: PetState, slot: number) => Promise<void>;
  loadSlot: (slot: number) => Promise<void>;
}

export function useGameEngine(slot: number = 0): UseGameEngineReturn {
  const { generate } = useLLM();
  const [pet, setPet] = useState<PetState | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [lastResponse, setLastResponse] = useState<PetResponse | null>(null);

  const petRef = useRef<PetState | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interactedRef = useRef(false);
  const slotRef = useRef(slot);

  // Keep petRef in sync
  useEffect(() => {
    petRef.current = pet;
  }, [pet]);

  useEffect(() => {
    slotRef.current = slot;
  }, [slot]);

  // Sync pet state from ref to React state (used after mutations)
  const syncPet = useCallback(() => {
    if (petRef.current) {
      setPet({ ...petRef.current });
    }
  }, []);

  // Game tick
  const gameTick = useCallback(() => {
    const p = petRef.current;
    if (!p || !p.isAlive) return;

    const tickEvents = tick(p);
    const randomEvents = rollRandomEvents(p);
    const allEvents = [...tickEvents, ...randomEvents];

    const mood = computeMood(p);
    updateRelationship(p.relationship, p.happiness, mood, interactedRef.current);
    interactedRef.current = false;

    const petInitEvent = rollPetInitiatedEvent(p);
    if (petInitEvent) {
      allEvents.push(petInitEvent);
    }

    if (allEvents.length > 0) {
      setEvents((prev) => [...prev, ...allEvents].slice(-20));
    }

    syncPet();
  }, [syncPet]);

  // Auto-save
  const autoSave = useCallback(async () => {
    const p = petRef.current;
    if (!p) return;
    try {
      await savePet(p, slotRef.current);
    } catch (err) {
      console.warn("Auto-save failed:", err);
    }
  }, []);

  // Load pet on mount
  const loadSlot = useCallback(async (s: number) => {
    setIsLoading(true);
    slotRef.current = s;
    try {
      const loaded = await loadPet(s);
      if (loaded) {
        const result = applyOfflineTime(loaded.pet, loaded.meta.savedAt);
        petRef.current = result.pet;
        setPet({ ...result.pet });
        if (result.summary) {
          setWelcomeMessage(result.summary);
        }
      } else {
        petRef.current = null;
        setPet(null);
      }
    } catch {
      petRef.current = null;
      setPet(null);
    }
    setIsLoading(false);
  }, []);

  // Start timers when pet is loaded
  useEffect(() => {
    if (!pet || !pet.isAlive) return;

    tickRef.current = setInterval(gameTick, TICK_INTERVAL_MS);
    saveRef.current = setInterval(() => { autoSave(); }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (saveRef.current) clearInterval(saveRef.current);
    };
  }, [pet?.isAlive, gameTick, autoSave]);

  // Save on unmount and beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const p = petRef.current;
      if (p) {
        savePet(p, slotRef.current).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Save on unmount
      const p = petRef.current;
      if (p) {
        savePet(p, slotRef.current).catch(() => {});
      }
    };
  }, []);

  // Perform a game action
  const doAction = useCallback((actionName: string) => {
    const p = petRef.current;
    if (!p) return;

    interactedRef.current = true;
    const result = performAction(p, actionName);

    if (result.events.length > 0) {
      const xpEvents = grantXP(p, actionName);
      const evoEvent = checkEvolution(p);
      const allEvents = [...result.events, ...xpEvents];
      if (evoEvent) allEvents.push(evoEvent);
      setEvents((prev) => [...prev, ...allEvents].slice(-20));
    }

    syncPet();

    if (result.needsLLM) {
      setIsThinking(true);
      getPetResponse(generate, p, actionName)
        .then((response) => {
          if (response.moodShift) {
            applyStatChanges(p, {
              happiness: response.moodShift.happiness,
              energy: response.moodShift.energy,
            });
          }
          setLastResponse(response);
          addExchange(p.petMemory, actionName, response.speech);
          if (response.memory) {
            addMemory(p.petMemory, response.memory);
            if (needsConsolidation(p.petMemory)) {
              consolidateMemories(p.petMemory).catch(() => {});
            }
          }
          setEvents((prev) => [
            ...prev,
            {
              type: "llm_response",
              message: `${p.name} [${response.emotion}]: "${response.speech}"`,
              timestamp: Date.now(),
            },
          ].slice(-20));
          syncPet();
        })
        .catch(() => {})
        .finally(() => setIsThinking(false));
    }
  }, [syncPet, generate]);

  // Talk to pet with a specific message, optionally showing an image
  const talkToPet = useCallback(async (message: string, imageBase64?: string) => {
    const p = petRef.current;
    if (!p) return;

    interactedRef.current = true;
    setIsThinking(true);

    const promptText = imageBase64 ? `show: ${message || "look at this!"}` : `talk: ${message}`;
    const memoryUserMessage = imageBase64
      ? `[showed image] ${message}`.trim()
      : message;

    try {
      const response = await getPetResponse(generate, p, promptText, imageBase64);
      if (response.moodShift) {
        applyStatChanges(p, {
          happiness: response.moodShift.happiness,
          energy: response.moodShift.energy,
        });
      }
      setLastResponse(response);
      addExchange(p.petMemory, memoryUserMessage, response.speech);
      if (response.memory) {
        addMemory(p.petMemory, response.memory);
        if (needsConsolidation(p.petMemory)) {
          await consolidateMemories(p.petMemory);
        }
      }
      const xpEvents = grantXP(p, imageBase64 ? "show" : "talk");
      const evoEvent = checkEvolution(p);
      const allEvents: GameEvent[] = [
        ...xpEvents,
        {
          type: "llm_response",
          message: `${p.name} [${response.emotion}]: "${response.speech}"`,
          timestamp: Date.now(),
        },
      ];
      if (evoEvent) allEvents.push(evoEvent);
      setEvents((prev) => [...prev, ...allEvents].slice(-20));
      syncPet();
    } catch {
      // LLM failed silently
    } finally {
      setIsThinking(false);
    }
  }, [syncPet, generate]);

  const clearConversation = useCallback(async () => {
    const p = petRef.current;
    if (!p) return;
    p.petMemory.shortTerm = [];
    setLastResponse(null);
    syncPet();
    await savePet(p, slotRef.current);
  }, [syncPet]);

  // Create a new pet from a pre-built PetState (so caller can preview personality before saving)
  const createNewPet = useCallback(async (newPet: PetState, s: number) => {
    petRef.current = newPet;
    slotRef.current = s;
    setPet({ ...newPet });
    setEvents([]);
    setWelcomeMessage("");
    await savePet(newPet, s);
  }, []);

  const mood = pet ? computeMood(pet) : null;

  return {
    pet,
    mood,
    events,
    isLoading,
    isThinking,
    welcomeMessage,
    lastResponse,
    doAction,
    talkToPet,
    clearConversation,
    createNewPet,
    loadSlot,
  };
}
