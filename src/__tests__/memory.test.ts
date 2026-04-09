import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createMemory,
  addExchange,
  addMemory,
  needsConsolidation,
  buildMemoryPrompt,
} from "../memory.js";

describe("createMemory", () => {
  it("creates an empty memory", () => {
    const mem = createMemory();
    assert.deepEqual(mem.shortTerm, []);
    assert.deepEqual(mem.longTerm, []);
  });
});

describe("addExchange", () => {
  it("adds a conversation exchange to short-term memory", () => {
    const mem = createMemory();
    addExchange(mem, "Hello!", "Bloop! Hi!");
    assert.equal(mem.shortTerm.length, 1);
    assert.equal(mem.shortTerm[0]!.userMessage, "Hello!");
    assert.equal(mem.shortTerm[0]!.petResponse, "Bloop! Hi!");
  });

  it("keeps only the last 5 exchanges", () => {
    const mem = createMemory();
    for (let i = 1; i <= 7; i++) {
      addExchange(mem, `msg ${i}`, `reply ${i}`);
    }
    assert.equal(mem.shortTerm.length, 5);
    // Oldest two (msg 1, msg 2) should be evicted
    assert.equal(mem.shortTerm[0]!.userMessage, "msg 3");
    assert.equal(mem.shortTerm[4]!.userMessage, "msg 7");
  });

  it("evicts the oldest exchange when buffer is full", () => {
    const mem = createMemory();
    for (let i = 1; i <= 5; i++) {
      addExchange(mem, `msg ${i}`, `reply ${i}`);
    }
    assert.equal(mem.shortTerm[0]!.userMessage, "msg 1");

    // Adding a 6th should evict msg 1
    addExchange(mem, "msg 6", "reply 6");
    assert.equal(mem.shortTerm.length, 5);
    assert.equal(mem.shortTerm[0]!.userMessage, "msg 2");
    assert.equal(mem.shortTerm[4]!.userMessage, "msg 6");
  });
});

describe("addMemory", () => {
  it("adds a memory string to long-term memory", () => {
    const mem = createMemory();
    addMemory(mem, "Owner likes cats");
    assert.equal(mem.longTerm.length, 1);
    assert.equal(mem.longTerm[0], "Owner likes cats");
  });

  it("accumulates memories", () => {
    const mem = createMemory();
    addMemory(mem, "Memory 1");
    addMemory(mem, "Memory 2");
    addMemory(mem, "Memory 3");
    assert.equal(mem.longTerm.length, 3);
  });
});

describe("needsConsolidation", () => {
  it("returns false when under the limit", () => {
    const mem = createMemory();
    for (let i = 0; i < 20; i++) {
      addMemory(mem, `Memory ${i}`);
    }
    assert.equal(needsConsolidation(mem), false);
  });

  it("returns true when over the limit", () => {
    const mem = createMemory();
    for (let i = 0; i < 21; i++) {
      addMemory(mem, `Memory ${i}`);
    }
    assert.equal(needsConsolidation(mem), true);
  });
});

describe("buildMemoryPrompt", () => {
  it("returns empty string when no memories exist", () => {
    const mem = createMemory();
    assert.equal(buildMemoryPrompt(mem), "");
  });

  it("includes long-term memories", () => {
    const mem = createMemory();
    addMemory(mem, "Owner showed me a dog photo");
    addMemory(mem, "Owner's name might be Alex");

    const prompt = buildMemoryPrompt(mem);
    assert.ok(prompt.includes("Things you remember about your owner:"));
    assert.ok(prompt.includes("- Owner showed me a dog photo"));
    assert.ok(prompt.includes("- Owner's name might be Alex"));
  });

  it("includes short-term conversation history", () => {
    const mem = createMemory();
    addExchange(mem, "How are you?", "Bloop! Me is hungry...");

    const prompt = buildMemoryPrompt(mem);
    assert.ok(prompt.includes("Recent conversation:"));
    assert.ok(prompt.includes('Owner: "How are you?"'));
    assert.ok(prompt.includes('You: "Bloop! Me is hungry..."'));
  });

  it("includes both tiers when both have data", () => {
    const mem = createMemory();
    addMemory(mem, "Owner likes pizza");
    addExchange(mem, "Hello!", "Hi there!");

    const prompt = buildMemoryPrompt(mem);
    assert.ok(prompt.includes("Things you remember"));
    assert.ok(prompt.includes("Recent conversation:"));
    assert.ok(prompt.includes("Owner likes pizza"));
    assert.ok(prompt.includes('Owner: "Hello!"'));
  });

  it("only shows last 5 exchanges even after many interactions", () => {
    const mem = createMemory();
    for (let i = 1; i <= 8; i++) {
      addExchange(mem, `Question ${i}`, `Answer ${i}`);
    }

    const prompt = buildMemoryPrompt(mem);
    assert.ok(!prompt.includes("Question 1"), "Oldest exchange should be evicted");
    assert.ok(!prompt.includes("Question 3"), "Third exchange should be evicted");
    assert.ok(prompt.includes("Question 4"), "Fourth exchange should be present");
    assert.ok(prompt.includes("Question 8"), "Latest exchange should be present");
  });
});
