import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NearbySafePlace } from '../../types';
import { X, Utensils, Coffee, Store, Building2, Fuel, Hospital, MapPin, ExternalLink, ChevronRight, Plus, Navigation } from '../Icons';

interface NearbyPlacesDrawerProps {
  places: NearbySafePlace[];
  isOpen: boolean;
  onClose: () => void;
  onSelectPlace: (place: NearbySafePlace) => void;
  onUseAsStop?: (place: NearbySafePlace) => void;
  selectedPlaceId?: string;
  initialFilter?: PlaceCategoryFilter;
  loading?: boolean;
  error?: string | null;
}

type PlaceCategoryFilter = 'all' | 'shelter' | 'cafe' | 'restaurant' | 'hotel' | 'petrol' | 'hospital';

export const NearbyPlacesDrawer: React.FC<NearbyPlacesDrawerProps> = ({
  places,
  isOpen,
  onClose,
  onSelectPlace,
  onUseAsStop,
  selectedPlaceId,
  initialFilter = 'all',
  loading = false,
  error = null
}) => {
  const [filter, setFilter] = useState<PlaceCategoryFilter>(initialFilter);
  const [loadingProgress, setLoadingProgress] = useState(8);

  useEffect(() => {
    if (isOpen) setFilter(initialFilter);
  }, [initialFilter, isOpen]);

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(0);
      return;
    }
    setLoadingProgress(8);
    const timer = window.setInterval(() => {
      setLoadingProgress((current) => Math.min(92, current + 8));
    }, 700);
    return () => window.clearInterval(timer);
  }, [loading]);

  if (!isOpen) return null;

  const filteredPlaces = filter === 'all'
    ? places
    : places.filter((p) => {
        if (filter === 'shelter') return p.category === 'cafe' || p.category === 'hotel' || p.category === 'convenience';
        return p.category === filter;
      });

  return createPortal((
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex items-end justify-center pointer-events-auto">
      <div className="w-full max-w-md bg-slate-900 text-white rounded-t-3xl shadow-2xl border-t border-slate-700 max-h-[85dvh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-amber-400 text-base">☕</span>
              <h3 className="text-sm font-black text-white">
                NEARBY PLACES · LIVE SEARCH
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Geoapify places around the selected location
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Suggestion Banner */}
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border border-blue-500/40 text-xs text-blue-200 flex items-start space-x-2.5">
          <span className="text-lg">💡</span>
          <div>
            <span className="font-extrabold block text-sky-300">WeatherGPT Route Recommendation:</span>
            When passing through rain-heavy or low-lying sections, these nearby places provide safe parking, covered shelters, and refreshments.
          </div>
        </div>

        {/* Category Filters */}
        <div className="px-4 py-2.5 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            ✨ All ({places.length})
          </button>
          <button
            onClick={() => setFilter('shelter')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1 ${
              filter === 'shelter' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <span>🛡️ Shelters</span>
          </button>
          <button
            onClick={() => setFilter('cafe')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1 ${
              filter === 'cafe' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Cafes</span>
          </button>
          <button
            onClick={() => setFilter('petrol')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1 ${
              filter === 'petrol' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>Petrol Pumps</span>
          </button>
          <button
            onClick={() => setFilter('hospital')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1 ${
              filter === 'hospital' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Hospital className="w-3.5 h-3.5" />
            <span>Hospitals</span>
          </button>
          <button
            onClick={() => setFilter('hotel')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1 ${
              filter === 'hotel' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hotels</span>
          </button>
        </div>

        {/* Places List */}
        <div className="overflow-y-auto px-4 pb-6 space-y-2.5 flex-1">
          {loading && (
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 text-sm text-sky-200">
              <div className="flex items-center justify-between gap-2 font-bold"><span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-sky-300 border-t-transparent rounded-full animate-spin" />Loading live nearby places…</span><span className="text-sky-300">{loadingProgress}%</span></div>
              <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-500" style={{ width: `${loadingProgress}%` }} /></div>
              <p className="mt-2 text-xs text-sky-300/80">Geoapify is searching hospitals, petrol pumps, hotels, restaurants, and cafes around this route.</p>
            </div>
          )}
          {!loading && error && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200">
              <p className="font-bold">Nearby places could not be loaded.</p>
              <p className="mt-1 text-xs">{error} Confirm GEOAPIFY_API_KEY is configured on the backend.</p>
            </div>
          )}
          {!loading && !error && filteredPlaces.length === 0 && (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 text-sm text-slate-300">No mapped places were found in this category.</div>
          )}
          {filteredPlaces.map((place) => {
            const isSelected = place.id === selectedPlaceId;
            return (
              <div
                key={place.id}
                onClick={() => onSelectPlace(place)}
                className={`p-3 rounded-2xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-blue-500 shadow-md ring-2 ring-blue-500/30'
                    : 'bg-slate-850 border-slate-750 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="flex items-center space-x-1.5 mb-0.5">
                      <span className="text-[10px] font-black uppercase text-sky-300 bg-sky-500/20 px-1.5 py-0.2 rounded-sm border border-sky-500/30">
                        {place.categoryLabel || place.category}
                      </span>
                      {place.rating > 0 && (
                        <span className="text-xs font-extrabold text-amber-400">
                          ⭐ {place.rating} ({place.reviews})
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-white">
                      {place.name}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-sky-400 block">
                      {place.distanceMeters}m
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {place.walkingMinutes} min walk
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 truncate mb-1.5">
                  📍 {place.address}
                </p>

                {/* Recommendation context */}
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10.5px] font-medium text-slate-300 mb-2.5">
                  🛡️ <strong className="text-sky-400">Why recommended:</strong> {place.name} is {place.distanceMeters}m from the route, offering shelter and safe stopping space.
                </div>

                {/* Actions: View on map & Use as stop */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPlace(place);
                    }}
                    className="text-sky-400 font-bold hover:text-sky-300 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View on Map</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {onUseAsStop && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUseAsStop(place);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-sky-200 border border-blue-500/40 font-bold text-[10.5px] flex items-center space-x-1 cursor-pointer transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Use as Stop</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  ), document.body);
};

