import React, { useState } from 'react';
import { 
  BrainCircuit, 
  MapPin, 
  Droplet, 
  Battery, 
  Sparkles, 
  Info,
  Sliders
} from 'lucide-react';

const STATIC_WEIGHT_PROFILES = [
  {
    level: 'Routine',
    tag: 'Normal Planning',
    weights: {
      compatibility: 40,
      distance: 20,
      response_probability: 20,
      fatigue: 20,
    },
    rationale: 'Prioritizes biological compatibility and long-term donor wellness.',
  },
  {
    level: 'Urgent',
    tag: 'Needs Attention Soon',
    weights: {
      compatibility: 30,
      distance: 35,
      response_probability: 25,
      fatigue: 10,
    },
    rationale: 'Balances proximity speed with high donor response probability.',
  },
  {
    level: 'Critical',
    tag: 'Immediate Emergency',
    weights: {
      compatibility: 20,
      distance: 50,
      response_probability: 25,
      fatigue: 5,
    },
    rationale: 'Maximizes proximity speed (50%) to achieve fastest arrival.',
  },
];

export const ScoreBreakdown = ({
  selectedDonor = null,
  activeEmergencyLevel = 'Urgent',
  adaptationWeights = null,
}) => {
  const [activeTab, setActiveTab] = useState('explanation'); // 'explanation' | 'weights'
  const currentLevelNorm = (activeEmergencyLevel || 'Urgent').toLowerCase();

  // Helper to construct plain English explanation from real backend data
  const getPlainEnglishExplanation = (donor) => {
    if (!donor) return '';
    const compat = Math.round((donor.compatibility_score || 0) * 100);
    const dist = donor.distance_km != null ? donor.distance_km.toFixed(1) : '0';
    const eta = Math.round(donor.estimated_arrival_mins || 0);
    const resp = Math.round((donor.response_probability || 0) * 100);

    return `AI selected ${donor.donor_name} as Rank #${donor.rank} because they are ${donor.donor_blood_group} compatible (${compat}%), located close to the hospital (${dist} km, ~${eta} mins estimated transit), and have a strong predicted likelihood of responding (${resp}%).`;
  };

  return (
    <div 
      className="rounded-2xl border p-4 lg:p-5 shadow-sm flex flex-col gap-4 transition-colors"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between border-b pb-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              borderColor: 'rgba(99, 102, 241, 0.3)',
              color: 'var(--accent-secondary)',
            }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 
              className="text-sm lg:text-base font-bold tracking-wide"
              style={{ color: 'var(--text-primary)' }}
            >
              Why This Donor?
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Transparent AI matching explanation powered by backend multi-criteria scoring
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div 
          className="flex items-center rounded-xl border p-0.5 text-xs font-semibold"
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('explanation')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'explanation'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'hover:opacity-80'
            }`}
            style={{
              color: activeTab === 'explanation' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            Explanation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('weights')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'weights'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'hover:opacity-80'
            }`}
            style={{
              color: activeTab === 'weights' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            Emergency Weights
          </button>
        </div>
      </div>

      {/* TAB 1: EXPLANATION VIEW */}
      {activeTab === 'explanation' && (
        <>
          {selectedDonor ? (
            <div className="flex flex-col gap-4">
              
              {/* Donor Summary Top Pill */}
              <div 
                className="p-3.5 rounded-2xl border flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {selectedDonor.donor_name}
                    </span>
                    <span 
                      className="px-2 py-0.2 rounded-full text-xs font-black"
                      style={{
                        backgroundColor: 'rgba(225, 29, 72, 0.15)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {selectedDonor.donor_blood_group}
                    </span>
                    <span className="text-xs font-semibold text-amber-500">
                      (Rank #{selectedDonor.rank})
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Match Score: <strong style={{ color: 'var(--text-primary)' }}>{(selectedDonor.priority_score * 100).toFixed(1)}%</strong> • Status: {selectedDonor.is_available !== false ? 'Available' : 'Unavailable'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Emergency Urgency
                  </span>
                  <span className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
                    {activeEmergencyLevel}
                  </span>
                </div>
              </div>

              {/* 4 Factor Meters (Progress Bars) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* 1. Biological Compatibility */}
                <div 
                  className="p-3.5 rounded-2xl border flex flex-col gap-2"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Droplet className="w-3.5 h-3.5 text-rose-500" />
                      Compatibility
                    </span>
                    <strong className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {(selectedDonor.compatibility_score * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedDonor.compatibility_score * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Full ABO & Rh group biological compatibility
                  </span>
                </div>

                {/* 2. Distance & Proximity */}
                <div 
                  className="p-3.5 rounded-2xl border flex flex-col gap-2"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <MapPin className="w-3.5 h-3.5 text-sky-500" />
                      Distance
                    </span>
                    <strong className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {selectedDonor.distance_km?.toFixed(1)} km
                    </strong>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-sky-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(10, selectedDonor.distance_score * 100))}%` }}
                    />
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Estimated arrival time ~{Math.round(selectedDonor.estimated_arrival_mins || 0)} minutes
                  </span>
                </div>

                {/* 3. Response Likelihood */}
                <div 
                  className="p-3.5 rounded-2xl border flex flex-col gap-2"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <BrainCircuit className="w-3.5 h-3.5 text-emerald-500" />
                      Response Likelihood
                    </span>
                    <strong className="font-bold text-emerald-500">
                      {(selectedDonor.response_probability * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedDonor.response_probability * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Predicted probability of immediate acceptance
                  </span>
                </div>

                {/* 4. Donor Rest & Fatigue */}
                <div 
                  className="p-3.5 rounded-2xl border flex flex-col gap-2"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Battery className="w-3.5 h-3.5 text-amber-500" />
                      Donor Rest
                    </span>
                    <strong className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {selectedDonor.fatigue_score <= 0.15 ? 'Well Rested' : 'Recent Donation'}
                    </strong>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(20, (1 - (selectedDonor.fatigue_score || 0)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Safe donation interval verified by system
                  </span>
                </div>

              </div>

              {/* Plain English "Why was this donor recommended?" */}
              <div 
                className="p-4 rounded-2xl border flex items-start gap-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Info className="w-5 h-5 shrink-0 text-indigo-500 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                    Why was this donor recommended?
                  </h4>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {getPlainEnglishExplanation(selectedDonor)}
                  </p>
                  {selectedDonor.explanation && (
                    <p className="text-xs italic pt-1" style={{ color: 'var(--text-muted)' }}>
                      "{selectedDonor.explanation}"
                    </p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div 
              className="rounded-2xl p-8 border text-center text-xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              Select any donor card from the list to inspect why they were recommended.
            </div>
          )}
        </>
      )}

      {/* TAB 2: ADAPTIVE WEIGHT PROFILE INSPECTOR */}
      {activeTab === 'weights' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              How Urgency Shifts AI Weights
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Active Urgency: <strong className="capitalize" style={{ color: 'var(--accent-primary)' }}>{activeEmergencyLevel}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {STATIC_WEIGHT_PROFILES.map((profile) => {
              const isActive = profile.level.toLowerCase() === currentLevelNorm;
              
              const displayWeights = (isActive && adaptationWeights) 
                ? {
                    compatibility: Math.round((adaptationWeights.compatibility || 0) * 100),
                    distance: Math.round((adaptationWeights.distance || 0) * 100),
                    response_probability: Math.round((adaptationWeights.ml_response || adaptationWeights.response_probability || 0) * 100),
                    fatigue: Math.round((adaptationWeights.fatigue || 0) * 100),
                  }
                : profile.weights;

              return (
                <div
                  key={profile.level}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isActive
                      ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--bg-card)' : 'var(--bg-surface)',
                    borderColor: isActive ? 'var(--accent-secondary)' : 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {profile.level}
                    </h4>
                    {isActive && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Distance:</span>
                      <strong className={isActive && profile.level === 'Critical' ? 'text-rose-500 font-black' : ''}>
                        {displayWeights.distance}%
                      </strong>
                    </div>
                    <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Compatibility:</span>
                      <strong>{displayWeights.compatibility}%</strong>
                    </div>
                    <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Response:</span>
                      <strong>{displayWeights.response_probability}%</strong>
                    </div>
                    <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Rest:</span>
                      <strong>{displayWeights.fatigue}%</strong>
                    </div>
                  </div>

                  <p className="text-[11px] mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                    {profile.rationale}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreBreakdown;
