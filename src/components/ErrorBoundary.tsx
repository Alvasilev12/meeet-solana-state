import React, { Component, ErrorInfo, ReactNode } from "react";
import { Home, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackUrl?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null, showDetails: false };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: null, showDetails: false });
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-lg w-full text-center space-y-6">
            <span className="text-xl font-bold tracking-tight text-foreground font-display">MEEET</span>

            <h1
              className="text-5xl sm:text-6xl font-black font-display leading-none"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(190 90% 55%) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "glitch 2s infinite",
              }}
            >
              Oops!
            </h1>

            <h2 className="text-xl font-bold text-foreground font-display">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. You can try reloading or head back home.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold hover:from-purple-500 hover:to-purple-400 transition-all min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <button
                onClick={() => { window.location.href = this.props.fallbackUrl || "/"; }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-cyan-500/40 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/10 transition-colors min-h-[44px]"
              >
                <Home className="w-4 h-4" /> Go Home
              </button>
            </div>

            {this.state.error && (
              <div className="pt-4">
                <button
                  onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors min-h-[44px]"
                  aria-label="Toggle error details"
                >
                  Error details {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 p-3 rounded-lg bg-muted/30 border border-border text-left text-xs text-muted-foreground overflow-auto max-h-48 font-mono">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                )}
              </div>
            )}
          </div>

          <style>{`
            @keyframes glitch {
              0%, 90%, 100% { transform: translate(0); }
              92% { transform: translate(-2px, 1px); }
              94% { transform: translate(2px, -1px); }
              96% { transform: translate(-1px, -1px); }
              98% { transform: translate(1px, 1px); }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
