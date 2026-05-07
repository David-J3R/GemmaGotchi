import type { PetMood } from "../engine/types";

interface Props {
  mood: PetMood;
  size?: number;
  color?: string;
  className?: string;
}

const PIXELS: Record<PetMood, string[]> = {
  ecstatic: [
    "2,2","5,2","2,3","5,3",
    "1,5","2,5","3,5","4,5","5,5","6,5",
    "2,6","5,6",
    "0,1","7,1",
  ],
  happy: [
    "2,2","5,2",
    "2,5","5,5",
    "3,6","4,6",
  ],
  content: [
    "2,2","5,2",
    "3,5","4,5",
  ],
  bored: [
    "2,2","5,2",
    "2,5","3,5","4,5","5,5",
  ],
  sad: [
    "2,2","5,2",
    "3,6","4,6",
    "2,5","5,5",
  ],
  angry: [
    "1,1","2,2","5,2","6,1",
    "2,3","5,3",
    "2,5","5,5","3,6","4,6",
  ],
  sick: [
    "1,2","3,2","1,3","3,3",
    "5,2","6,2","6,3","5,3",
    "2,5","3,5","4,5","5,5",
  ],
  exhausted: [
    "1,2","2,2","3,2",
    "5,2","6,2",
    "3,5","4,5",
    "6,0",
  ],
  starving: [
    "2,2","3,2","4,2","5,2",
    "2,3","5,3",
    "3,5","4,5","2,5","5,5","2,6","3,6","4,6","5,6",
  ],
  critical: [
    "1,2","2,2","3,2","1,3","3,3",
    "4,2","5,2","6,2","4,3","6,3",
    "1,5","2,5","3,5","4,5","5,5","6,5",
    "2,6","4,6","6,6",
  ],
};

export function MoodIcon({ mood, size = 16, color = "currentColor", className }: Props) {
  const pixels = PIXELS[mood];
  return (
    <svg
      className={`pixel ${className ?? ""}`}
      width={size}
      height={size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      aria-hidden
    >
      {pixels.map((p, i) => {
        const [x, y] = p.split(",");
        return <rect key={i} x={x} y={y} width={1} height={1} fill={color} />;
      })}
    </svg>
  );
}
