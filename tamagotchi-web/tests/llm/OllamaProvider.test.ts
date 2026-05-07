import { afterEach, describe, expect, it, vi } from "vitest";
import { OllamaProvider } from "../../src/llm/OllamaProvider";

describe("OllamaProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests JSON chat output", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: "{\"speech\":\"hi\",\"emotion\":\"happy\"}",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider({ baseUrl: "http://localhost:11434" });
    await provider.generate("system", "user");

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
    expect(body["format"]).toBe("json");
    expect(body["stream"]).toBe(false);
    expect(body["think"]).toBe(false);
  });
});
