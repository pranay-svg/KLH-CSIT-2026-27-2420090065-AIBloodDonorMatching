import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  PlusCircle, 
  Flame, 
  CheckCircle2, 
  Building2, 
  Droplet, 
  User, 
  ChevronDown,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { createEmergency, getEmergencies, updateEmergencyUrgency } from '../services/api';
import { formatApiError } from '../context/AuthContext';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const HOSPITAL_PRESETS = [
  {
    name: 'Victoria Hospital, Trauma Emergency Ward',
    lat: 12.9647,
    lng: 77.5746,
    contact: 'Dr. Ramesh (ER On-Duty)',
  },
  {
    name: 'Bowring & Lady Curzon Hospital, Central Bangalore',
    lat: 12.9822,
    lng: 77.6044,
    contact: 'Dr. Shweta Rao (Trauma Chief)',
  },
  {
    name: 'Manipal Hospital, Old Airport Road',
    lat: 12.9592,
    lng: 77.6534,
    contact: 'Dr. Arvind Sharma (Critical Care)',
  },
  {
    name: 'Apollo Hospitals, Bannerghatta Road',
    lat: 12.8938,
    lng: 77.5975,
    contact: 'Dr. Priya Nair (Blood Bank Director)',
  },
];

export const EmergencyPanel = ({
  activeEmergency,
  onSelectEmergency,
  onEmergencyCreated,
  isRecalculating = false,
}) => {
  const [existingEmergencies, setExistingEmergencies] = useState([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [patientName, setPatientName] = useState('Ananya Sen');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [unitsNeeded, setUnitsNeeded] = useState(2);
  const [emergencyLevel, setEmergencyLevel] = useState('Urgent'); // Routine, Urgent, Critical
  const [selectedHospitalIndex, setSelectedHospitalIndex] = useState(0);
  const [contactPerson, setContactPerson] = useState(HOSPITAL_PRESETS[0].contact);
  const [notes, setNotes] = useState('Acute hemorrhage, immediate donor dispatch requested.');

  // Load existing emergencies on mount
  const fetchEmergenciesList = useCallback(async () => {
    setIsLoadingExisting(true);
    try {
      const list = await getEmergencies();
      setExistingEmergencies(list || []);
      if (!activeEmergency && list && list.length > 0) {
        onSelectEmergency(list[0]);
      }
    } catch (err) {
      console.warn('Failed to fetch emergencies list:', err);
    } finally {
      setIsLoadingExisting(false);
    }
  }, [activeEmergency, onSelectEmergency]);

  useEffect(() => {
    fetchEmergenciesList();
  }, [fetchEmergenciesList]);

  const handleHospitalChange = (index) => {
    setSelectedHospitalIndex(index);
    setContactPerson(HOSPITAL_PRESETS[index].contact);
  };

  const handleCreateEmergency = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const hospital = HOSPITAL_PRESETS[selectedHospitalIndex];

    const payload = {
      patient_name: patientName.trim() || 'Emergency Patient',
      hospital_name: hospital.name,
      required_blood_group: bloodGroup,
      units_needed: Number(unitsNeeded),
      emergency_level: emergencyLevel,
      latitude: hospital.lat,
      longitude: hospital.lng,
      contact_person: contactPerson.trim() || hospital.contact,
      notes: notes.trim() || 'Emergency blood request',
    };

    try {
      const created = await createEmergency(payload);
      if (onEmergencyCreated) {
        await onEmergencyCreated(created);
      }
      setShowCreateForm(false);
      await fetchEmergenciesList();
    } catch (err) {
      console.error('Failed to create emergency:', err);
      setErrorMessage(
        formatApiError(err, 'Failed to submit emergency request. Check backend connection.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Demo Scenario: Victoria Hospital — O+ Emergency
  const handleTriggerDemoScenario = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    const demoPayload = {
      patient_name: 'Ananya Sen (Demo Patient)',
      hospital_name: 'Victoria Hospital, Trauma Emergency Ward',
      required_blood_group: 'O+',
      units_needed: 2,
      emergency_level: 'Critical',
      latitude: 12.9647,
      longitude: 77.5746,
      contact_person: 'Dr. Ramesh (Trauma ER)',
      notes: 'Demo Scenario: Victoria Hospital Acute O+ Transfusion Demand',
    };

    try {
      const created = await createEmergency(demoPayload);
      if (onEmergencyCreated) {
        await onEmergencyCreated(created);
      }
      setShowCreateForm(false);
      await fetchEmergenciesList();
    } catch (err) {
      console.error('Demo scenario failed:', err);
      setErrorMessage(formatApiError(err, 'Could not trigger demo scenario.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickUrgencySwitch = async (targetLevel) => {
    if (!activeEmergency?.id) return;
    try {
      const updated = await updateEmergencyUrgency(activeEmergency.id, targetLevel);
      onSelectEmergency(updated);
    } catch (err) {
      console.error('Failed to update urgency level:', err);
    }
  };

  const isCritical = activeEmergency?.emergency_level === 'Critical';

  return (
    <div 
      id="section-triage"
      className={`rounded-2xl border p-4 lg:p-5 shadow-sm flex flex-col gap-4 transition-all ${
        isCritical ? 'border-rose-500/60 ring-2 ring-rose-500/20' : ''
      }`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: isCritical ? undefined : 'var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between border-b pb-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <div 
            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isCritical ? 'bg-rose-500/20 border-rose-500/40 text-rose-500 animate-pulse' : ''
            }`}
            style={{
              backgroundColor: !isCritical ? 'rgba(225, 29, 72, 0.12)' : undefined,
              borderColor: !isCritical ? 'rgba(225, 29, 72, 0.3)' : undefined,
              color: !isCritical ? 'var(--accent-primary)' : undefined,
            }}
          >
            {isCritical ? <Flame className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h2 
              className="text-sm lg:text-base font-bold tracking-wide flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Emergency Coordinator
              {isCritical && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                  CRITICAL
                </span>
              )}
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Broadcast emergency blood requirements to compatible donor network
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:opacity-90 active:scale-[0.97]"
          style={{
            backgroundColor: showCreateForm ? 'var(--bg-surface)' : 'var(--accent-primary)',
            color: showCreateForm ? 'var(--text-secondary)' : '#ffffff',
            border: showCreateForm ? '1px solid var(--border-subtle)' : 'none',
          }}
          aria-label={showCreateForm ? 'Cancel form' : 'Open new emergency form'}
        >
          {showCreateForm ? (
            <>Cancel</>
          ) : (
            <>
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Request</span>
            </>
          )}
        </button>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)}</span>
        </div>
      )}

      {/* Mode A: New Emergency Form */}
      {showCreateForm ? (
        <form onSubmit={handleCreateEmergency} className="flex flex-col gap-3.5 animate-fadeIn">
          
          {/* Blood Group & Units */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Droplet className="w-3.5 h-3.5 text-rose-500" />
                Required Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Units Needed (1 - 10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={unitsNeeded}
                onChange={(e) => setUnitsNeeded(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                required
              />
            </div>
          </div>

          {/* Urgency Level Selector with Plain English Meaning */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Urgency Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { level: 'Routine', dot: '🟢', desc: 'Normal planning', color: 'sky' },
                { level: 'Urgent', dot: '🟠', desc: 'Needs attention soon', color: 'amber' },
                { level: 'Critical', dot: '🔴', desc: 'Immediate emergency', color: 'red' },
              ].map(({ level, dot, desc }) => {
                const isSelected = emergencyLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEmergencyLevel(level)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer active:scale-[0.97] ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-sm'
                        : 'hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-surface)' : 'var(--bg-input)',
                      borderColor: isSelected ? 'var(--accent-secondary)' : 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                        <span>{dot}</span>
                        <span>{level}</span>
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />}
                    </div>
                    <span className="text-[10px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hospital Preset */}
          <div>
            <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              Receiving Hospital
            </label>
            <select
              value={selectedHospitalIndex}
              onChange={(e) => handleHospitalChange(Number(e.target.value))}
              className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {HOSPITAL_PRESETS.map((hosp, idx) => (
                <option key={hosp.name} value={idx}>
                  {hosp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Patient Details & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <User className="w-3 h-3" />
                Patient Name
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full border rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                placeholder="Patient identifier"
              />
            </div>

            <div>
              <label className="block text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                Clinical Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                placeholder="e.g. Acute surgical standby"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 mt-1 px-4 rounded-xl text-white font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.97] cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Broadcasting Request...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Broadcast Emergency & Find Matches</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* Mode B: Active Emergency Overview & Quick Urgency Switcher */
        <div className="flex flex-col gap-3">
          
          {/* Selector & Quick Demo Button */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Active Emergency Case
            </span>

            <div className="flex items-center gap-2">
              {/* Quick Demo Scenario Trigger */}
              <button
                type="button"
                onClick={handleTriggerDemoScenario}
                disabled={isSubmitting}
                className="h-7 px-2 text-[10px] font-bold rounded-lg border flex items-center gap-1 cursor-pointer transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--accent-primary)',
                }}
                title="Trigger Victoria Hospital O+ Emergency Demo Scenario"
              >
                <Sparkles className="w-3 h-3" />
                <span>Demo: Victoria Hospital (O+)</span>
              </button>

              <button 
                onClick={fetchEmergenciesList} 
                className="h-7 px-2 hover:opacity-80 text-[10px] flex items-center gap-1 cursor-pointer transition-colors border rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
                title="Refresh emergencies list"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingExisting ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Existing Emergency Selector */}
          {existingEmergencies.length > 0 ? (
            <div className="relative">
              <select
                value={activeEmergency?.id || ''}
                onChange={(e) => {
                  const found = existingEmergencies.find((emg) => emg.id === e.target.value);
                  if (found) onSelectEmergency(found);
                }}
                className="w-full border rounded-xl px-3 py-2 text-xs font-semibold appearance-none focus:outline-none transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {existingEmergencies.map((emg) => (
                  <option key={emg.id} value={emg.id}>
                    [{emg.emergency_level.toUpperCase()}] {emg.required_blood_group} • {emg.hospital_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          ) : (
            <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
              No active emergency found. Create a request above.
            </p>
          )}

          {/* Active Case Card */}
          {activeEmergency && (
            <div 
              className={`rounded-xl p-3.5 border flex flex-col gap-2.5 transition-colors ${
                isCritical ? 'border-rose-500/50 bg-rose-500/5' : ''
              }`}
              style={{
                backgroundColor: !isCritical ? 'var(--bg-surface)' : undefined,
                borderColor: !isCritical ? 'var(--border-subtle)' : undefined,
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {activeEmergency.patient_name || 'Emergency Patient'}
                    </span>
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-black"
                      style={{
                        backgroundColor: 'rgba(225, 29, 72, 0.15)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {activeEmergency.required_blood_group}
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      {activeEmergency.units_needed || 1} Unit(s)
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>{activeEmergency.hospital_name}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Urgency
                  </span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                    activeEmergency.emergency_level === 'Critical'
                      ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                      : activeEmergency.emergency_level === 'Urgent'
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                      : 'bg-sky-500/20 text-sky-500 border border-sky-500/40'
                  }`}>
                    {activeEmergency.emergency_level}
                  </span>
                </div>
              </div>

              {/* Dynamic Urgency Escalation Buttons */}
              <div 
                className="pt-2 border-t"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span className="text-[10px] uppercase tracking-wider block mb-1.5 font-bold" style={{ color: 'var(--text-muted)' }}>
                  Switch Urgency Level:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { level: 'Routine', dot: '🟢' },
                    { level: 'Urgent', dot: '🟠' },
                    { level: 'Critical', dot: '🔴' },
                  ].map(({ level, dot }) => {
                    const isCurrent = activeEmergency.emergency_level?.toLowerCase() === level.toLowerCase();
                    return (
                      <button
                        key={level}
                        onClick={() => handleQuickUrgencySwitch(level)}
                        disabled={isCurrent || isRecalculating}
                        className={`h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-[0.97] ${
                          isCurrent
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'hover:opacity-80 border'
                        } disabled:cursor-default`}
                        style={{
                          backgroundColor: !isCurrent ? 'var(--bg-input)' : undefined,
                          borderColor: !isCurrent ? 'var(--border-subtle)' : undefined,
                          color: !isCurrent ? 'var(--text-secondary)' : '#ffffff',
                        }}
                      >
                        <span>{dot}</span>
                        <span>{level}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default EmergencyPanel;
