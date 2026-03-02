// ============================================================================
// COMPONENTE: ErrorBoundary.tsx
// Aísla crashes por módulo — un error en Radar no tira Cotizaciones.
// Usa variables pg- del design system, sin necesidad de prop dark.
// ============================================================================

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ErrorBoundary] Módulo "${this.props.moduleName ?? 'desconocido'}" falló:`,
      error,
      info.componentStack,
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { moduleName = 'este módulo' } = this.props;

    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="pg-card max-w-md w-full text-center space-y-6">

          {/* Ícono */}
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20
                          flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71
                   c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898
                   0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          {/* Mensaje */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-pg-text">
              Algo falló en {moduleName}
            </h3>
            <p className="text-sm text-pg-muted">
              El error fue aislado — el resto de la app sigue funcionando.
            </p>
            {this.state.error?.message && (
              <p className="text-xs font-mono bg-red-500/5 border border-red-500/10
                            text-red-400 rounded-lg px-3 py-2 mt-3 text-left break-all">
                {this.state.error.message}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-5 py-2 rounded-lg bg-pg-primary hover:bg-pg-primary/80
                         text-white text-sm font-semibold transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-lg border border-pg-border hover:bg-pg-card
                         text-pg-muted text-sm font-semibold transition-colors"
            >
              Recargar app
            </button>
          </div>

        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
