import React from 'react';
import { AlertTriangle, RotateCcw, Zap } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  declare props: Readonly<ErrorBoundaryProps>;
  declare state: ErrorBoundaryState;
  declare setState: (
    state:
      | ErrorBoundaryState
      | Partial<ErrorBoundaryState>
      | ((prevState: Readonly<ErrorBoundaryState>) => ErrorBoundaryState | Partial<ErrorBoundaryState>)
  ) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected runtime issue occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Twogether ErrorBoundary recovered exception:', error, info.componentStack);
  }

  handleRecover = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  handleHardReset = () => {
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F0E17] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl bg-zinc-950/90 border border-cyan-400/40 shadow-2xl shadow-cyan-500/20 p-6 space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-7 h-7 text-black" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-bold uppercase">
                <Zap className="w-3 h-3" /> Electric Shield Active
              </div>
              <h2 className="text-xl font-black text-white">Session Auto-Protected</h2>
              <p className="text-xs text-zinc-400">{this.state.errorMessage}</p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleRecover}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-black text-xs hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" /> Resume Instantly
              </button>
              <button
                type="button"
                onClick={this.handleHardReset}
                className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white font-bold text-xs hover:bg-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
