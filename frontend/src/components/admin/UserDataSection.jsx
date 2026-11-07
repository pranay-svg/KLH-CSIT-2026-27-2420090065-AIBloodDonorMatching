import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Heart, 
  ChevronDown, 
  ChevronUp, 
  Shield 
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'admin', label: 'Hospital Admins' },
  { value: 'donor', label: 'Volunteer Donors' },
  { value: 'user', label: 'Patients / Requesters' },
];

const STATUS_OPTIONS = ['ALL', 'Active', 'Inactive'];

export function UserDataSection({
  users = [],
  isLoading = false,
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (selectedRole !== 'ALL') {
        if ((u.role || '').toLowerCase() !== selectedRole.toLowerCase()) return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        const isActive = u.is_active !== false;
        if (selectedStatus === 'Active' && !isActive) return false;
        if (selectedStatus === 'Inactive' && isActive) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const id = (u.id || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const address = (u.address || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !id.includes(q) && !phone.includes(q) && !address.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [users, searchQuery, selectedRole, selectedStatus]);

  // Aggregate metrics
  const totalCount = users.length;
  const adminCount = users.filter((u) => (u.role || '').toLowerCase() === 'admin').length;
  const donorCount = users.filter((u) => (u.role || '').toLowerCase() === 'donor').length;
  const patientCount = users.filter((u) => (u.role || '').toLowerCase() === 'user').length;

  const getRoleBadge = (role) => {
    const r = (role || '').toLowerCase();
    switch (r) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="w-3 h-3" />
            Hospital Admin
          </span>
        );
      case 'donor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <Heart className="w-3 h-3" />
            Volunteer Donor
          </span>
        );
      case 'user':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            <User className="w-3 h-3" />
            Patient / Requester
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
            {role}
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
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Registered Accounts</span>
            <User className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black mt-2" style={{ color: 'var(--text-primary)' }}>{totalCount}</p>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Multi-role user registry</span>
        </div>

        <div 
          className="p-4 rounded-xl border shadow-sm transition-all"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Hospital Admins</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-indigo-600 dark:text-indigo-400">{adminCount}</p>
          <span className="text-[11px] text-indigo-500 font-medium">Command authority</span>
        </div>

        <div 
          className="p-4 rounded-xl border shadow-sm transition-all"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Volunteer Donors</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-rose-600 dark:text-rose-400">{donorCount}</p>
          <span className="text-[11px] text-rose-500 font-medium">Donor live roster links</span>
        </div>

        <div 
          className="p-4 rounded-xl border shadow-sm transition-all"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Patients / Requesters</span>
            <User className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-cyan-600 dark:text-cyan-400">{patientCount}</p>
          <span className="text-[11px] text-cyan-500 font-medium">Care portal accounts</span>
        </div>
      </div>

      {/* 2. Privacy & Security Notice Banner */}
      <div 
        className="px-4 py-3 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-xs"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
          <span style={{ color: 'var(--text-secondary)' }}>
            <strong>Protected RBAC User Registry:</strong> Sensitive authentication data (passwords, password hashes, and JWT secrets) is strictly protected and never displayed or exposed.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Credential Privacy Enforced</span>
        </div>
      </div>

      {/* 3. Search & Filters Toolbar */}
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
            placeholder="Search by name, email, user ID, phone, address..."
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
          {/* Role Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold hidden lg:inline" style={{ color: 'var(--text-muted)' }}>Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-8 px-2 text-xs font-semibold rounded-lg border focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
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
              title="Refresh Users"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Users Table / Cards */}
      <div 
        className="rounded-xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div 
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Registered Application Users ({filteredUsers.length})
            </h3>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing {filteredUsers.length} of {totalCount} users
          </span>
        </div>

        {/* Loading state */}
        {isLoading && users.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Loading registered users from backend...
            </span>
          </div>
        ) : filteredUsers.length === 0 ? (
          /* Empty state */
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <User className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              No users found matching your search or filters
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Try adjusting the role or search criteria above.
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
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Portal Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {filteredUsers.map((user) => {
                  const isExpanded = expandedId === user.id;
                  const isActive = user.is_active !== false;

                  return (
                    <React.Fragment key={user.id}>
                      <tr 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {/* ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                          {user.id}
                        </td>

                        {/* Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                              {user.name}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[190px]">{user.email}</span>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {getRoleBadge(user.role)}
                        </td>

                        {/* Account Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span>{isActive ? 'Active' : 'Inactive'}</span>
                          </span>
                        </td>

                        {/* Blood Group */}
                        <td className="py-3.5 px-4">
                          {user.blood_group ? (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 min-w-[32px]">
                              {user.blood_group}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Registered Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {formatTimestamp(user.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : user.id)}
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

                      {/* Expanded User Details */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: 'var(--bg-input)' }}>
                          <td colSpan={8} className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              {/* Contact & Phone */}
                              <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex flex-col gap-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Communication</span>
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="font-semibold">{user.phone || 'Phone not registered'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>{user.email}</span>
                                </div>
                              </div>

                              {/* Address & Profile link */}
                              <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex flex-col gap-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Profile & Location</span>
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  <span className="truncate">{user.address || 'Bengaluru Metro'}</span>
                                </div>
                                {user.donor_id && (
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <Heart className="w-3 h-3 text-rose-500" />
                                    <span>Linked Donor Profile: <strong className="font-mono text-slate-700 dark:text-slate-300">{user.donor_id}</strong></span>
                                  </div>
                                )}
                              </div>

                              {/* Timestamps & Security Status */}
                              <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex flex-col gap-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Account Security</span>
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>JWT Bearer Protected Session</span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Created: {formatTimestamp(user.created_at)}</span>
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

export default UserDataSection;
