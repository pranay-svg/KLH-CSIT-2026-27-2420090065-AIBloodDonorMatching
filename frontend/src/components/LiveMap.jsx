import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { 
  Info, 
  Maximize2, 
  Minimize2, 
  Compass
} from 'lucide-react';

/**
 * Computes points along a quadratic Bézier curve between start and end coordinates.
 * Generates an elegant, gentle arc between donor and hospital without sharp angles.
 */
const getCurvedPath = (start, end, curvature = 0.16, flip = false) => {
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);

  if (dist < 0.0001) {
    return [start, end];
  }

  // Midpoint between donor and hospital
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  // Perpendicular unit normal vector
  const normLat = -dLng / dist;
  const normLng = dLat / dist;

  // Curvature offset along the perpendicular vector
  const offset = dist * curvature * (flip ? -1 : 1);
  const ctrlLat = midLat + normLat * offset;
  const ctrlLng = midLng + normLng * offset;

  // Interpolate 24 smooth points along the quadratic Bézier arc
  const points = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const invT = 1 - t;
    const lat = invT * invT * lat1 + 2 * invT * t * ctrlLat + t * t * lat2;
    const lng = invT * invT * lng1 + 2 * invT * t * ctrlLng + t * t * lng2;
    points.push([lat, lng]);
  }
  return points;
};

