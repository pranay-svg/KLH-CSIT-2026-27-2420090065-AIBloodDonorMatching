import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  BrainCircuit, 
  MapPin, 
  Droplet, 
  Battery, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  Scale
} from 'lucide-react';

const ACADEMIC_COMPATIBILITY_TABLE = {
  'O-': { canDonateTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], canReceiveFrom: ['O-'] },
  'O+': { canDonateTo: ['O+', 'A+', 'B+', 'AB+'], canReceiveFrom: ['O+', 'O-'] },
  'A-': { canDonateTo: ['A-', 'A+', 'AB-', 'AB+'], canReceiveFrom: ['A-', 'O-'] },
  'A+': { canDonateTo: ['A+', 'AB+'], canReceiveFrom: ['A+', 'A-', 'O+', 'O-'] },
  'B-': { canDonateTo: ['B-', 'B+', 'AB-', 'AB+'], canReceiveFrom: ['B-', 'O-'] },
  'B+': { canDonateTo: ['B+', 'AB+'], canReceiveFrom: ['B+', 'B-', 'O+', 'O-'] },
  'AB-': { canDonateTo: ['AB-', 'AB+'], canReceiveFrom: ['AB-', 'A-', 'B-', 'O-'] },
  'AB+': { canDonateTo: ['AB+'], canReceiveFrom: ['Universal Recipient (All Groups)'] },
};

