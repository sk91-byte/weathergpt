import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  WeatherData,
  LiveMapRoute,
  RouteRiskZone,
  NearbySafePlace,
  DepartureTimeOption,
  RouteSamplingPoint,
  RouteTrip,
  SavedPlace,
  RouteChatContext
} from '../types';
import { DESTINATION_PRESETS, DestinationPreset } from '../data/liveMapData';
import { AppLanguage } from '../utils/routeWeatherSummary';
import { InteractiveMapCanvas } from './live-map/InteractiveMapCanvas';
import { SearchAndDestinations } from './live-map/SearchAndDestinations';
import { RouteComparisonDrawer } from './live-map/RouteComparisonDrawer';
import { RouteAnalysisLoading } from './live-map/RouteAnalysisLoading';
import { NearbyPlacesDrawer } from './live-map/NearbyPlacesDrawer';
import { RouteAmenitiesPanel } from './live-map/RouteAmenitiesPanel';
import { SmartWaitModeOverlay } from './live-map/SmartWaitModeOverlay';
import { LiveNavigationHUD } from './live-map/LiveNavigationHUD';
import { RouteWeatherTimelineModal } from './live-map/RouteWeatherTimelineModal';
import { ExplainableAIModal } from './live-map/ExplainableAIModal';
import { MapWeatherPopup } from './live-map/MapWeatherPopup';
import { RouteChatDrawer } from './live-map/RouteChatDrawer';
import { LiveMapPlanTripModal } from './live-map/LiveMapPlanTripModal';
import {
  apiCalculateRoute,
  apiGetRouteWeather,
  apiGetBestDepartureTime,
  apiGetRouteExplanation,
  apiGetNearbyPlaces,
  apiGetPlacesAlongRoute,
  apiGetPointWeather,
  apiGetLocationWeather,
  apiResolveLocation,
  ApiPointWeatherResponse,
  apiSendChat
} from '../services/api';
import {
  MessageSquare,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  RefreshCw,
  MapPin,
  Clock,
  Navigation,
  Languages
} from './Icons';

interface WeatherMapScreenProps {
  currentWeather: WeatherData;
  onUseLiveLocation?: () => void;
  isLocating?: boolean;
  initialTrip?: RouteTrip;
  onUpdateTrip?: (trip: RouteTrip) => void;
  savedPlaces?: SavedPlace[];
  onSavePlace?: (place: Omit<SavedPlace, 'id' | 'createdAt'>) => void;
  onSaveRoute?: (trip: RouteTrip) => void;
  onBackToHome?: () => void;
  onSelectCity?: (city: string) => void;
  initialLayer?: string;
  initialLanguage?: AppLanguage;
  userRole?: string;
  onAnalyzeRouteInChat?: (context: RouteChatContext, query: string) => void;
}

