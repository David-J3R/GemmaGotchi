import type { LoadProgress } from "./LLMProvider";

/**
 * WebGPU inference is intentionally disabled for this app.
 * The local LLM brain is Ollama only.
 */
export class WebGPUProvider {
  readonly name = "webgpu" as const;

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async initialize(): Promise<void> {
    throw new Error("WebGPU inference is disabled. Use the local Ollama provider.");
  }

  supportsImages(): boolean {
    return false;
  }

  getLoadProgress(): LoadProgress | null {
    return null;
  }

  async generate(): Promise<string> {
    throw new Error("WebGPU inference is disabled. Use the local Ollama provider.");
  }

  dispose(): void {}
}
