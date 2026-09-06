import React, { ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WeatherGPT UI Error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    const props = (this as any).props as ErrorBoundaryProps;
    if (props && props.onReset) {
      props.onReset();
    }
  };

  public render() {
    const state = (this as any).state as ErrorBoundaryState;
    const props = (this as any).props as ErrorBoundaryProps;

    if (state && state.hasError) {
      if (props && props.fallback) {
        return props.fallback;
      }

      return (
        <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 bg-slate-900 text-white text-center select-none">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-800 border border-slate-700 shadow-2xl flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl mb-3 text-amber-400">
              ⚠️
            </div>
            <h3 className="text-base font-black text-white mb-1">
              Weather Map temporarily unavailable
            </h3>
            <p className="text-xs text-slate-300 mb-4 max-w-xs">
              We encountered a minor display issue loading map assets. Tap below to refresh the view.
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer active:scale-95 shadow-md"
            >
              🔄 Refresh View
            </button>
          </div>
        </div>
      );
    }

    return props?.children || null;
  }
}
