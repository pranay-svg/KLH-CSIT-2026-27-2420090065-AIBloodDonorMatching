import React, { useState } from 'react';
import { 
  Heart, 
  Building2, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  Droplet, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ShieldCheck,
  HeartHandshake,
  Activity,
  ArrowRight,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export function AuthGateway() {
  const { login, register, loginWithDemo, isLoading, authError, setAuthError } = useAuth();

  // Active Tab: 'login' | 'register'
  const [activeTab, setActiveTab] = useState('login');
  // Selected Role: 'admin' | 'donor' | 'user'
  const [selectedRole, setSelectedRole] = useState('admin');

  // Password Visibility Toggle
  const [showPassword, setShowPassword] = useState(false);

  // Local Form States - Login
  const [loginEmail, setLoginEmail] = useState('admin@bloodbank.org');
  const [loginPassword, setLoginPassword] = useState('admin123');

  // Local Form States - Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBloodGroup, setRegBloodGroup] = useState('O+');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('Bengaluru Healthcare Zone');
  const [regLatitude, setRegLatitude] = useState(12.9716);
  const [regLongitude, setRegLongitude] = useState(77.5946);
  const [geoNotice, setGeoNotice] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Local feedback message
  const [formFeedback, setFormFeedback] = useState(null);

  // 1-Click Demo Login
  const handle1ClickDemo = async (role) => {
    setSelectedRole(role);
    setFormFeedback(null);
    if (setAuthError) setAuthError(null);

    // Pre-populate input fields for visual feedback
    if (role === 'admin') {
      setLoginEmail('admin@bloodbank.org');
      setLoginPassword('admin123');
    } else if (role === 'donor') {
      setLoginEmail('donor@example.com');
      setLoginPassword('donor123');
    } else if (role === 'user') {
      setLoginEmail('user@example.com');
      setLoginPassword('user123');
    }

    try {
      await loginWithDemo(role);
    } catch (err) {
      setFormFeedback({ type: 'error', text: err.message || 'Demo login failed' });
    }
  };

  // Submit Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setFormFeedback(null);
    if (setAuthError) setAuthError(null);

    const trimmedEmail = loginEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setFormFeedback({ type: 'error', text: 'Please enter your email address.' });
      return;
    }
    if (!loginPassword) {
      setFormFeedback({ type: 'error', text: 'Please enter your password.' });
      return;
    }

    try {
      await login(trimmedEmail, loginPassword, null);
    } catch (err) {
      setFormFeedback({
        type: 'error',
        text: typeof err?.message === 'string' ? err.message : 'Authentication failed'
      });
    }
  };

  // Optional Geolocation for Registration
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation not supported by browser. Please enter address manually.');
      return;
    }
    setIsLocating(true);
    setGeoNotice('Detecting coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRegLatitude(Number(pos.coords.latitude.toFixed(4)));
        setRegLongitude(Number(pos.coords.longitude.toFixed(4)));
        setGeoNotice(`GPS attached: [${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}]`);
        setIsLocating(false);
      },
      (err) => {
        setGeoNotice(`GPS skipped (${err.message || 'denied'}). Defaulting to Bengaluru coordinates.`);
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  // Submit Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormFeedback(null);
    if (setAuthError) setAuthError(null);

    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim().toLowerCase();
    const trimmedPhone = regPhone.trim();
    const trimmedAddress = regAddress.trim();

    if (!trimmedName || !trimmedEmail || !regPassword) {
      setFormFeedback({ type: 'error', text: 'Please fill in all required fields (name, email, password).' });
      return;
    }

    if (trimmedName.length < 2) {
      setFormFeedback({ type: 'error', text: 'Full name must be at least 2 characters long.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setFormFeedback({ type: 'error', text: 'Please provide a valid email address.' });
      return;
    }

    if (regPassword.length < 6) {
      setFormFeedback({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        password: regPassword,
        role: selectedRole,
        blood_group: selectedRole === 'admin' ? 'O+' : regBloodGroup,
        phone: trimmedPhone || '+91 98000 00000',
        address: trimmedAddress || 'Bengaluru, India',
        latitude: regLatitude,
        longitude: regLongitude,
      };
      await register(payload);
    } catch (err) {
      setFormFeedback({
        type: 'error',
        text: typeof err?.message === 'string' ? err.message : 'Registration failed.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-100 flex flex-col justify-center relative overflow-hidden text-slate-900 selection:bg-sky-100 selection:text-sky-900">
      
      {/* Soft Ambient Medical Background Glow Blobs */}
      <div 
        className="absolute top-[-10%] left-[-5%] w-[480px] h-[480px] rounded-full bg-sky-200/40 blur-3xl pointer-events-none animate-blob-pulse" 
        aria-hidden="true" 
      />
      <div 
        className="absolute bottom-[-10%] right-[-5%] w-[480px] h-[480px] rounded-full bg-rose-200/30 blur-3xl pointer-events-none animate-blob-pulse" 
        style={{ animationDelay: '4s' }}
        aria-hidden="true" 
      />
      <div 
        className="absolute top-1/2 left-1/3 w-[360px] h-[360px] rounded-full bg-teal-200/25 blur-3xl pointer-events-none" 
        aria-hidden="true" 
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex-1 flex flex-col justify-center relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
          
          {/* ============================================================ */}
          {/* LEFT COLUMN: HERO, MODERN TYPOGRAPHY & DECORATIVE TECH VISUAL */}
          {/* ============================================================ */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-6 text-left animate-heroFadeUp">
            
            {/* Status Pill */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/90 text-slate-700 border border-slate-200 shadow-sm backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="tracking-wide">AI-POWERED EMERGENCY HEALTHCARE NETWORK</span>
              </span>
            </div>

            {/* Project Title & Short Description */}
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                AI-Adaptive Blood Donor Matching System
              </h1>
              <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-xl">
                An AI-powered platform that intelligently matches suitable blood donors with emergency requests using adaptive decision-making and real-time updates.
              </p>
            </div>

            {/* Subtle Abstract Medical Technology Visual */}
            <div className="pt-2 animate-float-slow hidden sm:block">
              <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-slate-200/80 p-5 shadow-lg shadow-slate-200/50 max-w-lg transition-all duration-300 hover:shadow-xl hover:border-slate-300">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Intelligent Dispatch Topology
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200/60">
                    Decision Engine Active
                  </span>
                </div>

                {/* SVG Topology illustration */}
                <div className="relative w-full h-36 flex items-center justify-center">
                  <svg className="w-full h-full overflow-visible" viewBox="0 -14 380 152" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="netGrad1" x1="60" y1="38" x2="300" y2="68" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#0284c7" stopOpacity="0.5" />
                        <stop stopColor="#e11d48" stopOpacity="0.8" />
                      </linearGradient>
                      <linearGradient id="netGrad2" x1="60" y1="100" x2="300" y2="68" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#0d9488" stopOpacity="0.5" />
                        <stop stopColor="#0284c7" stopOpacity="0.8" />
                      </linearGradient>
                      <linearGradient id="netGrad3" x1="170" y1="34" x2="300" y2="68" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#e11d48" stopOpacity="0.5" />
                        <stop stopColor="#0284c7" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>

                    {/* Subtle Connection Lines */}
                    <path d="M 60 38 C 140 16, 220 45, 300 68" stroke="url(#netGrad1)" strokeWidth="1.75" strokeDasharray="5 3" />
                    <path d="M 60 100 C 140 115, 220 88, 300 68" stroke="url(#netGrad2)" strokeWidth="1.75" strokeDasharray="5 3" />
                    <path d="M 170 34 C 215 42, 255 52, 300 68" stroke="url(#netGrad3)" strokeWidth="1.75" />

                    {/* Donor Node 1 */}
                    <g transform="translate(60, 38)">
                      <circle r="15" fill="#eff6ff" stroke="#0284c7" strokeWidth="1.5" />
                      <circle r="5" fill="#0284c7" />
                      <text x="0" y="-20" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="700">Donor (O-)</text>
                    </g>

                    {/* Donor Node 2 */}
                    <g transform="translate(60, 100)">
                      <circle r="15" fill="#f0fdf4" stroke="#10b981" strokeWidth="1.5" />
                      <circle r="5" fill="#10b981" />
                      <text x="0" y="28" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="700">Donor (A+)</text>
                    </g>

                    {/* Donor Node 3 */}
                    <g transform="translate(170, 34)">
                      <circle r="13" fill="#fff1f2" stroke="#e11d48" strokeWidth="1.5" />
                      <circle r="4" fill="#e11d48" />
                      <text x="0" y="-18" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="700">Donor (B+)</text>
                    </g>

                    {/* Central Hospital Hub */}
                    <g transform="translate(300, 68)">
                      <circle r="26" fill="#0284c7" fillOpacity="0.08" className="animate-pulse" />
                      <circle r="20" fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
                      <path d="M -4 -8 L 4 -8 L 4 -4 L 8 -4 L 8 4 L 4 4 L 4 8 L -4 8 L -4 4 L -8 4 L -8 -4 L -4 -4 Z" fill="#ffffff" />
                      <text x="0" y="36" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="700">Hospital Center</text>
                    </g>
                  </svg>
                </div>

                {/* Micro labels */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                    <Activity className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>Adaptive Distance Scoring</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                    <Radio className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Real-Time Dispatch Link</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: MODERN LIGHT AUTHENTICATION CARD               */}
          {/* ============================================================ */}
          <div className="lg:col-span-6 xl:col-span-5 w-full max-w-md mx-auto lg:mx-0 animate-heroFadeUp" style={{ animationDelay: '0.1s' }}>
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xl shadow-slate-200/60 transition-all duration-300 hover:shadow-2xl">
              
              {/* Login vs Register Tab Switcher */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setFormFeedback(null);
                  }}
                  className={`h-9 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'login'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setFormFeedback(null);
                  }}
                  className={`h-9 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'register'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>

              {/* Feedback Error / Notice */}
              {(formFeedback || authError) && (
                <div 
                  className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed font-medium">
                    {String(
                      (typeof formFeedback?.text === 'string' ? formFeedback.text : null) ||
                      (typeof authError === 'string' ? authError : null) ||
                      formFeedback?.text?.message ||
                      authError?.message ||
                      'An unexpected authentication error occurred.'
                    )}
                  </span>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 1: LOGIN FORM                                             */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="name@organization.com"
                        className="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Password Input with Visibility Toggle */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-11 pl-9 pr-10 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="h-8 w-8 absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs tracking-wide shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                        <span>Authenticating Session...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Sign In</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                      </>
                    )}
                  </button>

                  {/* Explore Demo Roles (1-Click Evaluation) */}
                  <div className="pt-5 border-t border-slate-100 mt-5">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        1-Click Evaluation Accounts
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handle1ClickDemo('admin')}
                        disabled={isLoading}
                        className="h-10 px-2 rounded-xl bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
                        title="1-Click Hospital Admin Login"
                      >
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">Admin</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handle1ClickDemo('donor')}
                        disabled={isLoading}
                        className="h-10 px-2 rounded-xl bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
                        title="1-Click Volunteer Donor Login"
                      >
                        <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">Donor</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handle1ClickDemo('user')}
                        disabled={isLoading}
                        className="h-10 px-2 rounded-xl bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
                        title="1-Click Patient / Family Login"
                      >
                        <HeartHandshake className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">Patient</span>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* ------------------------------------------------------------- */
                /* TAB 2: CREATE ACCOUNT (REGISTRATION) FORM                     */
                /* ------------------------------------------------------------- */
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Dr. Sunita Rao"
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Role
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200 cursor-pointer"
                    >
                      <option value="donor">Volunteer Donor</option>
                      <option value="user">Patient / Requester</option>
                      <option value="admin">Hospital Administrator</option>
                    </select>
                  </div>

                  {/* Password & Blood Group in 2 Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-10 pl-9 pr-9 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="h-8 w-8 absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Blood Group Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Droplet className="w-3.5 h-3.5 text-rose-500" />
                        Blood Group
                      </label>
                      <select
                        value={regBloodGroup}
                        onChange={(e) => setRegBloodGroup(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200 cursor-pointer"
                      >
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* City / Address with Optional GPS Detection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        City / Address
                      </label>
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isLocating}
                        className="h-7 px-2.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
                        title="Optional GPS coordinates detection"
                      >
                        <MapPin className={`w-3 h-3 ${isLocating ? 'animate-bounce text-rose-500' : 'text-sky-600'}`} />
                        <span>{isLocating ? 'Locating...' : 'Detect GPS (Optional)'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="e.g. Indiranagar, Bengaluru"
                      className="w-full h-10 px-3 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200"
                    />
                    {geoNotice && (
                      <span className="text-[11px] mt-1 block italic text-slate-500">
                        {geoNotice}
                      </span>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 mt-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs tracking-wide shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                        <span>Creating Profile...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Create Account</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                      </>
                    )}
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default AuthGateway;
