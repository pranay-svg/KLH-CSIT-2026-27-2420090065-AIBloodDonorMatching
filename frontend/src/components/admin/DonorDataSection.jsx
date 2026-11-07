import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  RefreshCw, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Mail, 
  TrendingUp,
  UserCheck
} from 'lucide-react';

const BLOOD_GROUPS = ['ALL', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const AVAILABILITY_OPTIONS = ['ALL', 'Available', 'Unavailable'];
const ELIGIBILITY_OPTIONS = ['ALL', 'Eligible', 'Ineligible'];

export function DonorDataSection({
  donors = [],
  isLoading = false,
  onRefresh,
  onToggleAvailability,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('ALL');
  const [selectedAvailability, setSelectedAvailability] = useState('ALL');
  const [selectedEligibility, setSelectedEligibility] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Filtered donors
  const filteredDonors = useMemo(() => {
    return donors.filter((d) => {
      // Blood group filter
      if (selectedBloodGroup !== 'ALL') {
        const bg = (d.blood_group || '').trim().toUpperCase();
        if (bg !== selectedBloodGroup) return false;
      }

      // Availability filter
      if (selectedAvailability !== 'ALL') {
        const isAvail = d.is_available === true;
        if (selectedAvailability === 'Available' && !isAvail) return false;
        if (selectedAvailability === 'Unavailable' && isAvail) return false;
      }

      // Eligibility filter
      if (selectedEligibility !== 'ALL') {
        const isElig = d.is_eligible === true;
        if (selectedEligibility === 'Eligible' && !isElig) return false;
        if (selectedEligibility === 'Ineligible' && isElig) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (d.name || '').toLowerCase();
        const id = (d.id || d._id || '').toLowerCase();
        const phone = (d.phone || '').toLowerCase();
        const email = (d.email || '').toLowerCase();
        const addr = (d.address || '').toLowerCase();
        if (!name.includes(q) && !id.includes(q) && !phone.includes(q) && !email.includes(q) && !addr.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [donors, searchQuery, selectedBloodGroup, selectedAvailability, selectedEligibility]);

  // Metric aggregates
  const totalCount = donors.length;
  const availableCount = donors.filter((d) => d.is_available === true).length;
  const eligibleCount = donors.filter((d) => d.is_eligible === true).length;
  const avgAcceptance = useMemo(() => {
    if (donors.length === 0) return 0;
    const sum = donors.reduce((acc, d) => acc + (d.historical_acceptance_rate || 0.85), 0);
    return Math.round((sum / donors.length) * 100);
  }, [donors]);

  // Handle availability toggle
  const handleToggle = async (donor) => {
    if (!onToggleAvailability) return;
    const dId = donor.id || donor._id;
    setUpdatingId(dId);
    try {
      await onToggleAvailability(donor);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return String(ts);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* 1. Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          className="p-4 rounded-xl border shadow-sm transition-all"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Registered Donors</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black mt-2" style={{ color: 'var(--text-primary)' }}>{totalCount}</p>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Active donor directory</span>
        </div>

        <div 
          className="p-4 rounded-xl border shadow-sm transition-all"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Available Now</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">{availableCount}</p>
          <span className="text-[11px] text-emerald-500 font-medium">Ready for dispatch</span>
        </div>

        <div 
          className="p-4 rounded-xl border shadow-sm transition-all"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Clinically Eligible</span>
            <UserCheck className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-cyan-600 dark:text-cyan-400">{eligibleCount}</p>
          <span className="text-[11px] text-cyan-500 font-medium">Met biological criteria</span>
        </div>

        <div 
          className="p-4 rounded-xl border shadow-sm transition-all"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Avg Acceptance</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-purple-600 dark:text-purple-400">{avgAcceptance}%</p>
          <span className="text-[11px] text-purple-500 font-medium">Historical dispatch response</span>
        </div>
      </div>

      {/* 2. Search & Filters Toolbar */}
      <div 
        className="p-4 rounded-xl border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, phone, address, email..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border focus:outline-none transition-colors"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs hover:opacity-70 px-1 text-slate-400"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Blood Group */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold hidden lg:inline" style={{ color: 'var(--text-muted)' }}>Group:</span>
            <select
              value={selectedBloodGroup}
              onChange={(e) => setSelectedBloodGroup(e.target.value)}
              className="h-8 px-2 text-xs font-semibold rounded-lg border focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg === 'ALL' ? 'All Blood Groups' : bg}</option>
              ))}
            </select>
          </div>

          {/* Availability */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold hidden lg:inline" style={{ color: 'var(--text-muted)' }}>Status:</span>
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="h-8 px-2 text-xs font-semibold rounded-lg border focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {AVAILABILITY_OPTIONS.map((st) => (
                <option key={st} value={st}>{st === 'ALL' ? 'All Availability' : st}</option>
              ))}
            </select>
          </div>

          {/* Eligibility */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold hidden lg:inline" style={{ color: 'var(--text-muted)' }}>Eligibility:</span>
            <select
              value={selectedEligibility}
              onChange={(e) => setSelectedEligibility(e.target.value)}
              className="h-8 px-2 text-xs font-semibold rounded-lg border focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {ELIGIBILITY_OPTIONS.map((el) => (
                <option key={el} value={el}>{el === 'ALL' ? 'All Eligibility' : el}</option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              title="Refresh Donors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Donors Table / Cards */}
      <div 
        className="rounded-xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div 
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Registered Donors Directory ({filteredDonors.length})
            </h3>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing {filteredDonors.length} of {totalCount} donors
          </span>
        </div>

        {/* Loading state */}
        {isLoading && donors.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Loading registered donors...
            </span>
          </div>
        ) : filteredDonors.length === 0 ? (
          /* Empty state */
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              No donors found matching your search or filters
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Try adjusting the blood group or availability criteria above.
            </p>
          </div>
        ) : (
          /* Responsive Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr 
                  className="border-b font-semibold uppercase tracking-wider text-[11px]"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <th className="py-3 px-4">Donor ID</th>
                  <th className="py-3 px-4">Donor Name</th>
                  <th className="py-3 px-4 text-center">Blood Group</th>
                  <th className="py-3 px-4">Demographics</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4">Eligibility</th>
                  <th className="py-3 px-4 text-center">Donations</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {filteredDonors.map((donor) => {
                  const donorId = donor.id || donor._id;
                  const isExpanded = expandedId === donorId;
                  const isAvail = donor.is_available === true;
                  const isElig = donor.is_eligible === true;
                  const acceptancePct = Math.round((donor.historical_acceptance_rate || 0.85) * 100);

                  return (
                    <React.Fragment key={donorId}>
                      <tr 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {/* ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                          {donorId}
                        </td>

                        {/* Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {donor.name ? donor.name.charAt(0).toUpperCase() : 'D'}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                                {donor.name}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                                {donor.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Blood Group */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 min-w-[38px]">
                            {donor.blood_group}
                          </span>
                        </td>

                        {/* Demographics */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          <span>{donor.age || '—'} yrs</span>
                          <span className="mx-1">•</span>
                          <span className="capitalize">{donor.gender || 'Unspecified'}</span>
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 max-w-[180px]">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                              {donor.address || 'Bengaluru'}
                            </span>
                          </div>
                        </td>

                        {/* Availability */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            disabled={updatingId === donorId || !onToggleAvailability}
                            onClick={() => handleToggle(donor)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer hover:opacity-90 disabled:opacity-50 ${
                              isAvail
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
                            }`}
                            title="Click to toggle availability"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isAvail ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{isAvail ? 'Available' : 'Busy / Off'}</span>
                            {updatingId === donorId && (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            )}
                          </button>
                        </td>

                        {/* Eligibility */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${
                            isElig
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}>
                            {isElig ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span>{isElig ? 'Eligible' : 'Ineligible'}</span>
                          </span>
                        </td>

                        {/* Donations Count */}
                        <td className="py-3.5 px-4 text-center font-bold" style={{ color: 'var(--text-primary)' }}>
                          {donor.donation_count ?? 0}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : donorId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all hover:opacity-80 cursor-pointer"
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <span>{isExpanded ? 'Hide' : 'Details'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Performance & Contact Details */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: 'var(--bg-input)' }}>
                          <td colSpan={9} className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                              {/* Contact */}
                              <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex flex-col gap-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Direct Contact</span>
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="font-semibold">{donor.phone || 'Phone not provided'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="truncate">{donor.email}</span>
                                </div>
                              </div>

                              {/* Performance Metrics */}
                              <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex flex-col gap-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Donation History</span>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Days Since Last:</span>
                                  <span className="font-bold">{donor.days_since_last_donation ?? 90} days</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Historical Acceptance:</span>
                                  <span className="font-bold text-purple-600 dark:text-purple-400">{acceptancePct}%</span>
                                </div>
                              </div>

                              {/* Response Time & Status Note */}
                              <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex flex-col gap-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Response Speed</span>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="font-bold">{donor.avg_response_time_mins ?? 12.5} mins avg ETA</span>
                                </div>
                                <span className="text-[11px] text-slate-500 truncate" title={donor.eligibility_status}>
                                  {donor.eligibility_status || 'Eligible donor status verified'}
                                </span>
                              </div>

                              {/* GPS Coordinates & Registration */}
                              <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex flex-col gap-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Coordinates</span>
                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                  <span>{donor.latitude?.toFixed(4)}, {donor.longitude?.toFixed(4)}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  Registered: {formatTimestamp(donor.created_at)}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DonorDataSection;
