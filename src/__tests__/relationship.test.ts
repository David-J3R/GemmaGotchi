import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createRelationship,
  updateRelationship,
  getBondLabel,
  getBondBehavior,
  buildRelationshipPrompt,
} from "../relationship.js";

describe("createRelationship", () => {
  it("creates a new relationship at stranger level", () => {
    const rel = createRelationship();
    assert.equal(rel.trust, 0);
    assert.equal(rel.bondLevel, 0);
    assert.equal(rel.interactionCount, 0);
    assert.equal(rel.neglectStreak, 0);
    assert.equal(rel.careStreak, 0);
    assert.equal(rel.lastMoodWhenInteracted, "content");
  });
});

describe("updateRelationship", () => {
  it("increases trust when interacted (high happiness)", () => {
    const rel = createRelationship();
    updateRelationship(rel, 70, "happy", true);
    assert.equal(rel.trust, 3);
    assert.equal(rel.interactionCount, 1);
    assert.equal(rel.careStreak, 1);
    assert.equal(rel.neglectStreak, 0);
  });

  it("increases trust when interacted (medium happiness)", () => {
    const rel = createRelationship();
    updateRelationship(rel, 40, "content", true);
    assert.equal(rel.trust, 2);
  });

  it("increases trust when interacted (low happiness)", () => {
    const rel = createRelationship();
    updateRelationship(rel, 20, "sad", true);
    assert.equal(rel.trust, 1);
  });

  it("decreases trust when not interacted", () => {
    const rel = createRelationship();
    rel.trust = 10;
    updateRelationship(rel, 50, "content", false);
    assert.equal(rel.trust, 9.5);
    assert.equal(rel.neglectStreak, 1);
    assert.equal(rel.careStreak, 0);
  });

  it("does not decrease trust below 0", () => {
    const rel = createRelationship();
    rel.trust = 0;
    updateRelationship(rel, 50, "content", false);
    assert.equal(rel.trust, 0);
  });

  it("does not increase trust above 100", () => {
    const rel = createRelationship();
    rel.trust = 99;
    updateRelationship(rel, 80, "ecstatic", true);
    assert.equal(rel.trust, 100);
  });

  it("upgrades bond level at trust thresholds", () => {
    const rel = createRelationship();
    // Pump trust to 20 (acquaintance)
    for (let i = 0; i < 7; i++) {
      updateRelationship(rel, 70, "happy", true);
    }
    assert.ok(rel.trust >= 20, `Trust should be >= 20, got ${rel.trust}`);
    assert.equal(rel.bondLevel, 1);
    assert.equal(getBondLabel(rel), "acquaintance");
  });

  it("tracks interaction count", () => {
    const rel = createRelationship();
    updateRelationship(rel, 50, "content", true);
    updateRelationship(rel, 50, "content", true);
    updateRelationship(rel, 50, "content", false);
    updateRelationship(rel, 50, "content", true);
    assert.equal(rel.interactionCount, 3);
  });

  it("resets care streak on neglect", () => {
    const rel = createRelationship();
    updateRelationship(rel, 50, "content", true);
    updateRelationship(rel, 50, "content", true);
    assert.equal(rel.careStreak, 2);
    updateRelationship(rel, 50, "content", false);
    assert.equal(rel.careStreak, 0);
  });

  it("resets neglect streak on interaction", () => {
    const rel = createRelationship();
    updateRelationship(rel, 50, "content", false);
    updateRelationship(rel, 50, "content", false);
    assert.equal(rel.neglectStreak, 2);
    updateRelationship(rel, 50, "content", true);
    assert.equal(rel.neglectStreak, 0);
  });

  it("records last mood when interacted", () => {
    const rel = createRelationship();
    updateRelationship(rel, 50, "ecstatic", true);
    assert.equal(rel.lastMoodWhenInteracted, "ecstatic");
  });
});

describe("getBondLabel", () => {
  it("returns correct labels for each level", () => {
    const rel = createRelationship();
    assert.equal(getBondLabel(rel), "stranger");
    rel.bondLevel = 1;
    assert.equal(getBondLabel(rel), "acquaintance");
    rel.bondLevel = 2;
    assert.equal(getBondLabel(rel), "friend");
    rel.bondLevel = 3;
    assert.equal(getBondLabel(rel), "best friend");
    rel.bondLevel = 4;
    assert.equal(getBondLabel(rel), "soulmate");
    rel.bondLevel = 5;
    assert.equal(getBondLabel(rel), "bonded");
  });
});

describe("getBondBehavior", () => {
  it("returns different behaviors for different levels", () => {
    const rel = createRelationship();
    const level0 = getBondBehavior(rel);
    rel.bondLevel = 2;
    const level2 = getBondBehavior(rel);
    assert.notEqual(level0, level2);
    assert.ok(level0.includes("shy"));
    assert.ok(level2.includes("initiate"));
  });
});

describe("buildRelationshipPrompt", () => {
  it("includes bond label and trust", () => {
    const rel = createRelationship();
    rel.trust = 45;
    rel.bondLevel = 2;
    rel.interactionCount = 100;
    const prompt = buildRelationshipPrompt(rel);
    assert.ok(prompt.includes("friend"));
    assert.ok(prompt.includes("45/100"));
    assert.ok(prompt.includes("100 interactions"));
  });

  it("includes neglect warning when streak is high", () => {
    const rel = createRelationship();
    rel.neglectStreak = 8;
    const prompt = buildRelationshipPrompt(rel);
    assert.ok(prompt.includes("neglected"));
    assert.ok(prompt.includes("8 ticks"));
  });

  it("includes trust description for high trust", () => {
    const rel = createRelationship();
    rel.trust = 75;
    rel.bondLevel = 3;
    const prompt = buildRelationshipPrompt(rel);
    assert.ok(prompt.includes("trust them deeply"));
  });

  it("includes trust description for medium trust", () => {
    const rel = createRelationship();
    rel.trust = 35;
    const prompt = buildRelationshipPrompt(rel);
    assert.ok(prompt.includes("starting to trust"));
  });

  it("does not include interaction count for new relationships", () => {
    const rel = createRelationship();
    const prompt = buildRelationshipPrompt(rel);
    assert.ok(!prompt.includes("interactions"));
  });
});
