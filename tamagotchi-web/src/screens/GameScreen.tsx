import { useEffect } from "react";
import { useGameEngine } from "../hooks/useGameEngine";

interface Props {
  slot: number;
  onBack: () => void;
}

export function GameScreen({ slot, onBack }: Props) {
  const { pet, mood, events, isLoading, isThinking, welcomeMessage, doAction, loadSlot } =
    useGameEngine(slot);

  useEffect(() => {
    loadSlot(slot);
  }, [slot, loadSlot]);

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: "2rem" }}>Loading...</div>;
  }

  if (!pet) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p>No pet found in this slot.</p>
        <button onClick={onBack}>Back to Slots</button>
      </div>
    );
  }

  const statBar = (label: string, value: number) => {
    const pct = Math.max(0, Math.min(100, value));
    const color = pct >= 60 ? "#5B8C3E" : pct >= 30 ? "#C4A020" : "#A03030";
    return (
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
          <span>{label}</span>
          <span>{value}/100</span>
        </div>
        <div style={{ background: "#ddd", borderRadius: 4, height: 10, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: "1rem" }}>
      <button onClick={onBack} style={{ marginBottom: "0.5rem" }}>&larr; Back</button>

      <div style={{
        textAlign: "center",
        padding: "1rem",
        border: "2px solid #C9B396",
        borderRadius: 12,
        background: "#E8D5B7",
      }}>
        <h2 style={{ margin: "0 0 0.25rem" }}>{pet.name}</h2>
        <p style={{ margin: "0 0 0.5rem", color: "#666" }}>
          {pet.species} | Level {pet.level} | Mood: {mood}
          {pet.isSleeping ? " (sleeping)" : ""}
        </p>

        {welcomeMessage && (
          <p style={{ fontSize: "0.85rem", color: "#555", fontStyle: "italic" }}>
            {welcomeMessage}
          </p>
        )}

        <div style={{ textAlign: "left", margin: "1rem 0" }}>
          {statBar("Hunger", pet.hunger)}
          {statBar("Happiness", pet.happiness)}
          {statBar("Energy", pet.energy)}
          {statBar("Health", pet.health)}
        </div>

        <div style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
          XP: {pet.xp} | Age: {pet.age} ticks
        </div>

        {isThinking && (
          <p style={{ color: "#888", fontStyle: "italic" }}>Thinking...</p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {["feed", "play", "pet", "sleep", "heal", "talk"].map((action) => (
            <button
              key={action}
              onClick={() => doAction(action)}
              disabled={isThinking}
              style={{
                padding: "10px 0",
                fontSize: "0.9rem",
                textTransform: "capitalize",
                cursor: isThinking ? "default" : "pointer",
                border: "2px solid #B8895A",
                borderRadius: 6,
                background: isThinking ? "#C0B8A8" : "#D4A574",
                color: "#2A2A2A",
              }}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {events.length > 0 && (
        <div style={{ marginTop: "1rem", fontSize: "0.8rem", maxHeight: 150, overflowY: "auto" }}>
          <strong>Events:</strong>
          {events.slice(-10).map((e, i) => (
            <div key={i} style={{ color: "#555", padding: "2px 0" }}>
              {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
