import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render errors so a bad message or corrupt export shows a recovery
 * screen instead of a blank window.
 */
class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
    window.electronAPI?.logError(`Render error: ${error.message}`, `${error.stack}
${info.componentStack}`);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50 dark:bg-slate-900">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Something went wrong</h1>
        <p className="mt-3 max-w-xl text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300 p-3 rounded-md">
          {this.state.error.message}
        </p>
        <button
          onClick={() => { window.location.hash = '#/'; window.location.reload(); }}
          className="mt-8 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
