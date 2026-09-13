import React from 'react';
import { LiveMapRoute } from '../../types';
import { X, Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, Layers } from '../Icons';

interface ExplainableAIModalProps {
  route: LiveMapRoute;
  isOpen: boolean;
  onClose: () => void;
  mode: 'why-route' | 'why-wait';
  aiExplanation?: string;
  isAiLoading?: boolean;
}

export const ExplainableAIModal: React.FC<ExplainableAIModalProps> = ({
  route,
  isOpen,
  onClose,
  mode,
  aiExplanation = '',
  isAiLoading = false
}) => {
  if (!isOpen) return null;

  const isWhyRoute = mode === 'why-route';

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs pointer-events-auto">
      <div className="mx-auto my-4 flex min-h-[calc(100vh-2rem)] max-w-md items-center justify-center">
      <div className="max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-blue-100 animate-in zoom-in-95 duration-200">
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
          <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-wider text-blue-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAiLoading ? 'AI is analyzing live route weather…' : 'AI route intelligence'}</span>
          </div>
          <p className="font-medium whitespace-pre-wrap">
            {isAiLoading ? 'Checking the selected route, live weather risk, and practical travel advice…' : aiExplanation || (isWhyRoute ? route.whyThisRoute : route.whyWait)}
          </p>
        </div>

        {/* These values are shown only inside Analyze Weather & Safety and are
            taken from the selected route's live weather response. */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">Live route weather details</span>
            <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 rounded px-1.5 py-0.5">LIVE PROVIDER DATA</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><span className="text-slate-500 block">Travel time / distance</span><strong className="text-slate-900">{route.durationMinutes} min / {route.distanceKm} km</strong></div>
            <div><span className="text-slate-500 block">Route condition</span><strong className="text-slate-900">{route.summaryCondition || 'Unavailable'}</strong></div>
            <div><span className="text-slate-500 block">Rain risk</span><strong className="text-slate-900">{route.rainRisk || 'Unavailable'}</strong></div>
            <div><span className="text-slate-500 block">Departure advice</span><strong className="text-slate-900">{route.departureAdvice || 'No additional warning'}</strong></div>
          </div>
        </div>

        {/* Telemetry Breakdown Factors */}
        <div className="space-y-2 mb-4">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
            Observed Ground Truth Factors
          </span>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">Route Weather Risk Score:</span>
            <span className="font-extrabold text-emerald-600">
              {route.safetyScore == null ? 'Unavailable' : `${Math.max(0, Math.min(100, 100 - route.safetyScore))} / 100 (${Math.max(0, Math.min(100, 100 - route.safetyScore)) >= 60 ? 'High Risk' : Math.max(0, Math.min(100, 100 - route.safetyScore)) >= 40 ? 'Moderate Risk' : 'Low Risk'})`}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">Rain risk:</span>
            <span className="font-extrabold text-slate-900">
              {route.rainRisk}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">Waterlogging risk:</span>
            <span className="font-extrabold text-emerald-600">
              {route.waterloggingRisk}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">Current condition:</span>
            <span className="font-extrabold text-blue-600">
              {route.summaryCondition || 'Unavailable'}
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
    </div>
  );
};
