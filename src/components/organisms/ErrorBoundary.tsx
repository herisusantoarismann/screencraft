import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Bug, ChevronDown, ChevronUp } from "lucide-react";
import { reportCrash } from "../../services/crashReporterService";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  isReporting: boolean;
  reportSent: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      isReporting: false,
      reportSent: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo, isReporting: true });

    // Automatically send crash report to Discord Webhook
    reportCrash({
      errorType: "React Error Boundary",
      error,
      componentStack: errorInfo.componentStack || undefined,
    })
      .then((success) => {
        this.setState({ isReporting: false, reportSent: success });
      })
      .catch(() => {
        this.setState({ isReporting: false, reportSent: false });
      });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "An unexpected error occurred.";
      const errorStack = this.state.error?.stack || this.state.errorInfo?.componentStack || "";

      return (
        <div className="w-screen h-screen flex items-center justify-center bg-neutral-950 text-neutral-100 p-6 select-none font-sans">
          <div className="max-w-lg w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
            {/* Header Icon + Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-bold text-white tracking-wide">
                  ScreenCraft Encountered an Issue
                </h1>
                <p className="text-xs text-neutral-400">
                  The application caught an unexpected error and safely stopped.
                </p>
              </div>
            </div>

            {/* Diagnostic Report Status Badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-950/70 border border-neutral-800/80 text-xs">
              <Bug className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-neutral-300">
                {this.state.isReporting
                  ? "Sending diagnostic telemetry to Discord Webhook..."
                  : this.state.reportSent
                  ? "Crash report successfully delivered to Discord Webhook."
                  : "Crash report logged. (Configure .env to send to Discord)"}
              </span>
            </div>

            {/* Error Message Box */}
            <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-xs text-rose-300 font-mono break-words max-h-24 overflow-y-auto">
              {errorMessage}
            </div>

            {/* Collapsible Details */}
            {errorStack && (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 hover:text-neutral-200 transition-colors w-fit cursor-pointer"
                >
                  {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{this.state.showDetails ? "Hide technical stack trace" : "View technical stack trace"}</span>
                </button>
                {this.state.showDetails && (
                  <pre className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-[10px] text-neutral-400 font-mono overflow-auto max-h-40 leading-relaxed select-text">
                    {errorStack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800/80">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Try to Recover
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
