// Compatibility layer between the Remix interface and the existing Render API.
import type { WeatherAlert } from '../types';
export interface ApiPoint { latitude: number; longitude: number; name?: string; }
export interface ApiAutocompleteSuggestion { place_id: string; name: string; formatted_address: string; latitude: number; longitude: number; type?: string; }
export interface ApiRouteResponse { route_id: string; origin: ApiPoint; destination: ApiPoint; travel_mode: string; distance_km: number; duration_minutes: number; geometry: [number, number][]; steps: any[]; is_live: boolean; data_source: string; alternatives?: Array<{ route_id: string; distance_km: number; duration_minutes: number; geometry: [number, number][]; steps: any[]; alternative_index?: number; }>; }
export interface ApiRouteWeatherResponse { safety_score: number | null; rain_risk: any; waterlogging_risk: any; wind_risk: any; fog_risk: any; thunderstorm_risk: any; timeline: any[]; risk_zones: any[]; is_live: boolean; source: string; }
export interface ApiBestDepartureTimeResponse { route_id: string; current_safety_score: number | null; warning: boolean; warning_message: string; best_departure_time: string; best_option: any; options: any[]; }
export interface ApiPointWeatherResponse { latitude:number; longitude:number; location_name:string; temperature:number | null; feels_like:number | null; condition:string; condition_icon:string; rain_probability:number | null; current_precipitation:number | null; humidity:number | null; wind_speed:number | null; wind_direction:string; visibility?:number; weather_risk?:string; nearby_alerts?:string[]; updated_time?:string; weather_source:string; is_live:boolean; route_point_info?:any; maxTemp?: number; minTemp?: number; aqi?: number | null; riskScore?: number; riskStatus?: string; risks?: any; }
export interface ApiNearbyPlaceItem { id:string; name:string; category:any; category_label:string; rating:number; reviews:number; distance_meters:number; walking_minutes:number; address:string; latitude:number; longitude:number; open_status:string; shelter_feature:string; route_relevance:string; phone?:string; website?:string; opening_hours?:string; distance_from_route_km?:number; distance_from_start_km?:number; is_live:boolean; }
export interface ApiNearbyPlacesResponse { places: ApiNearbyPlaceItem[]; recommended_wait_place?: ApiNearbyPlaceItem; is_live:boolean; }
export interface ApiClimateSummary {
  location: { latitude: number; longitude: number };
  temperature: { trend: Array<{ year: number; average_temperature_c: number | null }>; data_source: string; is_demo: boolean };
  rainfall: { trend: Array<{ year: number; rainfall_mm: number }>; data_source: string; is_demo: boolean };
}

function normalizeAlertType(value: unknown): WeatherAlert['type'] {
  const text = String(value || '').toLowerCase();
  if (text.includes('earthquake') || text.includes('seismic')) return 'earthquake';
  if (text.includes('flood')) return 'flood';
  if (text.includes('cyclone')) return 'cyclone';
  if (text.includes('tsunami')) return 'tsunami';
  if (text.includes('heat')) return 'heatwave';
  if (text.includes('fog')) return 'dense-fog';
  if (text.includes('wind')) return 'strong-winds';
  if (text.includes('thunder') || text.includes('lightning')) return 'thunderstorm';
  return 'heavy-rain';
}

function alertActions(type: WeatherAlert['type'], severity: string): { impacts: string[]; actions: string[] } {
  const severe = severity === 'High' || severity === 'Extreme';
  if (type === 'thunderstorm') return {
    impacts: ['Lightning, sudden rain, gusty winds, and temporary travel disruption.'],
    actions: [severe ? 'Avoid open areas and postpone non-essential travel.' : 'Stay indoors during lightning and check updates before leaving.']
  };
  if (type === 'flood') return {
    impacts: ['Waterlogging, unsafe crossings, and road closures may occur.'],
    actions: ['Do not enter moving water; follow local authority instructions and use a safer route.']
  };
  if (type === 'cyclone') return {
    impacts: ['Damaging winds, heavy rain, power disruption, and coastal flooding are possible.'],
    actions: ['Stay indoors, secure loose objects, and follow official evacuation instructions.']
  };
  if (type === 'tsunami') return {
    impacts: ['Coastal inundation and dangerous waves may affect low-lying coastal areas.'],
    actions: ['Move inland or to higher ground immediately when instructed by authorities; do not approach the shoreline.']
  };
  if (type === 'heatwave') return {
    impacts: ['Heat stress, dehydration, and reduced outdoor work capacity.'],
    actions: ['Drink water regularly and avoid strenuous activity during the hottest hours.']
  };
  if (type === 'dense-fog') return {
    impacts: ['Poor visibility and slower or hazardous road travel.'],
    actions: ['Reduce speed, use headlights, and allow extra travel time.']
  };
  return {
    impacts: ['Weather conditions may affect outdoor activity and local travel.'],
    actions: ['Check the official warning, keep your phone charged, and plan a safer alternative.']
  };
}

