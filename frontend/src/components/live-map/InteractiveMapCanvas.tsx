import React, { useState, useRef } from 'react';
import { LiveMapRoute, RouteRiskZone, NearbySafePlace, RouteSamplingPoint } from '../../types';
import {
  Plus,
  Minus,
  Navigation2,
  Layers,
  AlertTriangle,
  ShieldAlert,
  Waves,
  MapPin,
  X,
  Info,
  ExternalLink,
  Compass,
  Thermometer,
  Wind,
  CloudRain,
  Coffee
} from '../Icons';
import { LeafletMapView, LeafletMapHandle } from './LeafletMapView';

interface InteractiveMapCanvasProps {
  routes: LiveMapRoute[];
  activeRouteId: string;
  onSelectRoute: (routeId: string) => void;
  destinationName: string;
  originName: string;
  isNavigating: boolean;
  vehicleProgress: number; // 0 to 100
  showNearbyPlaces: boolean;
  onToggleNearbyPlaces?: () => void;
  nearbyPlaces: NearbySafePlace[];
  selectedNearbyPlace: NearbySafePlace | null;
  onSelectNearbyPlace: (place: NearbySafePlace | null) => void;
  showRadarOverlay: boolean;
  onToggleRadar: () => void;
  weatherLayerType?: 'rain' | 'temp' | 'rainfall' | 'wind' | 'alerts' | 'none';
  onChangeWeatherLayer?: (layer: 'rain' | 'temp' | 'rainfall' | 'wind' | 'alerts' | 'none') => void;
  onMapClick?: (lat: number, lon: number) => void;
  onRoutePointClick?: (point: RouteSamplingPoint) => void;
  originCoords?: [number, number];
  destinationCoords?: [number, number];
  gpsCoords?: [number, number] | null;
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
  onToggleNearbyPlaces,
  nearbyPlaces,
  selectedNearbyPlace,
  onSelectNearbyPlace,
  showRadarOverlay,
  onToggleRadar,
  weatherLayerType = 'rain',
  onChangeWeatherLayer,
  onMapClick,
  onRoutePointClick,
  originCoords,
  destinationCoords,
  gpsCoords
}) => {
  // Tile mode: 'streets' (Carto Voyager / OpenStreetMap), 'satellite' (ArcGIS), 'dark' (Carto Dark)
  const [tileMode, setTileMode] = useState<'streets' | 'satellite' | 'dark'>('streets');
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [selectedRiskZone, setSelectedRiskZone] = useState<RouteRiskZone | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapHandleRef = useRef<LeafletMapHandle>(null);

  const safeRoutes = Array.isArray(routes) ? routes : [];
  const activeRoute = safeRoutes.find((r) => r.id === activeRouteId) || safeRoutes[0];

  const currentLat = gpsCoords ? gpsCoords[0] : originCoords ? originCoords[0] : 28.472;
  const currentLon = gpsCoords ? gpsCoords[1] : originCoords ? originCoords[1] : 77.125;
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${currentLat},${currentLon}`;

  const handleZoomIn = () => {
    mapHandleRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapHandleRef.current?.zoomOut();
  };

  const handleRecenter = () => {
    mapHandleRef.current?.recenter(currentLat, currentLon);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-slate-900">
      {/* Real Leaflet Map Provider (Primary Map Interface) */}
      <LeafletMapView
        ref={mapHandleRef}
        routes={safeRoutes}
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
        tileLayerType={tileMode}
        weatherLayerType={weatherLayerType}
        onMapClick={onMapClick}
        onRoutePointClick={onRoutePointClick}
        originCoords={originCoords}
        destinationCoords={destinationCoords}
        gpsCoords={gpsCoords}
      />

      {/* Floating Route Options Quick Switcher Bar on Map */}
      {!isNavigating && safeRoutes.length > 1 && (
        <div className="absolute top-3 left-3 right-16 z-30 pointer-events-auto flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5">
          {safeRoutes.map((route) => {
            const isSelected = route.id === activeRouteId;
            const isSafest = route.id === 'route-safest' || route.routeOptionType === 'safest';
            const isFastest = route.id === 'route-fastest' || route.routeOptionType === 'fastest';
            const isScenic = route.id === 'route-scenic' || route.routeOptionType === 'scenic';

            return (
              <button
                key={route.id}
                onClick={() => onSelectRoute(route.id)}
                className={`shrink-0 flex items-center space-x-2 px-3 py-1.5 rounded-2xl backdrop-blur-md transition cursor-pointer border shadow-lg ${
                  isSelected
                    ? 'bg-slate-900/95 text-white ring-2 shadow-xl scale-[1.02]'
                    : 'bg-slate-900/80 hover:bg-slate-850 text-slate-300 border-slate-700/80 hover:border-slate-600'
                }`}
                style={{
                  borderColor: isSelected ? route.strokeColor || '#38bdf8' : undefined,
                  boxShadow: isSelected ? `0 0 14px ${(route.strokeColor || '#38bdf8')}50` : undefined
                }}
              >
                <span className="text-sm">
                  {isSafest ? '🟢' : isFastest ? '⚡' : isScenic ? '🌿' : '🚗'}
                </span>

                <div className="text-left leading-tight">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-black">
                      {isSafest ? 'Safest' : isFastest ? 'Fastest' : isScenic ? 'Scenic' : route.name.split(' ')[0]}
                    </span>
                    <span className="text-[11px] font-bold text-slate-200">
                      {route.durationMinutes}m
                    </span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded-xs ${
                        route.safetyScore >= 80
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {route.safetyScore}
                    </span>
                  </div>

                  <div className="text-[9.5px] font-medium text-slate-400 truncate max-w-[150px]">
                    {route.weatherImpactBadge || route.weatherImpactLabel || route.summaryCondition}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Floating Map Controls Toolbar (Zoom, Recenter, Layers, Street View, Radar, Safe Places) */}
      <div className="absolute top-20 right-3 z-30 flex flex-col items-center space-y-2 pointer-events-auto">
        {/* Layer Mode Toggle Button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white backdrop-blur-md shadow-lg border border-slate-700 flex items-center justify-center transition cursor-pointer"
            title="Switch Map Tiles & Weather Overlays"
          >
            <Layers className="w-4 h-4 text-sky-400" />
          </button>

          {showLayerMenu && (
            <div className="absolute right-12 top-0 w-52 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-2.5 shadow-2xl border border-slate-700 text-xs z-50 animate-in zoom-in-95">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-2 block mb-1">
                Base Map Style
              </span>
              <button
                onClick={() => {
                  setTileMode('streets');
                  setShowLayerMenu(false);
                }}
                className={`w-full text-left p-1.5 rounded-xl transition cursor-pointer flex items-center justify-between ${
                  tileMode === 'streets' ? 'bg-blue-600 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>🗺️ Street Map</span>
                {tileMode === 'streets' && <span>✓</span>}
              </button>
              <button
                onClick={() => {
                  setTileMode('satellite');
                  setShowLayerMenu(false);
                }}
                className={`w-full text-left p-1.5 rounded-xl transition cursor-pointer flex items-center justify-between ${
                  tileMode === 'satellite' ? 'bg-blue-600 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>🛰️ Satellite Layer</span>
                {tileMode === 'satellite' && <span>✓</span>}
              </button>
              <button
                onClick={() => {
                  setTileMode('dark');
                  setShowLayerMenu(false);
                }}
                className={`w-full text-left p-1.5 rounded-xl transition cursor-pointer flex items-center justify-between ${
                  tileMode === 'dark' ? 'bg-blue-600 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>🌙 Dark Map Layer</span>
                {tileMode === 'dark' && <span>✓</span>}
              </button>

              {onChangeWeatherLayer && (
                <>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-2 block mt-2 mb-1 pt-1.5 border-t border-slate-800">
                    Weather Intelligence Layers
                  </span>
                  <button
                    onClick={() => {
                      onChangeWeatherLayer('rain');
                      if (!showRadarOverlay) onToggleRadar();
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-xl transition cursor-pointer flex items-center justify-between ${
                      weatherLayerType === 'rain' ? 'bg-sky-600 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>🌧️ Weather Radar</span>
                    {weatherLayerType === 'rain' && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      onChangeWeatherLayer('rainfall');
                      if (!showRadarOverlay) onToggleRadar();
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-xl transition cursor-pointer flex items-center justify-between ${
                      weatherLayerType === 'rainfall' ? 'bg-sky-600 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>💧 Rainfall Intensity</span>
                    {weatherLayerType === 'rainfall' && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      onChangeWeatherLayer('temp');
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-xl transition cursor-pointer flex items-center justify-between ${
                      weatherLayerType === 'temp' ? 'bg-sky-600 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>🌡️ Temperature</span>
                    {weatherLayerType === 'temp' && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      onChangeWeatherLayer('wind');
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-xl transition cursor-pointer flex items-center justify-between ${
                      weatherLayerType === 'wind' ? 'bg-sky-600 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>💨 Wind Vectors</span>
                    {weatherLayerType === 'wind' && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      onChangeWeatherLayer('alerts');
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-xl transition cursor-pointer flex items-center justify-between ${
                      weatherLayerType === 'alerts' ? 'bg-rose-600 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>⚠️ Weather Alert Layer</span>
                    {weatherLayerType === 'alerts' && <span>✓</span>}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Recenter Route Button */}
        <button
          onClick={() => mapHandleRef.current?.recenterRoute()}
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white backdrop-blur-md shadow-lg border border-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95"
          title="Fit Entire Route to Screen"
        >
          <Compass className="w-4 h-4 text-sky-400" />
        </button>

        {/* Current Location Button */}
        <button
          onClick={handleRecenter}
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white backdrop-blur-md shadow-lg border border-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95"
          title="Center on Current Location"
        >
          <Navigation2 className="w-4 h-4 text-emerald-400 transform -rotate-45" />
        </button>

        {/* Zoom In Button */}
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white backdrop-blur-md shadow-lg border border-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95"
          title="Zoom In"
        >
          <Plus className="w-4 h-4 text-slate-200" />
        </button>

        {/* Zoom Out Button */}
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white backdrop-blur-md shadow-lg border border-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4 text-slate-200" />
        </button>

        {/* Rain Radar Quick Button */}
        <button
          onClick={onToggleRadar}
          className={`w-10 h-10 rounded-xl backdrop-blur-md shadow-lg border flex items-center justify-center transition cursor-pointer ${
            showRadarOverlay
              ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/30'
              : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-white'
          }`}
          title={showRadarOverlay ? 'Rain Radar Active' : 'Enable Rain Radar'}
        >
          <CloudRain className="w-4 h-4" />
        </button>

        {/* Nearby Safe Places Quick Button */}
        {onToggleNearbyPlaces && (
          <button
            onClick={onToggleNearbyPlaces}
            className={`w-10 h-10 rounded-xl backdrop-blur-md shadow-lg border flex items-center justify-center transition cursor-pointer ${
              showNearbyPlaces
                ? 'bg-amber-600 text-white border-amber-400 shadow-amber-500/30'
                : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-amber-400'
            }`}
            title="Toggle Nearby Safe Places (Cafes, Shelters, Fuel, Hospitals)"
          >
            <Coffee className="w-4 h-4" />
          </button>
        )}

        {/* Street View External Link */}
        <a
          href={streetViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white backdrop-blur-md shadow-lg border border-slate-700 flex items-center justify-center transition cursor-pointer"
          title="Open Google Street View Panorama"
        >
          <Compass className="w-4 h-4 text-amber-400" />
        </a>
      </div>

      {/* Weather Risk Zone Detail Popup (When tapped) */}
      {selectedRiskZone && (
        <div className="absolute top-20 left-4 right-4 z-40 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-red-500/40 animate-in fade-in zoom-in-95 duration-150 max-w-sm mx-auto">
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
            <span className="text-sky-400">WeatherGPT Monitored Zone</span>
          </div>
        </div>
      )}

      {/* Selected Nearby Place Detail Popup */}
      {selectedNearbyPlace && (
        <div className="absolute top-20 left-4 right-4 z-40 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-blue-500/40 animate-in fade-in zoom-in-95 duration-150 max-w-sm mx-auto">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center space-x-1.5 mb-0.5">
                <span className="text-xs font-black text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded-md border border-sky-500/30">
                  {selectedNearbyPlace.categoryLabel || 'Shelter'}
                </span>
                <span className="text-xs font-bold text-amber-400">
                  ⭐ {selectedNearbyPlace.rating} ({selectedNearbyPlace.reviews})
                </span>
              </div>
              <h4 className="text-sm font-black text-white">
                {selectedNearbyPlace.name}
              </h4>
            </div>
            <button
              onClick={() => onSelectNearbyPlace(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mb-2">
            📍 {selectedNearbyPlace.address}
          </p>
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium mb-3">
            🛡️ {selectedNearbyPlace.shelterFeature}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold">
              🚶 {selectedNearbyPlace.distanceMeters}m ({selectedNearbyPlace.walkingMinutes} min walk)
            </span>
            <span className="font-bold text-emerald-400">{selectedNearbyPlace.openStatus}</span>
          </div>
        </div>
      )}

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-auto bg-slate-900/90 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-slate-700 text-[10px] text-slate-300 flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Safest Route</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Fastest</span>
        </div>
        {weatherLayerType !== 'none' && (
          <div className="flex items-center space-x-1 text-sky-400">
            <span>
              {weatherLayerType === 'rain'
                ? '🌧️ Radar Active'
                : weatherLayerType === 'rainfall'
                ? '💧 Rainfall Active'
                : weatherLayerType === 'temp'
                ? '🌡️ Temp Active'
                : weatherLayerType === 'wind'
                ? '💨 Wind Active'
                : '⚠️ Alerts Active'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
