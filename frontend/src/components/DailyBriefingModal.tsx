import React, { useState } from 'react';
import { X, Volume2, VolumeX, Sparkles, Sun, CloudRain, Navigation, Umbrella, CheckCircle2 } from './Icons';
import { WeatherData } from '../types';

interface DailyBriefingModalProps {
  weather: WeatherData;
  isOpen: boolean;
  onClose: () => void;
}

export const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({
  weather,
  isOpen,
  onClose
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const speechScript = `Here is the current WeatherGPT observation for ${weather.city}, ${weather.country}. It is ${Math.round(weather.temperature)} degrees Celsius with ${weather.condition}. This briefing only uses the latest loaded observation; open the forecast for time-based predictions.`;

  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechScript);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div
        id="modal-daily-briefing"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[88vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Morning Weather Intelligence Briefing</h3>
              <p className="text-[11px] text-blue-100">Personalized Proactive Day Ahead</p>
            </div>
          </div>
          <button
            onClick={() => {
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Greeting Box */}
          <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                TODAY • {new Date().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <h4 className="text-lg font-extrabold text-slate-900 font-heading">
                GOOD MORNING, ANMOL 👋
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                {weather.city}, {weather.country} • {Math.round(weather.temperature)}°C {weather.condition}
              </p>
            </div>

            {/* Audio Button */}
            <button
              onClick={handleToggleSpeech}
              className={`p-3 rounded-2xl flex items-center space-x-2 font-bold text-xs transition cursor-pointer shadow-sm ${
                isPlaying
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isPlaying ? 'Stop' : 'Listen'}</span>
            </button>
          </div>

          {/* Current observation only. Time-based claims require a live forecast response. */}
          <div className="space-y-2.5">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start space-x-3 text-xs">
              <Sun className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Current observation:</span>
                <p className="text-slate-600 mt-0.5">{weather.condition}, {Math.round(weather.temperature)}°C, humidity {weather.humidity}%. Forecast details are shown only when the live forecast request succeeds.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start space-x-3 text-xs">
              <CloudRain className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Live-data policy:</span>
                <p className="text-slate-600 mt-0.5">WeatherGPT does not invent rainfall, flood risk, or departure advice when the provider has not returned it.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start space-x-3 text-xs">
              <Navigation className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">🚗 Travel & Commute:</span>
                <p className="text-slate-600 mt-0.5">For route-specific conditions, use Plan a route and wait for the live route-weather analysis to finish.</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl flex items-start space-x-3 text-xs">
              <Umbrella className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900">☂️ Action Recommendation:</span>
                <p className="text-slate-700 mt-0.5 font-medium">Use the current observation and the live forecast before making travel decisions.</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              onClose();
            }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
