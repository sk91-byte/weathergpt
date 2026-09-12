import React from 'react';
import { AlertTriangle, Info } from './Icons';
import { WeatherData } from '../types';

interface WeatherRiskSectionProps {
  weather: WeatherData;
  onOpenExplainableAI: () => void;
}

export const WeatherRiskSection: React.FC<WeatherRiskSectionProps> = ({
  weather,
  onOpenExplainableAI
}) => {
  const getBadgeColor = (level?: string | null) => {
    switch (level?.toUpperCase()) {
      case 'EXTREME':
      case 'HIGH':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'MEDIUM':
      case 'MODERATE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const hasData = weather.riskScore != null && weather.risks != null;

  return (
    <div className="px-5 mt-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 transition hover:border-slate-300">
        
        {/* Header / Score row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Overall Weather Risk
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-extrabold text-slate-900 font-heading">
                  {hasData ? weather.riskScore : '--'}
                </span>
                <span className="text-xs font-semibold text-slate-400">/ 100</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full text-xs font-bold">
              {hasData ? weather.riskStatus : 'Data Missing'}
            </span>
          </div>
        </div>

        {/* Visual Progress Gauge */}
        <div className="mt-3">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: hasData ? `${weather.riskScore}%` : '0%',
                background:
                  !hasData ? '#CBD5E1' :
                  weather.riskScore! > 75
                    ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                    : weather.riskScore! > 40
                    ? 'linear-gradient(90deg, #10B981, #F59E0B)'
                    : '#10B981'
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-medium text-slate-400 mt-1">
            <span>Low Risk (0-30)</span>
            <span>Moderate (31-70)</span>
            <span>High Risk (71-100)</span>
          </div>
        </div>

        {/* Component Risk Breakdown */}
        {hasData ? (
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between bg-slate-50/80 px-2.5 py-1.5 rounded-lg text-xs">
              <span className="text-slate-600 font-medium">Rain Risk</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeColor(weather.risks?.rain)}`}>
                {weather.risks?.rain || 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-50/80 px-2.5 py-1.5 rounded-lg text-xs">
              <span className="text-slate-600 font-medium">Flood Risk</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeColor(weather.risks?.flood)}`}>
                {weather.risks?.flood || 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-50/80 px-2.5 py-1.5 rounded-lg text-xs">
              <span className="text-slate-600 font-medium">Lightning Risk</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeColor(weather.risks?.lightning)}`}>
                {weather.risks?.lightning || 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-50/80 px-2.5 py-1.5 rounded-lg text-xs">
              <span className="text-slate-600 font-medium">Heat Risk</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeColor(weather.risks?.heat)}`}>
                {weather.risks?.heat || 'N/A'}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 italic">
            Weather Risk cannot be fully calculated because required data is missing.
          </div>
        )}

        {/* AI Actionable Recommendation */}
        <div className="mt-3 p-3 bg-blue-50/70 border border-blue-100/90 rounded-xl">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 mt-0.5 text-base leading-none">💡</span>
            <div className="flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">
                AI Recommendation
              </span>
              <p className="text-xs text-blue-900 mt-0.5 leading-relaxed">
                {weather.aiRecommendation || 'Stay alert and monitor weather updates.'}
              </p>
            </div>
            <button
              onClick={onOpenExplainableAI}
              className="p-1.5 text-blue-400 hover:text-blue-700 bg-white border border-blue-200 rounded-full transition cursor-pointer"
              title="Why this recommendation?"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        {/* Timestamp */}
        <div className="mt-2 text-right text-[9px] text-slate-400">
          Calculated using deterministic engine • {weather.lastUpdated}
        </div>
      </div>
    </div>
  );
};
