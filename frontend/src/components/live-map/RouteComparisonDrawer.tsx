import React, { useState } from 'react';
import { LiveMapRoute, DepartureTimeOption } from '../../types';
import { SideBySideRouteComparison } from './SideBySideRouteComparison';
import { AppLanguage, generateRouteWeatherSummary, getActionableSuggestions } from '../../utils/routeWeatherSummary';
import { Scale } from 'lucide-react';
import {
  ShieldAlert,
  Navigation,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
  AlertTriangle,
  CloudRain,
  MessageSquare,
  Coffee,
  Wind,
  Eye,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Languages
} from '../Icons';

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
  onOpenChat?: () => void;
  isLive?: boolean;
  dataSource?: string;
  windRisk?: string;
  fogRisk?: string;
  thunderstormRisk?: string;
  recommendedWaitPlaceName?: string;
  routeSteps?: { instruction: string; name: string; distance_m: number; duration_s?: number }[];
  originName?: string;
  destinationName?: string;
  language?: AppLanguage;
  onChangeLanguage?: (lang: AppLanguage) => void;
  userRole?: string;
  currentWeather?: any;
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
  onOpenChat,
  isLive = true,
  dataSource = 'Open-Meteo & OSRM',
  windRisk = 'Low',
  fogRisk = 'Low',
  thunderstormRisk = 'Low',
  recommendedWaitPlaceName,
  routeSteps = [],
  originName = 'Origin',
  destinationName = 'Destination',
  language = 'en',
  onChangeLanguage,
  userRole = 'citizen',
  currentWeather
}) => {
  const [showSteps, setShowSteps] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'comparison'>('overview');
  const safeRoutes = Array.isArray(routes) ? routes : [];
  const activeRoute = safeRoutes.find((r) => r.id === activeRouteId) || safeRoutes[0];
  const safeOptions = Array.isArray(departureOptions) ? departureOptions : [];
  const waitOption = safeOptions.find((d) => d.isRecommended) || safeOptions[1] || safeOptions[0];

  if (!activeRoute) return null;

  const isLowSafety = activeRoute?.safetyScore !== undefined && activeRoute.safetyScore !== null && activeRoute.safetyScore < 80;

  // Generate dynamic multilingual AI summary
  const summaryText = generateRouteWeatherSummary(
    {
      originName,
      destinationName,
      distanceKm: activeRoute.distanceKm,
      durationMinutes: activeRoute.durationMinutes,
      safetyScore: activeRoute.safetyScore,
      rainRisk: activeRoute.rainRisk,
      waterloggingRisk: activeRoute.waterloggingRisk,
      fogRisk,
      windRisk,
      thunderstormRisk,
      summaryCondition: activeRoute.summaryCondition,
      userRole
    },
    language
  );

  // Generate actionable suggestions
  const actionableSuggestions = getActionableSuggestions(
    {
      originName,
      destinationName,
      distanceKm: activeRoute.distanceKm,
      durationMinutes: activeRoute.durationMinutes,
      safetyScore: activeRoute.safetyScore,
      rainRisk: activeRoute.rainRisk,
      waterloggingRisk: activeRoute.waterloggingRisk,
      fogRisk,
      windRisk,
      thunderstormRisk,
      summaryCondition: activeRoute.summaryCondition,
      userRole
    },
    language
  );

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-slate-900/98 backdrop-blur-md text-white rounded-t-3xl shadow-2xl border-t border-slate-700/80 pointer-events-auto transition-all duration-300 max-h-[82vh] flex flex-col">
      {/* Pull Handle & Quick Status Bar */}
      <div
        onClick={onToggleExpand}
        className="w-full pt-2.5 pb-1 flex flex-col items-center cursor-pointer select-none hover:bg-slate-800/50 rounded-t-3xl transition"
      >
        <div className="w-12 h-1 bg-slate-600 rounded-full mb-1.5" />
        <div className="flex items-center space-x-2 text-[11px] font-bold">
          <span className="text-slate-300">WeatherGPT Route Intelligence</span>
          <span className="text-sky-400 font-extrabold">
            {isExpanded ? '▼ Collapse' : '▲ Best Time & Weather Details'}
          </span>
          <span
            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-xs uppercase tracking-wider ${
              isLive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isLive ? 'LIVE DATA' : 'DATA UNAVAILABLE'}
          </span>
        </div>
      </div>

      {/* Language Switcher & View Mode Toolbar */}
      <div className="px-4 py-1.5 shrink-0 flex items-center justify-between gap-2">
        {/* Language Selection Pills */}
        <div className="flex items-center space-x-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
          <Languages className="w-3.5 h-3.5 text-sky-400 ml-1" />
          <button
            onClick={() => onChangeLanguage && onChangeLanguage('en')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
              language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => onChangeLanguage && onChangeLanguage('hi')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
              language === 'hi' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            हिंदी
          </button>
          <button
            onClick={() => onChangeLanguage && onChangeLanguage('hinglish')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
              language === 'hinglish' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hinglish
          </button>
        </div>

        {/* View Mode Switcher */}
        {safeRoutes.length > 1 && (
          <div className="flex items-center p-0.5 bg-slate-800/90 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode('overview')}
              className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center space-x-1 ${
                viewMode === 'overview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Overview</span>
            </button>

            <button
              onClick={() => setViewMode('comparison')}
              className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center space-x-1 ${
                viewMode === 'comparison'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Scale className="w-3 h-3 text-sky-400" />
              <span>Compare ({safeRoutes.length})</span>
            </button>
          </div>
        )}
      </div>

      <div className="overflow-y-auto px-4 pb-6 space-y-3">
        {/* VIEW 1: SIDE-BY-SIDE WEATHER COMPARISON VIEW */}
        {viewMode === 'comparison' ? (
          <div className="space-y-3 pt-1">
            <SideBySideRouteComparison
              routes={safeRoutes}
              activeRouteId={activeRouteId}
              onSelectRoute={onSelectRoute}
              onStartNavigation={onStartNavigation}
            />
          </div>
        ) : (
          /* VIEW 2: STANDARD DETAILED OVERVIEW */
          <>
            {/* Friendly WeatherGPT Route & Weather Summary Card Below Map */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-850 via-slate-900 to-blue-950/40 border border-blue-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-[10px]">
                    W
                  </div>
                  <span className="text-xs font-black text-sky-300 tracking-wide">
                    {language === 'hi' ? 'मार्ग एवं मौसम सारांश' : 'Route & Weather Summary'}
                  </span>
                </div>
                <span className="text-[11px] font-extrabold text-white">
                  {(originName || 'Origin').split(',')[0]} → {(destinationName || 'Destination').split(',')[0]}
                </span>
              </div>

              {/* Summary Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-750">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-semibold">Travel Time & Distance</span>
                  <span className="text-xs font-black text-white">{activeRoute.durationMinutes} min ({activeRoute.distanceKm} km)</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-semibold">Current Temperature</span>
                  <span className="text-xs font-black text-amber-300">{currentWeather?.temperature != null ? `${currentWeather.temperature}°C` : 'Unavailable'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-semibold">Weather & Rain Probability</span>
                  <span className="text-xs font-black text-sky-300">
                    {activeRoute.summaryCondition || currentWeather?.condition || 'Unavailable'} • {typeof activeRoute.waypoints?.[0]?.rainProb === 'number' ? `${activeRoute.waypoints[0].rainProb}%` : 'Unavailable'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-semibold">Wind & Route Safety</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-bold text-slate-200">{currentWeather?.windSpeed != null ? `${currentWeather.windSpeed} km/h ${currentWeather.windDirection || ''}` : 'Unavailable'}</span>
                    <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 px-1 py-0.2 rounded-md border border-emerald-800/50">
                      🛡️ {activeRoute.safetyScore}/100
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed mb-2.5">
                {summaryText}
              </p>

              {/* Practical Weather Advice */}
              <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-800/60 text-xs text-sky-200 flex items-start space-x-2 mb-2.5">
                <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-bold block mb-0.5">Practical Weather Advice:</strong>
                  <span>{activeRoute.departureAdvice || 'No live route advice is available yet.'}</span>
                </div>
              </div>

              {/* Actionable Suggestions Checklist */}
              {actionableSuggestions.length > 0 && (
                <div>
                  <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    {language === 'hi' ? 'उपयोगी सुझाव व सावधानियां' : language === 'hinglish' ? 'Actionable Tips' : 'Actionable Suggestions'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {actionableSuggestions.map((sug) => (
                      <div
                        key={sug.id}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[10.5px] font-bold border transition ${
                          sug.priority === 'high'
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        <span>{sug.icon}</span>
                        <span>{sug.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Safety Alert Warning Banner if score < 80 */}
            {isLowSafety && (
              <div className="p-3 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs shadow-lg animate-pulse flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-black text-red-100 flex items-center justify-between">
                    <span>⚠️ Safety Score: {activeRoute.safetyScore}/100</span>
                  </div>
                  <p className="text-[11px] text-red-200/90 mt-0.5">
                    Weather risks detected along this corridor. Consider departing around{' '}
                    <strong className="text-white font-black underline">{waitOption?.time || 'in 20 mins'}</strong> or taking the Safest route.
                  </p>
                  {recommendedWaitPlaceName && (
                    <div className="mt-2 flex items-center justify-between bg-red-900/40 p-2 rounded-xl border border-red-500/30">
                      <span className="text-[10px] text-red-200">
                        Shelter nearby: <strong>{recommendedWaitPlaceName}</strong>
                      </span>
                      <button
                        onClick={onOpenNearby}
                        className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                      >
                        View Shelter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Route Option Switcher Grid */}
            {safeRoutes.length > 1 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                  <span>{language === 'hi' ? 'मार्ग विकल्प' : language === 'hinglish' ? 'Route Options' : 'SELECT ROUTE OPTION'}</span>
                  <button
                    onClick={() => setViewMode('comparison')}
                    className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center space-x-1 cursor-pointer transition"
                  >
                    <Scale className="w-3 h-3" />
                    <span>Compare All</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {safeRoutes.map((route) => {
                    const isSelected = route.id === activeRouteId;
                    const isSafest = route.id === 'route-safest' || route.routeOptionType === 'safest';
                    const isFastest = route.id === 'route-fastest' || route.routeOptionType === 'fastest';
                    const isScenic = route.id === 'route-scenic' || route.routeOptionType === 'scenic';

                    return (
                      <button
                        key={route.id}
                        onClick={() => onSelectRoute(route.id)}
                        className={`p-2.5 rounded-2xl text-left transition cursor-pointer border relative overflow-hidden ${
                          isSelected
                            ? 'bg-slate-800/95 text-white border-blue-500 shadow-md ring-1 ring-blue-500/50'
                            : 'bg-slate-850/80 hover:bg-slate-800 text-slate-300 border-slate-750 hover:border-slate-600'
                        }`}
                      >
                        {/* Top status & badge */}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs">
                              {isSafest ? '🟢' : isFastest ? '⚡' : isScenic ? '🌿' : '🚗'}
                            </span>
                            <span className="text-xs font-black">
                              {isSafest ? 'Safest' : isFastest ? 'Fastest' : isScenic ? 'Scenic' : (route?.name || '').split(' ')[0]}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded-xs ${
                              route.safetyScore >= 80
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {route.safetyScore}/100
                          </span>
                        </div>

                        {/* Duration & distance */}
                        <div className="flex items-baseline space-x-1.5 mb-1">
                          <span className="text-base font-black text-white">{route.durationMinutes} min</span>
                          <span className="text-[10px] text-slate-400">({route.distanceKm} km)</span>
                        </div>

                        {/* Weather Impact Label */}
                        <div className="text-[9.5px] font-medium text-slate-400 leading-snug line-clamp-2">
                          {route.weatherImpactLabel || route.weatherImpactBadge || route.summaryCondition}
                        </div>

                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-400/40" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Route Metrics Card & 5-Hazard Matrix */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 border border-slate-700 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      activeRoute.color === 'green'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : activeRoute.color === 'orange'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {activeRoute.badge || 'SELECTED ROUTE'}
                  </span>
                  <span className="text-xs font-black text-white truncate max-w-[180px]">
                    {activeRoute.name}
                  </span>
                </div>

                {/* Weather Safety Score Badge */}
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400">Safety:</span>
                  <span
                    className={`text-xs font-black ${
                      activeRoute.safetyScore !== undefined && activeRoute.safetyScore !== null
                        ? activeRoute.safetyScore >= 80
                          ? 'text-emerald-400'
                          : activeRoute.safetyScore >= 60
                          ? 'text-amber-400'
                          : 'text-red-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {activeRoute.safetyScore !== undefined && activeRoute.safetyScore !== null
                      ? `${activeRoute.safetyScore}/100`
                      : 'Unavailable'}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline justify-between mb-2.5">
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-white tracking-tight">
                    {activeRoute.durationMinutes} min
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    ({activeRoute.distanceKm} km)
                  </span>
                </div>
                <div className="text-xs font-semibold text-sky-400 flex items-center space-x-1">
                  <span>{activeRoute.summaryCondition}</span>
                </div>
              </div>

              {/* 5-Hazard Risk Matrix: Rain, Flood, Wind, Fog, Storm */}
              <div className="grid grid-cols-5 gap-1.5 mb-3 text-[10px]">
                <div className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
                  <div className="text-slate-400 text-[9px] mb-0.5">Rain</div>
                  <div className={`font-black ${activeRoute.rainRisk === 'Low' ? 'text-emerald-400' : activeRoute.rainRisk === 'Moderate' ? 'text-amber-400' : activeRoute.rainRisk === 'High' ? 'text-red-400' : 'text-slate-400'}`}>
                    {activeRoute.rainRisk || 'Unavailable'}
                  </div>
                </div>

                <div className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
                  <div className="text-slate-400 text-[9px] mb-0.5">Flood</div>
                  <div className={`font-black ${activeRoute.waterloggingRisk === 'Low' ? 'text-emerald-400' : activeRoute.waterloggingRisk === 'Moderate' ? 'text-amber-400' : activeRoute.waterloggingRisk === 'High' ? 'text-red-400' : 'text-slate-400'}`}>
                    {activeRoute.waterloggingRisk || 'Unavailable'}
                  </div>
                </div>

                <div className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
                  <div className="text-slate-400 text-[9px] mb-0.5">Wind</div>
                  <div className={`font-black ${windRisk === 'Low' ? 'text-emerald-400' : windRisk === 'Moderate' ? 'text-amber-400' : windRisk === 'High' ? 'text-red-400' : 'text-slate-400'}`}>
                    {windRisk || 'Unavailable'}
                  </div>
                </div>

                <div className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
                  <div className="text-slate-400 text-[9px] mb-0.5">Fog</div>
                  <div className={`font-black ${fogRisk === 'Low' ? 'text-emerald-400' : fogRisk === 'Moderate' ? 'text-amber-400' : fogRisk === 'High' ? 'text-red-400' : 'text-slate-400'}`}>
                    {fogRisk || 'Unavailable'}
                  </div>
                </div>

                <div className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
                  <div className="text-slate-400 text-[9px] mb-0.5">Storm</div>
                  <div className={`font-black ${thunderstormRisk === 'Low' ? 'text-emerald-400' : thunderstormRisk === 'Moderate' ? 'text-amber-400' : thunderstormRisk === 'High' ? 'text-red-400' : 'text-slate-400'}`}>
                    {thunderstormRisk || 'Unavailable'}
                  </div>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={onStartNavigation}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition cursor-pointer active:scale-98"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Start Navigation</span>
                </button>

                {onOpenChat && (
                  <button
                    onClick={onOpenChat}
                    className="py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                    title="Ask WeatherGPT about this route"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Ask AI</span>
                  </button>
                )}

                <button
                  onClick={onOpenWhyRoute}
                  className="py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
                  title="Explain Route Decision"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Why?</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Best Departure Time Recommendations */}
        <div className="p-3 rounded-2xl bg-slate-850 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-black text-white">
                {language === 'hi' ? 'सर्वोत्तम प्रस्थान समय' : language === 'hinglish' ? 'Best Departure Time' : 'Best Departure Time'}
              </h4>
            </div>
            <span className="text-[10px] font-bold text-sky-400">
              {waitOption?.tag || 'Smart Departure'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {safeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  if (opt.id.includes('wait') || opt.time.includes('20')) {
                    onActivateSmartWait(20);
                  }
                }}
                className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                  opt.isRecommended
                    ? 'bg-blue-600/20 border-blue-500/50 text-white ring-1 ring-blue-500/30'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>
                  <div className="text-xs font-black truncate">{opt.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{opt.time}</div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-black">
                  <span className={opt.safetyScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                    {opt.safetyScore}/100
                  </span>
                  {opt.isRecommended && (
                    <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.2 rounded-xs">
                      Best
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Actions: Timeline, Nearby Places, Step Maneuvers */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <button
            onClick={onOpenTimeline}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Timeline</span>
          </button>

          <button
            onClick={onOpenNearby}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            <span>Nearby Places</span>
          </button>

          <button
            onClick={() => setShowSteps(!showSteps)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold flex items-center justify-center space-x-1 transition cursor-pointer"
          >
            <span>Steps ({routeSteps.length})</span>
            {showSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Route Steps Accordion */}
        {showSteps && routeSteps.length > 0 && (
          <div className="p-3 rounded-2xl bg-slate-850 border border-slate-800 space-y-2 max-h-48 overflow-y-auto">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
              Turn-by-Turn Maneuvers
            </span>
            {routeSteps.map((st, i) => (
              <div key={i} className="flex items-start space-x-2 text-xs py-1 border-b border-slate-800 last:border-b-0">
                <span className="w-4 h-4 rounded-full bg-slate-700 text-[9px] font-bold flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-slate-200">{st.instruction}</div>
                  <div className="text-[10px] text-slate-500">
                    {st.name} • {(st.distance_m / 1000).toFixed(1)} km
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

