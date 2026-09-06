import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Navigation,
  Clock,
  MapPin,
  LocateFixed,
  Loader2,
  ArrowUpDown,
  Search,
  Building2,
  Car,
  Footprints,
  Bike,
  Bus,
  Sparkles,
  CheckCircle2
} from '../Icons';
import { apiAutocompleteLocations, apiResolveLocation, apiGetPointWeather } from '../../services/api';

interface LiveMapPlanTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOriginName: string;
  currentOriginCoords?: [number, number];
  currentDestinationName: string;
  currentDestinationCoords?: [number, number];
  currentTravelMode?: string;
  currentLeaveBy?: string;
  onSetRoute: (params: {
    originName: string;
    originCoords: [number, number];
    destinationName: string;
    destinationCoords: [number, number];
    travelMode: string;
    leaveBy: string;
  }) => Promise<void> | void;
}

export const LiveMapPlanTripModal: React.FC<LiveMapPlanTripModalProps> = ({
  isOpen,
  onClose,
  currentOriginName,
  currentOriginCoords,
  currentDestinationName,
  currentDestinationCoords,
  currentTravelMode = 'driving',
  currentLeaveBy = '08:30 AM',
  onSetRoute
}) => {
  const [originInput, setOriginInput] = useState(currentOriginName || '');
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(currentOriginCoords || null);

  const [destinationInput, setDestinationInput] = useState(currentDestinationName || '');
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(currentDestinationCoords || null);

  const [travelMode, setTravelMode] = useState<string>(currentTravelMode);
  const [leaveBy, setLeaveBy] = useState<string>(currentLeaveBy);

  // Autocomplete suggestions state
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  // GPS state
  const [isLocatingOrigin, setIsLocatingOrigin] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Submission calculation state
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setOriginInput(currentOriginName || '');
      setOriginCoords(currentOriginCoords || null);
      setDestinationInput(currentDestinationName || '');
      setDestinationCoords(currentDestinationCoords || null);
      setTravelMode(currentTravelMode || 'driving');
      setLeaveBy(currentLeaveBy || '08:30 AM');
      setErrorMessage(null);
      setGpsNotice(null);
    }
  }, [isOpen, currentOriginName, currentOriginCoords, currentDestinationName, currentDestinationCoords, currentTravelMode, currentLeaveBy]);

  // Real-time debounced location database search
  useEffect(() => {
    const query = activeField === 'origin' ? originInput : destinationInput;
    if (!activeField || !query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const results = await apiAutocompleteLocations(query);
        setSuggestions(results);
      } catch (err) {
        console.warn('Location suggestion lookup error:', err);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [originInput, destinationInput, activeField]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setActiveField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // GPS Current Location for Origin
  const handleUseCurrentLocationForOrigin = () => {
    setIsLocatingOrigin(true);
    setGpsNotice(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsNotice('We could not detect your location. You can search for your area manually.');
      setIsLocatingOrigin(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setOriginCoords([lat, lon]);

          let placeLabel = `GPS Location (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E)`;
          try {
            const res = await apiResolveLocation(undefined, lat, lon);
            if (res && res.name) {
              placeLabel = res.name;
            }
          } catch (err) {
            if (import.meta.env.DEV) {
              console.warn('Reverse geocode error in LiveMapPlanTripModal:', err);
            }
          }
          setOriginInput(placeLabel);
        } catch {
          setOriginInput('Current GPS Location');
        } finally {
          setIsLocatingOrigin(false);
          setActiveField(null);
        }
      },
      (err) => {
        setIsLocatingOrigin(false);
        if (err.code === 1) {
          setGpsNotice('Location permission is blocked. Please allow location access in your browser settings.');
        } else {
          setGpsNotice('We could not detect your location. You can search for your area manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Swap Origin and Destination
  const handleSwap = () => {
    const tempName = originInput;
    const tempCoords = originCoords;
    setOriginInput(destinationInput);
    setOriginCoords(destinationCoords);
    setDestinationInput(tempName);
    setDestinationCoords(tempCoords);
  };

  // Handle final submission & route setting
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!originInput.trim()) {
      setErrorMessage('Please enter or select a starting location.');
      return;
    }
    if (!destinationInput.trim()) {
      setErrorMessage('Please enter or select a destination.');
      return;
    }

    setIsCalculating(true);
    try {
      let resolvedOriginCoords = originCoords;
      let resolvedDestCoords = destinationCoords;

      // If origin coordinates are missing, resolve them
      if (!resolvedOriginCoords) {
        const originRes = await apiResolveLocation(originInput.trim());
        if (originRes && originRes.latitude && originRes.longitude) {
          resolvedOriginCoords = [originRes.latitude, originRes.longitude];
        } else {
          resolvedOriginCoords = [28.4986, 77.0878]; // Safe default fallback
        }
      }

      // If destination coordinates are missing, resolve them
      if (!resolvedDestCoords) {
        const destRes = await apiResolveLocation(destinationInput.trim());
        if (destRes && destRes.latitude && destRes.longitude) {
          resolvedDestCoords = [destRes.latitude, destRes.longitude];
        } else {
          resolvedDestCoords = [28.4358, 77.1082]; // Safe default fallback
        }
      }

      await onSetRoute({
        originName: originInput.trim(),
        originCoords: resolvedOriginCoords,
        destinationName: destinationInput.trim(),
        destinationCoords: resolvedDestCoords,
        travelMode,
        leaveBy
      });

      onClose();
    } catch (err) {
      console.warn('Failed to set destination on live map:', err);
      setErrorMessage('Failed to calculate route. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        ref={modalRef}
        id="modal-live-map-plan-trip"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-250"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shadow-xs">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Set Destination & Plan Commute</h3>
              <p className="text-[11px] text-blue-200">Real-time Weather & Road Hazard Route Intelligence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
            aria-label="Close destination modal"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1 text-slate-800">
          {/* Info Card */}
          <div className="p-2.5 bg-blue-50/90 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-start space-x-2">
            <span className="text-base shrink-0">🗺️</span>
            <div>
              <span className="font-bold text-blue-950 block">Live Weather-Aware Navigation</span>
              <span className="text-[11px] text-blue-800/80">
                Choose any starting point & destination across India. We calculate safest & fastest corridors with live IMD radar.
              </span>
            </div>
          </div>

          {/* GPS Notice Banner */}
          {gpsNotice && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
              <span className="text-[11px] font-medium">{gpsNotice}</span>
              <button
                type="button"
                onClick={() => setGpsNotice(null)}
                className="text-amber-700 hover:text-amber-950 font-bold ml-2 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold">
              {errorMessage}
            </div>
          )}

          {/* 1. Origin Input */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <span>🟢 Origin (Start Point)</span>
              </label>
              {originCoords && (
                <span className="text-[9.5px] font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                  {originCoords[0].toFixed(3)}°, {originCoords[1].toFixed(3)}°
                </span>
              )}
            </div>

            <div className="relative flex items-center bg-slate-50 focus-within:bg-white border focus-within:border-blue-500 border-slate-200 rounded-xl px-2.5 py-1.5 transition shadow-2xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-1.5" />
              <input
                type="text"
                placeholder="Search starting location or use GPS..."
                value={originInput}
                onFocus={() => setActiveField('origin')}
                onChange={(e) => {
                  setOriginInput(e.target.value);
                  setActiveField('origin');
                }}
                className="w-full bg-transparent text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden py-1"
              />

              {originInput && (
                <button
                  type="button"
                  onClick={() => {
                    setOriginInput('');
                    setOriginCoords(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 cursor-pointer mr-1"
                >
                  ✕
                </button>
              )}

              {/* Current Location GPS Button */}
              <button
                type="button"
                onClick={handleUseCurrentLocationForOrigin}
                disabled={isLocatingOrigin}
                title="Detect current GPS location"
                className="shrink-0 flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition active:scale-95 cursor-pointer"
              >
                {isLocatingOrigin ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span className="hidden sm:inline">GPS...</span>
                  </>
                ) : (
                  <>
                    <LocateFixed className="w-3.5 h-3.5 text-blue-600" />
                    <span>GPS</span>
                  </>
                )}
              </button>
            </div>

            {/* Origin Autocomplete Suggestions Dropdown */}
            {activeField === 'origin' && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-52 overflow-y-auto">
                {isSearchingSuggestions ? (
                  <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Searching places...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Search Results ({suggestions.length})
                    </div>
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setOriginInput(item.name);
                          setOriginCoords([item.latitude, item.longitude]);
                          setActiveField(null);
                        }}
                        className="w-full text-left p-2.5 hover:bg-blue-50/70 transition flex items-start space-x-2 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                              {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    <button
                      type="button"
                      onClick={handleUseCurrentLocationForOrigin}
                      className="w-full text-left p-2 hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-lg flex items-center space-x-2 cursor-pointer"
                    >
                      <LocateFixed className="w-4 h-4 text-blue-600" />
                      <span>Use Current GPS Location</span>
                    </button>
                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">
                      Quick Suggestions
                    </div>
                    {[
                      { name: 'DLF CyberCity', sub: 'DLF Phase 2, Gurugram', lat: 28.4986, lon: 77.0878 },
                      { name: 'Clock Tower', sub: 'Paltan Bazaar, Dehradun', lat: 30.3255, lon: 78.0436 },
                      { name: 'New Delhi Railway Station', sub: 'Paharganj, New Delhi', lat: 28.6428, lon: 77.2195 },
                      { name: 'Kempegowda Int. Airport', sub: 'Devanahalli, Bengaluru', lat: 13.1986, lon: 77.7066 }
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setOriginInput(q.name);
                          setOriginCoords([q.lat, q.lon]);
                          setActiveField(null);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 text-xs rounded-lg flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-semibold text-slate-800">{q.name}</span>
                        <span className="text-[10px] text-slate-400">{q.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              type="button"
              onClick={handleSwap}
              title="Swap Origin and Destination"
              className="p-1.5 bg-white border border-slate-300 rounded-full shadow-xs hover:bg-blue-50 hover:border-blue-400 text-slate-600 hover:text-blue-600 transition active:scale-90 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Destination Input */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <span>📍 Destination (Target Point)</span>
              </label>
              {destinationCoords && (
                <span className="text-[9.5px] font-mono text-red-700 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
                  {destinationCoords[0].toFixed(3)}°, {destinationCoords[1].toFixed(3)}°
                </span>
              )}
            </div>

            <div className="relative flex items-center bg-slate-50 focus-within:bg-white border focus-within:border-blue-500 border-slate-200 rounded-xl px-2.5 py-1.5 transition shadow-2xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-1.5" />
              <input
                type="text"
                placeholder="Search destination, college, tech park, airport..."
                value={destinationInput}
                onFocus={() => setActiveField('destination')}
                onChange={(e) => {
                  setDestinationInput(e.target.value);
                  setActiveField('destination');
                }}
                className="w-full bg-transparent text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden py-1"
              />

              {destinationInput && (
                <button
                  type="button"
                  onClick={() => {
                    setDestinationInput('');
                    setDestinationCoords(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 cursor-pointer mr-1"
                >
                  ✕
                </button>
              )}

              <div className="shrink-0 text-slate-400 px-1 text-[11px]">
                📍
              </div>
            </div>

            {/* Destination Autocomplete Suggestions Dropdown */}
            {activeField === 'destination' && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-52 overflow-y-auto">
                {isSearchingSuggestions ? (
                  <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Searching destination database...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Search Results ({suggestions.length})
                    </div>
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setDestinationInput(item.name);
                          setDestinationCoords([item.latitude, item.longitude]);
                          setActiveField(null);
                        }}
                        className="w-full text-left p-2.5 hover:bg-blue-50/70 transition flex items-start space-x-2 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                              {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">
                      Popular Destination Shortcuts
                    </div>
                    {[
                      { name: 'Sushant University', sub: 'Sector 55, Gurugram', lat: 28.4358, lon: 77.1082, icon: '🎓' },
                      { name: 'IGI Airport T3', sub: 'New Delhi', lat: 28.5562, lon: 77.1000, icon: '✈️' },
                      { name: 'DLF Cyber Hub', sub: 'DLF Phase 2, Gurugram', lat: 28.4952, lon: 77.0886, icon: '🏢' },
                      { name: 'UPES Campus Dehradun', sub: 'Energy Acres, Bidholi, Dehradun', lat: 30.4158, lon: 77.9658, icon: '🎓' },
                      { name: 'Connaught Place (CP)', sub: 'Central Delhi', lat: 28.6315, lon: 77.2167, icon: '🏙️' },
                      { name: 'IIT Delhi Campus', sub: 'Hauz Khas, New Delhi', lat: 28.5450, lon: 77.1926, icon: '🎓' }
                    ].map((d, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDestinationInput(d.name);
                          setDestinationCoords([d.lat, d.lon]);
                          setActiveField(null);
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-blue-50 text-slate-700 text-xs rounded-lg flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <span>{d.icon}</span>
                          <span className="font-semibold text-slate-800">{d.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{d.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Travel Mode Selector */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              Travel Mode
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'driving', label: 'Drive', icon: Car },
                { id: 'walking', label: 'Walk', icon: Footprints },
                { id: 'cycling', label: 'Cycle', icon: Bike },
                { id: 'transit', label: 'Transit', icon: Bus }
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = travelMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTravelMode(m.id)}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl border flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Leave By Time Selector */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              Leave By Time
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLeaveBy(t)}
                  className={`py-1.5 text-[11px] font-bold rounded-xl border transition cursor-pointer ${
                    leaveBy === t
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t.replace(' AM', '')} AM
                </button>
              ))}
            </div>
          </div>

          {/* 5. Popular Commute Presets */}
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Popular Commute Presets
            </span>
            <div className="space-y-1.5">
              {[
                {
                  from: 'DLF CyberCity, Gurgaon',
                  fromCoords: [28.4986, 77.0878] as [number, number],
                  to: 'Sushant University, Sector 55',
                  toCoords: [28.4358, 77.1082] as [number, number],
                  time: '08:30 AM'
                },
                {
                  from: 'DLF Cyber Hub, Gurgaon',
                  fromCoords: [28.4952, 77.0886] as [number, number],
                  to: 'IGI Airport T3, New Delhi',
                  toCoords: [28.5562, 77.1000] as [number, number],
                  time: '09:00 AM'
                },
                {
                  from: 'Clock Tower, Dehradun',
                  fromCoords: [30.3255, 78.0436] as [number, number],
                  to: 'UPES Campus, Bidholi',
                  toCoords: [30.4158, 77.9658] as [number, number],
                  time: '08:15 AM'
                }
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setOriginInput(p.from);
                    setOriginCoords(p.fromCoords);
                    setDestinationInput(p.to);
                    setDestinationCoords(p.toCoords);
                    setLeaveBy(p.time);
                  }}
                  className="w-full text-left p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200/80 rounded-xl text-xs flex items-center justify-between transition cursor-pointer"
                >
                  <span className="font-semibold text-slate-800 truncate mr-2">
                    {p.from.split(',')[0]} → {p.to.split(',')[0]}
                  </span>
                  <span className="text-[11px] text-blue-600 font-bold shrink-0">{p.time}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary CTA Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!originInput.trim() || !destinationInput.trim() || isCalculating}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Calculating Weather-Aware Route...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 text-white" />
                  <span>Set Destination & Calculate Route</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
