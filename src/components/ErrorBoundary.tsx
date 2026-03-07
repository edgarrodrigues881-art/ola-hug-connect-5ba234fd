import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Google Translate / browser translation corrupts React DOM
    const isTranslationError =
      error.message?.includes("removeChild") ||
      error.message?.includes("insertBefore") ||
      error.message?.includes("appendChild") ||
      error.message?.includes("NotFoundError") ||
      error.message?.includes("not a child");

    if (isTranslationError) {
      console.warn("[ErrorBoundary] DOM corruption detected (likely browser translation). Recovering...");
      // Small delay then recover
      setTimeout(() => this.setState({ hasError: false }), 100);
    } else {
      console.error("[ErrorBoundary]", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center space-y-3 p-6 max-w-sm">
            <p className="text-lg font-semibold text-foreground">Algo deu errado</p>
            <p className="text-sm text-muted-foreground">
              Se você está usando tradução automática, desative-a para melhor experiência.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
