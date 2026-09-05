import React, { useState, useRef, useEffect } from 'react';
import { LiveMapRoute, RouteRiskZone, NearbySafePlace } from '../../types';
import { Plus, Minus, Navigation2, Layers, AlertTriangle, ShieldAlert, Waves, MapPin, X, Info } from '../Icons';
import { LeafletMapView } from './LeafletMapView';

interface InteractiveMapCanvasProps {
  routes: LiveMapRoute[];
  activeRouteId: string;
  onSelectRoute: (routeId: string) => void;
  destinationName: string;
  originName: string;
  isNavigating: boolean;
  vehicleProgress: number; // 0 to 100
  showNearbyPlaces: boolean;
  nearbyPlaces: NearbySafePlace[];
  selectedNearbyPlace: NearbySafePlace | null;
  onSelectNearbyPlace: (place: NearbySafePlace | null) => void;
  showRadarOverlay: boolean;
  onToggleRadar: () => void;
}

export const InteractiveMapCanvas: React.FC<InteractiveMapCanvasProps> = ({
  routes,
  activeRouteId,
  onSelectRoute,
  destinationName,
  originName,
  isNavigating,
  vehicleProgress,
  showNearbyPlaces,
  nearbyPlaces,
  selectedNearbyPlace,
  onSelectNearbyPlace,
  showRadarOverlay,
  onToggleRadar
}) => {
  // Map mode: Real Streets (Leaflet) / Satellite (Leaflet) / Radar Vector HUD
  const [mapMode, setMapMode] = useState<'streets' | 'satellite' | 'vector'>('streets');
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  // Pan and zoom state for vector HUD mode
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedRiskZone, setSelectedRiskZone] = useState<RouteRiskZone | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const activeRoute = routes.find((r) => r.id === activeRouteId) || routes[0];

  // Calculate current vehicle coordinate along the active route
  const getVehicleCoordinates = () => {
    if (!activeRoute || !activeRoute.pathPoints || activeRoute.pathPoints.length === 0) {
      return { x: 26, y: 24, angle: 45 };
    }
    const pts = activeRoute.pathPoints;
    const totalSegments = pts.length - 1;
    const progressFrac = Math.min(0.999, Math.max(0, vehicleProgress / 100));
    const segmentIndex = Math.min(totalSegments - 1, Math.floor(progressFrac * totalSegments));
    const localFrac = (progressFrac * totalSegments) - segmentIndex;

    const pA = pts[segmentIndex];
    const pB = pts[segmentIndex + 1];

    const currentX = pA.x + (pB.x - pA.x) * localFrac;
    const currentY = pA.y + (pB.y - pA.y) * localFrac;

    // Heading angle in degrees
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

    return { x: currentX, y: currentY, angle };
  };

  const vehiclePos = getVehicleCoordinates();

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch pan handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Convert route points to SVG path string
  const pointsToSvgPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    const d = points.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x * 10} ${pt.y * 10}` : `${acc} L ${pt.x * 10} ${pt.y * 10}`;
    }, '');
    return d;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-slate-900"
      onMouseDown={mapMode === 'vector' ? handleMouseDown : undefined}
      onMouseMove={mapMode === 'vector' ? handleMouseMove : undefined}
      onMouseUp={mapMode === 'vector' ? handleMouseUp : undefined}
      onMouseLeave={mapMode === 'vector' ? handleMouseUp : undefined}
      onTouchStart={mapMode === 'vector' ? handleTouchStart : undefined}
      onTouchMove={mapMode === 'vector' ? handleTouchMove : undefined}
      onTouchEnd={mapMode === 'vector' ? handleTouchEnd : undefined}
    >
      {/* Real Geographic Leaflet Map Layer (Streets / Satellite) */}
      {mapMode !== 'vector' && (
        <LeafletMapView
          routes={routes}
          activeRouteId={activeRouteId}
          onSelectRoute={onSelectRoute}
          destinationName={destinationName}
          originName={originName}
          isNavigating={isNavigating}
          vehicleProgress={vehicleProgress}
          showNearbyPlaces={showNearbyPlaces}
          nearbyPlaces={nearbyPlaces}
          selectedNearbyPlace={selectedNearbyPlace}
          onSelectNearbyPlace={onSelectNearbyPlace}
          showRadarOverlay={showRadarOverlay}
          onSelectRiskZone={setSelectedRiskZone}
          tileLayerType={mapMode}
        />
      )}

      {/* Vector HUD Map Layer */}
      {mapMode === 'vector' && (
        <div
          className="w-full h-full transition-transform duration-75 origin-center cursor-grab active:cursor-grabbing"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          }}
        >
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full min-w-[700px] min-h-[700px] block"
          style={{ transformOrigin: '50% 50%' }}
        >
          <defs>
            {/* Background Map Grids and Textures */}
            <pattern id="street-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <rect width="80" height="80" fill="#0f172a" />
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#1e293b" strokeWidth="1.2" strokeOpacity="0.8" />
              <path d="M 40 0 L 40 80 M 0 40 L 80 40" fill="none" stroke="#1e293b" strokeWidth="0.6" strokeOpacity="0.5" />
            </pattern>

            {/* Radar Gradient Pulse */}
            <radialGradient id="radar-cell-1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="radar-cell-2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>

            {/* Glow filters for active route */}
            <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Street Grid */}
          <rect width="1000" height="1000" fill="url(#street-grid)" />

          {/* City Geographic Zones: Parks / Open Greens */}
          <path
            d="M 100 120 C 180 100, 240 180, 210 260 C 180 320, 90 280, 80 200 Z"
            fill="#064e3b"
            fillOpacity="0.35"
            stroke="#047857"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          <text x="140" y="200" fill="#34d399" fontSize="13" opacity="0.6" fontWeight="bold">
            Aravalli Ridge Biodiversity Reserve
          </text>

          <path
            d="M 680 150 C 760 120, 880 180, 840 280 C 800 360, 690 320, 660 220 Z"
            fill="#064e3b"
            fillOpacity="0.35"
            stroke="#047857"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          <text x="710" y="230" fill="#34d399" fontSize="13" opacity="0.6" fontWeight="bold">
            Leisure Valley Green
          </text>

          {/* Water Bodies / Drainage Canals */}
          <path
            d="M 50 780 Q 250 720, 480 750 T 950 820"
            fill="none"
            stroke="#0284c7"
            strokeWidth="16"
            strokeOpacity="0.45"
            strokeLinecap="round"
          />
          <text x="440" y="740" fill="#38bdf8" fontSize="13" opacity="0.7" fontWeight="bold">
            South Basin Storm Canal
          </text>

          {/* Major Expressways & Arterial Avenues */}
          <g stroke="#334155" strokeLinecap="round" strokeLinejoin="round">
            {/* National Highway 48 */}
            <path d="M 120 80 L 880 540" strokeWidth="18" stroke="#1e293b" />
            <path d="M 120 80 L 880 540" strokeWidth="10" stroke="#475569" strokeDasharray="18 8" />
            <text x="350" y="220" fill="#94a3b8" fontSize="12" fontWeight="bold" transform="rotate(32 350 220)">
              NH-48 Expressway
            </text>

            {/* Golf Course Ext Road */}
            <path d="M 220 380 L 920 860" strokeWidth="14" stroke="#334155" />
            <text x="480" y="580" fill="#94a3b8" fontSize="12" fontWeight="bold" transform="rotate(34 480 580)">
              Golf Course Extension Rd
            </text>

            {/* Cross Arterials */}
            <path d="M 380 120 L 320 820" strokeWidth="10" stroke="#334155" />
            <path d="M 640 160 L 600 880" strokeWidth="10" stroke="#334155" />
            <path d="M 150 480 L 880 320" strokeWidth="8" stroke="#334155" />
          </g>

          {/* Live Doppler Radar Cloud Overlay (Animated) */}
          {showRadarOverlay && (
            <g className="animate-pulse" style={{ animationDuration: '4s' }}>
              {/* Rain Cell 1 (Intense storm cell near avoid route) */}
              <circle cx="440" cy="620" r="140" fill="url(#radar-cell-1)" />
              <circle cx="560" cy="560" r="110" fill="url(#radar-cell-1)" />
              {/* Rain Cell 2 (Lighter drizzle cluster) */}
              <circle cx="280" cy="460" r="90" fill="url(#radar-cell-2)" />
              <circle cx="720" cy="440" r="100" fill="url(#radar-cell-2)" />

              <text x="400" y="600" fill="#f87171" fontSize="14" fontWeight="800" letterSpacing="1">
                🌧️ DOPPLER RAIN BAND (18-24 mm/h)
              </text>
            </g>
          )}

          {/* Inactive Routes (Rendered behind active route) */}
          {routes
            .filter((r) => r.id !== activeRouteId)
            .map((route) => {
              const d = pointsToSvgPath(route.pathPoints);
              return (
                <g
                  key={route.id}
                  onClick={() => onSelectRoute(route.id)}
                  className="cursor-pointer group"
                >
                  {/* Clickable Hit Area */}
                  <path d={d} fill="none" stroke="transparent" strokeWidth="32" strokeLinecap="round" />
                  {/* Route Line */}
                  <path
                    d={d}
                    fill="none"
                    stroke={route.strokeColor}
                    strokeWidth="7"
                    strokeOpacity="0.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all group-hover:stroke-opacity-80"
                  />
                  {/* Route Label badge along path */}
                  {route.pathPoints[1] && (
                    <g transform={`translate(${route.pathPoints[1].x * 10}, ${route.pathPoints[1].y * 10 - 15})`}>
                      <rect
                        x="-45"
                        y="-12"
                        width="90"
                        height="24"
                        rx="12"
                        fill="#0f172a"
                        stroke={route.strokeColor}
                        strokeWidth="1.5"
                        opacity="0.85"
                      />
                      <text x="0" y="4" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">
                        {route.durationMinutes}m • {route.safetyScore}/100
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

          {/* Active Selected Route (Rendered on top with glow and directional dashes) */}
          {activeRoute && (
            <g filter="url(#route-glow)">
              {/* Outer stroke glow */}
              <path
                d={pointsToSvgPath(activeRoute.pathPoints)}
                fill="none"
                stroke={activeRoute.strokeColor}
                strokeWidth="12"
                strokeOpacity="0.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Solid Base Path */}
              <path
                d={pointsToSvgPath(activeRoute.pathPoints)}
                fill="none"
                stroke={activeRoute.strokeColor}
                strokeWidth="7"
                strokeOpacity="0.95"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Moving Direction Chevrons / Dashes */}
              <path
                d={pointsToSvgPath(activeRoute.pathPoints)}
                fill="none"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeDasharray="10 16"
                strokeLinecap="round"
                className="animate-pulse"
              />
            </g>
          )}

          {/* Weather Risk Zone Badges directly on routes */}
          {activeRoute?.riskZones?.map((zone) => (
            <g
              key={zone.id}
              transform={`translate(${zone.coords.x * 10}, ${zone.coords.y * 10})`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRiskZone(zone);
              }}
              className="cursor-pointer hover:scale-110 transition-transform"
            >
              {/* Pulse Ring */}
              <circle
                r="18"
                fill={zone.severity === 'Severe' ? '#ef4444' : '#f59e0b'}
                fillOpacity="0.25"
                className="animate-ping"
              />
              {/* Zone Marker Pill */}
              <rect
                x="-36"
                y="-15"
                width="72"
                height="30"
                rx="15"
                fill="#0f172a"
                stroke={zone.severity === 'Severe' ? '#ef4444' : '#f59e0b'}
                strokeWidth="2"
              />
              <text x="-24" y="5" fontSize="14">
                {zone.icon}
              </text>
              <text
                x="6"
                y="4"
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                {zone.type === 'waterlogging' ? 'Flood' : zone.type === 'rain' ? 'Rain' : 'Storm'}
              </text>
            </g>
          ))}

          {/* Nearby Safe Places Pins (Cafes, Restaurants, Stores, Petrol) */}
          {showNearbyPlaces &&
            nearbyPlaces.map((place) => (
              <g
                key={place.id}
                transform={`translate(${place.coords.x * 10}, ${place.coords.y * 10})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNearbyPlace(place);
                }}
                className="cursor-pointer hover:scale-125 transition-transform"
              >
                <circle r="14" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                <text x="0" y="4" fontSize="12" textAnchor="middle">
                  {place.category === 'cafe' && '☕'}
                  {place.category === 'restaurant' && '🍽️'}
                  {place.category === 'convenience' && '🏪'}
                  {place.category === 'hotel' && '🏨'}
                  {place.category === 'petrol' && '⛽'}
                  {place.category === 'hospital' && '🏥'}
                </text>
                <text x="0" y="24" fill="#93c5fd" fontSize="9" fontWeight="bold" textAnchor="middle">
                  {place.name.split(' ')[0]}
                </text>
              </g>
            ))}

          {/* Start Point Marker (Current Location) */}
          <g transform="translate(260, 240)">
            {/* GPS Pulse */}
            <circle r="22" fill="#3b82f6" fillOpacity="0.25" className="animate-ping" />
            <circle r="12" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
            <circle r="5" fill="#ffffff" />
            <g transform="translate(18, 4)">
              <rect x="-4" y="-12" width="130" height="22" rx="6" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" opacity="0.9" />
              <text x="4" y="2" fill="#ffffff" fontSize="10" fontWeight="bold">
                🟢 {originName || 'Current Location'}
              </text>
            </g>
          </g>

          {/* Destination Point Marker */}
          <g transform="translate(740, 780)">
            <circle r="24" fill="#ef4444" fillOpacity="0.2" className="animate-ping" />
            {/* Pin head */}
            <path
              d="M 0 -22 C -11 -22, -18 -14, -18 -4 C -18 10, 0 24, 0 24 C 0 24, 18 10, 18 -4 C 18 -14, 11 -22, 0 -22 Z"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <circle cx="0" cy="-6" r="6" fill="#ffffff" />
            <g transform="translate(24, 4)">
              <rect x="-4" y="-12" width="145" height="22" rx="6" fill="#0f172a" stroke="#ef4444" strokeWidth="1" opacity="0.95" />
              <text x="4" y="2" fill="#ffffff" fontSize="10" fontWeight="bold">
                📍 {destinationName}
              </text>
            </g>
          </g>

          {/* Vehicle Marker during Navigation */}
          {isNavigating && (
            <g
              transform={`translate(${vehiclePos.x * 10}, ${vehiclePos.y * 10}) rotate(${vehiclePos.angle})`}
              className="transition-all duration-300 ease-linear"
            >
              {/* Outer Orientation Radar Cone */}
              <path
                d="M 0 0 L -30 -60 A 60 60 0 0 1 30 -60 Z"
                fill="#38bdf8"
                fillOpacity="0.2"
              />
              {/* Vehicle Ring */}
              <circle r="14" fill="#0284c7" stroke="#ffffff" strokeWidth="3" shadow="0 0 10px #38bdf8" />
              {/* Vehicle Direction Pointer Arrow */}
              <path d="M 0 -8 L 6 6 L 0 3 L -6 6 Z" fill="#ffffff" />
            </g>
          )}
        </svg>
      </div>
      )}

      {/* Floating Map Controls (Top Right: Layer Switcher, Radar & Zoom) */}
      <div className="absolute top-20 right-3 z-30 flex flex-col space-y-2 pointer-events-auto">
        {/* Map Type / Layer Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className={`w-9 h-9 rounded-xl shadow-lg flex items-center justify-center transition cursor-pointer border ${
              showLayerMenu
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white'
            }`}
            title="Switch Map Layer (Streets / Satellite / Vector HUD)"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Layer Selection Dropdown */}
          {showLayerMenu && (
            <div className="absolute right-11 top-0 w-48 bg-slate-900 text-white rounded-2xl p-1.5 shadow-2xl border border-slate-700 text-xs z-50 animate-in zoom-in-95">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1 block">
                Map View
              </span>
              <button
                onClick={() => {
                  setMapMode('streets');
                  setShowLayerMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                  mapMode === 'streets' ? 'bg-blue-600 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>🗺️</span>
                <span>Real Streets</span>
              </button>
              <button
                onClick={() => {
                  setMapMode('satellite');
                  setShowLayerMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                  mapMode === 'satellite' ? 'bg-blue-600 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>🛰️</span>
                <span>Satellite View</span>
              </button>
              <button
                onClick={() => {
                  setMapMode('vector');
                  setShowLayerMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                  mapMode === 'vector' ? 'bg-blue-600 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>⚡</span>
                <span>Radar Vector HUD</span>
              </button>
            </div>
          )}
        </div>

        {/* Radar Overlay Toggle */}
        <button
          onClick={onToggleRadar}
          className={`w-9 h-9 rounded-xl shadow-lg flex items-center justify-center transition cursor-pointer border ${
            showRadarOverlay
              ? 'bg-sky-600 text-white border-sky-500 shadow-sky-500/30'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white'
          }`}
          title="Toggle Weather Radar Rain Overlay"
        >
          <span className="text-sm">🌧️</span>
        </button>

        {/* Zoom In (Vector Mode) */}
        {mapMode === 'vector' && (
          <>
            <button
              onClick={handleZoomIn}
              className="w-9 h-9 rounded-xl bg-white/90 hover:bg-white text-slate-700 shadow-lg border border-slate-200 flex items-center justify-center transition cursor-pointer"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              onClick={handleZoomOut}
              className="w-9 h-9 rounded-xl bg-white/90 hover:bg-white text-slate-700 shadow-lg border border-slate-200 flex items-center justify-center transition cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetView}
              className="w-9 h-9 rounded-xl bg-white/90 hover:bg-white text-blue-600 shadow-lg border border-slate-200 flex items-center justify-center transition cursor-pointer"
              title="Fit Route to Center"
            >
              <Navigation2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Weather Risk Zone Detail Popup (When tapped) */}
      {selectedRiskZone && (
        <div className="absolute top-20 left-4 right-4 z-30 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-red-500/40 animate-in fade-in zoom-in-95 duration-150 max-w-sm mx-auto">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xl">{selectedRiskZone.icon}</span>
              <div>
                <h4 className="text-xs font-extrabold text-white">
                  {selectedRiskZone.title}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {selectedRiskZone.locationName}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedRiskZone(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            {selectedRiskZone.description}
          </p>
          <div className="flex items-center justify-between text-[10px] font-bold pt-2 border-t border-slate-800">
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 uppercase">
              Severity: {selectedRiskZone.severity}
            </span>
            <span className="text-blue-400">WeatherGPT Monitored Zone</span>
          </div>
        </div>
      )}

      {/* Selected Nearby Place Popup */}
      {selectedNearbyPlace && (
        <div className="absolute top-20 left-4 right-4 z-30 bg-white text-slate-900 rounded-2xl p-4 shadow-2xl border border-blue-200 animate-in fade-in zoom-in-95 duration-150 max-w-sm mx-auto">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center space-x-1.5 mb-0.5">
                <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {selectedNearbyPlace.categoryLabel}
                </span>
                <span className="text-xs font-bold text-amber-500">
                  ⭐ {selectedNearbyPlace.rating} ({selectedNearbyPlace.reviews})
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">
                {selectedNearbyPlace.name}
              </h4>
            </div>
            <button
              onClick={() => onSelectNearbyPlace(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600 mb-2">
            📍 {selectedNearbyPlace.address}
          </p>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-medium mb-3">
            🛡️ {selectedNearbyPlace.shelterFeature}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold">
              🚶 {selectedNearbyPlace.distanceMeters}m ({selectedNearbyPlace.walkingMinutes} min walk)
            </span>
            <span className="font-bold text-emerald-600">{selectedNearbyPlace.openStatus}</span>
          </div>
        </div>
      )}

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-auto bg-slate-900/80 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-slate-700 text-[10px] text-slate-300 flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Safest</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Fastest</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Avoid</span>
        </div>
        {showRadarOverlay && (
          <div className="flex items-center space-x-1 text-sky-400">
            <span>🌧️ Radar Active</span>
          </div>
        )}
      </div>
    </div>
  );
};
