import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  MapPin,
  Clock,
  Building2,
  Navigation,
  Car,
  Footprints,
  Bike,
  Bus,
  RotateCcw,
  Sparkles,
  Compass,
  AlertTriangle
} from '../Icons';
import { DestinationPreset } from '../../data/liveMapData';
import { apiAutocompleteLocations } from '../../services/api';

export type MapLanguage = 'en' | 'hi' | 'hinglish';

interface SearchAndDestinationsProps {
  originQuery: string;
  onOriginChange: (q: string) => void;
  originCoords?: [number, number];
  destinationQuery: string;
  onDestinationChange: (q: string) => void;
  destinationCoords?: [number, number];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelectOriginPreset?: (item: { name: string; lat: number; lon: number }) => void;
  onSelectDestinationPreset: (preset: DestinationPreset | { name: string; lat: number; lon: number }) => void;
  presets: DestinationPreset[];
  currentLocationName: string;
  selectedDestinationName: string | null;
  onClearDestination: () => void;
  onUseGps: () => void;
  isLocating?: boolean;
  gpsPermissionNotice?: string | null;
  onDismissGpsNotice?: () => void;
  travelMode: string;
  onChangeTravelMode: (mode: string) => void;
  onSwapLocations?: () => void;
  onOpenPlanTripModal?: () => void;
  onSubmitDestination?: (destQuery: string) => void;
}

