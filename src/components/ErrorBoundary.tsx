import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ErrorBoundary [${this.props.moduleName || 'Unknown Module'}]:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="w-full h-full min-h-[120px] rounded-xl border border-red-500/20 bg-[#080b11]/80 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
            <span className="text-red-500 font-bold text-xl">!</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">
            Fallo en el módulo {this.props.moduleName && <span className="text-red-400">({this.props.moduleName})</span>}
          </h3>
          <p className="text-xs max-w-[250px] opacity-70">
            No hay datos disponibles o ha ocurrido un error al cargar este componente.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