export const LiveMap = ({
  hospital = null,
  rankedDonors = [],
  allDonors = [],
  selectedDonor = null,
  onSelectDonor,
  donorLocationUpdates = {}, // { donor_id: { latitude, longitude } }
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({}); // { [id]: L.Marker }
  const hospitalMarkerRef = useRef(null);
  const connectionLayersRef = useRef([]); // L.Polyline[] for visual coordination curves
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle Fullscreen Mode
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Recenter Map on Hospital & Donors with generous bounds padding so no marker is clipped
  const handleRecenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points = [];
    if (hospital && hospital.latitude && hospital.longitude) {
      points.push([hospital.latitude, hospital.longitude]);
    }

    const donorPool = rankedDonors.length > 0 ? rankedDonors : allDonors;
    donorPool.forEach((donor) => {
      const donorId = donor.donor_id || donor.id;
      const dynamicLoc = donorLocationUpdates[donorId];
      const lat = dynamicLoc ? dynamicLoc.latitude : donor.latitude;
      const lng = dynamicLoc ? dynamicLoc.longitude : donor.longitude;
      if (lat != null && lng != null) {
        points.push([lat, lng]);
      }
    });

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { 
        paddingTopLeft: [85, 85], 
        paddingBottomRight: [85, 85], 
        maxZoom: 14 
      });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.setView([12.9716, 77.5946], 12);
    }
  }, [hospital, rankedDonors, allDonors, donorLocationUpdates]);

  // Invalidate Leaflet size whenever container dimensions shift
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Window resize listener to keep map bounds sharp
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center: Bengaluru Metro
    const defaultCenter = [12.9716, 77.5946];
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    // Clinical Clean OpenStreetMap tile layer (reliable, no API key watermark)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      hospitalMarkerRef.current = null;
      markersRef.current = {};
      connectionLayersRef.current = [];
    };
  }, []);

  // Update Hospital Marker (Prominent Coordination Hub)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (hospital && hospital.latitude && hospital.longitude) {
      const hospitalPos = [hospital.latitude, hospital.longitude];
      const hospitalName = hospital.hospital_name || 'Emergency Trauma Center';

      const hospitalHtml = `
        <div class="hospital-hub-container">
          <div class="hospital-hub-circle" title="Hospital Coordination Hub">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 6v12m-6-6h12"/>
            </svg>
          </div>
          <div class="hospital-hub-label">
            <span style="color: #e11d48; font-size: 11px;">🏥</span>
            <span>${hospitalName}</span>
          </div>
        </div>
      `;

      const hospitalIcon = L.divIcon({
        className: 'leaflet-clean-marker',
        html: hospitalHtml,
        iconSize: [180, 68],
        iconAnchor: [90, 18],
      });

      if (hospitalMarkerRef.current) {
        hospitalMarkerRef.current.setLatLng(hospitalPos);
        hospitalMarkerRef.current.setIcon(hospitalIcon);
        if (!map.hasLayer(hospitalMarkerRef.current)) {
          hospitalMarkerRef.current.addTo(map);
        }
      } else {
        hospitalMarkerRef.current = L.marker(hospitalPos, { 
          icon: hospitalIcon, 
          zIndexOffset: 1500 
        }).addTo(map);
      }

      hospitalMarkerRef.current.bindPopup(`
        <div style="color: #0f172a; font-family: system-ui; min-width: 200px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
            <strong style="color: #e11d48; font-size: 13px; display: flex; align-items: center; gap: 4px;">
              🏥 Receiving Hospital
            </strong>
            <span style="background: #fee2e2; color: #dc2626; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 9999px;">
              ${hospital.emergency_level || 'Urgent'}
            </span>
          </div>
          <div style="font-weight: 700; font-size: 12px; color: #0f172a;">${hospitalName}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px; display: flex; align-items: center; justify-content: space-between;">
            <span>Required Blood:</span>
            <strong style="color: #e11d48; font-size: 12px;">${hospital.required_blood_group || 'O+'}</strong>
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px; display: flex; align-items: center; justify-content: space-between;">
            <span>Units Needed:</span>
            <strong>${hospital.units_needed || 1} units</strong>
          </div>
          <div style="margin-top: 6px; padding: 3px 6px; background: #f8fafc; border-radius: 6px; font-size: 10px; color: #64748b; font-family: monospace;">
            Coordination Target Lat/Lng: ${hospital.latitude.toFixed(4)}, ${hospital.longitude.toFixed(4)}
          </div>
        </div>
      `, {
        autoPanPadding: [75, 75],
      });
    }
  }, [hospital]);

  // Synchronize and Render Clean Circular Donor Nodes with "Donor (O-)" Labels
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const donorPool = rankedDonors.length > 0 ? rankedDonors : allDonors;
    const currentMarkerIds = new Set();

    donorPool.forEach((donor) => {
      const donorId = donor.donor_id || donor.id;
      if (!donorId) return;
      currentMarkerIds.add(donorId);

      const dynamicLoc = donorLocationUpdates[donorId];
      const lat = dynamicLoc ? dynamicLoc.latitude : donor.latitude;
      const lng = dynamicLoc ? dynamicLoc.longitude : donor.longitude;

      if (lat === undefined || lng === undefined || lat === null || lng === null) return;

      const isRanked = donor.rank !== undefined && donor.rank !== null;
      const isTopMatch = donor.rank === 1;
      const isAvailable = donor.is_available !== false;
      const isSelected = selectedDonor && (selectedDonor.donor_id === donorId || selectedDonor.id === donorId);
      const bloodGroup = donor.donor_blood_group || donor.blood_group || 'O-';

      // Clean circular node inner content
      let circleInner = '';
      if (isTopMatch && isAvailable) {
        circleInner = `<span style="font-size: 11px; font-weight: 900; letter-spacing: -0.5px;">⭐1</span>`;
      } else if (isRanked && isAvailable) {
        circleInner = `<span style="font-size: 11px; font-weight: 800;">#${donor.rank}</span>`;
      } else if (isAvailable) {
        circleInner = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
          </svg>
        `;
      } else {
        circleInner = `<span style="font-size: 11px; font-weight: 700; color: #cbd5e1;">✕</span>`;
      }

      // Clean label tag prefix: e.g. "#1 Donor (O-)" or "Donor (O-)"
      let rankPrefix = '';
      if (isTopMatch) {
        rankPrefix = `<span style="background: #fef3c7; color: #b45309; font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 4px; margin-right: 2px;">#1</span>`;
      } else if (isRanked && donor.rank <= 5) {
        rankPrefix = `<span style="background: #e0f2fe; color: #0369a1; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 4px; margin-right: 2px;">#${donor.rank}</span>`;
      }

      const statusSuffix = !isAvailable ? `<span style="font-size: 9px; color: #94a3b8; margin-left: 2px;">• Off</span>` : '';

      // Complete unclipped HTML structure: Circular Node + Attached Label Pill
      const markerHtml = `
        <div class="donor-node-container ${isTopMatch ? 'top-match' : ''} ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}">
          <div class="donor-circle-node">
            ${circleInner}
          </div>
          <div class="donor-node-label">
            ${rankPrefix}Donor <span class="donor-blood-tag">(${bloodGroup})</span>${statusSuffix}
          </div>
        </div>
      `;

      // Icon Dimensions: 140px width x 64px height.
      // Horizontal center = 70. Circle vertical center = 16.
      // Anchoring at [70, 16] perfectly places the circular node center at the coordinate.
      const customIcon = L.divIcon({
        className: 'leaflet-clean-marker',
        html: markerHtml,
        iconSize: [140, 64],
        iconAnchor: [70, 16],
      });

      // Z-Index hierarchy
      let zIndex = 200;
      if (isSelected) {
        zIndex = 1200;
      } else if (isTopMatch) {
        zIndex = 1000;
      } else if (isRanked) {
        zIndex = Math.max(800 - (donor.rank || 0) * 10, 300);
      } else if (!isAvailable) {
        zIndex = 80;
      }

      const popupContent = `
        <div style="color: #0f172a; font-family: system-ui; min-width: 195px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 5px;">
            <strong style="font-size: 13px; color: #0f172a;">${donor.donor_name || donor.name}</strong>
            <span style="background: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 9999px;">
              ${bloodGroup}
            </span>
          </div>
          ${donor.rank ? `<div style="color: #0284c7; font-weight: 700; font-size: 11px; margin-bottom: 3px;">MCDM Rank #${donor.rank} (${donor.match_tier || 'Candidate'})</div>` : ''}
          ${donor.distance_km !== undefined ? `
            <div style="font-size: 11px; color: #475569; display: flex; justify-content: space-between; margin-top: 2px;">
              <span>Distance:</span>
              <strong style="color: #0f172a;">${donor.distance_km.toFixed(1)} km</strong>
            </div>
          ` : ''}
          ${donor.estimated_arrival_mins !== undefined ? `
            <div style="font-size: 11px; color: #475569; display: flex; justify-content: space-between; margin-top: 2px;">
              <span>Estimated ETA:</span>
              <strong style="color: #0284c7;">~${Math.round(donor.estimated_arrival_mins)} mins</strong>
            </div>
          ` : ''}
          ${donor.response_probability !== undefined ? `
            <div style="font-size: 11px; color: #475569; display: flex; justify-content: space-between; margin-top: 2px;">
              <span>Predicted Response:</span>
              <strong style="color: #0d9488;">${(donor.response_probability * 100).toFixed(1)}%</strong>
            </div>
          ` : ''}
          ${donor.priority_score !== undefined ? `
            <div style="font-size: 11px; color: #475569; display: flex; justify-content: space-between; margin-top: 2px;">
              <span>Priority Score:</span>
              <strong>${(donor.priority_score * 100).toFixed(1)}%</strong>
            </div>
          ` : ''}
          <div style="margin-top: 6px; padding-top: 5px; border-top: 1px dashed #e2e8f0; font-size: 10px; color: ${isAvailable ? '#0d9488' : '#e11d48'}; font-weight: 600; display: flex; align-items: center; gap: 4px;">
            <span style="width: 6px; height: 6px; border-radius: 9999px; background: ${isAvailable ? '#0d9488' : '#e11d48'}; display: inline-block;"></span>
            ${isAvailable ? 'Available for Emergency Coordination' : 'Currently Inactive / Offline'}
          </div>
        </div>
      `;

      if (markersRef.current[donorId]) {
        const existingMarker = markersRef.current[donorId];
        existingMarker.setLatLng([lat, lng]);
        existingMarker.setIcon(customIcon);
        existingMarker.setZIndexOffset(zIndex);
        existingMarker.setPopupContent(popupContent);
        if (!map.hasLayer(existingMarker)) {
          existingMarker.addTo(map);
        }
      } else {
        const marker = L.marker([lat, lng], { 
          icon: customIcon, 
          zIndexOffset: zIndex 
        }).addTo(map);
        
        marker.bindPopup(popupContent, {
          autoPanPadding: [75, 75],
        });

        marker.on('click', () => {
          if (onSelectDonor) onSelectDonor(donor);
        });
        markersRef.current[donorId] = marker;
      }
    });

    // Cleanup decommissioned markers
    Object.keys(markersRef.current).forEach((existingId) => {
      if (!currentMarkerIds.has(existingId)) {
        map.removeLayer(markersRef.current[existingId]);
        delete markersRef.current[existingId];
      }
    });

    // Initial boundary fit when hospital and pool are loaded
    if (hospital && hospital.latitude && hospital.longitude) {
      const bounds = L.latLngBounds([hospital.latitude, hospital.longitude]);
      let validPoints = 1;

      donorPool.forEach((d) => {
        const dId = d.donor_id || d.id;
        const dLoc = donorLocationUpdates[dId];
        const lat = dLoc ? dLoc.latitude : d.latitude;
        const lng = dLoc ? dLoc.longitude : d.longitude;
        if (lat != null && lng != null) {
          bounds.extend([lat, lng]);
          validPoints++;
        }
      });

      if (validPoints > 1) {
        map.fitBounds(bounds, { 
          paddingTopLeft: [85, 85], 
          paddingBottomRight: [85, 85], 
          maxZoom: 14 
        });
      } else {
        map.setView([hospital.latitude, hospital.longitude], 13);
      }
    }
  }, [rankedDonors, allDonors, hospital, donorLocationUpdates, selectedDonor, onSelectDonor]);

  // Render Elegant Curved / Dashed Visual Connection Lines with Animated Real-Time Pulse
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous visual connection lines
    connectionLayersRef.current.forEach((layer) => {
      map.removeLayer(layer);
    });
    connectionLayersRef.current = [];

    if (!hospital || !hospital.latitude || !hospital.longitude) return;

    const hospPos = [hospital.latitude, hospital.longitude];
    const donorPool = rankedDonors.length > 0 ? rankedDonors : allDonors;
    
    // Connect available matched candidates (up to top 5 candidates)
    const candidatesToConnect = donorPool.filter((d) => d.is_available !== false).slice(0, 5);

    // Ensure selected donor is included in the connection mesh if selected
    if (selectedDonor) {
      const selectedId = selectedDonor.donor_id || selectedDonor.id;
      const exists = candidatesToConnect.some((d) => (d.donor_id || d.id) === selectedId);
      if (!exists) {
        candidatesToConnect.push(selectedDonor);
      }
    }

    candidatesToConnect.forEach((donor, idx) => {
      const donorId = donor.donor_id || donor.id;
      const dynamicLoc = donorLocationUpdates[donorId];
      const lat = dynamicLoc ? dynamicLoc.latitude : donor.latitude;
      const lng = dynamicLoc ? dynamicLoc.longitude : donor.longitude;

      if (lat == null || lng == null) return;

      const donorPos = [lat, lng];
      const isSelected = selectedDonor && (selectedDonor.donor_id === donorId || selectedDonor.id === donorId);
      
      // Calculate curved Bézier path from donor to hospital
      // Alternate curvature sign (flip) so multiple lines do not overlap
      const flip = idx % 2 === 1;
      const curvePoints = getCurvedPath(donorPos, hospPos, 0.15, flip);

      if (isSelected) {
        // Double-layer active line: soft ambient glow + vibrant animated coordination pulse
        const glowLine = L.polyline(curvePoints, {
          color: '#0284c7',
          weight: 6,
          opacity: 0.22,
          lineCap: 'round',
          interactive: false,
        }).addTo(map);

        const activeLine = L.polyline(curvePoints, {
          color: '#0284c7',
          weight: 2.75,
          dashArray: '6, 8',
          opacity: 0.95,
          className: 'connection-line-active-anim',
          interactive: false,
        }).addTo(map);

        connectionLayersRef.current.push(glowLine, activeLine);
      } else {
        // Subtle coordination mesh line for other candidate donors
        const subtleLine = L.polyline(curvePoints, {
          color: '#0284c7',
          weight: 1.5,
          dashArray: '5, 8',
          opacity: 0.38,
          className: 'connection-line-subtle-anim',
          interactive: false,
        }).addTo(map);

        connectionLayersRef.current.push(subtleLine);
      }
    });
  }, [hospital, rankedDonors, allDonors, selectedDonor, donorLocationUpdates]);

  // Pan smoothly to Selected Donor and open popup when selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedDonor) return;

    const donorId = selectedDonor.donor_id || selectedDonor.id;
    const marker = markersRef.current[donorId];
    if (marker) {
      const pos = marker.getLatLng();
      map.panTo(pos, { animate: true, duration: 0.6 });
      marker.openPopup();
    }
  }, [selectedDonor]);

  return (
    <div 
      id="section-map"
      className={`rounded-2xl border p-4 lg:p-5 shadow-xl flex flex-col gap-3 transition-all ${
        isFullscreen ? 'fixed inset-3 sm:inset-6 z-50 overflow-hidden' : ''
      }`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Map Header & Toolbar */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              borderColor: 'rgba(2, 132, 199, 0.25)',
              color: 'var(--accent-secondary)',
            }}
          >
            <Compass className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <h2 
              className="text-sm lg:text-base font-bold tracking-wide flex items-center gap-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Live Geospatial Dispatch Map
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Clinical clean visualization • Real-time coordination pulse
            </p>
          </div>
        </div>

        {/* Legend & Map Controls */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block shadow-sm" />
              Hospital Hub
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm" />
              #1 Top Match
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block shadow-sm" />
              Donor (O-)
            </span>
            <span className="inline-flex items-center gap-1.5 text-sky-600 font-medium">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-sky-500 inline-block" />
              Visual Link
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRecenter}
              className="h-8 px-2.5 rounded-xl border font-semibold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.97]"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
              title="Recenter Hospital & Donors"
              aria-label="Recenter Hospital & Donors"
            >
              <Compass className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Recenter</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="h-8 w-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
              aria-label={isFullscreen ? 'Exit Fullscreen Map' : 'Fullscreen Map'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div 
        ref={mapContainerRef} 
        className={`w-full rounded-xl overflow-hidden border z-10 ${
          isFullscreen ? 'flex-1 min-h-[420px]' : 'h-[360px] sm:h-[400px] lg:h-[440px]'
        }`}
        style={{ borderColor: 'var(--border-subtle)' }}
      />

      {/* Selected Donor Connection Badge & Notice */}
      <div 
        className="p-2.5 rounded-lg border text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="flex items-start sm:items-center gap-2">
          {selectedDonor ? (
            <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1 sm:mt-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-600"></span>
            </span>
          ) : (
            <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5 sm:mt-0" />
          )}

          <span>
            {selectedDonor ? (
              <>
                Active Connection: <strong style={{ color: 'var(--text-primary)' }}>{selectedDonor.donor_name || selectedDonor.name}</strong> 
                {' '}<span className="text-rose-600 font-bold">({selectedDonor.donor_blood_group || selectedDonor.blood_group})</span> • Distance: <strong style={{ color: 'var(--text-primary)' }}>{selectedDonor.distance_km?.toFixed(1) || '0.2'} km</strong> (ETA ~{Math.round(selectedDonor.estimated_arrival_mins || 5)}m)
                {selectedDonor.rank ? ` • MCDM Rank #${selectedDonor.rank}` : ''}.
              </>
            ) : (
              <>
                Coordination mesh active. Click any circular donor node on the map to inspect trajectory.
              </>
            )}
          </span>
        </div>

        <span 
          className="font-mono text-[10px] px-2 py-0.5 rounded border self-start sm:self-auto shrink-0"
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--accent-primary)',
          }}
        >
          Visual connection — not a navigation route.
        </span>
      </div>
    </div>
  );
};

export default LiveMap;
