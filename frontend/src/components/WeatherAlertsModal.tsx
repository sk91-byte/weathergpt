import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, ChevronRight, Phone } from './Icons';
import { WeatherAlert } from '../types';

interface WeatherAlertsModalProps {
  alerts: WeatherAlert[];
  isOpen: boolean;
  onClose: () => void;
}

export const WeatherAlertsModal: React.FC<WeatherAlertsModalProps> = ({
  alerts,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'high' | 'nearby'>('all');

  const filteredAlerts = alerts.filter((alert) => {
    if (activeFilter === 'active') return alert.isActive;
    if (activeFilter === 'high') return alert.severity === 'High' || alert.severity === 'Extreme';
    if (activeFilter === 'nearby') return alert.isNearby;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="modal-weather-alerts"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[88vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-red-600 via-amber-600 to-orange-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Weather Alerts & Early Warnings</h3>
              <p className="text-[11px] text-amber-100">Live Disasters & Meteorological Advisories</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex space-x-2">
          {[
            { id: 'all', label: 'All Alerts' },
            { id: 'active', label: 'Active Now' },
            { id: 'high', label: 'High Risk' },
            { id: 'nearby', label: 'Nearby' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="text-xs font-semibold">No alerts found under this filter.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                        alert.severity === 'High' || alert.severity === 'Extreme'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {alert.severity} Risk
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 mt-1 font-heading">
                      {alert.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">
                      📍 {alert.location} • Issued {alert.issuedAt}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {alert.description}
                </p>

                {/* Possible Impacts */}
                <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">
                    Possible Impacts:
                  </span>
                  {alert.impacts.map((imp, idx) => (
                    <div key={idx} className="flex items-start space-x-1.5 text-slate-600 text-[11px]">
                      <span className="text-red-500">•</span>
                      <span>{imp}</span>
                    </div>
                  ))}
                </div>

                {/* Recommended Actions */}
                <div className="bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-emerald-900 block text-[10px] uppercase tracking-wider">
                    Recommended Actions:
                  </span>
                  {alert.recommendedActions.map((act, idx) => (
                    <div key={idx} className="flex items-start space-x-1.5 text-emerald-800 text-[11px]">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Emergency helpline info */}
          <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-center justify-between">
            <span className="font-semibold text-[11px]">National Disaster Helpline: 1078 | Emergency: 112</span>
            <a
              href="tel:112"
              className="inline-flex items-center space-x-1 font-bold text-blue-600 hover:text-blue-700 text-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call 112</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
