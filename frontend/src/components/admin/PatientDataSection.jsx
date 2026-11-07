import React, { useState, useMemo } from 'react';
import { 
  HeartPulse, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  User, 
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity
} from 'lucide-react';

const BLOOD_GROUPS = ['ALL', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const URGENCY_LEVELS = ['ALL', 'Critical', 'Urgent', 'Routine'];
const STATUS_OPTIONS = ['ALL', 'Open', 'Matched', 'Fulfilled', 'Cancelled'];

export function PatientDataSection({
  emergencies = [],
  isLoading = false,
  onRefresh,
  onUpdateStatus,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Filtered emergency requests
  const filteredEmergencies = useMemo(() => {
    return emergencies.filter((emg) => {
      // Blood group filter
      if (selectedBloodGroup !== 'ALL') {
        const bg = (emg.required_blood_group || emg.blood_group || '').trim().toUpperCase();
        if (bg !== selectedBloodGroup) return false;
      }

      // Urgency filter
      if (selectedUrgency !== 'ALL') {
        if ((emg.emergency_level || '').toLowerCase() !== selectedUrgency.toLowerCase()) return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if ((emg.status || '').toLowerCase() !== selectedStatus.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = (emg.patient_name || '').toLowerCase();
        const hName = (emg.hospital_name || '').toLowerCase();
        const emgId = (emg.id || '').toLowerCase();
        const contact = (emg.contact_person || '').toLowerCase();
        const notes = (emg.notes || '').toLowerCase();
        if (!pName.includes(q) && !hName.includes(q) && !emgId.includes(q) && !contact.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [emergencies, searchQuery, selectedBloodGroup, selectedUrgency, selectedStatus]);

  // Key metrics calculation
  const totalCount = emergencies.length;
  const criticalCount = emergencies.filter((e) => (e.emergency_level || '').toLowerCase() === 'critical').length;
  const urgentCount = emergencies.filter((e) => (e.emergency_level || '').toLowerCase() === 'urgent').length;
  const openCount = emergencies.filter((e) => (e.status || 'open').toLowerCase() === 'open').length;

  // Handle status update
  const handleStatusChange = async (emergencyId, newStatus) => {
    if (!onUpdateStatus) return;
    setUpdatingId(emergencyId);
    try {
      await onUpdateStatus(emergencyId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const getUrgencyBadge = (level) => {
    const l = (level || '').toLowerCase();
    if (l === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          Critical
        </span>
      );
    }
    if (l === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          Urgent
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
        Routine
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const s = (status || 'Open').toLowerCase();
    switch (s) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <Activity className="w-3 h-3" />
            Open
          </span>
        );
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Matched
          </span>
        );
      case 'fulfilled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Fulfilled
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
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
        hour: '2-digit',
        minute: '2-digit',
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
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Total Requests</span>
            <HeartPulse className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black mt-2" style={{ color: 'var(--text-primary)' }}>{totalCount}</p>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Emergency admissions</span>
        </div>

        <div 
          className="p-4 rounded-xl border shadow-sm transition-all"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Critical Level</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-rose-600 dark:text-rose-400">{criticalCount}</p>
          <span className="text-[11px] text-rose-500 font-medium">Immediate priority</span>
        </div>

        <div 
          className="p-4 rounded-xl border shadow-sm transition-all"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Urgent Level</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-amber-600 dark:text-amber-400">{urgentCount}</p>
          <span className="text-[11px] text-amber-500 font-medium">&lt; 2-4 hours response</span>
        </div>

        <div 
          className="p-4 rounded-xl border shadow-sm transition-all"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Active / Open</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">{openCount}</p>
          <span className="text-[11px] text-emerald-500 font-medium">Seeking matching donors</span>
        </div>
      </div>

      {/* 2. Search & Useful Filters Toolbar */}
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
            placeholder="Search by patient, hospital, ID, notes..."
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
          {/* Blood Group Filter */}
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

          {/* Urgency Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold hidden lg:inline" style={{ color: 'var(--text-muted)' }}>Urgency:</span>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="h-8 px-2 text-xs font-semibold rounded-lg border focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {URGENCY_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl === 'ALL' ? 'All Urgencies' : lvl}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold hidden lg:inline" style={{ color: 'var(--text-muted)' }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 px-2 text-xs font-semibold rounded-lg border focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st === 'ALL' ? 'All Statuses' : st}</option>
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
              title="Refresh Patient Requests"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Patient Requests Data Presentation */}
      <div 
        className="rounded-xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Table Header / Subtitle */}
        <div 
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Emergency Requests & Patients ({filteredEmergencies.length})
            </h3>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing {filteredEmergencies.length} of {totalCount} records
          </span>
        </div>

        {/* Loading state */}
        {isLoading && emergencies.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Loading patient data from hospital database...
            </span>
          </div>
        ) : filteredEmergencies.length === 0 ? (
          /* Empty state */
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <HeartPulse className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              No emergency requests match your current filters
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Try clearing search terms or selecting 'ALL' in filters above.
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
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Hospital & Location</th>
                  <th className="py-3 px-4 text-center">Blood Group</th>
                  <th className="py-3 px-4 text-center">Units</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {filteredEmergencies.map((emg) => {
                  const isExpanded = expandedId === emg.id;
                  const reqBg = emg.required_blood_group || emg.blood_group || 'O+';
                  return (
                    <React.Fragment key={emg.id}>
                      <tr 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {/* ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                          {emg.id}
                        </td>

                        {/* Patient Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {emg.patient_name ? emg.patient_name.charAt(0).toUpperCase() : 'P'}
                            </div>
                            <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                              {emg.patient_name || 'Anonymous Patient'}
                            </span>
                          </div>
                        </td>

                        {/* Hospital */}
                        <td className="py-3.5 px-4 max-w-[220px]">
                          <div className="flex flex-col">
                            <span className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {emg.hospital_name || 'Hospital'}
                            </span>
                            <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                              {emg.latitude && emg.longitude ? `${emg.latitude.toFixed(3)}, ${emg.longitude.toFixed(3)}` : 'Location available'}
                            </span>
                          </div>
                        </td>

                        {/* Blood Group */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 min-w-[38px]">
                            {reqBg}
                          </span>
                        </td>

                        {/* Units */}
                        <td className="py-3.5 px-4 text-center font-bold" style={{ color: 'var(--text-primary)' }}>
                          {emg.units_needed || 1} {emg.units_needed === 1 ? 'unit' : 'units'}
                        </td>

                        {/* Urgency */}
                        <td className="py-3.5 px-4">
                          {getUrgencyBadge(emg.emergency_level)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {getStatusBadge(emg.status)}
                        </td>

                        {/* Created At */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {formatTimestamp(emg.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : emg.id)}
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

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: 'var(--bg-input)' }}>
                          <td colSpan={9} className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Contact Person */}
                              <div className="flex flex-col gap-1 p-3 rounded-lg border bg-white dark:bg-slate-900" style={{ borderColor: 'var(--border-subtle)' }}>
                                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Clinical Contact</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <User className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="font-bold">{emg.contact_person || 'Hospital ER Duty Team'}</span>
                                </div>
                                <span className="text-[11px] text-slate-500">Authorized medical personnel on duty</span>
                              </div>

                              {/* Clinical Notes */}
                              <div className="flex flex-col gap-1 p-3 rounded-lg border bg-white dark:bg-slate-900" style={{ borderColor: 'var(--border-subtle)' }}>
                                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Clinical Notes</span>
                                <div className="flex items-start gap-2 mt-1">
                                  <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                  <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                                    {emg.notes || 'No specific clinical remarks provided.'}
                                  </p>
                                </div>
                              </div>

                              {/* Hospital GPS & Status Update */}
                              <div className="flex flex-col gap-2 p-3 rounded-lg border bg-white dark:bg-slate-900" style={{ borderColor: 'var(--border-subtle)' }}>
                                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Manage Status</span>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={emg.status || 'Open'}
                                    disabled={updatingId === emg.id || !onUpdateStatus}
                                    onChange={(e) => handleStatusChange(emg.id, e.target.value)}
                                    className="h-8 px-2 text-xs font-bold rounded-lg border focus:outline-none cursor-pointer flex-1"
                                    style={{
                                      backgroundColor: 'var(--bg-input)',
                                      borderColor: 'var(--border-subtle)',
                                      color: 'var(--text-primary)',
                                    }}
                                  >
                                    <option value="Open">Open (Active Request)</option>
                                    <option value="Matched">Matched (Donor Assigned)</option>
                                    <option value="Fulfilled">Fulfilled (Transfusion Ready)</option>
                                    <option value="Cancelled">Cancelled</option>
                                  </select>
                                  {updatingId === emg.id && (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Updated: {formatTimestamp(emg.updated_at || emg.created_at)}</span>
                                </div>
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

export default PatientDataSection;
