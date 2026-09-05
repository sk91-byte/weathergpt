import React, { useState, useEffect, useMemo } from 'react';
import { WeatherData, LiveMapRoute, NearbySafePlace, DepartureTimeOption } from '../types';
import {
  DESTINATION_PRESETS,
  NEARBY_SAFE_PLACES,
  buildWeatherAwareRoutes,
  DestinationPreset
} from '../data/liveMapData';
import { SearchAndDestinations } from './live-map/SearchAndDestinations';
import { InteractiveMapCanvas } from './live-map/InteractiveMapCanvas';
import { RouteAnalysisLoading } from './live-map/RouteAnalysisLoading';
import { RouteComparisonDrawer } from './live-map/RouteComparisonDrawer';
import { NearbyPlacesDrawer } from './live-map/NearbyPlacesDrawer';
import { SmartWaitModeOverlay } from './live-map/SmartWaitModeOverlay';
import { LiveNavigationHUD } from './live-map/LiveNavigationHUD';
import { RouteWeatherTimelineModal } from './live-map/RouteWeatherTimelineModal';
import { ExplainableAIModal } from './live-map/ExplainableAIModal';
import {
  Navigation,
  Sparkles,
  MapPin,
  Clock,
  Layers,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Info
} from './Icons';

interface WeatherMapScreenProps {
  initialLayer?: string;
  onSelectCity: (cityName: string) => void;
  onBackToHome: () => void;
  onUseLiveLocation?: () => void;
  isLocating?: boolean;
  currentWeather?: WeatherData;
}

