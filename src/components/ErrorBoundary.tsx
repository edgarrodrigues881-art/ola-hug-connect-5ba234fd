import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorCount: number;
  lastErrorMessage: string;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorCount: 0, lastErrorMessage: "" };
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, lastErrorMessage: `${error.name}: ${error.message}` };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const signature = `${error.name}: ${error.message}`;

    console.error("[ErrorBoundary] CAUGHT:", signature, {
      stack: error.stack,
      componentStack: info.componentStack,
    });
    console.error("[ErrorBoundary] Full error object:", error);
      componentStack: info.componentStack,
    });

    // Known browser translation / extension DOM mutation errors (Radix/React portals)
    const isRecoverableDomMutationError = /notfounderror|removechild|insertbefore|node to be removed is not a child/i.test(signature);

    if (isRecoverableDomMutationError) {
      requestAnimationFrame(() => {
        this.setState((prev) => ({
          hasError: false,
          errorCount: Math.max(0, prev.errorCount - 1),
        }));
      });
      return;
    }

    // Auto-recover up to 3 times for transient runtime errors
    if (this.state.errorCount < 3) {
      setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          errorCount: prev.errorCount + 1,
        }));
      }, 200);
    } else {
      // Auto-reset after 8 seconds even at max retries (handles HMR / transient crashes)
      if (this.resetTimer) clearTimeout(this.resetTimer);
      this.resetTimer = setTimeout(() => {
        this.setState({ hasError: false, errorCount: 0, lastErrorMessage: "" });
      }, 8000);
    }
  }

  render() {
    if (this.state.hasError && this.state.errorCount >= 3) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center space-y-4 p-8 max-w-sm">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-lg font-semibold text-foreground">Algo deu errado</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Se você está usando tradução automática, desative-a para melhor experiência.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
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
