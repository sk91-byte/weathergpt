import React, { useState, useEffect, useRef } from 'react';
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
import { apiAutocompleteLocations, ApiAutocompleteSuggestion } from '../../services/api';

export type MapLanguage = 'en' | 'hi' | 'hinglish';

function getPlaceTypeBadge(type?: string) {
  const t = (type || '').toLowerCase();
  if (t === 'university' || t === 'college') return { label: 'University / College', icon: 'ðŸŽ“', color: 'bg-purple-950/80 text-purple-300 border-purple-800/60' };
  if (t === 'school') return { label: 'School', icon: 'ðŸ«', color: 'bg-blue-950/80 text-blue-300 border-blue-800/60' };
  if (t === 'hospital') return { label: 'Hospital', icon: 'ðŸ¥', color: 'bg-red-950/80 text-red-300 border-red-800/60' };
  if (t === 'airport') return { label: 'Airport', icon: 'âœˆï¸', color: 'bg-sky-950/80 text-sky-300 border-sky-800/60' };
  if (t === 'station') return { label: 'Station', icon: 'ðŸš†', color: 'bg-amber-950/80 text-amber-300 border-amber-800/60' };
  if (t === 'bus_station') return { label: 'Bus Station', icon: 'ðŸšŒ', color: 'bg-orange-950/80 text-orange-300 border-orange-800/60' };
  if (t === 'road') return { label: 'Road / Marg', icon: 'ðŸ›£ï¸', color: 'bg-slate-800 text-slate-300 border-slate-700' };
  if (t === 'locality') return { label: 'Locality / Sector', icon: 'ðŸ“', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' };
  if (t === 'city' || t === 'town' || t === 'village') return { label: 'City / Town', icon: 'ðŸ™ï¸', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60' };
  if (t === 'landmark') return { label: 'Landmark', icon: 'ðŸ›ï¸', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60' };
  if (t === 'commercial') return { label: 'Market / Mall', icon: 'ðŸ›ï¸', color: 'bg-pink-950/80 text-pink-300 border-pink-800/60' };
  if (t === 'religious') return { label: 'Place of Worship', icon: 'ðŸ›•', color: 'bg-yellow-950/80 text-yellow-300 border-yellow-800/60' };
  return { label: 'Location', icon: 'ðŸ“', color: 'bg-slate-800 text-slate-300 border-slate-700' };
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return text;
  const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="text-sky-300 font-extrabold underline decoration-sky-400/60">
        {part}
      </span>
    ) : (
      part
    )
  );
}

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
  onSelectOriginPreset?: (item: { name: string; lat: number; lon: number; address?: string }) => void;
  onSelectDestinationPreset: (preset: DestinationPreset | { name: string; lat: number; lon: number; address?: string }) => void;
  originAddress?: string;
  destinationAddress?: string;
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
  onSavePlace?: (place: { label: string; name: string; address?: string; coords: [number, number]; category?: string }) => void;
  savedPlaceNames?: string[];
}

function formatCoordsBadge(coords: any): string | null {
  if (!coords) return null;
  let lat: number | undefined;
  let lon: number | undefined;
  if (Array.isArray(coords)) {
    lat = coords[0];
    lon = coords[1];
  } else if (typeof coords === 'object') {
    lat = coords.lat ?? coords.latitude;
    lon = coords.lng ?? coords.lon ?? coords.longitude;
  }
  if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
    return `${lat.toFixed(3)}Â°N, ${lon.toFixed(3)}Â°E`;
  }
  return null;
}

