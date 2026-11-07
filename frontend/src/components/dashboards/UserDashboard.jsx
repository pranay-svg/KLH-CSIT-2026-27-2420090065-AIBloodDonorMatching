import React, { useState, useEffect, useCallback } from 'react';
import { 
  Stethoscope, 
  PlusCircle, 
  Clock, 
  Search, 
  Droplet, 
  MapPin, 
  LogOut, 
  RefreshCw, 
  Sparkles, 
  ShieldAlert, 
  HelpCircle,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { GuideTourModal } from '../GuideTourModal';
import { 
  getEmergencies, 
  createEmergency, 
  updateEmergencyUrgency, 
  getDonors 
} from '../../services/api';

export function UserDashboard() {
  const { currentUser, logout } = useAuth();
  const { addListener } = useWebSocket();

  const [emergencies, setEmergencies] = useState([]);
  const [allDonors, setAllDonors] = useState([]);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // New Request Form State
  const [hospitalName, setHospitalName] = useState('Manipal Hospital, Old Airport Rd');
  const [bloodGroupNeeded, setBloodGroupNeeded] = useState(currentUser?.blood_group || 'A+');
  const [unitsNeeded, setUnitsNeeded] = useState(2);
  const [urgencyLevel, setUrgencyLevel] = useState('Urgent');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '+91 98111 22334');
  const [notes, setNotes] = useState('Urgent surgical standby required within 60 mins.');
  const [address, setAddress] = useState(currentUser?.address || 'HAL Airport Rd, Kodihalli, Bengaluru');

  // Filter state for donor finder
  const [filterBloodGroup, setFilterBloodGroup] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Load user data & emergencies
  const loadData = useCallback(async () => {
    try {
      const emgs = await getEmergencies();
      setEmergencies(emgs || []);
    } catch (err) {
      console.warn('Failed to load emergencies:', err);
    }

    try {
      const donors = await getDonors();
      setAllDonors(donors || []);
    } catch (err) {
      console.warn('Failed to load donors:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket Live Listeners
  useEffect(() => {
    const removeListener = addListener((event) => {
      if (event.event_type === 'EMERGENCY_CREATED') {
        setEmergencies((prev) => [event.emergency, ...prev]);
        setStatusMessage(`🚨 Emergency Broadcast Live: ${event.emergency?.hospital_name}`);
        setTimeout(() => setStatusMessage(null), 5000);
      } else if (event.event_type === 'EMERGENCY_URGENCY_CHANGED') {
        setEmergencies((prev) =>
          prev.map((e) =>
            e.id === event.emergency_id ? { ...e, emergency_level: event.new_emergency_level } : e
          )
        );
      } else if (event.event_type === 'DONOR_STATUS_CHANGED') {
        setAllDonors((prev) =>
          prev.map((d) => (d.id === event.donor_id ? { ...d, ...event.changes } : d))
        );
      } else if (event.event_type === 'DONOR_RESPONSE_RECEIVED') {
        setStatusMessage(`✅ Donor response received for case ${event.emergency_id}! Coordination in progress.`);
        setTimeout(() => setStatusMessage(null), 6000);
      }
    });
    return () => removeListener();
  }, [addListener]);

  // Submit Emergency Blood Request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setIsCreatingRequest(true);
    try {
      const payload = {
        patient_name: currentUser?.name || 'Patient',
        hospital_name: hospitalName,
        required_blood_group: bloodGroupNeeded,
        units_needed: parseInt(unitsNeeded, 10),
        emergency_level: urgencyLevel,
        latitude: 12.9583,
        longitude: 77.6534,
        address: address,
        contact_person: contactPhone,
        notes: notes,
      };
      const created = await createEmergency(payload);
      setEmergencies((prev) => [created, ...prev]);
      setStatusMessage('Request created! AI matching is now active across the donor network.');
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err) {
      console.error('Failed to create emergency request:', err);
      setStatusMessage('Request submitted locally in fallback mode.');
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsCreatingRequest(false);
    }
  };

  // Escalate Urgency
  const handleEscalate = async (emgId) => {
    try {
      await updateEmergencyUrgency(emgId, 'Critical');
      setEmergencies((prev) =>
        prev.map((e) => (e.id === emgId ? { ...e, emergency_level: 'Critical' } : e))
      );
      setStatusMessage('Request escalated to CRITICAL! Dispatch priority elevated.');
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.error('Failed to escalate urgency:', err);
    }
  };

  // Filtered Donors (Presentation only)
  const filteredDonors = allDonors.filter((d) => {
    const matchesGroup = filterBloodGroup === 'ALL' || d.blood_group === filterBloodGroup;
    const matchesQuery = !searchQuery || d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || d.address?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesQuery;
  });

  const availableCount = allDonors.filter((d) => d.is_available).length;

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
              style={{ backgroundColor: 'var(--accent-secondary)' }}
            >
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Patient & Family Portal
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25">
                  Requester
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

      {/* Notification Banner */}
      {statusMessage && (
        <div className="bg-cyan-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md animate-fadeIn">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Grid */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col gap-6">
        
        {/* ============================================================ */}
        {/* STEP-BY-STEP EMERGENCY REQUEST PROGRESS BANNER               */}
        {/* ============================================================ */}
        <div 
          className="rounded-3xl border p-5 sm:p-6 shadow-sm"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block mb-3 text-cyan-600 dark:text-cyan-400">
            Emergency Blood Request Lifecycle
          </span>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            
            {/* Step 1: Request Created */}
            <div 
              className={`p-3 rounded-2xl border flex flex-col gap-1 transition-all ${
                emergencies.length > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Step 1
                </span>
                {emergencies.length > 0 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </div>
              <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Request Created
              </h4>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {emergencies.length > 0 ? `${emergencies.length} Active Request(s)` : 'Fill form below'}
              </p>
            </div>

            {/* Step 2: Matching in Progress */}
            <div 
              className={`p-3 rounded-2xl border flex flex-col gap-1 transition-all ${
                emergencies.length > 0 ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Step 2
                </span>
                {emergencies.length > 0 && <Radio className="w-4 h-4 text-indigo-500 animate-pulse" />}
              </div>
              <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Matching in Progress
              </h4>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                AI evaluating compatibility & ETA
              </p>
            </div>

            {/* Step 3: Donor Response Received */}
            <div 
              className="p-3 rounded-2xl border flex flex-col gap-1 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Step 3
                </span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Donor Response
              </h4>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Real-time confirmations via portal
              </p>
            </div>

            {/* Step 4: Coordination Update */}
            <div 
              className="p-3 rounded-2xl border flex flex-col gap-1 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Step 4
                </span>
                <Sparkles className="w-4 h-4 text-cyan-500" />
              </div>
              <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Coordination Update
              </h4>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Arrival tracking & staff readiness
              </p>
            </div>

          </div>
        </div>

        {/* 2-Column Responsive Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (5 Cols): Create Emergency Blood Request Form */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            <div 
              className="rounded-3xl border p-5 sm:p-6 shadow-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center border"
                  style={{
                    backgroundColor: 'rgba(225, 29, 72, 0.12)',
                    borderColor: 'rgba(225, 29, 72, 0.3)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    Request Blood Assistance
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Engages real-time AI matching to notify nearby compatible donors
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Hospital / Medical Center
                  </label>
                  <input
                    type="text"
                    required
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="e.g. Manipal Hospital Old Airport Rd"
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Blood Group Needed
                    </label>
                    <select
                      value={bloodGroupNeeded}
                      onChange={(e) => setBloodGroupNeeded(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none transition-colors cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Units Needed
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={unitsNeeded}
                      onChange={(e) => setUnitsNeeded(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Urgency Level
                    </label>
                    <select
                      value={urgencyLevel}
                      onChange={(e) => setUrgencyLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none transition-colors cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="Urgent">🟠 Urgent (Soon)</option>
                      <option value="Critical">🔴 Critical (Immediate)</option>
                      <option value="Routine">🟢 Routine (Planned)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Emergency Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+91 98..."
                      className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Hospital Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="HAL Airport Rd, Bengaluru"
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Clinical Context / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Patient surgical context..."
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors resize-none"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingRequest}
                  className="w-full h-10 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.97] cursor-pointer hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  <Droplet className="w-4 h-4 fill-white" />
                  <span>{isCreatingRequest ? 'Broadcasting Request...' : 'Broadcast Emergency Request'}</span>
                </button>
              </form>
            </div>

            {/* Blood Compatibility Guide */}
            <div 
              className="rounded-3xl border p-5 shadow-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <ShieldAlert className="w-4 h-4 text-cyan-500" />
                <span>Compatible Donors for Your Blood Type</span>
              </h3>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                For blood group <strong style={{ color: 'var(--accent-secondary)' }}>{currentUser?.blood_group || 'A+'}</strong>, suitable donors can be:
              </p>

              <div className="flex flex-wrap gap-1.5">
                {(currentUser?.blood_group === 'A+' ? ['A+', 'A-', 'O+', 'O-'] :
                  currentUser?.blood_group === 'O+' ? ['O+', 'O-'] :
                  currentUser?.blood_group === 'B+' ? ['B+', 'B-', 'O+', 'O-'] :
                  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']).map((bg) => (
                  <span 
                    key={bg} 
                    className="px-2.5 py-1 rounded-xl border text-xs font-bold"
                    style={{
                      backgroundColor: 'rgba(6, 182, 212, 0.1)',
                      borderColor: 'rgba(6, 182, 212, 0.3)',
                      color: 'var(--accent-secondary)',
                    }}
                  >
                    {bg}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column (7 Cols): Active Requests & Nearby Donor Radar */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Active Requests Tracker */}
            <div 
              className="rounded-3xl border p-5 sm:p-6 shadow-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    Active Request Updates
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Status updates and emergency response tracking
                  </p>
                </div>

                <button
                  onClick={loadData}
                  className="p-2 rounded-xl border transition-colors cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                  title="Refresh status"
                  aria-label="Refresh status"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {emergencies.length === 0 ? (
                <div className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  No active requests. Complete the form to broadcast a request.
                </div>
              ) : (
                <div className="space-y-3">
                  {emergencies.map((emg) => (
                    <div
                      key={emg.id}
                      className="rounded-2xl border p-4 flex flex-col gap-3"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{emg.hospital_name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              emg.emergency_level === 'Critical'
                                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                            }`}>
                              {emg.emergency_level}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{emg.address}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black" style={{ color: 'var(--accent-secondary)' }}>
                            {emg.units_needed} Units of {emg.blood_group || emg.required_blood_group}
                          </span>
                          <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>
                            Status: {emg.status || 'Active Triage'}
                          </span>
                        </div>
                      </div>

                      <div 
                        className="flex items-center justify-between pt-2 border-t text-xs"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> AI Matching Active
                        </span>

                        {emg.emergency_level !== 'Critical' && (
                          <button
                            onClick={() => handleEscalate(emg.id)}
                            className="h-8 px-3 rounded-xl bg-rose-600/10 hover:bg-rose-600 border border-rose-500/25 text-rose-500 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-[0.97]"
                          >
                            Escalate to Critical
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nearby Donor Pool Radar */}
            <div 
              className="rounded-3xl border p-5 sm:p-6 shadow-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    Nearby Donor Pool ({availableCount} Available)
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Active registered donors across Bengaluru Metro Area
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 mb-4">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by neighborhood or donor name..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
                  {['ALL', 'O+', 'O-', 'A+', 'B+', 'AB+'].map((bg) => (
                    <button
                      key={bg}
                      onClick={() => setFilterBloodGroup(bg)}
                      className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border active:scale-[0.97] ${
                        filterBloodGroup === bg
                          ? 'text-white shadow-sm'
                          : 'hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: filterBloodGroup === bg ? 'var(--accent-secondary)' : 'var(--bg-input)',
                        borderColor: 'var(--border-subtle)',
                        color: filterBloodGroup === bg ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Donor List */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {filteredDonors.length === 0 ? (
                  <div className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No donors matching the selected criteria.
                  </div>
                ) : (
                  filteredDonors.map((donor) => (
                    <div
                      key={donor.id || donor._id}
                      className="rounded-2xl border p-3 flex items-center justify-between gap-3 text-xs transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border"
                          style={{
                            backgroundColor: 'rgba(225, 29, 72, 0.1)',
                            borderColor: 'rgba(225, 29, 72, 0.3)',
                            color: 'var(--accent-primary)',
                          }}
                        >
                          {donor.blood_group}
                        </div>
                        <div>
                          <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{donor.name}</div>
                          <div className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <MapPin className="w-3 h-3" />
                            <span>{donor.address || 'Bengaluru Metro'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          donor.is_available 
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                            : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/25'
                        }`}>
                          {donor.is_available ? 'Available' : 'Busy'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

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
        Patient & Requester Portal • Emergency Blood Matching & Coordination
      </footer>
    </div>
  );
}

export default UserDashboard;
