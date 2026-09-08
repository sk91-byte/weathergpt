import React, { useEffect, useMemo, useState } from 'react';
import { X, TrendingUp, Sparkles, AlertTriangle } from './Icons';
import { apiGetClimateSummary, ApiClimateSummary } from '../services/api';

interface ClimateAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: string;
}

const CITY_COORDINATES: Record<string, [number, number]> = {
  Delhi: [28.6139, 77.2090],
  Dehradun: [30.3165, 78.0322],
};

export const ClimateAnalyticsModal: React.FC<ClimateAnalyticsModalProps> = ({ isOpen, onClose, currentCity }) => {
  const [selectedCityKey, setSelectedCityKey] = useState(currentCity.toLowerCase().includes('delhi') ? 'Delhi' : 'Dehradun');
  const [summary, setSummary] = useState<ApiClimateSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nlAnswer, setNlAnswer] = useState<string | null>(null);

  const endYear = new Date().getFullYear() - 1;
  const startYear = Math.max(2015, endYear - 5);
  const coordinates = CITY_COORDINATES[selectedCityKey] || CITY_COORDINATES.Delhi;
  const temperatureTrend = summary?.temperature.trend || [];
  const rainfallTrend = summary?.rainfall.trend || [];
  const cityLabel = selectedCityKey === 'Delhi' ? 'Delhi NCR' : 'Dehradun';

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNlAnswer(null);
    apiGetClimateSummary(coordinates[0], coordinates[1], startYear, endYear)
      .then((value) => { if (!cancelled) setSummary(value); })
      .catch((reason) => {
        if (!cancelled) {
          setSummary(null);
          setError(reason instanceof Error ? reason.message : 'Live historical data is unavailable.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, selectedCityKey, startYear, endYear]);

  const temperatureChange = useMemo(() => {
    const values = temperatureTrend.map((item) => item.average_temperature_c).filter((value): value is number => typeof value === 'number');
    return values.length >= 2 ? values[values.length - 1] - values[0] : null;
  }, [temperatureTrend]);

  const askClimate = (question: string) => {
    setNlAnswer(null);
    const lower = question.toLowerCase();
    if (!summary) {
      setNlAnswer('Live historical data is unavailable, so I will not invent a climate conclusion.');
      return;
    }
    if (lower.includes('hotter') || lower.includes('temp')) {
      setNlAnswer(temperatureChange === null
        ? 'There are not enough temperature values for a verified comparison.'
        : `${cityLabel} changed by ${temperatureChange >= 0 ? '+' : ''}${temperatureChange.toFixed(2)}°C between the first and last available years. This is a short historical comparison, not a 30-year climate normal.`);
      return;
    }
    if (lower.includes('rain') || lower.includes('monsoon')) {
      const values = rainfallTrend.map((item) => item.rainfall_mm).filter(Number.isFinite);
      const difference = values.length >= 2 ? values[values.length - 1] - values[0] : null;
      setNlAnswer(difference === null
        ? 'There are not enough rainfall values for a verified comparison.'
        : `Annual rainfall changed by ${difference >= 0 ? '+' : ''}${difference.toFixed(1)} mm between the first and last available years. This does not by itself prove a long-term trend.`);
      return;
    }
    setNlAnswer(`The live archive contains ${temperatureTrend.length} annual records from ${startYear} to ${endYear}. Use these as historical context, not as formal climate attribution.`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[88vh] flex flex-col">
        <div className="p-4 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2"><div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div><div><h3 className="text-sm font-bold tracking-tight">Climate & Historical Insights</h3><p className="text-[11px] text-purple-200">Live archive • {startYear}–{endYear}</p></div></div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center space-x-2">
            {(['Dehradun', 'Delhi'] as const).map((city) => <button key={city} onClick={() => setSelectedCityKey(city)} className={`flex-1 py-1.5 text-xs font-bold rounded-xl cursor-pointer ${selectedCityKey === city ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{city === 'Delhi' ? 'Delhi NCR' : 'Dehradun'}</button>)}
          </div>

          {loading && <div className="p-3 rounded-xl bg-blue-50 text-blue-800 text-xs font-semibold">Loading live historical weather…</div>}
          {error && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">{error}</div>}

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-700">Mean Annual Temperature (°C)</span><span className="text-[11px] font-extrabold text-purple-700">{startYear} → {endYear}</span></div>
            <div className="h-28 flex items-end justify-between space-x-2 pt-4 px-2">
              {temperatureTrend.map((item) => { const value = item.average_temperature_c; const height = value === null ? 8 : Math.min(100, Math.max(30, (value - 20) * 12)); return <div key={item.year} className="flex-1 flex flex-col items-center group"><span className="text-[9px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100">{value === null ? '—' : `${value}°`}</span><div className="w-full rounded-t-md bg-gradient-to-t from-purple-600 to-indigo-400" style={{ height: `${height}%` }} /><span className="text-[10px] font-bold text-slate-400 mt-1.5">{item.year}</span></div>; })}
              {!temperatureTrend.length && <span className="text-xs text-slate-500">No live temperature records available.</span>}
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start space-x-2.5"><AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /><div className="text-xs space-y-1"><span className="font-bold text-amber-950 uppercase tracking-wider text-[10px] block">Data interpretation</span><p className="text-slate-700 leading-relaxed font-medium">{summary ? `Source: ${summary.temperature.data_source}. This is a short historical comparison, not a 30-year climate normal.` : 'No verified climate conclusion is shown until the historical provider returns data.'}</p></div></div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2"><label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5"><Sparkles className="w-3.5 h-3.5 text-purple-600" /><span>Ask a Climate Trend Question:</span></label><div className="flex flex-wrap gap-1.5">{[`Has ${cityLabel} become hotter in recent years?`, 'Are annual rainfall totals changing?', 'What does this historical period show?'].map((question) => <button key={question} onClick={() => askClimate(question)} className="text-[11px] font-medium text-left p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200/60 cursor-pointer">{question}</button>)}</div>{nlAnswer && <div className="mt-2 p-2.5 bg-purple-50/60 border border-purple-100 rounded-xl text-xs text-slate-700 leading-relaxed"><span className="font-bold text-purple-900 block text-[10px] mb-0.5">Verified archive summary:</span>{nlAnswer}</div>}</div>
          <button onClick={onClose} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl cursor-pointer">Close Insights</button>
        </div>
      </div>
    </div>
  );
};