export const SearchAndDestinations: React.FC<SearchAndDestinationsProps> = ({
  originQuery,
  onOriginChange,
  originCoords,
  originAddress,
  destinationQuery,
  onDestinationChange,
  destinationCoords,
  destinationAddress,
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
  onSubmitDestination,
  onSavePlace,
  savedPlaceNames = []
}) => {
  const [activeField, setActiveField] = useState<'origin' | 'destination'>('destination');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<ApiAutocompleteSuggestion[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [lang, setLang] = useState<MapLanguage>('en');
  const abortControllerRef = useRef<AbortController | null>(null);

  const originCoordsBadge = formatCoordsBadge(originCoords);
  const destCoordsBadge = formatCoordsBadge(destinationCoords);
  const isSaved = (name: string) => savedPlaceNames.some((savedName) => savedName.trim().toLowerCase() === name.trim().toLowerCase());

  // Friendly bilingual labels
  const labels = {
    en: {
      originTitle: 'Start location',
      destTitle: 'Destination',
      originPlaceholder: currentLocationName || 'Enter start location or use GPS...',
      destPlaceholder: 'Enter destination (university, city, address)...',
      setBtn: 'Show route',
      gpsTitle: 'Use Current GPS',
      change: 'Change',
      searching: 'Searching locations in India...',
      curated: 'Popular Locations & Hubs'
    },
    hi: {
      originTitle: 'à¤¶à¥à¤°à¥à¤†à¤¤à¥€ à¤¸à¥à¤¥à¤¾à¤¨ (Start location)',
      destTitle: 'à¤—à¤‚à¤¤à¤µà¥à¤¯ (Destination)',
      originPlaceholder: currentLocationName || 'à¤¶à¥à¤°à¥à¤†à¤¤à¥€ à¤¸à¥à¤¥à¤¾à¤¨ à¤¯à¤¾ GPS à¤šà¥à¤¨à¥‡à¤‚...',
      destPlaceholder: 'à¤—à¤‚à¤¤à¤µà¥à¤¯ à¤¸à¥à¤¥à¤¾à¤¨ (à¤•à¥‰à¤²à¥‡à¤œ, à¤¶à¤¹à¤°, à¤ªà¤¤à¤¾) à¤–à¥‹à¤œà¥‡à¤‚...',
      setBtn: 'à¤°à¥‚à¤Ÿ à¤¦à¥‡à¤–à¥‡à¤‚ (Show route)',
      gpsTitle: 'à¤®à¥‡à¤°à¤¾ GPS à¤¸à¥à¤¥à¤¾à¤¨',
      change: 'à¤¬à¤¦à¤²à¥‡à¤‚',
      searching: 'à¤¸à¥à¤¥à¤¾à¤¨ à¤–à¥‹à¤œà¥‡ à¤œà¤¾ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚...',
      curated: 'à¤ªà¥à¤°à¤®à¥à¤– à¤­à¤¾à¤°à¤¤à¥€à¤¯ à¤¶à¤¹à¤° à¤µ à¤•à¥‰à¤²à¥‡à¤œ'
    },
    hinglish: {
      originTitle: 'Start location',
      destTitle: 'Destination',
      originPlaceholder: currentLocationName || 'Starting point ya GPS...',
      destPlaceholder: 'Destination (campus, city ya address)...',
      setBtn: 'Show route',
      gpsTitle: 'Current GPS lein',
      change: 'Change',
      searching: 'Locations search ho rahi hain...',
      curated: 'Quick Popular Hubs'
    }
  }[lang];

  // Current query based on active field
  const currentQuery = activeField === 'origin' ? originQuery : destinationQuery;

  // Debounced API autocomplete query with 300ms delay and AbortController
  useEffect(() => {
    const q = activeField === 'origin' ? originQuery : destinationQuery;
    setSelectedIndex(-1);
    setSearchError(null);

    if (!q || q.trim().length < 2) {
      setAutocompleteSuggestions([]);
      setIsSearchingApi(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      setSearchError(null);
      try {
        const biasCoords = activeField === 'destination' ? originCoords : undefined;
        const results = await apiAutocompleteLocations(
          q,
          biasCoords ? biasCoords[0] : undefined,
          biasCoords ? biasCoords[1] : undefined,
          controller.signal,
          8
        );
        if (!controller.signal.aborted) {
          setAutocompleteSuggestions(results);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError' && !controller.signal.aborted) {
          console.warn('Autocomplete lookup error:', e);
          setSearchError('Location search is temporarily unavailable. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingApi(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [originQuery, destinationQuery, activeField, originCoords]);

  const handleSelectSuggestion = (item: ApiAutocompleteSuggestion) => {
    const chosen = {
      name: item.name,
      lat: item.latitude,
      lon: item.longitude,
      address: item.formatted_address,
      place_id: item.place_id
    };
    if (activeField === 'origin') {
      onOriginChange(item.name);
      if (onSelectOriginPreset) {
        onSelectOriginPreset(chosen);
      }
    } else {
      onDestinationChange(item.name);
      onSelectDestinationPreset(chosen);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        onOpen();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, autocompleteSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && autocompleteSuggestions[selectedIndex]) {
        e.preventDefault();
        handleSelectSuggestion(autocompleteSuggestions[selectedIndex]);
      } else if (onSubmitDestination && activeField === 'destination' && destinationQuery.trim()) {
        e.preventDefault();
        onSubmitDestination(destinationQuery.trim());
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

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
                {l === 'en' ? 'EN' : l === 'hi' ? 'à¤¹à¤¿à¤¨à¥à¤¦à¥€' : 'Hinglish'}
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
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 pb-2 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1.5">
              <span>ðŸ“</span>
              <span>{labels.originTitle}</span>
            </label>
            {originCoordsBadge && (
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-emerald-300/80 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded-md">
                  {originCoordsBadge}
                </span>
                {onSavePlace && originCoords && originQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => onSavePlace({ label: 'Saved place', name: originQuery.trim(), address: originAddress, coords: originCoords })}
                    className="text-[9px] font-bold text-emerald-200 bg-emerald-900/70 border border-emerald-700/70 px-1.5 py-0.5 rounded-md cursor-pointer"
                  >
                    {isSaved(originQuery) ? 'Saved' : 'Save'}
                  </button>
                )}
              </div>
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
                onKeyDown={handleKeyDown}
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

        <div className="text-slate-500 text-sm font-black pb-3">→</div>

        {/* 2. Destination Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-sky-400 flex items-center space-x-1.5">
              <span>ðŸŽ¯</span>
              <span>{labels.destTitle}</span>
            </label>
            {destCoordsBadge && (
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-sky-300/80 bg-sky-950/60 border border-sky-800/50 px-1.5 py-0.2 rounded-md">
                  {destCoordsBadge}
                </span>
                {onSavePlace && destinationCoords && destinationQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => onSavePlace({ label: 'Saved place', name: destinationQuery.trim(), address: destinationAddress, coords: destinationCoords })}
                    className="text-[9px] font-bold text-sky-200 bg-sky-900/70 border border-sky-700/70 px-1.5 py-0.5 rounded-md cursor-pointer"
                  >
                    {isSaved(destinationQuery) ? 'Saved' : 'Save'}
                  </button>
                )}
              </div>
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
                onKeyDown={handleKeyDown}
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
              âœ•
            </button>
          )}
        </div>
      )}

      {/* Auto-suggest overlay drawer */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-3 right-3 bg-slate-900/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/90 overflow-hidden max-h-[55vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 text-white">
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
            {/* Search Error State */}
            {searchError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Real API Autocomplete Results */}
            {autocompleteSuggestions.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] font-black text-sky-400 uppercase tracking-wide">
                    Live Search Results ({autocompleteSuggestions.length})
                  </span>
                  <span className="text-[9px] text-slate-400">
                    Use â†‘â†“ arrows to navigate, Enter to select
                  </span>
                </div>
                {autocompleteSuggestions.map((item, idx) => {
                  const badge = getPlaceTypeBadge(item.place_type);
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={item.place_id || idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-start space-x-3 group ${
                        isSelected
                          ? 'bg-sky-950/90 border-sky-500 shadow-md ring-1 ring-sky-500/50'
                          : 'bg-slate-800/70 hover:bg-slate-750 border-slate-700/60'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 bg-slate-900/90 border border-slate-700/80 shadow-xs mt-0.5">
                        {badge.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="text-xs font-bold text-white group-hover:text-sky-300 transition truncate">
                            {highlightMatch(item.name, currentQuery)}
                          </span>
                          <div className="flex items-center space-x-1 shrink-0">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${badge.color}`}>
                              {badge.label}
                            </span>
                            {typeof item.latitude === 'number' && typeof item.longitude === 'number' && (
                              <span className="text-[9px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded-md border border-slate-700/50">
                                {item.latitude.toFixed(3)}Â°, {item.longitude.toFixed(3)}Â°
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                          {highlightMatch(item.formatted_address, currentQuery)}
                        </div>
                        {(item.city || item.state) && (
                          <div className="flex items-center space-x-1.5 mt-1 text-[9.5px] text-sky-400 font-semibold">
                            <span>ðŸ“ {[item.city, item.district !== item.city ? item.district : null, item.state].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!isSearchingApi && !searchError && currentQuery.trim().length >= 2 && autocompleteSuggestions.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-1.5">
                <span className="text-2xl">ðŸ”</span>
                <span className="font-bold text-slate-200">No matching locations found.</span>
                <span className="text-[11px] text-slate-400 max-w-xs">
                  Try searching a landmark, college, metro station, road, or city name across India.
                </span>
              </div>
            )}

            {/* Loading State */}
            {isSearchingApi && (
              <div className="py-4 text-center text-xs text-sky-400 flex items-center justify-center space-x-2 font-medium">
                <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <span>Searching locations in India...</span>
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
                        {preset.subtitle} â€¢ {preset.city}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      {preset.typicalMinutes}m
                    </span>
                    {preset.coords && typeof preset.coords.lat === 'number' && typeof preset.coords.lng === 'number' && (
                      <span className="text-[9px] text-sky-400 font-mono">
                        {preset.coords.lat.toFixed(2)}Â°, {preset.coords.lng.toFixed(2)}Â°
                      </span>
                    )}
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

