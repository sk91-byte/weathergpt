import React, { useState } from 'react';
import { LiveMapRoute } from '../../types';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  Droplets,
  Wind,
  Eye,
  Zap,
  CloudRain,
  Navigation,
  Check,
  Table,
  LayoutGrid
} from 'lucide-react';

interface SideBySideRouteComparisonProps {
  routes: LiveMapRoute[];
  activeRouteId: string;
  onSelectRoute: (id: string) => void;
  onStartNavigation: () => void;
}

export const SideBySideRouteComparison: React.FC<SideBySideRouteComparisonProps> = ({
  routes,
  activeRouteId,
  onSelectRoute,
  onStartNavigation
}) => {
  const [viewFormat, setViewFormat] = useState<'cards' | 'table'>('cards');
  const safeRoutes = Array.isArray(routes) ? routes : [];

  if (safeRoutes.length === 0) return null;

  const minDuration = Math.min(...safeRoutes.map((r) => r.durationMinutes));
  const maxSafety = Math.max(...safeRoutes.map((r) => r.safetyScore));

  const safestRoute = safeRoutes.reduce((prev, curr) => (curr.safetyScore > prev.safetyScore ? curr : prev), safeRoutes[0]);
  const fastestRoute = safeRoutes.reduce((prev, curr) => (curr.durationMinutes < prev.durationMinutes ? curr : prev), safeRoutes[0]);

  return (
    <div className="space-y-3.5">
      {/* Header & View Mode Switcher */}
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-black text-white tracking-wide uppercase">
              Side-by-Side Weather & Safety Comparison
            </h3>
          </div>
          <p className="text-[10px] text-slate-400">
            Compare weather hazards, pavement conditions, and weather risk scores across all alternatives.
          </p>
        </div>

        <div className="flex items-center space-x-1 bg-slate-800 p-0.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setViewFormat('cards')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer ${
              viewFormat === 'cards'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Card Columns View"
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden sm:inline">Cards</span>
          </button>
          <button
            onClick={() => setViewFormat('table')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer ${
              viewFormat === 'table'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Comparison Table View"
          >
            <Table className="w-3 h-3" />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
      </div>

      {/* View Format 1: Multi-Column Cards Grid (Smooth horizontal scroll on mobile) */}
      {viewFormat === 'cards' ? (
        <div className="flex space-x-3 overflow-x-auto pb-2 pt-0.5 no-scrollbar snap-x">
          {safeRoutes.map((route) => {
            const isSelected = route.id === activeRouteId;
            const timeDiff = route.durationMinutes - minDuration;
            const isFastest = route.durationMinutes === minDuration;
            const isSafest = route.safetyScore === maxSafety;

            const safetyBg =
              route.safetyScore >= 80
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : route.safetyScore >= 60
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30';

            const safetyBarColor =
              route.safetyScore >= 80
                ? 'bg-emerald-500'
                : route.safetyScore >= 60
                ? 'bg-amber-500'
                : 'bg-red-500';

            return (
              <div
                key={route.id}
                className={`snap-start shrink-0 w-[270px] sm:w-[290px] rounded-2xl border p-3.5 flex flex-col justify-between transition-all duration-200 relative ${
                  isSelected
                    ? 'bg-slate-850/98 border-blue-500 ring-2 ring-blue-500/40 shadow-xl'
                    : 'bg-slate-850/70 hover:bg-slate-850 border-slate-750 hover:border-slate-650'
                }`}
              >
                {/* Selected Status Marker */}
                {isSelected && (
                  <div className="absolute -top-2.5 right-3 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>ACTIVE ROUTE</span>
                  </div>
                )}

                <div>
                  {/* Card Header: Badge & Route Name */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                          route.color === 'green'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : route.color === 'orange'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-red-500/20 text-red-300 border-red-500/30'
                        }`}
                      >
                        {route.badge || route.name.split(' ')[0]}
                      </span>

                      {isSafest && (
                        <span className="text-[9px] font-black text-emerald-400 flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Safest Option</span>
                        </span>
                      )}
                      {isFastest && !isSafest && (
                        <span className="text-[9px] font-black text-amber-400 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Fastest Time</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-black text-white leading-snug line-clamp-1">
                      {route.name}
                    </h4>
                  </div>

                  {/* Safety Score Highlight Box */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-750 mb-2.5">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-400">Weather Risk Score</span>
                      <span className={`text-sm font-black px-1.5 py-0.2 rounded-md border ${safetyBg}`}>
                        {route.safetyScore}/100
                      </span>
                    </div>

                    {/* Visual Safety Bar Gauge */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${safetyBarColor}`}
                        style={{ width: `${Math.min(100, Math.max(10, route.safetyScore))}%` }}
                      />
                    </div>

                    <div className="text-[9px] font-semibold text-slate-300 flex items-center justify-between">
                      <span className="truncate">
                        {route.safetyScore >= 80
                          ? '🛡️ High Safety • Low Hazard'
                          : route.safetyScore >= 60
                          ? '⚠️ Caution • Moderate Risk'
                          : '⛔ High Risk • Avoid Area'}
                      </span>
                      {fastestRoute && route.id !== fastestRoute.id && (
                        <span
                          className={`font-bold shrink-0 ml-1 ${
                            route.safetyScore > fastestRoute.safetyScore ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {route.safetyScore > fastestRoute.safetyScore
                            ? `+${route.safetyScore - fastestRoute.safetyScore} pts`
                            : `${route.safetyScore - fastestRoute.safetyScore} pts`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Duration & Distance Row */}
                  <div className="flex items-baseline justify-between px-1 mb-2.5 pb-2 border-b border-slate-750/70">
                    <div>
                      <span className="text-lg font-black text-white">{route.durationMinutes} min</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({route.distanceKm} km)</span>
                    </div>
                    <div className="text-right">
                      {isFastest ? (
                        <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                          ⚡ Quickest Route
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">
                          +{timeDiff}m vs fastest
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Weather Hazard Metrics Grid (Side-by-Side Values) */}
                  <div className="space-y-1.5 mb-3 text-[10px]">
                    <div className="flex items-center justify-between py-0.5 px-1 rounded-lg hover:bg-slate-800/60">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <CloudRain className="w-3 h-3 text-sky-400" />
                        <span>Rain Risk</span>
                      </span>
                      <span
                        className={`font-black ${
                          route.rainRisk === 'Low'
                            ? 'text-emerald-400'
                            : route.rainRisk === 'Moderate'
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {route.rainRisk || 'Low'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-0.5 px-1 rounded-lg hover:bg-slate-800/60">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Droplets className="w-3 h-3 text-blue-400" />
                        <span>Waterlogging</span>
                      </span>
                      <span
                        className={`font-black ${
                          route.waterloggingRisk === 'Low'
                            ? 'text-emerald-400'
                            : route.waterloggingRisk === 'Moderate'
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {route.waterloggingRisk || 'Low'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-0.5 px-1 rounded-lg hover:bg-slate-800/60">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Wind className="w-3 h-3 text-cyan-400" />
                        <span>Wind Shear</span>
                      </span>
                      <span
                        className={`font-black ${
                          route.routeOptionType === 'scenic'
                            ? 'text-emerald-400'
                            : route.routeOptionType === 'fastest'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {route.routeOptionType === 'scenic'
                          ? 'Canopy Buffered'
                          : route.routeOptionType === 'fastest'
                          ? '28 km/h Gusts'
                          : 'Sheltered'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-0.5 px-1 rounded-lg hover:bg-slate-800/60">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Eye className="w-3 h-3 text-indigo-400" />
                        <span>Road Spray / Fog</span>
                      </span>
                      <span
                        className={`font-black ${
                          route.routeOptionType === 'fastest' ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {route.routeOptionType === 'fastest' ? 'Heavy Spray' : 'Clear (>4km)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-0.5 px-1 rounded-lg hover:bg-slate-800/60">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span>Thunderstorm</span>
                      </span>
                      <span
                        className={`font-black ${
                          route.thunderstormRisk === 'Low' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {route.thunderstormRisk || 'Low'}
                      </span>
                    </div>
                  </div>

                  {/* Road Pavement Weather Impact Callout */}
                  <div className="p-2 rounded-xl bg-slate-900/70 border border-slate-750/70 mb-3 text-[9.5px]">
                    <div className="text-sky-300 font-bold mb-0.5 flex items-center space-x-1">
                      <span>Pavement Impact:</span>
                    </div>
                    <div className="text-slate-300 leading-snug">
                      {route.weatherImpactLabel || route.weatherImpactBadge || route.summaryCondition}
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Action Button */}
                <div>
                  {isSelected ? (
                    <button
                      onClick={onStartNavigation}
                      className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-600/30 flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Start Navigation</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectRoute(route.id)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Select This Route</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* View Format 2: Structured Tabular Comparison */
        <div className="rounded-2xl border border-slate-750 bg-slate-850/80 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-750 bg-slate-900/90 text-[10px] text-slate-400">
                  <th className="p-2.5 font-bold uppercase tracking-wider w-[120px]">Metric / Factor</th>
                  {safeRoutes.map((r) => (
                    <th key={r.id} className="p-2.5 font-extrabold text-white min-w-[150px]">
                      <div className="flex items-center space-x-1">
                        <span>{r.badge ? r.badge.split(' ')[0] : '🚗'}</span>
                        <span className="truncate">{r.name.split(' ')[0]}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[11px]">
                {/* Weather Risk Score Row */}
                <tr className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-slate-300">Weather Risk Score</td>
                  {safeRoutes.map((r) => (
                    <td key={r.id} className="p-2.5 font-black">
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                          r.safetyScore >= 80
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : r.safetyScore >= 60
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {r.safetyScore}/100
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Duration & Distance Row */}
                <tr className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-slate-300">Trip Duration</td>
                  {safeRoutes.map((r) => (
                    <td key={r.id} className="p-2.5 font-extrabold text-white">
                      {r.durationMinutes} min{' '}
                      <span className="text-[10px] text-slate-400 font-normal">({r.distanceKm} km)</span>
                    </td>
                  ))}
                </tr>

                {/* Rain Hazard */}
                <tr className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-slate-300">Rain Hazard</td>
                  {safeRoutes.map((r) => (
                    <td
                      key={r.id}
                      className={`p-2.5 font-bold ${
                        r.rainRisk === 'Low' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {r.rainRisk || 'Low'}
                    </td>
                  ))}
                </tr>

                {/* Waterlogging / Flood */}
                <tr className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-slate-300">Flood / Ponding</td>
                  {safeRoutes.map((r) => (
                    <td
                      key={r.id}
                      className={`p-2.5 font-bold ${
                        r.waterloggingRisk === 'Low' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {r.waterloggingRisk || 'Low'}
                    </td>
                  ))}
                </tr>

                {/* Wind / Crosswinds */}
                <tr className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-slate-300">Wind / Gusts</td>
                  {safeRoutes.map((r) => (
                    <td key={r.id} className="p-2.5 text-slate-300">
                      {r.routeOptionType === 'scenic'
                        ? '🌿 40% Buffered'
                        : r.routeOptionType === 'fastest'
                        ? '💨 28 km/h Gusts'
                        : '🛡️ Sheltered'}
                    </td>
                  ))}
                </tr>

                {/* Weather Impact Description */}
                <tr className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-slate-300">Pavement Impact</td>
                  {safeRoutes.map((r) => (
                    <td key={r.id} className="p-2.5 text-[10px] text-slate-300 leading-snug">
                      {r.weatherImpactLabel || r.summaryCondition}
                    </td>
                  ))}
                </tr>

                {/* Action Row */}
                <tr className="bg-slate-900/60">
                  <td className="p-2.5 font-bold text-slate-400">Action</td>
                  {safeRoutes.map((r) => {
                    const isSelected = r.id === activeRouteId;
                    return (
                      <td key={r.id} className="p-2.5">
                        {isSelected ? (
                          <button
                            onClick={onStartNavigation}
                            className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] rounded-lg transition cursor-pointer"
                          >
                            Navigate
                          </button>
                        ) : (
                          <button
                            onClick={() => onSelectRoute(r.id)}
                            className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[10px] rounded-lg transition cursor-pointer"
                          >
                            Select
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WeatherGPT Decision Assistant Trade-off Advice */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950/40 border border-blue-500/30 shadow-md">
        <div className="flex items-center space-x-2 mb-1.5">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <h4 className="text-xs font-black text-white">WeatherGPT Safety Recommendation</h4>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          {safestRoute && fastestRoute && safestRoute.id !== fastestRoute.id ? (
            <>
              Taking the <strong className="text-emerald-400 font-black">{safestRoute.name.split('(')[0]}</strong> adds{' '}
              <strong className="text-white font-black">
                {Math.max(1, safestRoute.durationMinutes - fastestRoute.durationMinutes)} minutes
              </strong>{' '}
              compared to the fastest route, but reduces your Weather Risk Score from{' '}
              <strong className="text-amber-400 font-black">{fastestRoute.safetyScore}/100</strong> to{' '}
              <strong className="text-emerald-400 font-black">{safestRoute.safetyScore}/100</strong>. It avoids{' '}
              <strong>standing water and low-lying underpasses</strong> that risk hydroplaning.
            </>
          ) : (
            <>
              Current route provides the safest weather profile with elevated pavement drainage and minimal wind exposure.
            </>
          )}
        </p>

        {/* Quick Route Highlights Footer */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] flex-wrap gap-1.5">
          <div className="flex items-center space-x-1 text-slate-400">
            <span className="font-bold text-slate-200">Recommended:</span>
            <span className="text-emerald-400 font-extrabold">{safestRoute?.name.split('(')[0] || 'Safest'}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Score Delta:</span>
            <span className="font-extrabold text-sky-400">
              +{Math.max(0, (safestRoute?.safetyScore || 90) - (fastestRoute?.safetyScore || 70))} points safer
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
