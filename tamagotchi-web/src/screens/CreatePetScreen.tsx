import { useState } from "react";
import { useGameEngine } from "../hooks/useGameEngine";
import { createPet } from "../engine/state";
import { PetViewport } from "../components/PetViewport";
import type { PetState } from "../engine/types";
import type { PetTraits } from "../engine/personality";
import styles from "./CreatePetScreen.module.css";

interface SpeciesOption {
  id: string;
  name: string;
  tagline: string;
}

const SPECIES_OPTIONS: SpeciesOption[] = [
  { id: "slime creature", name: "Slime Creature", tagline: "playful · affectionate · squishy" },
  { id: "shadow cat", name: "Shadow Cat", tagline: "sassy · curious · mysterious" },
  { id: "cloud puff", name: "Cloud Puff", tagline: "dreamy · cuddly · bouncy" },
  { id: "fire sprite", name: "Fire Sprite", tagline: "fiery · clever · mischievous" },
  { id: "crystal turtle", name: "Crystal Turtle", tagline: "calm · wise · thoughtful" },
];

const TRAIT_LABELS: Record<keyof PetTraits, string> = {
  playfulness: "Play",
  curiosity: "Curious",
  affection: "Bond",
  sass: "Sass",
  energy: "Energy",
};

interface Props {
  slot: number;
  onCreated: () => void;
  onBack: () => void;
}

type Step = "name" | "species" | "meet";

export function CreatePetScreen({ slot, onCreated, onBack }: Props) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<string>(SPECIES_OPTIONS[0].id);
  const [previewPet, setPreviewPet] = useState<PetState | null>(null);
  const { createNewPet } = useGameEngine(slot);

  const nameTrimmed = name.trim();

  const handleContinueFromName = () => {
    if (!nameTrimmed) return;
    setStep("species");
  };

  const handleSelectSpecies = (id: string) => {
    setSpecies(id);
  };

  const handleContinueFromSpecies = () => {
    const fresh = createPet(nameTrimmed, species);
    setPreviewPet(fresh);
    setStep("meet");
  };

  const handleReroll = () => {
    setPreviewPet(createPet(nameTrimmed, species));
  };

  const handleHatch = async () => {
    if (!previewPet) return;
    await createNewPet(previewPet, slot);
    onCreated();
  };

  const handleBack = () => {
    if (step === "meet") setStep("species");
    else if (step === "species") setStep("name");
    else onBack();
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack}>←</button>
        <div className={styles.stepIndicator}>
          <span className={step === "name" ? styles.dotActive : styles.dot}></span>
          <span className={step === "species" ? styles.dotActive : styles.dot}></span>
          <span className={step === "meet" ? styles.dotActive : styles.dot}></span>
        </div>
        <div className={styles.backBtnSpacer} />
      </div>

      {step === "name" && (
        <div className={styles.stepContent}>
          <h1 className={styles.title}>Name your pet</h1>
          <p className={styles.subtitle}>What should we call them?</p>
          <input
            className={styles.nameInput}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type a name..."
            maxLength={20}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleContinueFromName();
            }}
          />
          <button
            className={styles.primaryBtn}
            onClick={handleContinueFromName}
            disabled={!nameTrimmed}
          >
            Continue
          </button>
        </div>
      )}

      {step === "species" && (
        <div className={styles.stepContent}>
          <h1 className={styles.title}>Pick a species</h1>
          <p className={styles.subtitle}>Each one hatches with a unique personality</p>
          <div className={styles.speciesGrid}>
            {SPECIES_OPTIONS.map((s) => (
              <button
                key={s.id}
                className={species === s.id ? styles.speciesCardActive : styles.speciesCard}
                onClick={() => handleSelectSpecies(s.id)}
              >
                <div className={styles.speciesPreview}>
                  <PetViewport
                    species={s.id}
                    mood="happy"
                    isSleeping={false}
                    pixelScale={2}
                    background={false}
                  />
                </div>
                <div className={styles.speciesName}>{s.name}</div>
                <div className={styles.speciesTagline}>{s.tagline}</div>
              </button>
            ))}
          </div>
          <button className={styles.primaryBtn} onClick={handleContinueFromSpecies}>
            Continue
          </button>
        </div>
      )}

      {step === "meet" && previewPet && (
        <div className={styles.stepContent}>
          <h1 className={styles.title}>Meet {previewPet.name}!</h1>
          <div className={styles.meetPreview}>
            <PetViewport
              species={previewPet.species}
              mood="happy"
              isSleeping={false}
              pixelScale={4}
              background={true}
            />
          </div>
          <div className={styles.traitCard}>
            <div className={styles.traitHeader}>Personality</div>
            {(Object.keys(TRAIT_LABELS) as Array<keyof PetTraits>).map((k) => {
              const value = previewPet.personality.traits[k];
              return (
                <div key={k} className={styles.traitRow}>
                  <span className={styles.traitLabel}>{TRAIT_LABELS[k]}</span>
                  <div className={styles.traitBarBg}>
                    <div
                      className={styles.traitBarFill}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className={styles.traitValue}>{value}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.likesCard}>
            <div className={styles.likesRow}>
              <strong>Loves:</strong> {previewPet.personality.likes.join(", ")}
            </div>
            <div className={styles.likesRow}>
              <strong>Dislikes:</strong> {previewPet.personality.dislikes.join(", ")}
            </div>
            <div className={styles.likesRow}>
              <strong>Quirks:</strong>{" "}
              {previewPet.personality.speechStyle.quirks.join("; ")}
            </div>
          </div>
          <div className={styles.meetActions}>
            <button className={styles.secondaryBtn} onClick={handleReroll}>
              Reroll
            </button>
            <button className={styles.primaryBtn} onClick={handleHatch}>
              Hatch!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
