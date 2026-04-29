export const SPRITE_SIZE = 32;

export type Pixel = string | null;
export type PixelGrid = Pixel[][];

export interface SpriteFrame {
  width: number;
  height: number;
  pixels: PixelGrid;
}

export interface Animation {
  frames: SpriteFrame[];
  fps: number;
  loop: boolean;
}

export type AnimationName =
  | "idle"
  | "happy"
  | "sad"
  | "eating"
  | "sleeping";

export type SpeciesSprites = Record<AnimationName, Animation>;

type Palette = Record<string, Pixel>;

function decode(palette: Palette, rows: string[]): SpriteFrame {
  if (rows.length !== SPRITE_SIZE) {
    throw new Error(
      `sprite must have ${SPRITE_SIZE} rows, got ${rows.length}`,
    );
  }
  const pixels: PixelGrid = rows.map((row, y) => {
    const padded = row.padEnd(SPRITE_SIZE, ".");
    if (padded.length > SPRITE_SIZE) {
      throw new Error(
        `row ${y} exceeds ${SPRITE_SIZE} cols (got ${padded.length})`,
      );
    }
    return Array.from(padded).map((ch) => {
      if (!(ch in palette)) {
        throw new Error(`row ${y}: unknown palette char '${ch}'`);
      }
      return palette[ch];
    });
  });
  return { width: SPRITE_SIZE, height: SPRITE_SIZE, pixels };
}

// ── Slime Creature (purple, matches design image) ──────────────────

const SLIME_PALETTE: Palette = {
  ".": null,
  o: "#2d1247",
  p: "#5a2094",
  P: "#7c35c4",
  L: "#a560e0",
  l: "#d9b5f0",
  W: "#ffffff",
  B: "#1a1a2e",
  r: "#ff8da8",
  R: "#d05676",
  z: "#ffffff",
};

// Idle frame A — neutral pose
const SLIME_IDLE_A = decode(SLIME_PALETTE, [
  "................................",
  "................................",
  "..........................oooo..",
  "..........................oPLo..",
  "..........................oLlo..",
  "..........................oooo..",
  "................................",
  "................................",
  ".........ooooooooooo............",
  "........opppppppppppo...........",
  ".......oppPPPppppppPPpo.........",
  "......opppPPllpppppPPpppo.......",
  ".....opppppllppppppplPpppo......",
  "....opppppppppppppppppppppo.....",
  "....opppWWWpppppppppWWWpppo.....",
  "...opppWWWWWpppppppWWWWWppppo...",
  "...oppWWBBWWpppppppWWBBWWpppo...",
  "...oppWWBWWppppppppWWBWWpppppo..",
  "...oppWWWWWpppppppppWWWWWppppo..",
  "...opppppppppRrppRrppppppppppo..",
  "...oppppppppprrrrrrppppppppppo..",
  "...opppppppppBBBBBBpppppppppo...",
  "...opppppppppBBBBBBpppppppppo...",
  "....oppppppppppppppppppppppo....",
  "....opppppppppppppppppppppo.....",
  ".....opppppppppppppppppppo......",
  ".....oppppppppppppppppppo.......",
  "......oooooooooooooooooo........",
  "................................",
  "................................",
  "................................",
  "................................",
]);

// Idle frame B — squish down 1px
const SLIME_IDLE_B = decode(SLIME_PALETTE, [
  "................................",
  "................................",
  "..........................oooo..",
  "..........................oPLo..",
  "..........................oLlo..",
  "..........................oooo..",
  "................................",
  "................................",
  "................................",
  "........oooooooooooooo..........",
  ".......opppppppppppppppo........",
  "......oppPPPppppppPPpppo........",
  ".....opppPPllpppppPPpppppo......",
  "....opppppllpppppppppppppo......",
  "....opppppppppppppppppppppo.....",
  "...opppWWWpppppppppWWWpppppo....",
  "...oppWWWWWpppppppWWWWWppppo....",
  "...oppWWBBWWpppppppWWBBWWppppo..",
  "...oppWWBWWppppppppWWBWWppppoo..",
  "...oppWWWWWpppppppppWWWWWpppoo..",
  "...opppppppppRrppRrppppppppppo..",
  "...opppppppppprrrrrppppppppppo..",
  "...opppppppppBBBBBBpppppppppo...",
  "....oppppppppBBBBBBppppppppo....",
  "....oppppppppppppppppppppppo....",
  ".....opppppppppppppppppppo......",
  "......oppppppppppppppppo........",
  "........oooooooooooooo..........",
  "................................",
  "................................",
  "................................",
  "................................",
]);

