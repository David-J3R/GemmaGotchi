/**
 * LLM provider interface — backend abstraction for the pet's AI brain.
 *
 * Currently the only implementation is `OllamaProvider` (local Ollama
 * daemon). The provider is owned by `LLMContext`, which exposes a plain
 * `generate()` function to the rest of the app via the `useLLM` hook.
 */

export type ProviderName = "ollama";

export interface LoadProgress {
  status: string;
  percent: number;
}

export type GenerateFn = (
  systemPrompt: string,
  userMessage: string,
  image?: string,
) => Promise<string>;

export interface LLMProvider {
  readonly name: ProviderName;
  isAvailable(): Promise<boolean>;
  initialize(onProgress?: (p: LoadProgress) => void): Promise<void>;
  generate(
    systemPrompt: string,
    userMessage: string,
    image?: string,
  ): Promise<string>;
  supportsImages(): boolean;
  getLoadProgress(): LoadProgress | null;
  dispose(): void;
}
