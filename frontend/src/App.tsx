/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GreetingSection } from './components/GreetingSection';
import { MainWeatherCard } from './components/MainWeatherCard';
import { WeatherMetricsGrid } from './components/WeatherMetricsGrid';
import { WeatherRiskSection } from './components/WeatherRiskSection';
import { YourNextTripCard } from './components/YourNextTripCard';
import { LiveMapHomeCard } from './components/LiveMapHomeCard';
import { WeatherAlertsCard } from './components/WeatherAlertsCard';
import { AskWeatherGPTCard } from './components/AskWeatherGPTCard';
import { ExploreMoreSection } from './components/ExploreMoreSection';
import { BottomNavigation, TabType } from './components/BottomNavigation';
import { AIChatScreen } from './components/AIChatScreen';
import { WeatherMapScreen } from './components/WeatherMapScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { DailyBriefingModal } from './components/DailyBriefingModal';
import { ExplainableAIModal } from './components/ExplainableAIModal';
import { TripDetailsModal } from './components/TripDetailsModal';
import { WeatherAlertsModal } from './components/WeatherAlertsModal';
import { ForecastDetailsModal } from './components/ForecastDetailsModal';
import { FarmerModeModal } from './components/FarmerModeModal';
import { ClimateAnalyticsModal } from './components/ClimateAnalyticsModal';
import { CitySelectorModal } from './components/CitySelectorModal';
import { NotificationsModal } from './components/NotificationsModal';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { getWeatherTheme } from './utils/weatherGradients';
import { apiGetLocationWeather } from './services/api';

import {
  DEFAULT_WEATHER_DATA,
  DEFAULT_HOURLY_FORECAST,
  DEFAULT_DAILY_FORECAST,
  DEFAULT_ROUTE_TRIP,
  DEFAULT_SAVED_TRIPS,
  DEFAULT_ALERTS,
  DEFAULT_FARMER_ADVISORY,
  CITY_WEATHER_DATABASE,
  INITIAL_WEATHER
} from './data/weatherData';
import { WeatherData, Language, UserRole, DemoScenario, RouteTrip } from './types';

