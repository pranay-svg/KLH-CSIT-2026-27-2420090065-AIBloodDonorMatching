import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Search, 
  MapPin, 
  CheckCircle2, 
  Navigation, 
  RefreshCw, 
  Sparkles
} from 'lucide-react';
import { 
  getDonors, 
  updateDonorStatus, 
  updateDonorLocation, 
  simulateDonorResponse 
} from '../services/api';

const BLOOD_GROUPS = ['ALL', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export const DonorPortal = ({
  isOpen = false,
  onClose,
  activeEmergencyId = null,
  onDataChanged,
}) => {
  const [donors, setDonors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);
  const [actionNotice, setActionNotice] = useState('');

  const fetchDonorList = async () => {
    setIsLoading(true);
    try {
      const data = await getDonors();
      setDonors(data || []);
    } catch (err) {
      console.error('Failed to load donors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDonorList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 3500);
  };

  // Toggle availability via PATCH /api/donors/{id}/status
  const handleToggleAvailability = async (donor) => {
    const donorId = donor.id || donor._id;
    setUpdatingId(donorId);
    try {
      const newStatus = !donor.is_available;
      await updateDonorStatus(donorId, { is_available: newStatus });
      setDonors((prev) =>
        prev.map((d) => ((d.id || d._id) === donorId ? { ...d, is_available: newStatus } : d))
      );
      showNotice(`Donor ${donor.name} is now ${newStatus ? 'AVAILABLE' : 'OFFLINE'}. WebSocket broadcast sent.`);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      showNotice(`Failed to toggle availability: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Shift coordinates via PATCH /api/donors/{id}/location
  const handleShiftLocation = async (donor) => {
    const donorId = donor.id || donor._id;
    setUpdatingId(donorId);
    try {
      const newLat = Number((donor.latitude + (Math.random() - 0.5) * 0.02).toFixed(4));
      const newLng = Number((donor.longitude + (Math.random() - 0.5) * 0.02).toFixed(4));
      await updateDonorLocation(donorId, {
        latitude: newLat,
        longitude: newLng,
        address: `Updated Coordinate [${newLat}, ${newLng}]`,
      });
      setDonors((prev) =>
        prev.map((d) => ((d.id || d._id) === donorId ? { ...d, latitude: newLat, longitude: newLng } : d))
      );
      showNotice(`Updated location for ${donor.name} to [${newLat}, ${newLng}].`);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      showNotice(`Failed to shift location: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Simulate response via POST /api/donors/{id}/response
  const handleDispatchResponse = async (donor, responseType = 'ACCEPTED') => {
    if (!activeEmergencyId) {
      showNotice('No active emergency request selected to respond to.');
      return;
    }
    const donorId = donor.id || donor._id;
    setUpdatingId(donorId);
    try {
      await simulateDonorResponse(donorId, {
        emergency_id: activeEmergencyId,
        response: responseType,
        eta_mins: responseType === 'ACCEPTED' ? 12.0 : null,
      });
      showNotice(`Logged '${responseType}' response for ${donor.name}.`);
    } catch (err) {
      showNotice(`Failed to record response: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredDonors = donors.filter((d) => {
    const matchesSearch =
      d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.blood_group?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBg = selectedBloodGroup === 'ALL' || d.blood_group === selectedBloodGroup;
    return matchesSearch && matchesBg;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 lg:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="border rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 lg:p-5 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base lg:text-lg font-bold tracking-wide flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                Registered Donor Management Roster
                <span 
                  className="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {donors.length} Donors
                </span>
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Inspect donor metrics, toggle dispatch availability, and simulate mobility
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDonorList}
              className="h-8 w-8 rounded-lg border transition-all cursor-pointer hover:bg-slate-500/10 flex items-center justify-center active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
              title="Refresh roster from backend"
              aria-label="Refresh roster"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-slate-500/10 flex items-center justify-center transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Close roster"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Notice Bar */}
        {actionNotice && (
          <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-200 text-xs text-indigo-700 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Filter Controls */}
        <div 
          className="p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search donor name, blood group, address..."
              className="w-full h-8 border rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Blood Group Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                onClick={() => setSelectedBloodGroup(bg)}
                className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] flex items-center justify-center ${
                  selectedBloodGroup === bg
                    ? 'bg-rose-600 text-white shadow'
                    : 'border hover:bg-slate-500/10'
                }`}
                style={{
                  backgroundColor: selectedBloodGroup === bg ? undefined : 'var(--bg-input)',
                  borderColor: selectedBloodGroup === bg ? undefined : 'var(--border-subtle)',
                  color: selectedBloodGroup === bg ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                {bg}
              </button>
            ))}
          </div>

        </div>

        {/* Donor Table / Roster */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading donor profiles from database...</span>
            </div>
          ) : filteredDonors.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 italic">
              No registered donors matched the selected criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDonors.map((donor) => {
                const donorId = donor.id || donor._id;
                const isBusy = updatingId === donorId;

                return (
                  <div
                    key={donorId}
                    className="border rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                              {donor.name}
                            </h4>
                            <span 
                              className="px-2 py-0.5 rounded-full text-xs font-black"
                              style={{
                                backgroundColor: 'rgba(225, 29, 72, 0.15)',
                                color: 'var(--accent-primary)',
                              }}
                            >
                              {donor.blood_group}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {donor.age}y • {donor.gender}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <MapPin className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                            {donor.address}
                          </p>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                          donor.is_available 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                            : 'bg-rose-50 text-rose-700 border-rose-300'
                        }`}>
                          {donor.is_available ? 'Available' : 'Offline'}
                        </span>
                      </div>

                      {/* Donor Profile Stats */}
                      <div 
                        className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t text-[11px]"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                      >
                        <div>
                          <span className="text-[10px] uppercase block" style={{ color: 'var(--text-muted)' }}>Donations</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{donor.donation_count || 0} times</strong>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block" style={{ color: 'var(--text-muted)' }}>Last Donated</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{donor.days_since_last_donation || 90}d ago</strong>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block" style={{ color: 'var(--text-muted)' }}>Acceptance</span>
                          <strong className="text-emerald-600">{Math.round((donor.historical_acceptance_rate || 0.85) * 100)}%</strong>
                        </div>
                      </div>

                      {/* Coordinates & Eligibility */}
                      <div className="mt-2 text-[10px] flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                        <span>Coords: [{Number(donor.latitude).toFixed(4)}, {Number(donor.longitude).toFixed(4)}]</span>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{donor.eligibility_status || 'Eligible'}</span>
                      </div>
                    </div>

                    {/* Demonstration Action Buttons */}
                    <div 
                      className="pt-2 border-t flex items-center gap-1.5 flex-wrap"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <button
                        onClick={() => handleToggleAvailability(donor)}
                        disabled={isBusy}
                        className={`flex-1 h-8 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center ${
                          donor.is_available
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                        } disabled:opacity-50`}
                      >
                        {donor.is_available ? 'Set Offline' : 'Set Available'}
                      </button>

                      <button
                        onClick={() => handleShiftLocation(donor)}
                        disabled={isBusy}
                        className="h-8 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
                        title="Simulate GPS movement"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Move</span>
                      </button>

                      <button
                        onClick={() => handleDispatchResponse(donor, 'ACCEPTED')}
                        disabled={isBusy || !activeEmergencyId}
                        className="h-8 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
                        title="Simulate accepted response to active emergency"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Accept</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-3 lg:p-4 border-t flex justify-end"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg border text-xs font-bold cursor-pointer transition-all shadow-sm active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            Close Roster
          </button>
        </div>

      </div>
    </div>
  );
};

export default DonorPortal;
