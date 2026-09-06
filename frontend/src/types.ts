export type Language = 'en' | 'hi' | 'gu';

export type UserRole = 'citizen' | 'farmer' | 'traveller' | 'researcher';

export type TemperatureUnit = 'C' | 'F';

export interface WeatherData {
  city: string;
  state: string;
  country: string;
  temperature: number;
  condition: string;
  conditionIcon: 'partly-cloudy' | 'rain' | 'thunderstorm' | 'clear' | 'fog' | 'extreme-heat';
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  rainChance: number;
  maxTemp: number;
  minTemp: number;
  aqi: number;
  aqiStatus: 'Good' | 'Moderate' | 'Poor' | 'Unhealthy' | 'Severe';
  uvIndex: number;
  pressure: number;
  visibility: number;
  lastUpdated: string;
  riskScore: number;
  riskStatus: 'Low Risk' | 'Moderate Risk' | 'Moderate-High Risk' | 'Severe Risk';
  risks: {
    rain: 'LOW' | 'MEDIUM' | 'HIGH';
    flood: 'LOW' | 'MEDIUM' | 'HIGH';
    lightning: 'LOW' | 'MEDIUM' | 'HIGH';
    heat: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  aiRecommendation: string;
  recommendationExplanation: {
    title: string;
    factors: string[];
    confidence: number;
    modelAgreement: string;
    uncertaintyNote?: string;
  };
}

export interface HourlyForecast {
  time: string;
  temp: number;
  condition: string;
  rainProb: number;
  icon: string;
}

export interface DailyForecast {
  day: string;
  date: string;
  maxTemp: number;
  minTemp: number;
  condition: string;
  rainChance: number;
  icon: string;
  summary: string;
}

export interface WeatherAlert {
  id: string;
  type: 'heavy-rain' | 'flood' | 'cyclone' | 'thunderstorm' | 'heatwave' | 'dense-fog' | 'strong-winds';
  title: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Extreme';
  location: string;
  issuedAt: string;
  description: string;
  impacts: string[];
  recommendedActions: string[];
  isActive: boolean;
  isNearby: boolean;
}

export interface RouteTrip {
  id: string;
  from: string;
  to: string;
  leaveBy: string;
  estDuration: string;
  status: string;
  statusType: 'rain' | 'clear' | 'alert';
  recommendation: string;
  weatherOnRoute?: string;
  safetyScore?: number | null;
  stops: {
    time: string;
    pointName: string;
    condition: string;
    rainProb: number | null;
    temp: number | null;
    windSpeed: number | null;
    hazard?: string;
  }[];
  alternativeAdvice: string;
}

export interface FarmerAdvisory {
  crop: string;
  growthStage: string;
  location: string;
  soilMoistureStatus: string;
  irrigationAdvice: {
    shouldIrrigate: boolean;
    urgency: 'Safe to hold' | 'Postpone' | 'Recommended' | 'Caution';
    reason: string;
  };
  pesticideAdvice: {
    safeToSpray: boolean;
    safetyScore: number; // 0 - 100
    reason: string;
  };
  temperatureStress: string;
  summaryAdvisory: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'weathergpt';
  text: string;
  timestamp: string;
  language?: Language;
  cardData?: {
    type: 'weather' | 'alert' | 'route' | 'farmer';
    payload: any;
  };
}

export interface ClimateHistoryData {
  city: string;
  years: number[];
  avgTemp: number[];
  annualRainfallMm: number[];
  extremeEventsCount: number[];
  insight: string;
}

export interface DemoScenario {
  id: string;
  title: string;
  tagline: string;
  city: string;
  description: string;
  condition: string;
  temperature: number;
  rainChance: number;
  riskScore: number;
  alertTitle: string;
}

// WeatherGPT Live Map Types
export type RouteRiskLevel = 'Low' | 'Moderate' | 'High' | 'Severe';

export interface RouteSamplingPoint {
  id: string;
  name: string;
  expectedTime: string;
  distanceFromStartKm: number;
  weatherCondition: string;
  temp: number;
  rainProb: number;
  windSpeed?: number;
  rainIntensity: 'None' | 'Light' | 'Moderate' | 'Heavy';
  waterloggingRisk: 'None' | 'Low' | 'Moderate' | 'High';
  safetyScore: number;
  hazard?: string | null;
  coords: { x: number; y: number; lat?: number; lng?: number };
}

export interface RouteRiskZone {
  id: string;
  type: 'rain' | 'waterlogging' | 'thunderstorm' | 'wind' | 'visibility';
  title: string;
  locationName: string;
  coords: { x: number; y: number; lat?: number; lng?: number };
  severity: 'Moderate' | 'High' | 'Severe';
  description: string;
  icon: string;
}

export type RouteOptionType = 'safest' | 'fastest' | 'scenic' | 'avoid';

export interface LiveMapRoute {
  id: string;
  name: string;
  badge: string;
  type: 'recommended' | 'fastest' | 'avoid' | 'alternative';
  routeOptionType?: RouteOptionType;
  weatherImpactLabel?: string;
  weatherImpactBadge?: string;
  distanceKm: number;
  durationMinutes: number;
  safetyScore: number; // 0 to 100
  summaryCondition: string;
  rainRisk: 'Low' | 'Moderate' | 'High' | 'Unavailable';
  waterloggingRisk: 'Low' | 'Moderate' | 'High' | 'Unavailable';
  thunderstormRisk?: 'Low' | 'Moderate' | 'High' | 'Unavailable';
  hazardCount: number;
  color: 'green' | 'orange' | 'red';
  strokeColor: string;
  pathPoints: { x: number; y: number }[];
  geoPoints?: [number, number][]; // [lat, lng] for Leaflet
  waypoints: RouteSamplingPoint[];
  riskZones: RouteRiskZone[];
  departureAdvice: string;
  whyThisRoute: string;
  whyWait: string;
  dataMode?: string;
  riskAvailable?: boolean;
}

export interface DepartureTimeOption {
  id: string;
  title: string;
  time: string;
  safetyScore: number;
  travelTime: string;
  statusNote: string;
  isRecommended?: boolean;
  tag?: string;
  rainRisk: 'Low' | 'Moderate' | 'High' | 'Unavailable';
  conditionIcon: string;
}

export interface NearbySafePlace {
  id: string;
  name: string;
  category: 'restaurant' | 'cafe' | 'convenience' | 'hotel' | 'petrol' | 'hospital';
  categoryLabel: string;
  rating: number;
  reviews: number;
  distanceMeters: number;
  walkingMinutes: number;
  address: string;
  coords: { x: number; y: number; lat?: number; lng?: number };
  openStatus: string;
  shelterFeature: string;
  phone?: string;
}

export interface LiveNavigationState {
  isActive: boolean;
  currentStepIndex: number;
  vehicleProgress: number; // 0 to 100%
  speedKmh: number;
  remainingDistanceKm: number;
  remainingMinutes: number;
  etaTime: string;
  currentManeuver: {
    instruction: string;
    distanceM: number;
    turnType: 'straight' | 'left' | 'right' | 'slight-right' | 'slight-left' | 'arrive';
    roadName: string;
  };
  upcomingNext10Min: {
    weather: string;
    risk: 'LOW' | 'MODERATE' | 'HIGH';
    note: string;
  };
  upcomingNext25Min: {
    in15m: string;
    in25m: string;
  };
  simulatedAlertActive: boolean;
  alternativeRouteAvailable: boolean;
}
