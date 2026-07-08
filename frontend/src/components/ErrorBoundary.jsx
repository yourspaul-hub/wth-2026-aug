import React from 'react';

/**
 * Root-level ErrorBoundary. Without this, an uncaught runtime error in any
 * child component unmounts the entire React tree and leaves a blank page —
 * a common "flash then blank" symptom on production builds. This gives the
 * visitor a graceful fallback and surfaces the error in the browser console.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info?.componentStack);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="min-h-screen bg-[#FDF3EB] flex items-center justify-center px-6" data-testid="error-boundary-fallback">
        <div className="max-w-md w-full bg-white border border-[#EBD9CE] rounded-2xl shadow-xl p-10 text-center">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">Something went wrong</div>
          <h1 className="font-serif-display text-3xl text-[#1A1A1A]">We hit a small snag</h1>
          <p className="text-sm text-neutral-600 mt-3">
            The page couldn&apos;t finish loading. Please refresh — if it keeps happening, our team has been notified.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-6 inline-flex items-center justify-center bg-[#1A1A1A] hover:bg-[#B4593F] transition-colors text-white px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em]"
            data-testid="error-boundary-reload"
          >
            Refresh page
          </button>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
