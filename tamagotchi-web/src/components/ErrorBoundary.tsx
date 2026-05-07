import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("App crashed:", error, info.componentStack);
  }

  private reload = () => {
    this.setState({ hasError: false, message: "" });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "var(--stage-bg)",
          color: "var(--text-primary)",
          textAlign: "center",
          gap: "0.75rem",
        }}
      >
        <h1 style={{ fontSize: "1.4rem", fontWeight: 900 }}>Something broke.</h1>
        <p style={{ fontSize: "0.9rem", opacity: 0.8, maxWidth: 320 }}>
          {this.state.message || "An unknown error occurred."}
        </p>
        <button
          onClick={this.reload}
          style={{
            padding: "0.7rem 1.2rem",
            background: "var(--stat-fill-green)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontWeight: 900,
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
