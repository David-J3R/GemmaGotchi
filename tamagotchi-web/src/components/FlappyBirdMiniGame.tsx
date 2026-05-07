import { useCallback, useEffect, useRef, useState } from "react";
import type { PetMood } from "../engine/types";
import {
  getSpeciesSprites,
  SPRITE_SIZE,
  type SpriteFrame,
} from "../sprites/SpriteData";
import styles from "./FlappyBirdMiniGame.module.css";

type GameStatus = "ready" | "running" | "lost";

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
}

interface GameState {
  petY: number;
  velocity: number;
  pipes: Pipe[];
  score: number;
  frame: number;
}

interface Props {
  petName: string;
  species: string;
  mood: PetMood;
  onClose: () => void;
}

const GAME_W = 320;
const GAME_H = 240;
const PET_X = 70;
const PET_SIZE = 30;
const PET_HITBOX = 22;
const GRAVITY = 0.24;
const JUMP_FORCE = -4.9;
const PIPE_W = 38;
const PIPE_GAP = 90;
const PIPE_SPEED = 1.35;
const PIPE_DISTANCE = 152;
const GROUND_H = 20;
const SKY_H = GAME_H - GROUND_H;
const FRAME_MS = 1000 / 60;
const MAX_DELTA_MS = 50;

function makePipe(x: number): Pipe {
  const minGapY = 58;
  const maxGapY = SKY_H - PIPE_GAP - 34;
  return {
    x,
    gapY: minGapY + Math.random() * (maxGapY - minGapY),
    scored: false,
  };
}

function createGame(): GameState {
  return {
    petY: 104,
    velocity: 0,
    pipes: [makePipe(250), makePipe(250 + PIPE_DISTANCE)],
    score: 0,
    frame: 0,
  };
}

function moodToSprite(mood: PetMood): "happy" | "idle" | "sad" {
  if (mood === "ecstatic" || mood === "happy") return "happy";
  if (
    mood === "sad" ||
    mood === "angry" ||
    mood === "sick" ||
    mood === "critical" ||
    mood === "starving"
  ) {
    return "sad";
  }
  return "idle";
}

