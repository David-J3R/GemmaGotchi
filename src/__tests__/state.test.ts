import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPet, computeMood, applyStatChanges, tick } from "../state.js";
import {
  DEFAULT_HUNGER,
  DEFAULT_HAPPINESS,
  DEFAULT_ENERGY,
  DEFAULT_HEALTH,
  AUTO_SLEEP_THRESHOLD,
} from "../constants.js";

describe("createPet", () => {
  it("creates a pet with correct defaults", () => {
    const pet = createPet("Blob", "slime");
    assert.equal(pet.name, "Blob");
    assert.equal(pet.species, "slime");
    assert.equal(pet.hunger, DEFAULT_HUNGER);
    assert.equal(pet.happiness, DEFAULT_HAPPINESS);
    assert.equal(pet.energy, DEFAULT_ENERGY);
    assert.equal(pet.health, DEFAULT_HEALTH);
    assert.equal(pet.hunger, 80);
    assert.equal(pet.happiness, 70);
    assert.equal(pet.energy, 90);
    assert.equal(pet.health, 100);
    assert.equal(pet.isAlive, true);
    assert.equal(pet.isSleeping, false);
    assert.equal(pet.level, 1);
    assert.equal(pet.xp, 0);
    assert.equal(pet.age, 0);
  });
});

describe("computeMood", () => {
  it("returns 'starving' when hunger < 15", () => {
    const pet = createPet("Blob", "slime");
    pet.hunger = 10;
    assert.equal(computeMood(pet), "starving");
  });

  it("returns 'critical' when health < 15", () => {
    const pet = createPet("Blob", "slime");
    pet.health = 10;
    assert.equal(computeMood(pet), "critical");
  });

  it("returns 'sick' when health < 30", () => {
    const pet = createPet("Blob", "slime");
    pet.health = 25;
    assert.equal(computeMood(pet), "sick");
  });

  it("returns 'exhausted' when energy < 15", () => {
    const pet = createPet("Blob", "slime");
    pet.energy = 10;
    assert.equal(computeMood(pet), "exhausted");
  });

  it("returns 'angry' when hunger < 30 and happiness < 30", () => {
    const pet = createPet("Blob", "slime");
    pet.hunger = 25;
    pet.happiness = 20;
    assert.equal(computeMood(pet), "angry");
  });

  it("returns 'sad' when happiness < 20", () => {
    const pet = createPet("Blob", "slime");
    pet.happiness = 15;
    assert.equal(computeMood(pet), "sad");
  });

  it("returns 'bored' when happiness < 35", () => {
    const pet = createPet("Blob", "slime");
    pet.happiness = 33;
    assert.equal(computeMood(pet), "bored");
  });

  it("returns 'ecstatic' when happiness >= 80", () => {
    const pet = createPet("Blob", "slime");
    pet.happiness = 85;
    assert.equal(computeMood(pet), "ecstatic");
  });

  it("returns 'happy' when happiness >= 60", () => {
    const pet = createPet("Blob", "slime");
    pet.happiness = 65;
    assert.equal(computeMood(pet), "happy");
  });

  it("returns 'content' for middling stats", () => {
    const pet = createPet("Blob", "slime");
    pet.happiness = 50;
    assert.equal(computeMood(pet), "content");
  });

  it("prioritizes health critical over starving", () => {
    const pet = createPet("Blob", "slime");
    pet.health = 10;
    pet.hunger = 5;
    assert.equal(computeMood(pet), "critical");
  });
});

describe("applyStatChanges", () => {
  it("applies positive changes", () => {
    const pet = createPet("Blob", "slime");
    applyStatChanges(pet, { hunger: 10, happiness: 5 });
    assert.equal(pet.hunger, 90);
    assert.equal(pet.happiness, 75);
  });

  it("applies negative changes", () => {
    const pet = createPet("Blob", "slime");
    applyStatChanges(pet, { hunger: -20 });
    assert.equal(pet.hunger, 60);
  });

  it("clamps stats to 0", () => {
    const pet = createPet("Blob", "slime");
    applyStatChanges(pet, { hunger: -200 });
    assert.equal(pet.hunger, 0);
  });

  it("clamps stats to 100", () => {
    const pet = createPet("Blob", "slime");
    applyStatChanges(pet, { hunger: 200 });
    assert.equal(pet.hunger, 100);
  });

  it("applies xp changes without clamping", () => {
    const pet = createPet("Blob", "slime");
    applyStatChanges(pet, { xp: 50 });
    assert.equal(pet.xp, 50);
  });
});

