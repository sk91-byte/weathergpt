import React from 'react';
import { LiveMapRoute } from '../../types';
import { X, Clock, AlertTriangle, CheckCircle2, CloudRain, Droplets, Wind, ShieldAlert } from '../Icons';

interface RouteWeatherTimelineModalProps {
  route: LiveMapRoute;
  isOpen: boolean;
  onClose: () => void;
}

export const RouteWeatherTimelineModal: React.FC<RouteWeatherTimelineModalProps> = ({
  route,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end p-3 pointer-events-auto">
      <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 max-w-md w-full mx-auto max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900">
                ROUTE WEATHER TIMELINE
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              {route.name} • {route.distanceKm} km ({route.durationMinutes} min)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Waypoint Explainer */}
        <div className="my-3 p-2.5 rounded-2xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-900 flex items-start space-x-2">
          <span className="text-base">🧠</span>
          <p className="leading-relaxed">
            WeatherGPT samples meteorological forecasts at your specific expected arrival time at each waypoint along your journey.
          </p>
        </div>

        {/* Timeline Stop-by-Stop List */}
        <div className="overflow-y-auto space-y-4 px-1 py-2 flex-1">
          {route.waypoints.map((wp, idx) => {
            const isStart = idx === 0;
            const isEnd = idx === route.waypoints.length - 1;
            return (
              <div key={wp.id} className="relative flex items-start space-x-3 group">
                {/* Connecting vertical line */}
                {!isEnd && (
                  <div className="absolute left-3.5 top-7 bottom-0 w-0.5 bg-slate-200 -z-10 group-hover:bg-blue-300 transition" />
                )}

                {/* Pin Node */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black shadow-xs ${
                    isStart
                      ? 'bg-emerald-500 text-white'
                      : isEnd
                      ? 'bg-red-500 text-white'
                      : wp.hazard
                      ? 'bg-amber-500 text-white'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {isStart ? 'S' : isEnd ? 'D' : idx}
                </div>

                {/* Stop Card */}
                <div className="flex-1 p-3 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/80 transition">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-black text-slate-900 truncate">
                      {wp.name}
                    </h4>
                    <span className="text-xs font-black text-blue-600 font-mono">
                      {wp.expectedTime}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1.5">
                    <span className="flex items-center space-x-1">
                      <span>☁️ {wp.weatherCondition}</span>
                      <span>({wp.temp}°C)</span>
                    </span>
                    <span className="font-bold text-slate-500">
                      🌧️ Rain Risk: {wp.rainProb}%
                    </span>
                  </div>

                  {/* Waterlogging / Local Hazard Warning */}
                  {wp.hazard ? (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{wp.hazard}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Roadway conditions safe & unobstructed</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-3 w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition cursor-pointer"
        >
          Close Timeline
        </button>
      </div>
    </div>
  );
};
