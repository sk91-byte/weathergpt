import { WeatherData } from '../types';
import { LiveMapRoute, RouteSamplingPoint } from '../types';

const configuredBaseUrl = (import.meta.env.VITE_BACKEND_BASE_URL as string | undefined)?.trim();
export const BACKEND_BASE_URL = (configuredBaseUrl || 'https://weathergpt-bjhy.onrender.com').replace(/\/$/, '');

export interface PlaceResult {
  place_id: string;
  name: string;
  address?: string;
  formatted_address?: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
}

export interface NearbyPlaceResult extends PlaceResult {
  category?: string;
  distance_km?: number;
}

export interface RouteResult {
  route_id: string;
  origin: { name: string; latitude: number; longitude: number };
  destination: { name: string; latitude: number; longitude: number };
  travel_mode: string;
  distance_km: number;
  duration_minutes: number;
  geometry: { type?: string; coordinates?: [number, number][] };
  steps: Array<{ name?: string; distance_km?: number; duration_minutes?: number }>;
}

export interface RouteWeatherResult {
  route_id: string;
  overall_risk?: { score?: number | null; level?: string };
  segments: Array<{
    location?: { latitude?: number; longitude?: number };
    start_time?: string;
    end_time?: string;
    weather?: { temperature_c?: number; rain_probability_percent?: number; precipitation_mm?: number; wind_speed_kmh?: number; condition?: string };
    risk?: { score?: number | null; level?: string; components?: Record<string, unknown> };
  }>;
  data_available?: boolean;
}

