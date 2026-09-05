import React from 'react';
import { ShieldAlert, HelpCircle, ArrowRight, AlertTriangle } from './Icons';
import { WeatherData } from '../types';

interface WeatherRiskSectionProps {
  weather: WeatherData;
  onOpenExplainableAI: () => void;
}

export const WeatherRiskSection: React.FC<WeatherRiskSectionProps> = ({
  weather,
  onOpenExplainableAI
}) => {
  const getBadgeColor = (status: string) => {
    switch (status) {
      case 'HIGH':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="px-5 mt-4">
      <div
        id="section-weather-risk"
        className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/90 relative overflow-hidden"
      >
        {/* Subtle decorative top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-amber-500 to-red-500" />

        {/* Top title & score row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Weather Risk
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-extrabold text-slate-900 font-heading">
                  {weather.riskScore}
                </span>
                <span className="text-xs font-semibold text-slate-400">/ 100</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full text-xs font-bold">
              {weather.riskStatus}
            </span>
          </div>
        </div>

        {/* Visual Progress Gauge */}
        <div className="mt-3">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${weather.riskScore}%`,
                background:
                  weather.riskScore > 75
                    ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                    : weather.riskScore > 40
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

        {/* Risk Breakdown Matrix */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between bg-slate-50/80 px-2.5 py-1.5 rounded-lg text-xs">
            <span className="text-slate-600 font-medium">Rain Risk</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeColor(weather.risks.rain)}`}>
              {weather.risks.rain}
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-50/80 px-2.5 py-1.5 rounded-lg text-xs">
            <span className="text-slate-600 font-medium">Flood Risk</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeColor(weather.risks.flood)}`}>
              {weather.risks.flood}
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-50/80 px-2.5 py-1.5 rounded-lg text-xs">
            <span className="text-slate-600 font-medium">Lightning Risk</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeColor(weather.risks.lightning)}`}>
              {weather.risks.lightning}
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-50/80 px-2.5 py-1.5 rounded-lg text-xs">
            <span className="text-slate-600 font-medium">Heat Risk</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeColor(weather.risks.heat)}`}>
              {weather.risks.heat}
            </span>
          </div>
        </div>

        {/* AI Actionable Recommendation */}
        <div className="mt-3 p-3 bg-blue-50/70 border border-blue-100/90 rounded-xl">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 mt-0.5">💡</span>
            <div className="flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">
                AI Recommendation
              </span>
              <p className="text-xs font-medium text-slate-700 mt-0.5 leading-relaxed">
                "{weather.aiRecommendation}"
              </p>
            </div>
          </div>

          {/* Button: Why this recommendation? */}
          <div className="mt-2.5 pt-2 border-t border-blue-200/50 flex justify-end">
            <button
              id="btn-why-recommendation"
              onClick={onOpenExplainableAI}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 transition cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Why this recommendation?</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