export async function apiGetNearbyAlerts(latitude: number, longitude: number, radiusKm = 50, onSlow?:()=>void, locationName?: string): Promise<WeatherAlert[]> {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), radius_km: String(radiusKm) });
  if (locationName) params.set('location_name', locationName);
  const response = await fetchWithTimeout(`/alerts/nearby?${params.toString()}`, {}, 20000, onSlow);
  const payload = await response.json();
  if (!Array.isArray(payload)) return [];
  return payload.filter((item: any) => item && item.is_demo !== true).map((item: any): WeatherAlert => {
    const type = normalizeAlertType(item.alert_type);
    const severity = ['Low', 'Moderate', 'High', 'Extreme'].includes(item.severity) ? item.severity : 'Moderate';
    const guidance = alertActions(type, severity);
    return {
      id: String(item.id), type,
      title: String(item.title || 'Official weather alert'), severity,
      location: String(item.affected_area || 'Selected area'),
      issuedAt: String(item.issued_at || 'Unavailable'),
      description: String(item.description || 'See the official source for details.'),
      impacts: guidance.impacts, recommendedActions: guidance.actions,
      sourceUrl: typeof item.source_url === 'string' ? item.source_url : undefined,
      distanceKm: Number.isFinite(Number(item.distance_km)) ? Number(item.distance_km) : undefined,
      isActive: !item.end_time || Number.isNaN(Date.parse(String(item.end_time))) || Date.parse(String(item.end_time)) > Date.now(),
      isNearby: Number.isFinite(Number(item.distance_km)) ? Number(item.distance_km) <= 10 : true,
    };
  });
}

export const BACKEND_BASE_URL = ((import.meta as any).env?.VITE_BACKEND_BASE_URL || 'https://weathergpt-bjhy.onrender.com').replace(/\/$/, '');
let latestRouteId: string | null = null;

export function parseRouteGeometry(geometryData: any): [number, number][] {
  let rawCoords: any[] = [];
  if (Array.isArray(geometryData)) rawCoords = geometryData;
  else if (geometryData && typeof geometryData === 'object') {
    if (geometryData.type !== undefined && geometryData.type !== 'LineString') return [];
    if (Array.isArray(geometryData.coordinates)) rawCoords = geometryData.coordinates;
    else if (Array.isArray(geometryData.points)) rawCoords = geometryData.points;
    else if (geometryData.geometry) return parseRouteGeometry(geometryData.geometry);
  }
  return rawCoords.flatMap((point: any) => {
    if (Array.isArray(point) && point.length >= 2) {
      const longitude = Number(point[0]); const latitude = Number(point[1]);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return [];
      return [[latitude, longitude] as [number, number]];
    }
    if (point && typeof point === 'object') {
      const latitude = Number(point.lat ?? point.latitude); const longitude = Number(point.lng ?? point.lon ?? point.longitude);
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? [[latitude, longitude] as [number, number]] : [];
    }
    return [];
  });
}
async function fetchWithTimeout(endpoint: string, options: RequestInit = {}, timeoutMs = 20000, onSlow?: () => void) {
  const controller = new AbortController(); const slow = onSlow ? window.setTimeout(onSlow, 2800) : undefined; const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, { ...options, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    if (!response.ok) {
      let detail = '';
      try {
        const errorPayload = await response.clone().json();
        detail = typeof errorPayload?.detail === 'string'
          ? errorPayload.detail
          : typeof errorPayload?.message === 'string'
            ? errorPayload.message
            : typeof errorPayload?.error === 'string' ? errorPayload.error : '';
      } catch { /* provider may return an empty/non-JSON error body */ }
      throw new Error(`Backend request failed (${response.status})${detail ? `: ${detail}` : ''}`);
    }
    return response;
  }
  finally { if (slow) window.clearTimeout(slow); window.clearTimeout(timer); }
}

