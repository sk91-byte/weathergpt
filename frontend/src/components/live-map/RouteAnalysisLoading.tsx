import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2 } from '../Icons';

interface RouteAnalysisLoadingProps {
  destinationName: string;
  onComplete: () => void;
}

const STEPS = [
  { text: 'Finding available routes...', icon: '🗺️' },
  { text: 'Checking live & forecast rainfall...', icon: '🌧️' },
  { text: 'Checking waterlogging & flood risks...', icon: '🌊' },
  { text: 'Scanning severe weather alerts...', icon: '⚡' },
  { text: 'Calculating safest weather-aware route...', icon: '🧠' }
];

export const RouteAnalysisLoading: React.FC<RouteAnalysisLoadingProps> = ({
  destinationName,
  onComplete
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return prev;
        }
      });
    }, 450);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-blue-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Animated Pulsing Radar Icon */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-2xl animate-bounce">⚡</span>
          </div>
          <div className="absolute -inset-2 rounded-3xl border-2 border-blue-400/40 animate-ping pointer-events-none" />
        </div>

        <h3 className="text-base font-extrabold text-slate-900 mb-0.5">
          WeatherGPT Intelligence
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Analyzing route weather to <span className="font-bold text-blue-600">{destinationName}</span>
        </p>

        {/* Step-by-step sequential progress */}
        <div className="w-full space-y-2 text-left mb-4">
          {STEPS.map((step, idx) => {
            const isFinished = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all ${
                  isCurrent
                    ? 'bg-blue-50 text-blue-800 border border-blue-200 scale-[1.02]'
                    : isFinished
                    ? 'text-emerald-700 bg-emerald-50/60'
                    : 'text-slate-400 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className="text-base">{step.icon}</span>
                  <span>{step.text}</span>
                </div>
                <div>
                  {isFinished ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300 mx-1" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
