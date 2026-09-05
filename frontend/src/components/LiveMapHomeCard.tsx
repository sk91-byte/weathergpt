import React, { useState } from 'react';
import { RouteTrip, WeatherData } from '../types';
import { Navigation, Layers, ShieldAlert, AlertTriangle, ArrowRight, Sparkles, MapPin, Maximize2 } from './Icons';

interface LiveMapHomeCardProps {
  trip: RouteTrip;
  weather: WeatherData;
  onOpenLiveMap: () => void;
  onStartNavigation?: () => void;
}

export const LiveMapHomeCard: React.FC<LiveMapHomeCardProps> = ({
  trip,
  weather,
  onOpenLiveMap,
  onStartNavigation
}) => {
  const [showRadar, setShowRadar] = useState<boolean>(true);

  return (
    <div className="px-5 mt-4">
      {/* Outer Card Container */}
      <div className="bg-slate-900 rounded-3xl p-4 text-white shadow-xl border border-slate-800 overflow-hidden relative">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Navigation className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  LIVE WEATHER MAP
                </h3>
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Commute intelligence & flood-safe route guidance
              </p>
            </div>
          </div>

          <button
            id="btn-open-fullscreen-map-header"
            onClick={onOpenLiveMap}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center space-x-1 text-xs font-bold"
            title="Open full interactive map"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Full Map</span>
          </button>
        </div>

        {/* Embedded Interactive Vector Map Window */}
        <div
          onClick={onOpenLiveMap}
          className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 cursor-pointer group"
          title="Click to open full live map"
        >
          {/* Street & Route Vector Canvas */}
          <svg viewBox="0 0 400 200" className="w-full h-full block">
            <defs>
              <pattern id="home-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
              </pattern>
              <radialGradient id="home-radar-cell" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Grid */}
            <rect width="400" height="200" fill="#0b1120" />
            <rect width="400" height="200" fill="url(#home-grid)" opacity="0.8" />

            {/* Simulated Street Arterials */}
            <path d="M 20 50 L 380 150" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
            <path d="M 80 180 L 320 20" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />

            {/* Live Animated Radar Cloud Overlay */}
            {showRadar && (
              <g className="animate-pulse" style={{ animationDuration: '3s' }}>
                <circle cx="210" cy="115" r="55" fill="url(#home-radar-cell)" />
                <circle cx="260" cy="130" r="40" fill="url(#home-radar-cell)" />
                <text x="175" y="110" fill="#fca5a5" fontSize="8" fontWeight="bold">
                  🌧️ HEAVY RAIN
                </text>
              </g>
            )}

            {/* Avoid Route (Red, passing through rain cell) */}
            <path
              d="M 60 70 Q 200 130, 340 140"
              fill="none"
              stroke="#ef4444"
              strokeWidth="3.5"
              strokeDasharray="4 3"
              strokeOpacity="0.6"
            />

            {/* Recommended Route (Green Emerald, bypasses rain elevated) */}
            <path
              d="M 60 70 Q 160 30, 260 55 T 340 140"
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Animated Directional pulses */}
            <circle cx="165" cy="40" r="4" fill="#34d399" className="animate-ping" />

            {/* Origin Pin */}
            <g transform="translate(60, 70)">
              <circle r="10" fill="#10b981" fillOpacity="0.3" className="animate-ping" />
              <circle r="6" fill="#10b981" />
              <circle r="2.5" fill="#ffffff" />
              <text x="-25" y="-10" fill="#cbd5e1" fontSize="9" fontWeight="bold">
                Origin
              </text>
            </g>

            {/* Destination Pin */}
            <g transform="translate(340, 140)">
              <circle r="10" fill="#ef4444" fillOpacity="0.3" className="animate-ping" />
              <circle r="6" fill="#ef4444" />
              <circle r="2.5" fill="#ffffff" />
              <text x="-45" y="20" fill="#f87171" fontSize="9" fontWeight="bold">
                Sushant University
              </text>
            </g>

            {/* Waterlogged Underpass Hazard Warning Pin */}
            <g transform="translate(200, 125)">
              <rect x="-10" y="-10" width="20" height="20" rx="6" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
              <text x="0" y="3" fill="#ffffff" fontSize="10" textAnchor="middle">
                ⚠️
              </text>
            </g>
          </svg>

          {/* Floating Live Badge Overlays on Map */}
          <div className="absolute top-2 left-2 flex items-center space-x-1.5">
            <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[10px] font-black shadow-xs">
              🟢 Safest Route (92/100)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-red-950/90 text-red-300 border border-red-500/40 text-[10px] font-black shadow-xs">
              ⚠️ Underpass Flood Risk
            </span>
          </div>

          {/* Radar Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowRadar(!showRadar);
            }}
            className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
              showRadar
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-slate-800/90 text-slate-300 border-slate-700'
            }`}
          >
            {showRadar ? '🌧️ Radar ON' : '🌧️ Radar OFF'}
          </button>

          {/* Click to Expand Prompt */}
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-slate-900/90 text-sky-400 border border-sky-500/30 text-[10px] font-extrabold flex items-center space-x-1 group-hover:bg-blue-600 group-hover:text-white transition">
            <span>Click to explore live</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Meteorological Insights Summary */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start space-x-2 text-xs">
          <span className="text-base leading-none">🧠</span>
          <div className="flex-1 text-[11px] text-slate-300 leading-relaxed">
            <strong className="text-white font-bold">WeatherGPT Route Recommendation: </strong>
            Sector 56 underpass has 18cm water accumulation. Taking the{' '}
            <span className="text-emerald-400 font-bold">Elevated Ridge Bypass</span> avoids the rain cloud and arrives 5 min faster without obstruction.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            id="btn-home-open-live-map"
            onClick={onOpenLiveMap}
            className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center space-x-1.5 transition cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 fill-white" />
            <span>Open Live Map</span>
          </button>

          <button
            id="btn-home-start-nav"
            onClick={() => {
              onOpenLiveMap();
              if (onStartNavigation) onStartNavigation();
            }}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 flex items-center justify-center space-x-1.5 transition cursor-pointer"
          >
            <span>🧭 Start Navigation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
