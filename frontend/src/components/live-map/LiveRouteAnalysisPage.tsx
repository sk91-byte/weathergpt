import React, { useMemo, useState } from 'react';
import { LiveMapRoute, NearbySafePlace, DepartureTimeOption, WeatherData, WeatherAlert } from '../../types';
import { ChevronLeft, Navigation, Sparkles, Clock, MapPin, MessageSquare } from '../Icons';

interface LiveRouteAnalysisPageProps {
  originName: string;
  destinationName: string;
  routes: LiveMapRoute[];
  activeRouteId: string;
  departureOptions: DepartureTimeOption[];
  currentWeather: WeatherData;
  nearbyPlaces: NearbySafePlace[];
  routeAlerts: WeatherAlert[];
  aiAnalysis: string;
  aiLoading: boolean;
  isLive: boolean;
  onSelectRoute: (id: string) => void;
  onBack: () => void;
  onStartNavigation: () => void;
  onAnalyzeAI: () => void;
  onOpenChat: () => void;
  onOpenWhyRoute: (route: LiveMapRoute) => void;
  onOpenTimeline: (route: LiveMapRoute) => void;
  onSmartWait: (minutes: number) => void;
  onNearbyCategory: (category: 'all' | 'cafe' | 'restaurant' | 'hotel' | 'petrol' | 'hospital') => void;
}

const riskTone = (route: LiveMapRoute) => route.color === 'green'
  ? { card: 'border-emerald-300 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', value: 'text-emerald-700' }
  : route.color === 'red'
    ? { card: 'border-red-300 bg-red-50', badge: 'bg-red-100 text-red-800 border-red-300', value: 'text-red-700' }
    : { card: 'border-amber-300 bg-amber-50', badge: 'bg-amber-100 text-amber-800 border-amber-300', value: 'text-amber-700' };

