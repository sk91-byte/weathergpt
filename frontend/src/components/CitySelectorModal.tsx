import React, { useState } from 'react';
import { X, MapPin, Search, CheckCircle2, Navigation, Loader2, AlertTriangle } from './Icons';
import { INDIAN_CITIES } from '../data/weatherData';

interface CitySelectorModalProps {
  currentCity: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectCity: (cityString: string) => void;
  onUseLiveLocation?: () => void;
  isLocating?: boolean;
  locationError?: string | null;
}

export const CitySelectorModal: React.FC<CitySelectorModalProps> = ({
  currentCity,
  isOpen,
  onClose,
  onSelectCity,
  onUseLiveLocation,
  isLocating = false,
  locationError = null
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filtered = INDIAN_CITIES.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div
        id="modal-city-selector"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Select Location</h3>
              <p className="text-[11px] text-blue-100">Live Indian Meteorological Feeds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* GPS Live Location Quick Action */}
        <div className="p-4 pb-2">
          <button
            id="btn-use-live-gps"
            onClick={() => {
              if (onUseLiveLocation) {
                onUseLiveLocation();
              }
            }}
            disabled={isLocating}
            className="w-full p-3.5 bg-gradient-to-r from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 border-2 border-blue-200 rounded-2xl text-left transition flex items-center justify-between cursor-pointer group shadow-xs disabled:opacity-60"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                {isLocating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Navigation className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-extrabold text-blue-900">
                    {isLocating ? 'Detecting Live Coordinates...' : 'Use Current Location (Live GPS)'}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {isLocating ? 'Fetching live satellites & local radar...' : 'Automatic weather & rainfall radar for where you are'}
                </p>
              </div>
            </div>
          </button>

          {locationError && (
            <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{locationError}</p>
                <p className="text-[10px] text-red-600 mt-0.5">Please allow location access in your browser or search your city below.</p>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-slate-100">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              placeholder="Search Indian city, district or capital..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        {/* List of Cities */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Major Meteorological Hubs:
          </span>
          {filtered.map((c) => {
            const isSelected = currentCity.toLowerCase().includes(c.split(',')[0].toLowerCase());
            return (
              <button
                key={c}
                onClick={() => {
                  onSelectCity(c);
                  onClose();
                }}
                className={`w-full p-3 rounded-2xl text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 border border-blue-200 text-blue-700'
                    : 'bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <MapPin className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{c}</span>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