export async function apiResolveLocation(query?: string, latitude?: number, longitude?: number, onSlow?: () => void) {
  if (latitude !== undefined && longitude !== undefined) { const response = await fetchWithTimeout(`/location/reverse?latitude=${latitude}&longitude=${longitude}`, {}, 20000, onSlow); return response.json(); }
  if (!query?.trim()) throw new Error('Please enter a location.'); const places = await apiAutocompleteLocations(query); if (!places.length) throw new Error('Location not found.'); return places[0];
}

export async function apiAutocompleteLocations(query: string, _latitude?: number, _longitude?: number, _signal?: AbortSignal, limit = 8): Promise<ApiAutocompleteSuggestion[]> {
  if (query.trim().length < 2) return [];
  const response = await fetchWithTimeout(`/places/autocomplete?input=${encodeURIComponent(query.trim())}`, {}, 20000);
  const payload = await response.json();
  return (payload.suggestions || []).slice(0, limit).map((item:any) => ({
    place_id: String(item.place_id || item.id || item.name),
    name: item.name || item.display_name?.split(',')[0] || 'Unnamed place',
    formatted_address: item.formatted_address || item.display_name || item.address || item.name || 'Address unavailable',
    latitude: Number(item.latitude ?? item.lat),
    longitude: Number(item.longitude ?? item.lon ?? item.lng),
    type: item.type
  })).filter((item: ApiAutocompleteSuggestion) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
}

export async function apiCalculateRoute(origin: ApiPoint, destination: ApiPoint, travelMode = 'driving', onSlow?: () => void): Promise<ApiRouteResponse> {
  if (![origin.latitude, origin.longitude, destination.latitude, destination.longitude].every((value) => Number.isFinite(Number(value)))) {
    throw new Error('Please select valid start and destination locations before showing the route.');
  }
  const requestBody = {
    origin: { latitude: Number(origin.latitude), longitude: Number(origin.longitude), name: String(origin.name || 'Current location').trim() || 'Current location' },
    destination: { latitude: Number(destination.latitude), longitude: Number(destination.longitude), name: String(destination.name || 'Destination').trim() || 'Destination' },
    travel_mode: ['driving', 'walking', 'cycling', 'transit'].includes(travelMode) ? travelMode : 'driving'
  };
  console.log('[WeatherGPT route] request payload', requestBody);
  const response = await fetchWithTimeout('/route', { method: 'POST', body: JSON.stringify(requestBody) }, 30000, onSlow);
  const payload = await response.json();
  const rawGeometry = payload.geometry ?? payload.coordinates ?? payload.route?.geometry ?? payload.routes?.[0]?.geometry;
  const geometry = parseRouteGeometry(rawGeometry);
  if (!payload.route_id) {
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'The routing service did not return a route ID.');
  }
  if (geometry.length < 3) {
    throw new Error('The routing provider returned no usable road geometry for these locations.');
  }
  latestRouteId = payload.route_id;
  const alternatives = Array.isArray(payload.alternatives)
    ? payload.alternatives.map((item: any) => ({
        ...item,
        geometry: parseRouteGeometry(item.geometry),
        steps: Array.isArray(item.steps) ? item.steps : []
      })).filter((item: any) => item.route_id && item.geometry.length >= 3)
    : [];
  return { ...payload, geometry, alternatives, is_live: true, data_source: 'OSRM road geometry' };
}
export async function apiGetRouteWeather(routeOrGeometry:[number,number][]|string, _travelMode='driving', onSlow?:()=>void):Promise<ApiRouteWeatherResponse> {
  const routeId=typeof routeOrGeometry==='string'?routeOrGeometry:latestRouteId;
  if(!routeId) throw new Error('Create a route before loading route weather.');
  const response=await fetchWithTimeout('/route/weather',{method:'POST',body:JSON.stringify({route_id:routeId})},30000,onSlow);
  const payload=await response.json(); const segments=Array.isArray(payload.segments)?payload.segments:[]; const overall=payload.overall_risk||{};
  if (!payload.data_available || !segments.length) throw new Error('Live route weather is currently unavailable.');
  const levels=segments.map((s:any)=>String(s.risk?.level||'').toLowerCase());
  const rainRisk=levels.includes('high')?'High':levels.includes('moderate')?'Moderate':'Low';
  const numberOrNull=(value:any)=>typeof value==='number'&&Number.isFinite(value)?value:null;
  const toSafetyScore=(riskScore:any)=>{const value=numberOrNull(riskScore); return value===null?null:Math.max(0,Math.min(100,Math.round(100-value)));};
  return { safety_score:toSafetyScore(overall.score), rain_risk:rainRisk, waterlogging_risk:'Unavailable', wind_risk:'Unavailable', fog_risk:'Unavailable', thunderstorm_risk:'Unavailable', timeline:segments.map((s:any,i:number)=>{const probability=numberOrNull(s.weather?.rain_probability_percent); return {id:`segment-${i}`,name:`Route point ${i+1}`,expected_time:s.start_time||'Unavailable',distance_from_start_km:0,weather_condition:s.weather?.condition||'Unavailable',condition_icon:'partly-cloudy',temp_c:numberOrNull(s.weather?.temperature_c),feels_like_c:numberOrNull(s.weather?.temperature_c),rain_prob:probability,rain_intensity:probability===null?'None':probability>=70?'Heavy':probability>=40?'Moderate':probability>0?'Light':'None',precipitation_mm:numberOrNull(s.weather?.precipitation_mm),waterlogging_risk:'Unavailable',wind_speed_kmh:numberOrNull(s.weather?.wind_speed_kmh),safety_score:toSafetyScore(s.risk?.score),latitude:s.location?.latitude,longitude:s.location?.longitude,source_type:s.weather?.source_type};}),risk_zones:[],is_live:true,source:payload.data_mode === 'live_current_conditions_fallback' ? 'Live current conditions along route' : 'Live weather provider'};
}

