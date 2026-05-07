import { describe, expect, it } from "vitest";
import { parseResponse } from "../../src/engine/schema";

describe("parseResponse", () => {
  it("parses valid structured pet responses", () => {
    const response = parseResponse(JSON.stringify({
      speech: "Oh my! That is a very big question.",
      emotion: "happy",
      moodShift: { happiness: 5, energy: -2 },
    }));

    expect(response).toEqual({
      speech: "Oh my! That is a very big question.",
      emotion: "happy",
      moodShift: { happiness: 5, energy: -2 },
    });
  });

  it("repairs markdown-list JSON like the leaked chat transcript", () => {
    const response = parseResponse(`{
- "speech": "Oh my! That is a very big question!",
- "emotion": "happy",
- "innerThought": "Too much to know",
- "action": { "type": "explore", "intensity": 5 },
- "moodShift": { "happiness": 5, "energy": -2 },
- "memory": "Owner asked about WWII"
}`);

    expect(response.speech).toBe("Oh my! That is a very big question!");
    expect(response.emotion).toBe("happy");
    expect(response.innerThought).toBe("Too much to know");
    expect(response.action).toEqual({ type: "explore", intensity: 5 });
    expect(response.moodShift).toEqual({ happiness: 5, energy: -2 });
    expect(response.memory).toBe("Owner asked about WWII");
  });

  it("does not expose unrecoverable JSON-shaped failures as pet speech", () => {
    const response = parseResponse(`{
- "speech": "Seguro"
- "emotion": "happy"
}`);

    expect(response.emotion).toBe("confused");
    expect(response.speech).not.toContain("\"speech\"");
    expect(response.speech).not.toContain("\"emotion\"");
  });
});
