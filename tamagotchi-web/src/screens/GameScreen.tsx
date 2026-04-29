import { useEffect, useRef, useState } from "react";
import { useGameEngine } from "../hooks/useGameEngine";
import { useLLM } from "../hooks/useLLM";
import { PetViewport } from "../components/PetViewport";
import { StatsBar } from "../components/StatsBar";
import { ActionButtons, type NavAction } from "../components/ActionButtons";
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

const NAV_TO_ENGINE: Record<Exclude<NavAction, "home">, string> = {
  play: "play",
  heal: "heal",
  eat: "feed",
  sleep: "sleep",
};

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
    const chat = chatRef.current;
    if (!chat) return;
    chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
  }, [pet?.petMemory.shortTerm.length, isThinking, pendingMsg, pendingImage]);

  // Desktop keyboard shortcuts: F=feed, P=play, T=talk, S=sleep
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case "f":
          e.preventDefault();
          setIsEating(true);
          setTimeout(() => setIsEating(false), 900);
          doAction("feed");
          break;
        case "p":
          e.preventDefault();
          doAction("play");
          break;
        case "s":
          e.preventDefault();
          doAction("sleep");
          break;
        case "t":
          e.preventDefault();
          textInputRef.current?.focus();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doAction]);

  if (isLoading) {
    return <div className={styles.loadingCenter}>Loading...</div>;
  }

  if (!pet || !mood) {
    return (
      <div className={styles.loadingCenter}>
        <p>No pet found in this slot.</p>
        <button onClick={onBack}>Back to Slots</button>
      </div>
    );
  }

  const handleNav = (action: NavAction) => {
    if (action === "home") {
      onBack();
      return;
    }
    if (action === "eat") {
      setIsEating(true);
      setTimeout(() => setIsEating(false), 900);
    }
    doAction(NAV_TO_ENGINE[action]);
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
    const ok = window.confirm(
      "Delete this conversation history? This removes the visible chat for this pet.",
    );
    if (!ok) return;
    clearConversation().catch(() => {
      setImageError("Could not delete the conversation. Try again.");
    });
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
      setImageError("Current model doesn't support images. Enable Ollama with a multimodal model to share pictures.");
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

  return (
    <div className={styles.screen}>
      <StatsBar pet={pet} mood={mood} />

      <div className={styles.stage}>
        <button className={styles.backBtn} onClick={onBack}>
          ← Back
        </button>
        <button
          className={styles.settingsBtn}
          onClick={onOpenSettings}
          aria-label="Settings"
        >
          ⚙
        </button>
        <button
          className={styles.clearChatBtn}
          onClick={handleClearConversation}
          disabled={isThinking || history.length === 0}
          aria-label="Delete conversation"
          title="Delete conversation"
        >
          ×
        </button>
        <PetViewport
          species={pet.species}
          mood={mood}
          isSleeping={pet.isSleeping}
          isEating={isEating}
          pixelScale={6}
          background={false}
        />
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
          className={styles.imageBtn}
          onClick={handleImageClick}
          disabled={isThinking}
        >
          <span className={styles.imageBtnIcon}>+</span>
          <span>Show image</span>
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
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={isThinking || !userMessage.trim()}
        >
          Send
        </button>
      </div>

      <ActionButtons onAction={handleNav} disabled={isThinking} />
    </div>
  );
}
