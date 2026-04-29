import { useRef, useState } from "react";
import { useLLM } from "../hooks/useLLM";
import { OllamaProvider } from "../llm/OllamaProvider";
import {
  exportAllSaves,
  importAllSaves,
  clearAllData,
} from "../engine/storage";
import styles from "./SettingsOverlay.module.css";

interface Props {
  onClose: () => void;
  onDataCleared: () => void;
}

type TestState = "idle" | "testing" | "ok" | "fail";

export function SettingsOverlay({ onClose, onDataCleared }: Props) {
  const {
    providerName,
    isReady,
    isLoading,
    error,
    switchProvider,
    ollamaBaseUrl,
    setOllamaBaseUrl,
  } = useLLM();

  const [urlDraft, setUrlDraft] = useState(ollamaBaseUrl);
  const [testState, setTestState] = useState<TestState>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleTestOllama = async () => {
    setTestState("testing");
    const ok = await new OllamaProvider({ baseUrl: urlDraft }).isAvailable();
    setTestState(ok ? "ok" : "fail");
  };

  const handleApplyOllamaUrl = async () => {
    setOllamaBaseUrl(urlDraft);
    if (providerName === "ollama") {
      await switchProvider("ollama");
    }
  };

  const handleExport = async () => {
    try {
      const bundle = await exportAllSaves();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tamagotchi-save-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg("Export complete.");
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleImportClick = () => fileRef.current?.click();

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);
      const n = await importAllSaves(bundle);
      setStatusMsg(`Imported ${n} slot${n === 1 ? "" : "s"}.`);
      onDataCleared();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Import failed");
    }
  };

  const handleClear = async () => {
    if (!confirm("Delete ALL pets? This cannot be undone.")) return;
    await clearAllData();
    setStatusMsg("All data cleared.");
    onDataCleared();
  };

  const statusLabel = error
    ? `Error: ${error}`
    : isLoading
    ? "Loading..."
    : isReady
    ? "Ready"
    : "Idle";

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>LLM Provider</h3>
          <div className={styles.row}>
            <span className={styles.label}>Active</span>
            <span className={styles.value}>
              {providerName ?? "none"} · {statusLabel}
            </span>
          </div>
          <div className={styles.providerBtns}>
            <button
              className={
                providerName === "ollama"
                  ? styles.providerBtnActive
                  : styles.providerBtn
              }
              onClick={() => switchProvider("ollama")}
              disabled={isLoading}
            >
              Ollama
            </button>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Ollama URL</span>
          </div>
          <div className={styles.urlRow}>
            <input
              type="text"
              className={styles.urlInput}
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="http://localhost:11434"
            />
            <button className={styles.smallBtn} onClick={handleTestOllama}>
              Test
            </button>
            <button className={styles.smallBtn} onClick={handleApplyOllamaUrl}>
              Apply
            </button>
          </div>
          {testState === "testing" && (
            <div className={styles.statusNeutral}>Testing...</div>
          )}
          {testState === "ok" && (
            <div className={styles.statusOk}>Connected.</div>
          )}
          {testState === "fail" && (
            <div className={styles.statusFail}>Unreachable.</div>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Data</h3>
          <button className={styles.dataBtn} onClick={handleExport}>
            Export save
          </button>
          <button className={styles.dataBtn} onClick={handleImportClick}>
            Import save
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className={styles.hiddenFile}
            onChange={handleFileImport}
          />
          <button
            className={`${styles.dataBtn} ${styles.dangerBtn}`}
            onClick={handleClear}
          >
            Delete all data
          </button>
          {statusMsg && <div className={styles.statusNeutral}>{statusMsg}</div>}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>About</h3>
          <p className={styles.aboutText}>
            AI Tamagotchi · powered by a local Ollama brain.
          </p>
          <p className={styles.aboutText}>
            <a
              href="https://ollama.com/"
              target="_blank"
              rel="noreferrer"
              className={styles.link}
            >
              Ollama
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
