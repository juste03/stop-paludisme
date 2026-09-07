import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetData = () => {
    if (window.confirm("Voulez-vous réinitialiser le cache local et recharger ?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h1 className="text-xl font-black text-white">Une erreur d'affichage est survenue</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              L'application a rencontré une anomalie inattendue. Cliquez ci-dessous pour actualiser l'écran.
            </p>
            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-lg text-left overflow-x-auto text-[11px] text-red-300 font-mono border border-red-900/50 max-h-32">
                {this.state.error.message}
              </div>
            )}
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30"
              >
                Actualiser l'application
              </button>
              <button
                onClick={this.handleResetData}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-[11px] font-bold transition-all"
              >
                Vider le cache local & recharger
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
