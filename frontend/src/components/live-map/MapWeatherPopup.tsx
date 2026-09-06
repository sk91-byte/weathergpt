import React from 'react';
import { ApiPointWeatherResponse } from '../../services/api';
import { AppLanguage, getPointWeatherAdvice } from '../../utils/routeWeatherSummary';
import { X, CloudRain, Droplets, Wind, Thermometer, MapPin, Navigation, Compass, ExternalLink, AlertTriangle, ShieldCheck, Eye, Zap } from '../Icons';

interface MapWeatherPopupProps {
  weather: ApiPointWeatherResponse | null;
  isLoading: boolean;
  onClose: () => void;
  language?: AppLanguage;
  onSetAsOrigin?: (point: { lat: number; lng: number; name: string }) => void;
  onSetAsDestination?: (point: { lat: number; lng: number; name: string }) => void;
  onAskChat?: (prompt: string) => void;
}

export const MapWeatherPopup: React.FC<MapWeatherPopupProps> = ({
  weather,
  isLoading,
  onClose,
  language = 'en',
  onSetAsOrigin,
  onSetAsDestination,
  onAskChat
}) => {
  if (!weather && !isLoading) return null;

  const lat = weather?.latitude || 0;
  const lon = weather?.longitude || 0;
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;

  // Practical recommendation in the selected language
  const pointAdvice = weather
    ? weather.route_point_info?.advice ||
      getPointWeatherAdvice(
        weather.location_name,
        weather.condition,
        weather.temperature,
        weather.rain_probability,
        weather.route_point_info?.safety_score ?? (weather.rain_probability > 60 ? 55 : 88),
        language
      )
    : '';

  // Derived risks
  const rainProb = weather?.rain_probability || 0;
  const currentRain = weather?.current_precipitation || 0;
  const fogRisk = (weather?.visibility !== undefined && weather.visibility < 3) ? 'Moderate' : 'Low';
  const floodRisk = (currentRain > 10 || rainProb >= 70) ? 'Moderate' : 'Low';
  const stormRisk = rainProb >= 80 ? 'Moderate' : 'Low';

  return (
    <div className="absolute top-20 right-3 left-3 sm:left-auto sm:right-4 sm:w-90 z-40 bg-slate-900/98 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-4 text-white animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-sm">
            📍
          </div>
          <div>
            <h3 className="text-xs font-black text-white truncate max-w-[190px]">
              {isLoading ? 'Fetching Weather...' : weather?.location_name || 'Selected Location'}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {weather ? `${weather.latitude.toFixed(4)}°N, ${weather.longitude.toFixed(4)}°E` : 'Querying coordinates...'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="py-6 flex flex-col items-center justify-center space-y-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] text-slate-400 font-medium">Checking live weather station...</span>
        </div>
      ) : weather ? (
        <div className="pt-3 space-y-2.5">
          {/* Main Temp & Condition */}
          <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center space-x-2.5">
              <span className="text-2xl">{weather.condition_icon || '⛅'}</span>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-black text-white">{weather.temperature}°C</span>
                  <span className="text-[10px] text-slate-400 font-medium">Feels {weather.feels_like}°C</span>
                </div>
                <p className="text-[11px] font-bold text-sky-400">{weather.condition}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {weather.is_live ? 'LIVE RADAR' : 'LIVE DATA'}
              </span>
            </div>
          </div>

          {/* Practical Driver Recommendation in Selected Language */}
          <div className="bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border border-blue-500/40 rounded-xl p-2.5 text-xs text-blue-100">
            <div className="flex items-center justify-between font-bold mb-1">
              <span className="text-sky-300 flex items-center space-x-1">
                <span>💡</span>
                <span>{language === 'hi' ? 'ड्राइवर सलाह' : language === 'hinglish' ? 'WeatherGPT Advice' : 'Driver Recommendation'}</span>
              </span>
              {weather.route_point_info?.safety_score !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-xs text-[9px] font-black uppercase ${
                    weather.route_point_info.safety_score >= 80
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  🛡️ {weather.route_point_info.safety_score}/100
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-200 leading-snug">
              {pointAdvice}
            </p>
          </div>

          {/* Detailed Meteorological Metrics Grid */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-slate-800/70 p-2 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-center space-x-1 text-sky-400 text-[10px] mb-0.5">
                <CloudRain className="w-3 h-3" />
                <span>Rain Chance</span>
              </div>
              <div className="text-xs font-black text-white">{weather.rain_probability}%</div>
              <div className="text-[9px] text-slate-400">{weather.current_precipitation} mm/h</div>
            </div>

            <div className="bg-slate-800/70 p-2 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-center space-x-1 text-cyan-400 text-[10px] mb-0.5">
                <Droplets className="w-3 h-3" />
                <span>Humidity</span>
              </div>
              <div className="text-xs font-black text-white">{weather.humidity}%</div>
              <div className="text-[9px] text-slate-400">Ambient</div>
            </div>

            <div className="bg-slate-800/70 p-2 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-center space-x-1 text-emerald-400 text-[10px] mb-0.5">
                <Wind className="w-3 h-3" />
                <span>Wind Speed</span>
              </div>
              <div className="text-xs font-black text-white">{weather.wind_speed} <span className="text-[8.5px] font-normal">km/h</span></div>
              <div className="text-[9px] text-slate-400 truncate">{weather.wind_direction}</div>
            </div>
          </div>

          {/* 3-Risk Matrix: Fog, Flood, Storm & Visibility */}
          <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
            <div className="bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/40">
              <span className="text-[8.5px] text-slate-400 block">Visibility</span>
              <span className="font-bold text-slate-200">{weather.visibility !== undefined ? `${weather.visibility} km` : '10 km'}</span>
            </div>
            <div className="bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/40">
              <span className="text-[8.5px] text-slate-400 block">Fog Risk</span>
              <span className={`font-bold ${fogRisk === 'Low' ? 'text-emerald-400' : 'text-amber-400'}`}>{fogRisk}</span>
            </div>
            <div className="bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/40">
              <span className="text-[8.5px] text-slate-400 block">Flood Risk</span>
              <span className={`font-bold ${floodRisk === 'Low' ? 'text-emerald-400' : 'text-amber-400'}`}>{floodRisk}</span>
            </div>
            <div className="bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/40">
              <span className="text-[8.5px] text-slate-400 block">Storm Risk</span>
              <span className={`font-bold ${stormRisk === 'Low' ? 'text-emerald-400' : 'text-amber-400'}`}>{stormRisk}</span>
            </div>
          </div>

          {/* Weather Source, Updated Time & Street View */}
          <div className="flex items-center justify-between text-[9.5px] text-slate-400 px-1 border-t border-slate-800/80 pt-1.5">
            <div>
              <span>Source: <strong className="text-slate-300">{weather.weather_source}</strong></span>
              {weather.updated_time && (
                <span className="ml-1 text-slate-500">• {weather.updated_time}</span>
              )}
            </div>
            <a
              href={streetViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 flex items-center space-x-1 font-bold"
            >
              <span>Street View</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Quick Route Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {onSetAsOrigin && (
              <button
                onClick={() =>
                  onSetAsOrigin({
                    lat: weather.latitude,
                    lng: weather.longitude,
                    name: weather.location_name
                  })
                }
                className="py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
              >
                <span>🟢 Set Origin</span>
              </button>
            )}
            {onSetAsDestination && (
              <button
                onClick={() =>
                  onSetAsDestination({
                    lat: weather.latitude,
                    lng: weather.longitude,
                    name: weather.location_name
                  })
                }
                className="py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
              >
                <span>📍 Set Destination</span>
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

