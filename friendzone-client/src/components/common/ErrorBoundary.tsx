import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log sanitized error diagnostics without exposing sensitive credentials
    console.error('🔴 [React ErrorBoundary] Uncaught UI error:', {
      message: error?.message,
      stack: errorInfo?.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-[#07080d] text-white flex items-center justify-center p-4 sm:p-6 select-none">
          <div className="relative max-w-md w-full rounded-3xl border border-white/10 bg-[#0d101d]/90 p-6 sm:p-8 text-center backdrop-blur-2xl shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-5 shadow-lg shadow-rose-950/30 animate-pulse">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              An unexpected error occurred while rendering this view. Your data is safe. You can try reloading or returning to the home screen.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-md active:scale-95 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Try Again
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition active:scale-95 cursor-pointer"
              >
                Reload Page
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition cursor-pointer"
              >
                <Home className="h-3 w-3" /> Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
