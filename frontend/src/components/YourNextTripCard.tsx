import React from 'react';
import { RouteTrip } from '../types';
import { Navigation } from './Icons';

interface YourNextTripCardProps {
  trip: RouteTrip;
  onOpenTripDetails: () => void;
  onNewTrip?: () => void;
  onViewAllTrips?: () => void;
  onOpenLiveMap?: () => void;
}

export const YourNextTripCard: React.FC<YourNextTripCardProps> = ({
  trip,
  onOpenTripDetails,
  onNewTrip,
  onViewAllTrips,
  onOpenLiveMap
}) => {
  const safetyScore = trip.safetyScore ?? 78;

  // Determine color accents for safety score
  const getScoreColor = (score: number) => {
    if (score >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 border-emerald-200' };
    if (score >= 60) return { bar: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 border-amber-200' };
    return { bar: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-50 border-red-200' };
  };

  const scoreTheme = getScoreColor(safetyScore);

  return (
    <div className="px-5 mt-4">
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-heading">
          YOUR NEXT TRIP
        </h3>
        <div className="flex items-center space-x-3">
          <button
            onClick={onNewTrip || onOpenTripDetails}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer flex items-center gap-0.5"
            title="Create a new trip"
          >
            <span>+</span>
            <span>New Trip</span>
          </button>
          <button
            onClick={onViewAllTrips || onOpenTripDetails}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="View all saved trips"
          >
            View All
          </button>
        </div>
      </div>

      {/* Main Trip Card */}
      <div
        id="card-next-trip"
        className="bg-white rounded-2xl p-4.5 shadow-sm border border-slate-200/90 space-y-3.5 transition hover:border-blue-200"
      >
        {/* Route Line: 🟢 Home  ───────────────→  📍 College */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
            <span className="text-base leading-none select-none" aria-hidden="true">🟢</span>
            <span className="truncate max-w-[110px]">{trip.from || 'Home'}</span>
          </div>

          {/* Dotted / Solid Connector Line with Arrow */}
          <div className="flex-1 mx-3 flex items-center justify-center">
            <div className="w-full border-t border-dashed border-slate-300 relative flex items-center justify-end">
              <span className="text-slate-400 font-bold text-xs translate-x-1.5 -translate-y-[1px] select-none">
                →
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-sm">
            <span className="text-base leading-none select-none" aria-hidden="true">📍</span>
            <span className="truncate max-w-[110px]">{trip.to || 'College'}</span>
          </div>
        </div>

        {/* Leave By Section */}
        <div className="flex items-center justify-between py-1.5 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">Leave By</span>
          <span className="font-extrabold text-slate-900 text-sm tracking-tight">
            {trip.leaveBy || '08:00 AM'}
          </span>
        </div>

        {/* Weather on Route Section */}
        <div className="pt-1 space-y-1">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
            <span className="text-base leading-none select-none" aria-hidden="true">🌧️</span>
            <span>Weather on Route</span>
          </div>
          <p className="text-xs text-slate-600 font-medium pl-6 leading-relaxed">
            {trip.weatherOnRoute || trip.status || 'Heavy rain possible after 9 AM'}
          </p>
        </div>

        {/* Weather Safety Score Section */}
        <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/70 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            Weather Safety Score:
          </span>
          <div className="flex items-center space-x-2">
            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${scoreTheme.bar}`}
                style={{ width: `${Math.min(100, Math.max(0, safetyScore))}%` }}
              />
            </div>
            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md border ${scoreTheme.text} ${scoreTheme.badge}`}>
              {safetyScore}/100
            </span>
          </div>
        </div>

        {/* Primary CTA: Open Live Weather Map */}
        {onOpenLiveMap && (
          <button
            id="btn-trip-live-map"
            onClick={onOpenLiveMap}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 active:scale-[0.98] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Navigation className="w-4 h-4 fill-white" />
            <span>Open in WeatherGPT Live Map</span>
            <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase ml-1">
              LIVE
            </span>
          </button>
        )}

        {/* Secondary Action Buttons: [ View Details ]  [ + New Trip ] */}
        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          <button
            id="btn-view-trip-details"
            onClick={onOpenTripDetails}
            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 font-bold text-xs rounded-xl border border-slate-200/80 transition flex items-center justify-center cursor-pointer shadow-2xs"
          >
            View Details
          </button>

          <button
            id="btn-new-trip-action"
            onClick={onNewTrip || onOpenTripDetails}
            className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
          >
            <span>+</span>
            <span>New Trip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
