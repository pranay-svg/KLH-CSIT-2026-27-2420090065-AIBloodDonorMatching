import React from 'react';
import { 
  AlertTriangle, 
  Trophy, 
  MapPin, 
  Radio, 
  Sparkles 
} from 'lucide-react';

export const MobileBottomNav = ({
  activeTab = 'triage',
  onSelectTab,
  onOpenCopilot,
}) => {
  const handleNavClick = (sectionId, tabKey) => {
    if (onSelectTab) {
      onSelectTab(tabKey);
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg border-t px-2 py-1.5 shadow-2xl"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* 1. Triage */}
        <button
          onClick={() => handleNavClick('section-triage', 'triage')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[58px] min-h-[44px] ${
            activeTab === 'triage'
              ? 'text-rose-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          style={{
            color: activeTab === 'triage' ? 'var(--accent-primary)' : 'var(--text-muted)',
          }}
          aria-label="Triage Section"
        >
          <AlertTriangle className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Triage</span>
        </button>

        {/* 2. Matches */}
        <button
          onClick={() => handleNavClick('section-matches', 'matches')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[58px] min-h-[44px] ${
            activeTab === 'matches'
              ? 'text-amber-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          style={{
            color: activeTab === 'matches' ? 'var(--accent-primary)' : 'var(--text-muted)',
          }}
          aria-label="Matches Section"
        >
          <Trophy className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Matches</span>
        </button>

        {/* 3. Live Map */}
        <button
          onClick={() => handleNavClick('section-map', 'map')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[58px] min-h-[44px] ${
            activeTab === 'map'
              ? 'text-sky-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          style={{
            color: activeTab === 'map' ? 'var(--accent-secondary)' : 'var(--text-muted)',
          }}
          aria-label="Live Map Section"
        >
          <MapPin className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Live Map</span>
        </button>

        {/* 4. Activity */}
        <button
          onClick={() => handleNavClick('section-activity', 'activity')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[58px] min-h-[44px] ${
            activeTab === 'activity'
              ? 'text-emerald-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          style={{
            color: activeTab === 'activity' ? 'var(--accent-primary)' : 'var(--text-muted)',
          }}
          aria-label="Activity Feed Section"
        >
          <Radio className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Activity</span>
        </button>

        {/* 5. AI Copilot */}
        <button
          onClick={onOpenCopilot}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer min-w-[58px] min-h-[44px]"
          style={{
            color: 'var(--accent-secondary)',
          }}
          aria-label="Open AI Matching Copilot"
        >
          <Sparkles className="w-4 h-4 mb-0.5 animate-pulse" />
          <span className="text-[10px] font-bold tracking-tight">Copilot</span>
        </button>

      </div>
    </nav>
  );
};

export default MobileBottomNav;
