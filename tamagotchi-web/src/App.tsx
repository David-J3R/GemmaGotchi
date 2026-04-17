import { useState } from "react";
import { SlotSelectScreen } from "./screens/SlotSelectScreen";
import { CreatePetScreen } from "./screens/CreatePetScreen";
import { GameScreen } from "./screens/GameScreen";
import "./App.css";

type Screen = "slots" | "create" | "game";

function App() {
  const [screen, setScreen] = useState<Screen>("slots");
  const [activeSlot, setActiveSlot] = useState<number>(0);

  const handleSelectSlot = (slot: number) => {
    setActiveSlot(slot);
    setScreen("game");
  };

  const handleCreateNew = (slot: number) => {
    setActiveSlot(slot);
    setScreen("create");
  };

  const handlePetCreated = () => {
    setScreen("game");
  };

  const handleBackToSlots = () => {
    setScreen("slots");
  };

  switch (screen) {
    case "slots":
      return (
        <SlotSelectScreen
          onSelectSlot={handleSelectSlot}
          onCreateNew={handleCreateNew}
        />
      );
    case "create":
      return (
        <CreatePetScreen
          slot={activeSlot}
          onCreated={handlePetCreated}
          onBack={handleBackToSlots}
        />
      );
    case "game":
      return (
        <GameScreen
          slot={activeSlot}
          onBack={handleBackToSlots}
        />
      );
  }
}

export default App;
