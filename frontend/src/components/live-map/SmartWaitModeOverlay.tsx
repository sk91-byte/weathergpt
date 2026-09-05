import React, { useState, useEffect } from 'react';
import { X, Navigation, Coffee, Timer, CheckCircle2, AlertTriangle, Sparkles, ArrowRight } from '../Icons';
import { NearbySafePlace } from '../../types';

interface SmartWaitModeOverlayProps {
  initialMinutes?: number;
  onCancel: () => void;
  onStartNavigation: () => void;
  onOpenNearby: () => void;
  nearbyPlaces: NearbySafePlace[];
}

export const SmartWaitModeOverlay: React.FC<SmartWaitModeOverlayProps> = ({
  initialMinutes = 20,
  onCancel,
  onStartNavigation,
  onOpenNearby,
  nearbyPlaces
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialMinutes * 60);
  const [isConditionsImproved, setIsConditionsImproved] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsConditionsImproved(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSimulateImproved = () => {
    setSecondsRemaining(0);
    setIsConditionsImproved(true);
  };

  return (
    <div className="absolute inset-0 z-40 bg-slate-900/70 backdrop-blur-xs flex flex-col justify-end p-3 pointer-events-auto">
      <div className="bg-white rounded-3xl p-5 shadow-2xl border border-blue-100 max-w-md w-full mx-auto animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Timer className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-black text-slate-900">
                  SMART WAIT MODE
                </h3>
                <span className="text-[9px] font-black bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-sm uppercase">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                WeatherGPT Real-Time Rain Passage Tracking
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
            title="Cancel wait mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Countdown & Meteorological Transition Display */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white shadow-lg mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-sky-400 tracking-wider block">
                Estimated Rain Clearance In
              </span>
              <div className="text-3xl font-black font-mono tracking-tight text-white flex items-baseline space-x-1">
                <span>{formatCountdown(secondsRemaining)}</span>
                <span className="text-xs text-slate-400 font-sans font-semibold">min:sec</span>
              </div>
            </div>

            <button
              onClick={handleSimulateImproved}
              className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-sky-300 border border-sky-400/30 text-[10px] font-bold transition cursor-pointer"
            >
              ⚡ Fast-Forward
            </button>
          </div>

          {/* Current Weather vs Predicted After Wait */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 font-bold block">Current Weather:</span>
              <div className="font-extrabold text-white flex items-center space-x-1 mt-0.5">
                <span>🌧️</span>
                <span className="truncate">Heavy Downpour (26°C)</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40">
              <span className="text-[10px] text-emerald-400 font-bold block">After 20 Minutes:</span>
              <div className="font-extrabold text-emerald-200 flex items-center space-x-1 mt-0.5">
                <span>☁️</span>
                <span className="truncate">Light Clouds (27°C)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Condition Improved Banner */}
        {isConditionsImproved ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-900 mb-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h4 className="text-xs font-black uppercase text-emerald-950">
                Weather Conditions Improved!
              </h4>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed mb-3">
              Rain intensity has eased significantly. Your recommended route is now safer to travel (Safety Score improved from 78 → 96).
            </p>
            <button
              onClick={onStartNavigation}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-500/25 flex items-center justify-center space-x-2 transition cursor-pointer active:scale-98"
            >
              <Navigation className="w-4 h-4 fill-white" />
              <span>START NAVIGATION NOW</span>
            </button>
          </div>
        ) : (
          <>
            {/* Quick nearby safe place preview */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Nearby Places to Relax
                </span>
                <button
                  onClick={onOpenNearby}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  View All ({nearbyPlaces.length}) →
                </button>
              </div>

              {nearbyPlaces.slice(0, 2).map((place) => (
                <div
                  key={place.id}
                  onClick={onOpenNearby}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 mb-1.5 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-base">{place.category === 'cafe' ? '☕' : '🍽️'}</span>
                    <div className="truncate">
                      <h5 className="text-xs font-bold text-slate-900 truncate">
                        {place.name}
                      </h5>
                      <p className="text-[10px] text-slate-500 truncate">
                        {place.distanceMeters}m • {place.walkingMinutes} min walk • {place.openStatus.split('•')[0]}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-500 shrink-0">
                    ⭐ {place.rating}
                  </span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onStartNavigation}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <span>Start Journey Early</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onCancel}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel Wait
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
