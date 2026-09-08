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
import { apiGetLocationWeather, apiGetNearbyAlerts, apiResolveLocation } from './services/api';

import {
  DEFAULT_HOURLY_FORECAST,
  DEFAULT_DAILY_FORECAST,
  DEFAULT_ROUTE_TRIP,
  DEFAULT_SAVED_TRIPS,
  DEFAULT_FARMER_ADVISORY,
  INITIAL_WEATHER
} from './data/weatherData';
import { WeatherData, Language, UserRole, DemoScenario, RouteTrip, WeatherAlert } from './types';

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
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
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
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const { weather: liveWeather, location } = await apiGetLocationWeather(latitude, longitude);
          if (liveWeather) {
            const liveData: WeatherData = {
              ...weather,
              city: location.name || 'Current location',
              state: '',
              country: 'India',
              temperature: liveWeather.temperature,
              feelsLike: liveWeather.feels_like,
              condition: liveWeather.condition,
              conditionIcon: liveWeather.condition_icon as WeatherData['conditionIcon'],
              humidity: liveWeather.humidity,
              windSpeed: liveWeather.wind_speed,
              windDirection: liveWeather.wind_direction,
              rainChance: liveWeather.rain_probability,
              lastUpdated: 'Just now',
              aiRecommendation: 'This is your live weather at the detected location.',
              recommendationExplanation: { ...weather.recommendationExplanation, title: 'Live location weather' }
            };
            setWeather(liveData);
            try {
              localStorage.setItem('weathergpt_location', JSON.stringify(liveData));
            } catch (e) {}
            setLocationError(null);
            setShowCitySelector(false);
          } else throw new Error('No current weather returned');
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

  // Load only configured authoritative alerts. The backend deliberately
  // returns an empty list when no official feed is configured; the UI must
  // never replace that with demo warnings.
  useEffect(() => {
    const city = weather.city.toLowerCase();
    const coordinates = city.includes('dehradun') ? [30.3165, 78.0322] : [28.6139, 77.2090];
    apiGetNearbyAlerts(coordinates[0], coordinates[1])
      .then(setAlerts)
      .catch(() => setAlerts([]));
  }, [weather.city]);

  // Switch City
  const handleSelectCity = async (cityString: string) => {
    const cityName = cityString.split(',')[0].trim();
    try {
      const resolved = await apiResolveLocation(cityString);
      const latitude = Number(resolved?.latitude ?? resolved?.lat);
      const longitude = Number(resolved?.longitude ?? resolved?.lon ?? resolved?.lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Location coordinates unavailable');
      const { weather: liveWeather, location } = await apiGetLocationWeather(latitude, longitude);
      const liveData: WeatherData = {
        ...weather,
        city: location?.name || resolved?.name || cityName,
        state: resolved?.state || '',
        country: resolved?.country || 'India',
        temperature: liveWeather.temperature,
        feelsLike: liveWeather.feels_like,
        condition: liveWeather.condition,
        conditionIcon: liveWeather.condition_icon as WeatherData['conditionIcon'],
        humidity: liveWeather.humidity,
        windSpeed: liveWeather.wind_speed,
        windDirection: liveWeather.wind_direction,
        rainChance: liveWeather.rain_probability,
        lastUpdated: 'Just now',
        aiRecommendation: 'Live weather fetched for your selected location.',
        recommendationExplanation: { ...weather.recommendationExplanation, title: 'Live location weather' }
      };
      setWeather(liveData);
      localStorage.setItem('weathergpt_location', JSON.stringify(liveData));
    } catch (error) {
      console.warn('Live city weather unavailable:', error);
      setLocationError('Live weather could not be loaded for that city. Your previous verified weather is still shown. Please try again.');
    }
  };

  // Hackathon Demo Scenario Handler
  const handleSelectDemoScenario = async (scenario: DemoScenario) => {
    if (scenario.id === 'dehradun_rain') {
      await handleSelectCity('Dehradun, Uttarakhand');
    } else if (scenario.id === 'delhi_heatwave') {
      await handleSelectCity('Delhi NCR, India');
    } else if (scenario.id === 'kisan_irrigation') {
      await handleSelectCity('Ludhiana, Punjab');
      setShowFarmerMode(true);
    } else if (scenario.id === 'bhubaneswar_cyclone') {
      await handleSelectCity('Bhubaneswar, Odisha');
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

        {/* Dynamic Screen View Based on activeTab */}
        <div className="flex-1 min-h-0 overflow-y-auto relative">
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
              userRole={userRole}
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
            userRole={userRole}
          />
        )}
      </div>
    </div>
  );
}
