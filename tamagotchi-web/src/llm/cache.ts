/**
 * Returns true if the browser has any cache entries that look like
 * transformers.js / WebGPU model weights. Used to decide whether to
 * show the full BootScreen (cold) or just the StatusLED (warm).
 */
export interface HasCachedModelDeps {
  caches?: CacheStorage;
}

export async function hasCachedModel(deps: HasCachedModelDeps = {}): Promise<boolean> {
  const c = deps.caches ?? (typeof caches !== "undefined" ? caches : undefined);
  if (!c) return false;
  try {
    const keys = await c.keys();
    return keys.some((k) => k.toLowerCase().includes("transformers"));
  } catch {
    return false;
  }
}
