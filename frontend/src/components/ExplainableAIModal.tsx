import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, Layers } from './Icons';
import { WeatherData } from '../types';

interface ExplainableAIModalProps {
  weather: WeatherData;
  isOpen: boolean;
  onClose: () => void;
}

export const ExplainableAIModal: React.FC<ExplainableAIModalProps> = ({
  weather,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const exp = weather.recommendationExplanation;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="modal-explainable-ai"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Explainable Weather AI</h3>
              <p className="text-[11px] text-blue-200">Transparent & Grounded Meteorological Reasoning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Main Question */}
          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100">
            <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">
              Root Cause Analysis
            </span>
            <h4 className="text-base font-extrabold text-slate-800 mt-0.5">
              {exp.title}
            </h4>
          </div>

          {/* Meteorological Factors */}
          <div>
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Observable Atmospheric Drivers</span>
            </h5>
            <div className="space-y-2">
              {exp.factors.map((factor, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium text-slate-700"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Confidence & Model Agreement */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Forecast Confidence</span>
              <span className="text-sm font-extrabold text-blue-700">
                {exp.confidence}% (High)
              </span>
            </div>

            {/* Confidence progress bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                style={{ width: `${exp.confidence}%` }}
              />
            </div>

            <div className="pt-2 border-t border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-0.5">Model Convergence:</span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {exp.modelAgreement}
              </p>
            </div>
          </div>

          {/* Honesty / Uncertainty Statement */}
          {exp.uncertaintyNote && (
            <div className="p-3 bg-amber-50/90 border border-amber-200/70 rounded-xl flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold block text-amber-950">Scientific Transparency:</span>
                {exp.uncertaintyNote}
              </div>
            </div>
          )}

          {/* Recommendation recap */}
          <div className="pt-1 text-center">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              Got It, Thanks!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
