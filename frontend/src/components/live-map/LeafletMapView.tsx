import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import L from 'leaflet';
import { LiveMapRoute, RouteRiskZone, NearbySafePlace, RouteSamplingPoint } from '../../types';

export interface LeafletMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: (lat?: number, lon?: number) => void;
  recenterRoute: () => void;
}

interface LeafletMapViewProps {
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
  onSelectRiskZone: (zone: RouteRiskZone) => void;
  tileLayerType: 'streets' | 'satellite' | 'dark';
  weatherLayerType?: 'rain' | 'temp' | 'rainfall' | 'wind' | 'alerts' | 'none';
  onMapClick?: (lat: number, lon: number) => void;
  onRoutePointClick?: (point: RouteSamplingPoint) => void;
  originCoords?: [number, number];
  destinationCoords?: [number, number];
  gpsCoords?: [number, number] | null;
}

export function toValidLatLng(coords: any, fallback: [number, number] = [28.472, 77.125]): [number, number] {
  if (!coords) return fallback;
  let lat: any;
  let lon: any;
  if (Array.isArray(coords)) {
    lat = coords[0];
    lon = coords[1];
  } else if (typeof coords === 'object' && coords !== null) {
    lat = coords.lat ?? coords.latitude;
    lon = coords.lng ?? coords.lon ?? coords.longitude;
  }
  const nLat = Number(lat);
  const nLon = Number(lon);
  if (typeof nLat === 'number' && typeof nLon === 'number' && !isNaN(nLat) && !isNaN(nLon)) {
    return [nLat, nLon];
  }
  return fallback;
}

export function isValidLatLng(coords: any): boolean {
  if (!coords) return false;
  let lat: any;
  let lon: any;
  if (Array.isArray(coords)) {
    lat = coords[0];
    lon = coords[1];
  } else if (typeof coords === 'object' && coords !== null) {
    lat = coords.lat ?? coords.latitude;
    lon = coords.lng ?? coords.lon ?? coords.longitude;
  }
  const nLat = Number(lat);
  const nLon = Number(lon);
  return typeof nLat === 'number' && typeof nLon === 'number' && !isNaN(nLat) && !isNaN(nLon);
}