// Happy — wider body, arc eyes
const SLIME_HAPPY_A = decode(SLIME_PALETTE, [
  "................................",
  "................................",
  "..........................oooo..",
  "..........................oPLo..",
  "..........................oLlo..",
  "..........................oooo..",
  "................................",
  "................................",
  "........ooooooooooooo...........",
  ".......opppppppppppppo..........",
  "......oppPPPPpppppPPPPpo........",
  ".....oppppPlllppppPlllppppo.....",
  "....opppppllppppppppllppppppo...",
  "...opppppppppppppppppppppppppo..",
  "...oppppBBBBppppppppBBBBpppppo..",
  "...oppBBWWBBppppppBBWWBBpppppo..",
  "...opppBBBBppppppppBBBBppppppo..",
  "...oppppppppppppppppppppppppo...",
  "...opppppppRrrrrrrrrRppppppo....",
  "...oppppppRrrrBBBBrrrrRpppo.....",
  "...oppppppppBBBBBBBBpppppppo....",
  "...ooppppppppBBBBBBppppppppo....",
  "....oppppppppppppppppppppppo....",
  "....opppppppppppppppppppppo.....",
  ".....opppppppppppppppppppo......",
  ".....oppppppppppppppppppo.......",
  "......oooooooooooooooooo........",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
]);

const SLIME_HAPPY_B = decode(SLIME_PALETTE, [
  "................................",
  "................................",
  "..........................oooo..",
  "..........................oPLo..",
  "..........................oLlo..",
  "..........................oooo..",
  "................................",
  "................................",
  "................................",
  ".......oooooooooooooo...........",
  "......opppppppppppppppo.........",
  ".....oppPPPPpppppPPPPpppo.......",
  "....oppppPlllppppPlllpppppo.....",
  "....oppppllpppppppppllpppppo....",
  "...opppppppppppppppppppppppo....",
  "...oppppBBBBppppppppBBBBpppo....",
  "...oppBBWWBBppppppBBWWBBpppppo..",
  "...opppBBBBppppppppBBBBpppppo...",
  "...oppppppppppppppppppppppppo...",
  "...opppppppRrrrrrrrrRppppppo....",
  "...oppppppRrrrBBBBrrrrRpppo.....",
  "...oppppppppBBBBBBBBpppppppo....",
  "....opppppppppBBBBBBppppppo.....",
  "....opppppppppppppppppppppo.....",
  ".....opppppppppppppppppppo......",
  "......opppppppppppppppppo.......",
  ".......oooooooooooooooo.........",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
]);

// Sad — flattened, droopy eyes
const SLIME_SAD_A = decode(SLIME_PALETTE, [
  "................................",
  "................................",
  "..........................oooo..",
  "..........................oppo..",
  "..........................oppo..",
  "..........................oooo..",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "..........ooooooooooo...........",
  ".........opppppppppppo..........",
  "........opppPppppppPppo.........",
  ".......oppppppppppppppppo.......",
  "......opppWWWppppppppWWWpppo....",
  "......oppWWBWppppppppWBWWppo....",
  "......oppWBBWppppppppWBBWppo....",
  "......oppWWWWppppppppWWWWppo....",
  "......opppppppRrppRrpppppppo....",
  "......oppppppRrrrrrrrrrppppo....",
  "......oppppppppRrrrRRppppppo....",
  "......oppppppppppppppppppppo....",
  ".......oppppppppppppppppppo.....",
  "........oppppppppppppppppo......",
  ".........oooooooooooooooo.......",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
]);

