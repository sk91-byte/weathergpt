import React, { useState } from 'react';
import { User, Settings, Bell, MapPin, Navigation, ShieldAlert, CheckCircle2, ChevronRight, Sparkles } from './Icons';
import { Language, UserRole, DemoScenario } from '../types';
import { DEMO_SCENARIOS } from '../data/weatherData';

interface ProfileScreenProps {
  userName?: string;
  onRerunOnboarding?: () => void;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  userRole: UserRole;
  onUserRoleChange: (role: UserRole) => void;
  onSelectDemoScenario: (scenario: DemoScenario) => void;
  onBackToHome: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userName = 'Anmol',
  onRerunOnboarding,
  currentLanguage,
  onLanguageChange,
  userRole,
  onUserRoleChange,
  onSelectDemoScenario,
  onBackToHome
}) => {
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [forecastChangeNotif, setForecastChangeNotif] = useState(true);
  const [dailyBriefingNotif, setDailyBriefingNotif] = useState(true);
  const [severeAlertNotif, setSevereAlertNotif] = useState(true);

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

        {/* Hackathon Demo Scenarios Switcher */}
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl border border-indigo-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Demo Presentation Scenarios
            </span>
            <span className="text-[9px] font-extrabold bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">
              Hackathon Ready
            </span>
          </div>
          <p className="text-[11px] text-indigo-900/80 leading-normal">
            Switch scenarios in 1 click to test extreme weather conditions & actionable advice:
          </p>

          <div className="space-y-1.5 pt-1">
            {DEMO_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => {
                  onSelectDemoScenario(scenario);
                  onBackToHome();
                }}
                className="w-full p-2.5 bg-white hover:bg-indigo-100/60 rounded-2xl border border-indigo-100 text-left transition cursor-pointer flex items-center justify-between group shadow-2xs"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 block group-hover:text-indigo-700">
                    {scenario.title}
                  </span>
                  <span className="text-[10px] text-slate-500 line-clamp-1">
                    {scenario.tagline}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
              </button>
            ))}
          </div>
        </div>

        {/* Preferences: Language & Units */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
            App Preferences
          </span>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="font-semibold text-slate-700">Language</span>
            <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
              {(['en', 'hi', 'gu'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => onLanguageChange(l)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    currentLanguage === l
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {l === 'en' ? 'English' : l === 'hi' ? 'हिन्दी' : 'ગુજરાતી'}
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

        {/* Saved Locations */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
            Saved Places & Routes
          </span>
          <div className="space-y-1.5">
            <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-2">
                <span>🏠</span> Home: Vasant Vihar, Dehradun
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">Active</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-2">
                <span>🎓</span> College: Graphic Era / UPES Campus
              </span>
              <span className="text-[10px] text-blue-600 font-bold">Route Linked</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-2">
                <span>🌾</span> Agricultural Farm: Terai Block 4
              </span>
              <span className="text-[10px] text-slate-400 font-bold">Configured</span>
            </div>
          </div>
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