export const WeatherMapScreen: React.FC<WeatherMapScreenProps> = ({
  currentWeather,
  onUseLiveLocation,
  isLocating,
  initialTrip,
  onUpdateTrip,
  savedPlaces = [],
  onSavePlace,
  onSaveRoute,
  onBackToHome,
  onSelectCity,
  initialLayer,
  initialLanguage = 'en',
  userRole = 'citizen',
  onAnalyzeRouteInChat
}) => {
  // 0. Multilingual State
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage || 'en');

  // 1. Origin & Destination state
  const [originName, setOriginName] = useState<string>(
    initialTrip?.from || (currentWeather?.city ? `${currentWeather.city} (Current Location)` : 'DLF CyberCity, Gurgaon')
  );
  const [originQuery, setOriginQuery] = useState<string>(
    initialTrip?.from || (currentWeather?.city ? `${currentWeather.city} (Current Location)` : 'DLF CyberCity, Gurgaon')
  );
  const [originAddress, setOriginAddress] = useState<string>(initialTrip?.from || '');
  const [originCoords, setOriginCoords] = useState<[number, number]>(
    (initialTrip as any)?.originCoords ||
    ((currentWeather as any)?.latitude && (currentWeather as any)?.longitude
      ? [(currentWeather as any).latitude, (currentWeather as any).longitude]
      : [28.4986, 77.0878])
  );

  const [destinationName, setDestinationName] = useState<string>(
    (initialTrip as any)?.destinationCoords ? initialTrip?.to || '' : ''
  );
  const [destinationQuery, setDestinationQuery] = useState<string>(
    (initialTrip as any)?.destinationCoords ? initialTrip?.to || '' : ''
  );
  const [destinationAddress, setDestinationAddress] = useState<string>(initialTrip?.to || '');
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(
    (initialTrip as any)?.destinationCoords || null
  );

  const [travelMode, setTravelMode] = useState<string>('driving');
  const [leaveByTime, setLeaveByTime] = useState<string>(initialTrip?.leaveBy || '08:30 AM');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [showPlanTripModal, setShowPlanTripModal] = useState<boolean>(false);

  // 2. Loading & Render Standby Sleep states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isRenderWakingUp, setIsRenderWakingUp] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [dataSource, setDataSource] = useState<string>('Open-Meteo & OSRM');

  // 3. Routes & Departures
  const [routes, setRoutes] = useState<LiveMapRoute[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string>('');
  const [departureOptions, setDepartureOptions] = useState<DepartureTimeOption[]>([]);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  // A destination change can otherwise start two overlapping calculations
  // (button handler + state effect). Only the newest request may update the
  // map or clear its route.
  const routeRequestIdRef = useRef(0);
  const lastRouteInvocationKeyRef = useRef<string>('');
  const [routeRefreshNonce, setRouteRefreshNonce] = useState(0);
  const [routeError, setRouteError] = useState('');

  // 4. Navigation & Vehicle Progress
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [vehicleProgress, setVehicleProgress] = useState<number>(0);

  // 5. Smart Wait Mode
  const [isSmartWaitActive, setIsSmartWaitActive] = useState<boolean>(false);
  const [smartWaitMinutes, setSmartWaitMinutes] = useState<number>(20);

  // 6. Nearby Safe Places
  const [showNearbyPlaces, setShowNearbyPlaces] = useState<boolean>(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbySafePlace[]>([]);
  const [isLoadingNearbyPlaces, setIsLoadingNearbyPlaces] = useState<boolean>(false);
  const [nearbyPlacesError, setNearbyPlacesError] = useState<string | null>(null);
  const [nearbyCategory, setNearbyCategory] = useState<'all' | 'cafe' | 'restaurant' | 'hotel' | 'petrol' | 'hospital'>('all');
  const [selectedNearbyPlace, setSelectedNearbyPlace] = useState<NearbySafePlace | null>(null);

  // 7. Modals & Drawers
  const [showTimelineModal, setShowTimelineModal] = useState<boolean>(false);
  const [explainModalMode, setExplainModalMode] = useState<'why-route' | 'why-wait' | null>(null);
  const [aiRouteAnalysis, setAiRouteAnalysis] = useState('');
  const [isAiRouteAnalysisLoading, setIsAiRouteAnalysisLoading] = useState(false);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);


  // 8. Map Layers & Point Weather Popup
  const [showRadarOverlay, setShowRadarOverlay] = useState<boolean>(false);
  const [weatherLayerType, setWeatherLayerType] = useState<'rain' | 'temp' | 'rainfall' | 'wind' | 'alerts' | 'none'>('none');
  const [selectedPointWeather, setSelectedPointWeather] = useState<ApiPointWeatherResponse | null>(null);
  const [isFetchingPointWeather, setIsFetchingPointWeather] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<[number, number] | null>(null);
  const [gpsPermissionNotice, setGpsPermissionNotice] = useState<string | null>(null);

  // Dedicated GPS Handler with browser permission and graceful manual fallback
  const handleGpsLocationClick = () => {
    setGpsPermissionNotice(null);
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsPermissionNotice('We could not detect your location. You can search for your area manually.');
      return;
    }

    const requestPosition = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            if (import.meta.env.DEV) {
              console.log('[WeatherMapScreen GPS] Obtained:', latitude, longitude);
            }
            setGpsCoords([latitude, longitude]);
            setOriginCoords([latitude, longitude]);

            let resolvedLabel = `Location (${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E)`;
            try {
              const { location } = await apiGetLocationWeather(latitude, longitude);
              if (location && location.name) {
                resolvedLabel = location.name;
              }
            } catch (err) {
              if (import.meta.env.DEV) {
                console.warn('GPS location resolution error:', err);
              }
            }

            setOriginName(resolvedLabel);
            setOriginAddress(resolvedLabel);
            setOriginQuery(resolvedLabel);

            if (onUpdateTrip) {
              onUpdateTrip({
                id: initialTrip?.id || `trip-${Date.now()}`,
                from: resolvedLabel,
                to: destinationName,
                leaveBy: leaveByTime,
                estDuration: '30 mins',
                status: 'Weather-Safe Corridor Calculated on Map',
                statusType: 'clear',
                weatherOnRoute: 'Live provider route analysis',
                safetyScore: 88,
                recommendation: `Optimal departure window around ${leaveByTime}. Safe travel conditions.`,
                stops: []
              });
            }

            // The origin/destination state effect recalculates the route once
            // both values have been committed. Do not start a second request
            // here; duplicate requests were clearing successful polylines.
          } catch (e) {
            if (import.meta.env.DEV) {
              console.warn('GPS position handling error:', e);
            }
          }
        },
        (err) => {
          if (import.meta.env.DEV) {
            console.warn('GPS error in map:', err);
          }
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            requestPosition(false);
            return;
          }
          if (err.code === 1) {
            setGpsPermissionNotice('Location permission is blocked. Please allow location access in your browser settings.');
          } else {
            setGpsPermissionNotice('We could not detect your location. You can search for your area manually.');
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 10000 : 15000, maximumAge: 0 }
      );
    };

    requestPosition(true);
  };

  // Update origin when currentWeather city updates
  useEffect(() => {
    if (currentWeather.city && !originQuery) {
      setOriginName(currentWeather.city);
    }
  }, [currentWeather.city]);

  // Main Route & Weather calculation engine
  const fetchRouteAndWeather = useCallback(
    async (
      startCoords: [number, number],
      startName: string,
      endCoords: [number, number],
      endName: string,
      mode: string
    ) => {
      const requestId = ++routeRequestIdRef.current;
      setIsAnalyzing(true);
      setRouteError('');
      // Nearby places are intentionally loaded on demand from the category
      // panel, not during every route calculation.
      setIsLoadingNearbyPlaces(false);
      setNearbyPlacesError(null);
      setNearbyPlaces([]);
      const wakeupTimer = setTimeout(() => {
        setIsRenderWakingUp(true);
      }, 2500);

      try {
        const originPt = { latitude: startCoords[0], longitude: startCoords[1], name: startName };
        const destPt = { latitude: endCoords[0], longitude: endCoords[1], name: endName };

        // Step 1: Calculate Route Geometry & steps via backend OSRM
        const routeData = await apiCalculateRoute(originPt, destPt, mode);
        if (routeRequestIdRef.current !== requestId) return;

        clearTimeout(wakeupTimer);
        setIsRenderWakingUp(false);
        setIsLive(routeData.is_live);
        setDataSource(routeData.data_source || 'Open-Meteo & OSRM');

        const geoPts = routeData.geometry || [];
        console.log('Leaflet route point count:', geoPts.length);
        if (geoPts.length < 3) {
          throw new Error('Road route unavailable. No straight-line route is shown.');
        }
        setRouteSteps(routeData.steps || []);

        // Render the road route immediately. Weather, departure advice, and
        // nearby places are secondary enhancements and must not delay or hide
        // the actual route line.
        const routeOnly: LiveMapRoute = {
          id: routeData.route_id,
          name: `${endName.split(',')[0]} via Corridor`,
          badge: 'ROUTE CALCULATED',
          type: 'recommended',
          distanceKm: routeData.distance_km,
          durationMinutes: routeData.duration_minutes,
          safetyScore: null,
          summaryCondition: 'Loading live weather…',
          rainRisk: 'Unavailable',
          waterloggingRisk: 'Unavailable',
          thunderstormRisk: 'Unavailable',
          hazardCount: 0,
          color: 'orange',
          strokeColor: '#2563eb',
          pathPoints: [],
          geoPoints: geoPts,
          waypoints: [],
          riskZones: [],
          departureAdvice: 'Loading live departure advice…',
          whyThisRoute: 'Road route calculated from the live routing service.',
          whyWait: 'Live weather analysis is loading.'
        };
        console.log('LiveMapRoute geoPoints stored:', routeOnly.geoPoints?.length ?? 0);
        setRoutes([routeOnly]);
        setActiveRouteId(routeOnly.id);

        // OSRM can return up to three real road alternatives. Keep the
        // geometries separate so each option can receive its own weather risk
        // score instead of painting one route three different colours.
        const routeCandidates = Array.isArray(routeData.alternatives) && routeData.alternatives.length > 0
          ? routeData.alternatives.slice(0, 3)
          : [{
              route_id: routeData.route_id,
              distance_km: routeData.distance_km,
              duration_minutes: routeData.duration_minutes,
              geometry: geoPts,
              steps: routeData.steps || [],
              alternative_index: 0
            }];

        // Step 2: Fetch Route Weather & Safety analysis from Open-Meteo.
        // Weather is an enhancement to the road route: if the weather
        // provider is sleeping, rate-limited, or temporarily unavailable, do
        // not discard the route geometry that was already calculated.
        const weatherAnalysis = await apiGetRouteWeather(routeData.route_id, mode).catch((error) => {
          console.warn('Route weather unavailable; showing the road route anyway:', error);
          if (routeRequestIdRef.current === requestId) {
            setDataSource(`${routeData.data_source || 'OSRM route service'} · weather unavailable`);
          }
          return {
            safety_score: null,
            rain_risk: 'Unavailable',
            waterlogging_risk: 'Unavailable',
            wind_risk: 'Unavailable',
            fog_risk: 'Unavailable',
            thunderstorm_risk: 'Unavailable',
            timeline: [],
            risk_zones: [],
            is_live: false,
            source: 'Weather temporarily unavailable'
          };
        });
        if (routeRequestIdRef.current !== requestId) return;

        // Step 3: Fetch Departure Time Recommendations
        const departures = await apiGetBestDepartureTime(
          routeData.route_id,
          originPt,
          destPt,
          weatherAnalysis.safety_score
        ).catch((error) => {
          console.warn('Departure recommendations unavailable:', error);
          return { warning_message: '', options: [] };
        });

        const alternativeWeather = await Promise.all(routeCandidates.map(async (candidate) => {
          if (candidate.route_id === routeData.route_id) return weatherAnalysis;
          try {
            return await apiGetRouteWeather(candidate.route_id, mode);
          } catch (error) {
            console.warn(`Weather unavailable for alternative route ${candidate.route_id}:`, error);
            return {
              safety_score: null,
              rain_risk: 'Unavailable',
              waterlogging_risk: 'Unavailable',
              thunderstorm_risk: 'Unavailable',
              timeline: [],
              risk_zones: [],
              is_live: false,
              source: 'Weather temporarily unavailable'
            };
          }
        }));

        if (routeRequestIdRef.current !== requestId) return;

        // Map backend analysis into LiveMapRoute format
        const calculatedDistanceKm = routeData.distance_km;
        const calculatedDurationMin = routeData.duration_minutes;

        const primaryRoute: LiveMapRoute = {
          id: routeData.route_id,
          name: `${endName.split(',')[0]} via Corridor`,
          badge: weatherAnalysis.safety_score >= 80 ? 'LOWER WEATHER RISK' : 'WEATHER CAUTION',
          type: 'recommended',
          distanceKm: calculatedDistanceKm,
          durationMinutes: calculatedDurationMin,
          safetyScore: weatherAnalysis.safety_score,
          summaryCondition: weatherAnalysis.timeline?.[0]?.weather_condition || 'Unavailable',
          rainRisk: (weatherAnalysis.rain_risk as any) || 'Unavailable',
          waterloggingRisk: (weatherAnalysis.waterlogging_risk as any) || 'Unavailable',
          thunderstormRisk: (weatherAnalysis.thunderstorm_risk as any) || 'Unavailable',
          hazardCount: weatherAnalysis.risk_zones?.length || 0,
          color: weatherAnalysis.safety_score === null
            ? 'orange'
            : weatherAnalysis.safety_score >= 80 ? 'green' : 'orange',
          strokeColor: '#2563eb',
          pathPoints: [],
          geoPoints: geoPts,
          waypoints: (weatherAnalysis.timeline || []).map((tl, idx) => ({
            id: tl.id || `wp_${idx}`,
            name: tl.name,
            expectedTime: tl.expected_time,
            distanceFromStartKm: tl.distance_from_start_km,
            weatherCondition: tl.weather_condition,
            temp: tl.temp_c,
            rainProb: tl.rain_prob,
            rainIntensity: tl.rain_intensity as any,
            waterloggingRisk: tl.waterlogging_risk as any,
            safetyScore: tl.safety_score,
            hazard: tl.hazard,
            coords: { x: 500, y: 500, lat: tl.latitude, lng: tl.longitude }
          })),
          riskZones: (weatherAnalysis.risk_zones || []).map((rz, idx) => ({
            id: rz.id || `rz_${idx}`,
            type: rz.type as any || 'waterlogging',
            title: rz.title,
            locationName: rz.location_name,
            coords: { x: 500, y: 500, lat: rz.latitude, lng: rz.longitude },
            severity: rz.severity as any || 'Moderate',
            description: rz.description,
            icon: rz.icon || '⚠️'
          })),
          departureAdvice: departures.warning_message || 'No additional live departure warning was returned.',
          whyThisRoute: 'Calculated using real-time Open-Meteo segment precipitation analysis and road grade risk',
          whyWait: 'Check the live forecast again before leaving; conditions may change.'
        };

        const liveRoutes: LiveMapRoute[] = routeCandidates.map((candidate, index) => {
          const analysis = alternativeWeather[index] || weatherAnalysis;
          const score = analysis.safety_score;
          const color = score === null ? 'orange' : score >= 70 ? 'green' : score >= 40 ? 'orange' : 'red';
          const routeType = color === 'green' ? 'safest' : color === 'orange' ? 'alternative' : 'avoid';
          const label = color === 'green' ? 'Highly preferred route' : color === 'orange' ? 'Usable route' : color === 'red' ? 'Highly avoidable route' : 'Route weather unavailable';
          return {
            ...primaryRoute,
            id: candidate.route_id,
            name: `${label} to ${endName.split(',')[0]}`,
            badge: color === 'green' ? 'LOW WEATHER RISK' : color === 'orange' ? 'MODERATE WEATHER RISK' : color === 'red' ? 'HIGH WEATHER RISK' : 'WEATHER UNAVAILABLE',
            type: index === 0 ? 'recommended' : index === 2 ? 'avoid' : 'alternative',
            routeOptionType: routeType,
            distanceKm: candidate.distance_km,
            durationMinutes: candidate.duration_minutes,
            safetyScore: score,
            summaryCondition: analysis.timeline?.[0]?.weather_condition || 'Unavailable',
            rainRisk: analysis.rain_risk || 'Unavailable',
            waterloggingRisk: analysis.waterlogging_risk || 'Unavailable',
            thunderstormRisk: analysis.thunderstorm_risk || 'Unavailable',
            hazardCount: analysis.risk_zones?.length || 0,
            color,
            strokeColor: color === 'green' ? '#16a34a' : color === 'orange' ? '#eab308' : color === 'red' ? '#dc2626' : '#64748b',
            geoPoints: candidate.geometry,
            waypoints: (analysis.timeline || []).map((tl: any, idx: number) => ({
              id: tl.id || `${candidate.route_id}_wp_${idx}`,
              name: tl.name,
              expectedTime: tl.expected_time,
              distanceFromStartKm: tl.distance_from_start_km,
              weatherCondition: tl.weather_condition,
              temp: tl.temp_c,
              rainProb: tl.rain_prob,
              rainIntensity: tl.rain_intensity,
              waterloggingRisk: tl.waterlogging_risk,
              safetyScore: tl.safety_score,
              hazard: tl.hazard,
              coords: { x: 500, y: 500, lat: tl.latitude, lng: tl.longitude }
            })),
            riskZones: (analysis.risk_zones || []).map((rz: any, idx: number) => ({
              id: rz.id || `${candidate.route_id}_rz_${idx}`,
              type: rz.type || 'waterlogging',
              title: rz.title,
              locationName: rz.location_name,
              coords: { x: 500, y: 500, lat: rz.latitude, lng: rz.longitude },
              severity: rz.severity || 'Moderate',
              description: rz.description,
              icon: rz.icon || '⚠️'
            })),
            whyThisRoute: `${label} selected from live OSRM road alternatives and scored using weather conditions along this route.`,
            whyWait: 'Check the live forecast again before leaving; conditions may change.'
          } as LiveMapRoute;
        });

        // Show only real provider-returned road alternatives. No synthetic
        // straight-line geometries are created when the provider has one route.
        setRoutes(liveRoutes.length ? liveRoutes : [primaryRoute]);
        setActiveRouteId(liveRoutes[0]?.id || primaryRoute.id);

        if (departures?.options && departures.options.length > 0) {
          setDepartureOptions(
            departures.options.map((d) => ({
              id: d.id,
              title: d.title,
              time: d.time,
              safetyScore: d.safety_score,
              travelTime: `${calculatedDurationMin} min`,
              statusNote: d.note,
              isRecommended: d.is_recommended,
              tag: d.tag,
              rainRisk: d.rain_risk as any,
              conditionIcon: '🌧️'
            }))
          );
        }
      } catch (err) {
        console.warn('Live route calculation failed:', err);
        if (routeRequestIdRef.current !== requestId) return;
        clearTimeout(wakeupTimer);
        setIsRenderWakingUp(false);
        setIsLive(false);
        setDataSource('Live data unavailable');
        const message = err instanceof Error ? err.message : 'The route service did not return a usable road route.';
        setRouteError(message);
        setDepartureOptions([]);
        setNearbyPlaces([]);
        setIsLoadingNearbyPlaces(false);
      } finally {
        if (routeRequestIdRef.current === requestId) {
          setIsAnalyzing(false);
        }
      }
    },
    []
  );

  // Route calculation on route-defining state changes.
  // Do not include originName: GPS reverse-geocoding updates the label after the
  // coordinates are already set and must not start a second route request.
  useEffect(() => {
    const validCoordinatePair = (coords: [number, number] | null | undefined): coords is [number, number] => Boolean(coords && coords.length >= 2 && Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1])));
    if (!validCoordinatePair(originCoords) || !validCoordinatePair(destinationCoords) || !destinationName.trim()) return;
    const routeKey = `${Number(originCoords[0]).toFixed(6)},${Number(originCoords[1]).toFixed(6)}|${Number(destinationCoords[0]).toFixed(6)},${Number(destinationCoords[1]).toFixed(6)}|${travelMode}|refresh:${routeRefreshNonce}`;
    if (lastRouteInvocationKeyRef.current === routeKey) return;
    lastRouteInvocationKeyRef.current = routeKey;

    fetchRouteAndWeather(
      originCoords,
      originName,
      destinationCoords,
      destinationName,
      travelMode
    );
  }, [originCoords, destinationCoords, destinationName, originName, travelMode, routeRefreshNonce, fetchRouteAndWeather]);

  // Click on Map -> Real Point Weather
  const handleMapClick = async (lat: number, lon: number) => {
    setIsFetchingPointWeather(true);
    try {
      const data = await apiGetPointWeather(lat, lon);
      setSelectedPointWeather(data);
    } catch (e) {
      console.warn('Map click point weather error:', e);
    } finally {
      setIsFetchingPointWeather(false);
    }
  };

  // Click on Route Waypoint -> Show waypoint weather popup
  const handleRoutePointClick = async (point: RouteSamplingPoint) => {
    const lat = point.coords?.lat;
    const lon = point.coords?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    setIsFetchingPointWeather(true);
    try {
      const livePoint = await apiGetPointWeather(lat as number, lon as number);
      if (livePoint) {
        setSelectedPointWeather({
          ...livePoint,
          location_name: point.name || livePoint.location_name,
          route_point_info: {
            section_name: point.name,
            expected_time: point.expectedTime,
            distance_km: point.distanceFromStartKm,
            safety_score: point.safetyScore,
            advice: point.hazard || undefined,
            waterlogging_risk: point.waterloggingRisk,
            rain_intensity: point.rainIntensity
          }
        });
      }
    } catch (error) {
      console.warn('Live route-point weather unavailable:', error);
      setSelectedPointWeather(null);
    } finally {
      setIsFetchingPointWeather(false);
    }
  };

  // Swap Origin & Destination
  const handleSwapLocations = () => {
    const tempName = originName;
    const tempCoords = originCoords;
    const tempAddress = originAddress;
    setOriginName(destinationName);
    setOriginCoords(destinationCoords);
    setOriginQuery(destinationName);
    setOriginAddress(destinationAddress);
    setDestinationName(tempName);
    setDestinationCoords(tempCoords);
    setDestinationQuery(tempName);
    setDestinationAddress(tempAddress);
  };

  // Set Route & Destination from Plan Trip Modal
  const handleSetRouteFromModal = async (params: {
    originName: string;
    originCoords: [number, number];
    destinationName: string;
    destinationCoords: [number, number];
    travelMode: string;
    leaveBy: string;
  }) => {
    setOriginName(params.originName);
    setOriginCoords(params.originCoords);
    setOriginQuery(params.originName);
    setOriginAddress(params.originName);
    setDestinationName(params.destinationName);
    setDestinationCoords(params.destinationCoords);
    setDestinationQuery(params.destinationName);
    setDestinationAddress(params.destinationName);
    setTravelMode(params.travelMode);
    setLeaveByTime(params.leaveBy);

    // Reveal the live map immediately. The route/weather requests can take a
    // few seconds, but the selected origin and destination should be visible
    // while that live analysis is running.
    setShowPlanTripModal(false);
    setRoutes([]);
    setDepartureOptions([]);
    setNearbyPlaces([]);
    setActiveRouteId('');

    if (onUpdateTrip) {
      onUpdateTrip({
        id: `trip-${Date.now()}`,
        from: params.originName,
        to: params.destinationName,
        originCoords: params.originCoords,
        destinationCoords: params.destinationCoords,
        travelMode: params.travelMode,
        leaveBy: params.leaveBy,
        estDuration: '30 mins',
        status: 'Weather-Safe Corridor Calculated on Map',
        statusType: 'clear',
            weatherOnRoute: 'Live provider route analysis',
        safetyScore: 88,
        recommendation: `Optimal departure window around ${params.leaveBy}. Safe travel conditions.`,
        stops: []
      });
    }
  };

  // Quick submit from search bar (Enter or Set button)
  const handleQuickSubmitDestination = async (destQuery: string) => {
    if (!destQuery.trim()) return;
    try {
      // If destinationCoords already exist and destinationName matches destQuery, use existing coords directly without re-geocoding!
      if (destinationCoords && destinationName.toLowerCase() === destQuery.trim().toLowerCase()) {
        // A selected destination already has valid coordinates. Invoke the
        // route request directly instead of relying on a state/effect cycle;
        // this makes the visible Show route button deterministic.
        console.log('[WeatherMapScreen] Show route clicked', {
          originCoords,
          destinationCoords,
          travelMode
        });
        await fetchRouteAndWeather(
          originCoords,
          originName,
          destinationCoords,
          destinationName,
          travelMode
        );
        return;
      }
      const res = await apiResolveLocation(destQuery.trim());
      if (res && res.latitude && res.longitude) {
        const resolvedCoords: [number, number] = [res.latitude, res.longitude];
        const resolvedName = res.name || destQuery.trim();
        setDestinationName(resolvedName);
        setDestinationAddress(resolvedName);
        setDestinationCoords(resolvedCoords);
        setDestinationQuery(resolvedName);

        if (onUpdateTrip) {
          onUpdateTrip({
            id: `trip-${Date.now()}`,
            from: originName,
            to: resolvedName,
            originCoords,
            destinationCoords: resolvedCoords,
            travelMode,
            leaveBy: leaveByTime,
            estDuration: '35 mins',
            status: 'Route Active on Live Map',
            statusType: 'clear',
            weatherOnRoute: 'Active weather monitoring along corridor',
            safetyScore: 85,
            recommendation: `Corridor calculated to ${resolvedName}.`,
            stops: []
          });
        }
      } else {
        setDestinationName(destQuery.trim());
        setDestinationQuery(destQuery.trim());
        setShowPlanTripModal(true);
      }
    } catch (err) {
      console.warn('Quick submit destination error:', err);
      setShowPlanTripModal(true);
    }
  };

  // Recommended Wait Place name when heavy rain
  const recommendedWaitPlace = useMemo(() => {
    const list = Array.isArray(nearbyPlaces) ? nearbyPlaces : [];
    return list.find((p) => p.category === 'cafe' || p.category === 'hotel') || list[0];
  }, [nearbyPlaces]);

  const safeRoutes = Array.isArray(routes) ? routes : [];
  const activeRoute = safeRoutes.find((r) => r.id === activeRouteId) || safeRoutes[0];

  const loadNearbyPlaces = useCallback(async () => {
    const points = activeRoute?.geoPoints || [];
    if ((points.length < 2 && !destinationCoords) || isLoadingNearbyPlaces) return;
    setShowNearbyPlaces(true);
    setIsLoadingNearbyPlaces(true);
    setNearbyPlacesError(null);
    try {
      const response = points.length >= 2
        ? await apiGetPlacesAlongRoute(points)
        : await apiGetNearbyPlaces(destinationCoords![0], destinationCoords![1], 5);
      const adaptedPlaces = response.places.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category as any,
        categoryLabel: p.category_label,
        rating: p.rating,
        reviews: p.reviews,
        distanceMeters: p.distance_meters,
        walkingMinutes: p.walking_minutes,
        address: p.address,
        coords: { x: 500, y: 500, lat: p.latitude, lng: p.longitude },
        openStatus: p.open_status,
        shelterFeature: p.shelter_feature,
        routeRelevance: p.route_relevance,
        phone: p.phone,
        website: p.website,
        openingHours: p.opening_hours,
        distanceFromRouteMeters: typeof p.distance_from_route_km === 'number' ? Math.round(p.distance_from_route_km * 1000) : p.distance_meters,
        distanceFromStartKm: p.distance_from_start_km
      }));
      setNearbyPlaces(adaptedPlaces);
    } catch (error) {
      console.warn('Route amenities unavailable:', error);
      setNearbyPlaces([]);
      setNearbyPlacesError('Route places are temporarily unavailable.');
    } finally {
      setIsLoadingNearbyPlaces(false);
    }
  }, [activeRoute, destinationCoords, isLoadingNearbyPlaces]);

  const handleNearbyCategory = useCallback((category: 'all' | 'cafe' | 'restaurant' | 'hotel' | 'petrol' | 'hospital') => {
    setNearbyCategory(category);
    if (!showNearbyPlaces) void loadNearbyPlaces();
  }, [loadNearbyPlaces, showNearbyPlaces]);

  const handleToggleNearbyPlaces = useCallback(() => {
    if (showNearbyPlaces) {
      setShowNearbyPlaces(false);
    } else {
      void loadNearbyPlaces();
    }
  }, [loadNearbyPlaces, showNearbyPlaces]);

  const handleAnalyzeRouteWithAI = useCallback(async () => {
    if (!activeRoute) return;
    const routeContext: RouteChatContext = {
      origin: originName,
      destination: destinationName,
      originCoords,
      destinationCoords: destinationCoords || undefined,
      safetyScore: activeRoute.safetyScore,
      rainRisk: activeRoute.rainRisk,
      waterloggingRisk: activeRoute.waterloggingRisk,
      thunderstormRisk: activeRoute.thunderstormRisk,
      summaryCondition: activeRoute.summaryCondition,
      bestDepartureTime: departureOptions.find((d) => d.isRecommended)?.time,
      departureAdvice: activeRoute.departureAdvice,
      distanceKm: activeRoute.distanceKm,
      durationMinutes: activeRoute.durationMinutes,
      currentTemperature: activeRoute.waypoints?.[0]?.temp,
      currentWindSpeed: activeRoute.waypoints?.[0]?.windSpeed,
      routeName: activeRoute.name,
      routeType: activeRoute.routeOptionType,
      nearbyPlaces: nearbyPlaces.slice(0, 8).map((place) => ({
        name: place.name,
        category: place.category,
        address: place.address,
        distanceFromRouteMeters: place.distanceFromRouteMeters,
        distanceFromStartKm: place.distanceFromStartKm
      }))
    };
    if (onAnalyzeRouteInChat) {
      onAnalyzeRouteInChat(routeContext, 'Analyze this selected route for live weather, safety risks, best departure time, and practical travel advice.');
      return;
    }
    setExplainModalMode('why-route');
    setAiRouteAnalysis('');
    setIsAiRouteAnalysisLoading(true);
    try {
      const result = await apiSendChat(
        'Analyze this route for weather and travel safety. Explain the risk score, route hazards, whether I should leave now, what to carry, and why this route is recommended. Keep the answer practical and grounded only in the supplied live route data.',
        {
          language,
          role: userRole,
          location: destinationName,
          latitude: destinationCoords?.[0],
          longitude: destinationCoords?.[1],
          route_context: {
            origin: originName,
            destination: destinationName,
            origin_coords: originCoords,
            destination_coords: destinationCoords,
            safety_score: activeRoute.safetyScore,
            rain_risk: activeRoute.rainRisk,
            waterlogging_risk: activeRoute.waterloggingRisk,
            thunderstorm_risk: activeRoute.thunderstormRisk,
            summary_condition: activeRoute.summaryCondition,
            distance_km: activeRoute.distanceKm,
            duration_minutes: activeRoute.durationMinutes,
            departure_advice: activeRoute.departureAdvice,
            route_name: activeRoute.name,
            route_type: activeRoute.routeOptionType,
            nearby_places: nearbyPlaces.slice(0, 8)
          }
        }
      );
      setAiRouteAnalysis(result.response || 'The AI could not return a route analysis right now. Please try again.');
    } catch (error) {
      console.warn('AI route analysis unavailable:', error);
      setAiRouteAnalysis('AI route analysis is temporarily unavailable. The live score and weather factors below are still available.');
    } finally {
      setIsAiRouteAnalysisLoading(false);
    }
  }, [activeRoute, departureOptions, destinationCoords, destinationName, language, nearbyPlaces, onAnalyzeRouteInChat, originCoords, originName, userRole]);

  const handleStartGoogleMapsNavigation = useCallback(() => {
    if (!destinationCoords || !originCoords) return;

    const origin = `${originCoords[0]},${originCoords[1]}`;
    const destination = `${destinationCoords[0]},${destinationCoords[1]}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${travelMode === 'walking' ? 'walking' : 'driving'}`;

    // Use the current PWA window so mobile users are taken directly into the
    // Google Maps directions flow instead of seeing a simulated drive screen.
    if (typeof window !== 'undefined') {
      window.location.assign(mapsUrl);
    }
  }, [destinationCoords, originCoords, travelMode]);

  const handleSelectMapPreset = useCallback((preset: DestinationPreset) => {
    const coords: [number, number] = [preset.coords.lat, preset.coords.lon];
    setDestinationName(preset.name);
    setDestinationAddress(preset.subtitle);
    setDestinationCoords(coords);
    setDestinationQuery(preset.name);
  }, []);

  return (
    <div className="relative w-full min-h-[calc(100vh-68px)] max-w-5xl mx-auto overflow-y-auto pb-24 flex flex-col bg-slate-900 select-none">
      {/* Top Header Tagline & Live Connection Indicator */}
      <div className="relative z-20 bg-slate-900/95 backdrop-blur-md px-3 sm:px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer text-xs font-bold"
              title="Back to Home"
            >
              ←
            </button>
          )}
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
            W
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-xs font-black text-white tracking-wide">
                WeatherGPT Live Map
              </h1>
            <span
                className={`text-[9px] font-black px-1.5 py-0.2 rounded-xs uppercase tracking-wider ${
                  isLive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {isLive ? 'LIVE DATA' : 'DATA UNAVAILABLE'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[140px] sm:max-w-none">
              Source: <strong className="text-slate-300">{dataSource}</strong>
            </p>
          </div>
        </div>

        {/* Right Header Action Controls: Set Destination, Route Chat & Refresh */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={() => setShowPlanTripModal(true)}
            className="px-2.5 sm:px-3 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-extrabold flex items-center space-x-1 sm:space-x-1.5 transition active:scale-95 shadow-xs cursor-pointer"
            title="Set Destination & Plan Commute"
          >
            <Navigation className="w-3.5 h-3.5 text-white fill-white" />
            <span>Set Destination</span>
          </button>

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="px-2 sm:px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-sky-300 border border-blue-500/40 text-[11px] font-bold flex items-center space-x-1 sm:space-x-1.5 transition cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copilot</span>
          </button>

          <button
            onClick={() => setRouteRefreshNonce((value) => value + 1)}
            className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
            title="Refresh Route Weather"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Render Free-Tier Standby Wakeup Banner Notice */}
      {isRenderWakingUp && (
        <div className="relative z-30 bg-blue-900/90 text-blue-100 text-xs px-4 py-2 flex items-center justify-between border-b border-blue-500/50">
          <div className="flex items-center space-x-2">
            <div className="w-3.5 h-3.5 border-2 border-sky-300 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>
              Backend is waking up from standby (takes ~20s on free instance). Real route and radar will load automatically...
            </span>
          </div>
        </div>
      )}

      {/* 3-Step Flow Indicator Banner */}
      {!isNavigating && (
        <div className="relative z-20 bg-slate-900/95 px-3 sm:px-4 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-1.5 sm:space-x-2 w-full overflow-x-auto">
            {/* Step 1: Start Location */}
            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border font-bold shrink-0 transition ${
              originName ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300' : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                originName ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}>
                1
              </span>
              <span>Start location</span>
              {originName && <span className="text-emerald-400 text-xs">✓</span>}
            </div>

            <span className="text-slate-600 font-bold shrink-0">→</span>

            {/* Step 2: Destination */}
            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border font-bold shrink-0 transition ${
              destinationName && destinationCoords
                ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
                : !destinationName && originName
                ? 'bg-sky-950/80 border-sky-500/70 text-sky-200 ring-1 ring-sky-500/40'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                destinationName && destinationCoords
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-sky-500 text-white'
              }`}>
                2
              </span>
              <span>Destination</span>
              {destinationName && destinationCoords && <span className="text-emerald-400 text-xs">✓</span>}
            </div>

            <span className="text-slate-600 font-bold shrink-0">→</span>

            {/* Step 3: View Route and Weather */}
            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border font-bold shrink-0 transition ${
              destinationName && destinationCoords && safeRoutes.length > 0
                ? 'bg-blue-600/30 border-blue-500/60 text-sky-200'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                destinationName && destinationCoords && safeRoutes.length > 0
                  ? 'bg-blue-500 text-white shadow-xs'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                3
              </span>
              <span>View route and weather</span>
            </div>
          </div>
        </div>
      )}

      {/* Dual Origin & Destination Search Bar */}
      {!isNavigating && (
        <SearchAndDestinations
          originQuery={originQuery}
          onOriginChange={setOriginQuery}
          originCoords={originCoords}
          destinationQuery={destinationQuery}
          onDestinationChange={setDestinationQuery}
          destinationCoords={destinationCoords || undefined}
          isOpen={isSearchOpen}
          onOpen={() => setIsSearchOpen(true)}
          onClose={() => setIsSearchOpen(false)}
          onSelectOriginPreset={(item) => {
            setOriginName(item.name);
            setOriginCoords([item.coords?.lat ?? item.lat, item.coords?.lon ?? item.lon]);
            setOriginQuery(item.name);
            setOriginAddress(item.address || item.name);
          }}
          onSelectDestinationPreset={(item) => {
            setDestinationName(item.name);
            setDestinationCoords([item.coords?.lat ?? item.lat, item.coords?.lon ?? item.lon]);
            setDestinationQuery(item.name);
            setDestinationAddress(item.address || item.name);
          }}
          originAddress={originAddress}
          destinationAddress={destinationAddress}
          presets={DESTINATION_PRESETS}
          currentLocationName={originName}
          selectedDestinationName={destinationName}
          onClearDestination={() => {
            setDestinationName('');
            setDestinationQuery('');
            setDestinationAddress('');
            setDestinationCoords(null);
            setRouteError('');
            setRoutes([]);
            setActiveRouteId('');
          }}
          onUseGps={handleGpsLocationClick}
          isLocating={isLocating}
          gpsPermissionNotice={gpsPermissionNotice}
          onDismissGpsNotice={() => setGpsPermissionNotice(null)}
          travelMode={travelMode}
          onChangeTravelMode={setTravelMode}
          onSwapLocations={handleSwapLocations}
          onOpenPlanTripModal={() => setShowPlanTripModal(true)}
          onSubmitDestination={handleQuickSubmitDestination}
          onSavePlace={onSavePlace}
          savedPlaceNames={savedPlaces.map((place) => place.name)}
        />
      )}

      {onSaveRoute && destinationCoords && activeRoute && !isNavigating && (
        <div className="relative z-20 px-3 pt-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => onSaveRoute({
              id: activeRoute.id,
              from: originName,
              to: destinationName,
              originCoords,
              destinationCoords,
              travelMode,
              leaveBy: leaveByTime,
              estDuration: `${Math.round(activeRoute.durationMinutes)} mins`,
              status: activeRoute.badge,
              statusType: activeRoute.color === 'green' ? 'clear' : 'rain',
              weatherOnRoute: activeRoute.summaryCondition,
              safetyScore: activeRoute.safetyScore,
              recommendation: activeRoute.departureAdvice,
              stops: [],
              alternativeAdvice: activeRoute.whyThisRoute
            })}
            className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold border border-slate-700 hover:bg-slate-800 transition cursor-pointer"
          >
            ★ Save this route for later
          </button>
        </div>
      )}

      {/* Main Interactive Leaflet Map Canvas or Placeholder */}
      {/* The map is a distinct first section. Details flow below it so the
          user can scroll naturally instead of having the drawer cover the map. */}
      <div className="relative w-full h-[68vh] min-h-[480px] max-h-[720px] flex-none overflow-hidden flex flex-col">
        {destinationName.trim().length > 0 || isNavigating ? (
          <>
            <InteractiveMapCanvas
              routes={safeRoutes}
              activeRouteId={activeRouteId}
              onSelectRoute={setActiveRouteId}
              destinationName={destinationName}
              originName={originName}
              isNavigating={isNavigating}
              vehicleProgress={vehicleProgress}
              showNearbyPlaces={showNearbyPlaces}
              onToggleNearbyPlaces={handleToggleNearbyPlaces}
              onNearbyCategory={handleNearbyCategory}
              nearbyPlaces={nearbyPlaces}
              selectedNearbyPlace={selectedNearbyPlace}
              onSelectNearbyPlace={setSelectedNearbyPlace}
              showRadarOverlay={showRadarOverlay}
              onToggleRadar={() => setShowRadarOverlay(!showRadarOverlay)}
              weatherLayerType={weatherLayerType}
              onChangeWeatherLayer={setWeatherLayerType}
              onMapClick={handleMapClick}
              onRoutePointClick={handleRoutePointClick}
              originCoords={originCoords}
              destinationCoords={destinationCoords || undefined}
              gpsCoords={gpsCoords}
              isRouteLoading={isAnalyzing}
              routeError={routeError}
              destinationPresets={DESTINATION_PRESETS}
              onSelectDestinationPreset={handleSelectMapPreset}
              onOpenSearch={() => setIsSearchOpen(true)}
              onAnalyzeRoute={handleAnalyzeRouteWithAI}
              onStartNavigation={handleStartGoogleMapsNavigation}
              onUseCurrentLocation={handleGpsLocationClick}
              onClearDestination={() => {
                setDestinationName('');
                setDestinationQuery('');
                setDestinationAddress('');
                setDestinationCoords(null);
                setRouteError('');
                setRoutes([]);
                setActiveRouteId('');
              }}
            />

            {/* Map Point Weather Popup (When any point or waypoint is clicked) */}
            <MapWeatherPopup
              weather={selectedPointWeather}
              isLoading={isFetchingPointWeather}
              language={language}
              onClose={() => setSelectedPointWeather(null)}
              onSetAsOrigin={(pt) => {
                setOriginName(pt.name);
                setOriginCoords([pt.lat, pt.lng]);
                setOriginQuery(pt.name);
                setSelectedPointWeather(null);
              }}
              onSetAsDestination={(pt) => {
                setDestinationName(pt.name);
                setDestinationCoords([pt.lat, pt.lng]);
                setDestinationQuery(pt.name);
                setSelectedPointWeather(null);
              }}
            />

            {/* Route-Specific Conversational Chat Drawer */}
            <RouteChatDrawer
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              language={language}
              userRole={userRole}
              routeContext={{
                origin: originName,
                destination: destinationName,
                safetyScore: activeRoute?.safetyScore,
                rainRisk: activeRoute?.rainRisk,
                waterloggingRisk: activeRoute?.waterloggingRisk,
                summaryCondition: activeRoute?.summaryCondition,
                bestDepartureTime: departureOptions.find((d) => d.isRecommended)?.time,
                distanceKm: activeRoute?.distanceKm,
                durationMinutes: activeRoute?.durationMinutes,
                destinationCoords: destinationCoords || undefined,
                currentTemperature: activeRoute?.waypoints?.[0]?.temp,
                currentWindSpeed: activeRoute?.waypoints?.[0]?.windSpeed,
                nearbyPlaces: nearbyPlaces.slice(0, 30).map((place) => ({
                  name: place.name,
                  category: place.category,
                  address: place.address,
                  distanceFromRouteMeters: place.distanceFromRouteMeters,
                  distanceFromStartKm: place.distanceFromStartKm,
                  openStatus: place.openStatus,
                  phone: place.phone,
                }))
              }}
            />
          </>
        ) : (
          /* Simple Map Placeholder before selecting destination */
          <div className="relative flex-1 w-full flex flex-col items-center justify-center p-6 text-center select-none bg-slate-900">
            <div className="max-w-md w-full p-8 rounded-3xl bg-slate-800/80 border border-slate-700/80 shadow-2xl backdrop-blur-md flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-3xl mb-4 shadow-lg text-sky-400">
                🗺️
              </div>
              <h2 className="text-lg font-black text-white tracking-wide mb-1.5">
                Your map will appear here
              </h2>
              <p className="text-sm font-semibold text-slate-300 mb-5">
                Choose a start and destination above.
              </p>

              <div className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-slate-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block" />
                <span>Search an Indian location above and click <strong className="text-white">Show route</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {destinationName && showNearbyPlaces && (safeRoutes.length > 0 || isLoadingNearbyPlaces) && (
        <RouteAmenitiesPanel
          places={nearbyPlaces}
          loading={isLoadingNearbyPlaces}
          error={nearbyPlacesError}
          onSelectPlace={setSelectedNearbyPlace}
          onUseAsStop={(place) => {
            setSelectedNearbyPlace(place);
            setDestinationName(place.name);
            setDestinationQuery(place.name);
            if (place.coords?.lat !== undefined && place.coords?.lng !== undefined) {
              setDestinationCoords([place.coords.lat, place.coords.lng]);
            }
          }}
        />
      )}

      {/* Sequential Route Analysis Loader */}
      {isAnalyzing && (
        <RouteAnalysisLoading
          destinationName={destinationName}
          onComplete={() => setIsAnalyzing(false)}
        />
      )}

      {/* Route Comparison Bottom Drawer */}
      {false && destinationName && !isNavigating && safeRoutes.length > 0 && (
        <RouteComparisonDrawer
          routes={safeRoutes}
          activeRouteId={activeRouteId}
          onSelectRoute={setActiveRouteId}
          departureOptions={departureOptions}
          originName={originName}
          destinationName={destinationName}
          language={language}
          onChangeLanguage={setLanguage}
          userRole={userRole}
          currentWeather={currentWeather}
          isWeatherLoading={isAnalyzing}
          onStartNavigation={() => {
            handleStartGoogleMapsNavigation();
          }}
          onActivateSmartWait={(mins) => {
            setSmartWaitMinutes(mins);
            setIsSmartWaitActive(true);
          }}
          onOpenWhyRoute={handleAnalyzeRouteWithAI}
          onOpenTimeline={() => setShowTimelineModal(true)}
          onOpenNearby={() => { void loadNearbyPlaces(); }}
          isExpanded={isDrawerExpanded}
          onToggleExpand={() => setIsDrawerExpanded(!isDrawerExpanded)}
          onOpenChat={() => setIsChatOpen(true)}
          isLive={isLive}
          dataSource={dataSource}
          recommendedWaitPlaceName={recommendedWaitPlace?.name}
          routeSteps={routeSteps}
        />
      )}

      {/* Nearby Safe Places Drawer */}
      <NearbyPlacesDrawer
        places={nearbyPlaces}
        isOpen={showNearbyPlaces}
        onClose={() => setShowNearbyPlaces(false)}
        onSelectPlace={(place) => {
          setSelectedNearbyPlace(place);
          setShowNearbyPlaces(false);
        }}
        onUseAsStop={(place) => {
          setSelectedNearbyPlace(place);
          setShowNearbyPlaces(false);
          // Set as intermediate destination or destination
          setDestinationName(place.name);
          if (place.coords?.lat && place.coords?.lng) {
            setDestinationCoords([place.coords.lat, place.coords.lng]);
          }
        }}
        selectedPlaceId={selectedNearbyPlace?.id}
        initialFilter={nearbyCategory}
      />

      {/* Smart Wait Mode Overlay */}
      {isSmartWaitActive && (
        <SmartWaitModeOverlay
          initialMinutes={smartWaitMinutes}
          onCancel={() => setIsSmartWaitActive(false)}
          onStartNavigation={() => {
            setIsSmartWaitActive(false);
            handleStartGoogleMapsNavigation();
          }}
          onOpenNearby={() => { void loadNearbyPlaces(); }}
          nearbyPlaces={nearbyPlaces}
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
          onReroute={() => setActiveRouteId('route-safest')}
        />
      )}

      {/* Route Weather Timeline Modal */}
      <RouteWeatherTimelineModal
        route={activeRoute}
        isOpen={showTimelineModal}
        language={language}
        onClose={() => setShowTimelineModal(false)}
      />

      {/* Explainable AI Modal */}
      <ExplainableAIModal
        route={activeRoute}
        isOpen={explainModalMode !== null}
        onClose={() => setExplainModalMode(null)}
        mode={explainModalMode || 'why-route'}
        aiExplanation={aiRouteAnalysis}
        isAiLoading={isAiRouteAnalysisLoading}
      />

      {/* Set Destination & Plan Trip Modal */}
      <LiveMapPlanTripModal
        isOpen={showPlanTripModal}
        onClose={() => setShowPlanTripModal(false)}
        currentOriginName={originName}
        currentOriginCoords={originCoords}
        currentDestinationName={destinationName}
        currentDestinationCoords={destinationCoords}
        currentTravelMode={travelMode}
        currentLeaveBy={leaveByTime}
        onSetRoute={handleSetRouteFromModal}
      />
    </div>
  );
};