export const AICopilotModal = ({
  isOpen = false,
  onClose,
  selectedDonor = null,
  activeEmergency = null,
  adaptationWeights = null,
}) => {
  const [activeTab, setActiveTab] = useState('explanation'); // 'explanation' | 'weights' | 'compatibility'

  if (!isOpen) return null;

  const emergencyLevel = activeEmergency?.emergency_level || 'Urgent';
  const patientBloodGroup = activeEmergency?.required_blood_group || 'O+';
  const donorBloodGroup = selectedDonor?.donor_blood_group || 'O+';

  // Backend provided scores
  const priorityPct = selectedDonor?.priority_score !== undefined
    ? (selectedDonor.priority_score * 100).toFixed(1)
    : 'N/A';
  const compatPct = selectedDonor?.compatibility_score !== undefined
    ? (selectedDonor.compatibility_score * 100).toFixed(0)
    : 'N/A';
  const distScorePct = selectedDonor?.distance_score !== undefined
    ? (selectedDonor.distance_score * 100).toFixed(1)
    : 'N/A';
  const responsePct = selectedDonor?.response_probability !== undefined
    ? (selectedDonor.response_probability * 100).toFixed(1)
    : 'N/A';
  const fatiguePct = selectedDonor?.fatigue_score !== undefined
    ? (selectedDonor.fatigue_score * 100).toFixed(1)
    : 'N/A';

  // Current adaptive weights
  const currentWeights = adaptationWeights || {
    compatibility: emergencyLevel === 'Critical' ? 0.20 : emergencyLevel === 'Urgent' ? 0.30 : 0.40,
    distance: emergencyLevel === 'Critical' ? 0.50 : emergencyLevel === 'Urgent' ? 0.35 : 0.20,
    ml_response: emergencyLevel === 'Critical' ? 0.25 : emergencyLevel === 'Urgent' ? 0.25 : 0.20,
    fatigue: emergencyLevel === 'Critical' ? 0.05 : emergencyLevel === 'Urgent' ? 0.10 : 0.20,
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="copilot-title"
    >
      <div 
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Modal Header */}
        <div 
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                borderColor: 'rgba(99, 102, 241, 0.35)',
                color: 'var(--accent-secondary)',
              }}
            >
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 id="copilot-title" className="text-base font-bold tracking-tight flex items-center gap-2">
                AI Matching Copilot
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Explainable MCDM
                </span>
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Decision-Support Explanation • Academic Triage Multi-Criteria Analysis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-slate-500/10 flex items-center justify-center transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close AI Copilot modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div 
          className="flex items-center border-b px-5 pt-2 gap-2 text-xs overflow-x-auto"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            onClick={() => setActiveTab('explanation')}
            className={`h-8 px-3 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
              activeTab === 'explanation'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-transparent hover:bg-slate-500/10'
            }`}
            style={{ color: activeTab === 'explanation' ? '#ffffff' : 'var(--text-secondary)' }}
          >
            Recommendation Explanation
          </button>
          <button
            onClick={() => setActiveTab('weights')}
            className={`h-8 px-3 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
              activeTab === 'weights'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-transparent hover:bg-slate-500/10'
            }`}
            style={{ color: activeTab === 'weights' ? '#ffffff' : 'var(--text-secondary)' }}
          >
            Adaptive Sensitivity Weights
          </button>
          <button
            onClick={() => setActiveTab('compatibility')}
            className={`h-8 px-3 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
              activeTab === 'compatibility'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-transparent hover:bg-slate-500/10'
            }`}
            style={{ color: activeTab === 'compatibility' ? '#ffffff' : 'var(--text-secondary)' }}
          >
            Academic Compatibility Reference
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* TAB 1: Recommendation Explanation */}
          {activeTab === 'explanation' && (
            <>
              {selectedDonor ? (
                <div className="space-y-4">
                  {/* Selected Donor Overview Card */}
                  <div 
                    className="p-4 rounded-xl border flex flex-col gap-3"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                            {selectedDonor.donor_name}
                          </span>
                          <span 
                            className="px-2 py-0.5 rounded-full text-[11px] font-black"
                            style={{
                              backgroundColor: 'rgba(225, 29, 72, 0.15)',
                              color: 'var(--accent-primary)',
                            }}
                          >
                            {donorBloodGroup}
                          </span>
                          <span className="text-[11px] font-semibold text-sky-600">
                            (MCDM Rank #{selectedDonor.rank || 1})
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Target Patient Group: <strong style={{ color: 'var(--text-primary)' }}>{patientBloodGroup}</strong> • 
                          Hospital: <strong style={{ color: 'var(--text-primary)' }}>{activeEmergency?.hospital_name || 'Hospital Ward'}</strong>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>
                          Composite Priority
                        </span>
                        <div 
                          className="text-lg font-black"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {priorityPct}%
                        </div>
                      </div>
                    </div>

                    {/* Backend Criteria Breakdown Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      
                      {/* Compatibility */}
                      <div 
                        className="p-2.5 rounded-lg border"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
                      >
                        <div className="flex items-center justify-between mb-1" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1">
                            <Droplet className="w-3.5 h-3.5 text-red-500" />
                            Compatibility
                          </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{compatPct}%</strong>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-red-500 h-full rounded-full" style={{ width: `${Math.min(100, Number(compatPct))}%` }} />
                        </div>
                      </div>

                      {/* Distance */}
                      <div 
                        className="p-2.5 rounded-lg border"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
                      >
                        <div className="flex items-center justify-between mb-1" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-sky-500" />
                            Distance Score
                          </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{distScorePct}%</strong>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-sky-500 h-full rounded-full" style={{ width: `${Math.min(100, Number(distScorePct))}%` }} />
                        </div>
                        <span className="text-[10px] block mt-1" style={{ color: 'var(--text-muted)' }}>
                          {selectedDonor.distance_km !== undefined ? `${selectedDonor.distance_km.toFixed(1)} km` : ''}
                        </span>
                      </div>

                      {/* ML Response Probability */}
                      <div 
                        className="p-2.5 rounded-lg border"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
                      >
                        <div className="flex items-center justify-between mb-1" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1">
                            <BrainCircuit className="w-3.5 h-3.5 text-emerald-500" />
                            ML Response
                          </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{responsePct}%</strong>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, Number(responsePct))}%` }} />
                        </div>
                        <span className="text-[10px] block mt-1" style={{ color: 'var(--text-muted)' }}>
                          Predictive Model
                        </span>
                      </div>

                      {/* Fatigue Score */}
                      <div 
                        className="p-2.5 rounded-lg border"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
                      >
                        <div className="flex items-center justify-between mb-1" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1">
                            <Battery className="w-3.5 h-3.5 text-amber-500" />
                            Fatigue Score
                          </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{fatiguePct}%</strong>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, Number(fatiguePct))}%` }} />
                        </div>
                        <span className="text-[10px] block mt-1" style={{ color: 'var(--text-muted)' }}>
                          Rest Period Index
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Why Is This Donor Ranked Highly? */}
                  <div 
                    className="p-4 rounded-xl border flex flex-col gap-2"
                    style={{
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      borderColor: 'rgba(99, 102, 241, 0.25)',
                    }}
                  >
                    <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-[11px]">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                      <span>Why This Candidate Is Ranked At Rank #{selectedDonor.rank || 1}</span>
                    </div>

                    <p className="leading-relaxed text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {selectedDonor.explanation || (
                        `High compatibility (${compatPct}%), proximity distance (${selectedDonor.distance_km?.toFixed(1) || '0.2'} km), strong predicted response probability (${responsePct}%), and acceptable donor fatigue contributed to the current priority ranking under ${emergencyLevel} triage weights.`
                      )}
                    </p>

                    <div className="mt-2 pt-2 border-t border-indigo-900/40 text-[11px] text-slate-400 flex items-start gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>
                        Under active <strong>{emergencyLevel}</strong> emergency triage, the backend allocates weights of: 
                        Compatibility ({Math.round((currentWeights.compatibility || 0.3) * 100)}%), 
                        Distance ({Math.round((currentWeights.distance || 0.35) * 100)}%), 
                        Response Probability ({Math.round((currentWeights.ml_response || currentWeights.response_probability || 0.25) * 100)}%), 
                        and Fatigue ({Math.round((currentWeights.fatigue || 0.1) * 100)}%).
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500">
                  Select a donor candidate from the recommendations list to review their explainable score breakdown.
                </div>
              )}
            </>
          )}

          {/* TAB 2: Adaptive Sensitivity Weights */}
          {activeTab === 'weights' && (
            <div className="space-y-4">
              <div 
                className="p-3.5 rounded-xl border flex items-start gap-2.5"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 leading-relaxed text-xs">
                  <strong>Adaptive Weight Dynamics:</strong> When an emergency escalates from Routine → Urgent → Critical, 
                  the backend optimization engine automatically reweights criteria to prioritize immediate transit speed over long-term fatigue preservation.
                </p>
              </div>

              {/* 3 Sensitivity Profiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Routine */}
                <div className={`p-3.5 rounded-xl border ${
                  emergencyLevel === 'Routine'
                    ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500/40'
                    : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sky-800">Routine Care</span>
                    {emergencyLevel === 'Routine' && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300">Active</span>
                    )}
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-700">
                    <li className="flex justify-between"><span>Compatibility:</span><strong>40%</strong></li>
                    <li className="flex justify-between"><span>Distance:</span><strong>20%</strong></li>
                    <li className="flex justify-between"><span>Response Prob:</span><strong>20%</strong></li>
                    <li className="flex justify-between"><span>Fatigue:</span><strong>20%</strong></li>
                  </ul>
                  <p className="text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-slate-200 italic">
                    Prioritizes optimal biological match and donor wellness.
                  </p>
                </div>

                {/* Urgent */}
                <div className={`p-3.5 rounded-xl border ${
                  emergencyLevel === 'Urgent'
                    ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500/40'
                    : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-amber-800">Urgent Trauma (2h)</span>
                    {emergencyLevel === 'Urgent' && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">Active</span>
                    )}
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-700">
                    <li className="flex justify-between"><span>Compatibility:</span><strong>30%</strong></li>
                    <li className="flex justify-between"><span>Distance:</span><strong className="text-amber-800">35%</strong></li>
                    <li className="flex justify-between"><span>Response Prob:</span><strong>25%</strong></li>
                    <li className="flex justify-between"><span>Fatigue:</span><strong>10%</strong></li>
                  </ul>
                  <p className="text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-slate-200 italic">
                    Balances rapid transit with high probability of immediate response.
                  </p>
                </div>

                {/* Critical */}
                <div className={`p-3.5 rounded-xl border ${
                  emergencyLevel === 'Critical'
                    ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500/40'
                    : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-rose-800">Critical (Immediate)</span>
                    {emergencyLevel === 'Critical' && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">Active</span>
                    )}
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-700">
                    <li className="flex justify-between"><span>Compatibility:</span><strong>20%</strong></li>
                    <li className="flex justify-between"><span>Distance:</span><strong className="text-rose-700 font-black">50%</strong></li>
                    <li className="flex justify-between"><span>Response Prob:</span><strong>25%</strong></li>
                    <li className="flex justify-between"><span>Fatigue:</span><strong>5%</strong></li>
                  </ul>
                  <p className="text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-slate-200 italic">
                    Critical emergencies increase the importance of proximity. Distance weight increases up to 50%.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: Academic Compatibility Reference */}
          {activeTab === 'compatibility' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>Academic compatibility reference — not a clinical transfusion decision.</strong> Biological compatibility and cross-matching must be verified by certified blood-bank personnel before administration.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2 px-3">Blood Group</th>
                      <th className="py-2 px-3">Can Donate To</th>
                      <th className="py-2 px-3">Can Receive From</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Object.entries(ACADEMIC_COMPATIBILITY_TABLE).map(([grp, info]) => {
                      const isSelected = grp === donorBloodGroup;
                      return (
                        <tr 
                          key={grp}
                          className={isSelected ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-slate-700'}
                        >
                          <td className="py-2 px-3 font-mono font-black text-rose-700">
                            {grp} {isSelected && '(Selected)'}
                          </td>
                          <td className="py-2 px-3">{info.canDonateTo.join(', ')}</td>
                          <td className="py-2 px-3">{info.canReceiveFrom.join(', ')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div 
          className="px-5 py-3 border-t flex items-center justify-between text-xs"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Single Source of Truth: Backend MCDM Optimization Engine
          </span>

          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg font-bold cursor-pointer transition-colors border shadow-sm active:scale-[0.98] text-xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default AICopilotModal;
