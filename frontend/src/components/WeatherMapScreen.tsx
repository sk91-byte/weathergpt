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
import { createRoute, getRouteWeather, getBestDeparture, getRouteExplanation, getNearbyPlaces, sendChatMessage, PlaceResult, RouteResult, RouteWeatherResult, toLiveMapRoute } from '../services/backend';

interface WeatherMapScreenProps {
  initialLayer?: string;
  onSelectCity: (cityName: string) => void;
  onBackToHome: () => void;
  onUseLiveLocation?: () => void;
  isLocating?: boolean;
  currentWeather?: WeatherData;
  currentLocation?: PlaceResult | null;
}

export const WeatherMapScreen: React.FC<WeatherMapScreenProps> = ({
  initialLayer = 'rain',
  onSelectCity,
  onBackToHome,
  onUseLiveLocation,
  isLocating,
  currentWeather,
  currentLocation
}) => {
  // Origin & Destination state
  const originName = currentWeather?.city
    ? `${currentWeather.city} (Current Location)`
    : 'Current Location';

  const [manualOrigin, setManualOrigin] = useState<PlaceResult | null>(null);
  const effectiveOrigin = manualOrigin || currentLocation;
  const effectiveOriginName = effectiveOrigin?.name || originName;
  const [selectedDestination, setSelectedDestination] = useState<DestinationPreset | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [originQuery, setOriginQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Analysis Loading State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [liveRoute, setLiveRoute] = useState<LiveMapRoute | null>(null);
  const [routeWeather, setRouteWeather] = useState<RouteWeatherResult | null>(null);
  const [liveDepartureOptions, setLiveDepartureOptions] = useState<DepartureTimeOption[]>([]);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState('driving');

  // Scenario toggle (Normal, No dry route, All high risk)
  const [scenario, setScenario] = useState<'normal' | 'no-dry-route' | 'all-high-risk'>('normal');

  // Generated Routes & Departure Options
  const { routes: demoRoutes, departureOptions: demoDepartureOptions } = useMemo(() => {
    const destName = selectedDestination?.name || 'Sushant University';
    return buildWeatherAwareRoutes(originName, destName, 0, scenario);
  }, [originName, selectedDestination, scenario]);

  const routes = liveRoute ? [liveRoute] : demoRoutes;
  const departureOptions = liveRoute ? liveDepartureOptions : demoDepartureOptions;

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
  const [liveNearbyPlaces, setLiveNearbyPlaces] = useState<NearbySafePlace[]>([]);

  // Modals state
  const [showTimelineModal, setShowTimelineModal] = useState<boolean>(false);
  const [explainModalMode, setExplainModalMode] = useState<'why-route' | 'why-wait' | null>(null);
  const [routeExplanation, setRouteExplanation] = useState<string[]>([]);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [showScenarioMenu, setShowScenarioMenu] = useState<boolean>(false);

  // Route-specific conversation state. This stays separate from the main chat so
  // the traveller can ask follow-up questions without losing route context.
  const [routeChatInput, setRouteChatInput] = useState('');
  const [routeChatReply, setRouteChatReply] = useState('');
  const [routeChatLoading, setRouteChatLoading] = useState(false);
  const [routeChatConversationId, setRouteChatConversationId] = useState<string | undefined>();

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
    setLiveRoute(null);
    setRouteWeather(null);
    setLiveDepartureOptions([]);
    setRouteError(null);
    setRouteExplanation([]);
    setRouteChatReply('');
    setLiveNearbyPlaces([]);
  };

  useEffect(() => {
    if (!selectedDestination || !effectiveOrigin) return;
    let cancelled = false;
    setIsAnalyzing(true);
    setRouteError(null);
    const destination: PlaceResult = { place_id: selectedDestination.id, name: selectedDestination.name, address: selectedDestination.subtitle, latitude: selectedDestination.coords.lat, longitude: selectedDestination.coords.lon };
    createRoute({ origin: effectiveOrigin, destination, travelMode })
      .then((route: RouteResult) => Promise.all([getRouteWeather(route.route_id), getBestDeparture(route.route_id)]).then(([weather, best]) => ({ route, weather, best })))
      .then(async ({ route, weather, best }) => {
        if (cancelled) return;
        setRouteWeather(weather);
        setLiveRoute(toLiveMapRoute(route, weather));
        setActiveRouteId(route.route_id);
        setLiveDepartureOptions((best.alternative_times || []).map((item, index) => ({
          id: `live-departure-${index}`, title: item.departure_time === best.recommended_departure_time ? 'Recommended' : 'Alternative', time: item.departure_time,
          safetyScore: typeof item.risk?.score === 'number' ? Math.round(item.risk.score) : 0, travelTime: 'Live route', statusNote: best.reason || 'Backend recommendation',
          isRecommended: item.departure_time === best.recommended_departure_time, rainRisk: item.risk?.level === 'high' ? 'High' : item.risk?.level === 'moderate' ? 'Moderate' : 'Low', conditionIcon: 'partly-cloudy'
        })));
        const coordinates = route.geometry?.coordinates || [];
        const midpoint = coordinates[Math.floor(coordinates.length / 2)];
        if (midpoint) {
          try {
            const places = await getNearbyPlaces(midpoint[1], midpoint[0]);
            if (!cancelled) setLiveNearbyPlaces(places.map((place, index) => ({
              id: place.place_id || `nearby-${index}`, name: place.name,
              category: (place.category || 'convenience') as NearbySafePlace['category'], categoryLabel: (place.category || 'place').toUpperCase(),
              rating: 0, reviews: 0, distanceMeters: Math.round((place.distance_km || 0) * 1000), walkingMinutes: Math.max(1, Math.round((place.distance_km || 0) * 12)),
              address: place.formatted_address || place.address || 'Near route', openStatus: 'Provider hours unavailable', shelterFeature: 'Nearby route stop',
              coords: { x: 50, y: 50, lat: place.latitude, lng: place.longitude }
            })));
          } catch { if (!cancelled) setLiveNearbyPlaces([]); }
        }
      })
      .catch(() => { if (!cancelled) setRouteError('Route service is temporarily unavailable. Please try again.'); })
      .finally(() => { if (!cancelled) setIsAnalyzing(false); });
    return () => { cancelled = true; };
  }, [selectedDestination, effectiveOrigin, travelMode]);

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
        <span className={`text-[9px] font-black px-2 py-1 rounded-full ${liveRoute ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-900'}`}>{liveRoute ? 'LIVE' : 'DEMO'}</span>

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
          currentLocationName={effectiveOriginName}
          selectedDestinationName={selectedDestination?.name || null}
          onClearDestination={handleClearDestination}
          onUseGps={onUseLiveLocation || (() => {})}
          isLocating={isLocating}
          currentLocation={currentLocation}
          originQuery={originQuery}
          onOriginChange={setOriginQuery}
          originLocation={effectiveOrigin}
          onSelectOrigin={(preset) => setManualOrigin({ place_id: preset.id, name: preset.name, address: preset.subtitle, latitude: preset.coords.lat, longitude: preset.coords.lon })}
        />
      )}

      {routeError && <div className="absolute top-20 left-3 right-3 z-40 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3">{routeError}</div>}

      {!effectiveOrigin && <div className="absolute top-20 left-3 right-3 z-20 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold p-3 pointer-events-none">Choose a starting location or use GPS, then choose a destination.</div>}

      {/* Main Interactive Vector Map Canvas */}
      <div className="relative flex-1 w-full overflow-hidden">
        <InteractiveMapCanvas
          routes={routes}
          activeRouteId={activeRouteId}
          onSelectRoute={setActiveRouteId}
          destinationName={selectedDestination?.name || 'Destination'}
          originName={effectiveOriginName}
          isNavigating={isNavigating}
          vehicleProgress={vehicleProgress}
          showNearbyPlaces={showNearbyPlaces}
          nearbyPlaces={liveRoute ? liveNearbyPlaces : NEARBY_SAFE_PLACES}
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
          onOpenWhyRoute={async () => {
            setExplainModalMode('why-route');
            if (liveRoute) {
              setExplanationLoading(true);
              try {
                const result = await getRouteExplanation(liveRoute.id);
                setRouteExplanation(result.explanation || []);
              } catch {
                setRouteExplanation(['The backend could not provide a route explanation right now.']);
              } finally {
                setExplanationLoading(false);
              }
            }
          }}
          onOpenTimeline={() => setShowTimelineModal(true)}
          onOpenNearby={() => setShowNearbyPlaces(true)}
          isExpanded={isDrawerExpanded}
          onToggleExpand={() => setIsDrawerExpanded(!isDrawerExpanded)}
          liveMode={Boolean(liveRoute)}
          routeChatInput={routeChatInput}
          routeChatReply={routeChatReply}
          routeChatLoading={routeChatLoading}
          onRouteChatInputChange={setRouteChatInput}
          onRouteChatSubmit={async () => {
            const message = routeChatInput.trim();
            if (!message || routeChatLoading || !selectedDestination) return;
            setRouteChatLoading(true);
            try {
              const contextMessage = `Route from ${originName} to ${selectedDestination.name}. Traveller question: ${message}`;
              const result = await sendChatMessage({
                message: contextMessage,
                language: 'en',
                profile: 'traveller',
                conversation_id: routeChatConversationId
              });
              setRouteChatReply(result.response || 'The weather assistant returned no response.');
              if (result.conversation_id) setRouteChatConversationId(result.conversation_id);
              setRouteChatInput('');
            } catch {
              setRouteChatReply('Route chat is temporarily unavailable. Please try again.');
            } finally {
              setRouteChatLoading(false);
            }
          }}
        />
      )}

      {/* Nearby Places While You Wait Drawer */}
      <NearbyPlacesDrawer
        places={liveRoute ? liveNearbyPlaces : NEARBY_SAFE_PLACES}
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
          nearbyPlaces={liveRoute ? liveNearbyPlaces : NEARBY_SAFE_PLACES}
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
        explanation={routeExplanation}
        isLoading={explanationLoading}
        liveMode={Boolean(liveRoute)}
      />
    </div>
  );
};