const SLIME_SAD_B = SLIME_SAD_A;

// Eating — mouth open wide
const SLIME_EATING_A = decode(SLIME_PALETTE, [
  "................................",
  "................................",
  "..........................oooo..",
  "..........................oPLo..",
  "..........................oLlo..",
  "..........................oooo..",
  "................................",
  "................................",
  ".........ooooooooooo............",
  "........opppppppppppo...........",
  ".......oppPPPppppppPPpo.........",
  "......opppPPllpppppPPpppo.......",
  ".....opppppllppppppplPpppo......",
  "....opppppppppppppppppppppo.....",
  "....opppWWWpppppppppWWWpppo.....",
  "...opppWWBBWpppppppWBBWWppppo...",
  "...oppWBBWWppppppppWWBBWpppo....",
  "...oppWWWWppppppppppWWWWppppo...",
  "...opppppppppppppppppppppppo....",
  "...opppppppRRRRRRRRRRpppppo.....",
  "...ooppppprBBBBBBBBBBrpppppo....",
  "...opppppprBBBBBBBBBBrppppo.....",
  "...oppppppprBBBBBBBBrpppppo.....",
  "....opppppppRRRRRRRRppppppo.....",
  "....opppppppppppppppppppppo.....",
  ".....opppppppppppppppppppo......",
  ".....oppppppppppppppppppo.......",
  "......oooooooooooooooooo........",
  "................................",
  "................................",
  "................................",
  "................................",
]);

const SLIME_EATING_B = decode(SLIME_PALETTE, [
  "................................",
  "................................",
  "..........................oooo..",
  "..........................oPLo..",
  "..........................oLlo..",
  "..........................oooo..",
  "................................",
  "................................",
  ".........ooooooooooo............",
  "........opppppppppppo...........",
  ".......oppPPPppppppPPpo.........",
  "......opppPPllpppppPPpppo.......",
  ".....opppppllppppppplPpppo......",
  "....opppppppppppppppppppppo.....",
  "....opppWWWpppppppppWWWpppo.....",
  "...opppWWWWWpppppppWWWWWppppo...",
  "...oppWWBWWppppppppWWBWWpppo....",
  "...oppWWWWWpppppppppWWWWWpppo...",
  "...opppppppppppppppppppppppo....",
  "...opppppppRRRRRRRRRRpppppo.....",
  "...ooppppprrBBBBBBBBrrppppo.....",
  "...oppppppprrBBBBBBrrpppppo.....",
  "...opppppppprrBBBBrrppppppo.....",
  "....opppppppRRRRRRRRppppppo.....",
  "....opppppppppppppppppppppo.....",
  ".....opppppppppppppppppppo......",
  ".....oppppppppppppppppppo.......",
  "......oooooooooooooooooo........",
  "................................",
  "................................",
  "................................",
  "................................",
]);

// Sleeping — closed eyes, zzz
const SLIME_SLEEPING_A = decode(SLIME_PALETTE, [
  "................................",
  "................................",
  ".....zzzz.......................",
  "......zz........................",
  ".....z..........................",
  "....zzzz.......zz...............",
  "................z...............",
  "...............z................",
  "..............zzz...............",
  "................................",
  ".........ooooooooooooo..........",
  "........opppppppppppppo.........",
  ".......oppPPPppppppPPpppo.......",
  "......opppppllppppppplppppo.....",
  ".....opppppppppppppppppppppo....",
  "....oppppppppppppppppppppppppo..",
  "....oppBBBBBBppppppBBBBBBppppo..",
  "....oppppppppppppppppppppppppo..",
  "....oppppppppppRrrRppppppppppo..",
  "....oppppppppppprrppppppppppo...",
  "....oppppppppppBBBBpppppppppo...",
  "....oppppppppppppppppppppppo....",
  ".....oppppppppppppppppppppo.....",
  ".....opppppppppppppppppppo......",
  "......oppppppppppppppppo........",
  ".......oooooooooooooooo.........",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
]);

