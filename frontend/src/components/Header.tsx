import React from 'react';
import { User, Bell, MapPin, Navigation, Loader2 } from './Icons';

interface HeaderProps {
  city?: string;
  country?: string;
  onOpenCitySelector?: () => void;
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
  unreadAlertCount?: number;
  unreadAlertsCount?: number;
  onUseLiveLocation?: () => void;
  isLocating?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  city,
  country = 'India',
  onOpenCitySelector,
  onOpenMenu,
  onOpenNotifications,
  unreadAlertCount,
  unreadAlertsCount = 2,
  onUseLiveLocation,
  isLocating = false
}) => {
  const alertsCount = unreadAlertCount ?? unreadAlertsCount;

  return (
    <header className="w-full flex items-center justify-between px-5 pt-3 pb-2 select-none">
      {/* Left: Profile shortcut and Location quick badge */}
      <div className="flex items-center space-x-2">
        <button
          id="btn-header-profile"
          onClick={onOpenMenu || onOpenCitySelector}
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-200/70 active:scale-95 transition cursor-pointer"
          aria-label="Open Profile & Preferences"
        >
          <User className="w-5 h-5 stroke-[2.2]" />
        </button>

        {city && onOpenCitySelector && (
          <button
            onClick={onOpenCitySelector}
            title={city}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-200/70 hover:bg-slate-200 rounded-full text-xs font-semibold text-slate-800 transition cursor-pointer"
          >
            <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="truncate max-w-[140px] sm:max-w-[180px]">{city}</span>
          </button>
        )}
      </div>

      {/* Center: Brand */}
      <div className="flex flex-col items-center">
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900 font-heading">
          WeatherGPT
        </h1>
      </div>

      {/* Right: GPS Locate & Notification Bell */}
      <div className="flex items-center space-x-1">
        {onUseLiveLocation && (
          <button
            id="btn-header-gps"
            onClick={onUseLiveLocation}
            disabled={isLocating}
            title="Detect live GPS coordinates"
            className="w-9 h-9 flex items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 active:scale-95 transition cursor-pointer"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
          </button>
        )}

        <button
          id="btn-notifications-bell"
          onClick={onOpenNotifications}
          className="relative w-9 h-9 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-200/70 active:scale-95 transition cursor-pointer"
          aria-label="View notifications"
        >
          <Bell className="w-5 h-5 stroke-[2.2]" />
          {alertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
};
