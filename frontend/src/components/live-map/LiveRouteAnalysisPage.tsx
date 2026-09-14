import React, { useEffect, useMemo, useState } from 'react';
import { LiveMapRoute, NearbySafePlace, DepartureTimeOption, WeatherData, WeatherAlert } from '../../types';
import { ChevronLeft, Navigation, Sparkles, Clock, MapPin, MessageSquare } from '../Icons';
import { apiGetWeatherBriefing } from '../../services/api';

interface LiveRouteAnalysisPageProps {
  originName: string;
  destinationName: string;
  routes: LiveMapRoute[];
  activeRouteId: string;
  departureOptions: DepartureTimeOption[];
  currentWeather: WeatherData;
  language: string;
  nearbyPlaces: NearbySafePlace[];
  routeAlerts: WeatherAlert[];
  routeAlertsLoading: boolean;
  routeAlertsError: string | null;
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
  originName, destinationName, routes, activeRouteId, departureOptions, currentWeather, language,
  nearbyPlaces, routeAlerts, routeAlertsLoading, routeAlertsError, aiAnalysis, aiLoading, isLive, onSelectRoute, onBack, onStartNavigation,
  onAnalyzeAI, onOpenChat, onOpenWhyRoute, onOpenTimeline, onSmartWait, onNearbyCategory
}) => {
  const [nearbyCategory, setNearbyCategory] = useState<'all' | 'cafe' | 'restaurant' | 'hotel' | 'petrol' | 'hospital'>('restaurant');
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(null);
  const [imdBriefing, setImdBriefing] = useState<any>(null);
  const [imdLoading, setImdLoading] = useState(false);
  const [imdError, setImdError] = useState<string | null>(null);
  const activeRoute = routes.find((route) => route.id === activeRouteId) || routes[0];
  const waitOption = departureOptions.find((option) => option.isRecommended) || departureOptions[0];
  const visiblePlaces = useMemo(() => nearbyPlaces.filter((place) => nearbyCategory === 'all' || place.category === nearbyCategory), [nearbyCategory, nearbyPlaces]);
  if (!activeRoute) return null;

  const risk = activeRoute.safetyScore == null ? null : Math.max(0, Math.min(100, 100 - activeRoute.safetyScore));
  const tone = riskTone(activeRoute);
  const activeAlerts = routeAlerts.filter((alert) => alert.isActive);
  const routeRelevantAlerts = activeAlerts.filter((alert) => alert.isNearby);
  const distantAlerts = activeAlerts.filter((alert) => !alert.isNearby);
  const primaryAlert = routeRelevantAlerts[0] || activeAlerts[0];
  const primaryAlertIsNearby = Boolean(primaryAlert?.isNearby);
  const alertLabel = primaryAlert
    ? `${primaryAlert.type === 'cyclone' ? 'Cyclone' : primaryAlert.type === 'flood' ? 'Flood' : primaryAlert.type === 'earthquake' ? 'Earthquake' : primaryAlert.type === 'tsunami' ? 'Tsunami' : primaryAlert.type === 'heatwave' ? 'Heatwave' : primaryAlert.type === 'thunderstorm' ? 'Thunderstorm' : primaryAlert.type === 'strong-winds' ? 'Strong winds' : 'Disaster alert'}: ${primaryAlert.title}`
    : 'No disaster alert noticed';

  useEffect(() => {
    if (!activeRoute || !originName || !destinationName || activeAlerts.length === 0) {
      setImdBriefing(null);
      setImdError(null);
      setImdLoading(false);
      return;
    }
    let cancelled = false;
    setImdLoading(true);
    setImdError(null);
    setImdBriefing(null);
    apiGetWeatherBriefing(`${originName} to ${destinationName}`, language === 'hinglish' ? 'en' : language, 'A cautious local travel guide')
      .then((data) => {
        if (cancelled) return;
        if (data?.detail) throw new Error(data.detail);
        setImdBriefing(data);
      })
      .catch((error) => { if (!cancelled) setImdError(error instanceof Error ? error.message : 'IMD briefing unavailable'); })
      .finally(() => { if (!cancelled) setImdLoading(false); });
    return () => { cancelled = true; };
  }, [activeRoute?.id, originName, destinationName, language, activeAlerts.length]);

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
        {routeAlertsLoading ? <section className="rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm"><div className="flex items-center gap-3"><span className="h-3 w-3 animate-pulse rounded-full bg-blue-600" /><div><p className="text-xs font-black uppercase tracking-wide text-blue-800">Checking official disaster feeds</p><p className="mt-1 text-sm font-semibold text-slate-700">Verifying NDMA SACHET and official warning data along this route…</p></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full w-2/3 animate-pulse rounded-full bg-blue-600" /></div></section> : routeAlertsError ? <section className="rounded-3xl border border-amber-300 bg-amber-50 p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-amber-800">⚠️ Disaster alert verification unavailable</p><p className="mt-1 text-sm font-semibold text-slate-800">The official alert service did not respond completely. We are not marking this route as safe.</p><p className="mt-2 text-xs text-amber-900">Try again when connected to the official feed.</p></section> : activeAlerts.length > 0 ? <section className={`rounded-3xl border-2 p-4 shadow-sm ${primaryAlertIsNearby ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
          <div className="flex items-start justify-between gap-3"><div><p className={`text-xs font-black uppercase tracking-wide ${primaryAlertIsNearby ? 'text-red-700' : 'text-amber-800'}`}>{primaryAlertIsNearby ? '🚨 Disaster alert in your route area' : 'ℹ️ State-level alert — not route-proximate'}</p><h2 className="mt-1 text-xl font-black text-slate-950">{primaryAlert?.title || 'Official disaster alert'}</h2></div><span className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black ${primaryAlertIsNearby ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>{primaryAlert?.severity || 'Alert'}</span></div>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-800">{primaryAlertIsNearby ? 'This warning is within 10 km of at least one sampled point on your route. Follow the official instructions before travelling.' : 'An official warning was found in the wider state/region context, but it is outside the 10 km route-relevance zone. It is informational for your trip unless conditions change.'}</p>
          <div className="mt-3 rounded-2xl border border-black/10 bg-white/70 p-3 text-xs leading-relaxed text-slate-700"><strong>Area:</strong> {primaryAlert?.location || 'Specified official alert area'}{typeof primaryAlert?.distanceKm === 'number' && <><br /><strong>Nearest sampled route point:</strong> {primaryAlert.distanceKm.toFixed(1)} km</>}<br /><strong>Source:</strong> {primaryAlert?.sourceUrl ? <a className="font-black text-blue-700 underline" href={primaryAlert.sourceUrl} target="_blank" rel="noreferrer">Open official warning</a> : 'Official warning feed'}</div>
          {!primaryAlertIsNearby && distantAlerts.length > 0 && <p className="mt-2 text-xs font-bold text-amber-900">Government alerts can cover large areas. WeatherGPT does not label a distant state warning as a route hazard without a nearby location match.</p>}
        </section> : <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-emerald-700">✅ Official feed checked — no disaster alert noticed</p><p className="mt-1 text-sm font-semibold text-slate-800">No active NDMA SACHET, IMD, or configured official disaster warning matched within 10 km of the sampled route points.</p><p className="mt-2 text-[11px] font-bold text-emerald-800">This result is verified from the available official feeds, not demo data.</p></section>}
        {!routeAlertsLoading && !routeAlertsError && activeAlerts.length > 0 && <section className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-slate-950">🛟 DISASTER MANAGEMENT</h2><p className="mt-1 text-xs text-slate-500">Official warnings matched against your selected route</p></div><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">{activeAlerts.length} ACTIVE</span></div>
          <div className="mt-3 space-y-3">{activeAlerts.slice(0, 5).map((alert) => <article key={alert.id} className={`rounded-2xl border p-3 ${alert.isNearby ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-black text-slate-950">{alert.title}</h3><span className="shrink-0 text-[10px] font-black uppercase text-slate-600">{alert.type}</span></div><p className="mt-1 text-xs font-semibold text-slate-700">{alert.isNearby ? 'Route-relevant warning within 10 km' : 'State/region warning outside the 10 km route zone'} · {alert.location}</p><p className="mt-2 text-xs leading-relaxed text-slate-800">{alert.description}</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs font-semibold text-slate-700">{alert.recommendedActions.slice(0, 2).map((action) => <li key={action}>{action}</li>)}</ul><div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500"><span>Issued: {alert.issuedAt}</span>{alert.distanceKm != null && <span>Distance: {alert.distanceKm.toFixed(1)} km</span>}{alert.sourceUrl && <a className="rounded-lg bg-white px-2 py-1 font-black text-blue-700 underline" href={alert.sourceUrl} target="_blank" rel="noreferrer">Open official source ↗</a>}</div></article>)}</div>
        </section>}
        {!routeAlertsLoading && !routeAlertsError && activeAlerts.length > 0 && (
        <section className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-indigo-950">📺 OFFICIAL ALERT INTELLIGENCE</h2><p className="mt-1 text-xs text-slate-500">IMD briefing evidence for this route</p></div><span className="rounded-lg bg-red-100 px-2 py-1 text-[10px] font-black text-red-700">{alertLabel}</span></div>
          {imdLoading && <div className="mt-3 animate-pulse rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">Finding the latest IMD briefing and checking route locations…</div>}
          {!imdLoading && imdError && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">IMD transcript summary is unavailable right now. Live weather and disaster alerts are still shown above.</div>}
          {!imdLoading && !imdError && imdBriefing && <>
            <div className={`mt-3 rounded-2xl border p-3 ${imdBriefing.matches?.length ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}><p className="text-sm font-black text-slate-900">{imdBriefing.matches?.length ? `⚠️ ${imdBriefing.matches.length} route-relevant mention${imdBriefing.matches.length === 1 ? '' : 's'} found` : '✅ No explicit high-alert mention found for this route'}</p><p className="mt-1 text-xs leading-relaxed text-slate-700">This is transcript evidence, not a replacement for current live weather alerts.</p></div>
            {imdBriefing.matches?.slice(0, 3).map((match: any, index: number) => <a key={`${match.start}-${index}`} href={imdBriefing.video?.url ? `${imdBriefing.video.url}${imdBriefing.video.url.includes('?') ? '&' : '?'}t=${Math.floor(Number(match.start) || 0)}` : '#'} target="_blank" rel="noreferrer" className="mt-2 block rounded-xl border border-indigo-100 bg-white p-3 hover:border-indigo-300"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-indigo-700">▶ Watch at {Math.floor(Number(match.start) / 60)}:{String(Math.floor(Number(match.start) % 60)).padStart(2, '0')}</span><span className="text-[10px] font-bold text-slate-400">Open video</span></div><p className="mt-1 text-xs leading-relaxed text-slate-700">{match.matched_text}</p></a>)}
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3"><h3 className="text-xs font-black uppercase tracking-wide text-slate-600">Detailed transcript summary & suggestion</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{imdBriefing.clean_text || imdBriefing.ai_response}</p></div>
            <div className="mt-3 flex flex-wrap gap-2">{imdBriefing.video?.url && <a href={imdBriefing.video.url} target="_blank" rel="noreferrer" className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">▶ Official IMD video</a>}{imdBriefing.official_sources?.map((source: any) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700">↗ {source.name}</a>)}</div>
          </>}
        </section>
        )}
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
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-white/80 p-2"><span className="block text-slate-400">🌧 Rain Risk</span><strong>{route.rainRisk || 'Unavailable'}</strong></div><div className="rounded-xl bg-white/80 p-2"><span className="block text-slate-400">〰 Waterlogging</span><strong>{route.waterloggingRisk || 'Unavailable'}</strong></div><div className={`rounded-xl p-2 ${primaryAlert ? (primaryAlertIsNearby ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800') : 'bg-emerald-50 text-emerald-700'}`}><span className="block text-slate-500">⚡ {primaryAlert ? (primaryAlertIsNearby ? 'Route Alert' : 'State Alert') : 'Disaster Alerts'}</span><strong className="block text-[11px] leading-tight" title={alertLabel}>{primaryAlert ? (primaryAlertIsNearby ? primaryAlert.title : 'State alert · not nearby') : 'No alert within 10 km'}</strong></div></div>
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
