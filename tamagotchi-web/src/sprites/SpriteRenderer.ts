import {
  getSpeciesSprites,
  SPRITE_SIZE,
  type Animation,
  type AnimationName,
} from "./SpriteData";

export type ParticleType = "zzz" | "hearts" | "notes" | "sparkle" | null;

interface Particle {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  shape: "dot" | "heart" | "note" | "sparkle" | "z";
}

interface ScheduledAnim {
  species: string;
  name: AnimationName;
  onComplete: () => void;
  elapsed: number;
}

export class SpriteRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pixelScale: number;

  private species: string = "slime creature";
  private animName: AnimationName = "idle";
  private animation: Animation;
  private frameIndex = 0;
  private frameTimer = 0;

  private oneShot: ScheduledAnim | null = null;

  private particles: Particle[] = [];
  private particleType: ParticleType = null;
  private particleSpawnTimer = 0;

  private bgEnabled = true;

  constructor(canvas: HTMLCanvasElement, pixelScale: number = 4) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.pixelScale = pixelScale;
    this.animation = getSpeciesSprites(this.species).idle;
  }

  setAnimation(species: string, name: AnimationName): void {
    const sameAnim = species === this.species && name === this.animName;
    this.species = species;
    this.animName = name;
    this.animation = getSpeciesSprites(species)[name];
    if (!sameAnim) {
      this.frameIndex = 0;
      this.frameTimer = 0;
    }
  }

  playOnce(
    species: string,
    name: AnimationName,
    onComplete: () => void,
  ): void {
    this.oneShot = { species, name, onComplete, elapsed: 0 };
    this.species = species;
    this.animName = name;
    this.animation = getSpeciesSprites(species)[name];
    this.frameIndex = 0;
    this.frameTimer = 0;
  }

  setParticles(type: ParticleType): void {
    if (type !== this.particleType) {
      this.particleType = type;
      this.particles = [];
      this.particleSpawnTimer = 0;
    }
  }

  setBackgroundEnabled(enabled: boolean): void {
    this.bgEnabled = enabled;
  }

  update(deltaMs: number): void {
    const frameDurMs = 1000 / Math.max(1, this.animation.fps);
    this.frameTimer += deltaMs;
    while (this.frameTimer >= frameDurMs) {
      this.frameTimer -= frameDurMs;
      this.frameIndex += 1;
    }

    const lastFrame = this.animation.frames.length - 1;
    if (this.oneShot) {
      this.oneShot.elapsed += deltaMs;
      const totalMs = this.animation.frames.length * frameDurMs;
      if (this.oneShot.elapsed >= totalMs) {
        const done = this.oneShot.onComplete;
        this.oneShot = null;
        done();
      } else if (this.frameIndex > lastFrame) {
        this.frameIndex = lastFrame;
      }
    } else if (this.frameIndex > lastFrame) {
      this.frameIndex = this.animation.loop ? 0 : lastFrame;
    }

    this.updateParticles(deltaMs);
  }

  private updateParticles(deltaMs: number): void {
    for (const p of this.particles) {
      p.y += (p.vy * deltaMs) / 1000;
      p.life -= deltaMs;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    if (this.particleType) {
      this.particleSpawnTimer += deltaMs;
      const spawnEveryMs = 700;
      if (this.particleSpawnTimer >= spawnEveryMs) {
        this.particleSpawnTimer = 0;
        this.spawnParticle();
      }
    }
  }

  private spawnParticle(): void {
    const cssW = this.canvas.clientWidth || this.canvas.width;
    const cssH = this.canvas.clientHeight || this.canvas.height;
    const spriteW = SPRITE_SIZE * this.pixelScale;
    const spriteH = SPRITE_SIZE * this.pixelScale;
    const centerX = cssW / 2;
    const topY = (cssH - spriteH) / 2;

    const shapeMap: Record<NonNullable<ParticleType>, Particle["shape"]> = {
      zzz: "z",
      hearts: "heart",
      notes: "note",
      sparkle: "sparkle",
    };
    const colorMap: Record<NonNullable<ParticleType>, string> = {
      zzz: "#ffffff",
      hearts: "#ff4d8a",
      notes: "#7c35c4",
      sparkle: "#ffe066",
    };
    const type = this.particleType!;
    const jitter = (Math.random() - 0.5) * spriteW * 0.6;
    this.particles.push({
      x: centerX + jitter,
      y: topY + spriteH * 0.2,
      vy: -20 - Math.random() * 15,
      life: 2500,
      maxLife: 2500,
      color: colorMap[type],
      shape: shapeMap[type],
    });
  }

  render(): void {
    const dpr = window.devicePixelRatio || 1;
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;
    const targetW = Math.floor(cssW * dpr);
    const targetH = Math.floor(cssH * dpr);
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cssW, cssH);

    if (this.bgEnabled) {
      this.drawBackground(cssW, cssH);
    }

    this.drawSprite(cssW, cssH);
    this.drawParticles();
  }

  private drawBackground(w: number, h: number): void {
    const colors = this.bgColorsForTime();
    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, colors.top);
    grad.addColorStop(1, colors.bottom);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }

  private bgColorsForTime(): { top: string; bottom: string } {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) {
      return { top: "#ffd4a3", bottom: "#ffaa7a" };
    }
    if (hour >= 9 && hour < 17) {
      return { top: "#b0dff7", bottom: "#7bc67e" };
    }
    if (hour >= 17 && hour < 20) {
      return { top: "#ff9a5c", bottom: "#ffb37a" };
    }
    return { top: "#1a1a3d", bottom: "#2d2a5a" };
  }

  private drawSprite(cssW: number, cssH: number): void {
    const frame =
      this.animation.frames[
        Math.min(this.frameIndex, this.animation.frames.length - 1)
      ];
    const spriteW = SPRITE_SIZE * this.pixelScale;
    const spriteH = SPRITE_SIZE * this.pixelScale;
    const offsetX = Math.floor((cssW - spriteW) / 2);
    const offsetY = Math.floor((cssH - spriteH) / 2);

    for (let y = 0; y < SPRITE_SIZE; y++) {
      for (let x = 0; x < SPRITE_SIZE; x++) {
        const color = frame.pixels[y][x];
        if (!color) continue;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
          offsetX + x * this.pixelScale,
          offsetY + y * this.pixelScale,
          this.pixelScale,
          this.pixelScale,
        );
      }
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const s = this.pixelScale;
      switch (p.shape) {
        case "z":
          ctx.font = `${s * 4}px "Silkscreen", monospace`;
          ctx.textAlign = "center";
          ctx.fillText("z", p.x, p.y);
          break;
        case "heart":
          ctx.fillRect(p.x - s, p.y - s, s, s);
          ctx.fillRect(p.x + s, p.y - s, s, s);
          ctx.fillRect(p.x - s * 2, p.y, s * 5, s);
          ctx.fillRect(p.x - s, p.y + s, s * 3, s);
          ctx.fillRect(p.x, p.y + s * 2, s, s);
          break;
        case "note":
          ctx.fillRect(p.x, p.y, s, s * 3);
          ctx.fillRect(p.x - s, p.y + s * 3, s * 2, s);
          break;
        case "sparkle":
          ctx.fillRect(p.x, p.y - s, s, s);
          ctx.fillRect(p.x - s, p.y, s * 3, s);
          ctx.fillRect(p.x, p.y + s, s, s);
          break;
        case "dot":
          ctx.fillRect(p.x, p.y, s, s);
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}
