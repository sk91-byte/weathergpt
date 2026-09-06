// Compatibility layer between the Remix interface and the existing Render API.
export interface ApiPoint { latitude: number; longitude: number; name?: string; }
export interface ApiAutocompleteSuggestion { place_id: string; name: string; formatted_address: string; latitude: number; longitude: number; type?: string; }
export interface ApiRouteResponse { route_id: string; origin: ApiPoint; destination: ApiPoint; travel_mode: string; distance_km: number; duration_minutes: number; geometry: [number, number][]; steps: any[]; is_live: boolean; data_source: string; }
export interface ApiRouteWeatherResponse { safety_score: number | null; rain_risk: any; waterlogging_risk: any; wind_risk: any; fog_risk: any; thunderstorm_risk: any; timeline: any[]; risk_zones: any[]; is_live: boolean; source: string; }
export interface ApiBestDepartureTimeResponse { route_id: string; current_safety_score: number | null; warning: boolean; warning_message: string; best_departure_time: string; best_option: any; options: any[]; }
export interface ApiPointWeatherResponse { latitude:number; longitude:number; location_name:string; temperature:number | null; feels_like:number | null; condition:string; condition_icon:string; rain_probability:number | null; current_precipitation:number | null; humidity:number | null; wind_speed:number | null; wind_direction:string; visibility?:number; weather_risk?:string; nearby_alerts?:string[]; updated_time?:string; weather_source:string; is_live:boolean; route_point_info?:any; }
export interface ApiNearbyPlaceItem { id:string; name:string; category:any; category_label:string; rating:number; reviews:number; distance_meters:number; walking_minutes:number; address:string; latitude:number; longitude:number; open_status:string; shelter_feature:string; route_relevance:string; phone?:string; is_live:boolean; }
export interface ApiNearbyPlacesResponse { places: ApiNearbyPlaceItem[]; recommended_wait_place?: ApiNearbyPlaceItem; is_live:boolean; }

export const BACKEND_BASE_URL = ((import.meta as any).env?.VITE_BACKEND_BASE_URL || 'https://weathergpt-bjhy.onrender.com').replace(/\/$/, '');
let latestRouteId: string | null = null;

async function fetchWithTimeout(endpoint: string, options: RequestInit = {}, timeoutMs = 20000, onSlow?: () => void) {
  const controller = new AbortController(); const slow = onSlow ? window.setTimeout(onSlow, 2800) : undefined; const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try { const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, { ...options, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } }); if (!response.ok) throw new Error(`Backend request failed (${response.status})`); return response; }
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
  const response = await fetchWithTimeout('/route', { method:'POST', body:JSON.stringify({ origin, destination, travel_mode:travelMode }) }, 30000, onSlow);
  const payload=await response.json();
  const geometry=(payload.geometry?.coordinates || []).map((p:[number,number])=>[p[1],p[0]]);
  if (!payload.route_id || geometry.length < 2) throw new Error('The routing service returned an invalid route.');
  latestRouteId=payload.route_id;
  return { ...payload, geometry, is_live:true, data_source:'OSRM route service' };
}

export async function apiGetRouteWeather(routeOrGeometry:[number,number][]|string, _travelMode='driving', onSlow?:()=>void):Promise<ApiRouteWeatherResponse> {
  const routeId=typeof routeOrGeometry==='string'?routeOrGeometry:latestRouteId;
  if(!routeId) throw new Error('Create a route before loading route weather.');
  const response=await fetchWithTimeout('/route/weather',{method:'POST',body:JSON.stringify({route_id:routeId})},30000,onSlow);
  const payload=await response.json(); const segments=Array.isArray(payload.segments)?payload.segments:[]; const overall=payload.overall_risk||{};
  if (!payload.data_available || !segments.length || typeof overall.score !== 'number') throw new Error('Live route weather is currently unavailable.');
  const levels=segments.map((s:any)=>String(s.risk?.level||'').toLowerCase());
  const rainRisk=levels.includes('high')?'High':levels.includes('moderate')?'Moderate':'Low';
  const numberOrNull=(value:any)=>typeof value==='number'&&Number.isFinite(value)?value:null;
  return { safety_score:numberOrNull(overall.score)===null?null:Math.round(overall.score), rain_risk:rainRisk, waterlogging_risk:'Unavailable', wind_risk:'Unavailable', fog_risk:'Unavailable', thunderstorm_risk:'Unavailable', timeline:segments.map((s:any,i:number)=>{const probability=numberOrNull(s.weather?.rain_probability_percent); return {id:`segment-${i}`,name:`Route point ${i+1}`,expected_time:s.start_time||'Unavailable',distance_from_start_km:0,weather_condition:s.weather?.condition||'Unavailable',condition_icon:'partly-cloudy',temp_c:numberOrNull(s.weather?.temperature_c),feels_like_c:numberOrNull(s.weather?.temperature_c),rain_prob:probability,rain_intensity:probability===null?'None':probability>=70?'Heavy':probability>=40?'Moderate':probability>0?'Light':'None',precipitation_mm:numberOrNull(s.weather?.precipitation_mm),waterlogging_risk:'Unavailable',wind_speed_kmh:numberOrNull(s.weather?.wind_speed_kmh),safety_score:numberOrNull(s.risk?.score),latitude:s.location?.latitude,longitude:s.location?.longitude};}),risk_zones:[],is_live:true,source:'Live weather provider'};
}

