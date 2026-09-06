import React from 'react';
import { MapPin, Wind, Droplets, ChevronRight, Navigation, Loader2 } from './Icons';
import { WeatherIllustration } from './WeatherIllustration';
import { WeatherData } from '../types';
import { getWeatherTheme } from '../utils/weatherGradients';

interface MainWeatherCardProps {
  weather: WeatherData;
  onSelectCity: () => void;
  onOpenDetails: () => void;
  onUseLiveLocation?: () => void;
  isLocating?: boolean;
}

export const MainWeatherCard: React.FC<MainWeatherCardProps> = ({
  weather,
  onSelectCity,
  onOpenDetails,
  onUseLiveLocation,
  isLocating = false
}) => {
  const theme = getWeatherTheme(weather);

  return (
    <div className="px-5 select-none">
      <div
        id="card-main-weather"
        className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl cursor-pointer transition transform hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: theme.cardGradient,
          boxShadow: theme.cardShadow,
          transition: 'background 0.7s ease, box-shadow 0.7s ease'
        }}
        onClick={onOpenDetails}
      >
        {/* Dynamic background glow effect */}
        <div className={`absolute -top-10 -right-10 w-44 h-44 rounded-full ${theme.cardGlowColor} blur-2xl pointer-events-none transition-colors duration-700`} />

        {/* Location pill and Live GPS trigger */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <button
              id="btn-location-selector"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCity();
              }}
              title={weather.city}
              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide transition border border-white/25 cursor-pointer shadow-xs"
            >
              <MapPin className="w-3.5 h-3.5 fill-white/80 stroke-white text-white shrink-0" />
              <span className="truncate max-w-[190px] sm:max-w-[230px]">
                {weather.city.includes(',') ? weather.city : `${weather.city}, ${weather.country}`}
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
            </button>

            {onUseLiveLocation && (
              <button
                id="btn-gps-live-quick"
                onClick={(e) => {
                  e.stopPropagation();
                  onUseLiveLocation();
                }}
                disabled={isLocating}
                title="Detect live GPS weather"
                className={`p-1.5 rounded-full backdrop-blur-md transition border cursor-pointer ${
                  isLocating
                    ? 'bg-blue-400/40 border-sky-300 animate-pulse'
                    : 'bg-white/20 hover:bg-white/35 border-white/25 active:scale-95'
                }`}
              >
                {isLocating ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            )}
          </div>

          <span className="text-[11px] font-medium text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
            {weather.lastUpdated === 'Live GPS' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            )}
            {weather.lastUpdated}
          </span>
        </div>

        {/* Center content row */}
        <div className="flex items-center justify-between mt-3">
          <div>
            <div className="flex items-baseline">
              <span className="text-6xl font-extrabold tracking-tight font-heading">
                {Math.round(weather.temperature)}
              </span>
              <span className="text-3xl font-light text-white/90 ml-1">°C</span>
            </div>

            <div className="flex items-center space-x-2 mt-1">
              <span className="text-lg font-semibold text-white tracking-wide">
                {weather.condition}
              </span>
            </div>

            <p className="text-xs text-white/90 font-medium mt-1">
              Feels like {Math.round(weather.feelsLike)}°C <span className="opacity-60">|</span> Humidity {weather.humidity}%
            </p>

            <p className="text-xs text-white/90 font-medium flex items-center space-x-1 mt-0.5">
              <span>Wind {weather.windSpeed} km/h</span>
              <span className="opacity-60">•</span>
              <span>{weather.windDirection}</span>
            </p>
          </div>

          {/* Animated 3D Illustration */}
          <div className="shrink-0">
            <WeatherIllustration condition={weather.condition} />
          </div>
        </div>

        {/* Bottom indicator hint */}
        <div className="mt-4 pt-2.5 border-t border-white/15 flex items-center justify-between text-[11px] text-white/80">
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live IMD Satellite feed synced
          </span>
          <span className="flex items-center font-medium hover:underline text-white">
            Hourly & 7-Day <ChevronRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