export async function apiGetBestDepartureTime(routeId:string,_origin:ApiPoint,_destination:ApiPoint,currentSafetyScore:number|null,onSlow?:()=>void):Promise<ApiBestDepartureTimeResponse>{ const response=await fetchWithTimeout('/route/best-time',{method:'POST',body:JSON.stringify({route_id:routeId})},30000,onSlow); const payload=await response.json(); const options=(payload.alternative_times||[]).filter((x:any)=>typeof x?.risk?.score==='number').map((x:any,i:number)=>({id:`departure-${i}`,title:x.departure_time===payload.recommended_departure_time?'Recommended':'Alternative',time:x.departure_time,safety_score:Math.max(0,Math.min(100,Math.round(100-x.risk.score))),is_recommended:x.departure_time===payload.recommended_departure_time,note:payload.reason||'Live forecast recommendation',rain_risk:x.risk.level||'Unavailable'})); const best=options.find((x:any)=>x.is_recommended)||options[0]||null; return {route_id:routeId,current_safety_score:currentSafetyScore,warning:typeof currentSafetyScore==='number'&&currentSafetyScore<60,warning_message:typeof currentSafetyScore==='number'&&currentSafetyScore<60?'This route has elevated weather risk. Consider the recommended time.':'',best_departure_time:payload.recommended_departure_time||'',best_option:best,options}; }

export async function apiGetRouteExplanation(routeId:string,_params?:any,onSlow?:()=>void){const response=await fetchWithTimeout(`/route/${encodeURIComponent(routeId)}/explanation`,{},20000,onSlow);const payload=await response.json();return {...payload,explanation:Array.isArray(payload.explanation)?payload.explanation.join(' '):payload.explanation,factors:payload.explanation||[],safety_score:payload.risk_score};}

