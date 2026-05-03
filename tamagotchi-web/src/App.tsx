/**
 * Top-level app shell.
 *
 * Wires the LLM provider context + error boundary, then drives a tiny
 * three-screen state machine: slots → create → game. Mounts the
 * BootScreen on cold start (no cached model), the SettingsOverlay on
 * demand, and a StatusLED + settings cog above the slot/create screens.
 */
import { useEffect, useState } from "react";
import { SlotSelectScreen } from "./screens/SlotSelectScreen";
import { CreatePetScreen } from "./screens/CreatePetScreen";
import { GameScreen } from "./screens/GameScreen";
import { LLMContextProvider } from "./llm/LLMContext";
import { SettingsOverlay } from "./components/SettingsOverlay";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BootScreen } from "./components/BootScreen";
import { StatusLED } from "./components/StatusLED";
import { hasCachedModel } from "./llm/cache";
import { useLLM } from "./hooks/useLLM";
import "./App.css";

type Screen = "slots" | "create" | "game";

function AppInner() {
  const [screen, setScreen] = useState<Screen>("slots");
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [slotsReloadKey, setSlotsReloadKey] = useState(0);

  const [shouldShowBoot, setShouldShowBoot] = useState<boolean | null>(null);
  const { isReady, switchProvider, providerName } = useLLM();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const warm = await hasCachedModel();
      if (!cancelled) setShouldShowBoot(!warm);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectSlot = (slot: number) => {
    setActiveSlot(slot);
    setScreen("game");
  };
  const handleCreateNew = (slot: number) => {
    setActiveSlot(slot);
    setScreen("create");
  };
  const handlePetCreated = () => setScreen("game");
  const handleBackToSlots = () => setScreen("slots");

  const showBoot = shouldShowBoot === true && !isReady;

  let content: React.ReactNode;
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
    <>
      {showBoot && (
        <BootScreen
          onReady={() => setShouldShowBoot(false)}
          onRetry={() => providerName && switchProvider(providerName)}
        />
      )}

      {!showBoot && screen !== "game" && (
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 10,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <StatusLED />
          <button
            onClick={() => setShowSettings(true)}
            style={{
              width: 32,
              height: 32,
              minWidth: 32,
              borderRadius: 4,
              background: "var(--device-shell)",
              border: "var(--border-thick) solid var(--device-bezel)",
              boxShadow: "var(--shadow-pixel)",
              fontFamily: "var(--pixel)",
              fontSize: 14,
              cursor: "pointer",
            }}
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      )}

      {content}

      {showSettings && (
        <SettingsOverlay
          onClose={() => setShowSettings(false)}
          onDataCleared={() => setSlotsReloadKey((k) => k + 1)}
        />
      )}
    </>
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
