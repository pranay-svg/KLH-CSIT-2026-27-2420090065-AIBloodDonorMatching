import React, { useState } from 'react';
import { 
  Send, 
  X, 
  Copy, 
  Check, 
  MessageSquare, 
  Share2, 
  Building2, 
  ExternalLink,
  ShieldCheck,
  Radio,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { simulateDonorResponse } from '../services/api';

export const DispatchActionModal = ({
  isOpen = false,
  onClose,
  donor = null,
  emergency = null,
}) => {
  const [copiedKey, setCopiedKey] = useState(null);
  const [broadcastStatus, setBroadcastStatus] = useState('idle');
  const [broadcastMsg, setBroadcastMsg] = useState('');

  if (!isOpen || !donor) return null;

  const donorName = donor.donor_name || donor.name || 'Registered Donor';
  const bloodGroup = donor.donor_blood_group || donor.blood_group || emergency?.required_blood_group || 'O+';
  const hospitalName = emergency?.hospital_name || 'Emergency Trauma Center';
  const urgency = emergency?.emergency_level || 'Urgent';
  const unitsNeeded = emergency?.units_needed || 1;
  const emergencyId = emergency?.id || 'EMG-DEMO';
  const hospitalLat = emergency?.latitude || 12.9647;
  const hospitalLng = emergency?.longitude || 77.5746;

  // Templates using actual backend data
  const smsTemplate = `EMERGENCY BLOOD REQUEST:
Blood Group Needed: ${bloodGroup} (${unitsNeeded} units)
Urgency Level: ${urgency}
Hospital: ${hospitalName}
Case ID: ${emergencyId}
Dear ${donorName}, you have been identified as an optimal candidate. Please open the donor portal to accept or decline: http://localhost:5173`;

  const whatsappTemplate = `🚨 *EMERGENCY BLOOD DONATION REQUEST* 🚨

Hello *${donorName}*,
An urgent blood donation request has been broadcasted by *${hospitalName}*.

🩸 *Blood Group:* ${bloodGroup}
🏥 *Receiving Facility:* ${hospitalName}
⚡ *Urgency:* ${urgency}
📦 *Units Needed:* ${unitsNeeded} Unit(s)
📋 *Triage Ref:* ${emergencyId}

Please respond immediately through your secure donor portal:
🔗 http://localhost:5173

_Academic Blood Coordination Protocol — Medical team verifies biological cross-match on site._`;

  const hospitalLocationDetails = `Hospital: ${hospitalName}
Coordinates: ${hospitalLat}, ${hospitalLng}
Contact: ${emergency?.contact_person || 'Hospital Blood Bank Officer'}
Address: Bengaluru Metro Healthcare Zone`;

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 3000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleSimulatedBroadcast = async () => {
    const donorId = donor.donor_id || donor.id;
    if (!donorId) return;

    setBroadcastStatus('broadcasting');
    try {
      await simulateDonorResponse(donorId, {
        emergency_id: emergencyId,
        will_respond: true,
        estimated_eta_minutes: Math.round(donor.estimated_arrival_mins || 15),
      });
      setBroadcastStatus('sent');
      setBroadcastMsg(`Simulated response dispatched: ${donorName} confirmed dispatch (ETA ~${Math.round(donor.estimated_arrival_mins || 15)}m). Live WebSocket event DONOR_RESPONSE_RECEIVED emitted.`);
      setTimeout(() => setBroadcastStatus('idle'), 6000);
    } catch (err) {
      console.warn('Simulated broadcast fallback:', err);
      setBroadcastStatus('error');
      setBroadcastMsg(`Broadcast failed or backend offline (${err.response?.data?.detail || err.message || 'Error'}).`);
      setTimeout(() => setBroadcastStatus('idle'), 5000);
    }
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${hospitalLat},${hospitalLng}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispatch-modal-title"
    >
      <div 
        className="w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Modal Header */}
        <div 
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: 'rgba(225, 29, 72, 0.12)',
                borderColor: 'rgba(225, 29, 72, 0.3)',
                color: 'var(--accent-primary)',
              }}
            >
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 id="dispatch-modal-title" className="text-base font-bold tracking-tight flex items-center gap-2">
                Donor Dispatch Communication
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  Academic Demo
                </span>
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Generate copyable message templates or trigger simulated alert broadcasts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-slate-500/10 flex items-center justify-center transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close dispatch modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Target Donor Header Card */}
          <div 
            className="p-3.5 rounded-2xl border flex items-center justify-between"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{donorName}</span>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-black"
                  style={{
                    backgroundColor: 'rgba(225, 29, 72, 0.15)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  {bloodGroup}
                </span>
                {donor.rank && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Rank #{donor.rank}
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Target Hospital: <strong style={{ color: 'var(--text-primary)' }}>{hospitalName}</strong> • Distance: <strong style={{ color: 'var(--text-primary)' }}>{donor.distance_km ? `${donor.distance_km.toFixed(1)} km` : 'N/A'}</strong>
              </p>
            </div>

            <div className="text-right">
              <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                donor.is_available !== false
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}>
                {donor.is_available !== false ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>

          {/* Action 1: Send Simulated Alert Broadcast */}
          <div 
            className="rounded-2xl border p-4 space-y-2.5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-bold flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-primary)' }}>
                  <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                  Live Event Bus: Simulated Alert Broadcast
                </span>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  <span className="font-bold text-amber-500 mr-1">[SIMULATED]</span>
                  Dispatches <code className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">DONOR_RESPONSE_RECEIVED</code> to WebSocket
                </p>
              </div>

              <button
                onClick={handleSimulatedBroadcast}
                disabled={broadcastStatus === 'broadcasting'}
                className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.97]"
              >
                {broadcastStatus === 'broadcasting' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : broadcastStatus === 'sent' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Broadcast Sent!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Simulated Alert Broadcast</span>
                  </>
                )}
              </button>
            </div>

            {broadcastStatus === 'sent' && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{broadcastMsg}</span>
              </div>
            )}

            {broadcastStatus === 'error' && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{broadcastMsg}</span>
              </div>
            )}
          </div>

          {/* Action 2: Copy SMS Template */}
          <div 
            className="rounded-2xl border p-4 space-y-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <MessageSquare className="w-4 h-4 text-sky-500" />
                Copy SMS Template
              </span>
              <button
                onClick={() => copyToClipboard(smsTemplate, 'sms')}
                className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.97]"
              >
                {copiedKey === 'sms' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SMS</span>
                  </>
                )}
              </button>
            </div>
            <pre 
              className="p-3 rounded-xl border font-mono text-[11px] whitespace-pre-wrap"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {smsTemplate}
            </pre>
          </div>

          {/* Action 3: Copy WhatsApp Template */}
          <div 
            className="rounded-2xl border p-4 space-y-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <Share2 className="w-4 h-4 text-emerald-500" />
                Copy WhatsApp Template
              </span>
              <button
                onClick={() => copyToClipboard(whatsappTemplate, 'whatsapp')}
                className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.97]"
              >
                {copiedKey === 'whatsapp' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy WhatsApp</span>
                  </>
                )}
              </button>
            </div>
            <pre 
              className="p-3 rounded-xl border font-mono text-[11px] whitespace-pre-wrap max-h-28 overflow-y-auto"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {whatsappTemplate}
            </pre>
          </div>

          {/* Action 4: Hospital Navigation & Coordinates */}
          <div 
            className="rounded-2xl border p-4 space-y-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <Building2 className="w-4 h-4 text-amber-500" />
                Hospital Location & Navigation
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(hospitalLocationDetails, 'loc')}
                  className="h-8 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97]"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {copiedKey === 'loc' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Details</span>
                    </>
                  )}
                </button>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.97]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Maps</span>
                </a>
              </div>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Coordinates: <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{hospitalLat}, {hospitalLng}</span>
            </p>
          </div>

          {/* Academic Policy Notice */}
          <div 
            className="p-3 rounded-2xl border text-[11px] flex items-start gap-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              <strong>Academic Demonstration Protocol:</strong> Live automated SMS gateways are disabled to prevent paid third-party API dependencies. Dispatch coordinators copy generated templates or trigger simulated live WebSocket events above.
            </span>
          </div>

        </div>

        {/* Modal Footer */}
        <div 
          className="px-5 py-3 border-t flex items-center justify-end"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl font-bold cursor-pointer transition-colors border shadow-sm active:scale-[0.97] text-xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default DispatchActionModal;
