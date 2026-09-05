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
import { getCurrentWeather } from './services/backend';

export default function App() {
  // Primary application state
  const [weather, setWeather] = useState<WeatherData>(INITIAL_WEATHER);
  const [trip, setTrip] = useState<RouteTrip>(DEFAULT_ROUTE_TRIP);
  const [savedTrips, setSavedTrips] = useState<RouteTrip[]>(DEFAULT_SAVED_TRIPS);
  const [tripModalMode, setTripModalMode] = useState<'details' | 'new' | 'all'>('details');
  const [alerts, setAlerts] = useState(DEFAULT_ALERTS);
  const [advisory, setAdvisory] = useState(DEFAULT_FARMER_ADVISORY);

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [language, setLanguage] = useState<Language>('en');
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

  // Live GPS Geolocation Handler
  const handleGetLiveLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const liveData = await getCurrentWeather(latitude, longitude);
          setWeather(liveData);
          setLocationError(null);
          setShowCitySelector(false);
        } catch (err: any) {
          console.warn('Live location API fetch error:', err);
          setLocationError('Fetched coordinates, but weather radar feed failed. Please try again or select a city.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        if (err.code === 1) {
          setLocationError('Location permission was denied. Please allow location in your browser address bar.');
        } else if (err.code === 2) {
          setLocationError('Location unavailable. Check your device GPS or connection.');
        } else if (err.code === 3) {
          setLocationError('Location request timed out. Please try again.');
        } else {
          setLocationError(err.message || 'Unable to retrieve location coordinates.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Attempt auto-location if already granted by user
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'granted') {
            handleGetLiveLocation();
          }
        })
        .catch(() => {
          // Permissions API query not supported or failed
        });
    }
  }, []);

  // Switch City
  const handleSelectCity = (cityString: string) => {
    const cityName = cityString.split(',')[0].trim();
    if (CITY_WEATHER_DATABASE[cityName]) {
      setWeather(CITY_WEATHER_DATABASE[cityName]);
    } else {
      setWeather({
        ...weather,
        city: cityName
      });
    }
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

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center sm:py-6 font-sans">
      {/* Mobile-style viewport container */}
      <div
        id="app-container"
        className="w-full max-w-md h-[100dvh] sm:h-[844px] bg-slate-50 flex flex-col relative sm:rounded-[36px] shadow-2xl border border-slate-200/90 overflow-hidden"
      >
        {/* Top Status Bar (Cosmetic notch / time styling) */}
        <div className="h-6 bg-transparent shrink-0 flex items-center justify-between px-6 text-[10px] font-bold text-slate-400 select-none z-30">
          <span>09:41</span>
          <div className="flex items-center space-x-1.5">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

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
                name="Anmol"
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
            />
          )}

          {activeTab === 'chat' && (
            <AIChatScreen
              weather={weather}
              trip={trip}
              currentLanguage={language}
              onLanguageChange={setLanguage}
              onBackToHome={() => {
                setChatInitialQuery(undefined);
                setActiveTab('home');
              }}
              initialQuery={chatInitialQuery}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileScreen
              currentLanguage={language}
              onLanguageChange={setLanguage}
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
        <DailyBriefingModal
          weather={weather}
          isOpen={showDailyBriefing}
          onClose={() => setShowDailyBriefing(false)}
        />

        <ExplainableAIModal
          weather={weather}
          isOpen={showExplainableAI}
          onClose={() => setShowExplainableAI(false)}
        />

        <TripDetailsModal
          trip={trip}
          isOpen={showTripDetails}
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

        <WeatherAlertsModal
          alerts={alerts}
          isOpen={showWeatherAlerts}
          onClose={() => setShowWeatherAlerts(false)}
        />

        <ForecastDetailsModal
          weather={weather}
          hourly={DEFAULT_HOURLY_FORECAST}
          daily={DEFAULT_DAILY_FORECAST}
          initialTab={forecastModalTab}
          isOpen={showForecastDetails}
          onClose={() => setShowForecastDetails(false)}
        />

        <FarmerModeModal
          weather={weather}
          initialAdvisory={advisory}
          isOpen={showFarmerMode}
          onClose={() => setShowFarmerMode(false)}
        />

        <ClimateAnalyticsModal
          isOpen={showClimateAnalytics}
          onClose={() => setShowClimateAnalytics(false)}
          currentCity={weather.city}
        />

        <CitySelectorModal
          currentCity={weather.city}
          isOpen={showCitySelector}
          onClose={() => setShowCitySelector(false)}
          onSelectCity={handleSelectCity}
          onUseLiveLocation={handleGetLiveLocation}
          isLocating={isLocating}
          locationError={locationError}
        />

        <NotificationsModal
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          onOpenAlerts={() => setShowWeatherAlerts(true)}
          onOpenBriefing={() => setShowDailyBriefing(true)}
        />

        <VoiceAssistantModal
          weather={weather}
          isOpen={showVoiceAssistant}
          onClose={() => setShowVoiceAssistant(false)}
          currentLanguage={language}
          onLanguageChange={setLanguage}
        />
      </div>
    </div>
  );
}
