import React from 'react';
import { LiveMapRoute } from '../../types';
import { AppLanguage, getPointWeatherAdvice } from '../../utils/routeWeatherSummary';
import { X, Clock, AlertTriangle, CheckCircle2, CloudRain, Droplets, Wind, ShieldAlert, Eye } from '../Icons';

interface RouteWeatherTimelineModalProps {
  route: LiveMapRoute;
  isOpen: boolean;
  onClose: () => void;
  language?: AppLanguage;
}

export const RouteWeatherTimelineModal: React.FC<RouteWeatherTimelineModalProps> = ({
  route,
  isOpen,
  onClose,
  language = 'en'
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex flex-col justify-end p-3 pointer-events-auto">
      <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-700 max-w-lg w-full mx-auto max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-black text-white">
                {language === 'hi' ? 'मार्ग मौसम समयरेखा' : language === 'hinglish' ? 'Route Weather Timeline' : 'ROUTE WEATHER TIMELINE'}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {route.name} • {route.distanceKm} km ({route.durationMinutes} min)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Waypoint Explainer */}
        <div className="my-2.5 p-2.5 rounded-2xl bg-blue-950/60 border border-blue-500/30 text-xs text-blue-200 flex items-start space-x-2">
          <span className="text-base">🧠</span>
          <p className="leading-relaxed text-[11px]">
            {language === 'hi'
              ? 'WeatherGPT आपकी यात्रा के दौरान प्रत्येक स्थान पर पहुँचने के अनुमानित समय पर सटीक मौसम का पूर्वानुमान करता है।'
              : language === 'hinglish'
              ? 'WeatherGPT aapke expected arrival time ke hisaab se route ke har point par real-time weather track karta hai.'
              : 'WeatherGPT tracks meteorological forecasts at your specific expected arrival time at each waypoint along your journey.'}
          </p>
        </div>

        {/* Timeline Stop-by-Stop List */}
        <div className="overflow-y-auto space-y-3 px-1 py-2 flex-1">
          {route.waypoints.map((wp, idx) => {
            const isStart = idx === 0;
            const isEnd = idx === route.waypoints.length - 1;
            const ptScore = wp.safetyScore ?? (wp.rainProb > 50 ? 65 : 88);
            const ptAdvice = wp.hazard || getPointWeatherAdvice(wp.name, wp.weatherCondition, wp.temp, wp.rainProb, ptScore, language);

            return (
              <div key={wp.id} className="relative flex items-start space-x-3 group">
                {/* Connecting vertical line */}
                {!isEnd && (
                  <div className="absolute left-3.5 top-7 bottom-0 w-0.5 bg-slate-700 -z-10 group-hover:bg-blue-500 transition" />
                )}

                {/* Pin Node */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black shadow-xs ${
                    isStart
                      ? 'bg-emerald-500 text-white'
                      : isEnd
                      ? 'bg-red-500 text-white'
                      : wp.hazard || wp.rainProb >= 60
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {isStart ? 'A' : isEnd ? 'B' : idx}
                </div>

                {/* Stop Card */}
                <div className="flex-1 p-3 rounded-2xl bg-slate-850 hover:bg-slate-800 border border-slate-750 transition">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-black text-white truncate max-w-[200px]">
                      {wp.name}
                    </h4>
                    <span className="text-xs font-black text-sky-400 font-mono">
                      {wp.expectedTime}
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 mb-2">
                    <span className="flex items-center space-x-1">
                      <span>☁️ {wp.weatherCondition}</span>
                      <strong className="text-white">({wp.temp}°C)</strong>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-sky-300">
                      🌧️ {wp.rainProb}% rain
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-xs ${
                      ptScore >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      🛡️ {ptScore}/100
                    </span>
                  </div>

                  {/* Suggested Driver Action */}
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-[10.5px] text-slate-200">
                    <span className="font-bold text-sky-400">
                      {language === 'hi' ? 'सुझाव: ' : language === 'hinglish' ? 'Advice: ' : 'Suggested Action: '}
                    </span>
                    <span>{ptAdvice}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-3 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition cursor-pointer"
        >
          {language === 'hi' ? 'समयरेखा बंद करें' : language === 'hinglish' ? 'Close Timeline' : 'Close Timeline'}
        </button>
      </div>
    </div>
  );
};

