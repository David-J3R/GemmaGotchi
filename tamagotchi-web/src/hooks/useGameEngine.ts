import { useState, useEffect, useRef, useCallback } from "react";
import type { PetState, PetMood, GameEvent } from "../engine/types";
import { createPet, computeMood, tick, applyStatChanges } from "../engine/state";
import { performAction } from "../engine/actions";
import { rollRandomEvents, rollPetInitiatedEvent } from "../engine/events";
import { getPetResponse } from "../engine/llm";
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
  doAction: (actionName: string) => void;
  talkToPet: (message: string) => Promise<void>;
  createNewPet: (name: string, species: string, slot: number) => Promise<void>;
  loadSlot: (slot: number) => Promise<void>;
}

export function useGameEngine(slot: number = 0): UseGameEngineReturn {
  const [pet, setPet] = useState<PetState | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");

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
        // Synchronous save attempt — best effort
        const meta = {
          version: 1,
          savedAt: new Date().toISOString(),
          engineVersion: "0.1.0",
        };
        const data = JSON.stringify({ _meta: meta, pet: p });
        // Use navigator.sendBeacon as a last resort for persistence
        // But idb-keyval doesn't support sync — just try async
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
      getPetResponse(p, actionName)
        .then((response) => {
          if (response.moodShift) {
            applyStatChanges(p, {
              happiness: response.moodShift.happiness,
              energy: response.moodShift.energy,
            });
          }
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
  }, [syncPet]);

  // Talk to pet with a specific message
  const talkToPet = useCallback(async (message: string) => {
    const p = petRef.current;
    if (!p) return;

    interactedRef.current = true;
    setIsThinking(true);

    try {
      const response = await getPetResponse(p, `talk: ${message}`);
      if (response.moodShift) {
        applyStatChanges(p, {
          happiness: response.moodShift.happiness,
          energy: response.moodShift.energy,
        });
      }
      addExchange(p.petMemory, message, response.speech);
      if (response.memory) {
        addMemory(p.petMemory, response.memory);
        if (needsConsolidation(p.petMemory)) {
          await consolidateMemories(p.petMemory);
        }
      }
      const xpEvents = grantXP(p, "talk");
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
  }, [syncPet]);

  // Create a new pet
  const createNewPet = useCallback(async (name: string, species: string, s: number) => {
    const newPet = createPet(name, species);
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
    doAction,
    talkToPet,
    createNewPet,
    loadSlot,
  };
}
