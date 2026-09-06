// Compatibility layer between the Remix interface and the existing Render API.
export interface ApiPoint { latitude: number; longitude: number; name?: string; }
export interface ApiRouteResponse { route_id: string; origin: ApiPoint; destination: ApiPoint; travel_mode: string; distance_km: number; duration_minutes: number; geometry: [number, number][]; steps: any[]; is_live: boolean; data_source: string; }
export interface ApiRouteWeatherResponse { safety_score: number | null; rain_risk: any; waterlogging_risk: any; wind_risk: any; fog_risk: any; thunderstorm_risk: any; timeline: any[]; risk_zones: any[]; is_live: boolean; source: string; }
export interface ApiBestDepartureTimeResponse { route_id: string; current_safety_score: number | null; warning: boolean; warning_message: string; best_departure_time: string; best_option: any; options: any[]; }
export interface ApiPointWeatherResponse { latitude:number; longitude:number; location_name:string; temperature:number; feels_like:number; condition:string; condition_icon:string; rain_probability:number; current_precipitation:number; humidity:number; wind_speed:number; wind_direction:string; visibility?:number; weather_risk?:string; nearby_alerts?:string[]; updated_time?:string; weather_source:string; is_live:boolean; route_point_info?:any; }
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

export async function apiAutocompleteLocations(query: string): Promise<any[]> {
  if (query.trim().length < 2) return []; const response = await fetchWithTimeout(`/places/autocomplete?input=${encodeURIComponent(query.trim())}`, {}, 20000); const payload = await response.json(); return (payload.suggestions || []).map((item:any) => ({ ...item, display_name:item.formatted_address || item.address || item.name }));
}

export async function apiCalculateRoute(origin: ApiPoint, destination: ApiPoint, travelMode = 'driving', onSlow?: () => void): Promise<ApiRouteResponse> {
  const response = await fetchWithTimeout('/route', { method:'POST', body:JSON.stringify({ origin, destination, travel_mode:travelMode }) }, 30000, onSlow); const payload=await response.json(); latestRouteId=payload.route_id; return { ...payload, geometry:(payload.geometry?.coordinates || []).map((p:[number,number])=>[p[1],p[0]]), is_live:true, data_source:'Render backend' };
}

export async function apiGetRouteWeather(routeOrGeometry:[number,number][]|string, _travelMode='driving', onSlow?:()=>void):Promise<ApiRouteWeatherResponse> {
  const routeId=typeof routeOrGeometry==='string'?routeOrGeometry:latestRouteId; if(!routeId) throw new Error('Create a route before loading route weather.'); const response=await fetchWithTimeout('/route/weather',{method:'POST',body:JSON.stringify({route_id:routeId})},30000,onSlow); const payload=await response.json(); const segments=payload.segments||[]; const overall=payload.overall_risk||{}; const levels=segments.map((s:any)=>String(s.risk?.level||'').toLowerCase()); const rainRisk=levels.includes('high')?'High':levels.includes('moderate')?'Moderate':levels.length?'Low':'Unavailable';
  return { safety_score:typeof overall.score==='number'?Math.round(overall.score):null, rain_risk:rainRisk, waterlogging_risk:'Unavailable', wind_risk:'Unavailable', fog_risk:'Unavailable', thunderstorm_risk:'Unavailable', timeline:segments.map((s:any,i:number)=>({id:`segment-${i}`,name:`Route point ${i+1}`,expected_time:s.start_time||'Unavailable',distance_from_start_km:0,weather_condition:s.weather?.condition||'Unavailable',condition_icon:'partly-cloudy',temp_c:Number(s.weather?.temperature_c||0),feels_like_c:Number(s.weather?.temperature_c||0),rain_prob:Number(s.weather?.rain_probability_percent||0),rain_intensity:Number(s.weather?.rain_probability_percent||0)>=70?'Heavy':Number(s.weather?.rain_probability_percent||0)>=40?'Moderate':Number(s.weather?.rain_probability_percent||0)>0?'Light':'None',precipitation_mm:Number(s.weather?.precipitation_mm||0),waterlogging_risk:'Unavailable',wind_speed_kmh:Number(s.weather?.wind_speed_kmh||0),safety_score:typeof s.risk?.score==='number'?Math.round(s.risk.score):0,latitude:s.location?.latitude,longitude:s.location?.longitude})),risk_zones:[],is_live:Boolean(payload.data_available),source:payload.data_available?'Render backend':'Unavailable'};
}

