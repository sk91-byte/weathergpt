import React from 'react';
import { X, Bell, AlertTriangle, CheckCircle2 } from './Icons';
import { WeatherAlert } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAlerts: () => void;
  onOpenBriefing: () => void;
  alerts: WeatherAlert[];
  onMarkAlertsRead?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onOpenAlerts,
  onOpenBriefing,
  alerts,
  onMarkAlertsRead
}) => {
  if (!isOpen) return null;

  const activeAlerts = alerts.filter((alert) => alert.isActive);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div
        id="modal-notifications"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Weather Intelligence Alerts</h3>
              <p className="text-[11px] text-blue-100">Actionable Event Feed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="p-5 space-y-3 overflow-y-auto">
          {activeAlerts.length === 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 mb-2" />
              <h4 className="text-sm font-bold text-slate-900">No active official alerts</h4>
              <p className="text-xs text-slate-500 mt-1">New verified warnings for your selected location will appear here.</p>
              <button onClick={onOpenBriefing} className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer">View weather briefing</button>
            </div>
          )}
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => {
                onMarkAlertsRead?.();
                onClose();
                onOpenAlerts();
              }}
              className="p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-2xl transition cursor-pointer flex items-start space-x-3 group"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  alert.severity === 'Extreme' || alert.severity === 'High'
                    ? 'bg-red-100 text-red-700'
                    : alert.severity === 'Moderate'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                    {alert.title}
                  </h4>
                  <span className="text-[10px] text-slate-400">{alert.issuedAt || 'Now'}</span>
                </div>
                <p className="text-[10px] font-bold mt-1 text-slate-500">{alert.severity} · {alert.location}</p>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  {alert.description}
                </p>
              </div>
            </div>
          ))}

          <button
            onClick={() => { onMarkAlertsRead?.(); onClose(); }}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer mt-2"
          >
            Mark notifications as read
          </button>
        </div>
      </div>
    </div>
  );
};