const SLIME_SLEEPING_B = decode(SLIME_PALETTE, [
  "................................",
  "................................",
  "................................",
  ".....zzzz.......................",
  "......zz........................",
  ".....z..........................",
  "....zzzz.......zzzz.............",
  "................zz..............",
  "...............z................",
  "..............zzzz..............",
  ".........ooooooooooooo..........",
  "........opppppppppppppo.........",
  ".......oppPPPppppppPPpppo.......",
  "......opppppllppppppplppppo.....",
  ".....opppppppppppppppppppppo....",
  "....oppppppppppppppppppppppppo..",
  "....oppBBBBBBppppppBBBBBBppppo..",
  "....oppppppppppppppppppppppppo..",
  "....oppppppppppRrrRppppppppppo..",
  "....oppppppppppprrppppppppppo...",
  "....oppppppppppBBBBpppppppppo...",
  "....oppppppppppppppppppppppo....",
  ".....oppppppppppppppppppppo.....",
  ".....opppppppppppppppppppo......",
  "......oppppppppppppppppo........",
  ".......oooooooooooooooo.........",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
]);

// ── Shadow Cat (dark sitting cat) ──────────────────────────────

const CAT_PALETTE: Palette = {
  ".": null,
  o: "#0a0512",
  c: "#1f1434",
  C: "#2d1f4a",
  L: "#443a6b",
  W: "#ffffff",
  B: "#1a1a2e",
  y: "#f5d042",
  Y: "#c49820",
  r: "#d46a8a",
  z: "#ffffff",
};

const CAT_IDLE_A = decode(CAT_PALETTE, [
  "................................",
  "................................",
  "................................",
  "......oo..............oo........",
  ".....oCCo............oCCo.......",
  "....oCCCCo..........oCCCCo......",
  "...oCCCCCCo........oCCCCCCo.....",
  "...oCCCCCCCooooooooCCCCCCCo.....",
  "...oCCCCCCCCCCCCCCCCCCCCCCo.....",
  "...oCCCCCCCCCCCCCCCCCCCCCCo.....",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "....oCCCyyyCCCCCCCCCyyyCCo......",
  "....oCCyYyYyCCCCCCCyYyYyCo......",
  "....oCCCyByCCCCCCCCCyByCCo......",
  "....oCCCCyCCCCCCCCCCCyCCCo......",
  "....oCCCCCCCCCrrCCCCCCCCCo......",
  "....oCCCCCCCCCWWCCCCCCCCCo......",
  "....oCCCCCCCCCBBCCCCCCCCCo......",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "....oCCCCCCCCCCCCCCCCCCCo.......",
  "...oCCCCCCCCCCCCCCCCCCCCo.......",
  "..oCCCCCCCCCCCCCCCCCCCCCCo......",
  ".oCCCCCCCCoCCCCCCCCoCCCCCCo.....",
  ".oCCCCCCoooCCCCCCoooCCCCCCo.....",
  ".ooooooooooCCCCCCoooooooooo.....",
  "...........oooooo...............",
  "................................",
  "................................",
  "................................",
]);

const CAT_IDLE_B = decode(CAT_PALETTE, [
  "................................",
  "................................",
  "................................",
  "......oo..............oo........",
  ".....oCCo............oCCo.......",
  "....oCCCCo..........oCCCCo......",
  "...oCCCCCCo........oCCCCCCo.....",
  "...oCCCCCCCooooooooCCCCCCCo.....",
  "...oCCCCCCCCCCCCCCCCCCCCCCo.....",
  "...oCCCCCCCCCCCCCCCCCCCCCCo.....",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "....oCCCyyyCCCCCCCCCyyyCCo......",
  "....oCCyYyYyCCCCCCCyYyYyCo......",
  "....oCCCyByCCCCCCCCCyByCCo......",
  "....oCCCCyCCCCCCCCCCCyCCCo......",
  "....oCCCCCCCCCrrCCCCCCCCCo......",
  "....oCCCCCCCCCWWCCCCCCCCCo......",
  "....oCCCCCCCCCBBCCCCCCCCCo......",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "...oCCCCCCCCCCCCCCCCCCCCo.......",
  "..oCCCCCCCCCCCCCCCCCCCCo........",
  ".oCCCCCCCCCCCCCCCCCCCCCCo.......",
  ".oCCCCCCCCoCCCCCCCCoCCCCCCo.....",
  ".oCCCCCCoooCCCCCCoooCCCCCCCCCooo",
  ".ooooooooooCCCCCCooooooooooCCCCo",
  "...........oooooo..........oCCo.",
  "............................oo.",
  "................................",
  "................................",
]);

