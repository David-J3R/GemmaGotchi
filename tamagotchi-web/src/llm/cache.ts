/**
 * Detects whether the browser has cached model weights from a previous
 * session. Used by `App.tsx` to decide whether to show the full
 * BootScreen (cold start) or just the StatusLED (warm start).
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
