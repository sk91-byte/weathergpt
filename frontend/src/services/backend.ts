import { WeatherData } from '../types';

const configuredBaseUrl = (import.meta.env.VITE_BACKEND_BASE_URL as string | undefined)?.trim();
export const BACKEND_BASE_URL = (configuredBaseUrl || 'https://weathergpt-bjhy.onrender.com').replace(/\/$/, '');

export function backendUrl(path: string): string {
  return `${BACKEND_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {
  const response = await fetch(backendUrl(`/weather/current?latitude=${latitude}&longitude=${longitude}`));
  if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
  const payload = await response.json();
  const current = payload.current || {};
  const temperature = Number(current.temperature_c ?? 0);
  const rain = Number(current.rain_mm ?? current.precipitation_mm ?? 0);
  const condition = String(current.condition || 'Current conditions');
  const rainChance = Math.max(0, Math.min(100, Math.round(rain > 0 ? 70 : 20)));
  const riskScore = Math.max(0, 100 - Math.round(rainChance * 0.35));
  return {
    city: 'Current location', state: '', country: 'India', temperature, condition,
    conditionIcon: /rain|drizzle|shower/i.test(condition) ? 'rain' : /storm/i.test(condition) ? 'thunderstorm' : 'partly-cloudy',
    feelsLike: Number(current.apparent_temperature_c ?? temperature), humidity: Number(current.humidity_percent ?? 0),
    windSpeed: Number(current.wind_speed_kmh ?? 0), windDirection: 'Live', rainChance,
    maxTemp: temperature, minTemp: temperature, aqi: 0, aqiStatus: 'Good', uvIndex: 0, pressure: 0, visibility: 0,
    lastUpdated: `Live data from ${payload.source || 'weather provider'}`, riskScore,
    riskStatus: riskScore > 75 ? 'Low Risk' : riskScore > 45 ? 'Moderate Risk' : 'Moderate-High Risk',
    risks: { rain: rainChance > 70 ? 'HIGH' : rainChance > 35 ? 'MEDIUM' : 'LOW', flood: 'LOW', lightning: /storm/i.test(condition) ? 'HIGH' : 'LOW', heat: temperature >= 38 ? 'HIGH' : temperature >= 32 ? 'MEDIUM' : 'LOW' },
    aiRecommendation: 'Weather data is live. Check the route view before travelling and carry suitable protection.',
    recommendationExplanation: { title: 'Live weather reading', factors: [condition, `${Math.round(temperature)}°C`], confidence: 70, modelAgreement: 'Provider data available' }
  };
}

export async function sendChatMessage(input: { message: string; language?: string; profile?: string; conversation_id?: string }) {
  const response = await fetch(backendUrl('/chat'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error(`Chat request failed (${response.status})`);
  return response.json() as Promise<{ response: string; conversation_id?: string; [key: string]: unknown }>;
}