describe("tick", () => {
  it("decreases hunger over 20 ticks", () => {
    const pet = createPet("Blob", "slime");
    const initialHunger = pet.hunger;
    for (let i = 0; i < 20; i++) {
      tick(pet);
    }
    assert.ok(pet.hunger < initialHunger, `Hunger should decrease: was ${initialHunger}, now ${pet.hunger}`);
  });

  it("increments age each tick", () => {
    const pet = createPet("Blob", "slime");
    tick(pet);
    assert.equal(pet.age, 1);
    tick(pet);
    assert.equal(pet.age, 2);
  });

  it("auto-sleeps when energy < 10", () => {
    const pet = createPet("Blob", "slime");
    pet.energy = AUTO_SLEEP_THRESHOLD; // exactly at threshold
    tick(pet); // decays energy below threshold
    assert.equal(pet.isSleeping, true);
  });

  it("recovers energy and decays hunger at half rate while sleeping", () => {
    const pet = createPet("Blob", "slime");
    pet.isSleeping = true;
    pet.energy = 30;
    const hungerBefore = pet.hunger;
    const energyBefore = pet.energy;

    tick(pet);

    assert.ok(pet.energy > energyBefore, "Energy should recover while sleeping");
    // Hunger should still decay but slower
    assert.ok(pet.hunger < hungerBefore, "Hunger should still decay while sleeping");
    // Half rate: 1.5 per tick instead of 3
    assert.equal(pet.hunger, hungerBefore - 1.5);
  });

  it("wakes up when energy reaches 80", () => {
    const pet = createPet("Blob", "slime");
    pet.isSleeping = true;
    pet.energy = 75;

    tick(pet); // energy goes to 83
    assert.equal(pet.isSleeping, false);
  });

  it("decays health when hunger AND energy are both below 30", () => {
    const pet = createPet("Blob", "slime");
    pet.hunger = 20;
    pet.energy = 20;
    const healthBefore = pet.health;

    tick(pet);

    assert.ok(pet.health < healthBefore, "Health should decay from neglect");
  });

  it("does not decay health when only one stat is below 30", () => {
    const pet = createPet("Blob", "slime");
    pet.hunger = 20;
    pet.energy = 50;
    const healthBefore = pet.health;

    tick(pet);

    assert.equal(pet.health, healthBefore);
  });

  it("pet dies when health reaches 0", () => {
    const pet = createPet("Blob", "slime");
    pet.health = 3;
    pet.hunger = 5;
    pet.energy = 5;

    const events = tick(pet);

    assert.equal(pet.isAlive, false);
    assert.equal(pet.health, 0);
    assert.ok(events.some((e) => e.type === "death"), "Should have a death event");
  });

  it("does nothing if pet is already dead", () => {
    const pet = createPet("Blob", "slime");
    pet.isAlive = false;
    const events = tick(pet);
    assert.equal(events.length, 0);
    assert.equal(pet.age, 0);
  });

  it("returns auto_sleep event when pet falls asleep", () => {
    const pet = createPet("Blob", "slime");
    pet.energy = AUTO_SLEEP_THRESHOLD;
    const events = tick(pet);
    assert.ok(events.some((e) => e.type === "auto_sleep"), "Should have auto_sleep event");
  });

  it("returns wake event when pet wakes up", () => {
    const pet = createPet("Blob", "slime");
    pet.isSleeping = true;
    pet.energy = 75;
    const events = tick(pet);
    assert.ok(events.some((e) => e.type === "wake"), "Should have wake event");
  });
});
