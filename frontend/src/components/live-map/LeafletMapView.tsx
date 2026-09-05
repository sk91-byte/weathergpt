import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LiveMapRoute, RouteRiskZone, NearbySafePlace } from '../../types';
import { getCurrentWeather } from '../../services/backend';

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
}

export const LeafletMapView: React.FC<LeafletMapViewProps> = ({
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
  tileLayerType
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const elementsLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Center on Gurugram / South Delhi corridor (Sushant University area)
    const map = L.map(containerRef.current, {
      center: [28.472, 77.125],
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    mapRef.current = map;
    elementsLayerGroupRef.current = L.layerGroup().addTo(map);

    // Any map tap can be used as a weather probe, not only a route waypoint.
    map.on('click', async (event) => {
      const popup = L.popup().setLatLng(event.latlng).setContent('<strong>Loading weather…</strong>').openOn(map);
      try {
        const weather = await getCurrentWeather(event.latlng.lat, event.latlng.lng);
        popup.setContent(`<div style="min-width:180px;font-family:Arial,sans-serif"><strong>Weather at this location</strong><br/><b>${weather.temperature.toFixed(1)}°C</b> · ${weather.condition}<br/>Feels like: ${weather.feelsLike.toFixed(1)}°C<br/>Rain now: ${weather.rainChance}%<br/>Wind: ${weather.windSpeed.toFixed(1)} km/h</div>`);
      } catch {
        popup.setContent('<strong>Weather is temporarily unavailable for this location.</strong>');
      }
    });

    // Initial resize trigger to ensure tiles fill container
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.off('click');
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Base Tile Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
    }

    let url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    let subdomains = 'abcd';
    let maxZoom = 19;

    if (tileLayerType === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      subdomains = 'abc';
      maxZoom = 18;
    } else if (tileLayerType === 'dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      subdomains = 'abcd';
      maxZoom = 19;
    }

    const newLayer = L.tileLayer(url, {
      subdomains,
      maxZoom
    }).addTo(map);

    baseLayerRef.current = newLayer;
  }, [tileLayerType]);

  // Update Radar Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }

    if (showRadarOverlay) {
      // RainViewer live precipitation radar layer
      const radar = L.tileLayer(
        'https://tilecache.rainviewer.com/v2/radar/nowcast_5/256/{z}/{x}/{y}/2/1_1.png',
        {
          opacity: 0.65,
          maxZoom: 12,
          zIndex: 400
        }
      ).addTo(map);

      radarLayerRef.current = radar;
    }
  }, [showRadarOverlay]);

  // Render Routes, Markers, Risk Zones, and Vehicle
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = elementsLayerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const activeRoute = routes.find((r) => r.id === activeRouteId) || routes[0];

    // 1. Draw Inactive Routes first
    routes
      .filter((r) => r.id !== activeRouteId && r.geoPoints && r.geoPoints.length > 0)
      .forEach((route) => {
        const polyline = L.polyline(route.geoPoints as [number, number][], {
          color: route.strokeColor,
          weight: 5,
          opacity: 0.45,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round'
        });

        polyline.on('click', () => onSelectRoute(route.id));
        layerGroup.addLayer(polyline);

        // Add midway badge
        if (route.geoPoints && route.geoPoints.length > 2) {
          const midPt = route.geoPoints[Math.floor(route.geoPoints.length / 2)];
          const badgeIcon = L.divIcon({
            className: 'route-badge-icon',
            html: `<div style="background:#0f172a;color:#e2e8f0;font-size:10px;font-weight:700;padding:2px 8px;border-radius:9999px;border:1px solid ${route.strokeColor};white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;">${route.durationMinutes}m • ${route.safetyScore}/100</div>`,
            iconSize: [80, 20],
            iconAnchor: [40, 10]
          });
          const marker = L.marker(midPt, { icon: badgeIcon });
          marker.on('click', () => onSelectRoute(route.id));
          layerGroup.addLayer(marker);
        }
      });

    // 2. Draw Active Route with outer glow and thick polyline
    if (activeRoute && activeRoute.geoPoints && activeRoute.geoPoints.length > 0) {
      // Glow underlay
      const glowLine = L.polyline(activeRoute.geoPoints as [number, number][], {
        color: activeRoute.strokeColor,
        weight: 12,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layerGroup.addLayer(glowLine);

      // Main line
      const activeLine = L.polyline(activeRoute.geoPoints as [number, number][], {
        color: activeRoute.strokeColor,
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layerGroup.addLayer(activeLine);

      // Fit bounds if not actively navigating
      if (!isNavigating) {
        map.fitBounds(activeLine.getBounds(), { padding: [50, 50] });
      }

      // Weather-aware route points are interactive: tapping one opens the
      // forecast data returned for that part of the route.
      activeRoute.waypoints.forEach((point) => {
        if (point.coords.lat === undefined || point.coords.lng === undefined) return;
        const marker = L.circleMarker([point.coords.lat, point.coords.lng], {
          radius: 7,
          color: point.rainIntensity === 'Heavy' ? '#dc2626' : point.rainIntensity === 'Moderate' ? '#f59e0b' : '#2563eb',
          weight: 2,
          fillColor: '#ffffff',
          fillOpacity: 0.95
        });
        marker.bindPopup(`<div style="min-width:170px;font-family:Arial,sans-serif"><strong>${point.name}</strong><br/>${point.weatherCondition}<br/><b>${point.temp ? `${point.temp}°C` : 'Temperature unavailable'}</b><br/>Rain chance: ${point.rainProb}%<br/>Risk score: ${point.safetyScore || 'Unavailable'}</div>`);
        layerGroup.addLayer(marker);
      });
    }

    // 3. Origin Marker
    const startCoords: [number, number] = activeRoute?.geoPoints?.[0] || [28.5283, 77.1512];
    const originIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="width:18px;height:18px;border-radius:9999px;background:#10b981;border:3px solid #ffffff;box-shadow:0 0 10px rgba(16,185,129,0.8);"></div>
          <span style="background:rgba(15,23,42,0.85);color:#34d399;font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;margin-top:2px;border:1px solid #10b981;white-space:nowrap;">Origin</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 9]
    });
    layerGroup.addLayer(L.marker(startCoords, { icon: originIcon }));

    // 4. Destination Marker
    const endCoords: [number, number] = activeRoute?.geoPoints?.[activeRoute.geoPoints.length - 1] || [
      28.4358,
      77.1082
    ];
    const destIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="width:22px;height:22px;border-radius:9999px;background:#ef4444;border:3px solid #ffffff;box-shadow:0 0 12px rgba(239,68,68,0.8);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:11px;font-weight:900;">📍</div>
          <span style="background:rgba(15,23,42,0.9);color:#fca5a5;font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;margin-top:2px;border:1px solid #ef4444;white-space:nowrap;">${destinationName}</span>
        </div>
      `,
      iconSize: [120, 50],
      iconAnchor: [60, 11]
    });
    layerGroup.addLayer(L.marker(endCoords, { icon: destIcon }));

    // 5. Risk Zones Markers (e.g. Underpass Waterlogging)
    activeRoute.riskZones.forEach((zone, idx) => {
      // Approximate geographic anchor for risk zone
      const lat = startCoords[0] + (endCoords[0] - startCoords[0]) * (0.35 + idx * 0.28);
      const lng = startCoords[1] + (endCoords[1] - startCoords[1]) * (0.35 + idx * 0.28) + 0.005;

      const riskIcon = L.divIcon({
        className: 'custom-risk-marker',
        html: `
          <div style="display:flex;align-items:center;background:#7f1d1d;border:2px solid #ef4444;border-radius:12px;padding:3px 8px;color:#ffffff;font-size:11px;font-weight:800;box-shadow:0 4px 12px rgba(239,68,68,0.5);cursor:pointer;white-space:nowrap;animation:pulse 2s infinite;">
            <span style="margin-right:4px;">${zone.icon}</span>
            <span>${zone.title}</span>
          </div>
        `,
        iconSize: [140, 30],
        iconAnchor: [70, 15]
      });

      const riskMarker = L.marker([lat, lng], { icon: riskIcon });
      riskMarker.on('click', () => onSelectRiskZone(zone));
      layerGroup.addLayer(riskMarker);
    });

    // 6. Navigation Vehicle Indicator (if navigating)
    if (isNavigating && activeRoute.geoPoints && activeRoute.geoPoints.length > 1) {
      const pts = activeRoute.geoPoints;
      const total = pts.length - 1;
      const frac = Math.min(0.999, Math.max(0, vehicleProgress / 100));
      const seg = Math.min(total - 1, Math.floor(frac * total));
      const localFrac = frac * total - seg;

      const pA = pts[seg];
      const pB = pts[seg + 1];
      const curLat = pA[0] + (pB[0] - pA[0]) * localFrac;
      const curLng = pA[1] + (pB[1] - pA[1]) * localFrac;

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

    // 7. Nearby Safe Places (when toggled)
    if (showNearbyPlaces) {
      nearbyPlaces.forEach((place, i) => {
        const placeLat = endCoords[0] + (i % 2 === 0 ? 0.008 : -0.008) + (i * 0.002);
        const placeLng = endCoords[1] + (i % 2 === 0 ? -0.006 : 0.006) - (i * 0.001);

        const placeIcon = L.divIcon({
          className: 'nearby-safe-place-pin',
          html: `
            <div style="background:#ffffff;border:2px solid #3b82f6;border-radius:9999px;padding:2px 8px;font-size:10px;font-weight:800;color:#1e293b;box-shadow:0 4px 10px rgba(0,0,0,0.25);cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:3px;">
              <span>☕</span>
              <span>${place.name.split(' ')[0]}</span>
              <span style="color:#f59e0b;">★${place.rating}</span>
            </div>
          `,
          iconSize: [100, 24],
          iconAnchor: [50, 12]
        });

        const placeMarker = L.marker([placeLat, placeLng], { icon: placeIcon });
        placeMarker.on('click', () => onSelectNearbyPlace(place));
        layerGroup.addLayer(placeMarker);
      });
    }
  }, [
    routes,
    activeRouteId,
    destinationName,
    isNavigating,
    vehicleProgress,
    showNearbyPlaces,
    nearbyPlaces,
    onSelectRoute,
    onSelectRiskZone,
    onSelectNearbyPlace
  ]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full bg-slate-900 z-10" />
    </div>
  );
};
