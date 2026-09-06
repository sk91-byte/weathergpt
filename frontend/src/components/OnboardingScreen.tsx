import React, { useState } from 'react';
import { WeatherData, Language } from '../types';
import { DEFAULT_WEATHER_DATA, INDIAN_CITIES, INITIAL_WEATHER } from '../data/weatherData';
import { apiGetLocationWeather } from '../services/api';
import {
  MapPin,
  LocateFixed,
  Search,
  CheckCircle2,
  User,
  Globe,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  AlertTriangle,
  X
} from './Icons';

interface OnboardingScreenProps {
  onComplete: (data: {
    userName: string;
    weather: WeatherData;
    language: Language;
  }) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  // Active step (1: Location, 2: User Name, 3: Language)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Location States
  const [selectedWeather, setSelectedWeather] = useState<WeatherData>(INITIAL_WEATHER);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsDetected, setGpsDetected] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingManual, setIsSearchingManual] = useState<boolean>(false);

  // Step 2: Name States
  const [userName, setUserName] = useState<string>('Anmol');
  const [nameError, setNameError] = useState<string | null>(null);

  // Step 3: Language State
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');

  // GPS Location Detector
  const handleDetectGPS = () => {
    setIsLocating(true);
    setLocationError(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('We could not detect your location. You can search for your area manually.');
      setIsLocating(false);
      return;
    }

    const requestPosition = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            if (import.meta.env.DEV) {
              console.log('[Onboarding GPS] Coordinates:', latitude, longitude);
            }
            const { weather: liveWeather, location } = await apiGetLocationWeather(latitude, longitude);
            if (liveWeather) {
              const detectedCity = location.name || 'Current location';
              setSelectedWeather({
                ...selectedWeather,
                city: detectedCity,
                state: location.state || '',
                country: 'India',
                temperature: liveWeather.temperature,
                feelsLike: liveWeather.feels_like,
                condition: liveWeather.condition,
                conditionIcon: liveWeather.condition_icon as WeatherData['conditionIcon'],
                humidity: liveWeather.humidity,
                windSpeed: liveWeather.wind_speed,
                windDirection: liveWeather.wind_direction,
                rainChance: liveWeather.rain_probability,
                lastUpdated: 'Live GPS'
              });
              setGpsDetected(true);
              setLocationError(null);
            } else {
              throw new Error('Could not parse location data');
            }
          } catch (err: any) {
            if (import.meta.env.DEV) {
              console.warn('Live location API error in onboarding:', err);
            }
            setGpsDetected(false);
            setLocationError('We could not detect your location. You can search for your area manually.');
          } finally {
            setIsLocating(false);
          }
        },
        (err) => {
          if (import.meta.env.DEV) {
            console.warn('Geolocation error in onboarding:', err);
          }
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            requestPosition(false);
            return;
          }
          setIsLocating(false);
          setGpsDetected(false);
          if (err.code === 1) {
            setLocationError('Location permission is blocked. Please allow location access in your browser settings.');
          } else {
            setLocationError('We could not detect your location. You can search for your area manually.');
          }
        },
        { timeout: highAccuracy ? 10000 : 15000, enableHighAccuracy: highAccuracy, maximumAge: 0 }
      );
    };

    requestPosition(true);
  };

  // City selection from list
  const handleSelectCity = (cityName: string) => {
    let matched = DEFAULT_WEATHER_DATA[cityName];
    if (!matched) {
      const pureCity = cityName.split(',')[0].trim();
      const foundKey = Object.keys(DEFAULT_WEATHER_DATA).find((k) =>
        k.toLowerCase().includes(pureCity.toLowerCase())
      );
      if (foundKey) matched = DEFAULT_WEATHER_DATA[foundKey];
    }

    if (!matched) {
      // Create fallback city object
      const parts = cityName.split(',');
      matched = {
        ...INITIAL_WEATHER,
        city: parts[0]?.trim() || cityName,
        state: parts[1]?.trim() || 'India'
      };
    }

    setSelectedWeather(matched);
    setGpsDetected(false);
    setLocationError(null);
    setSearchQuery('');
  };

  // Step Navigation Handlers
  const handleNextFromStep1 = () => {
    setCurrentStep(2);
  };

  const handleNextFromStep2 = () => {
    const trimmed = userName.trim();
    if (!trimmed) {
      setNameError('Please enter your name or nickname to continue');
      return;
    }
    setNameError(null);
    setCurrentStep(3);
  };

  const handleFinalSubmit = () => {
    const finalName = userName.trim() || 'Friend';
    // Persist to local storage so returning users never see this again
    try {
      localStorage.setItem('weathergpt_onboarded', 'true');
      localStorage.setItem('weathergpt_username', finalName);
      localStorage.setItem('weathergpt_language', selectedLanguage);
      localStorage.setItem('weathergpt_location', JSON.stringify(selectedWeather));
    } catch (e) {
      console.warn('LocalStorage error while saving onboarding state:', e);
    }

    // Callback to App.tsx
    onComplete({
      userName: finalName,
      weather: selectedWeather,
      language: selectedLanguage
    });
  };

  // Filtered cities list for manual search
  const popularCities = [
    'New Delhi, Delhi NCR',
    'Mumbai, Maharashtra',
    'Bengaluru, Karnataka',
    'Ahmedabad, Gujarat',
    'Dehradun, Uttarakhand',
    'Surat, Gujarat',
    'Jaipur, Rajasthan',
    'Kolkata, West Bengal',
    'Chennai, Tamil Nadu',
    'Pune, Maharashtra'
  ];

  const filteredCities = searchQuery.trim()
    ? INDIAN_CITIES.filter((c) =>
        c.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : popularCities;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white overflow-y-auto">
      {/* Background Glow Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 bg-blue-600/15 blur-3xl pointer-events-none rounded-full" />

      <div className="relative z-10 flex flex-col flex-1 w-full max-w-md mx-auto px-5 py-6 sm:py-8 justify-between">
        {/* Top Branding & Progress Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 p-0.5 shadow-lg shadow-blue-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-slate-900/40 rounded-[14px] flex items-center justify-center backdrop-blur-xs">
                  <Sparkles className="w-5 h-5 text-sky-300" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight font-heading flex items-center gap-1.5">
                  WeatherGPT <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-sans">AI Setup</span>
                </h1>
                <p className="text-[11px] text-slate-400">Navigate smarter. Stay ahead of the weather.</p>
              </div>
            </div>

            {/* Step Counter Badge */}
            <div className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-sky-300">
              Step {currentStep} of 3
            </div>
          </div>

          {/* 3-Step Animated Progress Bar */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-2">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentStep >= 1 ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-slate-800'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentStep >= 2 ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-slate-800'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentStep >= 3 ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-slate-800'
                }`}
              />
            </div>
            <div className="flex justify-between text-[10px] font-medium text-slate-400 px-1">
              <span className={currentStep === 1 ? 'text-sky-300 font-bold' : ''}>1. Location</span>
              <span className={currentStep === 2 ? 'text-sky-300 font-bold' : ''}>2. Name</span>
              <span className={currentStep === 3 ? 'text-sky-300 font-bold' : ''}>3. Language</span>
            </div>
          </div>
        </div>

        {/* Dynamic Step Body */}
        <div className="my-auto py-6">
          {/* ================= STEP 1: CURRENT LOCATION ================= */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Step 1: Set Your Location</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white font-heading">
                  Where are you located?
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  WeatherGPT tailors live radar, flood warnings, and commute safety to your exact area.
                </p>
              </div>

              {/* GPS Detection Button */}
              <button
                id="btn-detect-gps"
                onClick={handleDetectGPS}
                disabled={isLocating}
                className="w-full relative group overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-500 hover:to-sky-600 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] border border-blue-400/40 cursor-pointer disabled:opacity-75"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                      {isLocating ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      ) : (
                        <LocateFixed className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-extrabold text-sm">
                        {isLocating ? 'Detecting Your Location...' : 'Use Current Location (GPS)'}
                      </div>
                      <div className="text-[11px] text-blue-100 font-normal">
                        {isLocating ? 'Acquiring coordinates & live weather' : 'Instant 1-tap automated detection'}
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 rotate-180 text-white/80 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Error Message if GPS Fails or Denied */}
              {locationError && (
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{locationError}</span>
                </div>
              )}

              {/* Selected Location Confirmation Card */}
              {selectedWeather && (
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      {gpsDetected ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Detected via GPS</span>
                        </>
                      ) : (
                        <span>Active Selected City</span>
                      )}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Ready
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-extrabold text-white flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-sky-400" />
                        {selectedWeather.city}
                        <span className="text-xs font-normal text-slate-400">
                          , {selectedWeather.state || selectedWeather.country}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedWeather.condition} • Feels like {selectedWeather.feelsLike}°C
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-white">{selectedWeather.temperature}°C</div>
                      <div className="text-[10px] text-sky-300 font-semibold">
                        AQI {selectedWeather.aqi} ({selectedWeather.aqiStatus})
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Option to Search Manually */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsSearchingManual(!isSearchingManual)}
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center space-x-1 cursor-pointer transition"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isSearchingManual ? 'Hide manual search' : 'Or search city manually'}</span>
                  </button>
                  {isSearchingManual && (
                    <span className="text-[10px] text-slate-400">Type below to select</span>
                  )}
                </div>

                {isSearchingManual && (
                  <div className="space-y-2.5 animate-in fade-in duration-200">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search city (e.g. Ahmedabad, Mumbai, Delhi)..."
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick City Suggestions */}
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {filteredCities.map((cityName) => {
                        const isSelected = selectedWeather.city === cityName.split(',')[0].trim();
                        return (
                          <button
                            key={cityName}
                            type="button"
                            onClick={() => handleSelectCity(cityName)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600/30 border border-blue-500/50 text-white font-bold'
                                : 'bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-300'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {cityName}
                            </span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 2: USER NAME ================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Step 2: Personalization</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white font-heading">
                  What should we call you?
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  We'll use your name for daily morning briefings, travel alerts, and customized weather summaries.
                </p>
              </div>

              {/* Name Input Card */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Your First Name or Nickname
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="input-onboarding-username"
                    value={userName}
                    onChange={(e) => {
                      setUserName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNextFromStep2();
                    }}
                    placeholder="e.g. Anmol"
                    maxLength={30}
                    autoFocus
                    className="w-full pl-13 pr-4 py-3.5 bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-2xl text-base font-bold text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
                  />
                </div>

                {nameError && (
                  <p className="text-xs text-rose-400 font-medium pl-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {nameError}
                  </p>
                )}
              </div>

              {/* Quick Suggestion Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400">Quick suggestions:</span>
                <div className="flex flex-wrap gap-2">
                  {['Anmol', 'Rahul', 'Priya', 'Amit', 'Neha', 'Dr. Patel'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setUserName(chip)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        userName === chip
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Greeting Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-slate-800/60 to-blue-950/40 border border-blue-500/20 backdrop-blur-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-sky-400 flex items-center justify-center font-bold text-lg">
                    👋
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Good Morning, {userName.trim() || 'Friend'}!
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Your AI morning briefing in {selectedWeather.city} will greet you like this.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: LANGUAGE ================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-1">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Step 3: Preferred Language</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white font-heading">
                  Choose Your Language
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  WeatherGPT provides voice guidance, crop advisories, and severe flood warnings in your language.
                </p>
              </div>

              {/* Language Selection Cards */}
              <div className="space-y-3">
                {/* 1. English */}
                <button
                  type="button"
                  id="btn-lang-en"
                  onClick={() => setSelectedLanguage('en')}
                  className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    selectedLanguage === 'en'
                      ? 'bg-blue-600/25 border-blue-500 shadow-md shadow-blue-500/10'
                      : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                        selectedLanguage === 'en'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      EN
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-white">English</div>
                      <div className="text-xs text-slate-400">Standard English forecasts & AI advice</div>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                      selectedLanguage === 'en'
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {selectedLanguage === 'en' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </button>

                {/* 2. Hindi */}
                <button
                  type="button"
                  id="btn-lang-hi"
                  onClick={() => setSelectedLanguage('hi')}
                  className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    selectedLanguage === 'hi'
                      ? 'bg-blue-600/25 border-blue-500 shadow-md shadow-blue-500/10'
                      : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                        selectedLanguage === 'hi'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      हि
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-white">हिन्दी (Hindi)</div>
                      <div className="text-xs text-slate-400">दैनिक मौसम, कृषि सलाह और लाइव अलर्ट</div>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                      selectedLanguage === 'hi'
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {selectedLanguage === 'hi' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </button>

                {/* 3. Gujarati */}
                <button
                  type="button"
                  id="btn-lang-gu"
                  onClick={() => setSelectedLanguage('gu')}
                  className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    selectedLanguage === 'gu'
                      ? 'bg-blue-600/25 border-blue-500 shadow-md shadow-blue-500/10'
                      : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                        selectedLanguage === 'gu'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      ગુ
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-white">ગુજરાતી (Gujarati)</div>
                      <div className="text-xs text-slate-400">સચોટ હવામાન, ખેતી સલાહ અને ચેતવણીઓ</div>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                      selectedLanguage === 'gu'
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {selectedLanguage === 'gu' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </button>
              </div>

              {/* Language Sample Preview */}
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300">
                <span className="font-bold text-sky-400 block mb-1 text-[11px] uppercase tracking-wider">
                  Live Preview:
                </span>
                {selectedLanguage === 'en' && (
                  <p>🌤️ "Partly cloudy in {selectedWeather.city} today with 28°C. Mild rain expected in the evening."</p>
                )}
                {selectedLanguage === 'hi' && (
                  <p>🌤️ "आज {selectedWeather.city} में बादल छाए रहेंगे, तापमान 28°C रहेगा। शाम को बारिश की संभावना है।"</p>
                )}
                {selectedLanguage === 'gu' && (
                  <p>🌤️ "આજે {selectedWeather.city}માં વાદળછાયું વાતાવરણ રહેશે, તાપમાન 28°C રહેશે. સાંજે વરસાદની શક્યતા છે."</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-3">
            {/* Back Button (for Steps 2 and 3) */}
            {currentStep > 1 && (
              <button
                type="button"
                id="btn-onboarding-back"
                onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2)}
                className="px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            {/* Primary Action Button: Continue or Get Started */}
            {currentStep === 1 && (
              <button
                type="button"
                id="btn-onboarding-continue-1"
                onClick={handleNextFromStep1}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-500 hover:to-sky-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition cursor-pointer active:scale-[0.99]"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                id="btn-onboarding-continue-2"
                onClick={handleNextFromStep2}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-500 hover:to-sky-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition cursor-pointer active:scale-[0.99]"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                id="btn-onboarding-get-started"
                onClick={handleFinalSubmit}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 text-white font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2 transition cursor-pointer active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-center space-x-4 text-[11px] text-slate-500">
            <span>🔒 Preferences saved securely</span>
            <span>•</span>
            <span>Offline-ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