const CAT_HAPPY_A = decode(CAT_PALETTE, [
  "................................",
  "................................",
  ".......oo..............oo.......",
  "......oCCo............oCCo......",
  ".....oCLLCo..........oCLLCo.....",
  "....oCLLLLCo........oCLLLLCo....",
  "...oCLLLLLLCoooooooCLLLLLLLCo...",
  "...oCCCCCCCCCCCCCCCCCCCCCCCCo...",
  "...oCCCCCCCCCCCCCCCCCCCCCCCCo...",
  "...oCCCCCCCCCCCCCCCCCCCCCCCCo...",
  "....oCCCCCCCCCCCCCCCCCCCCCCo....",
  "....oCCyyyyyCCCCCCCyyyyyCCCo....",
  "....oCCyWWWyCCCCCCCyWWWyCCCo....",
  "....oCCCyByyCCCCCCCCyByyCCCo....",
  "....oCCCCyCCCCCCCCCCCyCCCCo.....",
  "....oCCCCCCCCrrrrCCCCCCCCCo.....",
  "....oCCCCCCCWWWWWWCCCCCCCCo.....",
  "....oCCCCCCCBBBBBBCCCCCCCCo.....",
  "....oCCCCCCCCBBBBCCCCCCCCCo.....",
  "....oCCCCCCCCCCCCCCCCCCCCCo.....",
  "....oCCCCCCCCCCCCCCCCCCCCCo.....",
  "....oCCCCCCCCCCCCCCCCCCCCCo.....",
  "...oCCCCCCCCCCCCCCCCCCCCCo......",
  "..oCCCCCCCCCCCCCCCCCCCCCCo......",
  ".oCCCCCCCCCCCCCCCCCCCCCCCCo.....",
  ".oCCCCCCCCoCCCCCCCCoCCCCCCCo....",
  ".oCCCCCCoooCCCCCCoooCCCCCCCo....",
  ".ooooooooooCCCCCCooooooooooo....",
  "...........oooooo...............",
  "................................",
  "................................",
  "................................",
]);

const CAT_HAPPY_B = CAT_HAPPY_A;

const CAT_SAD_A = decode(CAT_PALETTE, [
  "................................",
  "................................",
  "................................",
  ".........oo..........oo.........",
  "........oCCo........oCCo........",
  ".......oCCCCoooooooCCCCo........",
  ".......oCCCCCCCCCCCCCCCo........",
  "......oCCCCCCCCCCCCCCCCCo.......",
  "......oCCCCCCCCCCCCCCCCCo.......",
  "......oCCCCCCCCCCCCCCCCCo.......",
  "......oCCCyyyCCCCCyyyCCCo.......",
  "......oCCyYByyCCCyyBYyCCo.......",
  "......oCCCyyyyCCCyyyyCCCo.......",
  "......oCCCCCCCCCCCCCCCCCo.......",
  "......oCCCCCCCCrrCCCCCCCo.......",
  "......oCCCCCCCBBBBCCCCCCo.......",
  "......oCCCCCCCBBBBBBCCCCo.......",
  "......oCCCCCCCCCCCCCCCCCo.......",
  "......oCCCCCCCCCCCCCCCCCo.......",
  ".....oCCCCCCCCCCCCCCCCCCo.......",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "...oCCCCCCCCCCCCCCCCCCCCCo......",
  "..oCCCCCCCCCCCCCCCCCCCCCCCo.....",
  ".oCCCCCCCCoCCCCCCCCoCCCCCCCo....",
  ".oCCCCCCoooCCCCCCoooCCCCCCCo....",
  ".ooooooooooCCCCCCooooooooooo....",
  "...........oooooo...............",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
]);

