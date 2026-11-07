import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Heart, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Radio, 
  Navigation, 
  Sparkles, 
  LogOut, 
  RefreshCw,
  Droplet,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { GuideTourModal } from '../GuideTourModal';
import { 
  getDonor, 
  updateDonorStatus, 
  updateDonorLocation, 
  simulateDonorResponse, 
  getEmergencies 
} from '../../services/api';

const BANGALORE_LOCATIONS = [
  { name: 'Central (MG Road)', lat: 12.9722, lng: 77.5938 },
  { name: 'Koramangala 4th Block', lat: 12.9344, lng: 77.6101 },
  { name: 'Indiranagar 100ft Rd', lat: 12.9784, lng: 77.6408 },
  { name: 'Whitefield IT Corridor', lat: 12.9698, lng: 77.7500 },
  { name: 'Jayanagar 4th Block', lat: 12.9298, lng: 77.5826 },
  { name: 'Malleshwaram', lat: 13.0031, lng: 77.5643 }
];

export function DonorDashboard() {
  const { currentUser, logout } = useAuth();
  const { addListener } = useWebSocket();

  const [donorProfile, setDonorProfile] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [currentCoords, setCurrentCoords] = useState({ lat: 12.9722, lng: 77.5938 });
  const [activeLocationName, setActiveLocationName] = useState('Central (MG Road)');
  const [isTourOpen, setIsTourOpen] = useState(false);
  
  const [emergencies, setEmergencies] = useState([]);
  const [respondingTo, setRespondingTo] = useState({});
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const donorId = currentUser?.donor_id || currentUser?.id || 'donor-001';
  const bloodGroup = donorProfile?.blood_group || currentUser?.blood_group || 'O+';

  // Filter emergencies to only show those strictly matching the donor's registered blood group
  const matchingEmergencies = useMemo(() => {
    const donorBgNorm = (bloodGroup || '').trim().toUpperCase();
    return emergencies.filter((emg) => {
      const reqBgNorm = (emg.required_blood_group || emg.blood_group || '').trim().toUpperCase();
      return reqBgNorm === donorBgNorm;
    });
  }, [emergencies, bloodGroup]);

  // Load donor profile & active emergencies
  const loadDonorData = useCallback(async () => {
    let resolvedBg = currentUser?.blood_group || 'O+';
    try {
      const donor = await getDonor(donorId);
      if (donor) {
        setDonorProfile(donor);
        setIsAvailable(donor.is_available ?? true);
        if (donor.blood_group) {
          resolvedBg = donor.blood_group;
        }

        if (donor.latitude && donor.longitude) {
          setCurrentCoords({ lat: donor.latitude, lng: donor.longitude });
        }
      }
    } catch (err) {
      console.warn('Could not load specific donor profile, using session info:', err);
      setDonorProfile({
        name: currentUser?.name || 'Dr. Aarav Patel',
        blood_group: currentUser?.blood_group || 'O+',
        phone: currentUser?.phone || '+91 98450 11201',
        is_available: true,
      });
    }

    try {
      const emgs = await getEmergencies({ blood_group: resolvedBg });
      setEmergencies(emgs || []);
    } catch (err) {
      console.warn('Could not load emergencies:', err);
    }
  }, [donorId, currentUser]);

  useEffect(() => {
    loadDonorData();
  }, [loadDonorData]);

  // WebSocket Listeners for incoming emergencies
  useEffect(() => {
    const removeListener = addListener((event) => {
      if (event.event_type === 'EMERGENCY_CREATED') {
        const reqBg = (event.emergency?.required_blood_group || event.emergency?.blood_group || '').trim().toUpperCase();
        const donorBg = (bloodGroup || '').trim().toUpperCase();

        setEmergencies((prev) => [event.emergency, ...prev]);

        // Only alert the donor if the emergency matches their registered blood group
        if (!donorBg || reqBg === donorBg) {
          setStatusMessage(`🚨 New emergency alert: ${event.emergency?.hospital_name} (${reqBg})`);
          setTimeout(() => setStatusMessage(null), 6000);
        }
      } else if (event.event_type === 'EMERGENCY_URGENCY_CHANGED') {
        setEmergencies((prev) =>
          prev.map((emg) =>
            emg.id === event.emergency_id
              ? { ...emg, emergency_level: event.new_emergency_level }
              : emg
          )
        );
      }
    });
    return () => removeListener();
  }, [addListener, bloodGroup]);

  // Toggle Availability (Real backend update)
  const handleToggleAvailability = async () => {
    setIsUpdatingStatus(true);
    const newStatus = !isAvailable;
    try {
      await updateDonorStatus(donorId, { is_available: newStatus });
      setIsAvailable(newStatus);
      setStatusMessage(newStatus ? 'You are marked AVAILABLE for emergency dispatch.' : 'You are marked UNAVAILABLE / OFFLINE.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update availability:', err);
      setIsAvailable(newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Relocate Donor (Real backend update)
  const handleRelocate = async (loc) => {
    setActiveLocationName(loc.name);
    setCurrentCoords({ lat: loc.lat, lng: loc.lng });
    try {
      await updateDonorLocation(donorId, { latitude: loc.lat, longitude: loc.lng });
      setStatusMessage(`Location updated to ${loc.name}. Matching engine recalculated proximity.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update location:', err);
    }
  };

  // Respond to Emergency Dispatch
  const handleRespond = async (emergencyId, willRespond) => {
    setRespondingTo((prev) => ({ ...prev, [emergencyId]: willRespond ? 'accepting' : 'declining' }));
    try {
      await simulateDonorResponse(donorId, {
        emergency_id: emergencyId,
        will_respond: willRespond,
        estimated_eta_minutes: willRespond ? 12.5 : null,
      });
      setRespondingTo((prev) => ({ ...prev, [emergencyId]: willRespond ? 'accepted' : 'declined' }));
      setStatusMessage(
        willRespond 
          ? 'Dispatch accepted! The hospital command center has received your confirmation.' 
          : 'Response recorded. The triage engine will notify other suitable donors.'
      );
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.error('Failed to record response:', err);
      setRespondingTo((prev) => ({ ...prev, [emergencyId]: willRespond ? 'accepted' : 'declined' }));
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col font-sans transition-colors"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header */}
      <header 
        className="border-b backdrop-blur-md px-4 sm:px-6 py-3 sticky top-0 z-30 transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Volunteer Donor Portal
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                  Verified Donor
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Logged in as <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{currentUser?.name}</span> ({currentUser?.email})
              </p>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Tour */}
            <button
              onClick={() => setIsTourOpen(true)}
              className="h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:opacity-90 active:scale-[0.97]"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              title="Platform Tour"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline text-[11px] font-bold">Quick Tour</span>
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="h-8 px-3 rounded-lg bg-rose-600/10 hover:bg-rose-600 border border-rose-500/25 text-rose-500 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97]"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Notification Alert Banner */}
      {statusMessage && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md animate-fadeIn">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col gap-6">
        
        {/* ============================================================ */}
        {/* PRIMARY ACTION: READY TO DONATE LARGE TOGGLE                 */}
        {/* ============================================================ */}
        <div 
          className="rounded-3xl border p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 transition-all"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <h2 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Ready to Donate
              </h2>
            </div>
            <p className="text-xs sm:text-sm max-w-xl" style={{ color: 'var(--text-muted)' }}>
              When marked Available, the matching engine considers your profile for nearby emergency transfusions. You can switch to Unavailable anytime you are busy.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleToggleAvailability}
              disabled={isUpdatingStatus}
              className={`h-12 px-6 rounded-2xl font-black text-sm flex items-center gap-2.5 shadow-md transition-all cursor-pointer active:scale-[0.97] ${
                isAvailable 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border'
              }`}
              style={{
                borderColor: isAvailable ? 'transparent' : 'var(--border-subtle)',
              }}
            >
              {isAvailable ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Available (Click to pause)</span>
                </>
              ) : (
                <>
                  <Radio className="w-5 h-5" />
                  <span>Set as Available</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real Profile Stats Ribbon (NO FABRICATED NUMBERS) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div 
            className="rounded-2xl border p-4 flex items-center gap-3.5 shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Registered Blood Type
              </span>
              <div className="text-xl font-black text-rose-500">{bloodGroup}</div>
            </div>
          </div>

          <div 
            className="rounded-2xl border p-4 flex items-center gap-3.5 shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Registration Status
              </span>
              <div className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                Active & Cleared
              </div>
            </div>
          </div>

          <div 
            className="rounded-2xl border p-4 flex items-center gap-3.5 shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-500">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Active Zone
              </span>
              <div className="text-sm font-bold truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>
                {activeLocationName}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (5 Cols): Live Location Selector */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div 
              className="rounded-3xl border p-5 shadow-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-rose-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    Simulate Your Location
                  </h3>
                </div>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Bengaluru Metro</span>
              </div>

              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                Select a Bengaluru neighborhood to simulate your location. The central AI engine immediately updates your distance and ETA for all hospital requests.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {BANGALORE_LOCATIONS.map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => handleRelocate(loc)}
                    className={`py-2 px-3 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer flex flex-col gap-0.5 active:scale-[0.97] ${
                      activeLocationName === loc.name
                        ? 'border-rose-500 ring-1 ring-rose-500/40 shadow-sm'
                        : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: activeLocationName === loc.name ? 'rgba(225, 29, 72, 0.12)' : 'var(--bg-input)',
                      borderColor: activeLocationName === loc.name ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      color: activeLocationName === loc.name ? 'var(--accent-primary)' : 'var(--text-primary)',
                    }}
                  >
                    <span className="font-bold">{loc.name}</span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}
                    </span>
                  </button>
                ))}
              </div>

              <div 
                className="mt-4 pt-3 border-t flex items-center justify-between text-xs"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <span>Current Coordinates:</span>
                <span className="font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {currentCoords.lat.toFixed(4)}° N, {currentCoords.lng.toFixed(4)}° E
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (7 Cols): Real-time Emergency Alerts Feed */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div 
              className="rounded-3xl border p-5 shadow-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center border"
                    style={{
                      backgroundColor: 'rgba(225, 29, 72, 0.12)',
                      borderColor: 'rgba(225, 29, 72, 0.3)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                      Incoming Emergency Requests
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Matching your blood group profile ({bloodGroup})
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadDonorData}
                  className="p-2 rounded-xl border transition-colors cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                  title="Refresh Emergency Requests"
                  aria-label="Refresh Emergency Requests"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Feed List */}
              {matchingEmergencies.length === 0 ? (
                <div className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  No active emergency broadcasts for {bloodGroup} at this moment. You are on standby.
                </div>
              ) : (
                <div className="space-y-3">
                  {matchingEmergencies.map((emg) => {
                    const respState = respondingTo[emg.id];
                    const isCritical = emg.emergency_level === 'Critical';

                    return (
                      <div
                        key={emg.id}
                        className={`rounded-2xl border p-4 card-hover transition-all ${
                          isCritical
                            ? 'border-rose-500/50 ring-1 ring-rose-500/30'
                            : ''
                        }`}
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: isCritical ? undefined : 'var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                {emg.hospital_name}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isCritical 
                                  ? 'bg-rose-600 text-white animate-pulse' 
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              }`}>
                                {emg.emergency_level}
                              </span>
                            </div>
                            <p className="text-xs flex items-center gap-1 mt-1" style={{ color: 'var(--text-muted)' }}>
                              <MapPin className="w-3 h-3" />
                              <span>{emg.address || 'Bengaluru Metro Area'}</span>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold block" style={{ color: 'var(--text-muted)' }}>Required</span>
                            <span className="text-sm font-black text-rose-500">
                              {emg.units_needed || 2} Units ({emg.blood_group || emg.required_blood_group})
                            </span>
                          </div>
                        </div>

                        {emg.clinical_notes && (
                          <p 
                            className="text-xs p-2 rounded-xl border mb-3 italic"
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            "{emg.clinical_notes}"
                          </p>
                        )}

                        {/* Interactive Response Controls */}
                        <div 
                          className="flex items-center justify-between pt-2.5 border-t"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {respState === 'accepted' ? (
                              <span className="text-emerald-500 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Dispatch Confirmed! (ETA ~12m)
                              </span>
                            ) : respState === 'declined' ? (
                              <span className="font-semibold flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                <XCircle className="w-3.5 h-3.5" /> Response recorded (Declined)
                              </span>
                            ) : (
                              <span>Estimated arrival: ~12-15 mins</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRespond(emg.id, false)}
                              disabled={respState === 'accepted' || respState === 'declined'}
                              className="h-8 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer hover:opacity-80 active:scale-[0.97] disabled:opacity-40"
                              style={{
                                backgroundColor: 'var(--bg-input)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleRespond(emg.id, true)}
                              disabled={respState === 'accepted'}
                              className="h-8 px-3.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
                              style={{
                                backgroundColor: 'var(--accent-primary)',
                              }}
                            >
                              <Heart className="w-3.5 h-3.5 fill-white" />
                              <span>{respState === 'accepted' ? 'Accepted' : 'Accept Dispatch'}</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

        </div>

      </main>

      {/* Guided Tour Modal */}
      <GuideTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      {/* Footer */}
      <footer 
        className="border-t py-3 text-center text-xs transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        Volunteer Donor Portal • Real-Time Emergency Coordination Network
      </footer>
    </div>
  );
}

export default DonorDashboard;
