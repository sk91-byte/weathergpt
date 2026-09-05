import React, { useEffect, useState } from 'react';
import { Search, X, MapPin, Mic, Clock, Building2, Navigation } from '../Icons';
import { DestinationPreset } from '../../data/liveMapData';
import { searchPlaces } from '../../services/backend';

interface SearchAndDestinationsProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelectPreset: (preset: DestinationPreset) => void;
  presets: DestinationPreset[];
  currentLocationName: string;
  selectedDestinationName: string | null;
  onClearDestination: () => void;
  onUseGps: () => void;
  isLocating?: boolean;
  currentLocation?: { latitude: number; longitude: number } | null;
  originQuery: string;
  onOriginChange: (q: string) => void;
  originLocation?: { name: string } | null;
  onSelectOrigin: (preset: DestinationPreset) => void;
}

export const SearchAndDestinations: React.FC<SearchAndDestinationsProps> = ({
  searchQuery,
  onSearchChange,
  isOpen,
  onOpen,
  onClose,
  onSelectPreset,
  presets,
  currentLocationName,
  selectedDestinationName,
  onClearDestination,
  onUseGps,
  isLocating,
  currentLocation
  , originQuery,
  onOriginChange,
  originLocation,
  onSelectOrigin
}) => {
  const [remotePresets, setRemotePresets] = useState<DestinationPreset[]>([]);
  const [remoteOrigins, setRemoteOrigins] = useState<DestinationPreset[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'results' | 'no_results' | 'error'>('idle');

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setRemotePresets([]);
      setSearchState('idle');
      return;
    }
    setSearchState('loading');
    const timer = window.setTimeout(() => {
      searchPlaces(searchQuery, currentLocation?.latitude, currentLocation?.longitude)
        .then((places) => {
          const converted = places.map((place) => ({
            id: place.place_id,
            name: place.name,
            subtitle: place.formatted_address || place.address || 'India',
            category: 'landmark' as const,
            coords: { x: 50, y: 50, lat: place.latitude, lon: place.longitude },
            city: place.city || place.state || 'India'
          }));
          setRemotePresets(converted);
          setSearchState(converted.length ? 'results' : 'no_results');
        })
        .catch(() => {
          setRemotePresets([]);
          setSearchState('error');
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery, currentLocation]);

  useEffect(() => {
    if (originQuery.trim().length < 2) {
      setRemoteOrigins([]);
      return;
    }
    const timer = window.setTimeout(() => {
      searchPlaces(originQuery, currentLocation?.latitude, currentLocation?.longitude)
        .then((places) => setRemoteOrigins(places.map((place) => ({
          id: place.place_id, name: place.name, subtitle: place.formatted_address || place.address || 'India',
          category: 'landmark' as const, coords: { x: 50, y: 50, lat: place.latitude, lon: place.longitude }, city: place.city || place.state || 'India'
        }))))
        .catch(() => setRemoteOrigins([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [originQuery, currentLocation]);

  const filtered = presets.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayPresets = searchQuery.trim().length >= 2 ? remotePresets : filtered;

  return (
    <div className="relative z-30 w-full px-3 pt-3 pointer-events-auto">
      {/* Floating Main Search Bar */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-1.5 transition-all">
        <div className="flex items-center space-x-2">
          {/* WeatherGPT Map Logo Badge */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Navigation className="w-5 h-5 text-white stroke-[2.2]" />
          </div>

          {/* Search Input */}
          <div className="flex-1 flex items-center min-w-0" onClick={onOpen}>
            <input
              type="text"
              value={searchQuery || (selectedDestinationName ? selectedDestinationName : '')}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (!isOpen) onOpen();
              }}
              onFocus={onOpen}
              placeholder="Where do you want to go?"
              className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-hidden truncate"
            />
          </div>

          {/* Clear or Quick GPS Actions */}
          {selectedDestinationName || searchQuery ? (
            <button
              onClick={() => {
                onClearDestination();
                onSearchChange('');
              }}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="Clear destination"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onUseGps}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 transition cursor-pointer ${
                isLocating ? 'animate-spin text-blue-400' : ''
              }`}
              title="Locate via GPS"
            >
              <MapPin className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Auto Location Sub-Indicator when Destination is active */}
        {selectedDestinationName && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 px-1">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="text-emerald-500 font-bold">🟢 Start:</span>
              <span className="font-semibold text-slate-700 truncate">{currentLocationName}</span>
            </div>
            <div className="flex items-center space-x-1 shrink-0 ml-2">
              <span className="text-red-500 font-bold">📍 To:</span>
              <span className="font-bold text-slate-900 truncate max-w-[120px]">{selectedDestinationName}</span>
            </div>
          </div>
        )}
      </div>

      {/* Auto-suggest overlay drawer */}
      {isOpen && (
        <div className="absolute top-16 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[70vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
              Search Destination...
            </span>
            <button
              onClick={onClose}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="p-3 space-y-2 border-b border-slate-100">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Starting location</label>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <input value={originQuery} onChange={(event) => onOriginChange(event.target.value)} placeholder={originLocation?.name || 'Search starting point'} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500" />
              <button type="button" onClick={onUseGps} className="text-[10px] font-black text-blue-600 whitespace-nowrap">Use GPS</button>
            </div>
            {originQuery.trim().length >= 2 && remoteOrigins.slice(0, 4).map((preset) => (
              <button key={preset.id} type="button" onClick={() => { onSelectOrigin(preset); onOriginChange(preset.name); }} className="w-full text-left rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-100">{preset.name}<span className="block text-[10px] text-slate-500 truncate">{preset.subtitle}</span></button>
            ))}
          </div>

          <div className="overflow-y-auto p-2 space-y-2 flex-1">
            {/* Quick Categories */}
            <div className="px-2 pt-1 pb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Suggested Destinations
              </span>
              <div className="space-y-1">
                {searchState === 'loading' && <div className="px-2 py-3 text-xs text-slate-500">Searching places...</div>}
                {searchState === 'no_results' && <div className="px-2 py-3 text-xs text-slate-500">No places found. Try a more complete address.</div>}
                {searchState === 'error' && <div className="px-2 py-3 text-xs text-red-600">Destination search is temporarily unavailable.</div>}
                {displayPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 transition flex items-center space-x-3 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition shrink-0">
                      {preset.category === 'university' && <Building2 className="w-4 h-4" />}
                      {preset.category === 'home' && <span>🏠</span>}
                      {preset.category === 'office' && <span>🏢</span>}
                      {preset.category === 'transport' && <span>✈️</span>}
                      {preset.category === 'landmark' && <span>⭐</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                        {preset.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {preset.subtitle}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold group-hover:text-blue-600 shrink-0">
                      Select →
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Searches */}
            <div className="px-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                📍 Recent Searches
              </span>
              <div className="flex flex-wrap gap-1.5">
                {searchQuery.trim().length < 2 && [
                  { name: 'Sushant University', city: 'Gurugram' },
                  { name: 'Cyber Hub', city: 'Gurugram' },
                  { name: 'Terminal 3 Airport', city: 'Delhi' }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const match = presets.find((p) => p.name.includes(item.name)) || presets[0];
                      onSelectPreset(match);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-[11px] font-medium rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
