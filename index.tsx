import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// --- Error Boundary Component ---
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  public static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-red-500 p-8 font-mono">
          <div className="border border-red-500 p-6 rounded-lg max-w-2xl w-full bg-red-900/10">
            <h1 className="text-2xl font-bold mb-4">⚠️ SYSTEM CRITICAL FAILURE</h1>
            <p className="mb-4 text-white">L'application a rencontré une erreur fatale lors du rendu.</p>
            <pre className="bg-black/50 p-4 rounded text-xs overflow-auto text-red-300">
              {this.state.error?.toString()}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors"
            >
              REDÉMARRER LE SYSTÈME
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log("App Mounted Successfully");
} catch (e) {
  console.error("Failed to mount application:", e);
  // Fallback manuel si React ne se lance pas du tout
  rootElement.innerHTML = '<div style="color:red; padding:20px; font-family:monospace">CRITICAL BOOT ERROR: ' + e + '</div>';
}