function drawPixelSprite(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  x: number,
  y: number,
  size: number,
): void {
  const scale = size / SPRITE_SIZE;
  for (let row = 0; row < SPRITE_SIZE; row += 1) {
    for (let col = 0; col < SPRITE_SIZE; col += 1) {
      const color = frame.pixels[row]?.[col];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

function drawPipe(ctx: CanvasRenderingContext2D, pipe: Pipe): void {
  const topH = pipe.gapY;
  const bottomY = pipe.gapY + PIPE_GAP;
  const bottomH = SKY_H - bottomY;

  ctx.fillStyle = "#243f24";
  ctx.fillRect(pipe.x, 0, PIPE_W, topH);
  ctx.fillRect(pipe.x, bottomY, PIPE_W, bottomH);

  ctx.fillStyle = "#5b8c3e";
  ctx.fillRect(pipe.x + 4, 0, PIPE_W - 8, topH);
  ctx.fillRect(pipe.x + 4, bottomY, PIPE_W - 8, bottomH);

  ctx.fillStyle = "#7fb35a";
  ctx.fillRect(pipe.x + 8, 0, 6, topH);
  ctx.fillRect(pipe.x + 8, bottomY, 6, bottomH);

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(pipe.x - 4, topH - 12, PIPE_W + 8, 12);
  ctx.fillRect(pipe.x - 4, bottomY, PIPE_W + 8, 12);

  ctx.fillStyle = "#5b8c3e";
  ctx.fillRect(pipe.x, topH - 10, PIPE_W, 8);
  ctx.fillRect(pipe.x, bottomY + 2, PIPE_W, 8);
}

function hitsPipe(pipe: Pipe, petY: number): boolean {
  const petLeft = PET_X + (PET_SIZE - PET_HITBOX) / 2;
  const petRight = petLeft + PET_HITBOX;
  const petTop = petY + (PET_SIZE - PET_HITBOX) / 2;
  const petBottom = petTop + PET_HITBOX;
  const pipeLeft = pipe.x;
  const pipeRight = pipe.x + PIPE_W;
  const inPipeX = petRight > pipeLeft && petLeft < pipeRight;
  if (!inPipeX) return false;
  return petTop < pipe.gapY || petBottom > pipe.gapY + PIPE_GAP;
}

export function FlappyBirdMiniGame({
  petName,
  species,
  mood,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(createGame());
  const statusRef = useRef<GameStatus>("ready");
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const [status, setStatus] = useState<GameStatus>("ready");
  const [score, setScore] = useState(0);

  const setGameStatus = useCallback((next: GameStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const resetAndRun = useCallback(() => {
    gameRef.current = createGame();
    setScore(0);
    setGameStatus("running");
  }, [setGameStatus]);

  const jump = useCallback(() => {
    if (statusRef.current !== "running") {
      resetAndRun();
      return;
    }
    gameRef.current.velocity = JUMP_FORCE;
  }, [resetAndRun]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(GAME_W * dpr);
    const height = Math.floor(GAME_H * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, GAME_W, GAME_H);

    ctx.fillStyle = "#a8c08a";
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = "rgba(45, 58, 31, 0.16)";
    for (let i = 0; i < 5; i += 1) {
      const x = (i * 74 + gameRef.current.frame * 0.35) % (GAME_W + 48) - 48;
      ctx.fillRect(x, 26 + (i % 3) * 18, 26, 6);
      ctx.fillRect(x + 8, 20 + (i % 3) * 18, 18, 6);
    }

    for (const pipe of gameRef.current.pipes) {
      drawPipe(ctx, pipe);
    }

    ctx.fillStyle = "#2d3a1f";
    ctx.fillRect(0, SKY_H, GAME_W, GROUND_H);
    ctx.fillStyle = "#7fb35a";
    ctx.fillRect(0, SKY_H, GAME_W, 5);
    for (let x = -((gameRef.current.frame * 2) % 16); x < GAME_W; x += 16) {
      ctx.fillStyle = "#a8c08a";
      ctx.fillRect(x, SKY_H + 8, 8, 4);
    }

    const animation = getSpeciesSprites(species)[moodToSprite(mood)];
    const frame =
      animation.frames[
        Math.floor(gameRef.current.frame / 10) % animation.frames.length
      ] ?? animation.frames[0];
    if (frame) {
      drawPixelSprite(ctx, frame, PET_X, gameRef.current.petY, PET_SIZE);
    }

  }, [mood, species]);

  useEffect(() => {
    const loop = (timestamp: number) => {
      const game = gameRef.current;
      const lastTs = lastTsRef.current ?? timestamp;
      const deltaMs = Math.min(MAX_DELTA_MS, timestamp - lastTs);
      const step = deltaMs / FRAME_MS;
      lastTsRef.current = timestamp;
      game.frame += step;

      if (statusRef.current === "running") {
        game.velocity += GRAVITY * step;
        game.petY += game.velocity * step;

        for (const pipe of game.pipes) {
          pipe.x -= PIPE_SPEED * step;
          if (!pipe.scored && pipe.x + PIPE_W < PET_X) {
            pipe.scored = true;
            game.score += 1;
            setScore(game.score);
          }
        }

        if (game.pipes[0] && game.pipes[0].x < -PIPE_W - 8) {
          game.pipes.shift();
          const lastX = game.pipes[game.pipes.length - 1]?.x ?? 250;
          game.pipes.push(makePipe(lastX + PIPE_DISTANCE));
        }

        const hitWorld = game.petY < 0 || game.petY + PET_SIZE > SKY_H;
        const hitPipe = game.pipes.some((pipe) => hitsPipe(pipe, game.petY));
        if (hitWorld || hitPipe) {
          setGameStatus("lost");
        }
      }

      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [draw, setGameStatus]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== "ArrowUp") return;
      event.preventDefault();
      jump();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jump]);

  return (
    <div className={styles.game} onPointerDown={jump}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={GAME_W}
        height={GAME_H}
        aria-label={`${petName} flappy mini-game`}
      />
      <div className={styles.hud}>
        <span>
          {status === "lost"
            ? "BONK!"
            : status === "running"
              ? `SCORE ${score}`
              : `${petName} FLAP`}
        </span>
        <button
          type="button"
          className={styles.closeBtn}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          aria-label="Close mini-game"
        >
          ×
        </button>
      </div>
      {status !== "running" && (
        <div className={styles.prompt}>
          <div>{status === "ready" ? "TAP TO START" : `SCORE ${score}`}</div>
          <button
            type="button"
            className={styles.promptBtn}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={resetAndRun}
          >
            {status === "ready" ? "START" : "RETRY"}
          </button>
        </div>
      )}
    </div>
  );
}
