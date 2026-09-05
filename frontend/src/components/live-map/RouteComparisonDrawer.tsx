import React from 'react';
import { LiveMapRoute, DepartureTimeOption } from '../../types';
import { ShieldAlert, Navigation, Clock, Sparkles, ChevronRight, Info, AlertTriangle, CloudRain } from '../Icons';

interface RouteComparisonDrawerProps {
  routes: LiveMapRoute[];
  activeRouteId: string;
  onSelectRoute: (id: string) => void;
  departureOptions: DepartureTimeOption[];
  onStartNavigation: () => void;
  onActivateSmartWait: (minutes: number) => void;
  onOpenWhyRoute: () => void;
  onOpenTimeline: () => void;
  onOpenNearby: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  liveMode?: boolean;
  routeChatInput?: string;
  routeChatReply?: string;
  routeChatLoading?: boolean;
  onRouteChatInputChange?: (value: string) => void;
  onRouteChatSubmit?: () => void;
}

export const RouteComparisonDrawer: React.FC<RouteComparisonDrawerProps> = ({
  routes,
  activeRouteId,
  onSelectRoute,
  departureOptions,
  onStartNavigation,
  onActivateSmartWait,
  onOpenWhyRoute,
  onOpenTimeline,
  onOpenNearby,
  isExpanded,
  onToggleExpand,
  liveMode = false,
  routeChatInput = '',
  routeChatReply,
  routeChatLoading = false,
  onRouteChatInputChange,
  onRouteChatSubmit
}) => {
  const activeRoute = routes.find((r) => r.id === activeRouteId) || routes[0];
  const waitOption = departureOptions.find((d) => d.id === 'opt-wait20') || departureOptions[1];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 pointer-events-auto transition-all duration-300 max-h-[80vh] flex flex-col">
      {/* Pull Handle / Header */}
      <div
        onClick={onToggleExpand}
        className="w-full pt-2 pb-1.5 flex flex-col items-center cursor-pointer select-none hover:bg-slate-50 rounded-t-3xl transition"
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mb-1" />
        <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-500">
          <span>WeatherGPT Route Comparison</span>
          <span className="text-blue-600 font-extrabold">
            {isExpanded ? '▼ Collapse' : '▲ View Details & Best Time'}
          </span>
        </div>
      </div>

      <div className="overflow-y-auto px-4 pb-6 space-y-3">
        {/* Active Route Quick Summary Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 border border-blue-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  activeRoute.color === 'green'
                    ? 'bg-emerald-100 text-emerald-800'
                    : activeRoute.color === 'orange'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {activeRoute.badge}
              </span>
              <span className="text-xs font-extrabold text-slate-900 truncate">
                {activeRoute.name}
              </span>
            </div>

            {/* Weather Safety Score Badge */}
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-white shadow-xs border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500">Safety Score:</span>
              <span
                className={`text-xs font-black ${
                  activeRoute.safetyScore >= 80
                    ? 'text-emerald-600'
                    : activeRoute.safetyScore >= 60
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {liveMode && !activeRoute.riskAvailable ? 'Risk unavailable' : `${activeRoute.safetyScore}/100`}
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-between mb-2.5">
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-slate-900">
                {activeRoute.durationMinutes} min
              </span>
              <span className="text-xs font-bold text-slate-500">
                ({activeRoute.distanceKm} km)
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <span>☁️ {activeRoute.summaryCondition}</span>
            </div>
          </div>

          {/* Rain and Waterlogging Status Pills */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
            <div className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Rain Risk:</span>
              <span
                className={`font-bold ${
                  activeRoute.rainRisk === 'Low'
                    ? 'text-emerald-600'
                    : activeRoute.rainRisk === 'Moderate'
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {activeRoute.rainRisk}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Waterlogging:</span>
              <span
                className={`font-bold ${
                  activeRoute.waterloggingRisk === 'Low'
                    ? 'text-emerald-600'
                    : activeRoute.waterloggingRisk === 'Moderate'
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {activeRoute.waterloggingRisk}
              </span>
            </div>
          </div>

          {/* Primary Navigation & Explain Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onStartNavigation}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 transition cursor-pointer active:scale-98"
            >
              <Navigation className="w-4 h-4 fill-white" />
              <span>START NAVIGATION</span>
            </button>

            <button
              onClick={onOpenWhyRoute}
              className="px-3 py-3 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 transition cursor-pointer flex items-center space-x-1"
              title="Explainable AI Route Justification"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Why This Route?</span>
              <span className="sm:hidden">Why?</span>
            </button>

            <button
              onClick={onOpenTimeline}
              className="px-3 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center space-x-1"
              title="View Stop-by-Stop Weather Timeline"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Timeline</span>
            </button>
          </div>
        </div>

        {/* 3-Route Alternative Selector Buttons */}
        <div>
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
            Available Route Options ({routes.length})
          </span>
          <div className="space-y-1.5">
            {routes.map((route) => {
              const isSelected = route.id === activeRouteId;
              return (
                <div
                  key={route.id}
                  onClick={() => onSelectRoute(route.id)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        route.color === 'green'
                          ? 'bg-emerald-500'
                          : route.color === 'orange'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {route.name}
                        </h4>
                        {route.type === 'recommended' && (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-sm">
                            SAFEST
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {route.distanceKm} km • {route.durationMinutes} min • {route.summaryCondition}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-semibold">Safety</div>
                      <div
                        className={`text-xs font-black ${
                          route.safetyScore >= 80
                            ? 'text-emerald-600'
                            : route.safetyScore >= 60
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {liveMode && !route.riskAvailable ? 'Unavailable' : `${route.safetyScore}/100`}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Best Departure Time AI Card (Mandatory Feature) */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5">
              <span className="text-amber-600 font-extrabold text-sm">🕒</span>
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Best Departure Time AI
              </h4>
            </div>
            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              Doppler Predictive Sync
            </span>
          </div>

          <p className="text-xs text-amber-900 leading-relaxed mb-3">
            {liveMode ? 'Departure recommendations use the available backend forecast for this route.' : <>Heavy rainfall is expected on low-lying segments for the next 20 minutes. <span className="font-extrabold text-amber-950">Recommendation: WAIT FOR 20 MINUTES.</span> Rain intensity is predicted to decrease significantly after 5:40 PM.</>}
          </p>

          {/* Departure Options Grid */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {departureOptions.length ? departureOptions.map((opt) => (
              <div
                key={opt.id}
                className={`p-2 rounded-xl text-center border transition ${
                  opt.isRecommended
                    ? 'bg-white border-emerald-400 shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-white/70 border-amber-200'
                }`}
              >
                {opt.tag && (
                  <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded-xs block mb-1 truncate">
                    {opt.tag}
                  </span>
                )}
                <div className="text-[10px] font-bold text-slate-600">{opt.title}</div>
                <div className="text-xs font-black text-slate-900">{opt.time}</div>
                <div
                  className={`text-[10px] font-black mt-0.5 ${
                    opt.safetyScore >= 80 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  Score: {opt.safetyScore}
                </div>
              </div>
            )) : <div className="col-span-3 rounded-xl border border-amber-200 bg-white/70 p-3 text-center text-xs font-bold text-amber-900">Best departure time is unavailable for this route right now.</div>}
          </div>

          {/* Departure Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onActivateSmartWait(20)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <span>🕒</span>
              <span>WAIT 20 MINUTES (SMART WAIT)</span>
            </button>

            <button
              onClick={onStartNavigation}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 transition cursor-pointer"
            >
              Leave Now
            </button>

            <button
              onClick={onOpenNearby}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 transition cursor-pointer flex items-center space-x-1"
            >
              <span>☕ Places to Wait</span>
            </button>
          </div>
        </div>

        {onRouteChatSubmit && (
          <form onSubmit={(event) => { event.preventDefault(); onRouteChatSubmit(); }} className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-black text-slate-700 mb-2">Ask about this route...</div>
            {routeChatReply && <div className="mb-2 rounded-xl bg-white border border-blue-100 p-2 text-xs text-slate-700 whitespace-pre-wrap">{routeChatReply}</div>}
            <div className="flex gap-2">
              <input value={routeChatInput} onChange={(event) => onRouteChatInputChange?.(event.target.value)} placeholder="Why? What should I carry?" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500" />
              <button type="submit" disabled={!routeChatInput.trim() || routeChatLoading} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">{routeChatLoading ? '...' : 'Send'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