export default function App() {
  // First-time Onboarding State
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('weathergpt_onboarded') === 'true';
    }
    return false;
  });

  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('weathergpt_username') || 'Anmol';
    }
    return 'Anmol';
  });

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('weathergpt_language');
      if (saved === 'en' || saved === 'hi' || saved === 'gu') {
        return saved;
      }
    }
    return 'en';
  });

  // Primary application state
  const [weather, setWeather] = useState<WeatherData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('weathergpt_location');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.city) return parsed;
        } catch (e) {}
      }
    }
    return INITIAL_WEATHER;
  });
  const [trip, setTrip] = useState<RouteTrip>(DEFAULT_ROUTE_TRIP);
  const [savedTrips, setSavedTrips] = useState<RouteTrip[]>(DEFAULT_SAVED_TRIPS);
  const [tripModalMode, setTripModalMode] = useState<'details' | 'new' | 'all'>('details');
  const [alerts, setAlerts] = useState(DEFAULT_ALERTS);
  const [advisory, setAdvisory] = useState(DEFAULT_FARMER_ADVISORY);

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [userRole, setUserRole] = useState<UserRole>('citizen');
  const [mapInitialLayer, setMapInitialLayer] = useState<string>('rain');
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);

  // Live Location states
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Modal dialog states
  const [showDailyBriefing, setShowDailyBriefing] = useState(false);
  const [showExplainableAI, setShowExplainableAI] = useState(false);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showWeatherAlerts, setShowWeatherAlerts] = useState(false);
  const [showForecastDetails, setShowForecastDetails] = useState(false);
  const [forecastModalTab, setForecastModalTab] = useState<'hourly' | '7day' | 'aqi'>('hourly');
  const [showFarmerMode, setShowFarmerMode] = useState(false);
  const [showClimateAnalytics, setShowClimateAnalytics] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);

  // Onboarding Completion Handler
  const handleOnboardingComplete = (data: {
    userName: string;
    weather: WeatherData;
    language: Language;
  }) => {
    setUserName(data.userName);
    setWeather(data.weather);
    setLanguage(data.language);
    setHasCompletedOnboarding(true);
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    try {
      localStorage.setItem('weathergpt_language', newLang);
    } catch (e) {}
  };

  // Live GPS Geolocation Handler
  const handleGetLiveLocation = () => {
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
              console.log('[handleGetLiveLocation] Detected GPS coordinates:', latitude, longitude);
            }
            const { weather: liveWeather, location } = await apiGetLocationWeather(latitude, longitude);
            if (liveWeather) {
              const detectedCity = location.name || 'Current location';
              const liveData: WeatherData = {
                ...weather,
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
                lastUpdated: 'Live GPS',
                aiRecommendation: `Live weather active for ${detectedCity}. Real-time radar and satellite feed connected.`,
                recommendationExplanation: { ...weather.recommendationExplanation, title: 'Live location weather' }
              };
              setWeather(liveData);
              setTrip((prev) => ({
                ...prev,
                from: detectedCity,
                originCoords: [latitude, longitude]
              } as any));
              try {
                localStorage.setItem('weathergpt_location', JSON.stringify(liveData));
                localStorage.setItem('weathergpt_user_selected_city', 'false');
              } catch (e) {}
              setLocationError(null);
              setShowCitySelector(false);
            } else {
              throw new Error('No current weather returned');
            }
          } catch (err: any) {
            if (import.meta.env.DEV) {
              console.warn('Live location API fetch error:', err);
            }
            setLocationError('We could not detect your location. You can search for your area manually.');
          } finally {
            setIsLocating(false);
          }
        },
        (err) => {
          if (import.meta.env.DEV) {
            console.warn('Geolocation error:', err);
          }
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            // Attempt standard accuracy on timeout/position issue
            requestPosition(false);
            return;
          }
          setIsLocating(false);
          if (err.code === 1) {
            setLocationError('Location permission is blocked. Please allow location access in your browser settings.');
          } else {
            setLocationError('We could not detect your location. You can search for your area manually.');
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 10000 : 15000,
          maximumAge: 0
        }
      );
    };

    requestPosition(true);
  };

  // Switch City - preserves user selection until GPS is explicitly pressed
  const handleSelectCity = (cityString: string) => {
    const cityName = cityString.split(',')[0].trim();
    let newWeather = weather;
    if (CITY_WEATHER_DATABASE[cityString]) {
      newWeather = CITY_WEATHER_DATABASE[cityString];
    } else if (CITY_WEATHER_DATABASE[cityName]) {
      newWeather = CITY_WEATHER_DATABASE[cityName];
    } else if (DEFAULT_WEATHER_DATA[cityString]) {
      newWeather = DEFAULT_WEATHER_DATA[cityString];
    } else {
      newWeather = {
        ...weather,
        city: cityName
      };
    }
    setWeather(newWeather);
    setTrip((prev) => ({
      ...prev,
      from: newWeather.city
    }));
    try {
      localStorage.setItem('weathergpt_location', JSON.stringify(newWeather));
      localStorage.setItem('weathergpt_user_selected_city', 'true');
    } catch (e) {}
  };

  // Hackathon Demo Scenario Handler
  const handleSelectDemoScenario = (scenario: DemoScenario) => {
    if (scenario.id === 'dehradun_rain') {
      setWeather(CITY_WEATHER_DATABASE['Dehradun'] || DEFAULT_WEATHER_DATA);
    } else if (scenario.id === 'delhi_heatwave') {
      setWeather(CITY_WEATHER_DATABASE['Delhi NCR']);
    } else if (scenario.id === 'kisan_irrigation') {
      setWeather(CITY_WEATHER_DATABASE['Ludhiana']);
      setShowFarmerMode(true);
    } else if (scenario.id === 'bhubaneswar_cyclone') {
      setWeather(CITY_WEATHER_DATABASE['Bhubaneswar']);
      setShowWeatherAlerts(true);
    }
  };

  // Send message directly to AI Chat
  const handleSendMessageToChat = (query: string) => {
    setChatInitialQuery(query);
    setActiveTab('chat');
  };

  // If first-time user hasn't completed onboarding, show modern 3-step setup flow
  if (!hasCompletedOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Compute dynamic weather condition theme (cool blues for clear, muted grays for rain, orange hues for heatwaves)
  const weatherTheme = getWeatherTheme(weather);

  return (
    <div
      className="min-h-screen flex items-center justify-center sm:py-6 font-sans transition-all duration-700 ease-in-out"
      style={{ background: weatherTheme.outerBackground }}
    >
      {/* Mobile-style viewport container with dynamic primary weather gradient */}
      <div
        id="app-container"
        className="w-full max-w-md h-[100dvh] sm:h-[844px] flex flex-col relative sm:rounded-[36px] shadow-2xl border border-slate-200/80 overflow-hidden transition-all duration-700 ease-in-out"
        style={{ background: weatherTheme.appBackground }}
      >
        {/* Top Status Bar (Cosmetic notch / time styling) */}
        <div className="h-6 bg-transparent shrink-0 flex items-center justify-between px-6 text-[10px] font-bold text-slate-500/80 select-none z-30">
          <span>09:41</span>
          <div className="flex items-center space-x-1.5">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Visible Floating Live Location Error Notice */}
        {locationError && (
          <div className="mx-4 mt-2 mb-1 p-3 bg-red-600/95 text-white rounded-2xl shadow-xl flex items-start justify-between space-x-2 z-40 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 border border-red-400/40">
            <div className="flex items-start space-x-2 text-xs">
              <span className="text-base leading-none mt-0.5 shrink-0">📍</span>
              <div>
                <p className="font-bold leading-tight">{locationError}</p>
                <button
                  onClick={() => {
                    setLocationError(null);
                    setShowCitySelector(true);
                  }}
                  className="mt-1.5 text-[11px] underline font-semibold text-white/95 hover:text-white cursor-pointer block"
                >
                  Search your area manually →
                </button>
              </div>
            </div>
            <button
              onClick={() => setLocationError(null)}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-white cursor-pointer shrink-0 font-bold text-xs"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dynamic Screen View Based on activeTab */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'home' && (
            <div className="h-full overflow-y-auto pb-24 scroll-smooth">
              {/* 1. Header */}
              <Header
                city={weather.city}
                country={weather.country}
                onOpenCitySelector={() => setShowCitySelector(true)}
                onOpenNotifications={() => setShowNotifications(true)}
                unreadAlertCount={alerts.filter((a) => a.isActive).length}
                onUseLiveLocation={handleGetLiveLocation}
                isLocating={isLocating}
              />

              {/* 2. Personalized Greeting & Briefing Trigger */}
              <GreetingSection
                name={userName}
                onOpenBriefing={() => setShowDailyBriefing(true)}
              />

              {/* 3. Main Blue Gradient Weather Card */}
              <MainWeatherCard
                weather={weather}
                onSelectCity={() => setShowCitySelector(true)}
                onOpenDetails={() => {
                  setForecastModalTab('hourly');
                  setShowForecastDetails(true);
                }}
                onUseLiveLocation={handleGetLiveLocation}
                isLocating={isLocating}
              />

              {/* 4. Weather Metrics Grid (Rain, Temp, Humidity, AQI) */}
              <WeatherMetricsGrid
                weather={weather}
                onOpenAQIDetails={() => {
                  setForecastModalTab('aqi');
                  setShowForecastDetails(true);
                }}
                onOpenRainForecast={() => {
                  setForecastModalTab('hourly');
                  setShowForecastDetails(true);
                }}
              />

              {/* 5. Weather Risk Score & AI Recommendation Section */}
              <WeatherRiskSection
                weather={weather}
                onOpenExplainableAI={() => setShowExplainableAI(true)}
              />

              {/* 6. Your Next Trip Card */}
              <YourNextTripCard
                trip={trip}
                onOpenTripDetails={() => {
                  setTripModalMode('details');
                  setShowTripDetails(true);
                }}
                onNewTrip={() => {
                  setTripModalMode('new');
                  setShowTripDetails(true);
                }}
                onViewAllTrips={() => {
                  setTripModalMode('all');
                  setShowTripDetails(true);
                }}
                onOpenLiveMap={() => setActiveTab('map')}
              />

              {/* 6b. Dedicated Live Weather & Radar Map Preview Card */}
              <LiveMapHomeCard
                trip={trip}
                weather={weather}
                onOpenLiveMap={() => setActiveTab('map')}
              />

              {/* 7. Weather Alerts Card */}
              <WeatherAlertsCard
                alerts={alerts}
                onOpenAlertsModal={() => setShowWeatherAlerts(true)}
              />

              {/* 8. Ask WeatherGPT Input & Suggestion Chips */}
              <AskWeatherGPTCard
                onSendMessage={handleSendMessageToChat}
                onOpenVoice={() => setShowVoiceAssistant(true)}
              />

              {/* 9. Explore More Section */}
              <ExploreMoreSection
                onOpenForecast={() => {
                  setForecastModalTab('7day');
                  setShowForecastDetails(true);
                }}
                onOpenAQI={() => {
                  setForecastModalTab('aqi');
                  setShowForecastDetails(true);
                }}
                onOpenMap={(layer) => {
                  setMapInitialLayer(layer || 'rain');
                  setActiveTab('map');
                }}
                onOpenFarmer={() => setShowFarmerMode(true)}
                onOpenClimate={() => setShowClimateAnalytics(true)}
              />
            </div>
          )}

          {activeTab === 'map' && (
            <WeatherMapScreen
              initialLayer={mapInitialLayer}
              onSelectCity={handleSelectCity}
              onBackToHome={() => setActiveTab('home')}
              onUseLiveLocation={handleGetLiveLocation}
              isLocating={isLocating}
              currentWeather={weather}
              initialTrip={trip}
              onUpdateTrip={(updatedTrip) => setTrip(updatedTrip)}
              initialLanguage={language === 'hi' ? 'hi' : 'en'}
              userRole={userRole}
            />
          )}

          {activeTab === 'chat' && (
            <AIChatScreen
              weather={weather}
              trip={trip}
              currentLanguage={language}
              onLanguageChange={handleLanguageChange}
              onBackToHome={() => {
                setChatInitialQuery(undefined);
                setActiveTab('home');
              }}
              initialQuery={chatInitialQuery}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileScreen
              userName={userName}
              onRerunOnboarding={() => setHasCompletedOnboarding(false)}
              currentLanguage={language}
              onLanguageChange={handleLanguageChange}
              userRole={userRole}
              onUserRoleChange={setUserRole}
              onSelectDemoScenario={handleSelectDemoScenario}
              onBackToHome={() => setActiveTab('home')}
            />
          )}
        </div>

        {/* Bottom Persistent Navigation Bar */}
        <BottomNavigation
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onOpenVoiceAssistant={() => setShowVoiceAssistant(true)}
        />

        {/* Modals & Dialog Overlays */}
        {showDailyBriefing && (
          <DailyBriefingModal
            weather={weather}
            isOpen={showDailyBriefing}
            onClose={() => setShowDailyBriefing(false)}
          />
        )}

        {showExplainableAI && (
          <ExplainableAIModal
            weather={weather}
            isOpen={showExplainableAI}
            onClose={() => setShowExplainableAI(false)}
          />
        )}

        {showTripDetails && (
          <TripDetailsModal
            trip={trip}
            isOpen={showTripDetails}
            currentCity={weather.city}
            onClose={() => setShowTripDetails(false)}
            onSaveTrip={(updated) => {
              setTrip(updated);
              setSavedTrips((prev) => {
                const idx = prev.findIndex((t) => t.id === updated.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = updated;
                  return next;
                }
                return [updated, ...prev];
              });
            }}
            initialMode={tripModalMode}
            savedTrips={savedTrips}
            onSelectTrip={(selected) => setTrip(selected)}
            onOpenLiveMap={() => {
              setShowTripDetails(false);
              setActiveTab('map');
            }}
          />
        )}

        {showWeatherAlerts && (
          <WeatherAlertsModal
            alerts={alerts}
            isOpen={showWeatherAlerts}
            onClose={() => setShowWeatherAlerts(false)}
          />
        )}

        {showForecastDetails && (
          <ForecastDetailsModal
            weather={weather}
            hourly={DEFAULT_HOURLY_FORECAST}
            daily={DEFAULT_DAILY_FORECAST}
            initialTab={forecastModalTab}
            isOpen={showForecastDetails}
            onClose={() => setShowForecastDetails(false)}
          />
        )}

        {showFarmerMode && (
          <FarmerModeModal
            weather={weather}
            initialAdvisory={advisory}
            isOpen={showFarmerMode}
            onClose={() => setShowFarmerMode(false)}
          />
        )}

        {showClimateAnalytics && (
          <ClimateAnalyticsModal
            isOpen={showClimateAnalytics}
            onClose={() => setShowClimateAnalytics(false)}
            currentCity={weather.city}
          />
        )}

        {showCitySelector && (
          <CitySelectorModal
            currentCity={weather.city}
            isOpen={showCitySelector}
            onClose={() => setShowCitySelector(false)}
            onSelectCity={handleSelectCity}
            onUseLiveLocation={handleGetLiveLocation}
            isLocating={isLocating}
            locationError={locationError}
          />
        )}

        {showNotifications && (
          <NotificationsModal
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            onOpenAlerts={() => setShowWeatherAlerts(true)}
            onOpenBriefing={() => setShowDailyBriefing(true)}
          />
        )}

        {showVoiceAssistant && (
          <VoiceAssistantModal
            weather={weather}
            isOpen={showVoiceAssistant}
            onClose={() => setShowVoiceAssistant(false)}
            currentLanguage={language}
            onLanguageChange={setLanguage}
          />
        )}
      </div>
    </div>
  );
}
