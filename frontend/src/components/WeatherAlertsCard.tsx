import React from 'react';
import { AlertTriangle, ChevronRight, ShieldAlert } from './Icons';
import { WeatherAlert } from '../types';

interface WeatherAlertsCardProps {
  alerts: WeatherAlert[];
  onOpenAlertsModal: () => void;
}

export const WeatherAlertsCard: React.FC<WeatherAlertsCardProps> = ({
  alerts,
  onOpenAlertsModal
}) => {
  const primaryAlert = alerts[0];

  if (!primaryAlert) return null;

  return (
    <div className="px-5 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight font-heading flex items-center gap-1.5">
          <span>Weather Alerts</span>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
        </h3>
        <button
          onClick={onOpenAlertsModal}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
        >
          View All
        </button>
      </div>

      <div
        id="card-weather-alert"
        onClick={onOpenAlertsModal}
        className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-amber-200 transition cursor-pointer active:scale-[0.99]"
      >
        <div className="flex items-start space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 mt-0.5 border border-amber-200/50">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 truncate font-heading">
                {primaryAlert.title}
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">
                {primaryAlert.issuedAt}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium mt-1 line-clamp-2">
              {primaryAlert.description}
            </p>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200/60">
                {primaryAlert.severity} Risk
              </span>
              <span className="text-[11px] font-semibold text-blue-600 flex items-center">
                Action details <ChevronRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
