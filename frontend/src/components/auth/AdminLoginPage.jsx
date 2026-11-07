import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle, 
  Loader2,
  Terminal
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

export function AdminLoginPage({ onBack }) {
  const { login, loginWithDemo, isLoading, authError, setAuthError } = useAuth();
  const [email, setEmail] = useState('admin@bloodbank.org');
  const [password, setPassword] = useState('admin123');
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (setAuthError) setAuthError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setLocalError('Please enter the admin email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter the admin passcode.');
      return;
    }

    try {
      await login(trimmedEmail, password, 'admin');
    } catch (err) {
      setLocalError(typeof err?.message === 'string' ? err.message : 'Login failed');
    }
  };

  const handleDemoFill = () => {
    setEmail('admin@bloodbank.org');
    setPassword('admin123');
    setLocalError(null);
    setAuthError(null);
  };

  const handleQuickLogin = async () => {
    try {
      await loginWithDemo('admin');
    } catch (err) {
      setLocalError(typeof err?.message === 'string' ? err.message : 'Quick login failed');
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative transition-colors"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="relative z-10 w-full max-w-md">
        
        {/* Back Link */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs mb-6 transition-colors cursor-pointer hover:text-white"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Role Gateway</span>
        </button>

        {/* Card Container */}
        <div 
          className="rounded-2xl border p-6 sm:p-8 shadow-2xl backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          
          {/* Header */}
          <div className="text-center mb-6">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg border"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                borderColor: 'rgba(99, 102, 241, 0.35)',
                color: 'var(--accent-secondary)',
              }}
            >
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div 
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider mb-2"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderColor: 'rgba(99, 102, 241, 0.25)',
                color: 'var(--accent-secondary)',
              }}
            >
              <Terminal className="w-3 h-3" />
              <span>Restricted Access</span>
            </div>
            <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
              Hospital Admin Command Center
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Authorized blood bank triage and emergency coordinator authentication
            </p>
          </div>

          {/* Quick Demo Autofill Notice */}
          <div 
            className="mb-6 p-3 rounded-xl border flex items-center justify-between gap-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Evaluation Mode Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDemoFill}
                className="text-[11px] font-bold px-2 py-1 rounded border hover:text-white cursor-pointer transition-colors"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                Autofill
              </button>
              <button
                type="button"
                onClick={handleQuickLogin}
                disabled={isLoading}
                className="text-[11px] font-bold px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors shadow flex items-center gap-1"
              >
                <span>1-Click In</span>
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {(localError || authError) && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="leading-snug">
                {String(
                  (typeof localError === 'string' ? localError : null) ||
                  (typeof authError === 'string' ? authError : null) ||
                  localError?.message ||
                  authError?.message ||
                  'An error occurred'
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bloodbank.org"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Passcode / Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating Admin Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In to Admin Command Room</span>
                </>
              )}
            </button>
          </form>

          {/* Academic Footer */}
          <div 
            className="mt-6 pt-4 border-t text-center text-[11px]"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            Protected by JWT HMAC-SHA256 • Role-Enforced Security
          </div>

        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
