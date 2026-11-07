import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  AlertTriangle, 
  BrainCircuit, 
  Radio, 
  HeartHandshake, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

const TOUR_STEPS = [
  {
    step: 1,
    badge: 'Step 1 of 4',
    title: 'Hospital Requests Blood',
    subtitle: 'Immediate broadcast with required blood group and urgency',
    icon: AlertTriangle,
    iconBg: 'rgba(225, 29, 72, 0.15)',
    iconColor: '#f43f5e',
    content: 'When an emergency occurs, hospital staff specify the patient blood group, required units, and urgency level (Routine, Urgent, or Critical). The request is broadcasted instantly across the secure healthcare network.',
    highlight: 'Takes less than 10 seconds to initiate an emergency broadcast.',
  },
  {
    step: 2,
    badge: 'Step 2 of 4',
    title: 'AI Finds Suitable Donors',
    subtitle: 'Multi-criteria matching evaluates compatibility, distance & response likelihood',
    icon: BrainCircuit,
    iconBg: 'rgba(99, 102, 241, 0.15)',
    iconColor: '#818cf8',
    content: 'The intelligent matching engine evaluates available registered donors based on biological blood compatibility, geographical proximity, estimated arrival time (ETA), and historical response likelihood.',
    highlight: 'Dynamically shifts weighting when emergencies are escalated to Critical.',
  },
  {
    step: 3,
    badge: 'Step 3 of 4',
    title: 'Watch Live Updates',
    subtitle: 'Real-time telemetry streams donor status and location shifts',
    icon: Radio,
    iconBg: 'rgba(16, 185, 129, 0.15)',
    iconColor: '#34d399',
    content: 'Hospital coordinators follow live updates via WebSocket event streaming. As donors update their availability or relocate across the Bengaluru metro area, rankings and ETAs recalculate in real time without page reloads.',
    highlight: 'Real-time bidirectional event synchronization keeps all dashboards aligned.',
  },
  {
    step: 4,
    badge: 'Step 4 of 4',
    title: 'Coordinate Donor Response',
    subtitle: 'Donors accept dispatches and hospital staff confirm coordination',
    icon: HeartHandshake,
    iconBg: 'rgba(14, 165, 233, 0.15)',
    iconColor: '#38bdf8',
    content: 'Matched donors receive prompt notifications on their dedicated portal. Once a donor accepts dispatch, the hospital command room receives instant confirmation with arrival estimates for clinical preparation.',
    highlight: 'Medical personnel always verify biological cross-match before clinical transfusion.',
  },
];

export const GuideTourModal = ({ isOpen = false, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Keyboard accessibility (Esc to close, Arrow keys to navigate)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep((s) => s + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep((s) => s - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, onClose]);

  if (!isOpen) return null;

  const current = TOUR_STEPS[currentStep];
  const IconComponent = current.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
    >
      <div 
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-slideUp"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header Bar */}
        <div 
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Platform Quick Tour
            </span>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-slate-500/10 flex items-center justify-center transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 flex flex-col gap-5">
          
          {/* Top Step Pill & Icon */}
          <div className="flex items-center justify-between">
            <span 
              className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border"
              style={{
                backgroundColor: current.iconBg,
                borderColor: current.iconColor,
                color: current.iconColor,
              }}
            >
              {current.badge}
            </span>

            {/* Step Dots Indicator */}
            <div className="flex items-center gap-1.5" aria-label={`Step ${currentStep + 1} of ${TOUR_STEPS.length}`}>
              {TOUR_STEPS.map((step, idx) => (
                <button
                  key={step.step}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStep 
                      ? 'w-6 bg-rose-500' 
                      : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                  style={{
                    backgroundColor: idx === currentStep ? 'var(--accent-primary)' : undefined,
                  }}
                  title={`Go to Step ${idx + 1}`}
                  aria-label={`Go to Step ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Hero Icon & Title */}
          <div className="flex items-start gap-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md border"
              style={{
                backgroundColor: current.iconBg,
                borderColor: current.iconColor,
                color: current.iconColor,
              }}
            >
              <IconComponent className="w-7 h-7" />
            </div>

            <div className="min-w-0">
              <h3 
                id="tour-modal-title"
                className="text-lg font-black tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {current.title}
              </h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {current.subtitle}
              </p>
            </div>
          </div>

          {/* Body Description */}
          <p 
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {current.content}
          </p>

          {/* Highlight Box */}
          <div 
            className="p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{current.highlight}</span>
          </div>

        </div>

        {/* Footer Controls */}
        <div 
          className="px-6 py-4 border-t flex items-center justify-between"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <button
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className="h-9 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:opacity-90 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          {isLast ? (
            <button
              onClick={onClose}
              className="h-9 px-5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:opacity-90 active:scale-[0.97]"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <span>Get Started</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep((s) => Math.min(TOUR_STEPS.length - 1, s + 1))}
              className="h-9 px-4 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:opacity-90 active:scale-[0.97]"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default GuideTourModal;
