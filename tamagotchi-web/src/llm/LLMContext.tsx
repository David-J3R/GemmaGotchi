/**
 * React context that owns the active LLM provider lifecycle.
 *
 * Auto-detects Ollama on mount and initializes it; surfaces ready/loading
 * state, init errors, and the most recent runtime (generate) error so the
 * UI can show a StatusLED and BootScreen without each consumer re-doing
 * provider plumbing. Exposes `generate` (with a graceful fallback string
 * if the model fails) and `switchProvider` for the settings overlay.
 *
 * Consume via the `useLLM` hook — never import this context directly.
 */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  GenerateFn,
  LLMProvider,
  LoadProgress,
  ProviderName,
} from "./LLMProvider";
import { OllamaProvider } from "./OllamaProvider";

export interface LLMContextValue {
  providerName: ProviderName | null;
  isReady: boolean;
  isLoading: boolean;
  loadProgress: LoadProgress | null;
  error: string | null;
  /** Last generate() failure (e.g. GPU TDR) — distinct from init error. */
  runtimeError: string | null;
  supportsImages: boolean;
  generate: GenerateFn;
  switchProvider: (name: ProviderName) => Promise<void>;
  ollamaBaseUrl: string;
  setOllamaBaseUrl: (url: string) => void;
}

export const LLMContext = createContext<LLMContextValue | null>(null);

const fallbackGenerate: GenerateFn = async () => "*tilts head and blinks*";

interface Props {
  children: ReactNode;
  preferredProvider?: ProviderName;
  ollamaBaseUrl?: string;
}

export function LLMContextProvider({
  children,
  preferredProvider,
  ollamaBaseUrl: initialBaseUrl = "http://localhost:11434",
}: Props) {
  const [providerName, setProviderName] = useState<ProviderName | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [supportsImages, setSupportsImages] = useState(false);
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(initialBaseUrl);

  const providerRef = useRef<LLMProvider | null>(null);
  const initSeqRef = useRef(0);

  const disposeActive = useCallback(() => {
    providerRef.current?.dispose();
    providerRef.current = null;
  }, []);

  const initProvider = useCallback(
    async (target: ProviderName) => {
      const seq = ++initSeqRef.current;
      disposeActive();
      setIsLoading(true);
      setIsReady(false);
      setError(null);
      setRuntimeError(null);
      setLoadProgress(null);

      const provider: LLMProvider = new OllamaProvider({
        baseUrl: ollamaBaseUrl,
      });

      try {
        const available = await provider.isAvailable();
        if (seq !== initSeqRef.current) {
          provider.dispose();
          return;
        }
        if (!available) {
          throw new Error(`${target} is not available`);
        }
        await provider.initialize((p) => {
          if (seq === initSeqRef.current) setLoadProgress(p);
        });
        if (seq !== initSeqRef.current) {
          provider.dispose();
          return;
        }
        providerRef.current = provider;
        setProviderName(target);
        setSupportsImages(provider.supportsImages());
        setIsReady(true);
      } catch (err) {
        provider.dispose();
        if (seq !== initSeqRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setIsReady(false);
      } finally {
        if (seq === initSeqRef.current) setIsLoading(false);
      }
    },
    [disposeActive, ollamaBaseUrl],
  );

  // Auto-select on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (preferredProvider) {
        await initProvider(preferredProvider);
        return;
      }

      const ollamaAvailable = await new OllamaProvider({
        baseUrl: ollamaBaseUrl,
      }).isAvailable();
      if (cancelled) return;
      if (ollamaAvailable) {
        await initProvider("ollama");
        return;
      }

      if (!cancelled) {
        setError(
          `Ollama is not reachable at ${ollamaBaseUrl}. Start Ollama locally and make sure the selected model is installed.`,
        );
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => disposeActive();
  }, [disposeActive]);

  const switchProvider = useCallback(
    async (name: ProviderName) => {
      await initProvider(name);
    },
    [initProvider],
  );

  const generate = useCallback<GenerateFn>(
    async (systemPrompt, userMessage, image) => {
      const p = providerRef.current;
      if (!p || !isReady) return fallbackGenerate(systemPrompt, userMessage, image);
      try {
        const result = await p.generate(systemPrompt, userMessage, image);
        // Clear stale runtime errors on a successful generation.
        setRuntimeError((prev) => (prev ? null : prev));
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[LLM] generate failed:", msg);
        setRuntimeError(msg);
        return "*looks up at you and wiggles*";
      }
    },
    [isReady, initProvider],
  );

  const value = useMemo<LLMContextValue>(
    () => ({
      providerName,
      isReady,
      isLoading,
      loadProgress,
      error,
      runtimeError,
      supportsImages,
      generate,
      switchProvider,
      ollamaBaseUrl,
      setOllamaBaseUrl,
    }),
    [
      providerName,
      isReady,
      isLoading,
      loadProgress,
      error,
      runtimeError,
      supportsImages,
      generate,
      switchProvider,
      ollamaBaseUrl,
    ],
  );

  return <LLMContext.Provider value={value}>{children}</LLMContext.Provider>;
}
