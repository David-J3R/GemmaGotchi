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
