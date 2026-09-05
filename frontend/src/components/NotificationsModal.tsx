import React from 'react';
import { X, Bell, AlertTriangle, CloudRain, Sparkles, CheckCircle2, ChevronRight } from './Icons';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'alert' | 'change' | 'briefing';
  read: boolean;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAlerts: () => void;
  onOpenBriefing: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onOpenAlerts,
  onOpenBriefing
}) => {
  if (!isOpen) return null;

  const notifications: NotificationItem[] = [
    {
      id: 'n1',
      title: 'Smart Forecast Change Detected',
      message: 'Rain probability jumped significantly from 40% to 85% for afternoon hours. Commute schedule update advised.',
      time: '15m ago',
      type: 'change',
      read: false
    },
    {
      id: 'n2',
      title: 'Severe Flash Flood Alert Issued',
      message: 'Doppler radar indicates cloudburst potential over foothill drainages near Rispana river.',
      time: '1h ago',
      type: 'alert',
      read: false
    },
    {
      id: 'n3',
      title: 'Morning AI Briefing Ready',
      message: 'Your personalized weather roadmap is prepared. Tap to review commute windows.',
      time: '3h ago',
      type: 'briefing',
      read: true
    }
  ];

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
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                onClose();
                if (n.type === 'alert') onOpenAlerts();
                if (n.type === 'briefing') onOpenBriefing();
              }}
              className="p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-2xl transition cursor-pointer flex items-start space-x-3 group"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  n.type === 'alert'
                    ? 'bg-red-100 text-red-700'
                    : n.type === 'change'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {n.type === 'alert' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : n.type === 'change' ? (
                  <CloudRain className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-slate-400">{n.time}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  {n.message}
                </p>
              </div>
            </div>
          ))}

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer mt-2"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
};
