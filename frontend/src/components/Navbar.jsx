import React, { useState } from 'react';
import { 
  Activity, 
  Sparkles, 
  LogOut, 
  FileText, 
  Sliders, 
  Users, 
  RotateCcw,
  HelpCircle,
  Menu,
  X,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({
  backendStatus = 'online',
  wsStatus = 'connected',
  activeEmergency = null,
  onOpenTour,
  onOpenSimulator,
  onOpenDonorPortal,
  onOpenReport,
  onOpenCopilot,
  onResetSeedData,
  isResetting = false,
}) => {
  const { currentUser, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Derive unified, truthful system health indicator
  const getSystemHealth = () => {
    if (backendStatus === 'offline') {
      return {
        label: 'Offline',
        dotColor: 'bg-rose-500',
        textColor: 'text-rose-600 dark:text-rose-400',
        borderColor: 'border-rose-500/30',
        bgColor: 'bg-rose-500/10',
        ping: false,
      };
    }
    if (wsStatus === 'connecting') {
      return {
        label: 'Reconnecting',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-600 dark:text-amber-400',
        borderColor: 'border-amber-500/30',
        bgColor: 'bg-amber-500/10',
        ping: true,
      };
    }
    if (backendStatus === 'online' && wsStatus === 'connected') {
      return {
        label: 'All Systems Operational',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        borderColor: 'border-emerald-500/30',
        bgColor: 'bg-emerald-500/10',
        ping: true,
      };
    }
    return {
      label: 'Live',
      dotColor: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-emerald-500/10',
      ping: false,
    };
  };

  const health = getSystemHealth();
  const isAdmin = currentUser?.role === 'admin';

  // Format role label cleanly
  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Hospital Admin', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' };
      case 'donor':
        return { label: 'Volunteer Donor', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' };
      case 'user':
        return { label: 'Patient / Requester', color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' };
      default:
        return { label: role?.toUpperCase() || 'User', color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' };
    }
  };

  const roleMeta = getRoleBadge(currentUser?.role);

  return (
    <header 
      className="backdrop-blur-md border-b sticky top-0 z-40 px-3 sm:px-4 lg:px-6 py-2.5 shadow-sm transition-colors"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand & Platform Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 transition-transform hover:scale-105"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
            }}
          >
            <Activity className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span 
                className="text-xs sm:text-sm lg:text-base font-black tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                AI Blood Donor Matching
              </span>
              {activeEmergency && (
                <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  <ShieldAlert className="w-3 h-3" />
                  <span>{activeEmergency.emergency_level}</span>
                </span>
              )}
            </div>
            <p 
              className="text-[10px] sm:text-xs hidden md:block"
              style={{ color: 'var(--text-muted)' }}
            >
              Real-time emergency donor coordination & response network
            </p>
          </div>
        </div>

        {/* Right Section: System Health, Tour, Themes, User & Logout */}
        <div className="flex items-center gap-2">
          
          {/* Real System Health Status Badge */}
          <div 
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${health.bgColor} ${health.textColor} ${health.borderColor}`}
            title={`REST: ${backendStatus} • WebSocket: ${wsStatus}`}
          >
            <span className="relative flex h-2 w-2">
              {health.ping && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${health.dotColor}`} />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${health.dotColor}`} />
            </span>
            <span>{health.label}</span>
          </div>

          {/* Quick Tour Button */}
          {onOpenTour && (
            <button
              type="button"
              onClick={onOpenTour}
              className="h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:opacity-90 active:scale-[0.97]"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              title="Interactive Platform Quick Tour"
              aria-label="Open Quick Tour"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline text-[11px] font-bold">Quick Tour</span>
            </button>
          )}


          {/* Admin Tools Toolbar (Desktop) */}
          {isAdmin && (
            <div className="hidden xl:flex items-center gap-1.5 pl-2 border-l" style={{ borderColor: 'var(--border-subtle)' }}>
              {onOpenCopilot && (
                <button
                  onClick={onOpenCopilot}
                  className="h-8 px-2.5 rounded-lg text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer hover:opacity-90 active:scale-[0.97]"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                  title="Explainable AI Matching Copilot"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Copilot</span>
                </button>
              )}

              {onOpenReport && (
                <button
                  onClick={onOpenReport}
                  className="h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer hover:opacity-90 active:scale-[0.97]"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  title="Generate Emergency Dispatch Report"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Report</span>
                </button>
              )}

              {onOpenSimulator && (
                <button
                  onClick={onOpenSimulator}
                  className="h-8 w-8 rounded-lg border text-xs font-medium flex items-center justify-center transition-all cursor-pointer hover:opacity-90 active:scale-[0.97]"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  title="Demo Scenario Simulator"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}

              {onOpenDonorPortal && (
                <button
                  onClick={onOpenDonorPortal}
                  className="h-8 w-8 rounded-lg border text-xs font-medium flex items-center justify-center transition-all cursor-pointer hover:opacity-90 active:scale-[0.97]"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  title="Donor Pool Roster"
                >
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}

              {onResetSeedData && (
                <button
                  onClick={onResetSeedData}
                  disabled={isResetting}
                  className="h-8 w-8 rounded-lg border text-xs flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-[0.97]"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  title="Reset benchmark data state"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
                </button>
              )}
            </div>
          )}

          {/* User Session & Role Lock Badge */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="hidden sm:flex flex-col text-right">
                <span 
                  className="text-xs font-bold truncate max-w-[130px]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {currentUser.name}
                </span>
                <span 
                  className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded border ${roleMeta.color}`}
                >
                  {roleMeta.label}
                </span>
              </div>

              {/* Log Out Button */}
              <button
                onClick={logout}
                className="h-8 px-2.5 rounded-lg bg-rose-600/10 hover:bg-rose-600 border border-rose-500/25 text-rose-500 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97]"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[11px]">Log Out</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <div className="flex xl:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer hover:opacity-90 active:scale-[0.97]"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              aria-label="Toggle navigation drawer"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>

      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div 
          className="xl:hidden mt-3 pt-3 border-t flex flex-col gap-2.5 pb-2 animate-fadeIn"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {/* Status Chip */}
          <div className="flex items-center justify-between gap-2 text-xs px-1">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${health.bgColor} ${health.textColor} ${health.borderColor}`}>
              <span className={`w-2 h-2 rounded-full ${health.dotColor}`} />
              <span>{health.label}</span>
            </div>

            {currentUser && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${roleMeta.color}`}>
                {roleMeta.label}
              </span>
            )}
          </div>

          {/* Admin Actions on Mobile */}
          {isAdmin && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              {onOpenCopilot && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenCopilot();
                  }}
                  className="h-9 px-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer active:scale-[0.97]"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Copilot</span>
                </button>
              )}

              {onOpenReport && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenReport();
                  }}
                  className="h-9 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.97]"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Report</span>
                </button>
              )}

              {onOpenSimulator && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSimulator();
                  }}
                  className="h-9 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.97]"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Simulator</span>
                </button>
              )}

              {onOpenDonorPortal && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenDonorPortal();
                  }}
                  className="h-9 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.97]"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Roster</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
