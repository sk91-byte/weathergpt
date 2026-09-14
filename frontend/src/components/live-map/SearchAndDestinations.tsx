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
  AlertTriangle,
  Mic
} from '../Icons';
import { DestinationPreset } from '../../data/liveMapData';
import { apiAutocompleteLocations, ApiAutocompleteSuggestion } from '../../services/api';

export type MapLanguage = 'en' | 'hi' | 'hinglish';

function getPlaceTypeBadge(type?: string) {
  const t = (type || '').toLowerCase();
  if (t === 'university' || t === 'college') return { label: 'University / College', icon: '\u{1F393}', color: 'bg-violet-50 text-violet-700 border-violet-200' };
  if (t === 'school') return { label: 'School', icon: '\u{1F3EB}', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (t === 'hospital') return { label: 'Hospital', icon: '\u{1F3E5}', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (t === 'airport') return { label: 'Airport', icon: '\u2708\uFE0F', color: 'bg-sky-50 text-sky-700 border-sky-200' };
  if (t === 'station') return { label: 'Station', icon: '\u{1F686}', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (t === 'bus_station') return { label: 'Bus Station', icon: '\u{1F68C}', color: 'bg-orange-50 text-orange-700 border-orange-200' };
  if (t === 'road') return { label: 'Road / Marg', icon: '\u{1F6E3}\uFE0F', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (t === 'locality') return { label: 'Locality / Sector', icon: '\u{1F4CD}', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (t === 'city' || t === 'town' || t === 'village') return { label: 'City / Town', icon: '\u{1F3D9}\uFE0F', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  if (t === 'landmark') return { label: 'Landmark', icon: '\u{1F5FF}', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  if (t === 'commercial') return { label: 'Market / Mall', icon: '\u{1F6CD}\uFE0F', color: 'bg-pink-50 text-pink-700 border-pink-200' };
  if (t === 'religious') return { label: 'Place of Worship', icon: '\u{1F6D5}', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
  return { label: 'Location', icon: '\u{1F4CD}', color: 'bg-slate-100 text-slate-700 border-slate-200' };
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
    return `${lat.toFixed(3)}\u00B0N, ${lon.toFixed(3)}\u00B0E`;
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
      originTitle: '\u0936\u0941\u0930\u0941\u0906\u0924\u0940 \u0938\u094d\u0925\u093e\u0928 (Start location)',
      destTitle: '\u0917\u0902\u0924\u0935\u094d\u092f (Destination)',
      originPlaceholder: currentLocationName || '\u0936\u0941\u0930\u0941\u0906\u0924\u0940 \u0938\u094d\u0925\u093e\u0928 या GPS चुनें...',
      destPlaceholder: '\u0917\u0902\u0924\u0935\u094d\u092f (कॉलेज, शहर, पता) खोजें...',
      setBtn: '\u0930\u0942\u091f \u0926\u0947\u0916\u0947\u0902 (Show route)',
      gpsTitle: '\u092e\u0947\u0930\u093e GPS \u0938\u094d\u0925\u093e\u0928',
      change: '\u092c\u0926\u0932\u0947\u0902',
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
      {/* Compact floating search bar used after a destination is selected. */}
      {selectedDestinationName && (
        <div className="mb-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2 rounded-xl px-2 py-1">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              type="text"
              value={destinationQuery}
              onChange={(event) => {
                onDestinationChange(event.target.value);
                setActiveField('destination');
                onOpen();
              }}
              onFocus={() => {
                setActiveField('destination');
                onOpen();
              }}
              onKeyDown={handleKeyDown}
              className="min-w-0 flex-1 bg-transparent text-sm font-extrabold text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Search destination"
              aria-label="Search destination"
            />
            <button type="button" onClick={() => { onClearDestination(); onDestinationChange(''); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Clear destination"><X className="h-4 w-4" /></button>
            <button type="button" onClick={onOpen} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Voice search"><Mic className="h-4 w-4" /></button>
            <button type="button" onClick={onUseGps} className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50" aria-label={labels.gpsTitle}><Compass className="h-4 w-4" /></button>
          </div>
          <div className="mt-1 flex items-center gap-2 border-t border-slate-100 px-2 pt-2 text-[11px] font-bold text-slate-700">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate">{originQuery || currentLocationName || 'Current location'}</span>
            <span className="text-slate-300">↓</span>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
            <span className="truncate">{selectedDestinationName}</span>
          </div>
        </div>
      )}

      {/* Main Dual Search Card */}
      <div className={`${selectedDestinationName ? 'hidden' : ''} bg-white/96 backdrop-blur-md rounded-2xl shadow-md border border-slate-200 p-3 text-slate-900 transition-all`}>
        {/* Top Bar: Language Switcher & Quick Planner Link */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-xs">
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
                    : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
              >
                {l === 'en' ? 'EN' : l === 'hi' ? '\u0939\u093f\u0928\u094d\u0926\u0940' : 'Hinglish'}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {onOpenPlanTripModal && (
              <button
                type="button"
                onClick={onOpenPlanTripModal}
                className="text-[10.5px] font-extrabold text-sky-700 hover:text-sky-900 flex items-center space-x-1 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg transition active:scale-95 cursor-pointer"
                title="Open full Plan Trip modal with all departure options"
              >
                <Sparkles className="w-3 h-3 text-sky-600" />
                <span>+ Plan Trip</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. Origin Section */}
        <div className="space-y-2 pb-2 border-b border-slate-200">
          <div className="min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-1 min-w-0">
            <label className="min-w-0 text-[11px] font-black text-emerald-700 flex items-center space-x-1.5 truncate tracking-wide">
              <span>&#x1F4CD;</span>
              <span>{labels.originTitle}</span>
            </label>
            {originCoordsBadge && (
              <div className="flex items-center gap-1 min-w-0 max-w-[58%]">
                <span className="truncate text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                  {originCoordsBadge}
                </span>
                {onSavePlace && originCoords && originQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => onSavePlace({ label: 'Saved place', name: originQuery.trim(), address: originAddress, coords: originCoords })}
                    className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md cursor-pointer"
                  >
                    {isSaved(originQuery) ? 'Saved' : 'Save'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 min-w-0 bg-slate-50 rounded-xl px-2.5 py-1.5 border border-slate-200 focus-within:border-emerald-500/80 transition">
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
                className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-hidden truncate"
              />
            </div>

            {/* GPS Location Button */}
            <button
              onClick={onUseGps}
              className={`px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center space-x-1 text-[10px] font-bold transition cursor-pointer shrink-0 ${
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
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Clear origin"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          </div>

        <div className="flex justify-center -my-1 relative z-10">
          {onSwapLocations && (
            <button type="button" onClick={onSwapLocations} className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition" title="Reverse trip: swap start and destination">
              <RotateCcw className="w-3.5 h-3.5 mx-auto" />
            </button>
          )}
        </div>

        {/* 2. Destination Section */}
        <div className="min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-1 min-w-0">
            <label className="min-w-0 text-[11px] font-black text-sky-700 flex items-center space-x-1.5 truncate tracking-wide">
              <span>&#x1F3AF;</span>
              <span>{labels.destTitle}</span>
            </label>
            {destCoordsBadge && (
              <div className="flex items-center gap-1 min-w-0 max-w-[58%]">
                <span className="truncate text-[9px] font-mono text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded-md">
                  {destCoordsBadge}
                </span>
                {onSavePlace && destinationCoords && destinationQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => onSavePlace({ label: 'Saved place', name: destinationQuery.trim(), address: destinationAddress, coords: destinationCoords })}
                    className="text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-md cursor-pointer"
                  >
                    {isSaved(destinationQuery) ? 'Saved' : 'Save'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 min-w-0 bg-slate-50 rounded-xl px-2.5 py-1.5 border border-slate-200 focus-within:border-sky-500/80 transition">
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
                className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-hidden truncate"
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

            {destinationQuery ? (
              <button
                onClick={() => {
                  onClearDestination();
                  onDestinationChange('');
                }}
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Clear destination"
              >
                <X className="w-3 h-3" />
              </button>
            ) : null}
          </div>
        </div>

        </div>

        {/* 3. Travel Mode Selector & Quick Indian Chips */}
        <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-1.5">
            {[
              { id: 'driving', label: 'Drive', icon: Car, available: true },
              { id: 'walking', label: 'Walk', icon: Footprints, available: true },
              { id: 'cycling', label: 'Cycle', icon: Bike, available: true },
              { id: 'transit', label: 'Transit', icon: Bus, available: false }
            ].map((mode) => {
              const Icon = mode.icon;
              const isActive = travelMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => mode.available && onChangeTravelMode(mode.id)}
                  disabled={!mode.available}
                  title={mode.available ? `${mode.label} routing` : 'Transit preview is unavailable; use Google Maps for live transit directions'}
                  className={`px-2.5 py-1 rounded-xl font-bold flex items-center space-x-1 transition ${mode.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-[10px]">{mode.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-slate-600 font-bold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            <span>WeatherGPT Live Safe Corridor</span>
          </div>
        </div>
      </div>

      {/* GPS Fallback Notice if Permission Denied */}
      {gpsPermissionNotice && (
        <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
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
        <div className="absolute top-full mt-2 left-3 right-3 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[55vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 text-slate-900">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
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
                        ? 'bg-sky-50 border-sky-400 shadow-md ring-1 ring-sky-300'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 bg-slate-100 border border-slate-200 shadow-xs mt-0.5">
                        {badge.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition truncate">
                            {highlightMatch(item.name, currentQuery)}
                          </span>
                          <div className="flex items-center space-x-1 shrink-0">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${badge.color}`}>
                              {badge.label}
                            </span>
                            {typeof item.latitude === 'number' && typeof item.longitude === 'number' && (
                              <span className="text-[9px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200">
                                {item.latitude.toFixed(3)}\u00B0, {item.longitude.toFixed(3)}\u00B0
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                          {highlightMatch(item.formatted_address, currentQuery)}
                        </div>
                        {(item.city || item.state) && (
                          <div className="flex items-center space-x-1.5 mt-1 text-[9.5px] text-sky-400 font-semibold">
                            <span>&#x1F4CD; {[item.city, item.district !== item.city ? item.district : null, item.state].filter(Boolean).join(', ')}</span>
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
                <span className="text-2xl">&#x1F50D;</span>
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
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-50 border border-slate-200 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{preset.name}</div>
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
                        {preset.coords.lat.toFixed(2)}\u00B0, {preset.coords.lng.toFixed(2)}\u00B0
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

