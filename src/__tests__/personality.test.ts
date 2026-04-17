import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generatePersonality, buildPersonalityPrompt, parsePersonalityResponse } from "../personality.js";
import type { PetPersonality } from "../personality.js";

describe("generatePersonality", () => {
  it("generates a valid personality for a known species", () => {
    const p = generatePersonality("slime creature");
    assert.ok(p.traits.playfulness >= 0 && p.traits.playfulness <= 100);
    assert.ok(p.traits.curiosity >= 0 && p.traits.curiosity <= 100);
    assert.ok(p.traits.affection >= 0 && p.traits.affection <= 100);
    assert.ok(p.traits.sass >= 0 && p.traits.sass <= 100);
    assert.ok(p.traits.energy >= 0 && p.traits.energy <= 100);
    assert.ok(p.likes.length > 0);
    assert.ok(p.dislikes.length > 0);
    assert.ok(p.speechStyle.quirks.length > 0);
  });

  it("slime creature has high affection and low sass on average", () => {
    // Generate many and check the average stays near template values
    let totalAffection = 0;
    let totalSass = 0;
    const runs = 50;
    for (let i = 0; i < runs; i++) {
      const p = generatePersonality("slime creature");
      totalAffection += p.traits.affection;
      totalSass += p.traits.sass;
    }
    const avgAffection = totalAffection / runs;
    const avgSass = totalSass / runs;
    assert.ok(avgAffection > 70, `Average affection ${avgAffection} should be > 70`);
    assert.ok(avgSass < 35, `Average sass ${avgSass} should be < 35`);
  });

  it("shadow cat has high sass and high curiosity on average", () => {
    let totalSass = 0;
    let totalCuriosity = 0;
    const runs = 50;
    for (let i = 0; i < runs; i++) {
      const p = generatePersonality("shadow cat");
      totalSass += p.traits.sass;
      totalCuriosity += p.traits.curiosity;
    }
    const avgSass = totalSass / runs;
    const avgCuriosity = totalCuriosity / runs;
    assert.ok(avgSass > 70, `Average sass ${avgSass} should be > 70`);
    assert.ok(avgCuriosity > 70, `Average curiosity ${avgCuriosity} should be > 70`);
  });

  it("shadow cat and slime creature produce different speech styles", () => {
    const slime = generatePersonality("slime creature");
    const cat = generatePersonality("shadow cat");
    assert.equal(slime.speechStyle.vocabulary, "baby");
    assert.equal(cat.speechStyle.vocabulary, "articulate");
  });

  it("uses default template for unknown species", () => {
    const p = generatePersonality("unknown blob thing");
    assert.ok(p.traits.playfulness >= 0 && p.traits.playfulness <= 100);
    assert.equal(p.speechStyle.vocabulary, "casual");
    assert.equal(p.speechStyle.expressiveness, "moderate");
  });

  it("is case-insensitive for species lookup", () => {
    const p = generatePersonality("Shadow Cat");
    assert.equal(p.speechStyle.vocabulary, "articulate");
  });

  it("generates personalities for all five defined species", () => {
    const species = ["slime creature", "shadow cat", "cloud puff", "fire sprite", "crystal turtle"];
    for (const s of species) {
      const p = generatePersonality(s);
      assert.ok(p.traits.playfulness >= 0 && p.traits.playfulness <= 100, `${s} playfulness in range`);
      assert.ok(p.likes.length > 0, `${s} has likes`);
      assert.ok(p.dislikes.length > 0, `${s} has dislikes`);
      assert.ok(p.speechStyle.quirks.length > 0, `${s} has quirks`);
    }
  });
});

describe("buildPersonalityPrompt", () => {
  it("produces readable natural language output", () => {
    const personality: PetPersonality = {
      traits: { playfulness: 92, curiosity: 78, affection: 85, sass: 20, energy: 60 },
      likes: ["puddles", "shiny things"],
      dislikes: ["dry air", "loud noises"],
      speechStyle: {
        vocabulary: "baby",
        expressiveness: "dramatic",
        quirks: ["speaks in third person", "adds 'bloop' when excited"],
      },
    };

    const prompt = buildPersonalityPrompt(personality);

    // Should contain trait descriptions with values
    assert.ok(prompt.includes("playfulness (92/100)"), "Should include playfulness value");
    assert.ok(prompt.includes("curiosity (78/100)"), "Should include curiosity value");
    assert.ok(prompt.includes("affection (85/100)"), "Should include affection value");
    assert.ok(prompt.includes("sass (20/100)"), "Should include sass value");

    // Should contain speech style info
    assert.ok(prompt.includes("baby-talk"), "Should describe baby vocabulary");
    assert.ok(prompt.includes("dramatic"), "Should describe dramatic expressiveness");

    // Should contain quirks
    assert.ok(prompt.includes("speaks in third person"), "Should include quirk");
    assert.ok(prompt.includes("bloop"), "Should include bloop quirk");

    // Should contain likes/dislikes
    assert.ok(prompt.includes("puddles"), "Should include like");
    assert.ok(prompt.includes("dry air"), "Should include dislike");
  });

  it("uses correct descriptor for high trait values", () => {
    const personality: PetPersonality = {
      traits: { playfulness: 95, curiosity: 50, affection: 30, sass: 10, energy: 75 },
      likes: [],
      dislikes: [],
      speechStyle: { vocabulary: "casual", expressiveness: "moderate", quirks: [] },
    };

    const prompt = buildPersonalityPrompt(personality);

    assert.ok(prompt.includes("extremely playfulness"), "95 should be 'extremely'");
    assert.ok(prompt.includes("quite curiosity"), "50 should be 'quite'");
    assert.ok(prompt.includes("moderately affection"), "30 should be 'moderately'");
    assert.ok(prompt.includes("barely sass"), "10 should be 'barely'");
    assert.ok(prompt.includes("very energy"), "75 should be 'very'");
  });

  it("does not include empty likes/dislikes/quirks sections", () => {
    const personality: PetPersonality = {
      traits: { playfulness: 50, curiosity: 50, affection: 50, sass: 50, energy: 50 },
      likes: [],
      dislikes: [],
      speechStyle: { vocabulary: "casual", expressiveness: "moderate", quirks: [] },
    };

    const prompt = buildPersonalityPrompt(personality);

    assert.ok(!prompt.includes("You like:"), "Should not include empty likes");
    assert.ok(!prompt.includes("You dislike:"), "Should not include empty dislikes");
    assert.ok(!prompt.includes("Quirks:"), "Should not include empty quirks");
  });
});

