import React from 'react';
import { ApiPointWeatherResponse } from '../../services/api';
import { X, CloudRain, Droplets, Wind, Thermometer, MapPin, Navigation, Compass, ExternalLink } from '../Icons';

interface MapWeatherPopupProps {
  weather: ApiPointWeatherResponse | null;
  isLoading: boolean;
  onClose: () => void;
  onSetAsOrigin?: (point: { lat: number; lng: number; name: string }) => void;
  onSetAsDestination?: (point: { lat: number; lng: number; name: string }) => void;
  onAskChat?: (prompt: string) => void;
}

export const MapWeatherPopup: React.FC<MapWeatherPopupProps> = ({
  weather,
  isLoading,
  onClose,
  onSetAsOrigin,
  onSetAsDestination,
  onAskChat
}) => {
  if (!weather && !isLoading) return null;

  const lat = weather?.latitude || 0;
  const lon = weather?.longitude || 0;
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;

  return (
    <div className="absolute top-20 right-3 left-3 sm:left-auto sm:right-4 sm:w-84 z-40 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-4 text-white animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-sm">
            📍
          </div>
          <div>
            <h3 className="text-xs font-black text-white truncate max-w-[180px]">
              {isLoading ? 'Fetching Weather...' : weather?.location_name || 'Map Point'}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {weather ? `${weather.latitude.toFixed(3)}°N, ${weather.longitude.toFixed(3)}°E` : 'Querying coordinates...'}
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
          <span className="text-[11px] text-slate-400 font-medium">Contacting weather station...</span>
        </div>
      ) : weather ? (
        <div className="pt-3 space-y-3">
          {/* Route Sector Weather & Safety Banner */}
          {weather.route_point_info && (
            <div className="bg-gradient-to-r from-blue-900/70 to-indigo-900/70 border border-blue-500/40 rounded-xl p-2.5 text-xs text-blue-100">
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="text-sky-300 flex items-center space-x-1">
                  <span>🛣️</span>
                  <span>{weather.route_point_info.section_name}</span>
                </span>
                {weather.route_point_info.safety_score !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      weather.route_point_info.safety_score >= 80
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : weather.route_point_info.safety_score >= 65
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    🛡️ Safety: {weather.route_point_info.safety_score}/100
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3 text-[10px] text-slate-300 mb-1.5">
                {weather.route_point_info.expected_time && (
                  <span>⏱️ Expected: <strong>{weather.route_point_info.expected_time}</strong></span>
                )}
                {weather.route_point_info.distance_km !== undefined && (
                  <span>📍 Distance: <strong>{weather.route_point_info.distance_km} km</strong></span>
                )}
                {weather.route_point_info.waterlogging_risk && (
                  <span>🌊 Ponding: <strong>{weather.route_point_info.waterlogging_risk}</strong></span>
                )}
              </div>
              {weather.route_point_info.advice && (
                <div className="bg-slate-900/70 rounded-lg p-1.5 text-[10.5px] text-slate-200 border border-blue-400/20">
                  <span className="font-semibold text-sky-400">Driver Advisory: </span>
                  {weather.route_point_info.advice}
                </div>
              )}
            </div>
          )}

          {/* Main Temp & Condition */}
          <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
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
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {weather.is_live ? 'LIVE SATELLITE' : 'DEMO OBS'}
              </span>
            </div>
          </div>

          {/* Detailed Meteorological Metrics Grid */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-center space-x-1 text-sky-400 text-[10px] mb-0.5">
                <CloudRain className="w-3 h-3" />
                <span>Rain Now</span>
              </div>
              <div className="text-xs font-black text-white">{weather.current_precipitation} mm/h</div>
              <div className="text-[9px] text-slate-400">{weather.rain_probability}% chance</div>
            </div>

            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-center space-x-1 text-cyan-400 text-[10px] mb-0.5">
                <Droplets className="w-3 h-3" />
                <span>Humidity</span>
              </div>
              <div className="text-xs font-black text-white">{weather.humidity}%</div>
              <div className="text-[9px] text-slate-400">Ambient</div>
            </div>

            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-center space-x-1 text-emerald-400 text-[10px] mb-0.5">
                <Wind className="w-3 h-3" />
                <span>Wind & Dir</span>
              </div>
              <div className="text-xs font-black text-white">{weather.wind_speed} <span className="text-[9px] font-normal">km/h</span></div>
              <div className="text-[9px] text-slate-400 truncate">{weather.wind_direction}</div>
            </div>
          </div>

          {/* Visibility & Weather Risk Row */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/40 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">👀 Visibility:</span>
              <span className="text-[11px] font-bold text-slate-200">
                {weather.visibility !== undefined ? `${weather.visibility} km` : '10 km'}
              </span>
            </div>

            <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/40 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">⚠️ Weather Risk:</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                  weather.weather_risk === 'Severe'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : weather.weather_risk === 'High'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : weather.weather_risk === 'Moderate'
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {weather.weather_risk || 'Low'}
              </span>
            </div>
          </div>

          {/* Nearby Alerts */}
          {weather.nearby_alerts && weather.nearby_alerts.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2 text-[10px] text-amber-200 leading-tight">
              <div className="font-bold flex items-center space-x-1 text-amber-400 mb-0.5">
                <span>⚡ Nearby Alerts / Advisory:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-100/90">
                {weather.nearby_alerts.map((alert, aIdx) => (
                  <li key={aIdx} className="truncate">{alert}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Weather Source, Updated Time & Street View */}
          <div className="flex items-center justify-between text-[9.5px] text-slate-400 px-1 border-t border-slate-800/80 pt-1.5">
            <div>
              <span>Source: <strong className="text-slate-300">{weather.weather_source}</strong></span>
              {weather.updated_time && (
                <span className="ml-1.5 text-slate-500">• {weather.updated_time}</span>
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
                <span>🟢 Set as Origin</span>
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
