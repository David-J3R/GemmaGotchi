/**
 * Save-slot picker — shows up to SLOT_COUNT slots, occupied or empty.
 * Loads slot summaries from IndexedDB on mount, lets the user pick a
 * pet (→ GameScreen), create a new one (→ CreatePetScreen), or delete.
 */
import { useEffect, useState } from "react";
import { listSaveSlots, loadPet, deleteSave } from "../engine/storage";
import type { PetState } from "../engine/types";
import { SlotCard, EmptySlotCard } from "../components/SlotCard";
import styles from "./SlotSelectScreen.module.css";

interface Props {
  onSelectSlot: (slot: number) => void;
  onCreateNew: (slot: number) => void;
}

interface SlotInfo {
  slot: number;
  pet: PetState | null;
  savedAt?: string;
}

const SLOT_COUNT = 3;

export function SlotSelectScreen({ onSelectSlot, onCreateNew }: Props) {
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSlots() {
      const occupied = await listSaveSlots();
      const slotInfos: SlotInfo[] = [];
      for (let i = 0; i < SLOT_COUNT; i++) {
        if (occupied.includes(i)) {
          const data = await loadPet(i);
          slotInfos.push({
            slot: i,
            pet: data?.pet ?? null,
            savedAt: data?.meta.savedAt,
          });
        } else {
          slotInfos.push({ slot: i, pet: null });
        }
      }
      setSlots(slotInfos);
      setLoading(false);
    }
    loadSlots();
  }, []);

  const handleDelete = async (slot: number) => {
    if (!confirm("Delete this pet? This cannot be undone.")) return;
    await deleteSave(slot);
    setSlots((prev) =>
      prev.map((s) => (s.slot === slot ? { slot, pet: null } : s)),
    );
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.screen}>
      <div>
        <h1 className={styles.title}>Your Pets</h1>
        <p className={styles.subtitle}>Choose a pet to play with</p>
      </div>
      <div className={styles.slots}>
        {slots.map(({ slot, pet, savedAt }) =>
          pet ? (
            <SlotCard
              key={slot}
              pet={pet}
              lastPlayed={savedAt}
              onClick={() => onSelectSlot(slot)}
              onDelete={() => handleDelete(slot)}
            />
          ) : (
            <EmptySlotCard key={slot} onClick={() => onCreateNew(slot)} />
          ),
        )}
      </div>
    </div>
  );
}
