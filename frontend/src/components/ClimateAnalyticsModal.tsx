import React, { useState } from 'react';
import { X, TrendingUp, Calendar, Search, Sparkles, AlertTriangle } from './Icons';
import { DEFAULT_CLIMATE_DATA } from '../data/weatherData';

interface ClimateAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: string;
}

export const ClimateAnalyticsModal: React.FC<ClimateAnalyticsModalProps> = ({
  isOpen,
  onClose,
  currentCity
}) => {
  const [selectedCityKey, setSelectedCityKey] = useState(
    currentCity.toLowerCase().includes('delhi') ? 'Delhi' : 'Dehradun'
  );
  const [nlQuery, setNlQuery] = useState('');
  const [nlAnswer, setNlAnswer] = useState<string | null>(null);

  const climate = DEFAULT_CLIMATE_DATA[selectedCityKey] || DEFAULT_CLIMATE_DATA['Dehradun'];

  const handleAskClimate = (query: string) => {
    setNlQuery(query);
    if (query.toLowerCase().includes('hotter') || query.toLowerCase().includes('temp')) {
      setNlAnswer(
        `Analysis of ${climate.city} data from 2020 to 2026 shows an average temperature rise of +0.31°C, with summer maximums exceeding historical medians by 4-6 days annually. Note that broader decadal datasets are recommended for definitive long-term climate modeling.`
      );
    } else if (query.toLowerCase().includes('rain') || query.toLowerCase().includes('monsoon')) {
      setNlAnswer(
        `Rainfall totals in ${climate.city} remain generally stable on annual volume, but the distribution has skewed toward sudden high-volume bursts (>75mm/day), increasing seasonal flash runoff risks.`
      );
    } else {
      setNlAnswer(
        `WeatherGPT climate records for ${climate.city} (2020-2026) indicate noticeable shifts in extreme weather occurrences (up from 4 to 11 recorded localized anomalies).`
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="modal-climate-analytics"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[88vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Climate & Historical Insights</h3>
              <p className="text-[11px] text-purple-200">Observed 2020 - 2026 Trend Analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* City Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSelectedCityKey('Dehradun');
                setNlAnswer(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                selectedCityKey === 'Dehradun'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Dehradun (Foothills)
            </button>
            <button
              onClick={() => {
                setSelectedCityKey('Delhi');
                setNlAnswer(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                selectedCityKey === 'Delhi'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Delhi NCR (Plains)
            </button>
          </div>

          {/* Metric Trends (2020 - 2026) */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Mean Annual Temperature (°C)</span>
              <span className="text-[11px] font-extrabold text-purple-700">2020 → 2026</span>
            </div>

            {/* Visual Bar Chart Comparison */}
            <div className="h-28 flex items-end justify-between space-x-2 pt-4 px-2">
              {climate.years.map((yr, idx) => {
                const temp = climate.avgTemp[idx];
                const heightPct = Math.min(100, Math.max(30, (temp - 20) * 12));
                return (
                  <div key={yr} className="flex-1 flex flex-col items-center group">
                    <span className="text-[9px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition">
                      {temp}°
                    </span>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-purple-600 to-indigo-400 transition-all duration-500 group-hover:from-purple-700 group-hover:to-pink-500"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] font-bold text-slate-400 mt-1.5">{yr}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extreme Events Bar */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-amber-950 uppercase tracking-wider text-[10px] block">
                Extreme Weather Anomaly Metric:
              </span>
              <p className="text-slate-700 leading-relaxed font-medium">
                {climate.insight}
              </p>
            </div>
          </div>

          {/* Natural Language Climate Query */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Ask a Climate Trend Question:</span>
            </label>

            <div className="flex flex-wrap gap-1.5">
              {[
                `Has ${climate.city} become hotter in recent years?`,
                `Are extreme rainfall events increasing?`,
                `What is the 5-year monsoon pattern?`
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleAskClimate(q)}
                  className="text-[11px] font-medium text-left p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200/60 transition cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {nlAnswer && (
              <div className="mt-2 p-2.5 bg-purple-50/60 border border-purple-100 rounded-xl text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-purple-900 block text-[10px] mb-0.5">
                  AI Empirical Summary:
                </span>
                {nlAnswer}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Close Insights
          </button>
        </div>
      </div>
    </div>
  );
};