export const WeatherMapScreen: React.FC<WeatherMapScreenProps> = ({
  initialLayer = 'rain',
  onSelectCity,
  onBackToHome,
  onUseLiveLocation,
  isLocating,
  currentWeather
}) => {
  // Origin & Destination state
  const originName = currentWeather?.city
    ? `${currentWeather.city} (Current Location)`
    : 'Current Location';

  const [selectedDestination, setSelectedDestination] = useState<DestinationPreset | null>(
    DESTINATION_PRESETS[0] // Default to Sushant University as requested
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Analysis Loading State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Scenario toggle (Normal, No dry route, All high risk)
  const [scenario, setScenario] = useState<'normal' | 'no-dry-route' | 'all-high-risk'>('normal');

  // Generated Routes & Departure Options
  const { routes, departureOptions } = useMemo(() => {
    const destName = selectedDestination?.name || 'Sushant University';
    return buildWeatherAwareRoutes(originName, destName, 0, scenario);
  }, [originName, selectedDestination, scenario]);

  const [activeRouteId, setActiveRouteId] = useState<string>('route-safest');

  // Navigation state
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [vehicleProgress, setVehicleProgress] = useState<number>(0);

  // Smart wait mode
  const [isSmartWaitActive, setIsSmartWaitActive] = useState<boolean>(false);
  const [smartWaitMinutes, setSmartWaitMinutes] = useState<number>(20);

  // Nearby places state
  const [showNearbyPlaces, setShowNearbyPlaces] = useState<boolean>(false);
  const [selectedNearbyPlace, setSelectedNearbyPlace] = useState<NearbySafePlace | null>(null);

  // Modals state
  const [showTimelineModal, setShowTimelineModal] = useState<boolean>(false);
  const [explainModalMode, setExplainModalMode] = useState<'why-route' | 'why-wait' | null>(null);
  const [showScenarioMenu, setShowScenarioMenu] = useState<boolean>(false);

  // Drawer expansion
  const [isDrawerExpanded, setIsDrawerExpanded] = useState<boolean>(false);

  // Radar Overlay toggle
  const [showRadarOverlay, setShowRadarOverlay] = useState<boolean>(true);

  // Handle destination selection
  const handleSelectPreset = (preset: DestinationPreset) => {
    setSelectedDestination(preset);
    setSearchQuery(preset.name);
    setIsAnalyzing(true);
    setIsNavigating(false);
    setVehicleProgress(0);
    setIsSmartWaitActive(false);
  };

  const handleClearDestination = () => {
    setSelectedDestination(null);
    setSearchQuery('');
    setIsNavigating(false);
    setVehicleProgress(0);
  };

  const activeRoute = routes.find((r) => r.id === activeRouteId) || routes[0];

  // Reroute handler when emergency alert triggers during navigation
  const handleReroute = () => {
    setActiveRouteId('route-safest');
  };

  return (
    <div className="relative w-full h-[calc(100vh-68px)] max-w-4xl mx-auto overflow-hidden flex flex-col bg-slate-900 select-none">
      {/* Top Banner Tagline & Branding Bar */}
      <div className="relative z-20 bg-slate-900/90 backdrop-blur-md px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
            W
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-xs font-black text-white tracking-wide">
                WeatherGPT Live Map
              </h1>
              <span className="text-[9px] font-bold bg-blue-500/20 text-sky-400 border border-blue-500/30 px-1.5 py-0.2 rounded-xs">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              "Navigate smarter. Stay ahead of the weather."
            </p>
          </div>
        </div>

        {/* Scenarios / Edge Cases Menu Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowScenarioMenu(!showScenarioMenu)}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
          >
            <span>⚡ Test Scenarios</span>
          </button>

          {showScenarioMenu && (
            <div className="absolute right-0 top-8 w-56 bg-slate-800 text-white rounded-2xl p-2 shadow-2xl border border-slate-700 text-xs z-50 animate-in zoom-in-95">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                Route Weather Cases
              </span>
              <button
                onClick={() => {
                  setScenario('normal');
                  setShowScenarioMenu(false);
                }}
                className={`w-full text-left p-2 rounded-xl transition cursor-pointer ${
                  scenario === 'normal' ? 'bg-blue-600 font-bold text-white' : 'hover:bg-slate-700'
                }`}
              >
                🟢 Standard (Safest vs Fastest vs Avoid)
              </button>
              <button
                onClick={() => {
                  setScenario('all-high-risk');
                  setShowScenarioMenu(false);
                }}
                className={`w-full text-left p-2 rounded-xl transition cursor-pointer ${
                  scenario === 'all-high-risk' ? 'bg-blue-600 font-bold text-white' : 'hover:bg-slate-700'
                }`}
              >
                ⚠️ All Routes High Risk (Severe Squall)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Search Bar (hidden during active turn-by-turn navigation) */}
      {!isNavigating && (
        <SearchAndDestinations
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isOpen={isSearchOpen}
          onOpen={() => setIsSearchOpen(true)}
          onClose={() => setIsSearchOpen(false)}
          onSelectPreset={handleSelectPreset}
          presets={DESTINATION_PRESETS}
          currentLocationName={originName}
          selectedDestinationName={selectedDestination?.name || null}
          onClearDestination={handleClearDestination}
          onUseGps={onUseLiveLocation || (() => {})}
          isLocating={isLocating}
        />
      )}

      {/* Main Interactive Vector Map Canvas */}
      <div className="relative flex-1 w-full overflow-hidden">
        <InteractiveMapCanvas
          routes={routes}
          activeRouteId={activeRouteId}
          onSelectRoute={setActiveRouteId}
          destinationName={selectedDestination?.name || 'Destination'}
          originName={originName}
          isNavigating={isNavigating}
          vehicleProgress={vehicleProgress}
          showNearbyPlaces={showNearbyPlaces}
          nearbyPlaces={NEARBY_SAFE_PLACES}
          selectedNearbyPlace={selectedNearbyPlace}
          onSelectNearbyPlace={setSelectedNearbyPlace}
          showRadarOverlay={showRadarOverlay}
          onToggleRadar={() => setShowRadarOverlay(!showRadarOverlay)}
        />
      </div>

      {/* Multi-Step Sequential Analysis Loader */}
      {isAnalyzing && (
        <RouteAnalysisLoading
          destinationName={selectedDestination?.name || 'Selected Destination'}
          onComplete={() => setIsAnalyzing(false)}
        />
      )}

      {/* Route Comparison & Departure AI Bottom Sheet (when destination is selected & not navigating) */}
      {selectedDestination && !isNavigating && !isAnalyzing && (
        <RouteComparisonDrawer
          routes={routes}
          activeRouteId={activeRouteId}
          onSelectRoute={setActiveRouteId}
          departureOptions={departureOptions}
          onStartNavigation={() => {
            setIsNavigating(true);
            setVehicleProgress(0);
          }}
          onActivateSmartWait={(mins) => {
            setSmartWaitMinutes(mins);
            setIsSmartWaitActive(true);
          }}
          onOpenWhyRoute={() => setExplainModalMode('why-route')}
          onOpenTimeline={() => setShowTimelineModal(true)}
          onOpenNearby={() => setShowNearbyPlaces(true)}
          isExpanded={isDrawerExpanded}
          onToggleExpand={() => setIsDrawerExpanded(!isDrawerExpanded)}
        />
      )}

      {/* Nearby Places While You Wait Drawer */}
      <NearbyPlacesDrawer
        places={NEARBY_SAFE_PLACES}
        isOpen={showNearbyPlaces}
        onClose={() => setShowNearbyPlaces(false)}
        onSelectPlace={(place) => {
          setSelectedNearbyPlace(place);
          setShowNearbyPlaces(false);
        }}
        selectedPlaceId={selectedNearbyPlace?.id}
      />

      {/* Smart Wait Mode Overlay */}
      {isSmartWaitActive && (
        <SmartWaitModeOverlay
          initialMinutes={smartWaitMinutes}
          onCancel={() => setIsSmartWaitActive(false)}
          onStartNavigation={() => {
            setIsSmartWaitActive(false);
            setIsNavigating(true);
            setVehicleProgress(0);
          }}
          onOpenNearby={() => setShowNearbyPlaces(true)}
          nearbyPlaces={NEARBY_SAFE_PLACES}
        />
      )}

      {/* Live Turn-by-Turn Navigation HUD */}
      {isNavigating && (
        <LiveNavigationHUD
          route={activeRoute}
          onEndNavigation={() => {
            setIsNavigating(false);
            setVehicleProgress(0);
          }}
          onOpenTimeline={() => setShowTimelineModal(true)}
          vehicleProgress={vehicleProgress}
          onProgressChange={setVehicleProgress}
          onReroute={handleReroute}
        />
      )}

      {/* Route Weather Timeline Modal */}
      <RouteWeatherTimelineModal
        route={activeRoute}
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
      />

      {/* Explainable AI Modal */}
      <ExplainableAIModal
        route={activeRoute}
        isOpen={explainModalMode !== null}
        onClose={() => setExplainModalMode(null)}
        mode={explainModalMode || 'why-route'}
      />
    </div>
  );
};
