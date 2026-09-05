import React, { useState } from 'react';
import { X, Calendar, Clock, CloudRain, Thermometer, Wind, Droplets, Sun, ChevronRight } from './Icons';
import { DailyForecast, HourlyForecast, WeatherData } from '../types';

interface ForecastDetailsModalProps {
  weather: WeatherData;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  initialTab?: 'hourly' | '7day' | 'aqi';
  isOpen: boolean;
  onClose: () => void;
}

export const ForecastDetailsModal: React.FC<ForecastDetailsModalProps> = ({
  weather,
  hourly,
  daily,
  initialTab = 'hourly',
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'hourly' | '7day' | 'aqi'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div
        id="modal-forecast-details"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[88vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Weather Forecast & Air Quality</h3>
              <p className="text-[11px] text-blue-100">{weather.city}, {weather.country}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex space-x-2">
          {[
            { id: 'hourly', label: 'Hourly Forecast' },
            { id: '7day', label: '7-Day Outlook' },
            { id: 'aqi', label: 'Air Quality (AQI)' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* TAB 1: Hourly */}
          {activeTab === 'hourly' && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Next 24 Hours Progression
              </span>
              <div className="space-y-2">
                {hourly.map((h, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-extrabold text-slate-800 w-14">{h.time}</span>
                      <div>
                        <span className="font-bold text-slate-700 block">{h.condition}</span>
                        <span className="text-[10px] text-blue-600 font-semibold">
                          Rain: {h.rainProb}%
                        </span>
                      </div>
                    </div>
                    <span className="text-base font-extrabold text-slate-900 font-heading">
                      {h.temp}°C
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: 7-Day Forecast */}
          {activeTab === '7day' && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Week Ahead Synoptic Outlook
              </span>
              <div className="space-y-2">
                {daily.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="w-20">
                      <span className="font-extrabold text-slate-900 block">{d.day}</span>
                      <span className="text-[10px] text-slate-400">{d.date}</span>
                    </div>

                    <div className="flex-1 px-2">
                      <span className="font-bold text-slate-700 block text-[11px]">{d.condition}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-1">{d.summary}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-slate-900 block font-heading">
                        {d.maxTemp}° / {d.minTemp}°
                      </span>
                      <span className="text-[10px] font-bold text-blue-600">
                        {d.rainChance}% Rain
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Air Quality Index */}
          {activeTab === 'aqi' && (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Current National AQI
                  </span>
                  <div className="flex items-baseline space-x-1.5 mt-0.5">
                    <span className="text-3xl font-extrabold text-emerald-950 font-heading">
                      {weather.aqi}
                    </span>
                    <span className="text-xs font-bold text-emerald-700">({weather.aqiStatus})</span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1 font-medium">
                    Air quality is satisfactory, and air pollution poses little or no risk.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-200/70 flex items-center justify-center text-emerald-800">
                  <Wind className="w-6 h-6" />
                </div>
              </div>

              {/* Pollutant Breakdown */}
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Primary Monitored Pollutants (CPCB Guidelines)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold block">PM 2.5</span>
                  <span className="text-sm font-extrabold text-slate-800">22 µg/m³</span>
                  <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">Good</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold block">PM 10</span>
                  <span className="text-sm font-extrabold text-slate-800">41 µg/m³</span>
                  <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">Good</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold block">NO2</span>
                  <span className="text-sm font-extrabold text-slate-800">18 ppb</span>
                  <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">Safe</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold block">O3 (Ozone)</span>
                  <span className="text-sm font-extrabold text-slate-800">32 ppb</span>
                  <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">Safe</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
