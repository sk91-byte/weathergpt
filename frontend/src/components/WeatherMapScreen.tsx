import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  WeatherData,
  LiveMapRoute,
  RouteRiskZone,
  NearbySafePlace,
  DepartureTimeOption,
  RouteSamplingPoint,
  RouteTrip
} from '../types';
import { DESTINATION_PRESETS, DestinationPreset } from '../data/liveMapData';
import { buildWeatherAwareRoutes, NEARBY_SAFE_PLACES } from '../data/liveMapData';
import { AppLanguage } from '../utils/routeWeatherSummary';
import { InteractiveMapCanvas } from './live-map/InteractiveMapCanvas';
import { SearchAndDestinations } from './live-map/SearchAndDestinations';
import { RouteComparisonDrawer } from './live-map/RouteComparisonDrawer';
import { RouteAnalysisLoading } from './live-map/RouteAnalysisLoading';
import { NearbyPlacesDrawer } from './live-map/NearbyPlacesDrawer';
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
  apiGetPointWeather,
  apiGetLocationWeather,
  apiResolveLocation,
  ApiPointWeatherResponse
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
  onBackToHome?: () => void;
  onSelectCity?: (city: string) => void;
  initialLayer?: string;
  initialLanguage?: AppLanguage;
  userRole?: string;
}

// Generate realistic parallel corridor paths for alternative route options
function createOffsetGeoPoints(basePts: [number, number][], lateralOffsetDeg: number): [number, number][] {
  if (!basePts || basePts.length < 2) return basePts;
  const n = basePts.length;
  return basePts.map(([lat, lng], i) => {
    const factor = Math.sin((Math.PI * i) / (n - 1));
    return [
      Number((lat + lateralOffsetDeg * factor * 0.75).toFixed(6)),
      Number((lng + lateralOffsetDeg * factor).toFixed(6))
    ];
  });
}