export const LiveRouteAnalysisPage: React.FC<LiveRouteAnalysisPageProps> = ({
  originName, destinationName, routes, activeRouteId, departureOptions, currentWeather,
  nearbyPlaces, routeAlerts, aiAnalysis, aiLoading, isLive, onSelectRoute, onBack, onStartNavigation,
  onAnalyzeAI, onOpenChat, onOpenWhyRoute, onOpenTimeline, onSmartWait, onNearbyCategory
}) => {
  const [nearbyCategory, setNearbyCategory] = useState<'all' | 'cafe' | 'restaurant' | 'hotel' | 'petrol' | 'hospital'>('restaurant');
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(null);
  const activeRoute = routes.find((route) => route.id === activeRouteId) || routes[0];
  const waitOption = departureOptions.find((option) => option.isRecommended) || departureOptions[0];
  const visiblePlaces = useMemo(() => nearbyPlaces.filter((place) => nearbyCategory === 'all' || place.category === nearbyCategory), [nearbyCategory, nearbyPlaces]);
  if (!activeRoute) return null;

  const risk = activeRoute.safetyScore == null ? null : Math.max(0, Math.min(100, 100 - activeRoute.safetyScore));
  const tone = riskTone(activeRoute);
  const activeAlerts = routeAlerts.filter((alert) => alert.isActive);
  const primaryAlert = activeAlerts[0];
  const alertLabel = primaryAlert
    ? `${primaryAlert.type === 'cyclone' ? 'Cyclone' : primaryAlert.type === 'flood' ? 'Flood' : primaryAlert.type === 'earthquake' ? 'Earthquake' : primaryAlert.type === 'heatwave' ? 'Heatwave' : primaryAlert.type === 'thunderstorm' ? 'Thunderstorm' : primaryAlert.type === 'strong-winds' ? 'Strong winds' : 'Disaster alert'}: ${primaryAlert.title}`
    : 'No disaster alert noticed';

  const selectNearby = (category: typeof nearbyCategory) => {
    setNearbyCategory(category);
    onNearbyCategory(category);
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-50 text-slate-900 pb-10">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="rounded-xl bg-slate-100 p-2.5 text-slate-700 hover:bg-slate-200" aria-label="Back to live map">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-black"><span className="rounded-md bg-blue-600 px-1.5 py-1 text-xs text-white">W</span> WeatherGPT Route Intelligence</div>
            <div className="truncate text-xs font-semibold text-slate-500">Destination: <span className="text-slate-900">{destinationName}</span></div>
          </div>
          <span className="rounded-xl border border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-600">⚡ {isLive ? 'LIVE DATA' : 'DATA UNAVAILABLE'}</span>
        </div>
        <div className="mx-auto mt-3 flex max-w-md items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{originName}<span className="text-slate-400">→</span><span className="h-2.5 w-2.5 rounded-full bg-red-500" />{destinationName}</div>
      </div>

      <main className="mx-auto max-w-md space-y-4 p-4">
        <section>
          <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-black text-slate-600">ROUTE OPTIONS COMPARISON ({routes.length})</h2><span className="text-xs font-bold text-blue-600">Select a route to view details</span></div>
          <div className="space-y-3">
            {routes.map((route) => {
              const selected = route.id === activeRouteId;
              const routeTone = riskTone(route);
              const routeRisk = route.safetyScore == null ? null : Math.max(0, Math.min(100, 100 - route.safetyScore));
              const routeLabel = route.color === 'green' ? 'SAFEST ROUTE' : route.color === 'red' ? 'HIGH WEATHER RISK' : 'FASTEST ROUTE';
              return (
                <div key={route.id} onClick={() => onSelectRoute(route.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelectRoute(route.id); }} role="button" tabIndex={0} className={`w-full rounded-3xl border-2 p-4 text-left shadow-sm transition ${selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                  <div className="flex items-start justify-between gap-2"><span className={`rounded-xl border px-3 py-1.5 text-xs font-black ${routeTone.badge}`}>{route.color === 'green' ? '🟢' : route.color === 'red' ? '🔴' : '🟠'} {routeLabel}</span><span className={`rounded-xl border px-3 py-1.5 text-xs font-black ${routeTone.badge}`}>WEATHER SAFETY <strong className={routeTone.value}>{route.safetyScore == null ? '—' : route.safetyScore}</strong>/100</span></div>
                  <div className="mt-3 flex items-center justify-between gap-2"><div><h3 className="text-base font-black">{route.name || 'WeatherGPT route'}</h3><p className="text-sm font-bold text-slate-500">{route.distanceKm} km · {route.durationMinutes} min</p></div><span className="text-sm font-semibold text-slate-700">☁️ {route.summaryCondition || 'Live weather loading'}</span></div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-white/80 p-2"><span className="block text-slate-400">🌧 Rain Risk</span><strong>{route.rainRisk || 'Unavailable'}</strong></div><div className="rounded-xl bg-white/80 p-2"><span className="block text-slate-400">〰 Waterlogging</span><strong>{route.waterloggingRisk || 'Unavailable'}</strong></div><div className={`rounded-xl p-2 ${primaryAlert ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}><span className="block text-slate-500">⚡ {primaryAlert ? 'Active Alert' : 'Disaster Alerts'}</span><strong className="block truncate" title={alertLabel}>{alertLabel}</strong></div></div>
                  <div className={`mt-3 rounded-2xl border p-3 text-xs leading-relaxed ${routeRisk != null && routeRisk >= 60 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}><strong>{routeRisk != null && routeRisk >= 60 ? 'Hazard Warning: ' : 'Recommendation: '}</strong>{route.whyThisRoute || route.departureAdvice || 'Live route guidance is being calculated from current weather data.'}</div>
                  {selected && <><div className="mt-3 flex gap-2"><span className="rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-black text-white">SELECTED ROUTE</span><span className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600">Live provider data</span></div><div className="mt-3 flex gap-2"><button type="button" onClick={(event) => { event.stopPropagation(); onOpenWhyRoute(route); }} className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700">✨ Why this route?</button><button type="button" onClick={(event) => { event.stopPropagation(); onOpenTimeline(route); }} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">Timeline</button></div></>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black">✨ AI WEATHER & SAFETY ANALYSIS</h2><span className="text-[10px] font-black text-emerald-600">{isLive ? 'LIVE' : 'UNAVAILABLE'}</span></div><div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm leading-relaxed">{aiLoading ? 'WeatherGPT is analysing the selected route using live weather, route risk, and safety data…' : aiAnalysis || 'Tap Analyse AI to generate a grounded live explanation for this route.'}</div><div className="mt-3 flex gap-2"><button type="button" onClick={onAnalyzeAI} className="flex-1 rounded-xl bg-blue-600 px-3 py-3 text-xs font-black text-white hover:bg-blue-700"><Sparkles className="mr-1 inline h-4 w-4" /> Analyse with AI</button><button type="button" onClick={onOpenChat} className="rounded-xl border border-blue-200 bg-white px-3 py-3 text-xs font-black text-blue-700"><MessageSquare className="mr-1 inline h-4 w-4" /> Ask AI</button></div></section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black"><Clock className="mr-1 inline h-4 w-4 text-amber-500" /> BEST DEPARTURE TIME AI</h2><span className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">Dynamic forecast</span></div><p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm">{activeRoute.departureAdvice || 'Departure advice is calculated from live route conditions.'}</p><div className="mt-3 grid grid-cols-3 gap-2">{departureOptions.map((option) => <button type="button" key={option.id} onClick={() => { setSelectedDepartureId(option.id); if (option.id.toLowerCase().includes('wait')) onSmartWait(20); }} className={`rounded-2xl border p-3 text-center ${selectedDepartureId === option.id || (!selectedDepartureId && option.isRecommended) ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 bg-slate-50'}`}><span className="block text-[10px] font-black uppercase">{option.isRecommended ? '⭐ Recommended' : option.title}</span><strong className="mt-2 block text-sm">{option.time}</strong><span className="text-xs font-bold text-emerald-700">Safety: {option.safetyScore}/100</span><span className="mt-1 block text-[10px] text-slate-500">Arrive in {option.travelTime}</span></button>)}</div></section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-black"><MapPin className="mr-1 inline h-4 w-4 text-purple-600" /> PLACES TO WAIT NEARBY</h2><p className="text-xs text-slate-500">Live Geoapify places near your route</p></div><span className="text-xs font-bold text-slate-500">{nearbyPlaces.length} found</span></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{(['restaurant', 'cafe', 'convenience', 'petrol', 'hospital'] as const).map((category) => <button type="button" key={category} onClick={() => selectNearby(category === 'convenience' ? 'all' : category)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${nearbyCategory === (category === 'convenience' ? 'all' : category) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{category === 'restaurant' ? '🍽 Restaurants' : category === 'cafe' ? '☕ Cafes' : category === 'convenience' ? '🏪 Stores' : category === 'petrol' ? '⛽ Petrol' : '🏥 Hospitals'}</button>)}</div><div className="mt-3 space-y-2">{visiblePlaces.slice(0, 6).map((place) => <button type="button" key={place.id} onClick={() => onNearbyCategory(nearbyCategory)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left"><span className="min-w-0"><strong className="block truncate text-sm">{place.name}</strong><span className="block truncate text-xs text-slate-500">{place.distanceMeters} m away · {place.walkingMinutes} min walk</span><span className="block truncate text-xs text-emerald-700">🛡️ {place.shelterFeature || 'Mapped nearby place'}</span></span><span className="ml-2 shrink-0 rounded-xl border border-blue-200 bg-white px-2 py-2 text-[10px] font-black text-blue-600">VIEW ON MAP</span></button>)}{visiblePlaces.length === 0 && <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">Tap a category to load real nearby places.</div>}</div></section>

        <button type="button" onClick={onStartNavigation} className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700"><Navigation className="mr-2 inline h-5 w-5" /> START NAVIGATION</button>
      </main>
    </div>
  );
};