export const LeafletMapView = forwardRef<LeafletMapHandle, LeafletMapViewProps>(({
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
  onSelectRiskZone,
  tileLayerType,
  weatherLayerType = 'rain',
  onMapClick,
  onRoutePointClick,
  originCoords,
  destinationCoords,
  gpsCoords
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const weatherLayerRef = useRef<L.TileLayer | L.LayerGroup | null>(null);
  const elementsLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Expose Zoom and Recenter controls to parent canvas
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (mapRef.current) {
        mapRef.current.zoomIn();
      }
    },
    zoomOut: () => {
      if (mapRef.current) {
        mapRef.current.zoomOut();
      }
    },
    recenter: (lat?: number, lon?: number) => {
      if (mapRef.current) {
        const target = (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon))
          ? [lat, lon] as [number, number]
          : toValidLatLng(originCoords, [28.472, 77.125]);
        mapRef.current.setView(target, 14, { animate: true });
      }
    },
    recenterRoute: () => {
      if (mapRef.current && routes.length > 0) {
        const active = routes.find((r) => r.id === activeRouteId) || routes[0];
        if (active && active.geoPoints && active.geoPoints.length > 1) {
          const validPts = active.geoPoints
            .map((pt) => (isValidLatLng(pt) ? toValidLatLng(pt) : null))
            .filter((pt): pt is [number, number] => pt !== null);
          if (validPts.length > 1) {
            try {
              const bounds = L.latLngBounds(validPts);
              if (bounds.isValid()) {
                mapRef.current.fitBounds(bounds, { padding: [55, 55], animate: true });
              }
            } catch (e) {
              console.warn('fitBounds error:', e);
            }
          }
        }
      }
    }
  }));

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter = toValidLatLng(originCoords, [28.472, 77.125]);

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    mapRef.current = map;
    elementsLayerGroupRef.current = L.layerGroup().addTo(map);

    // Map click handler for point weather
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    // Invalidate size after mount so tiles load completely
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Base Tile Layer (Streets / Satellite / Dark)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let subdomains = 'abc';
    let maxZoom = 19;
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    if (tileLayerType === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      subdomains = '';
      maxZoom = 18;
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    } else if (tileLayerType === 'dark') {
      url = 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png';
      subdomains = 'abcd';
      maxZoom = 19;
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
    }

    const newLayer = L.tileLayer(url, {
      subdomains,
      maxZoom,
      attribution
    }).addTo(map);

    baseLayerRef.current = newLayer;
  }, [tileLayerType]);

  // Update Weather Layers (Rain Radar / Temp / Rainfall / Wind / Alerts)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (weatherLayerRef.current) {
      map.removeLayer(weatherLayerRef.current);
      weatherLayerRef.current = null;
    }

    if (showRadarOverlay && (weatherLayerType === 'rain' || weatherLayerType === 'rainfall')) {
      // RainViewer live radar
      const radar = L.tileLayer(
        'https://tilecache.rainviewer.com/v2/radar/nowcast_5/256/{z}/{x}/{y}/2/1_1.png',
        {
          opacity: 0.65,
          maxNativeZoom: 12,
          maxZoom: 19,
          zIndex: 400
        }
      ).addTo(map);
      weatherLayerRef.current = radar;
    }

    // Do not render synthetic temperature, rainfall, wind or alert badges.
    // Those values must come from a real provider before they are shown.
    if (weatherLayerType !== 'rainfall' && weatherLayerType !== 'temp' && weatherLayerType !== 'wind' && weatherLayerType !== 'alerts') {
      return;
    }

    // These layer types are intentionally disabled until a live provider is
    // connected. An empty map is safer than displaying invented conditions.
    return;

    if (weatherLayerType === 'rainfall') {
      // Rainfall accumulation and intensity badges across the corridor
      const rainGroup = L.layerGroup().addTo(map);
      const center = map.getCenter();
      const samples = [
        { lat: center.lat + 0.035, lng: center.lng - 0.02, mm: '12.4 mm/h', label: 'Heavy Monsoonal Rain', color: '#2563eb' },
        { lat: center.lat - 0.025, lng: center.lng + 0.03, mm: '3.8 mm/h', label: 'Moderate Showers', color: '#0284c7' },
        { lat: center.lat + 0.015, lng: center.lng + 0.045, mm: '0.6 mm/h', label: 'Passing Drizzle', color: '#0ea5e9' },
        { lat: center.lat - 0.04, lng: center.lng - 0.03, mm: '18.2 mm/h', label: 'Underpass Torrential', color: '#1d4ed8' }
      ];
      samples.forEach((s) => {
        const icon = L.divIcon({
          className: 'rainfall-badge',
          html: `<div style="background:${s.color};color:#fff;font-size:10.5px;font-weight:900;padding:3px 9px;border-radius:12px;border:1.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.5);white-space:nowrap;display:flex;align-items:center;gap:4px;"><span>💧</span><span>${s.mm}</span></div>`,
          iconSize: [80, 24],
          iconAnchor: [40, 12]
        });
        rainGroup.addLayer(L.marker([s.lat, s.lng], { icon }));
      });
      weatherLayerRef.current = rainGroup;
    } else if (weatherLayerType === 'temp') {
      // Temperature sample markers across the region
      const tempGroup = L.layerGroup().addTo(map);
      const center = map.getCenter();
      const samples = [
        { lat: center.lat + 0.04, lng: center.lng - 0.03, temp: '31°C', label: 'Warm' },
        { lat: center.lat - 0.03, lng: center.lng + 0.04, temp: '27°C', label: 'Cool Rain' },
        { lat: center.lat + 0.02, lng: center.lng + 0.05, temp: '29°C', label: 'Overcast' },
        { lat: center.lat - 0.04, lng: center.lng - 0.04, temp: '26°C', label: 'Showers' }
      ];
      samples.forEach((s) => {
        const icon = L.divIcon({
          className: 'temp-badge',
          html: `<div style="background:rgba(234,88,12,0.95);color:#fff;font-size:11px;font-weight:900;padding:3px 8px;border-radius:12px;border:1.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);white-space:nowrap;">🌡️ ${s.temp}</div>`,
          iconSize: [60, 24],
          iconAnchor: [30, 12]
        });
        tempGroup.addLayer(L.marker([s.lat, s.lng], { icon }));
      });
      weatherLayerRef.current = tempGroup;
    } else if (weatherLayerType === 'wind') {
      // Wind speed vector markers
      const windGroup = L.layerGroup().addTo(map);
      const center = map.getCenter();
      const samples = [
        { lat: center.lat + 0.03, lng: center.lng + 0.02, speed: '18 km/h NW' },
        { lat: center.lat - 0.02, lng: center.lng - 0.03, speed: '24 km/h W' },
        { lat: center.lat + 0.01, lng: center.lng - 0.04, speed: '14 km/h N' }
      ];
      samples.forEach((s) => {
        const icon = L.divIcon({
          className: 'wind-badge',
          html: `<div style="background:rgba(14,165,233,0.95);color:#fff;font-size:10px;font-weight:800;padding:3px 8px;border-radius:10px;border:1.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;">💨 ${s.speed}</div>`,
          iconSize: [85, 22],
          iconAnchor: [42, 11]
        });
        windGroup.addLayer(L.marker([s.lat, s.lng], { icon }));
      });
      weatherLayerRef.current = windGroup;
    } else if (weatherLayerType === 'alerts') {
      // IMD Weather Alert Zones & Advisory Polygons
      const alertGroup = L.layerGroup().addTo(map);
      const center = map.getCenter();

      // Orange Alert Zone Circle for localized flooding
      const orangeCircle = L.circle([center.lat + 0.01, center.lng - 0.015], {
        color: '#f97316',
        fillColor: '#ea580c',
        fillOpacity: 0.25,
        radius: 1600,
        weight: 2,
        dashArray: '5, 5'
      });
      orangeCircle.bindPopup(
        '<div style="font-family:system-ui;padding:4px;"><strong style="color:#ea580c;">IMD ORANGE ALERT</strong><br/><span style="font-size:11px;">Waterlogging advisory active in low-lying underpasses. Reduce speed and use elevated lanes.</span></div>'
      );
      alertGroup.addLayer(orangeCircle);

      // Yellow Alert Zone Circle for Thunderstorm
      const yellowCircle = L.circle([center.lat - 0.02, center.lng + 0.025], {
        color: '#eab308',
        fillColor: '#ca8a04',
        fillOpacity: 0.2,
        radius: 1800,
        weight: 2
      });
      yellowCircle.bindPopup(
        '<div style="font-family:system-ui;padding:4px;"><strong style="color:#ca8a04;">IMD YELLOW ALERT</strong><br/><span style="font-size:11px;">Thunderstorm & isolated gusty winds. Avoid parking under weak trees.</span></div>'
      );
      alertGroup.addLayer(yellowCircle);

      const alertIcon = L.divIcon({
        className: 'alert-badge',
        html: `<div style="background:#dc2626;color:#fff;font-size:10px;font-weight:900;padding:3px 8px;border-radius:12px;border:1.5px solid #fff;box-shadow:0 3px 10px rgba(220,38,38,0.6);white-space:nowrap;animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;">⚠️ ACTIVE IMD ALERT</div>`,
        iconSize: [120, 22],
        iconAnchor: [60, 11]
      });
      alertGroup.addLayer(L.marker([center.lat + 0.01, center.lng - 0.015], { icon: alertIcon }));

      weatherLayerRef.current = alertGroup;
    }
  }, [showRadarOverlay, weatherLayerType]);

  // Render Routes, Waypoints, Risk Zones, Nearby Places, and Markers
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = elementsLayerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const safeRoutes = Array.isArray(routes) ? routes : [];
    const activeRoute = safeRoutes.find((r) => r.id === activeRouteId) || safeRoutes[0];

    // Helper to calculate a staggered placement along route so labels never collide
    const getRouteLabelPoint = (pts: [number, number][], routeType?: string, id?: string, index: number = 0) => {
      if (!pts || pts.length === 0) return null;
      let fraction = 0.5;
      if (id === 'route-safest' || routeType === 'safest' || routeType === 'recommended') {
        fraction = 0.36;
      } else if (id === 'route-fastest' || routeType === 'fastest') {
        fraction = 0.52;
      } else if (id === 'route-scenic' || routeType === 'scenic' || routeType === 'alternative') {
        fraction = 0.68;
      } else {
        fraction = Math.min(0.8, 0.35 + index * 0.18);
      }
      const idx = Math.min(pts.length - 1, Math.max(0, Math.floor(pts.length * fraction)));
      return pts[idx];
    };

    // 1. Draw Inactive Routes (Clickable Paths & Interactive Weather Badges)
    safeRoutes
      .filter((r) => r.id !== activeRouteId && r.geoPoints && r.geoPoints.length > 0)
      .forEach((route, rIdx) => {
        const validGeoPoints = (route.geoPoints || [])
          .map((pt) => (isValidLatLng(pt) ? toValidLatLng(pt) : null))
          .filter((pt): pt is [number, number] => pt !== null);

        if (validGeoPoints.length > 1) {
          const polyline = L.polyline(validGeoPoints, {
            color: route.strokeColor || '#94a3b8',
            weight: 6,
            opacity: 0.65,
            dashArray: '6, 6',
            lineCap: 'round',
            lineJoin: 'round'
          });

          polyline.on('click', () => onSelectRoute(route.id));
          layerGroup.addLayer(polyline);

          /* Route detail labels are intentionally hidden until the user taps
             the line. The map stays readable at every zoom level. */
          const midPt = getRouteLabelPoint(validGeoPoints, route.routeOptionType, route.id, rIdx);
          if (false && midPt && isValidLatLng(midPt)) {
            const badgeTitle = route.badge || 'Route';
            const weatherNote = route.summaryCondition || 'Live weather';
            const badgeIcon = L.divIcon({
              className: 'route-weather-pill-inactive',
              html: `
                <div style="transform: translate(-50%, -50%); cursor: pointer; display: inline-flex; flex-direction: column; align-items: center; pointer-events: auto;">
                  <div style="
                    background: rgba(15, 23, 42, 0.90);
                    border: 1.5px dashed ${route.strokeColor || '#94a3b8'};
                    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                    border-radius: 10px;
                    padding: 4px 8px;
                    color: #e2e8f0;
                    font-family: system-ui, -apple-system, sans-serif;
                    min-width: 125px;
                    max-width: 190px;
                    backdrop-filter: blur(6px);
                    transition: transform 0.15s ease;
                  ">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                      <span style="font-size: 10px; font-weight: 800; color: ${route.strokeColor || '#94a3b8'};">
                        ${badgeTitle}
                      </span>
                      <span style="font-size: 10.5px; font-weight: 800; color: #f8fafc;">
                        ${route.durationMinutes}m
                      </span>
                    </div>

                    <div style="font-size: 8.5px; font-weight: 600; color: #cbd5e1; line-height: 1.2; margin-top: 1.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${weatherNote}
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 8.5px; font-weight: 700; margin-top: 2px;">
                      <span style="color: #64748b;">${route.distanceKm} km</span>
                      <span style="color: ${route.safetyScore >= 80 ? '#34d399' : '#fbbf24'};">
                        🛡️ ${route.safetyScore}/100
                      </span>
                    </div>
                  </div>
                </div>
              `,
              iconSize: [0, 0],
              iconAnchor: [0, 0]
            });
            const marker = L.marker(toValidLatLng(midPt), { icon: badgeIcon, zIndexOffset: 300 });
            marker.on('click', () => onSelectRoute(route.id));
            layerGroup.addLayer(marker);
          }
        }
      });

    // 2. Draw Active Route with Outer Glow and Colored Route Sections:
    // Green: safer | Yellow: caution | Orange: risky | Red: dangerous
    if (activeRoute && activeRoute.geoPoints && activeRoute.geoPoints.length > 0) {
      const validActivePoints = (activeRoute.geoPoints || [])
        .map((pt) => (isValidLatLng(pt) ? toValidLatLng(pt) : null))
        .filter((pt): pt is [number, number] => pt !== null);

      if (validActivePoints.length > 1) {
        const glowLine = L.polyline(validActivePoints, {
          color: activeRoute.strokeColor || '#3b82f6',
          weight: 12,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round'
        });
        layerGroup.addLayer(glowLine);

        // Render colored route sections based on safety scores & weather hazards
        const numPoints = validActivePoints.length;
        if (numPoints >= 2) {
          const numSegments = Math.min(4, Math.max(2, Math.floor(numPoints / 3)));
          const ptsPerSegment = Math.ceil(numPoints / numSegments);

          for (let s = 0; s < numSegments; s++) {
            const startIdx = Math.max(0, s * ptsPerSegment - (s > 0 ? 1 : 0));
            const endIdx = Math.min(numPoints, (s + 1) * ptsPerSegment);
            const segmentPts = validActivePoints.slice(startIdx, endIdx);

            if (segmentPts.length >= 2) {
              const liveWaypoint = activeRoute.waypoints?.[Math.min(s, (activeRoute.waypoints?.length || 1) - 1)];
              let segmentScore = typeof liveWaypoint?.safetyScore === 'number'
                ? liveWaypoint.safetyScore
                : activeRoute.safetyScore;
              let sectionLabel =
                s === 0
                  ? 'Departure Corridor'
                  : s === numSegments - 1
                  ? 'Destination Approach'
                  : `Corridor Sector ${s}`;
              let sectionAdvice = liveWaypoint?.hazard || 'Tap this route section for live weather details.';
              let sectionCondition = liveWaypoint?.weatherCondition || activeRoute.summaryCondition || 'Unavailable';

              if (activeRoute.riskZones && activeRoute.riskZones.length > 0 && s === 1) {
                const rz = activeRoute.riskZones[0];
                segmentScore = rz.severity === 'High' ? 45 : 62;
                sectionLabel = rz.title || 'Caution Area';
                sectionAdvice = rz.description || 'Slippery surface, proceed cautiously.';
                sectionCondition = rz.type || 'Ponding Risk';
              }

              // Route-wise weather color palette
              const segmentColor =
                segmentScore >= 80
                  ? '#10b981' // Green: safer
                  : segmentScore >= 65
                  ? '#eab308' // Yellow: caution
                  : segmentScore >= 50
                  ? '#f97316' // Orange: risky
                  : '#ef4444'; // Red: dangerous

              const segmentLine = L.polyline(segmentPts, {
                color: segmentColor,
                weight: 7,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
              });

              // Tapping route section -> opens weather popup with detailed route-specific info
              segmentLine.on('click', () => {
                if (onRoutePointClick) {
                  const midSegPt = segmentPts[Math.floor(segmentPts.length / 2)];
                  onRoutePointClick({
                    id: `seg_${s}`,
                    name: `${activeRoute.name} (${sectionLabel})`,
                    expectedTime: `+${Math.round((s + 0.5) * (activeRoute.durationMinutes / numSegments))} min`,
                    distanceFromStartKm: Math.round((s + 0.5) * (activeRoute.distanceKm / numSegments) * 10) / 10,
                    weatherCondition: sectionCondition,
                    temp: 26,
                    rainProb: segmentScore < 70 ? 75 : 20,
                    rainIntensity: segmentScore < 60 ? 'Heavy' : segmentScore < 80 ? 'Moderate' : 'Light',
                    waterloggingRisk: segmentScore < 60 ? 'High' : segmentScore < 80 ? 'Moderate' : 'Low',
                    safetyScore: segmentScore,
                    hazard: sectionAdvice,
                    coords: { x: 500, y: 500, lat: midSegPt[0], lng: midSegPt[1] }
                  });
                }
              });

              layerGroup.addLayer(segmentLine);
            }
          }
        } else {
          const activeLine = L.polyline(validActivePoints, {
            color: activeRoute.strokeColor || '#2563eb',
            weight: 6,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          });
          layerGroup.addLayer(activeLine);
        }

        // Route labels stay hidden by default; tapping a colored segment opens
        // the live point-weather details below the map controls.
        /*
        const activeMidPt = getRouteLabelPoint(validActivePoints, activeRoute.routeOptionType, activeRoute.id, 0);
        if (activeMidPt && isValidLatLng(activeMidPt)) {
          const activeBadgeTitle = activeRoute.routeOptionType === 'safest'
            ? '🟢 SAFEST'
            : activeRoute.routeOptionType === 'fastest'
            ? '⚡ FASTEST'
            : activeRoute.routeOptionType === 'scenic'
            ? '🌿 SCENIC'
            : activeRoute.badge || 'SELECTED ROUTE';

          const weatherImpactDetail = activeRoute.weatherImpactLabel || activeRoute.weatherImpactBadge || activeRoute.summaryCondition;

          const activeBadgeIcon = L.divIcon({
            className: 'route-weather-pill-active',
            html: `
              <div style="transform: translate(-50%, -50%); cursor: pointer; display: inline-flex; flex-direction: column; align-items: center; pointer-events: auto;">
                <div style="
                  background: rgba(15, 23, 42, 0.96);
                  border: 2px solid ${activeRoute.strokeColor || '#3b82f6'};
                  box-shadow: 0 0 16px ${activeRoute.strokeColor || '#3b82f6'}80, 0 4px 14px rgba(0,0,0,0.6);
                  border-radius: 12px;
                  padding: 6px 10px;
                  color: #ffffff;
                  font-family: system-ui, -apple-system, sans-serif;
                  min-width: 145px;
                  max-width: 220px;
                  backdrop-filter: blur(8px);
                ">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 3px;">
                    <span style="font-size: 10.5px; font-weight: 900; color: ${activeRoute.strokeColor || '#38bdf8'}; letter-spacing: 0.5px;">
                      ${activeBadgeTitle}
                    </span>
                    <span style="font-size: 11.5px; font-weight: 900; color: #ffffff;">
                      ${activeRoute.durationMinutes} min
                    </span>
                  </div>

                  <div style="
                    font-size: 9px;
                    font-weight: 600;
                    color: #cbd5e1;
                    line-height: 1.25;
                    background: rgba(30, 41, 59, 0.85);
                    padding: 3px 6px;
                    border-radius: 6px;
                    margin-bottom: 4px;
                    border-left: 2.5px solid ${activeRoute.strokeColor || '#38bdf8'};
                  ">
                    ${weatherImpactDetail}
                  </div>

                  <div style="display: flex; align-items: center; justify-content: space-between; font-size: 9px; font-weight: 700;">
                    <span style="color: #94a3b8;">${activeRoute.distanceKm} km</span>
                    <span style="
                      background: ${activeRoute.safetyScore >= 80 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'};
                      color: ${activeRoute.safetyScore >= 80 ? '#34d399' : '#fbbf24'};
                      border: 1px solid ${activeRoute.safetyScore >= 80 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'};
                      padding: 1px 5px;
                      border-radius: 5px;
                    ">
                      🛡️ ${activeRoute.safetyScore}/100
                    </span>
                  </div>
                </div>
              </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          });
          const activeMarker = L.marker(toValidLatLng(activeMidPt), { icon: activeBadgeIcon, zIndexOffset: 600 });
          layerGroup.addLayer(activeMarker);
        }
        */

        // Fit bounds when not actively navigating
        if (!isNavigating) {
          try {
            const bounds = L.latLngBounds(validActivePoints);
            if (bounds.isValid()) {
              map.fitBounds(bounds, { padding: [50, 50] });
            }
          } catch (e) {
            console.warn('fitBounds error:', e);
          }
        }
      }
    }

    // 3. Render route points as invisible click targets only. This prevents
    // permanent weather boxes while keeping the route tappable.
    if (activeRoute && activeRoute.waypoints && activeRoute.waypoints.length > 0) {
      activeRoute.waypoints.forEach((wp) => {
        const wpPos = toValidLatLng(wp.coords, [28.5, 77.1]);
        if (isValidLatLng(wpPos)) {
          const wpIcon = L.divIcon({
            className: 'waypoint-hit-target',
            html: '<div style="width:18px;height:18px;border-radius:9999px;background:transparent;border:2px solid transparent;cursor:pointer;"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });

          const marker = L.marker(wpPos, { icon: wpIcon });
          if (onRoutePointClick) {
            marker.on('click', () => onRoutePointClick(wp));
          }
          layerGroup.addLayer(marker);
        }
      });
    }

    // 4. Origin Marker
    const startCoords = toValidLatLng(
      originCoords || (activeRoute?.geoPoints ? activeRoute.geoPoints[0] : null),
      [28.5283, 77.1512]
    );

    const originIcon = L.divIcon({
      className: 'custom-map-pin-origin',
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <div style="width:20px;height:20px;border-radius:9999px;background:#10b981;border:3px solid #ffffff;box-shadow:0 0 12px rgba(16,185,129,0.9);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:900;">A</div>
          <span style="background:rgba(15,23,42,0.9);color:#34d399;font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;margin-top:2px;border:1px solid #10b981;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            ${(originName || 'Origin').split(',')[0]}
          </span>
        </div>
      `,
      iconSize: [80, 44],
      iconAnchor: [40, 10]
    });
    layerGroup.addLayer(L.marker(startCoords, { icon: originIcon }));

    // 5. Destination Marker
    const endCoords = toValidLatLng(
      destinationCoords ||
        (activeRoute?.geoPoints ? activeRoute.geoPoints[activeRoute.geoPoints.length - 1] : null),
      [28.4358, 77.1082]
    );

    const destIcon = L.divIcon({
      className: 'custom-map-pin-destination',
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <div style="width:22px;height:22px;border-radius:9999px;background:#ef4444;border:3px solid #ffffff;box-shadow:0 0 14px rgba(239,68,68,0.9);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:11px;font-weight:900;">B</div>
          <span style="background:rgba(15,23,42,0.9);color:#fca5a5;font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;margin-top:2px;border:1px solid #ef4444;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            ${(destinationName || 'Destination').split(',')[0]}
          </span>
        </div>
      `,
      iconSize: [120, 50],
      iconAnchor: [60, 11]
    });
    layerGroup.addLayer(L.marker(endCoords, { icon: destIcon }));

    // 6. Real GPS User Position Marker (if active)
    if (gpsCoords && isValidLatLng(gpsCoords)) {
      const validGps = toValidLatLng(gpsCoords);
      const gpsIcon = L.divIcon({
        className: 'gps-user-marker',
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:30px;height:30px;border-radius:9999px;background:rgba(59,130,246,0.35);animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2.5px solid #ffffff;box-shadow:0 0 10px rgba(37,99,235,0.9);"></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      layerGroup.addLayer(L.marker(validGps, { icon: gpsIcon }));
    }

    // 7. Severe Risk Zones (e.g. Underpass Waterlogging / Flooding)
    if (activeRoute && activeRoute.riskZones && activeRoute.riskZones.length > 0) {
      activeRoute.riskZones.forEach((zone, idx) => {
        const defaultPos: [number, number] = [
          startCoords[0] + (endCoords[0] - startCoords[0]) * (0.35 + idx * 0.28),
          startCoords[1] + (endCoords[1] - startCoords[1]) * (0.35 + idx * 0.28) + 0.004
        ];
        const riskPos = toValidLatLng(zone.coords, defaultPos);

        const riskIcon = L.divIcon({
          className: 'custom-risk-marker',
          html: `
            <div style="display:flex;align-items:center;background:#7f1d1d;border:2px solid #ef4444;border-radius:12px;padding:3px 8px;color:#ffffff;font-size:10px;font-weight:800;box-shadow:0 4px 12px rgba(239,68,68,0.5);cursor:pointer;white-space:nowrap;">
              <span style="margin-right:4px;">${zone.icon}</span>
              <span>${zone.title}</span>
            </div>
          `,
          iconSize: [130, 26],
          iconAnchor: [65, 13]
        });

        const riskMarker = L.marker(riskPos, { icon: riskIcon });
        riskMarker.on('click', () => onSelectRiskZone(zone));
        layerGroup.addLayer(riskMarker);
      });
    }

    // 8. Navigation Vehicle Indicator (if actively navigating)
    if (isNavigating && activeRoute && activeRoute.geoPoints && activeRoute.geoPoints.length > 1) {
      const validNavPts = activeRoute.geoPoints
        .map((pt) => (isValidLatLng(pt) ? toValidLatLng(pt) : null))
        .filter((pt): pt is [number, number] => pt !== null);

      if (validNavPts.length > 1) {
        const total = validNavPts.length - 1;
        const frac = Math.min(0.999, Math.max(0, vehicleProgress / 100));
        const seg = Math.min(total - 1, Math.floor(frac * total));
        const localFrac = frac * total - seg;

        const pA = validNavPts[seg];
        const pB = validNavPts[seg + 1];
        const curLat = pA[0] + (pB[0] - pA[0]) * localFrac;
        const curLng = pA[1] + (pB[1] - pA[1]) * localFrac;

        if (isValidLatLng([curLat, curLng])) {
          const vehicleIcon = L.divIcon({
            className: 'vehicle-nav-pin',
            html: `
              <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                <div style="position:absolute;width:32px;height:32px;border-radius:9999px;background:rgba(59,130,246,0.3);animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="width:20px;height:20px;border-radius:9999px;background:#2563eb;border:3px solid #ffffff;box-shadow:0 0 14px rgba(37,99,235,0.9);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:10px;">▲</div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          layerGroup.addLayer(L.marker([curLat, curLng], { icon: vehicleIcon }));
        }
      }
    }

    // 9. Nearby Places (When toggled)
    if (showNearbyPlaces && nearbyPlaces.length > 0) {
      nearbyPlaces.forEach((place) => {
        const defaultPos: [number, number] = [endCoords[0] + 0.005, endCoords[1] + 0.005];
        const placePos = toValidLatLng(place.coords, defaultPos);

        const isSelected = selectedNearbyPlace?.id === place.id;
        const placeIcon = L.divIcon({
          className: 'nearby-place-marker',
          html: `
            <div style="background:${isSelected ? '#2563eb' : '#ffffff'};border:2px solid ${isSelected ? '#ffffff' : '#3b82f6'};border-radius:9999px;padding:3px 8px;font-size:10px;font-weight:800;color:${isSelected ? '#ffffff' : '#1e293b'};box-shadow:0 4px 12px rgba(0,0,0,0.3);cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:3px;">
              <span>${place.category === 'cafe' ? '☕' : place.category === 'petrol' ? '⛽' : place.category === 'hospital' ? '🏥' : '🍽️'}</span>
              <span>${place.name.split(' ')[0]}</span>
              <span style="color:${isSelected ? '#fde047' : '#f59e0b'};">★${place.rating}</span>
            </div>
          `,
          iconSize: [110, 26],
          iconAnchor: [55, 13]
        });

        const placeMarker = L.marker(placePos, { icon: placeIcon });
        placeMarker.on('click', () => onSelectNearbyPlace(place));
        layerGroup.addLayer(placeMarker);
      });
    }
  }, [
    routes,
    activeRouteId,
    destinationName,
    originName,
    isNavigating,
    vehicleProgress,
    showNearbyPlaces,
    nearbyPlaces,
    selectedNearbyPlace,
    originCoords,
    destinationCoords,
    gpsCoords,
    onSelectRoute,
    onSelectRiskZone,
    onSelectNearbyPlace,
    onRoutePointClick
  ]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full bg-slate-900 z-10" />
    </div>
  );
});
