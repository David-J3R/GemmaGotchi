type StatKind = "hunger" | "happiness" | "energy" | "health";

interface Props {
  kind: StatKind;
  size?: number;
  color?: string;
  className?: string;
}

const PIXELS: Record<StatKind, string[]> = {
  hunger: [
    "1,0","3,0","5,0",
    "1,1","3,1","5,1",
    "1,2","3,2","5,2",
    "1,3","2,3","3,3","4,3","5,3",
    "3,4","3,5","3,6","3,7",
  ],
  happiness: [
    "1,1","2,1","5,1","6,1",
    "0,2","1,2","2,2","3,2","4,2","5,2","6,2","7,2",
    "0,3","1,3","2,3","3,3","4,3","5,3","6,3","7,3",
    "1,4","2,4","3,4","4,4","5,4","6,4",
    "2,5","3,5","4,5","5,5",
    "3,6","4,6",
  ],
  energy: [
    "4,0","5,0",
    "3,1","4,1",
    "2,2","3,2","4,2","5,2",
    "3,3","4,3",
    "2,4","3,4","4,4","5,4",
    "3,5","4,5",
    "2,6","3,6",
  ],
  health: [
    "3,1","4,1",
    "3,2","4,2",
    "1,3","2,3","3,3","4,3","5,3","6,3",
    "1,4","2,4","3,4","4,4","5,4","6,4",
    "3,5","4,5",
    "3,6","4,6",
  ],
};

export function StatIcon({ kind, size = 16, color = "currentColor", className }: Props) {
  const pixels = PIXELS[kind];
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
