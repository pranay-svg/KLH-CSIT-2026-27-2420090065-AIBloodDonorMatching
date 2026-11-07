import React, { useState } from 'react';
import { 
  X, 
  Sliders, 
  UserX, 
  Navigation, 
  Flame, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Sparkles
} from 'lucide-react';
import { 
  updateDonorStatus, 
  updateDonorLocation, 
  updateEmergencyUrgency, 
  simulateDonorResponse, 
  resetSeedDonors 
} from '../services/api';

export const SimulationModal = ({
  isOpen = false,
  onClose,
  activeEmergency = null,
  rankedDonors = [],
  allDonors = [],
  onRefreshData,
}) => {
  const [selectedDonorId, setSelectedDonorId] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ text: '', type: 'info' });

  if (!isOpen) return null;

  // Candidate donors pool (defaults to #1 donor if available)
  const donorPool = rankedDonors.length > 0 ? rankedDonors : allDonors;
  const currentDonorId = selectedDonorId || donorPool[0]?.donor_id || donorPool[0]?.id || '';
  const currentDonor = donorPool.find((d) => (d.donor_id || d.id) === currentDonorId) || donorPool[0];

  const showFeedback = (text, type = 'info') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage({ text: '', type: 'info' });
    }, 4000);
  };

  // 1. Donor Goes Offline / Online Toggle
  const handleToggleDonorStatus = async (targetAvailable = false) => {
    if (!currentDonor) {
      showFeedback('No donor selected to modify.', 'error');
      return;
    }
    setIsExecuting(true);
    try {
      const donorId = currentDonor.donor_id || currentDonor.id;
      await updateDonorStatus(donorId, { is_available: targetAvailable });
      showFeedback(
        `Donor ${currentDonor.donor_name || currentDonor.name} set to ${targetAvailable ? 'AVAILABLE' : 'OFFLINE'}. Backend recalculated and broadcasted events!`,
        'success'
      );
      if (onRefreshData) onRefreshData();
    } catch (err) {
      showFeedback(`Failed to update status: ${err.message}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  // 2. Donor Moves Coordinates
  const handleDonorMoves = async () => {
    if (!currentDonor) {
      showFeedback('No donor selected.', 'error');
      return;
    }
    setIsExecuting(true);
    try {
      const donorId = currentDonor.donor_id || currentDonor.id;
      // Shift coordinates slightly closer to central hospital (~0.015 deg shift)
      const currentLat = currentDonor.latitude || 12.9716;
      const currentLng = currentDonor.longitude || 77.5946;
      const newLat = Number((currentLat + (Math.random() - 0.5) * 0.02).toFixed(4));
      const newLng = Number((currentLng + (Math.random() - 0.5) * 0.02).toFixed(4));

      await updateDonorLocation(donorId, {
        latitude: newLat,
        longitude: newLng,
        address: `Relocated Coordinate Dispatch [${newLat}, ${newLng}]`,
      });

      showFeedback(
        `Donor moved to [${newLat}, ${newLng}]. Backend recalculated travel time & updated MCDM priority!`,
        'success'
      );
      if (onRefreshData) onRefreshData();
    } catch (err) {
      showFeedback(`Failed to update coordinates: ${err.message}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  // 3. Urgency Escalation (Routine / Urgent / Critical)
  const handleEscalateUrgency = async (targetLevel) => {
    if (!activeEmergency?.id) {
      showFeedback('No active emergency available to escalate. Please create or select one.', 'error');
      return;
    }
    setIsExecuting(true);
    try {
      await updateEmergencyUrgency(activeEmergency.id, targetLevel);
      showFeedback(
        `Emergency urgency escalated to ${targetLevel}! Backend adaptive weights adjusted instantly.`,
        'success'
      );
      if (onRefreshData) onRefreshData();
    } catch (err) {
      showFeedback(`Failed to update urgency: ${err.message}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  // 4. Simulate Donor Response (Accepted / Declined)
  const handleSimulateResponse = async (responseType = 'ACCEPTED') => {
    if (!currentDonor) {
      showFeedback('No donor selected.', 'error');
      return;
    }
    if (!activeEmergency?.id) {
      showFeedback('No active emergency selected for response simulation.', 'error');
      return;
    }
    setIsExecuting(true);
    try {
      const donorId = currentDonor.donor_id || currentDonor.id;
      const eta = responseType === 'ACCEPTED' ? 14.5 : null;
      await simulateDonorResponse(donorId, {
        emergency_id: activeEmergency.id,
        response: responseType,
        eta_mins: eta,
      });

      showFeedback(
        `Simulated donor response '${responseType}' logged & broadcast over WebSocket!`,
        'success'
      );
    } catch (err) {
      showFeedback(`Failed to record response: ${err.message}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  // 5. Reset Seed Data
  const handleResetDemoState = async () => {
    setIsExecuting(true);
    try {
      await resetSeedDonors();
      showFeedback('Donor database successfully reset to 20 benchmark records!', 'success');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      showFeedback(`Failed to reset seed donors: ${err.message}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        
        {/* Modal Header */}
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                Adaptive Scenario Simulator
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 border border-indigo-500/30">
                  Demo Tool
                </span>
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Trigger real-time backend state changes to demonstrate instant reactive adaptation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-slate-500/10 flex items-center justify-center transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close simulation modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          
          {/* Feedback Message */}
          {feedbackMessage.text && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedbackMessage.type === 'success' 
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-700' 
                : feedbackMessage.type === 'error'
                ? 'bg-rose-50 border border-rose-300 text-rose-700'
                : 'bg-indigo-50 border border-indigo-300 text-indigo-700'
            }`}>
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{feedbackMessage.text}</span>
            </div>
          )}

          {/* Target Donor Selector */}
          <div 
            className="rounded-xl p-3 border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Select Target Donor for Simulation:
            </label>
            <select
              value={currentDonorId}
              onChange={(e) => setSelectedDonorId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {donorPool.map((d) => {
                const id = d.donor_id || d.id;
                const name = d.donor_name || d.name;
                const bg = d.donor_blood_group || d.blood_group;
                const isAvail = d.is_available ? 'Available' : 'Offline';
                const rankText = d.rank ? `[Rank #${d.rank}] ` : '';
                return (
                  <option key={id} value={id}>
                    {rankText}{name} ({bg}) • {isAvail} ({id})
                  </option>
                );
              })}
            </select>
            {currentDonor && (
              <div className="flex items-center gap-3 text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                <span>Status: <strong className={currentDonor.is_available ? 'text-emerald-600' : 'text-rose-600'}>{currentDonor.is_available ? 'Available' : 'Offline'}</strong></span>
                <span>Coordinates: [{Number(currentDonor.latitude).toFixed(4)}, {Number(currentDonor.longitude).toFixed(4)}]</span>
              </div>
            )}
          </div>

          {/* Action Grid: 5 University Demonstration Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Action 1: Donor Goes Offline */}
            <div 
              className="p-3.5 rounded-xl border flex flex-col justify-between gap-2.5"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <UserX className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>1. Donor Goes Offline</h4>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Toggles availability to false. Triggers dynamic re-ranking without page reload.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleDonorStatus(false)}
                  disabled={isExecuting || !currentDonor?.is_available}
                  className="flex-1 h-8 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-semibold disabled:opacity-40 cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  Make Offline
                </button>
                <button
                  onClick={() => handleToggleDonorStatus(true)}
                  disabled={isExecuting || currentDonor?.is_available}
                  className="h-8 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs font-semibold disabled:opacity-40 cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  Restore
                </button>
              </div>
            </div>

            {/* Action 2: Donor Moves Coordinates */}
            <div 
              className="p-3.5 rounded-xl border flex flex-col justify-between gap-2.5"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Navigation className="w-4 h-4 text-sky-500" />
                  <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>2. Donor Moves Coordinates</h4>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Updates GPS position. Live map marker shifts in place; ETA & distance re-evaluated.
                </p>
              </div>
              <button
                onClick={handleDonorMoves}
                disabled={isExecuting}
                className="w-full h-8 px-3 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 text-xs font-semibold disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Simulate Donor Movement</span>
              </button>
            </div>

            {/* Action 3 & 4: Urgency Escalation */}
            <div 
              className="p-3.5 rounded-xl border flex flex-col justify-between gap-2.5"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-red-500" />
                  <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>3 & 4. Escalate Emergency</h4>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Critical triage boosts distance weight to 50% for fastest transit arrival.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleEscalateUrgency('Urgent')}
                  disabled={isExecuting || activeEmergency?.emergency_level === 'Urgent'}
                  className="h-8 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold disabled:opacity-40 cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center"
                >
                  To Urgent (35%)
                </button>
                <button
                  onClick={() => handleEscalateUrgency('Critical')}
                  disabled={isExecuting || activeEmergency?.emergency_level === 'Critical'}
                  className="h-8 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold disabled:opacity-40 cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center"
                >
                  To Critical (50%)
                </button>
              </div>
            </div>

            {/* Action 5: Simulate Donor Response */}
            <div 
              className="p-3.5 rounded-xl border flex flex-col justify-between gap-2.5"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>5. Simulate Donor Response</h4>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Emits real-time dispatch acknowledgment alert over WebSocket.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSimulateResponse('ACCEPTED')}
                  disabled={isExecuting}
                  className="h-8 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accept (14m)</span>
                </button>
                <button
                  onClick={() => handleSimulateResponse('DECLINED')}
                  disabled={isExecuting}
                  className="h-8 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Decline</span>
                </button>
              </div>
            </div>

          </div>

          {/* Reset Action for Demonstration */}
          <div 
            className="pt-3 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Need to restart benchmark from scratch?
            </span>
            <button
              onClick={handleResetDemoState}
              disabled={isExecuting}
              className="h-8 px-3 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset 20 Synthetic Donors</span>
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div 
          className="p-4 border-t flex justify-end"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg font-bold text-xs transition-all cursor-pointer border shadow-sm active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            Close Simulator
          </button>
        </div>

      </div>
    </div>
  );
};

export default SimulationModal;
