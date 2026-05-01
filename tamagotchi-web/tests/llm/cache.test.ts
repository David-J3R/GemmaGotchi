import { describe, it, expect, beforeEach, vi } from "vitest";
import { hasCachedModel } from "../../src/llm/cache";

describe("hasCachedModel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns false when no cache API is available", async () => {
    const result = await hasCachedModel({ caches: undefined as unknown as CacheStorage });
    expect(result).toBe(false);
  });

  it("returns false when transformers cache is empty", async () => {
    const fakeCaches = {
      keys: vi.fn().mockResolvedValue([]),
    } as unknown as CacheStorage;
    const result = await hasCachedModel({ caches: fakeCaches });
    expect(result).toBe(false);
  });

  it("returns true when at least one transformers-related cache exists", async () => {
    const fakeCaches = {
      keys: vi.fn().mockResolvedValue(["transformers-cache", "other-cache"]),
    } as unknown as CacheStorage;
    const result = await hasCachedModel({ caches: fakeCaches });
    expect(result).toBe(true);
  });

  it("returns false when caches.keys throws", async () => {
    const fakeCaches = {
      keys: vi.fn().mockRejectedValue(new Error("boom")),
    } as unknown as CacheStorage;
    const result = await hasCachedModel({ caches: fakeCaches });
    expect(result).toBe(false);
  });
});
