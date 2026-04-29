import { useLLM } from "../hooks/useLLM";

export function ModelLoader() {
  const { providerName, isReady, isLoading, loadProgress, error, runtimeError } =
    useLLM();

  if (error) {
    return (
      <div
        style={{
          padding: "1rem",
          background: "#fee",
          border: "2px solid #c44",
          borderRadius: 8,
          color: "#822",
          fontSize: "0.9rem",
        }}
      >
        <strong>LLM unavailable</strong>
        <p style={{ margin: "0.5rem 0 0" }}>{error}</p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem" }}>
          Start Ollama locally with <code>ollama serve</code> and install the
          configured model.
        </p>
      </div>
    );
  }

  if (!isLoading && isReady) {
    return (
      <div
        style={{
          padding: "0.5rem 0.75rem",
          background: runtimeError ? "#fff4e0" : "#eef9e9",
          border: runtimeError ? "1px solid #e0b070" : "1px solid #b8d8a8",
          borderRadius: 6,
          color: runtimeError ? "#7a4a10" : "#2a5a20",
          fontSize: "0.8rem",
        }}
      >
        {runtimeError ? (
          <>
            <strong>LLM warning:</strong> {runtimeError}
          </>
        ) : (
          "Connected to Ollama."
        )}
      </div>
    );
  }

  const pct = loadProgress?.percent ?? 0;
  const status = loadProgress?.status ?? "Initializing...";

  return (
    <div
      style={{
        padding: "1rem",
        background: "#fff8e5",
        border: "2px solid #e0c880",
        borderRadius: 8,
        fontSize: "0.9rem",
      }}
    >
          <div style={{ marginBottom: "0.5rem" }}>
        <strong>Connecting to Ollama</strong>
      </div>
      <div style={{ fontSize: "0.8rem", color: "#555", marginBottom: "0.5rem" }}>
        {status}
      </div>
      <div
        style={{
          background: "#eadfbf",
          borderRadius: 4,
          height: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "#c49820",
            transition: "width 0.2s",
          }}
        />
      </div>
      {providerName === "ollama" && pct < 100 && (
        <div style={{ fontSize: "0.75rem", color: "#777", marginTop: "0.5rem" }}>
          Make sure Ollama is running and the configured local model is installed.
        </div>
      )}
    </div>
  );
}
