import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { performAction } from "../actions.js";
import { rollRandomEvents } from "../events.js";
import { createPet } from "../state.js";
import {
  FEED_HUNGER,
  FEED_HAPPINESS,
  PLAY_HAPPINESS,
  PLAY_ENERGY,
  PLAY_HUNGER,
  PET_HAPPINESS,
  HEAL_HEALTH,
  HEAL_HAPPINESS,
} from "../constants.js";

describe("performAction — feed", () => {
  it("increases hunger and happiness", () => {
    const pet = createPet("Blob", "slime");
    pet.hunger = 50;
    const hungerBefore = pet.hunger;
    const happinessBefore = pet.happiness;

    const result = performAction(pet, "feed");

    assert.equal(result.needsLLM, false);
    assert.equal(pet.hunger, hungerBefore + FEED_HUNGER);
    assert.equal(pet.happiness, happinessBefore + FEED_HAPPINESS);
    assert.ok(result.events.length > 0);
  });

  it("rejects if pet is full (hunger > 90)", () => {
    const pet = createPet("Blob", "slime");
    pet.hunger = 95;

    const result = performAction(pet, "feed");

    assert.equal(pet.hunger, 95); // unchanged
    assert.ok(result.message.includes("full"));
    assert.equal(result.events.length, 0);
  });
});

describe("performAction — play", () => {
  it("adjusts happiness, energy, and hunger", () => {
    const pet = createPet("Blob", "slime");
    const happinessBefore = pet.happiness;
    const energyBefore = pet.energy;
    const hungerBefore = pet.hunger;

    const result = performAction(pet, "play");

    assert.equal(result.needsLLM, false);
    assert.equal(pet.happiness, happinessBefore + PLAY_HAPPINESS);
    assert.equal(pet.energy, energyBefore + PLAY_ENERGY);
    assert.equal(pet.hunger, hungerBefore + PLAY_HUNGER);
  });

  it("rejects if pet is sleeping", () => {
    const pet = createPet("Blob", "slime");
    pet.isSleeping = true;
    const energyBefore = pet.energy;

    const result = performAction(pet, "play");

    assert.equal(pet.energy, energyBefore); // unchanged
    assert.ok(result.message.includes("sleeping"));
    assert.equal(result.events.length, 0);
  });

  it("rejects if energy < 15", () => {
    const pet = createPet("Blob", "slime");
    pet.energy = 10;

    const result = performAction(pet, "play");

    assert.equal(pet.energy, 10); // unchanged
    assert.ok(result.message.includes("tired"));
    assert.equal(result.events.length, 0);
  });
});

describe("performAction — pet", () => {
  it("increases happiness", () => {
    const pet = createPet("Blob", "slime");
    const happinessBefore = pet.happiness;

    performAction(pet, "pet");

    assert.equal(pet.happiness, happinessBefore + PET_HAPPINESS);
  });
});

describe("performAction — sleep", () => {
  it("sets isSleeping to true", () => {
    const pet = createPet("Blob", "slime");

    const result = performAction(pet, "sleep");

    assert.equal(pet.isSleeping, true);
    assert.equal(result.needsLLM, false);
  });

  it("rejects if already sleeping", () => {
    const pet = createPet("Blob", "slime");
    pet.isSleeping = true;

    const result = performAction(pet, "sleep");

    assert.ok(result.message.includes("already sleeping"));
  });
});

describe("performAction — heal", () => {
  it("increases health and decreases happiness", () => {
    const pet = createPet("Blob", "slime");
    pet.health = 50;
    const healthBefore = pet.health;
    const happinessBefore = pet.happiness;

    performAction(pet, "heal");

    assert.equal(pet.health, healthBefore + HEAL_HEALTH);
    assert.equal(pet.happiness, happinessBefore + HEAL_HAPPINESS);
  });

  it("rejects if health > 80", () => {
    const pet = createPet("Blob", "slime");
    pet.health = 85;

    const result = performAction(pet, "heal");

    assert.equal(pet.health, 85); // unchanged
    assert.ok(result.message.includes("healthy"));
  });
});

describe("performAction — talk", () => {
  it("returns needsLLM=true with populated llmContext", () => {
    const pet = createPet("Blob", "slime");

    const result = performAction(pet, "talk");

    assert.equal(result.needsLLM, true);
    assert.ok(result.llmContext);
    const ctx = JSON.parse(result.llmContext);
    assert.equal(ctx.action, "talk");
    assert.equal(ctx.petName, "Blob");
    assert.equal(ctx.species, "slime");
    assert.ok(ctx.mood);
  });
});

describe("performAction — show", () => {
  it("returns needsLLM=true with populated llmContext", () => {
    const pet = createPet("Blob", "slime");

    const result = performAction(pet, "show");

    assert.equal(result.needsLLM, true);
    assert.ok(result.llmContext);
    const ctx = JSON.parse(result.llmContext);
    assert.equal(ctx.action, "show");
  });
});

describe("performAction — edge cases", () => {
  it("rejects actions on a dead pet", () => {
    const pet = createPet("Blob", "slime");
    pet.isAlive = false;

    const result = performAction(pet, "feed");

    assert.ok(result.message.includes("no longer"));
    assert.equal(result.events.length, 0);
  });

  it("rejects unknown actions", () => {
    const pet = createPet("Blob", "slime");

    const result = performAction(pet, "dance");

    assert.ok(result.message.includes("Unknown"));
  });
});

describe("rollRandomEvents", () => {
  it("does not fire conditional events when conditions are not met", () => {
    const pet = createPet("Blob", "slime");
    // Default pet: hunger=80 (not hungry), energy=90 (not tired)
    // stomach_growl requires hunger < 30, yawning requires energy < 30
    // Run many times to ensure conditional events don't fire
    for (let i = 0; i < 100; i++) {
      const events = rollRandomEvents(pet);
      for (const e of events) {
        assert.notEqual(e.type, "stomach_growl", "Should not growl when not hungry");
        assert.notEqual(e.type, "yawning", "Should not yawn when not tired");
      }
    }
  });

  it("can fire conditional events when conditions are met", () => {
    const pet = createPet("Blob", "slime");
    pet.hunger = 10; // hungry
    pet.energy = 10; // tired
    pet.happiness = 80; // happy

    // Run enough times that we're very likely to see at least one of each
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const events = rollRandomEvents(pet);
      for (const e of events) {
        seen.add(e.type);
      }
    }

    assert.ok(seen.has("stomach_growl"), "Should eventually see stomach_growl when hungry");
    assert.ok(seen.has("yawning"), "Should eventually see yawning when tired");
    assert.ok(seen.has("dancing"), "Should eventually see dancing when happy");
  });

  it("returns no events for sleeping pets", () => {
    const pet = createPet("Blob", "slime");
    pet.isSleeping = true;

    for (let i = 0; i < 100; i++) {
      const events = rollRandomEvents(pet);
      assert.equal(events.length, 0);
    }
  });

  it("returns no events for dead pets", () => {
    const pet = createPet("Blob", "slime");
    pet.isAlive = false;

    for (let i = 0; i < 100; i++) {
      const events = rollRandomEvents(pet);
      assert.equal(events.length, 0);
    }
  });
});
