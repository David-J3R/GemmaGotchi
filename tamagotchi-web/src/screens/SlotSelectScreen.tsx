import { useEffect, useState } from "react";
import { listSaveSlots, loadPet, deleteSave } from "../engine/storage";
import type { PetState } from "../engine/types";

interface Props {
  onSelectSlot: (slot: number) => void;
  onCreateNew: (slot: number) => void;
}

interface SlotInfo {
  slot: number;
  pet: PetState | null;
}

export function SlotSelectScreen({ onSelectSlot, onCreateNew }: Props) {
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSlots() {
      const occupied = await listSaveSlots();
      const slotInfos: SlotInfo[] = [];

      for (let i = 0; i < 3; i++) {
        if (occupied.includes(i)) {
          const data = await loadPet(i);
          slotInfos.push({ slot: i, pet: data?.pet ?? null });
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
      prev.map((s) => (s.slot === slot ? { slot, pet: null } : s))
    );
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "2rem" }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ textAlign: "center", marginBottom: "1.5rem" }}>Your Pets</h1>
      {slots.map(({ slot, pet }) => (
        <div
          key={slot}
          style={{
            border: pet ? "2px solid #888" : "2px dashed #aaa",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: "1rem",
            cursor: "pointer",
            background: pet ? "#f9f6f0" : "#fafafa",
          }}
          onClick={() => (pet ? onSelectSlot(slot) : onCreateNew(slot))}
        >
          {pet ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{pet.name}</strong> the {pet.species}
                <br />
                <small>Level {pet.level} | Age: {pet.age} ticks</small>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(slot);
                }}
                style={{
                  background: "#c44",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#999" }}>
              <span style={{ fontSize: "1.5rem" }}>+</span>
              <br />
              New Pet
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
