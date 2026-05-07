/** Convenience hook — read the LLM context. Throws if not wrapped in `LLMContextProvider`. */
import { useContext } from "react";
import { LLMContext, type LLMContextValue } from "../llm/LLMContext";

export function useLLM(): LLMContextValue {
  const ctx = useContext(LLMContext);
  if (!ctx) {
    throw new Error("useLLM must be used within an LLMContextProvider");
  }
  return ctx;
}
