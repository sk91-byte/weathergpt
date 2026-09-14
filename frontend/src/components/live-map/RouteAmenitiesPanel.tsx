import React, { useMemo, useState } from 'react';
import { Building2, ChevronRight, Fuel, Hospital, MapPin, Phone, Utensils, Zap } from '../Icons';
import { NearbySafePlace } from '../../types';

type AmenityFilter = 'all' | 'hospital' | 'petrol' | 'restaurant' | 'hotel' | 'ev_charging';

interface RouteAmenitiesPanelProps {
  places: NearbySafePlace[];
  loading?: boolean;
  error?: string | null;
  onSelectPlace?: (place: NearbySafePlace) => void;
  onViewOnMap?: (place: NearbySafePlace) => void;
  onUseAsStop?: (place: NearbySafePlace) => void;
}

const filters: Array<{ id: AmenityFilter; label: string; icon: React.ReactNode }> = [
  { id: 'all', label: 'All', icon: <MapPin className="w-3.5 h-3.5" /> },
  { id: 'hospital', label: 'Hospitals', icon: <Hospital className="w-3.5 h-3.5" /> },
  { id: 'petrol', label: 'Petrol', icon: <Fuel className="w-3.5 h-3.5" /> },
  { id: 'restaurant', label: 'Restaurants', icon: <Utensils className="w-3.5 h-3.5" /> },
  { id: 'hotel', label: 'Hotels', icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 'ev_charging', label: 'EV charging', icon: <Zap className="w-3.5 h-3.5" /> },
];

function categoryIcon(category: NearbySafePlace['category']) {
  if (category === 'hospital') return <Hospital className="w-4 h-4" />;
  if (category === 'petrol') return <Fuel className="w-4 h-4" />;
  if (category === 'hotel') return <Building2 className="w-4 h-4" />;
  if (category === 'ev_charging') return <Zap className="w-4 h-4" />;
  return <Utensils className="w-4 h-4" />;
}

export const RouteAmenitiesPanel: React.FC<RouteAmenitiesPanelProps> = ({ places, loading = false, error, onSelectPlace, onViewOnMap, onUseAsStop }) => {
  const [filter, setFilter] = useState<AmenityFilter>('all');
  const filteredPlaces = useMemo(() => filter === 'all' ? places : places.filter((place) => place.category === filter), [filter, places]);

  return (
    <section className="bg-slate-950 text-white border-t border-slate-800 px-3 sm:px-4 py-4 pointer-events-auto">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-black">Places along your route</h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Real mapped places within 1 km of every section of the calculated A → B route.</p>
        </div>
        {!loading && <span className="text-[10px] font-bold text-slate-400 shrink-0">{places.length} found</span>}
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-3">
        {filters.map((item) => (
          <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`shrink-0 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 cursor-pointer ${filter === item.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            {item.icon}<span>{item.label}</span>
          </button>
        ))}
      </div>

      {loading && <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs text-sky-200"><div className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-sky-300 border-t-transparent rounded-full animate-spin" />Loading places along your route…</div><p className="mt-2 text-[10px] text-sky-300/80">Searching nearby hospitals, petrol pumps, restaurants, hotels, and EV charging stations. This may take a few seconds.</p></div>}
      {!loading && error && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">Route places are temporarily unavailable. The road route is still available.</div>}
      {!loading && !error && filteredPlaces.length === 0 && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-400">No mapped places in this category were found within 800 m of the route.</div>}

      {!loading && !error && filteredPlaces.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredPlaces.map((place) => (
            <article key={place.id} onClick={() => onSelectPlace?.(place)} className="rounded-2xl border border-slate-800 bg-slate-900 p-3 hover:border-sky-500/60 transition cursor-pointer">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 w-8 h-8 rounded-xl bg-sky-500/15 text-sky-300 flex items-center justify-center shrink-0">{categoryIcon(place.category)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-black text-white truncate">{place.name}</h4>
                    <span className="text-[10px] font-bold text-emerald-300 whitespace-nowrap">{place.distanceFromRouteMeters ?? place.distanceMeters} m from route</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-wide text-sky-300 font-bold mt-0.5">{place.categoryLabel}</p>
                  <p className="text-[11px] text-slate-300 mt-2 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0 text-slate-500" />{place.address}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{place.routeRelevance || 'Along calculated route'}{place.openingHours ? ` · ${place.openingHours}` : ''}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-bold">
                    {place.phone && <a href={`tel:${place.phone}`} onClick={(event) => event.stopPropagation()} className="text-sky-300 flex items-center gap-1"><Phone className="w-3 h-3" />Call</a>}
                    {place.website && <a href={place.website} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="text-sky-300 flex items-center gap-1">Website <ChevronRight className="w-3 h-3" /></a>}
                    {onViewOnMap && <button type="button" onClick={(event) => { event.stopPropagation(); onViewOnMap(place); }} className="text-blue-600 hover:text-blue-800 font-black">View on map</button>}
                    {onUseAsStop && <button type="button" onClick={(event) => { event.stopPropagation(); onUseAsStop(place); }} className="ml-auto text-emerald-300 hover:text-emerald-200">Use as stop</button>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