const CAT_SAD_B = CAT_SAD_A;

const CAT_EATING_A = decode(CAT_PALETTE, [
  "................................",
  "................................",
  "................................",
  "................................",
  "......oo..............oo........",
  ".....oCCo............oCCo.......",
  "....oCCCCo..........oCCCCo......",
  "...oCCCCCCoooooooooCCCCCCo......",
  "...oCCCCCCCCCCCCCCCCCCCCCCo.....",
  "...oCCCCCCCCCCCCCCCCCCCCCCo.....",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "....oCCCyyyCCCCCCCCCyyyCCo......",
  "....oCCyYyYyCCCCCCCyYyYyCo......",
  "....oCCCyByCCCCCCCCCyByCCo......",
  "....oCCCCCCCCrrrrCCCCCCCCo......",
  "....oCCCCCCCrBBBBrCCCCCCCo......",
  "....oCCCCCCCrBBBBrCCCCCCCo......",
  "....oCCCCCCCCrrrrCCCCCCCCo......",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "....oCCCCCCCCCCCCCCCCCCCCo......",
  "...oCCCCCCCCCCCCCCCCCCCCo.......",
  "..oCCCCCCCCCCCCCCCCCCCCo........",
  ".oCCCCCCCCoCCCCCCCCoCCCCCo......",
  ".oCCCCCCoooCCCCCCoooCCCCCo......",
  ".ooooooooooCCCCCCoooooooooo.....",
  "...........oooooo...............",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
]);

const CAT_EATING_B = CAT_EATING_A;

const CAT_SLEEPING_A = decode(CAT_PALETTE, [
  "................................",
  "................................",
  ".....zzzz.......................",
  "......zz........................",
  ".....z..........................",
  "....zzzz.......zzz..............",
  "................z...............",
  "...............z................",
  "..............zzz...............",
  "................................",
  "................................",
  ".....oooo..........oooo.........",
  "....oCCCCooooooooooCCCCo........",
  "...oCCCCCCCCCCCCCCCCCCCCo.......",
  "..oCCCCCCCCCCCCCCCCCCCCCCo......",
  ".oCCCCCCCCCCCCCCCCCCCCCCCCo.....",
  ".oCCBBBBCCCCCCCCCCCCBBBBCCo.....",
  ".oCCCCCCCCCCCrrCCCCCCCCCCCo.....",
  "oCCCCCCCCCCCCCCCCCCCCCCCCCCo....",
  "oCCCCCCCCCCCCCCCCCCCCCCCCCCo....",
  "oCCCCCCCCCCCCCCCCCCCCCCCCCCo....",
  "oCCCCCCCCCCCCCCCCCCCCCCCCCCo....",
  "oCCCCCCCCCCCCCCCCCCCCCCCCCCo....",
  ".oCCCCCCCCCCCCCCCCCCCCCCCCo.....",
  ".oCCCCCCCCCCCCCCCCCCCCCCCCo.....",
  "..oCCCCCCCCCCCCCCCCCCCCCCo......",
  "...ooCCCCCCCCCCCCCCCCCCoo.......",
  ".....oooCCCCCCCCCCCCooo.........",
  "........ooooooooooooo...........",
  "................................",
  "................................",
  "................................",
]);

const CAT_SLEEPING_B = CAT_SLEEPING_A;

// ── Species registry ──────────────────────────────────────────────

