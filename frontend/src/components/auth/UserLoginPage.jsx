import React, { useState } from 'react';
import { 
  Stethoscope, 
  Lock, 
  Mail, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle, 
  Loader2,
  User,
  Phone,
  Droplet,
  MapPin,
  CheckCircle2
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

export function UserLoginPage({ onBack }) {
  const { login, register, loginWithDemo, isLoading, authError, setAuthError } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  
  // Login Form
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('user123');

  // Register Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBloodGroup, setRegBloodGroup] = useState('A+');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('Indiranagar, Bengaluru');

  const [localError, setLocalError] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (setAuthError) setAuthError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    try {
      await login(trimmedEmail, password, 'user');
    } catch (err) {
      setLocalError(typeof err?.message === 'string' ? err.message : 'Login failed');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (setAuthError) setAuthError(null);

    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim().toLowerCase();
    const trimmedPhone = regPhone.trim();
    const trimmedAddress = regAddress.trim();

    if (!trimmedName || !trimmedEmail || !regPassword) {
      setLocalError('Please fill in all required fields (name, email, password).');
      return;
    }

    if (trimmedName.length < 2) {
      setLocalError('Full name must be at least 2 characters long.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setLocalError('Please provide a valid email address.');
      return;
    }

    if (regPassword.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    try {
      await register({
        name: trimmedName,
        email: trimmedEmail,
        password: regPassword,
        role: 'user',
        blood_group: regBloodGroup,
        phone: trimmedPhone || '+91 98111 22334',
        address: trimmedAddress || 'Indiranagar, Bengaluru',
        latitude: 12.9784,
        longitude: 77.6408,
      });
    } catch (err) {
      setLocalError(typeof err?.message === 'string' ? err.message : 'Registration failed');
    }
  };

  const handleDemoFill = () => {
    setEmail('user@example.com');
    setPassword('user123');
    setLocalError(null);
    setAuthError(null);
  };

  const handleQuickLogin = async () => {
    try {
      await loginWithDemo('user');
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
          className="inline-flex items-center gap-2 text-xs mb-6 transition-colors cursor-pointer hover:text-rose-600"
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
              className="w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-3 shadow-lg"
              style={{
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                borderColor: 'rgba(2, 132, 199, 0.3)',
                color: '#0284c7',
              }}
            >
              <Stethoscope className="w-7 h-7" />
            </div>
            <div 
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider mb-2"
              style={{
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                borderColor: 'rgba(2, 132, 199, 0.25)',
                color: '#0284c7',
              }}
            >
              <Droplet className="w-3 h-3" />
              <span>Recipient Care Portal</span>
            </div>
            <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
              Patient / Recipient Portal
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Broadcast emergency blood requirements and track matched donor responses in real-time
            </p>
          </div>

          {/* Tab Selector: Login vs Register */}
          <div 
            className="flex rounded-xl p-1 mb-6 border"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => { setTab('login'); setLocalError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tab === 'login'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setLocalError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tab === 'register'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Quick Demo Autofill Notice (Only in Login mode) */}
          {tab === 'login' && (
            <div className="mb-6 p-3 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-sky-800 font-medium">
                <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="truncate">Demo: Siddharth Rao (A+)</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="text-[11px] font-bold px-2 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 cursor-pointer transition-colors"
                >
                  Autofill
                </button>
                <button
                  type="button"
                  onClick={handleQuickLogin}
                  disabled={isLoading}
                  className="text-[11px] font-bold px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white cursor-pointer transition-colors shadow flex items-center gap-1"
                >
                  <span>1-Click In</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Notice */}
          {(localError || authError) && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
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

          {/* Login Form */}
          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <Stethoscope className="w-4 h-4" />
                    <span>Enter Recipient Portal</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name / Patient Contact
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Siddharth Rao"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={regBloodGroup}
                    onChange={(e) => setRegBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emergency Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 98111..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="siddharth@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password (min 6 chars)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hospital or Patient Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="e.g. Manipal Hospital, HAL Airport Rd"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Patient Registration</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Academic Footer */}
          <div className="mt-6 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-500">
            Emergency requests are broadcast in real-time over WebSocket
          </div>

        </div>
      </div>
    </div>
  );
}
