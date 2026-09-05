import { WeatherData } from '../types';

export type WeatherThemeType = 'clear' | 'rain' | 'thunderstorm' | 'heatwave' | 'fog' | 'cold';

export interface WeatherTheme {
  type: WeatherThemeType;
  label: string;
  // App-level container gradient (subtle atmospheric ambient background)
  appBackground: string;
  // Outer page ambient gradient (desktop viewport framing)
  outerBackground: string;
  // Primary weather card gradient (hero card)
  cardGradient: string;
  // Primary card shadow glow
  cardShadow: string;
  // Ambient glow inside card
  cardGlowColor: string;
  // Secondary UI highlights
  badgeBg: string;
  badgeText: string;
}

/**
 * Categorizes current weather data into a visual theme type
 */
export function getWeatherThemeType(weather?: WeatherData | null): WeatherThemeType {
  if (!weather) return 'clear';

  const cond = (weather.condition || '').toLowerCase();
  const icon = (weather.conditionIcon || '').toLowerCase();
  const temp = weather.temperature ?? 25;
  const isHighHeat = weather.risks?.heat === 'HIGH';
  const isHighRain = weather.risks?.rain === 'HIGH';

  // 1. Heatwave / Extreme Heat check (prompt: "orange hues for heatwaves")
  if (
    icon === 'extreme-heat' ||
    isHighHeat ||
    cond.includes('heatwave') ||
    cond.includes('extreme heat') ||
    (temp >= 37 && !cond.includes('rain') && !cond.includes('storm')) ||
    (cond.includes('hot') && temp >= 35) ||
    (cond.includes('hazy sun') && temp >= 36)
  ) {
    return 'heatwave';
  }

  // 2. Thunderstorm / Severe Storm check
  if (
    icon === 'thunderstorm' ||
    cond.includes('thunder') ||
    cond.includes('storm') ||
    cond.includes('lightning') ||
    cond.includes('squall') ||
    cond.includes('cyclone')
  ) {
    return 'thunderstorm';
  }

  // 3. Rain / Showers / Monsoonal Downpours (prompt: "muted grays for rain")
  if (
    icon === 'rain' ||
    isHighRain ||
    cond.includes('rain') ||
    cond.includes('shower') ||
    cond.includes('drizzle') ||
    cond.includes('monsoon') ||
    cond.includes('downpour') ||
    cond.includes('overcast')
  ) {
    return 'rain';
  }

  // 4. Fog / Mist / Smog
  if (
    icon === 'fog' ||
    cond.includes('fog') ||
    cond.includes('mist') ||
    cond.includes('haze') ||
    cond.includes('smog')
  ) {
    return 'fog';
  }

  // 5. Cold / Chilly
  if (temp <= 14 || cond.includes('cold') || cond.includes('chilly') || cond.includes('snow')) {
    return 'cold';
  }

  // 6. Clear / Sunny / Pleasant (prompt: "cool blues for clear")
  return 'clear';
}

/**
 * Returns complete color and gradient palette for the active weather condition
 */
