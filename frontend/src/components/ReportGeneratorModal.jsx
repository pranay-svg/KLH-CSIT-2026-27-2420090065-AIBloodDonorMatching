import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  X
} from 'lucide-react';

export const ReportGeneratorModal = ({
  isOpen = false,
  onClose,
  activeEmergency = null,
  rankedDonors = [],
}) => {
  const [copied, setCopied] = useState(false);
  const reportRef = useRef(null);

  if (!isOpen) return null;

  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const emergencyId = activeEmergency?.id || 'EMG-DEMO';
  const bloodGroup = activeEmergency?.required_blood_group || 'O+';
  const unitsNeeded = activeEmergency?.units_needed || 1;
  const urgency = activeEmergency?.emergency_level || 'Urgent';
  const hospital = activeEmergency?.hospital_name || 'Emergency Medical Center';
  const patient = activeEmergency?.patient_name || 'Emergency Patient';
  const contact = activeEmergency?.contact_person || 'Blood Bank Director';

  // Format plain-text report for clipboard copy
  const generatePlainTextReport = () => {
    let report = `================================================================================
EMERGENCY DONOR MATCHING & DISPATCH REPORT
================================================================================
Generated: ${timestamp}
System: AI-Adaptive Blood Donor Matching System
Status: Triage Completed via Multi-Criteria Decision Making (MCDM)

--------------------------------------------------------------------------------
1. EMERGENCY REQUEST SPECIFICATION
--------------------------------------------------------------------------------
Emergency ID         : ${emergencyId}
Patient Identifier   : ${patient}
Receiving Facility   : ${hospital}
Required Blood Group : ${bloodGroup}
Units Requested      : ${unitsNeeded} Unit(s)
Triage Urgency Level : ${urgency}
Hospital Contact     : ${contact}

--------------------------------------------------------------------------------
2. RANKED DONOR CANDIDATES (BACKEND OPTIMIZATION RESULTS)
--------------------------------------------------------------------------------
Rank | Candidate Name        | Blood Group | Priority | Compat | Distance  | Pred Resp | ETA
--------------------------------------------------------------------------------\n`;

    if (rankedDonors && rankedDonors.length > 0) {
      rankedDonors.forEach((d) => {
        const rankStr = String(d.rank || '-').padEnd(4);
        const nameStr = String(d.donor_name || 'Donor').padEnd(21).substring(0, 21);
        const bgStr = String(d.donor_blood_group || bloodGroup).padEnd(11);
        const prioStr = `${(d.priority_score * 100).toFixed(1)}%`.padEnd(8);
        const compStr = `${(d.compatibility_score * 100).toFixed(0)}%`.padEnd(6);
        const distStr = `${d.distance_km?.toFixed(1) || '0.0'} km`.padEnd(9);
        const respStr = `${(d.response_probability * 100).toFixed(1)}%`.padEnd(9);
        const etaStr = d.estimated_arrival_mins ? `~${Math.round(d.estimated_arrival_mins)}m` : 'N/A';

        report += `${rankStr} | ${nameStr} | ${bgStr} | ${prioStr} | ${compStr} | ${distStr} | ${respStr} | ${etaStr}\n`;
      });
    } else {
      report += `No candidate donors evaluated.\n`;
    }

    report += `--------------------------------------------------------------------------------
3. ACADEMIC ADAPTIVE DECISION NOTICE
--------------------------------------------------------------------------------
Optimization model: Multi-Criteria Decision Making (MCDM) + ML response prediction.
Priorities adapt dynamically based on urgency level (${urgency}).

DISCLAIMER:
Academic donor coordination report. Final clinical and transfusion
decisions must be made by authorized medical and blood-bank personnel.
================================================================================\n`;

    return report;
  };

  const handleCopy = async () => {
    const text = generatePlainTextReport();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div 
        className="w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header with Action Toolbar */}
        <div 
          className="px-5 py-4 border-b flex items-center justify-between no-print"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: 'rgba(225, 29, 72, 0.15)',
                borderColor: 'rgba(225, 29, 72, 0.35)',
                color: 'var(--accent-primary)',
              }}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="report-modal-title" className="text-base font-bold tracking-tight">
                Emergency Donor Matching & Dispatch Report
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Certified academic coordination summary for clinical oversight
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="h-8 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.97]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied Text</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Report</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.97]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-slate-500/10 flex items-center justify-center transition-colors cursor-pointer ml-1"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Close report modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Report Canvas */}
        <div 
          ref={reportRef} 
          className="p-6 overflow-y-auto space-y-6 flex-1 text-xs printable-report bg-white text-slate-900 font-sans"
        >
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-rose-700">
                AI-Adaptive Blood Donor Matching Platform
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                Emergency Donor Matching & Dispatch Report
              </h1>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Hospital Command Center • Multi-Criteria Triage Dispatch Log
              </div>
            </div>

            <div className="text-right font-mono text-[11px] text-slate-600">
              <div><strong>Generated:</strong> {timestamp}</div>
              <div><strong>Case Ref:</strong> {emergencyId}</div>
            </div>
          </div>

          {/* Emergency Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Receiving Facility</span>
              <strong className="text-slate-900 text-xs block truncate">{hospital}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Required Blood Group</span>
              <strong className="text-rose-700 text-base font-black">{bloodGroup}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Units Needed</span>
              <strong className="text-slate-900 text-xs">{unitsNeeded} Unit(s)</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Urgency Level</span>
              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
                urgency === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {urgency}
              </span>
            </div>
          </div>

          {/* Ranked Candidates Table */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 mb-2">
              Evaluated Candidate Donors (MCDM Triage Ranking)
            </h3>
            
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                  <tr>
                    <th className="py-2 px-3">Rank</th>
                    <th className="py-2 px-3">Candidate Donor</th>
                    <th className="py-2 px-3">Blood Type</th>
                    <th className="py-2 px-3">Priority Score</th>
                    <th className="py-2 px-3">Compatibility</th>
                    <th className="py-2 px-3">Distance</th>
                    <th className="py-2 px-3">Predicted Response</th>
                    <th className="py-2 px-3">Estimated ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rankedDonors.map((donor) => (
                    <tr 
                      key={donor.donor_id}
                      className={donor.rank === 1 ? 'bg-amber-50/60 font-medium' : ''}
                    >
                      <td className="py-2 px-3 font-bold text-slate-900">
                        #{donor.rank} {donor.rank === 1 && '⭐'}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-950">
                        {donor.donor_name}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-rose-700">
                        {donor.donor_blood_group}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-700">
                        {(donor.priority_score * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 px-3">
                        {(donor.compatibility_score * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 px-3">
                        {donor.distance_km !== undefined ? `${donor.distance_km.toFixed(1)} km` : 'N/A'}
                      </td>
                      <td className="py-2 px-3">
                        {(donor.response_probability * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 px-3">
                        {donor.estimated_arrival_mins ? `~${Math.round(donor.estimated_arrival_mins)} mins` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic Disclaimer & Signature Block */}
          <div className="pt-4 border-t-2 border-slate-300 space-y-3">
            <div className="p-3 rounded-lg bg-slate-100 border border-slate-300 text-[11px] text-slate-700 leading-relaxed">
              <strong>Academic Disclaimer:</strong> Academic donor coordination report. Final clinical and transfusion decisions must be made by authorized medical and blood-bank personnel. Biological cross-matching and safety testing are mandatory prior to clinical administration.
            </div>

            <div className="grid grid-cols-2 pt-4 gap-8 text-[11px] text-slate-600">
              <div className="border-t border-slate-400 pt-1">
                Authorized Blood Bank Triage Officer (Signature & Timestamp)
              </div>
              <div className="border-t border-slate-400 pt-1">
                Receiving Hospital Chief Resident / Ward Physician
              </div>
            </div>
          </div>

        </div>

        {/* Modal Bottom Bar */}
        <div 
          className="px-5 py-3 border-t flex items-center justify-end no-print"
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

export default ReportGeneratorModal;
