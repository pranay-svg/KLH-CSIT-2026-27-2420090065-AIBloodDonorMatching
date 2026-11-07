import React, { useState } from 'react';
import { 
  Radio, 
  Trash2, 
  Clock, 
  UserX, 
  MapPin, 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  Activity
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export const LiveActivityPanel = () => {
  const { events, clearEvents, wsStatus } = useWebSocket();
  const [filterCategory, setFilterCategory] = useState('all');

  const getEventBadge = (event) => {
    switch (event.type) {
      case 'EMERGENCY_URGENCY_CHANGED':
        return {
          icon: <Flame className="w-3.5 h-3.5 text-rose-600" />,
          bgColor: 'bg-rose-50 border-rose-200 text-rose-800',
          label: 'Escalation',
        };
      case 'DONOR_STATUS_CHANGED':
        return {
          icon: <UserX className="w-3.5 h-3.5 text-amber-600" />,
          bgColor: 'bg-amber-50 border-amber-200 text-amber-800',
          label: 'Status',
        };
      case 'DONOR_LOCATION_CHANGED':
        return {
          icon: <MapPin className="w-3.5 h-3.5 text-sky-600" />,
          bgColor: 'bg-sky-50 border-sky-200 text-sky-800',
          label: 'Mobility',
        };
      case 'MATCHING_RECALCULATED':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-indigo-600" />,
          bgColor: 'bg-indigo-50 border-indigo-200 text-indigo-800',
          label: 'Adaptation',
        };
      case 'DONOR_RESPONSE_RECEIVED':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          bgColor: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          label: 'Response',
        };
      default:
        return {
          icon: <Activity className="w-3.5 h-3.5 text-slate-500" />,
          bgColor: 'bg-slate-100 border-slate-300 text-slate-700',
          label: 'Event',
        };
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filterCategory === 'all') return true;
    return ev.category === filterCategory;
  });

  return (
    <div 
      id="section-activity"
      className="rounded-2xl border p-4 lg:p-5 shadow-xl flex flex-col gap-3 transition-colors"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Panel Header */}
      <div 
        className="flex items-center justify-between border-b pb-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{
              backgroundColor: 'rgba(225, 29, 72, 0.1)',
              borderColor: 'rgba(225, 29, 72, 0.3)',
              color: 'var(--accent-primary)',
            }}
          >
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 
              className="text-sm lg:text-base font-bold tracking-wide flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Real-Time Event Stream
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              WebSocket telemetry log • {events.length} events received
            </p>
          </div>
        </div>

        {/* Clear Events Action */}
        <button
          onClick={clearEvents}
          disabled={events.length === 0}
          className="p-1.5 rounded-lg border text-xs transition-all disabled:opacity-40 cursor-pointer hover:text-white"
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
          title="Clear event log"
          aria-label="Clear event log"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
        {[
          { id: 'all', label: 'All' },
          { id: 'matching', label: 'Adaptation' },
          { id: 'emergency', label: 'Escalation' },
          { id: 'donor', label: 'Donors' },
          { id: 'response', label: 'Responses' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterCategory(tab.id)}
            className={`px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap cursor-pointer border ${
              filterCategory === tab.id
                ? 'text-white shadow-sm'
                : 'hover:text-white'
            }`}
            style={{
              backgroundColor: filterCategory === tab.id ? 'var(--accent-primary)' : 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: filterCategory === tab.id ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events Stream Feed */}
      <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => {
            const badge = getEventBadge(event);
            return (
              <div
                key={event.id}
                className="rounded-xl p-3 border flex items-start gap-2.5 transition-all"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div 
                  className="p-1.5 rounded-lg border shrink-0 mt-0.5"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  {badge.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${badge.bgColor}`}>
                      {badge.label}
                    </span>
                    <span 
                      className="text-[10px] font-mono flex items-center gap-1 shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Clock className="w-3 h-3" />
                      {event.timestamp}
                    </span>
                  </div>

                  <p 
                    className="text-xs leading-relaxed font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {event.description}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>
            {wsStatus === 'connected' 
              ? 'Listening for real-time WebSocket adaptation events...' 
              : 'Waiting for WebSocket connection to establish...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveActivityPanel;