export const SPECIES_SPRITES: Record<string, SpeciesSprites> = {
  "slime creature": {
    idle: { frames: [SLIME_IDLE_A, SLIME_IDLE_B], fps: 2, loop: true },
    happy: { frames: [SLIME_HAPPY_A, SLIME_HAPPY_B], fps: 3, loop: true },
    sad: { frames: [SLIME_SAD_A, SLIME_SAD_B], fps: 1, loop: true },
    eating: { frames: [SLIME_EATING_A, SLIME_EATING_B], fps: 4, loop: true },
    sleeping: {
      frames: [SLIME_SLEEPING_A, SLIME_SLEEPING_B],
      fps: 1,
      loop: true,
    },
  },
  "shadow cat": {
    idle: { frames: [CAT_IDLE_A, CAT_IDLE_B], fps: 2, loop: true },
    happy: { frames: [CAT_HAPPY_A, CAT_HAPPY_B], fps: 3, loop: true },
    sad: { frames: [CAT_SAD_A, CAT_SAD_B], fps: 1, loop: true },
    eating: { frames: [CAT_EATING_A, CAT_EATING_B], fps: 4, loop: true },
    sleeping: {
      frames: [CAT_SLEEPING_A, CAT_SLEEPING_B],
      fps: 1,
      loop: true,
    },
  },
};

/** Fallback sprite for species without custom art — a simple colored blob. */
function makeFallbackSpecies(baseColor: string, accent: string): SpeciesSprites {
  const palette: Palette = {
    ".": null,
    o: "#222222",
    c: baseColor,
    a: accent,
    W: "#ffffff",
    B: "#1a1a2e",
    r: "#ff8da8",
    z: "#ffffff",
  };

  const idleA = decode(palette, [
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "............oooooooo............",
    "..........oocccccccccoo.........",
    ".........occccccaccccccco.......",
    "........occcaccccccccacccco.....",
    ".......occcccccccccccccccco.....",
    "......ocacccccccccccccccacco....",
    "......ocacccccccccccccccacco....",
    "......occcWWcccccccccWWcccco....",
    "......occWBWccccccccWBWccccco...",
    "......occWBWccccccccWBWccccco...",
    "......occcWcccccccccWccccccco...",
    "......occccccccrrccccccccccco...",
    "......occccccrrrrrrccccccccco...",
    "......occccccBBBBBBccccccccco...",
    "......occccccBBBBBBccccccccco...",
    "......occcccccccccccccccccco....",
    ".......occcccccccccccccccco.....",
    "........oaccccccccccccccao......",
    ".........occccccccccccco........",
    "..........ooccccccccccoo........",
    "............oooooooooo..........",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
  ]);

  const idleB = decode(palette, [
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "............oooooooo............",
    "..........oocccccccccoo.........",
    ".........occccccaccccccco.......",
    "........occcaccccccccacccco.....",
    ".......occcccccccccccccccco.....",
    "......ocacccccccccccccccacco....",
    "......ocacccccccccccccccacco....",
    "......occcWWcccccccccWWcccco....",
    "......occWBWccccccccWBWccccco...",
    "......occWBWccccccccWBWccccco...",
    "......occcWcccccccccWccccccco...",
    "......occccccccrrccccccccccco...",
    "......occccccrrrrrrccccccccco...",
    "......occccccBBBBBBccccccccco...",
    "......occccccBBBBBBccccccccco...",
    "......occcccccccccccccccccco....",
    ".......occcccccccccccccccco.....",
    "........oaccccccccccccccao......",
    ".........occccccccccccco........",
    "..........ooccccccccccoo........",
    "............oooooooooo..........",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
  ]);

  return {
    idle: { frames: [idleA, idleB], fps: 2, loop: true },
    happy: { frames: [idleA, idleB], fps: 3, loop: true },
    sad: { frames: [idleA, idleB], fps: 1, loop: true },
    eating: { frames: [idleA, idleB], fps: 4, loop: true },
    sleeping: { frames: [idleA, idleB], fps: 1, loop: true },
  };
}

export const FALLBACK_SPRITES: Record<string, SpeciesSprites> = {
  "cloud puff": makeFallbackSpecies("#e8e8ff", "#b0b0e0"),
  "fire sprite": makeFallbackSpecies("#ff7a3d", "#c44020"),
  "crystal turtle": makeFallbackSpecies("#4a9a8e", "#2d665c"),
};

export function getSpeciesSprites(species: string): SpeciesSprites {
  return (
    SPECIES_SPRITES[species] ??
    FALLBACK_SPRITES[species] ??
    makeFallbackSpecies("#7c35c4", "#5a2094")
  );
}
