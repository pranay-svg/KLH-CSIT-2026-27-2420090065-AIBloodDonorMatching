import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../Navbar';
import { PatientDataSection } from '../admin/PatientDataSection';
import { DonorDataSection } from '../admin/DonorDataSection';
import { UserDataSection } from '../admin/UserDataSection';
import { useWebSocket } from '../../context/WebSocketContext';
import { 
  getHealth, 
  getDonors, 
  getEmergencies, 
  getUsers,
  updateEmergencyStatus,
  updateDonorStatus,
  resetSeedDonors 
} from '../../services/api';
import { 
  ServerOff, 
  HeartHandshake,
  HeartPulse,
  Users,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export function AdminDashboard() {
  const { wsStatus, addListener } = useWebSocket();

  // Navigation tab state: 'patients' | 'donors' | 'users'
  const [activeTab, setActiveTab] = useState('patients');

  // Backend Health State
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline'
  const [isResetting, setIsResetting] = useState(false);

  // Data Collections
  const [emergencies, setEmergencies] = useState([]);
  const [donors, setDonors] = useState([]);
  const [users, setUsers] = useState([]);

  // Loading States
  const [isLoadingEmergencies, setIsLoadingEmergencies] = useState(false);
  const [isLoadingDonors, setIsLoadingDonors] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // 1. Fetch Patient Emergency Requests
  const fetchEmergencies = useCallback(async () => {
    setIsLoadingEmergencies(true);
    try {
      const data = await getEmergencies();
      setEmergencies(data || []);
    } catch (err) {
      console.error('Failed to load patient emergencies:', err);
    } finally {
      setIsLoadingEmergencies(false);
    }
  }, []);

  // 2. Fetch Donors
  const fetchDonors = useCallback(async () => {
    setIsLoadingDonors(true);
    try {
      const data = await getDonors();
      setDonors(data || []);
    } catch (err) {
      console.error('Failed to load donors:', err);
    } finally {
      setIsLoadingDonors(false);
    }
  }, []);

  // 3. Fetch Users
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load registered users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Fetch all initial dashboard data
  const loadAllData = useCallback(async () => {
    try {
      await getHealth();
      setBackendStatus('online');
    } catch {
      setBackendStatus('offline');
    }
    await Promise.all([fetchEmergencies(), fetchDonors(), fetchUsers()]);
  }, [fetchEmergencies, fetchDonors, fetchUsers]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Periodic REST heartbeat check
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await getHealth();
        setBackendStatus('online');
      } catch {
        setBackendStatus('offline');
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Real-time WebSocket Listeners
  useEffect(() => {
    const removeListener = addListener((event) => {
      switch (event.event_type) {
        case 'EMERGENCY_CREATED':
          if (event.emergency) {
            setEmergencies((prev) => [event.emergency, ...prev.filter((e) => e.id !== event.emergency.id)]);
          }
          break;

        case 'EMERGENCY_URGENCY_CHANGED':
          setEmergencies((prev) =>
            prev.map((e) =>
              e.id === event.emergency_id ? { ...e, emergency_level: event.new_emergency_level } : e
            )
          );
          break;

        case 'EMERGENCY_STATUS_CHANGED':
          setEmergencies((prev) =>
            prev.map((e) =>
              e.id === event.emergency_id ? { ...e, status: event.status } : e
            )
          );
          break;

        case 'DONOR_STATUS_CHANGED':
          setDonors((prev) =>
            prev.map((d) => {
              const id = d.id || d._id;
              if (id === event.donor_id) {
                return { ...d, ...event.changes };
              }
              return d;
            })
          );
          break;

        case 'DONOR_LOCATION_CHANGED':
          setDonors((prev) =>
            prev.map((d) => {
              const id = d.id || d._id;
              if (id === event.donor_id) {
                return { ...d, latitude: event.latitude, longitude: event.longitude };
              }
              return d;
            })
          );
          break;

        default:
          break;
      }
    });

    return () => removeListener();
  }, [addListener]);

  // Handle Emergency Status Update
  const handleUpdateEmergencyStatus = async (emergencyId, newStatus) => {
    try {
      await updateEmergencyStatus(emergencyId, newStatus);
      setEmergencies((prev) =>
        prev.map((e) => (e.id === emergencyId ? { ...e, status: newStatus } : e))
      );
    } catch (err) {
      console.error(`Failed to update status for emergency ${emergencyId}:`, err);
    }
  };

  // Handle Donor Availability Toggle
  const handleToggleDonorAvailability = async (donor) => {
    const donorId = donor.id || donor._id;
    const newStatus = !donor.is_available;
    try {
      await updateDonorStatus(donorId, { is_available: newStatus });
      setDonors((prev) =>
        prev.map((d) => ((d.id || d._id) === donorId ? { ...d, is_available: newStatus } : d))
      );
    } catch (err) {
      console.error(`Failed to toggle availability for donor ${donorId}:`, err);
    }
  };

  // Reset Benchmark Seed Data
  const handleResetSeedData = async () => {
    setIsResetting(true);
    try {
      await resetSeedDonors();
      await loadAllData();
    } catch (err) {
      console.error('Failed to reset seed data:', err);
    } finally {
      setIsResetting(false);
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
      {/* Top Navigation Bar */}
      <Navbar
        backendStatus={backendStatus}
        wsStatus={wsStatus}
        activeEmergency={emergencies[0] || null}
        onResetSeedData={handleResetSeedData}
        isResetting={isResetting}
      />

      {/* Backend Offline Alert */}
      {backendStatus === 'offline' && (
        <div className="bg-rose-600/90 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md">
          <ServerOff className="w-4 h-4" />
          <span>
            FastAPI Backend is currently unreachable on port 8001. Please ensure backend is running.
          </span>
        </div>
      )}

      {/* Main Admin Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* ============================================================ */}
        {/* CLEAN 3-ITEM ADMIN NAVIGATION HEADER                         */}
        {/* ============================================================ */}
        <div 
          className="rounded-2xl border p-2 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* 3 Main Tabs: Patient Data | Donor Data | User Data */}
          <div 
            className="flex items-center gap-1.5 w-full sm:w-auto p-1.5 rounded-xl border overflow-x-auto max-w-full"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* 1. Patient Data Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('patients')}
              className={`shrink-0 flex-1 sm:flex-none h-9 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98] ${
                activeTab === 'patients'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'hover:opacity-85'
              }`}
              style={{
                backgroundColor: activeTab === 'patients' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'patients' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              <HeartPulse className="w-4 h-4" />
              <span>Patient Data</span>
              <span 
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'patients' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {emergencies.length}
              </span>
            </button>

            {/* 2. Donor Data Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('donors')}
              className={`shrink-0 flex-1 sm:flex-none h-9 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98] ${
                activeTab === 'donors'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'hover:opacity-85'
              }`}
              style={{
                backgroundColor: activeTab === 'donors' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'donors' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              <Users className="w-4 h-4" />
              <span>Donor Data</span>
              <span 
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'donors' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {donors.length}
              </span>
            </button>

            {/* 3. User Data Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`shrink-0 flex-1 sm:flex-none h-9 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98] ${
                activeTab === 'users'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'hover:opacity-85'
              }`}
              style={{
                backgroundColor: activeTab === 'users' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'users' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>User Data</span>
              <span 
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'users' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {users.length}
              </span>
            </button>
          </div>

          {/* Quick Refresh All Action */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={loadAllData}
              disabled={isLoadingEmergencies || isLoadingDonors || isLoadingUsers}
              className="h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              title="Refresh all hospital records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(isLoadingEmergencies || isLoadingDonors || isLoadingUsers) ? 'animate-spin text-rose-500' : ''}`} />
              <span className="hidden sm:inline">Sync All Data</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: PATIENT DATA                                          */}
        {/* ============================================================ */}
        {activeTab === 'patients' && (
          <PatientDataSection
            emergencies={emergencies}
            isLoading={isLoadingEmergencies}
            onRefresh={fetchEmergencies}
            onUpdateStatus={handleUpdateEmergencyStatus}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 2: DONOR DATA                                            */}
        {/* ============================================================ */}
        {activeTab === 'donors' && (
          <DonorDataSection
            donors={donors}
            isLoading={isLoadingDonors}
            onRefresh={fetchDonors}
            onToggleAvailability={handleToggleDonorAvailability}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 3: USER DATA                                             */}
        {/* ============================================================ */}
        {activeTab === 'users' && (
          <UserDataSection
            users={users}
            isLoading={isLoadingUsers}
            onRefresh={fetchUsers}
          />
        )}

      </main>

      {/* Footer */}
      <footer 
        className="border-t px-4 py-4 mt-auto transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-rose-500" />
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
              AI Blood Donor Matching Platform
            </span>
            <span>•</span>
            <span>Hospital Administration</span>
          </div>

          <p className="text-[11px] max-w-xl text-center sm:text-right" style={{ color: 'var(--text-muted)' }}>
            <strong>Notice:</strong> This system provides decision support and donor coordination.
            Clinical personnel verify biological cross-match prior to transfusion.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default AdminDashboard;
