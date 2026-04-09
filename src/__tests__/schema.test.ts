import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseResponse } from "../schema.js";

describe("parseResponse", () => {
  it("parses a valid complete JSON response", () => {
    const raw = JSON.stringify({
      speech: "Bloop! Me hungry!",
      emotion: "happy",
      innerThought: "food would be nice",
      action: { type: "request_food", intensity: 8 },
      moodShift: { happiness: 3, energy: -2 },
      memory: "owner talked to me today",
    });

    const result = parseResponse(raw);

    assert.equal(result.speech, "Bloop! Me hungry!");
    assert.equal(result.emotion, "happy");
    assert.equal(result.innerThought, "food would be nice");
    assert.deepEqual(result.action, { type: "request_food", intensity: 8 });
    assert.deepEqual(result.moodShift, { happiness: 3, energy: -2 });
    assert.equal(result.memory, "owner talked to me today");
  });

  it("parses minimal valid response (speech + emotion only)", () => {
    const raw = JSON.stringify({ speech: "Hello!", emotion: "excited" });
    const result = parseResponse(raw);

    assert.equal(result.speech, "Hello!");
    assert.equal(result.emotion, "excited");
    assert.equal(result.innerThought, undefined);
    assert.equal(result.action, undefined);
    assert.equal(result.moodShift, undefined);
    assert.equal(result.memory, undefined);
  });

  it("falls back to confused when JSON parsing fails", () => {
    const result = parseResponse("just some random text");
    assert.equal(result.speech, "just some random text");
    assert.equal(result.emotion, "confused");
  });

  it("extracts JSON from markdown code blocks", () => {
    const raw = '```json\n{"speech": "Hi there!", "emotion": "happy"}\n```';
    const result = parseResponse(raw);

    assert.equal(result.speech, "Hi there!");
    assert.equal(result.emotion, "happy");
  });

  it("extracts JSON embedded in surrounding text", () => {
    const raw = 'Here is my response:\n{"speech": "Meow!", "emotion": "mischievous"}\nDone!';
    const result = parseResponse(raw);

    assert.equal(result.speech, "Meow!");
    assert.equal(result.emotion, "mischievous");
  });

  it("falls back emotion to confused for invalid emotion values", () => {
    const raw = JSON.stringify({ speech: "Hi!", emotion: "super_happy" });
    const result = parseResponse(raw);

    assert.equal(result.speech, "Hi!");
    assert.equal(result.emotion, "confused");
  });

  it("clamps moodShift values to -10..+10", () => {
    const raw = JSON.stringify({
      speech: "Wow!",
      emotion: "excited",
      moodShift: { happiness: 50, energy: -25 },
    });
    const result = parseResponse(raw);

    assert.equal(result.moodShift?.happiness, 10);
    assert.equal(result.moodShift?.energy, -10);
  });

  it("clamps action intensity to 1-10", () => {
    const raw = JSON.stringify({
      speech: "Feed me!",
      emotion: "angry",
      action: { type: "request_food", intensity: 15 },
    });
    const result = parseResponse(raw);

    assert.equal(result.action?.intensity, 10);
  });

  it("ignores invalid action types", () => {
    const raw = JSON.stringify({
      speech: "Hmm",
      emotion: "confused",
      action: { type: "fly_away", intensity: 5 },
    });
    const result = parseResponse(raw);

    assert.equal(result.action, undefined);
  });

  it("falls back when speech is missing", () => {
    const raw = JSON.stringify({ emotion: "happy" });
    const result = parseResponse(raw);

    assert.equal(result.emotion, "confused");
    assert.ok(result.speech.length > 0);
  });

  it("ignores empty string innerThought and memory", () => {
    const raw = JSON.stringify({
      speech: "Hi!",
      emotion: "happy",
      innerThought: "",
      memory: "",
    });
    const result = parseResponse(raw);

    assert.equal(result.innerThought, undefined);
    assert.equal(result.memory, undefined);
  });

  it("rounds fractional moodShift and intensity values", () => {
    const raw = JSON.stringify({
      speech: "Ok!",
      emotion: "happy",
      moodShift: { happiness: 3.7 },
      action: { type: "gift", intensity: 4.9 },
    });
    const result = parseResponse(raw);

    assert.equal(result.moodShift?.happiness, 4);
    assert.equal(result.action?.intensity, 5);
  });
});