export async function apiGetBestDepartureTime(routeId:string,_origin:ApiPoint,_destination:ApiPoint,currentSafetyScore:number|null,onSlow?:()=>void):Promise<ApiBestDepartureTimeResponse>{ const response=await fetchWithTimeout('/route/best-time',{method:'POST',body:JSON.stringify({route_id:routeId})},30000,onSlow); const payload=await response.json(); const options=(payload.alternative_times||[]).map((x:any,i:number)=>({id:`departure-${i}`,title:x.departure_time===payload.recommended_departure_time?'Recommended':'Alternative',time:x.departure_time,safety_score:x.risk?.score??0,is_recommended:x.departure_time===payload.recommended_departure_time,note:payload.reason||'Backend forecast recommendation',rain_risk:x.risk?.level||'Unavailable'})); const best=options.find((x:any)=>x.is_recommended)||options[0]; return {route_id:routeId,current_safety_score:currentSafetyScore,warning:(currentSafetyScore??100)<80,warning_message:(currentSafetyScore??100)<80?'This route has some weather risk. Consider the recommended time.':'',best_departure_time:payload.recommended_departure_time||'',best_option:best||{id:'unavailable',title:'Unavailable',time:'Unavailable',safety_score:0,is_recommended:false,note:payload.reason||'Unavailable',rain_risk:'Low'},options}; }

export async function apiGetRouteExplanation(routeId:string,_params?:any,onSlow?:()=>void){const response=await fetchWithTimeout(`/route/${encodeURIComponent(routeId)}/explanation`,{},20000,onSlow);const payload=await response.json();return {...payload,explanation:Array.isArray(payload.explanation)?payload.explanation.join(' '):payload.explanation,factors:payload.explanation||[],safety_score:payload.risk_score};}

export async function apiGetNearbyPlaces(latitude:number,longitude:number,radiusKm=5,_category?:string,onSlow?:()=>void):Promise<ApiNearbyPlacesResponse>{const response=await fetchWithTimeout(`/places/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}`,{},20000,onSlow);const payload=await response.json();return {places:(payload.places||[]).map((p:any)=>({id:p.place_id,name:p.name,category:p.category||'convenience',category_label:String(p.category||'place').toUpperCase(),rating:0,reviews:0,distance_meters:Math.round((p.distance_km||0)*1000),walking_minutes:Math.max(1,Math.round((p.distance_km||0)*12)),address:p.formatted_address||p.address||'Near route',latitude:p.latitude,longitude:p.longitude,open_status:'Hours unavailable',shelter_feature:'Nearby route place',route_relevance:'Near selected route',is_live:true})),is_live:true};}

export async function apiGetPointWeather(latitude:number,longitude:number,onSlow?:()=>void):Promise<ApiPointWeatherResponse|null>{const response=await fetchWithTimeout(`/weather/current?latitude=${latitude}&longitude=${longitude}`,{},20000,onSlow);const payload=await response.json();const c=payload.current||{};return {latitude,longitude,location_name:'Selected map location',temperature:Number(c.temperature_c||0),feels_like:Number(c.apparent_temperature_c||c.temperature_c||0),condition:c.condition||'Current conditions',condition_icon:'partly-cloudy',rain_probability:0,current_precipitation:Number(c.rain_mm||c.precipitation_mm||0),humidity:Number(c.humidity_percent||0),wind_speed:Number(c.wind_speed_kmh||0),wind_direction:'Live',weather_source:payload.source||'Render backend',is_live:true};}

export async function apiGetLocationWeather(latitude:number, longitude:number, onSlow?:()=>void){
  const [weather, location] = await Promise.all([
    apiGetPointWeather(latitude, longitude, onSlow),
    apiResolveLocation(undefined, latitude, longitude, onSlow).catch(() => ({ name: 'Current location', latitude, longitude }))
  ]);
  if (!weather) throw new Error('Current weather is unavailable.');
  return { weather, location };
}

export async function apiSendChat(query:string,options:any={},onSlow?:()=>void){const context=options.route_context?` Route context: ${JSON.stringify(options.route_context)}`:'';const response=await fetchWithTimeout('/chat',{method:'POST',body:JSON.stringify({message:query+context,conversation_id:options.conversation_id,language:options.language||'en',profile:options.role||'citizen'})},30000,onSlow);return response.json();}
