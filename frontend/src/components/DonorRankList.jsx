import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Clock, 
  Sparkles,
  Search,
  Send,
  HelpCircle,
  ShieldCheck,
  AlertCircle,
  BrainCircuit
} from 'lucide-react';

const BLOOD_GROUPS = ['ALL', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export const DonorRankList = ({
  rankedDonors = [],
  selectedDonorId = null,
  onSelectDonor,
  onDispatchDonor,
  onWhyDonor,
  isLoading = false,
  emergencyLevel = 'Urgent',
}) => {
  // Presentation-only filtering & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('ALL');
  const [sortBy, setSortBy] = useState('rank'); // 'rank' | 'distance' | 'response'

  // Filter & Sort donors in memory (PRESENTATION ONLY — zero backend recalculations)
  const displayedDonors = useMemo(() => {
    let result = [...rankedDonors];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((d) => d.donor_name?.toLowerCase().includes(q));
    }

    if (selectedBloodGroup !== 'ALL') {
      result = result.filter((d) => d.donor_blood_group === selectedBloodGroup);
    }

    if (sortBy === 'distance') {
      result.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
    } else if (sortBy === 'response') {
      result.sort((a, b) => (b.response_probability ?? 0) - (a.response_probability ?? 0));
    } else {
      result.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    }

    return result;
  }, [rankedDonors, searchQuery, selectedBloodGroup, sortBy]);

  // Helper for human-friendly response likelihood text
  const getResponseLikelihoodLabel = (prob) => {
    if (prob >= 0.8) return 'Strong response likelihood';
    if (prob >= 0.5) return 'Moderate response likelihood';
    return 'Standard response likelihood';
  };

  if (isLoading) {
    return (
      <div 
        id="section-matches"
        className="rounded-2xl border p-8 shadow-sm flex flex-col items-center justify-center min-h-[320px] gap-3"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <div 
          className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{
            borderColor: 'var(--accent-primary)',
            borderTopColor: 'transparent',
          }}
        />
        <span className="text-sm font-semibold">
          Finding suitable donor matches from backend...
        </span>
      </div>
    );
  }

  return (
    <div 
      id="section-matches"
      className="rounded-2xl border p-4 lg:p-5 shadow-sm flex flex-col gap-3.5 transition-colors max-w-full min-w-0 overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
            style={{
              backgroundColor: 'rgba(234, 179, 8, 0.12)',
              borderColor: 'rgba(234, 179, 8, 0.3)',
              color: '#eab308',
            }}
          >
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 
              className="text-sm lg:text-base font-bold tracking-wide flex flex-wrap items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              AI Donor Matching
              <span 
                className="text-xs px-2 py-0.5 rounded-full font-bold border"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {rankedDonors.length} Candidates Evaluated
              </span>
            </h2>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
              Top recommendations dynamically optimized for {emergencyLevel} emergency
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8 px-2.5 rounded-lg border text-xs font-semibold focus:outline-none transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            aria-label="Sort donor recommendations"
          >
            <option value="rank">Sort: Best Match</option>
            <option value="distance">Sort: Nearest Distance</option>
            <option value="response">Sort: Response Likelihood</option>
          </select>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-2 pt-1 w-full min-w-0">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full min-w-0">
          {/* Donor Search */}
          <div className="relative flex-1 w-full min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search donor name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              aria-label="Search donor candidates by name"
            />
          </div>

          {/* Blood Group Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto max-w-full min-w-0 pb-1 sm:pb-0 text-xs scrollbar-none">
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                onClick={() => setSelectedBloodGroup(bg)}
                className={`shrink-0 h-7 px-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.97] ${
                  selectedBloodGroup === bg
                    ? 'text-white shadow-sm'
                    : 'hover:opacity-80 border'
                }`}
                style={{
                  backgroundColor: selectedBloodGroup === bg ? 'var(--accent-primary)' : 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: selectedBloodGroup === bg ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Donors List */}
      {displayedDonors.length === 0 ? (
        <div 
          className="rounded-2xl border p-8 flex flex-col items-center justify-center text-center gap-2"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <AlertCircle className="w-8 h-8 text-slate-400 mb-1" />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            No Matching Donors
          </h3>
          <p className="text-xs max-w-sm" style={{ color: 'var(--text-muted)' }}>
            No registered donors matched the current filters. Reset filters to view all candidates.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto p-1 pr-1.5">
          {displayedDonors.map((donor) => {
            const isTopMatch = donor.rank === 1;
            const isSelected = selectedDonorId === donor.donor_id;

            const matchScorePct = Math.round(donor.priority_score * 100);
            const responsePct = Math.round(donor.response_probability * 100);
            const distanceKm = Number(donor.distance_km).toFixed(1);
            const etaMins = Math.round(donor.estimated_arrival_mins || 0);
            const responseText = getResponseLikelihoodLabel(donor.response_probability);

            return (
              <div
                key={donor.donor_id}
                onClick={() => onSelectDonor && onSelectDonor(donor)}
                className={`relative p-4 rounded-2xl border card-hover transition-all cursor-pointer flex flex-col justify-between ${
                  isTopMatch
                    ? isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-lg'
                      : 'border-amber-500/70 hover:border-amber-500 shadow-sm'
                    : isSelected
                    ? 'border-sky-500 ring-2 ring-sky-500/30 shadow-md'
                    : 'hover:border-slate-400'
                }`}
                style={{
                  backgroundColor: isTopMatch 
                    ? isSelected ? 'rgba(234, 179, 8, 0.09)' : 'rgba(234, 179, 8, 0.04)'
                    : isSelected ? 'rgba(2, 132, 199, 0.06)' : 'var(--bg-surface)',
                  borderColor: isTopMatch 
                    ? '#f59e0b'
                    : isSelected ? 'var(--accent-secondary)' : 'var(--border-subtle)',
                }}
              >
                {/* #1 Top Recommendation Badge - Cleanly inside the card */}
                {isTopMatch && (
                  <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-amber-500/25">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
                      <Sparkles className="w-3 h-3" />
                      <span>#1 Top Match</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 hidden sm:inline">
                      Highest Multi-Criteria Match
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Rank & Donor Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div 
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isTopMatch
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : donor.rank <= 3
                          ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200'
                          : 'bg-slate-100 text-slate-600 font-semibold border border-slate-200'
                      }`}
                    >
                      #{donor.rank}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 
                          className="text-sm font-bold tracking-tight text-slate-900"
                        >
                          {donor.donor_name}
                        </h4>
                        <span 
                          className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500/15 text-rose-600 border border-rose-500/30"
                        >
                          {donor.donor_blood_group}
                        </span>
                      </div>

                      {/* Plain English Summary String */}
                      <p className="text-xs font-medium mt-1 text-slate-600">
                        {distanceKm} km away • {donor.donor_blood_group} compatible • {responseText}
                      </p>

                      {/* Secondary metrics pill list */}
                      <div className="flex items-center gap-2 sm:gap-3 text-[11px] mt-2 flex-wrap text-slate-500">
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>ETA ~{etaMins}m</span>
                        </span>
                        <span className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 text-emerald-700 font-medium">
                          <BrainCircuit className="w-3 h-3 text-emerald-600" />
                          <span>Response: <strong>{responsePct}%</strong></span>
                        </span>
                        <span className="flex items-center gap-1 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60 text-sky-800 font-medium">
                          <ShieldCheck className="w-3 h-3 text-sky-600" />
                          <span>Match Score: <strong>{matchScorePct}%</strong></span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions - Fully responsive, wrapping inside card on mobile */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    
                    {/* "Why this donor?" Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectDonor) onSelectDonor(donor);
                        if (onWhyDonor) onWhyDonor(donor);
                      }}
                      className="flex-1 sm:flex-none h-8 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer bg-white hover:bg-slate-50 active:scale-[0.97] text-slate-700 border-slate-300 shadow-sm"
                      title="View AI Explanation for this donor"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
                      <span>Why this donor?</span>
                    </button>

                    {/* "Dispatch Donor" Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDispatchDonor) onDispatchDonor(donor);
                      }}
                      className="flex-1 sm:flex-none h-8 px-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer hover:opacity-90 active:scale-[0.97]"
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                      }}
                      title={`Dispatch ${donor.donor_name}`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch</span>
                    </button>

                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DonorRankList;
