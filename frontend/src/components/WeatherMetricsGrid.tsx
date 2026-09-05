import React from 'react';
import { CloudRain, Thermometer, Droplets, Wind } from './Icons';
import { WeatherData } from '../types';

interface WeatherMetricsGridProps {
  weather: WeatherData;
  onOpenDetails: (metricTab?: string) => void;
}

export const WeatherMetricsGrid: React.FC<WeatherMetricsGridProps> = ({
  weather,
  onOpenDetails
}) => {
  return (
    <div className="px-5 mt-4">
      <div className="grid grid-cols-4 gap-2.5">
        {/* Metric 1: Rain Chance */}
        <div
          id="metric-card-rain"
          onClick={() => onOpenDetails('rain')}
          className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center shadow-sm border border-slate-100 hover:border-blue-200 transition cursor-pointer active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-1">
            <CloudRain className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
            Rain Chance
          </span>
          <span className="text-sm font-bold text-slate-800 mt-0.5">
            {weather.rainChance}%
          </span>
        </div>

        {/* Metric 2: Temperature Range (Max / Min) */}
        <div
          id="metric-card-temp-range"
          onClick={() => onOpenDetails('temp')}
          className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center shadow-sm border border-slate-100 hover:border-amber-200 transition cursor-pointer active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-1">
            <Thermometer className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
            Max / Min
          </span>
          <span className="text-sm font-bold text-slate-800 mt-0.5">
            {Math.round(weather.maxTemp)}° / {Math.round(weather.minTemp)}°
          </span>
        </div>

        {/* Metric 3: Humidity */}
        <div
          id="metric-card-humidity"
          onClick={() => onOpenDetails('humidity')}
          className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center shadow-sm border border-slate-100 hover:border-cyan-200 transition cursor-pointer active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600 mb-1">
            <Droplets className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
            Humidity
          </span>
          <span className="text-sm font-bold text-slate-800 mt-0.5">
            {weather.humidity}%
          </span>
        </div>

        {/* Metric 4: AQI */}
        <div
          id="metric-card-aqi"
          onClick={() => onOpenDetails('aqi')}
          className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center shadow-sm border border-slate-100 hover:border-emerald-200 transition cursor-pointer active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-1">
            <Wind className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
            AQI
          </span>
          <div className="flex flex-col items-center mt-0.5 leading-none">
            <span className="text-sm font-bold text-slate-800">{weather.aqi}</span>
            <span
              className={`text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full ${
                weather.aqi <= 50
                  ? 'bg-emerald-100 text-emerald-700'
                  : weather.aqi <= 100
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {weather.aqiStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