describe("parsePersonalityResponse", () => {
  const cleanJSON = JSON.stringify({
    species: "Mushroom Gnome",
    traits: { playfulness: 35, curiosity: 85, affection: 60, sass: 55, energy: 25 },
    vocabulary: "articulate",
    expressiveness: "moderate",
    quirks: ["mutters under breath", "clicks tongue when thinking"],
    likes: ["damp moss", "pebbles"],
    dislikes: ["dry air", "bright sun"],
  });

  it("parses a clean JSON response", () => {
    const result = parsePersonalityResponse(cleanJSON, "fallback");
    assert.equal(result.species, "mushroom gnome");
    assert.equal(result.personality.traits.curiosity, 85);
    assert.equal(result.personality.speechStyle.vocabulary, "articulate");
    assert.equal(result.personality.speechStyle.expressiveness, "moderate");
    assert.deepEqual(result.personality.speechStyle.quirks, ["mutters under breath", "clicks tongue when thinking"]);
    assert.deepEqual(result.personality.likes, ["damp moss", "pebbles"]);
  });

  it("recovers from leading-+ numbers and trailing commas via sanitization", () => {
    const dirty = `{
      "species": "Bog Sprite",
      "traits": { "playfulness": +72, "curiosity": 40, "affection": 50, "sass": 30, "energy": 65, },
      "vocabulary": "casual",
      "expressiveness": "dramatic",
      "quirks": ["giggles at shadows", "hums softly"],
      "likes": ["mud", "moonlight"],
      "dislikes": ["sunlight"],
    }`;
    const result = parsePersonalityResponse(dirty, "fallback");
    assert.equal(result.species, "bog sprite");
    assert.equal(result.personality.traits.playfulness, 72);
  });

  it("clamps out-of-range trait values to 0-100", () => {
    const oor = JSON.stringify({
      species: "test",
      traits: { playfulness: 999, curiosity: -50, affection: 50, sass: 50, energy: 50 },
      vocabulary: "casual",
      expressiveness: "moderate",
      quirks: ["a"],
      likes: ["b"],
      dislikes: ["c"],
    });
    const result = parsePersonalityResponse(oor, "fallback");
    assert.equal(result.personality.traits.playfulness, 100);
    assert.equal(result.personality.traits.curiosity, 0);
  });

  it("falls back to 'casual' vocabulary when value is invalid", () => {
    const bad = JSON.stringify({
      species: "test",
      traits: { playfulness: 50, curiosity: 50, affection: 50, sass: 50, energy: 50 },
      vocabulary: "nonsense-value",
      expressiveness: "also-bad",
      quirks: ["a"],
      likes: ["b"],
      dislikes: ["c"],
    });
    const result = parsePersonalityResponse(bad, "fallback");
    assert.equal(result.personality.speechStyle.vocabulary, "casual");
    assert.equal(result.personality.speechStyle.expressiveness, "moderate");
  });

  it("falls back gracefully on completely unparsable input", () => {
    const result = parsePersonalityResponse("the model said something random and not json at all", "mushroom gnome");
    assert.equal(result.species, "mushroom gnome");
    assert.ok(result.personality.traits.playfulness >= 0 && result.personality.traits.playfulness <= 100);
    assert.ok(result.personality.likes.length > 0);
    assert.ok(result.personality.speechStyle.quirks.length > 0);
  });

  it("sanitizes species name: lowercases, trims, caps length", () => {
    const weird = JSON.stringify({
      species: "   THE ETERNAL LORD OF COSMIC DREAD AND WHIMSY THE GRAND ",
      traits: { playfulness: 50, curiosity: 50, affection: 50, sass: 50, energy: 50 },
      vocabulary: "casual",
      expressiveness: "moderate",
      quirks: ["a"],
      likes: ["b"],
      dislikes: ["c"],
    });
    const result = parsePersonalityResponse(weird, "fallback");
    assert.ok(result.species.length <= 30, `species was "${result.species}" (${result.species.length} chars)`);
    assert.equal(result.species, result.species.toLowerCase());
  });

  it("falls back when arrays are empty or missing", () => {
    const missing = JSON.stringify({
      species: "void creature",
      traits: { playfulness: 50, curiosity: 50, affection: 50, sass: 50, energy: 50 },
      vocabulary: "casual",
      expressiveness: "moderate",
      quirks: [],
      likes: [],
      dislikes: [],
    });
    const result = parsePersonalityResponse(missing, "fallback");
    assert.ok(result.personality.likes.length > 0, "empty likes should fall back");
    assert.ok(result.personality.speechStyle.quirks.length > 0, "empty quirks should fall back");
  });
});
