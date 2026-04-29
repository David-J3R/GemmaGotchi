import { useState } from "react";
import { SlotSelectScreen } from "./screens/SlotSelectScreen";
import { CreatePetScreen } from "./screens/CreatePetScreen";
import { GameScreen } from "./screens/GameScreen";
import { LLMContextProvider } from "./llm/LLMContext";
import { ModelLoader } from "./llm/ModelLoader";
import { SettingsOverlay } from "./components/SettingsOverlay";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./App.css";

type Screen = "slots" | "create" | "game";

function AppInner() {
  const [screen, setScreen] = useState<Screen>("slots");
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [slotsReloadKey, setSlotsReloadKey] = useState(0);

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

  let content;
  switch (screen) {
    case "slots":
      content = (
        <SlotSelectScreen
          key={slotsReloadKey}
          onSelectSlot={handleSelectSlot}
          onCreateNew={handleCreateNew}
        />
      );
      break;
    case "create":
      content = (
        <CreatePetScreen
          slot={activeSlot}
          onCreated={handlePetCreated}
          onBack={handleBackToSlots}
        />
      );
      break;
    case "game":
      content = (
        <GameScreen
          slot={activeSlot}
          onBack={handleBackToSlots}
          onOpenSettings={() => setShowSettings(true)}
        />
      );
      break;
  }

  return (
    <div>
      <div style={{ maxWidth: 400, margin: "0 auto", padding: "0.5rem" }}>
        <ModelLoader />
      </div>
      {screen === "slots" && (
        <button
          onClick={() => setShowSettings(true)}
          style={{
            position: "fixed",
            top: "0.5rem",
            right: "0.5rem",
            zIndex: 10,
            background: "#fff",
            border: "none",
            borderRadius: "50%",
            width: 36,
            height: 36,
            fontSize: "1.1rem",
            fontWeight: 900,
            cursor: "pointer",
          }}
          aria-label="Settings"
        >
          ⚙
        </button>
      )}
      {content}
      {showSettings && (
        <SettingsOverlay
          onClose={() => setShowSettings(false)}
          onDataCleared={() => setSlotsReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LLMContextProvider>
        <AppInner />
      </LLMContextProvider>
    </ErrorBoundary>
  );
}

export default App;