export function backendUrl(path: string): string {
  return `${BACKEND_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const cache = new Map<string, { expires: number; value: unknown }>();

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  const response = await fetch(backendUrl(path), { ...init, signal: init?.signal || controller.signal });
  window.clearTimeout(timeout);
  if (!response.ok) {
    const error = new Error(`Request failed (${response.status})`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

export async function getReverseLocation(latitude: number, longitude: number): Promise<PlaceResult> {
  return requestJson<PlaceResult>(`/location/reverse?latitude=${latitude}&longitude=${longitude}`);
}

export async function getNearbyPlaces(latitude: number, longitude: number, radiusKm = 5): Promise<NearbyPlaceResult[]> {
  const key = `/places/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}`;
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved.value as NearbyPlaceResult[];
  const result = await requestJson<{ places: NearbyPlaceResult[] }>(key);
  const places = result.places || [];
  cache.set(key, { expires: Date.now() + 120000, value: places });
  return places;
}

export async function searchPlaces(input: string, latitude?: number, longitude?: number): Promise<PlaceResult[]> {
  const query = new URLSearchParams({ input: input.trim() });
  if (latitude !== undefined && longitude !== undefined) { query.set('latitude', String(latitude)); query.set('longitude', String(longitude)); }
  const key = `/places/autocomplete?${query}`;
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved.value as PlaceResult[];
  const result = await requestJson<{ suggestions: PlaceResult[] }>(key);
  cache.set(key, { expires: Date.now() + 120000, value: result.suggestions || [] });
  return result.suggestions || [];
}

export function createRoute(input: { origin: PlaceResult; destination: PlaceResult; travelMode: string; conversationId?: string }): Promise<RouteResult> {
  return requestJson<RouteResult>('/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    origin: { name: input.origin.name, latitude: input.origin.latitude, longitude: input.origin.longitude },
    destination: { name: input.destination.name, latitude: input.destination.latitude, longitude: input.destination.longitude },
    travel_mode: input.travelMode, conversation_id: input.conversationId
  }) });
}

export function getRouteWeather(routeId: string, departureTime?: string): Promise<RouteWeatherResult> {
  return requestJson<RouteWeatherResult>('/route/weather', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ route_id: routeId, departure_time: departureTime }) });
}

export function getBestDeparture(routeId: string, departureTimes?: string[]): Promise<{ recommended_departure_time?: string | null; alternative_times?: Array<{ departure_time: string; risk?: { score?: number | null; level?: string } }>; reason?: string }> {
  return requestJson('/route/best-time', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ route_id: routeId, departure_times: departureTimes }) });
}

export function getRouteExplanation(routeId: string): Promise<{ explanation?: string[]; risk_score?: number | null; risk_level?: string; peak_segment?: unknown; data_available?: boolean }> {
  return requestJson(`/route/${encodeURIComponent(routeId)}/explanation`);
}

export function toLiveMapRoute(route: RouteResult, weather?: RouteWeatherResult): LiveMapRoute {
  const coordinates = (route.geometry?.coordinates || []).map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
  const points = coordinates.length ? coordinates : [[route.origin.latitude, route.origin.longitude], [route.destination.latitude, route.destination.longitude]] as [number, number][];
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const scale = (value: number, min: number, max: number) => max === min ? 50 : 10 + ((value - min) / (max - min)) * 80;
  const pathPoints = points.map(([lat, lng]) => ({ x: scale(lng, minLng, maxLng), y: 90 - scale(lat, minLat, maxLat) }));
  const segments = weather?.segments || [];
  const scores = segments.map((s) => s.risk?.score).filter((s): s is number => typeof s === 'number');
  const score = typeof weather?.overall_risk?.score === 'number' ? Math.round(weather.overall_risk.score) : undefined;
  const rainValues = segments.map((s) => s.weather?.rain_probability_percent).filter((v): v is number => typeof v === 'number');
  const riskLabel = (score === undefined ? '' : score >= 80 ? 'Low' : score >= 60 ? 'Moderate' : score >= 40 ? 'High' : 'Severe');
  const riskColor = riskLabel === 'Low' || riskLabel === 'Moderate' ? 'green' : riskLabel === 'High' ? 'orange' : 'red';
  const waypoints: RouteSamplingPoint[] = segments.map((segment, index) => {
    const location = segment.location || {};
    const lat = Number(location.latitude ?? points[Math.min(index, points.length - 1)][0]);
    const lng = Number(location.longitude ?? points[Math.min(index, points.length - 1)][1]);
    const segmentScore = typeof segment.risk?.score === 'number' ? Math.round(segment.risk.score) : 0;
    const rainProb = Number(segment.weather?.rain_probability_percent ?? 0);
    return {
      id: `live-${index}`, name: `Route point ${index + 1}`, expectedTime: segment.start_time || 'Forecast time unavailable', distanceFromStartKm: 0,
      weatherCondition: segment.weather?.condition || 'Condition unavailable', temp: Number(segment.weather?.temperature_c ?? 0), rainProb,
      rainIntensity: rainProb >= 70 ? 'Heavy' : rainProb >= 40 ? 'Moderate' : rainProb > 0 ? 'Light' : 'None',
      waterloggingRisk: segment.risk?.components ? 'Low' : 'Low', safetyScore: segmentScore, coords: { x: scale(lng, minLng, maxLng), y: 90 - scale(lat, minLat, maxLat), lat, lng }
    };
  });
  const finalScore = score ?? (scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0);
  const hasRisk = score !== undefined || scores.length > 0;
  return {
    id: route.route_id, name: 'WeatherGPT Live Route', badge: 'LIVE ROUTE', type: 'recommended', distanceKm: route.distance_km, durationMinutes: route.duration_minutes,
    safetyScore: finalScore, summaryCondition: segments[0]?.weather?.condition || 'Route weather unavailable', rainRisk: (rainValues[0] || 0) >= 70 ? 'High' : (rainValues[0] || 0) >= 40 ? 'Moderate' : 'Low',
    waterloggingRisk: hasRisk ? 'Low' : 'Low', thunderstormRisk: hasRisk ? 'Low' : 'Low', hazardCount: 0, color: riskColor, strokeColor: riskColor === 'green' ? '#10b981' : riskColor === 'orange' ? '#f59e0b' : '#ef4444',
    pathPoints, geoPoints: points, waypoints, riskZones: [], departureAdvice: 'Live route weather is shown from the backend forecast.', whyThisRoute: 'This route is calculated from the selected origin and destination coordinates.', whyWait: 'Live departure recommendations are available from the backend.', dataMode: 'LIVE', riskAvailable: score !== undefined || scores.length > 0
  };
}

export async function getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {
  const payload = await requestJson<any>(`/weather/current?latitude=${latitude}&longitude=${longitude}`);
  const current = payload.current || {};
  const temperature = Number(current.temperature_c ?? 0);
  const rain = Number(current.rain_mm ?? current.precipitation_mm ?? 0);
  const condition = String(current.condition || 'Current conditions');
  const rainChance = Math.max(0, Math.min(100, Math.round(rain > 0 ? 70 : 20)));
  const riskScore = Math.max(0, 100 - Math.round(rainChance * 0.35));
  return {
    city: 'Current location', state: '', country: 'India', temperature, condition,
    conditionIcon: /rain|drizzle|shower/i.test(condition) ? 'rain' : /storm/i.test(condition) ? 'thunderstorm' : 'partly-cloudy',
    feelsLike: Number(current.apparent_temperature_c ?? temperature), humidity: Number(current.humidity_percent ?? 0),
    windSpeed: Number(current.wind_speed_kmh ?? 0), windDirection: 'Live', rainChance,
    maxTemp: temperature, minTemp: temperature, aqi: 0, aqiStatus: 'Good', uvIndex: 0, pressure: 0, visibility: 0,
    lastUpdated: `Live data from ${payload.source || 'weather provider'}`, riskScore,
    riskStatus: riskScore > 75 ? 'Low Risk' : riskScore > 45 ? 'Moderate Risk' : 'Moderate-High Risk',
    risks: { rain: rainChance > 70 ? 'HIGH' : rainChance > 35 ? 'MEDIUM' : 'LOW', flood: 'LOW', lightning: /storm/i.test(condition) ? 'HIGH' : 'LOW', heat: temperature >= 38 ? 'HIGH' : temperature >= 32 ? 'MEDIUM' : 'LOW' },
    aiRecommendation: 'Weather data is live. Check the route view before travelling and carry suitable protection.',
    recommendationExplanation: { title: 'Live weather reading', factors: [condition, `${Math.round(temperature)}°C`], confidence: 70, modelAgreement: 'Provider data available' }
  };
}

export async function sendChatMessage(input: { message: string; language?: string; profile?: string; conversation_id?: string }) {
  return requestJson<{ response: string; conversation_id?: string; [key: string]: unknown }>('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
}
