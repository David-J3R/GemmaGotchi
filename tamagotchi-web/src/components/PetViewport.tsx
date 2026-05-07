import { useEffect, useRef } from "react";
import {
  SpriteRenderer,
  type ParticleType,
} from "../sprites/SpriteRenderer";
import type { AnimationName } from "../sprites/SpriteData";
import type { PetMood } from "../engine/types";

interface Props {
  species: string;
  mood: PetMood;
  isSleeping: boolean;
  isEating?: boolean;
  particleType?: ParticleType;
  pixelScale?: number;
  background?: boolean;
  className?: string;
}

function moodToAnimation(mood: PetMood, isSleeping: boolean): AnimationName {
  if (isSleeping) return "sleeping";
  switch (mood) {
    case "ecstatic":
    case "happy":
      return "happy";
    case "sad":
    case "angry":
    case "sick":
    case "critical":
    case "starving":
      return "sad";
    case "exhausted":
      return "sleeping";
    case "content":
    case "bored":
    default:
      return "idle";
  }
}

function particleForState(
  mood: PetMood,
  isSleeping: boolean,
  explicit: ParticleType | undefined,
): ParticleType {
  if (explicit !== undefined) return explicit;
  if (isSleeping || mood === "exhausted") return "zzz";
  if (mood === "ecstatic") return "hearts";
  return null;
}

export function PetViewport({
  species,
  mood,
  isSleeping,
  isEating = false,
  particleType,
  pixelScale = 4,
  background = true,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<SpriteRenderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new SpriteRenderer(canvas, pixelScale);
    rendererRef.current = renderer;

    const loop = (ts: number) => {
      const last = lastTsRef.current;
      const dt = last == null ? 16 : ts - last;
      lastTsRef.current = ts;
      renderer.update(dt);
      renderer.render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
      rendererRef.current = null;
    };
  }, [pixelScale]);

  useEffect(() => {
    rendererRef.current?.setBackgroundEnabled(background);
  }, [background]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const anim = moodToAnimation(mood, isSleeping);
    r.setAnimation(species, anim);
  }, [species, mood, isSleeping]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !isEating) return;
    r.playOnce(species, "eating", () => {
      r.setAnimation(species, moodToAnimation(mood, isSleeping));
    });
  }, [isEating, species, mood, isSleeping]);

  useEffect(() => {
    rendererRef.current?.setParticles(
      particleForState(mood, isSleeping, particleType),
    );
  }, [mood, isSleeping, particleType]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        imageRendering: "pixelated",
      }}
    />
  );
}
