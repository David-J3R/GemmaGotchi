/**
 * Ollama HTTP provider — talks to a local Ollama daemon (default
 * http://localhost:11434, model `gemma4:e2b`).
 *
 * `isAvailable()` pings /api/tags with a short timeout. `generate()`
 * POSTs to /api/chat with `think: false` so Gemma 4 returns visible
 * content instead of routing tokens into the hidden `thinking` channel.
 * `supportsImages()` is true — image bytes (base64) are passed in the
 * user message's `images` array.
 */
import type { LLMProvider, LoadProgress } from "./LLMProvider";

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "gemma4:e2b";
const GENERATE_TIMEOUT_MS = 120_000;
const AVAILABLE_TIMEOUT_MS = 3_000;

interface OllamaChatMessage {
  role: "system" | "user";
  content: string;
  images?: string[];
}

interface OllamaChatResponse {
  message?: {
    content?: string;
    thinking?: string;
  };
  error?: string;
}

export interface OllamaProviderOptions {
  baseUrl?: string;
  model?: string;
}

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama" as const;

  private baseUrl: string;
  private model: string;
  private progress: LoadProgress | null = null;

  constructor(options: OllamaProviderOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async isAvailable(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      AVAILABLE_TIMEOUT_MS,
    );
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async initialize(onProgress?: (p: LoadProgress) => void): Promise<void> {
    this.progress = { status: "Checking Ollama connection...", percent: 0 };
    onProgress?.(this.progress);
    const ok = await this.isAvailable();
    if (!ok) {
      this.progress = { status: "Ollama unreachable", percent: 0 };
      onProgress?.(this.progress);
      throw new Error(
        `Ollama not reachable at ${this.baseUrl}. Ensure the daemon is running.`,
      );
    }
    this.progress = { status: "Connected", percent: 100 };
    onProgress?.(this.progress);
  }

  supportsImages(): boolean {
    return true;
  }

  getLoadProgress(): LoadProgress | null {
    return this.progress;
  }

  async generate(
    systemPrompt: string,
    userMessage: string,
    image?: string,
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      GENERATE_TIMEOUT_MS,
    );

    const userMsg: OllamaChatMessage = {
      role: "user",
      content: userMessage,
    };
    if (image) userMsg.images = [image];

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            userMsg,
          ],
          stream: false,
          // Gemma 4 is thinking-capable in Ollama. Without this, Ollama may
          // put tokens in message.thinking while message.content stays empty.
          think: false,
          options: {
            num_predict: 512,
          },
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(
          `Ollama returned ${res.status}${detail ? `: ${detail}` : ""}`,
        );
      }
      const data = (await res.json()) as OllamaChatResponse;
      if (data.error) throw new Error(data.error);
      const content = data.message?.content?.trim();
      if (!content) {
        throw new Error(
          data.message?.thinking
            ? "Ollama returned only thinking output and no visible content."
            : "Ollama returned an empty response.",
        );
      }
      return content;
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error(String(err));
    } finally {
      clearTimeout(timer);
    }
  }

  dispose(): void {
    this.progress = null;
  }
}
