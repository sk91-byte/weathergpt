import React, { useState } from 'react';
import { X, Wheat, Droplets, Wind, AlertTriangle, CheckCircle2, Sparkles, HelpCircle } from './Icons';
import { FarmerAdvisory, WeatherData } from '../types';

interface FarmerModeModalProps {
  weather: WeatherData;
  initialAdvisory: FarmerAdvisory;
  isOpen: boolean;
  onClose: () => void;
}

export const FarmerModeModal: React.FC<FarmerModeModalProps> = ({
  weather,
  initialAdvisory,
  isOpen,
  onClose
}) => {
  const [advisory, setAdvisory] = useState<FarmerAdvisory>(initialAdvisory);
  const [selectedCrop, setSelectedCrop] = useState('Wheat');
  const [growthStage, setGrowthStage] = useState('Tillering / Crown Root');
  const [calculating, setCalculating] = useState(false);

  const crops = [
    { name: 'Wheat', label: 'Wheat (गेहूं)' },
    { name: 'Paddy', label: 'Paddy / Rice (धान)' },
    { name: 'Cotton', label: 'Cotton (कपास)' },
    { name: 'Mustard', label: 'Mustard (सरसों)' },
    { name: 'Sugarcane', label: 'Sugarcane (गन्ना)' }
  ];

  const stages = [
    'Sowing / Germination',
    'Tillering / Crown Root',
    'Vegetative Growth',
    'Flowering / Grain Filling',
    'Maturity / Harvest Ready'
  ];

  const handleUpdateCrop = (cropName: string) => {
    setSelectedCrop(cropName);
    setCalculating(true);
    setTimeout(() => {
      setCalculating(false);
      if (cropName === 'Paddy') {
        setAdvisory({
          ...advisory,
          crop: 'Paddy / Rice (धान)',
          irrigationAdvice: {
            shouldIrrigate: false,
            urgency: 'Safe to hold',
            reason: 'Heavy rain will provide adequate standing water (4-5cm). Close inlet sluices to prevent field bund breaches.'
          },
          pesticideAdvice: {
            safeToSpray: false,
            safetyScore: 18,
            reason: 'High relative humidity (86%) and rain will cause chemical wash-off and inefficient pest control.'
          },
          summaryAdvisory: 'Inspect field water-retention bunds. Postpone nitrogen top-dressing until after rain subsides.'
        });
      } else {
        setAdvisory({
          ...initialAdvisory,
          crop: `${cropName}`
        });
      }
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="modal-farmer-mode"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[88vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Wheat className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Kisan Weather Intelligence</h3>
              <p className="text-[11px] text-emerald-100">Agricultural Weather Decision Engine</p>
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
          {/* Crop & Stage Selector */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Select Your Crop
              </label>
              <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
                {crops.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => handleUpdateCrop(c.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedCrop === c.name
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Growth Stage
              </label>
              <select
                value={growthStage}
                onChange={(e) => setGrowthStage(e.target.value)}
                className="w-full bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 focus:outline-hidden focus:border-emerald-500"
              >
                {stages.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Meteorological Overview for Farm */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-center">
              <span className="text-[10px] text-emerald-800 font-semibold block">Rain (24h)</span>
              <span className="text-sm font-extrabold text-emerald-900 mt-0.5 block">
                {weather.rainChance}% High
              </span>
            </div>
            <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-center">
              <span className="text-[10px] text-blue-800 font-semibold block">Soil Moisture</span>
              <span className="text-sm font-extrabold text-blue-900 mt-0.5 block">
                Adequate (68%)
              </span>
            </div>
            <div className="p-2.5 bg-amber-50/70 border border-amber-100 rounded-xl text-center">
              <span className="text-[10px] text-amber-800 font-semibold block">Wind Speed</span>
              <span className="text-sm font-extrabold text-amber-900 mt-0.5 block">
                {weather.windSpeed} km/h
              </span>
            </div>
          </div>

          {/* Primary Decision Card 1: Irrigation */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Droplets className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Irrigation Decision
                </h4>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  advisory.irrigationAdvice.shouldIrrigate
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {advisory.irrigationAdvice.urgency}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {advisory.irrigationAdvice.reason}
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                💰 Estimated Energy/Fuel Saved: ₹3,500 - ₹5,000 / ha
              </span>
            </div>
          </div>

          {/* Primary Decision Card 2: Pesticide / Spraying Safety */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Wind className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Pesticide Spray Safety
                </h4>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  advisory.pesticideAdvice.safeToSpray
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}
              >
                {advisory.pesticideAdvice.safeToSpray ? 'SAFE TO SPRAY' : 'UNSAFE TO SPRAY'}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {advisory.pesticideAdvice.reason}
            </p>
          </div>

          {/* Combined AI Advisory */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl flex items-start space-x-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-emerald-950 uppercase tracking-wider text-[10px] block mb-0.5">
                Comprehensive Agri Advisory:
              </span>
              <p className="text-slate-700 font-medium leading-relaxed">
                "{advisory.summaryAdvisory}"
              </p>
            </div>
          </div>

          {/* Crucial Mandatory Regulatory Disclaimer */}
          <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-500 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-normal">
              <strong>Mandatory Advisory Disclaimer:</strong> WeatherGPT agricultural guidance is purely informational weather-based intelligence derived from meteorological forecasts and is not a substitute for certified agronomist recommendations.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
