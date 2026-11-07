import React from 'react';
import { 
  Trophy, 
  ShieldAlert, 
  Users, 
  MapPin, 
  Radio, 
  AlertCircle 
} from 'lucide-react';

export const AnalyticsRibbon = ({
  rankedDonors = [],
  activeEmergency = null,
  allDonors = [],
  wsStatus = 'connected',
}) => {
  // 1. Top Match Score (Real backend priority score)
  const topDonor = rankedDonors && rankedDonors.length > 0 ? rankedDonors[0] : null;
  const topPriorityDisplay = topDonor && typeof topDonor.priority_score === 'number'
    ? `${(topDonor.priority_score * 100).toFixed(1)}%`
    : 'N/A';

  // 2. Current Emergency Level (Real backend value)
  const emergencyLevelDisplay = activeEmergency?.emergency_level
    ? activeEmergency.emergency_level
    : 'None';

  // 3. Available Donor Count (Real count of registered available donors)
  const availableCount = Array.isArray(allDonors) && allDonors.length > 0
    ? allDonors.filter((d) => d.is_available !== false).length
    : 'N/A';

  // 4. Top Donor Distance & ETA (Real backend values)
  const topDistanceDisplay = topDonor && typeof topDonor.distance_km === 'number'
    ? `${topDonor.distance_km.toFixed(1)} km`
    : 'N/A';

  const topEtaDisplay = topDonor && typeof topDonor.estimated_arrival_mins === 'number'
    ? `~${Math.round(topDonor.estimated_arrival_mins)}m`
    : null;

  // 5. WebSocket Status
  const wsStatusDisplay = wsStatus === 'connected'
    ? 'Operational'
    : wsStatus === 'connecting'
    ? 'Reconnecting'
    : 'Offline';

  const getUrgencyBadgeColor = (lvl) => {
    switch (lvl?.toLowerCase()) {
      case 'critical':
        return 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10';
      case 'urgent':
        return 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'routine':
        return 'text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/10';
      default:
        return 'text-slate-500 border-slate-500/20 bg-slate-500/10';
    }
  };

  return (
    <section 
      aria-label="Real-Time Analytics Summary"
      className="w-full rounded-2xl border p-3.5 sm:p-4 shadow-sm transition-colors"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
        
        {/* Metric 1: Top Match Score */}
        <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:px-2 first:pt-0 first:px-0">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: 'rgba(234, 179, 8, 0.12)',
              borderColor: 'rgba(234, 179, 8, 0.3)',
              color: '#eab308',
            }}
          >
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span 
              className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              Top Match Score
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span 
                className="text-base sm:text-lg font-black tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {topPriorityDisplay}
              </span>
              {topDonor && (
                <span 
                  className="text-[10px] font-black px-1.5 py-0.2 rounded"
                  style={{
                    backgroundColor: 'rgba(225, 29, 72, 0.15)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  {topDonor.donor_blood_group}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 2: Emergency Level */}
        <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:px-2">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: 'rgba(225, 29, 72, 0.12)',
              borderColor: 'rgba(225, 29, 72, 0.3)',
              color: 'var(--accent-primary)',
            }}
          >
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span 
              className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              Emergency Level
            </span>
            <div className="mt-0.5">
              {emergencyLevelDisplay !== 'None' ? (
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-black border ${getUrgencyBadgeColor(emergencyLevelDisplay)}`}>
                  {emergencyLevelDisplay}
                </span>
              ) : (
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  No Active Case
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 3: Available Donors */}
        <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:px-2">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              color: '#10b981',
            }}
          >
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span 
              className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              Available Donors
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span 
                className="text-base sm:text-lg font-black tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {availableCount}
              </span>
              {typeof availableCount === 'number' && (
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  / {allDonors.length} in pool
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 4: Nearest Donor & ETA */}
        <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:px-2">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: 'rgba(14, 165, 233, 0.12)',
              borderColor: 'rgba(14, 165, 233, 0.3)',
              color: '#0284c7',
            }}
          >
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span 
              className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              Nearest Donor
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span 
                className="text-base sm:text-lg font-black tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {topDistanceDisplay}
              </span>
              {topEtaDisplay && (
                <span className="text-[11px] font-semibold text-amber-500">
                  ({topEtaDisplay})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 5: Live Updates Status */}
        <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:px-2 col-span-2 sm:col-span-1">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: wsStatus === 'connected' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              borderColor: wsStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
              color: wsStatus === 'connected' ? '#10b981' : '#f43f5e',
            }}
          >
            {wsStatus === 'connected' ? (
              <Radio className="w-5 h-5 animate-pulse" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <span 
              className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              Live Updates
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span 
                className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}
              />
              <span 
                className="text-xs sm:text-sm font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {wsStatusDisplay}
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default AnalyticsRibbon;