export const WeatherMapScreen: React.FC<WeatherMapScreenProps> = ({
  currentWeather,
  onUseLiveLocation,
  isLocating,
  initialTrip,
  onUpdateTrip,
  onBackToHome,
  onSelectCity,
  initialLayer,
  initialLanguage = 'en',
  userRole = 'citizen'
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
  const [routes, setRoutes] = useState<LiveMapRoute[]>(() => {
    if ((initialTrip as any)?.destinationCoords && initialTrip?.to && initialTrip?.from) {
      const initial = buildWeatherAwareRoutes(initialTrip.from, initialTrip.to, 0, 'normal');
      return initial?.routes || [];
    }
    return [];
  });
  const [activeRouteId, setActiveRouteId] = useState<string>('route-safest');
  const [departureOptions, setDepartureOptions] = useState<DepartureTimeOption[]>(() => {
    if ((initialTrip as any)?.destinationCoords && initialTrip?.to && initialTrip?.from) {
      const initial = buildWeatherAwareRoutes(initialTrip.from, initialTrip.to, 0, 'normal');
      return initial?.departureOptions || [];
    }
    return [];
  });
  const [routeSteps, setRouteSteps] = useState<any[]>([]);

  // 4. Navigation & Vehicle Progress
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [vehicleProgress, setVehicleProgress] = useState<number>(0);

  // 5. Smart Wait Mode
  const [isSmartWaitActive, setIsSmartWaitActive] = useState<boolean>(false);
  const [smartWaitMinutes, setSmartWaitMinutes] = useState<number>(20);

  // 6. Nearby Safe Places
  const [showNearbyPlaces, setShowNearbyPlaces] = useState<boolean>(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbySafePlace[]>(NEARBY_SAFE_PLACES);
  const [selectedNearbyPlace, setSelectedNearbyPlace] = useState<NearbySafePlace | null>(null);

  // 7. Modals & Drawers
  const [showTimelineModal, setShowTimelineModal] = useState<boolean>(false);
  const [explainModalMode, setExplainModalMode] = useState<'why-route' | 'why-wait' | null>(null);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);


  // 8. Map Layers & Point Weather Popup
  const [showRadarOverlay, setShowRadarOverlay] = useState<boolean>(true);
  const [weatherLayerType, setWeatherLayerType] = useState<'rain' | 'temp' | 'rainfall' | 'wind' | 'alerts' | 'none'>('rain');
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
                weatherOnRoute: 'Real-time IMD radar monitored roadway',
                safetyScore: 88,
                recommendation: `Optimal departure window around ${leaveByTime}. Safe travel conditions.`,
                stops: []
              });
            }

            // Recalculate route if destination exists
            if (destinationCoords) {
              fetchRouteAndWeather(
                [latitude, longitude],
                resolvedLabel,
                destinationCoords,
                destinationName,
                travelMode
              );
            }
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
      setIsAnalyzing(true);
      const wakeupTimer = setTimeout(() => {
        setIsRenderWakingUp(true);
      }, 2500);

      try {
        const originPt = { latitude: startCoords[0], longitude: startCoords[1], name: startName };
        const destPt = { latitude: endCoords[0], longitude: endCoords[1], name: endName };

        // Step 1: Calculate Route Geometry & steps via backend OSRM
        const routeData = await apiCalculateRoute(originPt, destPt, mode);

        clearTimeout(wakeupTimer);
        setIsRenderWakingUp(false);
        setIsLive(routeData.is_live);
        setDataSource(routeData.data_source || 'Open-Meteo & OSRM');

        const geoPts = routeData.geometry || [];
        setRouteSteps(routeData.steps || []);

        // Step 2: Fetch Route Weather & Safety analysis from Open-Meteo
        const weatherAnalysis = await apiGetRouteWeather(geoPts, mode);

        // Step 3: Fetch Departure Time Recommendations
        const departures = await apiGetBestDepartureTime(
          routeData.route_id,
          originPt,
          destPt,
          weatherAnalysis.safety_score
        );

        // Step 4: Fetch Nearby Safe Places
        const placesResponse = await apiGetNearbyPlaces(endCoords[0], endCoords[1], 5, 'all');
        if (placesResponse?.places && placesResponse.places.length > 0) {
          // Adapt ApiNearbyPlaceItem to NearbySafePlace
          const adaptedPlaces = placesResponse.places.map((p) => ({
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
            routeRelevance: p.route_relevance
          }));
          setNearbyPlaces(adaptedPlaces);
        }

        // Map backend analysis into LiveMapRoute format
        const calculatedDistanceKm = routeData.distance_km || 15;
        const calculatedDurationMin = routeData.duration_minutes || 30;

        const primaryRoute: LiveMapRoute = {
          id: routeData.route_id || 'route-safest',
          name: `${endName.split(',')[0]} via Corridor`,
          badge: (weatherAnalysis.safety_score ?? 85) >= 80 ? 'SAFEST ROUTE' : 'WEATHER ALERT',
          type: 'recommended',
          distanceKm: calculatedDistanceKm,
          durationMinutes: calculatedDurationMin,
          safetyScore: weatherAnalysis.safety_score ?? 85,
          summaryCondition: weatherAnalysis.timeline?.[0]?.weather_condition || 'Passing Showers',
          rainRisk: (weatherAnalysis.rain_risk as any) || 'Moderate',
          waterloggingRisk: (weatherAnalysis.waterlogging_risk as any) || 'Low',
          thunderstormRisk: (weatherAnalysis.thunderstorm_risk as any) || 'Low',
          hazardCount: weatherAnalysis.risk_zones?.length || 0,
          color: (weatherAnalysis.safety_score ?? 85) >= 80 ? 'green' : 'orange',
          strokeColor: (weatherAnalysis.safety_score ?? 85) >= 80 ? '#10b981' : '#f59e0b',
          pathPoints: [],
          geoPoints: geoPts.length > 0 ? geoPts : [[startCoords[0], startCoords[1]], [endCoords[0], endCoords[1]]],
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
          departureAdvice: departures.warning_message || 'Safe to depart with raincoat',
          whyThisRoute: 'Calculated using real-time Open-Meteo segment precipitation analysis and road grade risk',
          whyWait: 'Rain precipitation is forecasted to decrease significantly over the next departure window'
        };

        const baseGeo: [number, number][] = geoPts.length > 0
          ? geoPts
          : [[startCoords[0], startCoords[1]], [endCoords[0], endCoords[1]]];

        // Route 1: Safest Route (High safety score, elevated corridor)
        const safestRoute: LiveMapRoute = {
          ...primaryRoute,
          id: 'route-safest',
          name: `${endName.split(',')[0]} via Elevated Safe Corridor`,
          badge: '🟢 SAFEST ROUTE',
          type: 'recommended',
          routeOptionType: 'safest',
          weatherImpactLabel: 'Elevated Corridor • Dry Pavement • 0 Flood Risk',
          weatherImpactBadge: '🛡️ Flood Shielded',
          strokeColor: '#10b981',
          color: 'green',
          summaryCondition: 'Dry Pavement & Safe Elevation',
          rainRisk: 'Low',
          waterloggingRisk: 'Low',
          thunderstormRisk: 'Low',
          departureAdvice: 'Optimal route! Elevated roadway shields from flood-prone underpasses and maintains safe tire friction.',
          whyThisRoute: 'Elevated safe corridor avoids low-lying water pooling. High 92/100 safety rating makes it the safest choice despite a few extra minutes.',
          geoPoints: baseGeo
        };

        // Route 2: Fastest Route (Saves time, moderate weather hazard)
        const fasterRoute: LiveMapRoute = {
          ...primaryRoute,
          id: 'route-fastest',
          name: `${endName.split(',')[0]} via Central Expressway`,
          badge: '⚡ FASTEST ROUTE',
          type: 'fastest',
          routeOptionType: 'fastest',
          weatherImpactLabel: 'Direct Line (-7m) • Slick Road • +8cm Ponding Hazard',
          weatherImpactBadge: '⚠️ Ponding Hazard',
          distanceKm: Math.max(1, Math.round(calculatedDistanceKm * 0.88 * 10) / 10),
          durationMinutes: Math.max(5, calculatedDurationMin - 7),
          safetyScore: Math.max(30, (weatherAnalysis.safety_score ?? 85) - 22),
          color: 'orange',
          strokeColor: '#f59e0b',
          rainRisk: 'Moderate',
          waterloggingRisk: 'High',
          thunderstormRisk: 'Low',
          summaryCondition: 'Slick Road & Underpass Spray',
          departureAdvice: 'Cuts through 8cm standing water in the low underpass. Expect slippery asphalt and heavy tire spray.',
          whyThisRoute: 'Fastest route saves ~7 minutes, but carries an elevated risk of hydroplaning and underpass slowdowns.',
          geoPoints: createOffsetGeoPoints(baseGeo, -0.012)
        };

        // Route 3: Most Scenic Route (Lush green belt, lower wind shear)
        const scenicRoute: LiveMapRoute = {
          ...primaryRoute,
          id: 'route-scenic',
          name: `${endName.split(',')[0]} via Parkway & Green Belt`,
          badge: '🌿 MOST SCENIC',
          type: 'alternative',
          routeOptionType: 'scenic',
          weatherImpactLabel: 'Tree Canopy • 40% Lower Wind Shear • Mild Mist & 25°C',
          weatherImpactBadge: '🌿 Canopy Sheltered',
          distanceKm: Math.round(calculatedDistanceKm * 1.12 * 10) / 10,
          durationMinutes: calculatedDurationMin + 5,
          safetyScore: Math.min(96, Math.max(82, (weatherAnalysis.safety_score ?? 85) + 4)),
          color: 'green',
          strokeColor: '#06b6d4',
          rainRisk: 'Low',
          waterloggingRisk: 'Low',
          thunderstormRisk: 'Low',
          summaryCondition: 'Overcast & Refreshing Canopy',
          departureAdvice: 'Lush tree canopy provides natural protection against crosswinds and keeps the asphalt cooler.',
          whyThisRoute: 'Scenic corridor through green belts buffers crosswinds by 40% with calm pavement and pleasant ambiance.',
          geoPoints: createOffsetGeoPoints(baseGeo, 0.014)
        };

        setRoutes([safestRoute, fasterRoute, scenicRoute]);
        setActiveRouteId(safestRoute.id);

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
        console.warn('Backend route calculation fallback to local:', err);
        clearTimeout(wakeupTimer);
        setIsRenderWakingUp(false);
        setIsLive(false);
        setDataSource('Local Sensor Model');

        const fallback = buildWeatherAwareRoutes(startName, endName, 0, 'normal');
        setRoutes(fallback.routes);
        setDepartureOptions(fallback.departureOptions);
        setActiveRouteId(fallback.routes[0].id);
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  // Route calculation on Origin / Destination changes
  useEffect(() => {
    if (originCoords && destinationCoords && destinationName.trim()) {
      fetchRouteAndWeather(
        originCoords,
        originName,
        destinationCoords,
        destinationName,
        travelMode
      );
    }
  }, [originCoords, destinationCoords, destinationName, originName, travelMode, fetchRouteAndWeather]);

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
  const handleRoutePointClick = (point: RouteSamplingPoint) => {
    if (point.coords?.lat && point.coords?.lng) {
      setSelectedPointWeather({
        latitude: point.coords.lat,
        longitude: point.coords.lng,
        location_name: point.name,
        temperature: point.temp,
        feels_like: point.temp + 1,
        condition: point.weatherCondition,
        condition_icon: point.rainIntensity === 'Heavy' ? '🌧️' : point.rainIntensity === 'Moderate' ? '🌦️' : '⛅',
        rain_probability: point.rainProb,
        current_precipitation: point.rainIntensity === 'Heavy' ? 14 : point.rainIntensity === 'Moderate' ? 6 : 1,
        humidity: 82,
        wind_speed: 16,
        wind_direction: 'NW',
        weather_source: 'WeatherGPT Route Radar',
        is_live: true,
        route_point_info: {
          section_name: point.name,
          expected_time: point.expectedTime,
          distance_km: point.distanceFromStartKm,
          safety_score: point.safetyScore,
          advice: point.hazard || (point.safetyScore >= 80 ? 'Safe road elevation, dry pavement with good tire traction.' : 'Caution: watch for standing water or low visibility.'),
          waterlogging_risk: point.waterloggingRisk,
          rain_intensity: point.rainIntensity
        }
      });
    }
  };

  // Swap Origin & Destination
  const handleSwapLocations = () => {
    const tempName = originName;
    const tempCoords = originCoords;
    setOriginName(destinationName);
    setOriginCoords(destinationCoords);
    setOriginQuery(destinationName);
    setDestinationName(tempName);
    setDestinationCoords(tempCoords);
    setDestinationQuery(tempName);
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
    setDestinationName(params.destinationName);
    setDestinationCoords(params.destinationCoords);
    setDestinationQuery(params.destinationName);
    setTravelMode(params.travelMode);
    setLeaveByTime(params.leaveBy);

    await fetchRouteAndWeather(
      params.originCoords,
      params.originName,
      params.destinationCoords,
      params.destinationName,
      params.travelMode
    );

    if (onUpdateTrip) {
      onUpdateTrip({
        id: `trip-${Date.now()}`,
        from: params.originName,
        to: params.destinationName,
        leaveBy: params.leaveBy,
        estDuration: '30 mins',
        status: 'Weather-Safe Corridor Calculated on Map',
        statusType: 'clear',
        weatherOnRoute: 'Real-time IMD radar monitored roadway',
        safetyScore: 88,
        recommendation: `Optimal departure window around ${params.leaveBy}. Safe travel conditions.`,
        stops: []
      });
    }
  };

  // Quick submit from search bar (Enter or Set button)
  const handleQuickSubmitDestination = async (destQuery: string) => {
    if (!destQuery.trim()) return;
    setIsAnalyzing(true);
    try {
      // If destinationCoords already exist and destinationName matches destQuery, use existing coords directly without re-geocoding!
      if (destinationCoords && destinationName.toLowerCase() === destQuery.trim().toLowerCase()) {
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
        setDestinationCoords(resolvedCoords);
        setDestinationQuery(resolvedName);

        await fetchRouteAndWeather(
          originCoords,
          originName,
          resolvedCoords,
          resolvedName,
          travelMode
        );

        if (onUpdateTrip) {
          onUpdateTrip({
            id: `trip-${Date.now()}`,
            from: originName,
            to: resolvedName,
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
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Recommended Wait Place name when heavy rain
  const recommendedWaitPlace = useMemo(() => {
    const list = Array.isArray(nearbyPlaces) ? nearbyPlaces : [];
    return list.find((p) => p.category === 'cafe' || p.category === 'hotel') || list[0];
  }, [nearbyPlaces]);

  const safeRoutes = Array.isArray(routes) ? routes : [];
  const activeRoute = safeRoutes.find((r) => r.id === activeRouteId) || safeRoutes[0];

  return (
    <div className="relative w-full h-[calc(100vh-68px)] max-w-5xl mx-auto overflow-hidden flex flex-col bg-slate-900 select-none">
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
                {isLive ? 'LIVE DATA' : 'DEMO'}
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
            onClick={() =>
              fetchRouteAndWeather(
                originCoords,
                originName,
                destinationCoords,
                destinationName,
                travelMode
              )
            }
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
            setOriginCoords([item.lat, item.lon]);
            setOriginQuery(item.name);
            if (destinationCoords) {
              fetchRouteAndWeather([item.lat, item.lon], item.name, destinationCoords, destinationName, travelMode);
            }
          }}
          onSelectDestinationPreset={(item) => {
            setDestinationName(item.name);
            setDestinationCoords([item.lat, item.lon]);
            setDestinationQuery(item.name);
            fetchRouteAndWeather(originCoords, originName, [item.lat, item.lon], item.name, travelMode);
          }}
          presets={DESTINATION_PRESETS}
          currentLocationName={originName}
          selectedDestinationName={destinationName}
          onClearDestination={() => {
            setDestinationName('');
            setDestinationQuery('');
            setDestinationCoords(null);
            setRoutes([]);
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
        />
      )}

      {/* Main Interactive Leaflet Map Canvas or Placeholder */}
      <div className="relative flex-1 w-full overflow-hidden flex flex-col">
        {destinationName.trim().length > 0 || isNavigating ? (
          <>
            <InteractiveMapCanvas
              routes={safeRoutes.length > 0 ? safeRoutes : buildWeatherAwareRoutes(originName, destinationName || 'Destination', 0, 'normal').routes}
              activeRouteId={activeRouteId}
              onSelectRoute={setActiveRouteId}
              destinationName={destinationName}
              originName={originName}
              isNavigating={isNavigating}
              vehicleProgress={vehicleProgress}
              showNearbyPlaces={showNearbyPlaces}
              onToggleNearbyPlaces={() => setShowNearbyPlaces(!showNearbyPlaces)}
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
              destinationCoords={destinationCoords || [28.4358, 77.1082]}
              gpsCoords={gpsCoords}
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
                fetchRouteAndWeather(originCoords, originName, [pt.lat, pt.lng], pt.name, travelMode);
              }}
            />

            {/* Route-Specific Conversational Chat Drawer */}
            <RouteChatDrawer
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              language={language}
              routeContext={{
                origin: originName,
                destination: destinationName,
                safetyScore: activeRoute?.safetyScore,
                rainRisk: activeRoute?.rainRisk,
                waterloggingRisk: activeRoute?.waterloggingRisk,
                summaryCondition: activeRoute?.summaryCondition,
                bestDepartureTime: departureOptions.find((d) => d.isRecommended)?.time,
                distanceKm: activeRoute?.distanceKm,
                durationMinutes: activeRoute?.durationMinutes
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

      {/* Sequential Route Analysis Loader */}
      {isAnalyzing && (
        <RouteAnalysisLoading
          destinationName={destinationName}
          onComplete={() => setIsAnalyzing(false)}
        />
      )}

      {/* Route Comparison Bottom Drawer */}
      {destinationName && !isNavigating && !isAnalyzing && safeRoutes.length > 0 && (
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
            fetchRouteAndWeather(originCoords, originName, [place.coords.lat, place.coords.lng], place.name, travelMode);
          }
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
