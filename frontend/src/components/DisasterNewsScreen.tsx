import React, { useEffect, useMemo, useState } from 'react';
import type { RouteTrip, WeatherAlert, WeatherData } from '../types';
import { apiGetOfficialAlerts } from '../services/api';

type DisasterNewsScreenProps = {
  currentWeather: WeatherData;
  activeTrip: RouteTrip;
  onBackToHome: () => void;
  onViewOnMap: (latitude: number, longitude: number, locationName: string) => void;
};

const categoryFor = (alert: WeatherAlert) => alert.type === 'heavy-rain' ? 'Extreme rainfall' : alert.type.replace('-', ' ');
const categoryMatches = (alert: WeatherAlert, category: string) => category === 'all' || categoryFor(alert) === category;

export const DisasterNewsScreen: React.FC<DisasterNewsScreenProps> = ({ currentWeather, activeTrip, onBackToHome, onViewOnMap }) => {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState('Checking official feeds…');

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiGetOfficialAlerts();
      setAlerts(next);
      setUpdatedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Official disaster feed unavailable');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAlerts(); }, []);

  const filteredAlerts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return alerts.filter((alert) => categoryMatches(alert, category) && (!normalized || `${alert.title} ${alert.location} ${alert.description}`.toLowerCase().includes(normalized)));
  }, [alerts, category, query]);

  const categories = ['all', ...Array.from(new Set(alerts.map(categoryFor)))];
  const activeCount = filteredAlerts.filter((alert) => alert.isActive).length;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-28 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <button type="button" onClick={onBackToHome} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">← Back</button>
          <div className="min-w-0 flex-1"><h1 className="truncate text-base font-black">🛟 Disaster News & Alerts</h1><p className="text-[11px] text-slate-500">Official warnings for {currentWeather.city || activeTrip.to}</p></div>
          <button type="button" onClick={() => void loadAlerts()} disabled={loading} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{loading ? 'Checking…' : 'Refresh'}</button>
        </div>
        <div className="mx-auto mt-2 flex max-w-md items-center justify-between text-[11px] font-semibold text-slate-500"><span>Last checked: {updatedAt}</span><span className="text-emerald-700">Live official feed</span></div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4">
        <section className="rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-amber-50 p-4 shadow-sm">
          <h2 className="font-black text-slate-950">Official disaster information</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">This page displays alerts returned by the configured government feeds. It does not use sample news cards or demo bulletins.</p>
          <div className="mt-3 flex flex-wrap gap-2"><a href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-200">IMD official site ↗</a><a href="https://sachet.ndma.gov.in/" target="_blank" rel="noreferrer" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-200">NDMA SACHET ↗</a><a href="https://seismo.gov.in/" target="_blank" rel="noreferrer" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">NCS earthquakes ↗</a></div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-black capitalize ${category === item ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{item === 'all' ? `All (${alerts.length})` : item}</button>)}</div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search city, district, flood, cyclone…" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500" />

        {loading && <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /><p className="mt-3 text-sm font-black text-blue-900">Fetching official IMD, NDMA SACHET, and configured alerts…</p><p className="mt-1 text-xs text-slate-600">This may take a few seconds because the feed is being checked live.</p></section>}
        {!loading && error && <section className="rounded-3xl border border-amber-300 bg-amber-50 p-4"><p className="font-black text-amber-900">⚠️ Official feed unavailable</p><p className="mt-1 text-sm text-slate-700">No disaster claim is being shown because the source could not be verified.</p><button type="button" onClick={() => void loadAlerts()} className="mt-3 rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white">Try again</button></section>}
        {!loading && !error && filteredAlerts.length === 0 && <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center"><p className="font-black text-emerald-800">✅ No matching official disaster alert</p><p className="mt-1 text-xs text-slate-600">The official feeds were checked at {updatedAt}.</p></section>}

        {!loading && !error && filteredAlerts.length > 0 && <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-wide text-slate-700">{activeCount} active official alert{activeCount === 1 ? '' : 's'}</h2><span className="text-[11px] font-bold text-slate-500">{filteredAlerts.length} result{filteredAlerts.length === 1 ? '' : 's'}</span></div>{filteredAlerts.map((alert) => <article key={alert.id} className={`rounded-3xl border-2 bg-white p-4 shadow-sm ${alert.isActive && (alert.severity === 'High' || alert.severity === 'Extreme') ? 'border-red-300' : 'border-slate-200'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{categoryFor(alert)} · {alert.location}</p><h3 className="mt-1 text-base font-black text-slate-950">{alert.title}</h3></div><span className={`rounded-lg px-2 py-1 text-[10px] font-black ${alert.severity === 'Extreme' || alert.severity === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{alert.severity}</span></div><p className="mt-3 text-sm leading-relaxed text-slate-700">{alert.description}</p><div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600"><p><strong>Issued:</strong> {alert.issuedAt}</p><p className="mt-1"><strong>Status:</strong> {alert.isActive ? 'Active official warning' : 'Expired warning'}</p></div><div className="mt-3 flex flex-wrap gap-2">{alert.sourceUrl && <a href={alert.sourceUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white">Open source ↗</a>}{alert.latitude != null && alert.longitude != null && alert.latitude !== 0 && alert.longitude !== 0 && <button type="button" onClick={() => onViewOnMap(alert.latitude!, alert.longitude!, alert.location)} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700">View on map</button>}</div><ul className="mt-3 list-disc space-y-1 pl-4 text-xs font-semibold text-slate-700">{alert.recommendedActions.slice(0, 2).map((action) => <li key={action}>{action}</li>)}</ul></article>)}</section>}
      </main>
    </div>
  );
};
