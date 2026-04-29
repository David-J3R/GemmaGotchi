import { useContext } from "react";
import { LLMContext, type LLMContextValue } from "../llm/LLMContext";

export function useLLM(): LLMContextValue {
  const ctx = useContext(LLMContext);
  if (!ctx) {
    throw new Error("useLLM must be used within an LLMContextProvider");
  }
  return ctx;
}
