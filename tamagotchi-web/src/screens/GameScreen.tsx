import { useEffect, useRef, useState } from "react";
import { useGameEngine } from "../hooks/useGameEngine";
import { useLLM } from "../hooks/useLLM";
import { PetViewport } from "../components/PetViewport";
import { DeviceFrame } from "../components/DeviceFrame";
import {
  PetBubble,
  UserBubble,
  TypingBubble,
} from "../components/SpeechBubble";
import styles from "./GameScreen.module.css";

interface Props {
  slot: number;
  onBack: () => void;
  onOpenSettings: () => void;
}

export function GameScreen({ slot, onBack, onOpenSettings }: Props) {
  const {
    pet,
    mood,
    isLoading,
    isThinking,
    lastResponse,
    doAction,
    talkToPet,
    clearConversation,
    loadSlot,
  } = useGameEngine(slot);

  const { supportsImages } = useLLM();
  const [isEating, setIsEating] = useState(false);
  const [pendingMsg, setPendingMsg] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadSlot(slot);
  }, [slot, loadSlot]);

  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [pet?.petMemory.shortTerm.length, isThinking, pendingMsg, pendingImage]);

  // Keyboard shortcuts: F=feed, P=play, H=heal, S=sleep, T=focus chat input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case "f":
          e.preventDefault();
          handleAction("feed");
          break;
        case "p":
          e.preventDefault();
          handleAction("play");
          break;
        case "h":
          e.preventDefault();
          handleAction("heal");
          break;
        case "s":
          e.preventDefault();
          handleAction("sleep");
          break;
        case "t":
          e.preventDefault();
          textInputRef.current?.focus();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return <div className={styles.loadingCenter}>Loading...</div>;

  if (!pet || !mood) {
    return (
      <div className={styles.loadingCenter}>
        <p>No pet found in this slot.</p>
        <button onClick={onBack} className={styles.fallbackBackBtn}>Back to Slots</button>
      </div>
    );
  }

  const handleAction = (action: "feed" | "play" | "heal" | "sleep") => {
    if (action === "feed") {
      setIsEating(true);
      setTimeout(() => setIsEating(false), 900);
    }
    doAction(action);
  };

  const handleSend = () => {
    const trimmed = userMessage.trim();
    if (!trimmed || isThinking) return;
    setPendingMsg(trimmed);
    setUserMessage("");
    talkToPet(trimmed).finally(() => setPendingMsg(""));
  };

  const handleClearConversation = () => {
    if (isThinking || history.length === 0) return;
    if (!window.confirm("Delete this conversation history?")) return;
    clearConversation().catch(() => setImageError("Could not delete the conversation."));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageClick = () => {
    setImageError(null);
    if (!supportsImages) {
      setImageError("Current model doesn't support images.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result as string;
      const base64 = raw.split(",")[1] ?? raw;
      const caption = userMessage.trim();
      setPendingImage(raw);
      setPendingMsg(caption);
      setUserMessage("");
      talkToPet(caption, base64).finally(() => {
        setPendingImage(null);
        setPendingMsg("");
      });
    };
    reader.readAsDataURL(file);
  };

  const history = pet.petMemory.shortTerm;
  const petSprite = (
    <PetViewport
      species={pet.species}
      mood={mood}
      isSleeping={pet.isSleeping}
      isEating={isEating}
      pixelScale={7}
      background={false}
    />
  );

  return (
    <div className={styles.screen}>
      <DeviceFrame
        pet={pet}
        mood={mood}
        isThinking={isThinking}
        petSprite={petSprite}
        onAction={handleAction}
        onBack={onBack}
        onOpenSettings={onOpenSettings}
      />

      <div className={styles.chatPanel}>
        <div className={styles.chatHeader}>
          <span className={styles.chatTitle}>CHAT</span>
          <button
            type="button"
            className={styles.clearChatBtn}
            onClick={handleClearConversation}
            disabled={isThinking || history.length === 0}
            aria-label="Clear conversation"
          >
            ×
          </button>
        </div>
        <div className={styles.chat} ref={chatRef}>
          <div className={styles.chatList}>
            {history.map((ex, i) => {
              const isLatest = i === history.length - 1;
              return (
                <div key={`h-${i}`}>
                  {ex.userMessage && !ex.userMessage.startsWith("[action:") && (
                    <UserBubble text={ex.userMessage} />
                  )}
                  <PetBubble
                    petName={pet.name}
                    text={ex.petResponse}
                    typewriter={false}
                    emotion={isLatest ? lastResponse?.emotion : undefined}
                    thought={isLatest ? lastResponse?.innerThought : undefined}
                    moodShift={isLatest ? lastResponse?.moodShift : undefined}
                  />
                </div>
              );
            })}
            {(pendingMsg || pendingImage) && (
              <UserBubble
                text={pendingMsg || undefined}
                imageSrc={pendingImage ?? undefined}
              />
            )}
            {isThinking && <TypingBubble petName={pet.name} />}
            <div ref={chatEndRef} />
          </div>
        </div>

        {imageError && (
          <div className={styles.imageError} onClick={() => setImageError(null)}>
            {imageError}
          </div>
        )}

        <div className={styles.inputRow}>
          <button
            type="button"
            className={styles.imageBtn}
            onClick={handleImageClick}
            disabled={isThinking}
            aria-label="Send image"
          >
            +
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenFile}
            onChange={handleFileChange}
          />
          <input
            ref={textInputRef}
            type="text"
            className={styles.textInput}
            placeholder={`Say something to ${pet.name}...`}
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
          />
          <button
            type="button"
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={isThinking || !userMessage.trim()}
            aria-label="Send"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
