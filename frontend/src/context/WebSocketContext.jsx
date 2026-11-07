import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WebSocketContext = createContext(null);

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws';
const MAX_EVENTS_IN_LOG = 100;

export const WebSocketProvider = ({ children }) => {
  const [wsStatus, setWsStatus] = useState('connecting'); // 'connected' | 'connecting' | 'disconnected'
  const [events, setEvents] = useState([]);
  const [lastEvent, setLastEvent] = useState(null);
  const [latestMatchingUpdate, setLatestMatchingUpdate] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isComponentMounted = useRef(true);
  const listenersRef = useRef(new Set());

  // Format incoming raw events into user-friendly activity descriptions
  const formatEventForActivityLog = (data) => {
    const time = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    let description = '';
    let category = 'system'; // 'donor' | 'emergency' | 'matching' | 'response' | 'system'
    let level = 'info';

    switch (data.event_type) {
      case 'CONNECTED':
        description = data.message || 'Connected to Real-time Adaptation WebSocket stream.';
        category = 'system';
        break;

      case 'DONOR_STATUS_CHANGED':
        {
          const donorName = data.donor_name || `Donor (${data.donor_id})`;
          const changes = data.changes || {};
          if ('is_available' in changes) {
            description = changes.is_available
              ? `Donor ${donorName} is now AVAILABLE for dispatch.`
              : `Donor ${donorName} went OFFLINE / UNAVAILABLE.`;
            level = changes.is_available ? 'success' : 'warning';
          } else if ('is_eligible' in changes) {
            description = `Donor ${donorName} eligibility updated: ${changes.is_eligible ? 'Eligible' : 'Ineligible'}.`;
          } else {
            description = `Donor ${donorName} status attributes updated.`;
          }
          category = 'donor';
        }
        break;

      case 'DONOR_LOCATION_CHANGED':
        {
          const donorName = data.donor_name || `Donor (${data.donor_id})`;
          const lat = data.latitude !== undefined ? Number(data.latitude).toFixed(4) : '';
          const lng = data.longitude !== undefined ? Number(data.longitude).toFixed(4) : '';
          description = `Donor ${donorName} moved coordinates to [${lat}, ${lng}].`;
          category = 'donor';
          level = 'info';
        }
        break;

      case 'EMERGENCY_URGENCY_CHANGED':
        {
          const oldL = data.old_emergency_level || 'Previous';
          const newL = data.new_emergency_level || 'Updated';
          const hosp = data.hospital_name ? ` at ${data.hospital_name}` : '';
          description = `Emergency urgency escalated: ${oldL} → ${newL}${hosp}. Adaptation weights shifted.`;
          category = 'emergency';
          level = newL.toLowerCase() === 'critical' ? 'critical' : 'warning';
        }
        break;

      case 'DONOR_RESPONSE_RECEIVED':
        {
          const donorName = data.donor_name || `Donor (${data.donor_id})`;
          const resp = data.response || 'RESPONDED';
          const etaText = data.eta_mins ? ` (ETA ~${Math.round(data.eta_mins)} mins)` : '';
          description = `Donor ${donorName} responded: ${resp}${etaText}.`;
          category = 'response';
          level = resp === 'ACCEPTED' ? 'success' : 'warning';
        }
        break;

      case 'MATCHING_RECALCULATED':
        {
          const count = data.matched_donors_count ?? (data.ranked_matches?.length || 0);
          const topDonor = data.ranked_matches?.[0]?.donor_name || 'candidate';
          description = `Adaptive matching recalculated for ${data.emergency_level || 'active'} emergency. ${count} donors evaluated. Top candidate: ${topDonor}.`;
          category = 'matching';
          level = 'adaptation';
        }
        break;

      default:
        description = data.message || `Received event: ${data.event_type || 'NOTIFICATION'}`;
        break;
    }

    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: time,
      isoTimestamp: data.timestamp || new Date().toISOString(),
      type: data.event_type || 'UNKNOWN',
      category,
      level,
      description,
      raw: data,
    };
  };

  const connect = useCallback(() => {
    if (!isComponentMounted.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setWsStatus('connecting');

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isComponentMounted.current) return;
        setWsStatus('connected');
      };

      ws.onmessage = (messageEvent) => {
        if (!isComponentMounted.current) return;
        try {
          const parsed = JSON.parse(messageEvent.data);
          setLastEvent(parsed);

          // Handle MATCHING_RECALCULATED specifically
          if (parsed.event_type === 'MATCHING_RECALCULATED') {
            setLatestMatchingUpdate(parsed);
          }

          // Format and record into live activity events stream
          const logEntry = formatEventForActivityLog(parsed);
          setEvents((prev) => [logEntry, ...prev.slice(0, MAX_EVENTS_IN_LOG - 1)]);

          // Notify subscribed listeners
          listenersRef.current.forEach((listener) => {
            try {
              listener(parsed);
            } catch (err) {
              console.error('Error in WebSocket event listener:', err);
            }
          });
        } catch (err) {
          console.warn('Non-JSON WebSocket payload received:', messageEvent.data);
        }
      };

      ws.onerror = () => {
        if (!isComponentMounted.current) return;
        // Clean error handling - do not crash
        setWsStatus('disconnected');
      };

      ws.onclose = () => {
        if (!isComponentMounted.current) return;
        setWsStatus('disconnected');
        // Automatically attempt reconnection after 3 seconds
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 3000);
        }
      };
    } catch (e) {
      console.warn('Failed to establish WebSocket connection:', e);
      setWsStatus('disconnected');
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 3000);
      }
    }
  }, []);

  const addListener = useCallback((listenerFn) => {
    listenersRef.current.add(listenerFn);
    return () => {
      listenersRef.current.delete(listenerFn);
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('ping');
    }
  }, []);

  useEffect(() => {
    isComponentMounted.current = true;
    connect();

    return () => {
      isComponentMounted.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider
      value={{
        wsStatus,
        events,
        lastEvent,
        latestMatchingUpdate,
        clearEvents,
        addListener,
        sendPing,
        reconnect: connect,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