export async function apiGetNearbyPlaces(latitude:number,longitude:number,radiusKm=5,_category?:string,onSlow?:()=>void):Promise<ApiNearbyPlacesResponse>{const response=await fetchWithTimeout(`/places/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}`,{},12000,onSlow);const payload=await response.json();return {places:(payload.places||[]).filter((p:any)=>typeof p?.name==='string'&&Number.isFinite(Number(p?.latitude))&&Number.isFinite(Number(p?.longitude))).map((p:any)=>({id:String(p.place_id||`${p.name}-${p.latitude}-${p.longitude}`),name:p.name,category:p.category||'convenience',category_label:String(p.category||'place').replace('_',' ').toUpperCase(),rating:typeof p.rating==='number'?p.rating:0,reviews:typeof p.reviews==='number'?p.reviews:0,distance_meters:typeof p.distance_km==='number'?Math.round(p.distance_km*1000):0,walking_minutes:typeof p.distance_km==='number'?Math.max(1,Math.round(p.distance_km*12)):0,address:p.formatted_address||p.address||'Address unavailable',latitude:Number(p.latitude),longitude:Number(p.longitude),open_status:p.opening_hours||'Hours unavailable',shelter_feature:'Geoapify mapped place',route_relevance:'Near current location',phone:p.phone,website:p.website,opening_hours:p.opening_hours,is_live:true})),is_live:payload.is_live !== false};}
export async function apiGetPlacesAlongRoute(routePoints:[number,number][], radiusKm=0.8, onSlow?:()=>void):Promise<ApiNearbyPlacesResponse>{
  const coordinates=routePoints.map(([latitude,longitude])=>[Number(longitude),Number(latitude)]);
  const response=await fetchWithTimeout('/places/along-route',{method:'POST',body:JSON.stringify({coordinates,radius_km:radiusKm,limit_per_category:5})},30000,onSlow);
  const payload=await response.json();
  return {places:(payload.places||[]).filter((p:any)=>typeof p?.name==='string'&&Number.isFinite(Number(p?.latitude))&&Number.isFinite(Number(p?.longitude))).map((p:any)=>({id:String(p.place_id||`${p.name}-${p.latitude}-${p.longitude}`),name:p.name,category:p.category||'convenience',category_label:String(p.category||'place').replace('_',' ').toUpperCase(),rating:0,reviews:0,distance_meters:Math.round(Number(p.distance_from_route_km??p.distance_km??0)*1000),walking_minutes:Math.max(1,Math.round(Number(p.distance_from_route_km??p.distance_km??0)*12)),address:p.formatted_address||p.address||'Address not listed in OpenStreetMap',latitude:Number(p.latitude),longitude:Number(p.longitude),open_status:p.opening_hours||'Hours unavailable',shelter_feature:'Mapped OpenStreetMap place',route_relevance:`${Number(p.distance_from_route_km??p.distance_km??0).toFixed(2)} km from route · ${Number(p.distance_from_start_km??0).toFixed(1)} km from start`,phone:p.phone,website:p.website,opening_hours:p.opening_hours,distance_from_route_km:Number(p.distance_from_route_km??p.distance_km??0),distance_from_start_km:Number(p.distance_from_start_km??0),is_live:true})),is_live:true};
}

export async function apiGetPointWeather(latitude:number,longitude:number,onSlow?:()=>void):Promise<ApiPointWeatherResponse|null>{const response=await fetchWithTimeout(`/weather/current?latitude=${latitude}&longitude=${longitude}`,{},20000,onSlow);const payload=await response.json();const c=payload.current;if(!c || typeof c !== 'object') throw new Error('Weather provider returned no current conditions.');const numberOrNull=(value:any)=>typeof value==='number'&&Number.isFinite(value)?value:null;return {latitude,longitude,location_name:'Selected map location',temperature:numberOrNull(c.temperature_c),feels_like:numberOrNull(c.apparent_temperature_c),condition:typeof c.condition==='string'?c.condition:'Unavailable',condition_icon:'partly-cloudy',rain_probability:numberOrNull(c.precipitation_probability_percent),current_precipitation:numberOrNull(c.rain_mm ?? c.precipitation_mm),humidity:numberOrNull(c.humidity_percent),wind_speed:numberOrNull(c.wind_speed_kmh),wind_direction:typeof c.wind_direction_degrees==='number'?`${c.wind_direction_degrees}°`:'Unavailable',updated_time:typeof c.observed_at==='string'?c.observed_at:undefined,weather_source:payload.source||'Weather provider',is_live:true};}

