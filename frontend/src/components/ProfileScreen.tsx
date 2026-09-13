import React, { useState } from 'react';
import { User, Settings, Bell, MapPin, Navigation, ShieldAlert, CheckCircle2, Sparkles } from './Icons';
import { APP_LANGUAGES, Language, UserRole, DemoScenario, SavedPlace, RouteTrip } from '../types';

interface ProfileScreenProps {
  userName?: string;
  onRerunOnboarding?: () => void;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  userRole: UserRole;
  onUserRoleChange: (role: UserRole) => void;
  onSelectDemoScenario: (scenario: DemoScenario) => void;
  onBackToHome: () => void;
  savedPlaces: SavedPlace[];
  savedTrips: RouteTrip[];
  onSavePlace: (place: Omit<SavedPlace, 'id' | 'createdAt'>) => void;
  onSelectSavedPlace: (place: SavedPlace) => void;
  onDeletePlace: (placeId: string) => void;
  onSelectSavedTrip: (trip: RouteTrip) => void;
  onDeleteSavedTrip: (tripId: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userName = 'Shubham',
  onRerunOnboarding,
  currentLanguage,
  onLanguageChange,
  userRole,
  onUserRoleChange,
  onSelectDemoScenario,
  onBackToHome,
  savedPlaces,
  savedTrips,
  onSavePlace,
  onSelectSavedPlace,
  onDeletePlace,
  onSelectSavedTrip,
  onDeleteSavedTrip
}) => {
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [forecastChangeNotif, setForecastChangeNotif] = useState(true);
  const [dailyBriefingNotif, setDailyBriefingNotif] = useState(true);
  const [severeAlertNotif, setSevereAlertNotif] = useState(true);
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [placeLabel, setPlaceLabel] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeLatitude, setPlaceLatitude] = useState('');
  const [placeLongitude, setPlaceLongitude] = useState('');

  const submitPlace = (event: React.FormEvent) => {
    event.preventDefault();
    const latitude = Number(placeLatitude);
    const longitude = Number(placeLongitude);
    if (!placeName.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    onSavePlace({
      label: placeLabel.trim() || 'Saved place',
      name: placeName.trim(),
      address: placeAddress.trim() || undefined,
      coords: [latitude, longitude],
      category: 'place'
    });
    setPlaceLabel('');
    setPlaceName('');
    setPlaceAddress('');
    setPlaceLatitude('');
    setPlaceLongitude('');
    setShowPlaceForm(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 select-none pb-24 overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 bg-white border-b border-slate-200">
        <h2 className="text-base font-extrabold text-slate-900 font-heading">
          Profile & Preferences
        </h2>
        <p className="text-xs text-slate-500">Personalized AI Weather Configuration</p>
      </div>

      <div className="p-5 space-y-4">
        {/* User Card */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
            {userName ? userName.slice(0, 2).toUpperCase() : 'AS'}
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-base font-bold text-slate-900 font-heading">{userName}</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xs text-slate-500">WeatherGPT Member</p>
            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 uppercase">
              {userRole} Mode
            </span>
          </div>
        </div>

        {/* Persona / User Type Selector */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
            User Persona / Role
          </span>
          <p className="text-[11px] text-slate-500 leading-tight">
            WeatherGPT tailors action advice specifically to your daily lifestyle:
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {[
              { id: 'citizen', title: 'Citizen', desc: 'Daily commute & city precautions' },
              { id: 'farmer', title: 'Farmer (Kisan)', desc: 'Irrigation & crop spray guidance' },
              { id: 'traveller', title: 'Traveller', desc: 'Highway & mountain route weather' },
              { id: 'researcher', title: 'Researcher', desc: 'Raw telemetry & climate models' }
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => onUserRoleChange(r.id as UserRole)}
                className={`p-2.5 rounded-2xl text-left transition cursor-pointer border ${
                  userRole === r.id
                    ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-bold block">{r.title}</span>
                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                  {r.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Preferences: Language & Units */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
            App Preferences
          </span>

          <div className="space-y-2 text-xs pt-1">
            <span className="font-semibold text-slate-700 block">Language</span>
            <div className="w-full max-h-52 overflow-y-auto bg-slate-100 p-1 rounded-xl text-[11px] font-bold space-y-1">
              {APP_LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  onClick={() => onLanguageChange(language.code)}
                  className={`w-full px-3 py-2 rounded-lg transition cursor-pointer text-left ${
                    currentLanguage === language.code
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language.nativeName}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-700">Temperature Unit</span>
            <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
              {(['C', 'F'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    unit === u
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  °{u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Smart Notifications Configuration */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Smart Weather Notifications
            </span>
            <span className="text-[10px] text-blue-600 font-bold">Innovative Change Detection</span>
          </div>

          <label className="flex items-center justify-between text-xs py-1 cursor-pointer">
            <div>
              <span className="font-semibold text-slate-800 block">Forecast Change Detection</span>
              <span className="text-[10px] text-slate-400">
                Only notify when rainfall probability jumps significantly (e.g. 40% → 80%)
              </span>
            </div>
            <input
              type="checkbox"
              checked={forecastChangeNotif}
              onChange={(e) => setForecastChangeNotif(e.target.checked)}
              className="w-4 h-4 accent-blue-600 cursor-pointer ml-3"
            />
          </label>

          <label className="flex items-center justify-between text-xs py-1 border-t border-slate-100 cursor-pointer">
            <div>
              <span className="font-semibold text-slate-800 block">Daily Morning AI Briefing</span>
              <span className="text-[10px] text-slate-400">
                Receive proactive audio/text overview at 07:30 AM
              </span>
            </div>
            <input
              type="checkbox"
              checked={dailyBriefingNotif}
              onChange={(e) => setDailyBriefingNotif(e.target.checked)}
              className="w-4 h-4 accent-blue-600 cursor-pointer ml-3"
            />
          </label>

          <label className="flex items-center justify-between text-xs py-1 border-t border-slate-100 cursor-pointer">
            <div>
              <span className="font-semibold text-slate-800 block">Disaster & Flash Flood Alerts</span>
              <span className="text-[10px] text-slate-400">
                Immediate high-priority warnings with evacuation routes
              </span>
            </div>
            <input
              type="checkbox"
              checked={severeAlertNotif}
              onChange={(e) => setSevereAlertNotif(e.target.checked)}
              className="w-4 h-4 accent-blue-600 cursor-pointer ml-3"
            />
          </label>
        </div>

        {/* Saved Places & Routes */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Saved Places & Routes
            </span>
            <button
              type="button"
              onClick={() => setShowPlaceForm((value) => !value)}
              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition cursor-pointer"
            >
              + Add place
            </button>
          </div>

          {showPlaceForm && (
            <form onSubmit={submitPlace} className="p-3 bg-blue-50 rounded-2xl border border-blue-100 space-y-2">
              <p className="text-[11px] font-bold text-blue-900">Add a place manually</p>
              <input value={placeLabel} onChange={(e) => setPlaceLabel(e.target.value)} placeholder="Label (Home, College...)" className="w-full px-2.5 py-2 rounded-lg border border-blue-200 text-xs outline-none" />
              <input required value={placeName} onChange={(e) => setPlaceName(e.target.value)} placeholder="Place name" className="w-full px-2.5 py-2 rounded-lg border border-blue-200 text-xs outline-none" />
              <input value={placeAddress} onChange={(e) => setPlaceAddress(e.target.value)} placeholder="Address (optional)" className="w-full px-2.5 py-2 rounded-lg border border-blue-200 text-xs outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input required inputMode="decimal" value={placeLatitude} onChange={(e) => setPlaceLatitude(e.target.value)} placeholder="Latitude" className="px-2.5 py-2 rounded-lg border border-blue-200 text-xs outline-none" />
                <input required inputMode="decimal" value={placeLongitude} onChange={(e) => setPlaceLongitude(e.target.value)} placeholder="Longitude" className="px-2.5 py-2 rounded-lg border border-blue-200 text-xs outline-none" />
              </div>
              <p className="text-[10px] text-blue-700">Tip: the map’s Save button fills these coordinates automatically.</p>
              <button type="submit" className="w-full py-2 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer">Save place</button>
            </form>
          )}

          {savedPlaces.length === 0 && savedTrips.length === 0 ? (
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">No saved items yet. Save a searched place or route from Live Map.</div>
          ) : (
            <div className="space-y-2">
              {savedPlaces.map((place) => (
                <div key={place.id} className="p-2.5 bg-slate-50 rounded-xl flex items-start justify-between gap-2 text-xs">
                  <button type="button" onClick={() => onSelectSavedPlace(place)} className="min-w-0 text-left cursor-pointer">
                    <span className="font-bold text-slate-800 block">📍 {place.label}: {place.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{place.address || `${place.coords[0].toFixed(5)}, ${place.coords[1].toFixed(5)}`}</span>
                  </button>
                  <button type="button" onClick={() => onDeletePlace(place.id)} className="text-[10px] font-bold text-red-600 cursor-pointer">Remove</button>
                </div>
              ))}
              {savedTrips.map((savedTrip) => (
                <div key={savedTrip.id} className="p-2.5 bg-blue-50 rounded-xl flex items-start justify-between gap-2 text-xs border border-blue-100">
                  <button type="button" onClick={() => onSelectSavedTrip(savedTrip)} className="min-w-0 text-left cursor-pointer">
                    <span className="font-bold text-blue-900 block">🛣️ {savedTrip.from} → {savedTrip.to}</span>
                    <span className="text-[10px] text-blue-700 block">{savedTrip.estDuration} · Open route</span>
                  </button>
                  <button type="button" onClick={() => onDeleteSavedTrip(savedTrip.id)} className="text-[10px] font-bold text-red-600 cursor-pointer">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reconfigure Onboarding Walkthrough Option */}
        {onRerunOnboarding && (
          <button
            onClick={onRerunOnboarding}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-blue-600 flex items-center justify-center space-x-2 transition cursor-pointer shadow-xs active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Rerun Onboarding Setup Walkthrough</span>
          </button>
        )}

        {/* App Info / Tagline */}
        <div className="text-center py-3 text-slate-400 text-xs">
          <p className="font-extrabold text-slate-600 tracking-tight">WeatherGPT v2.4 (SIH Edition)</p>
          <p className="text-[11px] italic mt-0.5">"Don't Just Know the Weather. Know What to Do."</p>
        </div>
      </div>
    </div>
  );
};