export const SearchAndDestinations: React.FC<SearchAndDestinationsProps> = ({
  originQuery,
  onOriginChange,
  originCoords,
  destinationQuery,
  onDestinationChange,
  destinationCoords,
  isOpen,
  onOpen,
  onClose,
  onSelectOriginPreset,
  onSelectDestinationPreset,
  presets,
  currentLocationName,
  selectedDestinationName,
  onClearDestination,
  onUseGps,
  isLocating,
  gpsPermissionNotice,
  onDismissGpsNotice,
  travelMode,
  onChangeTravelMode,
  onSwapLocations,
  onOpenPlanTripModal,
  onSubmitDestination
}) => {
  const [activeField, setActiveField] = useState<'origin' | 'destination'>('destination');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [lang, setLang] = useState<MapLanguage>('en');

  // Friendly bilingual labels
  const labels = {
    en: {
      originTitle: 'Where are you starting from?',
      destTitle: 'Where do you want to go?',
      originPlaceholder: currentLocationName || 'Search city, landmark, or use GPS...',
      destPlaceholder: 'Search Indian city, town, campus, or address...',
      setBtn: 'Set Route',
      gpsTitle: 'Use Current GPS',
      change: 'Change',
      searching: 'Searching locations in India...',
      curated: 'Quick Weather Hotspots & Hubs'
    },
    hi: {
      originTitle: 'आप कहाँ से शुरू कर रहे हैं?',
      destTitle: 'आप कहाँ जाना चाहते हैं?',
      originPlaceholder: currentLocationName || 'शुरुआती शहर, लैंडमार्क या GPS चुनें...',
      destPlaceholder: 'गंतव्य शहर, कस्बा, कॉलेज या पता खोजें...',
      setBtn: 'रूट देखें',
      gpsTitle: 'मेरा GPS स्थान',
      change: 'बदलें',
      searching: 'स्थान खोजे जा रहे हैं...',
      curated: 'प्रमुख भारतीय शहर व कॉलेज'
    },
    hinglish: {
      originTitle: 'Aap kahan se start kar rahe ho?',
      destTitle: 'Aap kahan jaana chahte ho?',
      originPlaceholder: currentLocationName || 'Starting point (city, landmark ya GPS)...',
      destPlaceholder: 'Destination city, campus ya address search karein...',
      setBtn: 'Set Route',
      gpsTitle: 'Current GPS lein',
      change: 'Change',
      searching: 'Locations search ho rahi hain...',
      curated: 'Quick Popular Hubs'
    }
  }[lang];

  // Debounced API autocomplete query
  useEffect(() => {
    const q = activeField === 'origin' ? originQuery : destinationQuery;
    if (!q || q.trim().length < 2) {
      setAutocompleteSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const results = await apiAutocompleteLocations(q);
        setAutocompleteSuggestions(results);
      } catch (e) {
        console.warn('Autocomplete lookup error:', e);
      } finally {
        setIsSearchingApi(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [originQuery, destinationQuery, activeField]);

  const filteredPresets = presets.filter(
    (p) =>
      p.name.toLowerCase().includes(destinationQuery.toLowerCase()) ||
      p.subtitle.toLowerCase().includes(destinationQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(destinationQuery.toLowerCase())
  );

  return (
    <div className="relative z-30 w-full px-3 pt-2.5 pointer-events-auto">
      {/* Main Dual Search Card */}
      <div className="bg-slate-900/96 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/90 p-3 text-white transition-all">
        {/* Top Bar: Language Switcher & Quick Planner Link */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Language:
            </span>
            {(['en', 'hi', 'hinglish'] as MapLanguage[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                  lang === l
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {l === 'en' ? 'EN' : l === 'hi' ? 'हिन्दी' : 'Hinglish'}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {onOpenPlanTripModal && (
              <button
                type="button"
                onClick={onOpenPlanTripModal}
                className="text-[10.5px] font-extrabold text-sky-400 hover:text-sky-300 flex items-center space-x-1 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-lg transition active:scale-95 cursor-pointer"
                title="Open full Plan Trip modal with all departure options"
              >
                <Sparkles className="w-3 h-3 text-sky-400" />
                <span>+ Plan Trip</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. Origin Section */}
        <div className="space-y-1 pb-2 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1.5">
              <span>📍</span>
              <span>{labels.originTitle}</span>
            </label>
            {originCoords && (
              <span className="text-[9px] font-mono text-emerald-300/80 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded-md">
                {originCoords[0].toFixed(3)}°N, {originCoords[1].toFixed(3)}°E
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 rounded-xl px-2.5 py-1.5 border border-slate-700/60 focus-within:border-emerald-500/80 transition">
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 text-[11px] font-black shadow-xs">
              A
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={originQuery}
                onChange={(e) => {
                  onOriginChange(e.target.value);
                  setActiveField('origin');
                  if (!isOpen) onOpen();
                }}
                onFocus={() => {
                  setActiveField('origin');
                  onOpen();
                }}
                placeholder={labels.originPlaceholder}
                className="w-full bg-transparent text-xs font-bold text-white placeholder-slate-400 focus:outline-hidden truncate"
              />
            </div>

            {/* GPS Location Button */}
            <button
              onClick={onUseGps}
              className={`px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1 text-[10px] font-bold transition cursor-pointer shrink-0 ${
                isLocating ? 'animate-pulse text-emerald-200' : ''
              }`}
              title={labels.gpsTitle}
            >
              <MapPin className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">GPS</span>
            </button>

            {originQuery && (
              <button
                onClick={() => onOriginChange('')}
                className="w-6 h-6 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
                title="Clear origin"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Destination Section */}
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-sky-400 flex items-center space-x-1.5">
              <span>🎯</span>
              <span>{labels.destTitle}</span>
            </label>
            {destinationCoords && (
              <span className="text-[9px] font-mono text-sky-300/80 bg-sky-950/60 border border-sky-800/50 px-1.5 py-0.2 rounded-md">
                {destinationCoords[0].toFixed(3)}°N, {destinationCoords[1].toFixed(3)}°E
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 rounded-xl px-2.5 py-1.5 border border-slate-700/60 focus-within:border-sky-500/80 transition">
            <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 text-[11px] font-black shadow-xs">
              B
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={destinationQuery}
                onChange={(e) => {
                  onDestinationChange(e.target.value);
                  setActiveField('destination');
                  if (!isOpen) onOpen();
                }}
                onFocus={() => {
                  setActiveField('destination');
                  onOpen();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (onSubmitDestination && destinationQuery.trim()) {
                      onSubmitDestination(destinationQuery.trim());
                      onClose();
                    }
                  }
                }}
                placeholder={labels.destPlaceholder}
                className="w-full bg-transparent text-xs font-bold text-white placeholder-slate-400 focus:outline-hidden truncate"
              />
            </div>

            {/* Quick 'Set' Action Button */}
            {destinationQuery.trim().length > 0 && onSubmitDestination && (
              <button
                type="button"
                onClick={() => {
                  onSubmitDestination(destinationQuery.trim());
                  onClose();
                }}
                className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-[11px] font-extrabold flex items-center space-x-1 shrink-0 transition active:scale-95 shadow-xs cursor-pointer"
                title="Calculate weather-safe route"
              >
                <Navigation className="w-3 h-3 text-white fill-white" />
                <span>{labels.setBtn}</span>
              </button>
            )}

            {/* Swap Button */}
            {onSwapLocations && (
              <button
                onClick={onSwapLocations}
                className="w-6 h-6 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
                title="Swap Start & Destination"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}

            {destinationQuery ? (
              <button
                onClick={() => {
                  onClearDestination();
                  onDestinationChange('');
                }}
                className="w-6 h-6 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
                title="Clear destination"
              >
                <X className="w-3 h-3" />
              </button>
            ) : null}
          </div>
        </div>

        {/* 3. Travel Mode Selector & Quick Indian Chips */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-1">
            {[
              { id: 'driving', label: 'Drive', icon: Car },
              { id: 'walking', label: 'Walk', icon: Footprints },
              { id: 'cycling', label: 'Cycle', icon: Bike },
              { id: 'transit', label: 'Transit', icon: Bus }
            ].map((mode) => {
              const Icon = mode.icon;
              const isActive = travelMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => onChangeTravelMode(mode.id)}
                  className={`px-2.5 py-1 rounded-xl font-bold flex items-center space-x-1 transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-[10px]">{mode.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-slate-400 font-medium flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span>WeatherGPT Live Safe Corridor</span>
          </div>
        </div>
      </div>

      {/* GPS Fallback Notice if Permission Denied */}
      {gpsPermissionNotice && (
        <div className="mt-2 p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{gpsPermissionNotice}</span>
          </div>
          {onDismissGpsNotice && (
            <button
              onClick={onDismissGpsNotice}
              className="text-amber-400 hover:text-white font-bold ml-2 shrink-0 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Auto-suggest overlay drawer */}
      {isOpen && (
        <div className="absolute top-36 left-3 right-3 bg-slate-900/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/90 overflow-hidden max-h-[65vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 text-white">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-800/60">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              {activeField === 'origin' ? labels.originTitle : labels.destTitle}
            </span>
            <div className="flex items-center space-x-2">
              {onOpenPlanTripModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPlanTripModal();
                  }}
                  className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1 cursor-pointer bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700"
                >
                  <Navigation className="w-3 h-3 text-sky-400" />
                  <span>Full Trip Planner</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-xs font-bold text-slate-300 hover:text-white cursor-pointer px-1.5 py-0.5"
              >
                Done
              </button>
            </div>
          </div>

          <div className="overflow-y-auto p-2 space-y-2 flex-1">
            {/* Real API Autocomplete Results */}
            {autocompleteSuggestions.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-black text-sky-400 px-2 uppercase tracking-wide">
                  Live Search Results ({autocompleteSuggestions.length})
                </span>
                {autocompleteSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (activeField === 'origin' && onSelectOriginPreset) {
                        onSelectOriginPreset({
                          name: item.name || item.display_name.split(',')[0],
                          lat: item.lat,
                          lon: item.lon
                        });
                        onOriginChange(item.name || item.display_name.split(',')[0]);
                      } else {
                        onSelectDestinationPreset({
                          name: item.name || item.display_name.split(',')[0],
                          lat: item.lat,
                          lon: item.lon
                        });
                        onDestinationChange(item.name || item.display_name.split(',')[0]);
                      }
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-750 border border-slate-700/60 transition cursor-pointer flex items-start space-x-2.5 group"
                  >
                    <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5 group-hover:text-sky-300" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate">
                          {item.name || item.display_name.split(',')[0]}
                        </span>
                        <span className="text-[9.5px] font-mono font-semibold text-slate-400 shrink-0 bg-slate-900/60 px-1.5 py-0.5 rounded-md border border-slate-700/40">
                          {item.lat?.toFixed(3)}°, {item.lon?.toFixed(3)}°
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300 truncate mt-0.5">
                        {item.display_name}
                      </div>
                      {(item.city || item.state) && (
                        <div className="flex items-center space-x-1.5 mt-1 text-[9px] text-sky-400 font-semibold">
                          <span>📍 {item.city ? `${item.city}, ` : ''}{item.state || 'India'}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isSearchingApi && (
              <div className="py-2 text-center text-xs text-slate-400 flex items-center justify-center space-x-1.5">
                <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <span>{labels.searching}</span>
              </div>
            )}

            {/* Curated Presets */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-black text-slate-400 px-2 uppercase tracking-wide">
                {labels.curated}
              </span>
              {filteredPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    if (activeField === 'origin' && onSelectOriginPreset) {
                      onSelectOriginPreset({
                        name: preset.name,
                        lat: preset.coords.lat,
                        lon: preset.coords.lng
                      });
                      onOriginChange(preset.name);
                    } else {
                      onSelectDestinationPreset(preset);
                      onDestinationChange(preset.name);
                    }
                    onClose();
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-800 border border-slate-800 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{preset.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {preset.subtitle} • {preset.city}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      {preset.typicalMinutes}m
                    </span>
                    <span className="text-[9px] text-sky-400 font-mono">
                      {preset.coords.lat.toFixed(2)}°, {preset.coords.lng.toFixed(2)}°
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
