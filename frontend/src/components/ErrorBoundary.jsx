import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Modern React Error Boundary component.
 * Catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a resilient fallback UI instead of a blank page crash.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled rendering crash:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    // Clear storage keys that might cause persistent re-render crash loops
    localStorage.removeItem('blood_donor_token');
    localStorage.removeItem('blood_donor_role');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMessage =
        this.state.error?.message ||
        (typeof this.state.error === 'string'
          ? this.state.error
          : 'An unexpected rendering error occurred.');

      return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-900">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 text-center animate-fadeIn">
            
            {/* Error Icon */}
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Title & Subtext */}
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              Application Error Encountered
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
              An unexpected user interface error occurred. The system safely intercepted the crash to prevent data loss.
            </p>

            {/* Error details preview */}
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-800 text-xs text-left font-mono break-all max-h-36 overflow-y-auto leading-relaxed">
              <span className="font-bold text-rose-900 block mb-1">Error Details:</span>
              {errorMessage}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="h-11 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-200 transition cursor-pointer active:scale-95"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
              AI Blood Donor Coordination Platform • Defensive Resilience Mode
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
