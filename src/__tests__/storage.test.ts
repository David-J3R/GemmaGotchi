import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { savePet, loadPet, deleteSave, hasSaveFile, applyOfflineTime } from "../storage.js";
import { createPet } from "../state.js";

const SAVE_DIR = path.join(os.homedir(), ".tamagotchi");
const SAVE_FILE = path.join(SAVE_DIR, "save.json");
const SAVE_CORRUPT = path.join(SAVE_DIR, "save.json.corrupt");

async function cleanup(): Promise<void> {
  for (const file of [SAVE_FILE, SAVE_CORRUPT, path.join(SAVE_DIR, "save.json.tmp")]) {
    try { await fs.unlink(file); } catch { /* ignore */ }
  }
}

describe("storage", () => {
  before(cleanup);
  after(cleanup);

  describe("savePet / loadPet roundtrip", () => {
    after(cleanup);

    it("saves and loads a pet with all fields intact", async () => {
      const pet = createPet("Blobby", "slime creature");
      pet.hunger = 42;
      pet.happiness = 55;
      pet.energy = 73;
      pet.health = 88;
      pet.age = 10;
      pet.level = 3;
      pet.xp = 50;
      pet.memories.push("found a shiny thing");
      pet.petMemory.longTerm.push("owner likes jokes");
      pet.petMemory.shortTerm.push({ userMessage: "hello", petResponse: "bloop!" });
      pet.relationship.trust = 30;
      pet.relationship.bondLevel = 1;
      pet.relationship.interactionCount = 15;

      await savePet(pet);
      const loaded = await loadPet();

      assert.notEqual(loaded, null);
      const loadedPet = loaded!.pet;

      assert.equal(loadedPet.name, "Blobby");
      assert.equal(loadedPet.species, "slime creature");
      assert.equal(loadedPet.hunger, 42);
      assert.equal(loadedPet.happiness, 55);
      assert.equal(loadedPet.energy, 73);
      assert.equal(loadedPet.health, 88);
      assert.equal(loadedPet.age, 10);
      assert.equal(loadedPet.level, 3);
      assert.equal(loadedPet.xp, 50);
      assert.ok(loadedPet.memories.includes("found a shiny thing"));
      assert.ok(loadedPet.petMemory.longTerm.includes("owner likes jokes"));
      assert.equal(loadedPet.petMemory.shortTerm.length, 1);
      assert.equal(loadedPet.petMemory.shortTerm[0]!.userMessage, "hello");
      assert.equal(loadedPet.relationship.trust, 30);
      assert.equal(loadedPet.relationship.bondLevel, 1);
      assert.equal(loadedPet.relationship.interactionCount, 15);
      assert.equal(loadedPet.personality.traits.playfulness, pet.personality.traits.playfulness);
      assert.equal(loadedPet.personality.speechStyle.vocabulary, pet.personality.speechStyle.vocabulary);
    });

    it("returns meta with version and savedAt", async () => {
      const pet = createPet("Test", "creature");
      await savePet(pet);

      const loaded = await loadPet();
      assert.notEqual(loaded, null);
      assert.equal(loaded!.meta.version, 1);
      assert.equal(loaded!.meta.engineVersion, "0.1.0");
      assert.ok(new Date(loaded!.meta.savedAt).getTime() > 0);
    });
  });

  describe("hasSaveFile", () => {
    before(cleanup);
    after(cleanup);

    it("returns false when no save exists", async () => {
      assert.equal(await hasSaveFile(), false);
    });

    it("returns true after saving", async () => {
      await savePet(createPet("Test", "creature"));
      assert.equal(await hasSaveFile(), true);
    });
  });

  describe("deleteSave", () => {
    before(cleanup);
    after(cleanup);

    it("removes the save file", async () => {
      await savePet(createPet("Test", "creature"));
      assert.equal(await hasSaveFile(), true);
      await deleteSave();
      assert.equal(await hasSaveFile(), false);
    });

    it("does not throw if no save exists", async () => {
      await deleteSave(); // Should not throw
    });
  });

  describe("corrupted file handling", () => {
    before(cleanup);
    after(cleanup);

    it("returns null and backs up corrupted save", async () => {
      await fs.mkdir(SAVE_DIR, { recursive: true });
      await fs.writeFile(SAVE_FILE, "this is not valid json{{{", "utf-8");

      const result = await loadPet();
      assert.equal(result, null);

      // Corrupted file should be backed up
      const corruptExists = await fs.access(SAVE_CORRUPT).then(() => true).catch(() => false);
      assert.ok(corruptExists);

      // Original save should be gone
      assert.equal(await hasSaveFile(), false);
    });
  });

  describe("missing fields fallback", () => {
    before(cleanup);
    after(cleanup);

    it("fills defaults for missing fields", async () => {
      await fs.mkdir(SAVE_DIR, { recursive: true });
      const minimal = {
        _meta: { version: 1, savedAt: new Date().toISOString(), engineVersion: "0.1.0" },
        pet: { name: "OldPet", species: "slime creature" },
      };
      await fs.writeFile(SAVE_FILE, JSON.stringify(minimal), "utf-8");

      const loaded = await loadPet();
      assert.notEqual(loaded, null);
      const pet = loaded!.pet;

      assert.equal(pet.name, "OldPet");
      assert.equal(pet.species, "slime creature");
      assert.equal(pet.hunger, 80);
      assert.equal(pet.happiness, 70);
      assert.equal(pet.energy, 90);
      assert.equal(pet.health, 100);
      assert.equal(pet.level, 1);
      assert.equal(pet.isAlive, true);
      assert.equal(pet.isSleeping, false);
      assert.ok(pet.personality);
      assert.deepEqual(pet.petMemory.shortTerm, []);
      assert.deepEqual(pet.petMemory.longTerm, []);
      assert.equal(pet.relationship.trust, 0);
    });
  });

  describe("applyOfflineTime", () => {
    it("decays stats at half rate for a 2-hour gap", () => {
      const pet = createPet("Tester", "slime creature");
      pet.hunger = 80;
      pet.happiness = 70;
      pet.energy = 90;
      pet.health = 100;

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
      const result = applyOfflineTime(pet, twoHoursAgo);

      // 120 ticks at half rate: hunger drops 180 (clamped to 0), happiness drops 120 (clamped to 0), energy drops 120 (clamped to 0)
      assert.equal(result.pet.hunger, 0);
      assert.equal(result.pet.happiness, 0);
      assert.equal(result.pet.energy, 0);
      assert.ok(result.pet.health >= 5);
      assert.equal(result.pet.isAlive, true);
      assert.ok(Math.abs(result.elapsedMinutes - 120) < 1);
      assert.ok(result.summary.includes("2 hours"));
    });

    it("does not decay for very short absence (< 1 min)", () => {
      const pet = createPet("Quick", "creature");
      pet.hunger = 80;

      const justNow = new Date(Date.now() - 30_000).toISOString();
      const result = applyOfflineTime(pet, justNow);

      assert.equal(result.pet.hunger, 80);
      assert.equal(result.summary, "");
    });

    it("caps offline time at 24 hours", () => {
      const pet = createPet("LongGone", "creature");

      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60_000).toISOString();
      const result = applyOfflineTime(pet, twoDaysAgo);

      assert.equal(result.elapsedMinutes, 1440);
    });

    it("never kills the pet from offline neglect", () => {
      const pet = createPet("Fragile", "creature");
      pet.health = 10;

      const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
      const result = applyOfflineTime(pet, dayAgo);

      assert.equal(result.pet.isAlive, true);
      assert.ok(result.pet.health >= 5);
    });
  });
});