export async function apiGetBestDepartureTime(routeId:string,_origin:ApiPoint,_destination:ApiPoint,currentSafetyScore:number|null,onSlow?:()=>void):Promise<ApiBestDepartureTimeResponse>{ const response=await fetchWithTimeout('/route/best-time',{method:'POST',body:JSON.stringify({route_id:routeId})},30000,onSlow); const payload=await response.json(); const options=(payload.alternative_times||[]).filter((x:any)=>typeof x?.risk?.score==='number').map((x:any,i:number)=>({id:`departure-${i}`,title:x.departure_time===payload.recommended_departure_time?'Recommended':'Alternative',time:x.departure_time,safety_score:x.risk.score,is_recommended:x.departure_time===payload.recommended_departure_time,note:payload.reason||'Live forecast recommendation',rain_risk:x.risk.level||'Unavailable'})); const best=options.find((x:any)=>x.is_recommended)||options[0]||null; return {route_id:routeId,current_safety_score:currentSafetyScore,warning:typeof currentSafetyScore==='number'&&currentSafetyScore<80,warning_message:typeof currentSafetyScore==='number'&&currentSafetyScore<80?'This route has some weather risk. Consider the recommended time.':'',best_departure_time:payload.recommended_departure_time||'',best_option:best,options}; }

export async function apiGetRouteExplanation(routeId:string,_params?:any,onSlow?:()=>void){const response=await fetchWithTimeout(`/route/${encodeURIComponent(routeId)}/explanation`,{},20000,onSlow);const payload=await response.json();return {...payload,explanation:Array.isArray(payload.explanation)?payload.explanation.join(' '):payload.explanation,factors:payload.explanation||[],safety_score:payload.risk_score};}

export async function apiGetNearbyPlaces(latitude:number,longitude:number,radiusKm=5,_category?:string,onSlow?:()=>void):Promise<ApiNearbyPlacesResponse>{const response=await fetchWithTimeout(`/places/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}`,{},20000,onSlow);const payload=await response.json();return {places:(payload.places||[]).filter((p:any)=>typeof p?.name==='string'&&Number.isFinite(p?.latitude)&&Number.isFinite(p?.longitude)).map((p:any)=>({id:p.place_id,name:p.name,category:p.category||'convenience',category_label:String(p.category||'place').toUpperCase(),rating:0,reviews:0,distance_meters:typeof p.distance_km==='number'?Math.round(p.distance_km*1000):0,walking_minutes:typeof p.distance_km==='number'?Math.max(1,Math.round(p.distance_km*12)):0,address:p.formatted_address||p.address||'Address unavailable',latitude:p.latitude,longitude:p.longitude,open_status:'Hours unavailable',shelter_feature:'OpenStreetMap place',route_relevance:'Near selected destination',is_live:true})),is_live:true};}

export async function apiGetPointWeather(latitude:number,longitude:number,onSlow?:()=>void):Promise<ApiPointWeatherResponse|null>{const response=await fetchWithTimeout(`/weather/current?latitude=${latitude}&longitude=${longitude}`,{},20000,onSlow);const payload=await response.json();const c=payload.current;if(!c || typeof c !== 'object') throw new Error('Weather provider returned no current conditions.');const numberOrNull=(value:any)=>typeof value==='number'&&Number.isFinite(value)?value:null;return {latitude,longitude,location_name:'Selected map location',temperature:numberOrNull(c.temperature_c),feels_like:numberOrNull(c.apparent_temperature_c),condition:typeof c.condition==='string'?c.condition:'Unavailable',condition_icon:'partly-cloudy',rain_probability:numberOrNull(c.precipitation_probability_percent),current_precipitation:numberOrNull(c.rain_mm ?? c.precipitation_mm),humidity:numberOrNull(c.humidity_percent),wind_speed:numberOrNull(c.wind_speed_kmh),wind_direction:typeof c.wind_direction_degrees==='number'?`${c.wind_direction_degrees}°`:'Unavailable',updated_time:typeof c.observed_at==='string'?c.observed_at:undefined,weather_source:payload.source||'Weather provider',is_live:true};}

export async function apiGetLocationWeather(latitude:number, longitude:number, onSlow?:()=>void){
  const [weather, location] = await Promise.all([
    apiGetPointWeather(latitude, longitude, onSlow),
    apiResolveLocation(undefined, latitude, longitude, onSlow).catch(() => ({ name: 'Current location', latitude, longitude }))
  ]);
  if (!weather) throw new Error('Current weather is unavailable.');
  return { weather, location };
}

export async function apiSendChat(query:string,options:any={},onSlow?:()=>void){const response=await fetchWithTimeout('/chat',{method:'POST',body:JSON.stringify({message:query,conversation_id:options.conversation_id,language:options.language||'en',profile:options.role||'citizen',latitude:options.latitude,longitude:options.longitude,route_context:options.route_context||null})},30000,onSlow);return response.json();}