export async function apiGetLocationWeather(latitude:number, longitude:number, onSlow?:()=>void){
  const [weather, location, forecastResponse, riskResponse, aqi] = await Promise.allSettled([
    apiGetPointWeather(latitude, longitude, onSlow),
    apiResolveLocation(undefined, latitude, longitude, onSlow).catch(() => ({ name: 'Current location', latitude, longitude })),
    fetchWithTimeout(`/weather/forecast?latitude=${latitude}&longitude=${longitude}&days=1`, {}, 20000, onSlow).then(r => r.json()).catch(() => null),
    fetchWithTimeout(`/decision/risk?latitude=${latitude}&longitude=${longitude}`, {}, 20000, onSlow).then(r => r.json()).catch(() => null),
    apiGetAirQuality(latitude, longitude, onSlow)
  ]);

  if (weather.status === 'rejected' || !weather.value) throw new Error('Current weather is unavailable.');
  const w = weather.value;
  const l = location.status === 'fulfilled' ? location.value : { name: 'Current location', latitude, longitude };
  
  if (forecastResponse.status === 'fulfilled' && forecastResponse.value?.forecast?.[0]) {
    const today = forecastResponse.value.forecast[0];
    w.maxTemp = today.temperature_max_c;
    w.minTemp = today.temperature_min_c;
    if (w.rain_probability == null) {
      w.rain_probability = today.precipitation_probability_percent;
    }
  }

  w.aqi = aqi.status === 'fulfilled' ? aqi.value : null;

  if (riskResponse.status === 'fulfilled' && riskResponse.value?.risk_score != null) {
    w.riskScore = riskResponse.value.risk_score;
    w.riskStatus = riskResponse.value.risk_level;
    const comps = riskResponse.value.risk_components || {};
    w.risks = {
      rain: comps.rain?.level || 'LOW',
      flood: comps.flood?.level || 'LOW',
      lightning: comps.lightning?.level || 'LOW',
      heat: comps.heat?.level || 'LOW'
    };
  }

  return { weather: w, location: l };
}

export async function apiGetAirQuality(latitude: number, longitude: number, onSlow?: () => void) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi`, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.current?.european_aqi ?? null;
  } catch (e) {
    return null;
  }
}

export async function apiGetClimateSummary(latitude: number, longitude: number, startYear: number, endYear: number, onSlow?:()=>void): Promise<ApiClimateSummary> {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), start_year: String(startYear), end_year: String(endYear) });
  const response = await fetchWithTimeout(`/climate/summary?${params.toString()}`, {}, 45000, onSlow);
  const payload = await response.json();
  if (!payload?.temperature?.trend || !payload?.rainfall?.trend) throw new Error('Climate provider returned incomplete historical data.');
  return payload as ApiClimateSummary;
}

export async function apiSendChat(query:string,options:any={},onSlow?:()=>void){const response=await fetchWithTimeout('/chat',{method:'POST',body:JSON.stringify({message:query,conversation_id:options.conversation_id,language:options.language||'en',profile:options.role||'citizen',latitude:options.latitude,longitude:options.longitude,location:options.location||options.location_name||null,route_context:options.route_context||null})},60000,onSlow);return response.json();}

export async function apiGetWeatherBriefing(userLocation: string, language = 'en', persona = 'A cautious, practical local travel guide', onSlow?: () => void) {
  const response = await fetchWithTimeout('/get-weather-briefing', { method: 'POST', body: JSON.stringify({ user_location: userLocation, language, persona }) }, 90000, onSlow);
  return response.json();
}

export async function apiSynthesizeVoice(text: string, language: string, onSlow?: () => void) {
  const response = await fetchWithTimeout('/voice/synthesize', {
    method: 'POST',
    body: JSON.stringify({ text, language })
  }, 45000, onSlow);
  return response.json();
}

export async function apiGetRecommendedQuestions(persona:string, language:string, hasRoute=false):Promise<string[]> {
  const params = new URLSearchParams({persona, language, has_route: String(hasRoute)});
  const response = await fetchWithTimeout(`/templates/recommended?${params.toString()}`, {}, 8000);
  const payload = await response.json();
  return Array.isArray(payload.questions) ? payload.questions.filter((item:any)=>typeof item === 'string').slice(0, 4) : [];
}
