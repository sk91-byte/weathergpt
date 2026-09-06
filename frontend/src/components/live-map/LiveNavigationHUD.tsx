import React, { useState, useEffect } from 'react';
import { LiveMapRoute } from '../../types';
import {
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  X,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Navigation
} from '../Icons';

interface LiveNavigationHUDProps {
  route: LiveMapRoute;
  onEndNavigation: () => void;
  onOpenTimeline: () => void;
  vehicleProgress: number; // 0 to 100
  onProgressChange: (p: number) => void;
  onReroute: () => void;
}

export const LiveNavigationHUD: React.FC<LiveNavigationHUDProps> = ({
  route,
  onEndNavigation,
  onOpenTimeline,
  vehicleProgress,
  onProgressChange,
  onReroute
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simulatedAlertActive, setSimulatedAlertActive] = useState<boolean>(false);
  const [hasRerouted, setHasRerouted] = useState<boolean>(false);

  // Auto-drive simulation timer
  useEffect(() => {
    if (!isPlaying) return;
    const driveInterval = setInterval(() => {
      onProgressChange((prev) => {
        if (prev >= 98) {
          setIsPlaying(false);
          return 100;
        }
        return prev + 1.2;
      });
    }, 800);

    return () => clearInterval(driveInterval);
  }, [isPlaying, onProgressChange]);

  // Turn maneuvers based on vehicle progress
  const getManeuver = (p: number) => {
    if (p < 25) {
      return {
        direction: 'straight',
        instruction: 'In 350m, proceed straight onto Ridge Arterial',
        sub: 'Speed limit: 50 km/h • Good traction',
        distance: '350 m'
      };
    } else if (p < 60) {
      return {
        direction: 'left',
        instruction: 'In 400m, turn left onto Golf Course Ext Elevated Flyover',
        sub: 'Avoid low underpass lane • Elevated corridor clear',
        distance: '400 m'
      };
    } else if (p < 90) {
      return {
        direction: 'right',
        instruction: 'In 650m, take exit right towards Sushant University Campus Gate 1',
        sub: 'Campus link road • Speed limit: 30 km/h',
        distance: '650 m'
      };
    } else {
      return {
        direction: 'arrive',
        instruction: 'Destination on left: Sushant University',
        sub: 'You have arrived safely ahead of the rain!',
        distance: '50 m'
      };
    }
  };

  const currentManeuver = getManeuver(vehicleProgress);

  // Telemetry computations
  const totalKm = route?.distanceKm ?? 0;
  const remainingKm = Math.max(0, +(totalKm * (1 - vehicleProgress / 100)).toFixed(1));
  const remainingMins = Math.max(1, Math.round((route?.durationMinutes ?? 0) * (1 - vehicleProgress / 100)));

  const now = new Date();
  const eta = new Date(now.getTime() + remainingMins * 60000);
  const etaTime = `${eta.getHours() % 12 || 12}:${eta.getMinutes().toString().padStart(2, '0')} ${
    eta.getHours() >= 12 ? 'PM' : 'AM'
  }`;

  // Trigger sudden hazard alert simulation
  const handleSimulateSuddenWeather = () => {
    setSimulatedAlertActive(true);
  };

  const handleApplyReroute = () => {
    setSimulatedAlertActive(false);
    setHasRerouted(true);
    onReroute();
  };

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-3">
      {/* Top Turn-by-Turn Instruction Banner */}
      <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-slate-700/80 text-white max-w-lg w-full mx-auto animate-in slide-in-from-top duration-200">
        <div className="flex items-center space-x-3">
          {/* Maneuver Icon */}
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
            {currentManeuver.direction === 'left' ? (
              <CornerUpLeft className="w-6 h-6 stroke-[2.5]" />
            ) : currentManeuver.direction === 'right' ? (
              <CornerUpRight className="w-6 h-6 stroke-[2.5]" />
            ) : currentManeuver.direction === 'arrive' ? (
              <Navigation className="w-6 h-6 stroke-[2.5] fill-white" />
            ) : (
              <ArrowUp className="w-6 h-6 stroke-[2.5]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-0.5">
              <span className="text-lg font-black text-white">
                {currentManeuver.distance}
              </span>
              <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-xs">
                Next Turn
              </span>
            </div>
            <h3 className="text-xs font-black text-slate-100 truncate">
              {currentManeuver.instruction}
            </h3>
            <p className="text-[11px] text-slate-400 truncate">
              {currentManeuver.sub}
            </p>
          </div>

          {/* End Navigation X Button */}
          <button
            onClick={onEndNavigation}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            title="End Navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dynamic Weather Change Emergency Alert Modal */}
      {simulatedAlertActive && (
        <div className="pointer-events-auto bg-slate-900/98 text-white rounded-3xl p-5 shadow-2xl border-2 border-red-500 max-w-md w-full mx-auto my-auto animate-in zoom-in-95 duration-200">
          <div className="flex items-center space-x-2 mb-2 text-red-400">
            <AlertTriangle className="w-6 h-6 text-red-500 animate-bounce" />
            <span className="text-xs font-black uppercase tracking-wider">
              ROUTE WEATHER UPDATE
            </span>
          </div>

          <h4 className="text-sm font-black text-white mb-1.5">
            Heavy rainfall & flash waterlogging detected ahead
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Sector 56 Underpass is experiencing rapid water accumulation (18cm). Searching for a safer alternative route...
          </p>

          <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded-full">
                🟢 NEW SAFER ROUTE AVAILABLE
              </span>
              <span className="text-xs font-black text-emerald-300">
                Score: 91/100
              </span>
            </div>
            <p className="text-xs text-emerald-100 font-semibold mb-1">
              Elevated Ridge Arterial Bypass
            </p>
            <div className="text-[11px] text-emerald-200/80 flex items-center space-x-2">
              <span>⏱️ Adds: +4 minutes</span>
              <span>•</span>
              <span>🛡️ Bypasses underpass flood zone entirely</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleApplyReroute}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              SWITCH TO SAFER ROUTE
            </button>
            <button
              onClick={() => setSimulatedAlertActive(false)}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              STAY ON CURRENT
            </button>
          </div>
        </div>
      )}

      {/* Bottom Live Navigation Telemetry Card */}
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-slate-200 max-w-lg w-full mx-auto animate-in slide-in-from-bottom duration-200">
        {/* Top metrics: Distance, Time, ETA, Safety Score */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-black text-slate-900">
                {remainingMins}
              </span>
              <span className="text-xs font-bold text-slate-500">min</span>
              <span className="text-slate-300">•</span>
              <span className="text-sm font-extrabold text-slate-700">
                {remainingKm} km
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-bold">
              ETA: {etaTime}
            </span>
          </div>

          {/* Live Weather Safety Score Badge */}
          <div className="text-right">
            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black">
                {typeof route?.safetyScore === 'number' ? `${route.safetyScore}/100` : 'Unavailable'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Weather Safety Score
            </div>
          </div>
        </div>

        {/* Immediate Upcoming Weather Forecast along route */}
        <div className="space-y-1.5 mb-3 text-xs">
          <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>☁️</span>
              <span className="font-bold text-slate-800">
                NEXT 10 MINUTES:
              </span>
              <span className="text-slate-600">{route?.waypoints?.[0]?.weatherCondition || route?.summaryCondition || 'Unavailable'}</span>
            </div>
            <span className="text-[10px] font-black text-emerald-600 uppercase">
              Weather Risk: {route?.rainRisk || 'Unavailable'}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
            <div className="truncate">
              <span className="font-bold text-slate-800">UPCOMING ROUTE WEATHER:</span>{' '}
              {route?.waypoints?.length ? route.waypoints.map((point) => `${point.expectedTime}: ${point.weatherCondition}`).join(' | ') : 'Live route forecast unavailable'}
            </div>
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Pause / Resume simulation */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2.5 rounded-xl border flex items-center justify-center transition cursor-pointer ${
              isPlaying
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
            }`}
            title={isPlaying ? 'Pause Navigation Simulation' : 'Resume Navigation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Timeline */}
          <button
            onClick={onOpenTimeline}
            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center space-x-1 transition cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Timeline</span>
          </button>

          {/* End button */}
          <button
            onClick={onEndNavigation}
            className="py-2.5 px-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs border border-red-200 transition cursor-pointer"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};
