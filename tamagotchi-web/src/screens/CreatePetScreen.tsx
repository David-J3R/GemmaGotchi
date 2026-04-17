import { useState } from "react";
import { useGameEngine } from "../hooks/useGameEngine";

const SPECIES_OPTIONS = [
  { id: "slime creature", name: "Slime Creature", desc: "playful, affectionate, loves food" },
  { id: "shadow cat", name: "Shadow Cat", desc: "sassy, curious, independent" },
  { id: "cloud puff", name: "Cloud Puff", desc: "energetic, dramatic, cuddly" },
  { id: "fire sprite", name: "Fire Sprite", desc: "clever, mischievous, loyal" },
  { id: "crystal turtle", name: "Crystal Turtle", desc: "calm, wise, observant" },
];

interface Props {
  slot: number;
  onCreated: () => void;
  onBack: () => void;
}

export function CreatePetScreen({ slot, onCreated, onBack }: Props) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const { createNewPet } = useGameEngine(slot);

  const handleCreate = async () => {
    if (!name.trim() || !species) return;
    await createNewPet(name.trim(), species, slot);
    onCreated();
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: "2rem" }}>
      <button onClick={onBack} style={{ marginBottom: "1rem" }}>&larr; Back</button>
      <h1 style={{ textAlign: "center" }}>Create Your Pet</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          <strong>Name:</strong>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a name..."
            style={{
              display: "block",
              width: "100%",
              padding: "8px",
              marginTop: 4,
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Species:</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {SPECIES_OPTIONS.map((s) => (
            <div
              key={s.id}
              onClick={() => setSpecies(s.id)}
              style={{
                border: species === s.id ? "2px solid #4a9" : "2px solid #ccc",
                borderRadius: 8,
                padding: "0.75rem",
                cursor: "pointer",
                background: species === s.id ? "#e8f5e9" : "#fff",
              }}
            >
              <strong>{s.name}</strong>
              <br />
              <small>{s.desc}</small>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={!name.trim() || !species}
        style={{
          width: "100%",
          padding: "12px",
          fontSize: "1.1rem",
          background: name.trim() && species ? "#4a9" : "#ccc",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: name.trim() && species ? "pointer" : "default",
        }}
      >
        Hatch!
      </button>
    </div>
  );
}