export function getWeatherTheme(weather?: WeatherData | null): WeatherTheme {
  const themeType = getWeatherThemeType(weather);

  switch (themeType) {
    case 'heatwave':
      return {
        type: 'heatwave',
        label: 'Extreme Heat & Sun',
        // Warm peach-orange ambient wash for app container
        appBackground: 'linear-gradient(180deg, #FFEDD5 0%, #FFF7ED 28%, #FEF3C7 65%, #F8FAFC 100%)',
        // Warm ambient for desktop container
        outerBackground: 'linear-gradient(135deg, #FED7AA 0%, #FFEDD5 45%, #F1F5F9 100%)',
        // Rich vibrant orange gradient for primary weather card
        cardGradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 50%, #C2410C 100%)',
        cardShadow: '0 14px 34px -4px rgba(234, 88, 12, 0.42)',
        cardGlowColor: 'bg-amber-300/35',
        badgeBg: 'bg-amber-500/20',
        badgeText: 'text-amber-800'
      };

    case 'rain':
      return {
        type: 'rain',
        label: 'Rain & Showers',
        // Muted slate gray atmospheric wash for app container
        appBackground: 'linear-gradient(180deg, #E2E8F0 0%, #ECEFF4 28%, #F1F5F9 65%, #E2E8F0 100%)',
        // Muted gray for desktop container
        outerBackground: 'linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 50%, #F1F5F9 100%)',
        // Muted charcoal-slate grays for primary weather card
        cardGradient: 'linear-gradient(135deg, #475569 0%, #334155 52%, #1E293B 100%)',
        cardShadow: '0 14px 34px -4px rgba(51, 65, 85, 0.42)',
        cardGlowColor: 'bg-slate-300/25',
        badgeBg: 'bg-slate-500/20',
        badgeText: 'text-slate-800'
      };

    case 'thunderstorm':
      return {
        type: 'thunderstorm',
        label: 'Thunderstorm & Squall',
        // Moody storm gray ambient wash for app container
        appBackground: 'linear-gradient(180deg, #CBD5E1 0%, #DFE5EC 28%, #F1F5F9 65%, #E2E8F0 100%)',
        outerBackground: 'linear-gradient(135deg, #CBD5E1 0%, #94A3B8 50%, #E2E8F0 100%)',
        // Deep stormy charcoal-slate gradient for primary weather card
        cardGradient: 'linear-gradient(135deg, #334155 0%, #1E293B 55%, #0F172A 100%)',
        cardShadow: '0 14px 34px -4px rgba(30, 41, 59, 0.48)',
        cardGlowColor: 'bg-indigo-400/20',
        badgeBg: 'bg-indigo-500/20',
        badgeText: 'text-indigo-900'
      };

    case 'fog':
      return {
        type: 'fog',
        label: 'Fog & Low Visibility',
        // Misty pale silver-gray wash for app container
        appBackground: 'linear-gradient(180deg, #E2E8F0 0%, #EDF2F7 28%, #F8FAFC 65%, #E2E8F0 100%)',
        outerBackground: 'linear-gradient(135deg, #E2E8F0 0%, #E5E7EB 50%, #F1F5F9 100%)',
        // Muted silvery-slate gray for primary weather card
        cardGradient: 'linear-gradient(135deg, #64748B 0%, #475569 55%, #334155 100%)',
        cardShadow: '0 14px 34px -4px rgba(100, 116, 139, 0.38)',
        cardGlowColor: 'bg-slate-200/30',
        badgeBg: 'bg-slate-500/20',
        badgeText: 'text-slate-800'
      };

    case 'cold':
      return {
        type: 'cold',
        label: 'Chilly & Crisp',
        // Crisp cool icy-cyan wash for app container
        appBackground: 'linear-gradient(180deg, #E0F7FA 0%, #E0F2FE 28%, #F0FDFA 65%, #F8FAFC 100%)',
        outerBackground: 'linear-gradient(135deg, #CFFAFE 0%, #E0F2FE 50%, #F1F5F9 100%)',
        // Deep icy cyan & azure gradient for primary weather card
        cardGradient: 'linear-gradient(135deg, #0284C7 0%, #0891B2 55%, #0E7490 100%)',
        cardShadow: '0 14px 34px -4px rgba(14, 116, 144, 0.42)',
        cardGlowColor: 'bg-cyan-300/30',
        badgeBg: 'bg-cyan-500/20',
        badgeText: 'text-cyan-900'
      };

    case 'clear':
    default:
      return {
        type: 'clear',
        label: 'Clear & Pleasant Skies',
        // Cool blue sky wash for app container
        appBackground: 'linear-gradient(180deg, #E0F2FE 0%, #F0F9FF 30%, #F8FAFC 70%, #F1F5F9 100%)',
        // Cool blue wash for desktop container
        outerBackground: 'linear-gradient(135deg, #E0F2FE 0%, #F1F5F9 50%, #E2E8F0 100%)',
        // Vibrant cool blue gradient for primary weather card
        cardGradient: 'linear-gradient(135deg, #1976D2 0%, #1565C0 55%, #0D47A1 100%)',
        cardShadow: '0 14px 34px -4px rgba(25, 118, 210, 0.42)',
        cardGlowColor: 'bg-sky-400/25',
        badgeBg: 'bg-blue-500/20',
        badgeText: 'text-blue-800'
      };
  }
}
