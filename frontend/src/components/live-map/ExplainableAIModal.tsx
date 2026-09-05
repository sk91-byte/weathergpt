import React from 'react';
import { LiveMapRoute } from '../../types';
import { X, Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, Layers } from '../Icons';

interface ExplainableAIModalProps {
  route: LiveMapRoute;
  isOpen: boolean;
  onClose: () => void;
  mode: 'why-route' | 'why-wait';
  explanation?: string[];
  isLoading?: boolean;
  liveMode?: boolean;
}

export const ExplainableAIModal: React.FC<ExplainableAIModalProps> = ({
  route,
  isOpen,
  onClose,
  mode,
  explanation = [],
  isLoading = false,
  liveMode = false
}) => {
  if (!isOpen) return null;

  const isWhyRoute = mode === 'why-route';

  return (
    <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-white rounded-3xl p-6 shadow-2xl border border-blue-100 max-w-md w-full mx-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-black text-slate-900">
                  {isWhyRoute ? 'WHY THIS ROUTE?' : 'WHY SHOULD I WAIT?'}
                </h3>
                <span className="text-[9px] font-black bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-xs">
                  WeatherGPT AI
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Grounded Meteorological Decision Analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Natural AI Explanation */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border border-blue-200 text-xs text-slate-800 leading-relaxed mb-4">
          <p className="font-medium">
            {isLoading
              ? 'Reading the latest route forecast and risk factors…'
              : isWhyRoute && liveMode && explanation.length
              ? explanation.join(' ')
              : isWhyRoute
              ? route.whyThisRoute
              : route.whyWait}
          </p>
        </div>

        {/* Telemetry Breakdown Factors */}
        <div className="space-y-2 mb-4">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
            Observed Ground Truth Factors
          </span>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">Route Safety Score:</span>
            <span className="font-extrabold text-emerald-600">
              {liveMode && !route.riskAvailable
                ? 'Unavailable (backend risk data missing)'
                : `${route.safetyScore} / 100 (${route.safetyScore >= 80 ? 'Safe Corridor' : 'Elevated Hazard'})`}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">Precipitation Exposure:</span>
            <span className="font-extrabold text-slate-900">
              {liveMode ? route.rainRisk : route.rainRisk === 'Low' ? 'Reduced by 70%' : 'High Intensity'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">Underpass Waterlogging:</span>
            <span className="font-extrabold text-emerald-600">
              {liveMode ? route.waterloggingRisk : route.waterloggingRisk === 'Low' ? '0 Underpasses at Risk' : 'High Risk In Subways'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">Forecast Confidence:</span>
            <span className="font-extrabold text-blue-600">
              {liveMode ? 'Based on backend route forecast' : '88% High • Demo scenario'}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 transition cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
