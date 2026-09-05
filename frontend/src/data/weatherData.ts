import { WeatherData, WeatherAlert, RouteTrip, FarmerAdvisory, ClimateHistoryData, DemoScenario, DailyForecast, HourlyForecast } from '../types';

export const INDIAN_CITIES = [
  'Dehradun, Uttarakhand',
  'New Delhi, Delhi NCR',
  'Mumbai, Maharashtra',
  'Bengaluru, Karnataka',
  'Shimla, Himachal Pradesh',
  'Ahmedabad, Gujarat',
  'Kolkata, West Bengal',
  'Chennai, Tamil Nadu',
  'Ludhiana, Punjab',
  'Bhubaneswar, Odisha'
];

export const DEFAULT_WEATHER_DATA: Record<string, WeatherData> = {
  'Dehradun, Uttarakhand': {
    city: 'Dehradun',
    state: 'Uttarakhand',
    country: 'India',
    temperature: 28,
    condition: 'Partly Cloudy',
    conditionIcon: 'partly-cloudy',
    feelsLike: 30,
    humidity: 65,
    windSpeed: 12,
    windDirection: 'NE',
    rainChance: 40,
    maxTemp: 32,
    minTemp: 24,
    aqi: 42,
    aqiStatus: 'Good',
    uvIndex: 6,
    pressure: 1012,
    visibility: 8.5,
    lastUpdated: 'Just now',
    riskScore: 72,
    riskStatus: 'Moderate-High Risk',
    risks: {
      rain: 'HIGH',
      flood: 'MEDIUM',
      lightning: 'MEDIUM',
      heat: 'LOW'
    },
    aiRecommendation: 'Heavy rainfall is expected later today. Avoid unnecessary travel between 5 PM and 8 PM.',
    recommendationExplanation: {
      title: 'Why is heavy rain expected?',
      factors: [
        'High atmospheric moisture inflow from Bay of Bengal branch',
        'Localized low pressure trough over Doon Valley foothills',
        'High-resolution WRF model predicts 45-65mm rainfall spike',
        'Recent orographic cloud buildup along Mussoorie ridge'
      ],
      confidence: 82,
      modelAgreement: 'IMD WRF and ECMWF show 82% convergence on evening squall.',
      uncertaintyNote: 'Forecast uncertainty is currently moderate because localized cloudburst cells can trigger rapid variance in rainfall intensity.'
    }
  },
  'New Delhi, Delhi NCR': {
    city: 'New Delhi',
    state: 'Delhi NCR',
    country: 'India',
    temperature: 38,
    condition: 'Hazy Sun',
    conditionIcon: 'clear',
    feelsLike: 42,
    humidity: 48,
    windSpeed: 15,
    windDirection: 'NW',
    rainChance: 15,
    maxTemp: 41,
    minTemp: 29,
    aqi: 184,
    aqiStatus: 'Unhealthy',
    uvIndex: 9,
    pressure: 1004,
    visibility: 4.0,
    lastUpdated: '10 mins ago',
    riskScore: 68,
    riskStatus: 'Moderate-High Risk',
    risks: {
      rain: 'LOW',
      flood: 'LOW',
      lightning: 'LOW',
      heat: 'HIGH'
    },
    aiRecommendation: 'High Heat Index & poor air quality. Avoid prolonged outdoor exertion between 12:00 PM and 4:30 PM. Drink plenty of water.',
    recommendationExplanation: {
      title: 'Why is heatwave warning active?',
      factors: [
        'Dry hot westerly winds blowing from Thar desert',
        'Clear skies permitting peak solar radiation',
        'Urban Heat Island (UHI) effect exacerbating concrete heat retention',
        'Weak convective circulation'
      ],
      confidence: 88,
      modelAgreement: 'Models show strong 88% agreement on sustained high temperatures across the National Capital Region.',
      uncertaintyNote: 'Minor evening dust storms may temporarily reduce surface temperatures by 2-3°C.'
    }
  },
  'Mumbai, Maharashtra': {
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    temperature: 30,
    condition: 'Thunderstorm & Showers',
    conditionIcon: 'thunderstorm',
    feelsLike: 36,
    humidity: 86,
    windSpeed: 28,
    windDirection: 'SW',
    rainChance: 85,
    maxTemp: 31,
    minTemp: 26,
    aqi: 54,
    aqiStatus: 'Moderate',
    uvIndex: 4,
    pressure: 1002,
    visibility: 3.5,
    lastUpdated: '5 mins ago',
    riskScore: 84,
    riskStatus: 'Severe Risk',
    risks: {
      rain: 'HIGH',
      flood: 'HIGH',
      lightning: 'HIGH',
      heat: 'LOW'
    },
    aiRecommendation: 'High tide combined with intense rain bands between 3 PM and 6 PM may cause severe waterlogging in Dadar, Kurla, and Hindmata. Plan journeys cautiously.',
    recommendationExplanation: {
      title: 'Why is coastal flood risk elevated?',
      factors: [
        'Astronomical High Tide of 4.38m coinciding with torrential monsoon band',
        'Offshore trough along Konkan coast bringing saturated moisture',
        'Radar reflections show convective clouds moving at 22 knots inland',
        'Urban stormwater discharge capacity constrained at low tide gates'
      ],
      confidence: 89,
      modelAgreement: '91% multi-model consensus on heavy precipitation over Mumbai metropolitan area.',
      uncertaintyNote: 'Exact waterlogging depth depends on tidal gate operations by municipal authorities.'
    }
  },
  'Bengaluru, Karnataka': {
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    temperature: 24,
    condition: 'Pleasant & Breezy',
    conditionIcon: 'partly-cloudy',
    feelsLike: 24,
    humidity: 62,
    windSpeed: 16,
    windDirection: 'W',
    rainChance: 25,
    maxTemp: 27,
    minTemp: 20,
    aqi: 38,
    aqiStatus: 'Good',
    uvIndex: 5,
    pressure: 1014,
    visibility: 9.0,
    lastUpdated: 'Just now',
    riskScore: 24,
    riskStatus: 'Low Risk',
    risks: {
      rain: 'LOW',
      flood: 'LOW',
      lightning: 'LOW',
      heat: 'LOW'
    },
    aiRecommendation: 'Weather conditions are optimal for outdoor activities and travel. Mild light drizzle possible towards Electronic City after 7 PM.',
    recommendationExplanation: {
      title: 'Why are conditions stable?',
      factors: [
        'Moderate western ghats leeward wind flow',
        'Stable atmospheric pressure gradient across the Deccan plateau',
        'Low convective instability indices'
      ],
      confidence: 93,
      modelAgreement: 'Very high consensus across all meteorological forecast feeds.'
    }
  }
};

export const CITY_WEATHER_DATABASE: Record<string, WeatherData> = {
  ...DEFAULT_WEATHER_DATA,
  'Dehradun': DEFAULT_WEATHER_DATA['Dehradun, Uttarakhand'],
  'Delhi NCR': DEFAULT_WEATHER_DATA['New Delhi, Delhi NCR'],
  'Delhi': DEFAULT_WEATHER_DATA['New Delhi, Delhi NCR'],
  'Mumbai': DEFAULT_WEATHER_DATA['Mumbai, Maharashtra'],
  'Bengaluru': DEFAULT_WEATHER_DATA['Bengaluru, Karnataka'],
  'Shimla': {
    ...DEFAULT_WEATHER_DATA['Bengaluru, Karnataka'],
    city: 'Shimla',
    state: 'Himachal Pradesh',
    temperature: 11,
    condition: 'Chilly & Light Fog',
    conditionIcon: 'fog',
    feelsLike: 10,
    humidity: 78,
    windSpeed: 8,
    rainChance: 20,
    maxTemp: 14,
    minTemp: 7,
    aqi: 22,
    aqiStatus: 'Good',
    riskScore: 28,
    riskStatus: 'Low Risk',
    risks: { rain: 'LOW', flood: 'LOW', lightning: 'LOW', heat: 'LOW' },
    aiRecommendation: 'Chilly morning fog on mountain slopes. Wear warm layers and drive cautiously on mountain curves.'
  },
  'Ahmedabad': {
    ...DEFAULT_WEATHER_DATA['New Delhi, Delhi NCR'],
    city: 'Ahmedabad',
    state: 'Gujarat',
    temperature: 43,
    condition: 'Severe Heatwave',
    conditionIcon: 'extreme-heat',
    feelsLike: 47,
    humidity: 35,
    windSpeed: 14,
    rainChance: 0,
    maxTemp: 44,
    minTemp: 31,
    aqi: 140,
    aqiStatus: 'Poor',
    riskScore: 82,
    riskStatus: 'Severe Risk',
    risks: { rain: 'LOW', flood: 'LOW', lightning: 'LOW', heat: 'HIGH' },
    aiRecommendation: 'Red Alert: Severe heatwave condition across Gujarat plains. Stay indoors during afternoon and stay well hydrated.'
  },
  'Kolkata': {
    ...DEFAULT_WEATHER_DATA['Mumbai, Maharashtra'],
    city: 'Kolkata',
    state: 'West Bengal',
    temperature: 31,
    condition: 'Heavy Monsoonal Rain',
    conditionIcon: 'rain',
    feelsLike: 37,
    humidity: 89,
    windSpeed: 22,
    rainChance: 90,
    riskScore: 78,
    riskStatus: 'Moderate-High Risk',
    risks: { rain: 'HIGH', flood: 'MEDIUM', lightning: 'MEDIUM', heat: 'LOW' },
    aiRecommendation: 'Continuous monsoon downpours reported. Waterlogging likely near low-lying city thoroughfares.'
  },
  'Chennai': {
    ...DEFAULT_WEATHER_DATA['Bengaluru, Karnataka'],
    city: 'Chennai',
    state: 'Tamil Nadu',
    temperature: 32,
    condition: 'Sunny & Coastal Breeze',
    conditionIcon: 'clear',
    feelsLike: 36,
    humidity: 70,
    windSpeed: 18,
    rainChance: 15,
    maxTemp: 34,
    minTemp: 27,
    aqi: 48,
    aqiStatus: 'Good',
    riskScore: 26,
    riskStatus: 'Low Risk',
    risks: { rain: 'LOW', flood: 'LOW', lightning: 'LOW', heat: 'LOW' },
    aiRecommendation: 'Warm coastal weather with comfortable sea breeze. Pleasant conditions along Marina Beach.'
  },
  'Ludhiana': {
    ...DEFAULT_WEATHER_DATA['Dehradun, Uttarakhand'],
    city: 'Ludhiana',
    state: 'Punjab',
    temperature: 31,
    condition: 'Overcast & Humid',
    rainChance: 80,
    humidity: 82,
    aiRecommendation: 'Heavy rain expected within next 24 hours. Postpone wheat crop irrigation to save electricity/fuel.'
  },
  'Bhubaneswar': {
    ...DEFAULT_WEATHER_DATA['Mumbai, Maharashtra'],
    city: 'Bhubaneswar',
    state: 'Odisha',
    temperature: 29,
    condition: 'Squally Coastal Winds',
    windSpeed: 45,
    rainChance: 95,
    riskScore: 92,
    riskStatus: 'Severe Risk',
    aiRecommendation: 'Deep depression intensifying into coastal storm. Fishermen advised not to venture into sea.'
  }
};

export const INITIAL_WEATHER: WeatherData = DEFAULT_WEATHER_DATA['Dehradun, Uttarakhand'];

export const DEFAULT_ALERTS: WeatherAlert[] = [
  {
    id: 'alert-1',
    type: 'heavy-rain',
    title: 'Heavy Rain Alert',
    severity: 'High',
    location: 'Dehradun & Foothills',
    issuedAt: '2h ago',
    description: 'IMD has issued an Orange Alert for torrential downpours and lightning in Dehradun, Rishikesh, and Haridwar districts.',
    impacts: [
      'Waterlogging in low-lying residential sectors and Sahastradhara road',
      'Traffic disruption and reduced visibility (< 500m) on Rajpur Road',
      'Potential localized debris flow along seasonal mountain drains'
    ],
    recommendedActions: [
      'Avoid low-lying areas and stream embankments',
      'Postpone non-essential road travel between 5:00 PM and 8:00 PM',
      'Keep mobile devices charged and carry rain protection gear'
    ],
    isActive: true,
    isNearby: true
  },
  {
    id: 'alert-2',
    type: 'flood',
    title: 'Flash Flood Watch',
    severity: 'Moderate',
    location: 'Song River Basin',
    issuedAt: '3h ago',
    description: 'Upstream catchment rainfall is rapidly elevating river water levels. Sluice gates are on standby.',
    impacts: [
      'Minor submergence of riverside agricultural tracks',
      'Silt accumulation on culverts'
    ],
    recommendedActions: [
      'Do not attempt to cross submerged bridges or low causeways',
      'Farmers should secure pump sets near riverside fields'
    ],
    isActive: true,
    isNearby: true
  },
  {
    id: 'alert-3',
    type: 'thunderstorm',
    title: 'Severe Thunderstorm & Lightning Warning',
    severity: 'High',
    location: 'Garhwal Foothills',
    issuedAt: '1h ago',
    description: 'Frequent cloud-to-ground lightning strikes detected on Doppler Radar moving eastward.',
    impacts: [
      'High risk to open field workers and two-wheeler riders',
      'Sudden wind gusts up to 45 km/h'
    ],
    recommendedActions: [
      'Seek shelter in a sturdy building immediately',
      'Do not shelter under isolated tall trees or tin sheds'
    ],
    isActive: true,
    isNearby: false
  }
];

export const DEFAULT_ROUTE_TRIP: RouteTrip = {
  id: 'trip-daily',
  from: 'Home',
  to: 'College',
  leaveBy: '08:00 AM',
  estDuration: '30 mins',
  status: 'Heavy rain possible after 9 AM',
  statusType: 'rain',
  weatherOnRoute: 'Heavy rain possible after 9 AM',
  safetyScore: 78,
  recommendation: 'Heavy rain possible after 9 AM. Leaving before 8:30 AM reduces heavy rain exposure.',
  stops: [
    { time: '08:00 AM', pointName: 'Home', condition: 'Overcast', rainProb: 25, temp: 26, windSpeed: 8 },
    { time: '08:15 AM', pointName: 'City Crossway', condition: 'Light Drizzle', rainProb: 45, temp: 26, windSpeed: 10, hazard: 'Slow traffic' },
    { time: '08:30 AM', pointName: 'College', condition: 'Moderate Showers', rainProb: 75, temp: 25, windSpeed: 14, hazard: 'Water buildup after 9 AM' }
  ],
  alternativeAdvice: 'Optimal window: Leaving before 08:30 AM avoids intense monsoon showers expected after 09:00 AM.'
};

export const DEFAULT_SAVED_TRIPS: RouteTrip[] = [
  DEFAULT_ROUTE_TRIP,
  {
    id: 'trip-office',
    from: 'Home',
    to: 'Tech Park',
    leaveBy: '09:30 AM',
    estDuration: '45 mins',
    status: 'Monsoon showers & waterlogging',
    statusType: 'rain',
    weatherOnRoute: 'Thunderstorms active between 10:00 AM - 11:30 AM',
    safetyScore: 62,
    recommendation: 'Moderate-High risk. Check route radar for low-lying waterlogged underpasses.',
    stops: [
      { time: '09:30 AM', pointName: 'Home', condition: 'Cloudy', rainProb: 30, temp: 27, windSpeed: 10 },
      { time: '10:00 AM', pointName: 'Ring Road Flyover', condition: 'Thunderstorm', rainProb: 80, temp: 25, windSpeed: 24, hazard: 'Low visibility' },
      { time: '10:15 AM', pointName: 'Tech Park Gate', condition: 'Heavy Rain', rainProb: 85, temp: 24, windSpeed: 20 }
    ],
    alternativeAdvice: 'Metro transit recommended over two-wheelers during heavy storm windows.'
  },
  {
    id: 'trip-evening',
    from: 'College',
    to: 'Home',
    leaveBy: '05:00 PM',
    estDuration: '30 mins',
    status: 'Clear & breezy evening',
    statusType: 'clear',
    weatherOnRoute: 'Clear skies with light evening breeze',
    safetyScore: 94,
    recommendation: 'Safe travel conditions. Minimal precipitation expected.',
    stops: [
      { time: '05:00 PM', pointName: 'College', condition: 'Partly Cloudy', rainProb: 15, temp: 28, windSpeed: 12 },
      { time: '05:30 PM', pointName: 'Home', condition: 'Clear', rainProb: 10, temp: 27, windSpeed: 8 }
    ],
    alternativeAdvice: 'Ideal departure window with no significant hazards detected.'
  }
];

export const DEFAULT_HOURLY_FORECAST: HourlyForecast[] = [
  { time: 'Now', temp: 28, condition: 'Partly Cloudy', rainProb: 20, icon: 'partly-cloudy' },
  { time: '11 AM', temp: 29, condition: 'Partly Cloudy', rainProb: 25, icon: 'partly-cloudy' },
  { time: '1 PM', temp: 31, condition: 'Cloudy', rainProb: 35, icon: 'cloudy' },
  { time: '3 PM', temp: 30, condition: 'Light Rain', rainProb: 55, icon: 'rain' },
  { time: '5 PM', temp: 27, condition: 'Heavy Rain', rainProb: 85, icon: 'rain' },
  { time: '7 PM', temp: 25, condition: 'Thunderstorm', rainProb: 90, icon: 'thunderstorm' },
  { time: '9 PM', temp: 24, condition: 'Moderate Rain', rainProb: 65, icon: 'rain' },
  { time: '11 PM', temp: 23, condition: 'Passing Showers', rainProb: 35, icon: 'rain' }
];

export const DEFAULT_DAILY_FORECAST: DailyForecast[] = [
  { day: 'Today', date: '4 Sep', maxTemp: 32, minTemp: 24, condition: 'Heavy Rain Evening', rainChance: 85, icon: 'rain', summary: 'Intense evening showers; travel alert active.' },
  { day: 'Sat', date: '5 Sep', maxTemp: 30, minTemp: 23, condition: 'Scattered Showers', rainChance: 60, icon: 'rain', summary: 'Moderate rain in morning, clear afternoon.' },
  { day: 'Sun', date: '6 Sep', maxTemp: 31, minTemp: 22, condition: 'Partly Sunny', rainChance: 30, icon: 'partly-cloudy', summary: 'Pleasant with light afternoon breeze.' },
  { day: 'Mon', date: '7 Sep', maxTemp: 33, minTemp: 24, condition: 'Clear Sky', rainChance: 15, icon: 'clear', summary: 'Warm, low humidity, clear mountain vistas.' },
  { day: 'Tue', date: '8 Sep', maxTemp: 33, minTemp: 25, condition: 'Sunny & Warm', rainChance: 20, icon: 'clear', summary: 'Ideal for agricultural field drying.' },
  { day: 'Wed', date: '9 Sep', maxTemp: 31, minTemp: 23, condition: 'Humid & Overcast', rainChance: 45, icon: 'cloudy', summary: 'Cloud build-up with isolated spells.' },
  { day: 'Thu', date: '10 Sep', maxTemp: 29, minTemp: 22, condition: 'Rain Spells', rainChance: 70, icon: 'rain', summary: 'Fresh moisture spell across Uttarakhand.' }
];

export const DEFAULT_FARMER_ADVISORY: FarmerAdvisory = {
  crop: 'Wheat (गेहूं / ઘઉં)',
  growthStage: 'Tillering / Crown Root',
  location: 'Doon Valley / Terai Region',
  soilMoistureStatus: 'Adequate (68%)',
  irrigationAdvice: {
    shouldIrrigate: false,
    urgency: 'Postpone',
    reason: 'Heavy rainfall (40-60mm) is expected within the next 24 hours. Postponing irrigation will prevent root waterlogging and save electricity/fuel costs.'
  },
  pesticideAdvice: {
    safeToSpray: false,
    safetyScore: 22,
    reason: 'High wind speed gusts (>18 km/h) and high wash-off risk from imminent rainfall make chemical spraying ineffective and hazardous.'
  },
  temperatureStress: 'Low thermal stress. Night temperature (23°C) is within the optimal vegetative tolerance range.',
  summaryAdvisory: 'Hold all irrigation and foliar sprays for 48 hours until the current frontal rain passes. Inspect field drainage bunds.'
};

export const DEFAULT_CLIMATE_DATA: Record<string, ClimateHistoryData> = {
  'Dehradun': {
    city: 'Dehradun',
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
    avgTemp: [22.4, 22.8, 23.1, 23.5, 23.4, 23.9, 24.1],
    annualRainfallMm: [2140, 2280, 1980, 2450, 2190, 2380, 2410],
    extremeEventsCount: [4, 6, 5, 8, 7, 9, 11],
    insight: 'Historical records show a steady increase in extreme rain burst frequencies (100mm+ in 24h) despite near-stable total seasonal volume, signaling heightened convective intensity in the Shivalik foothills.'
  },
  'Delhi': {
    city: 'Delhi NCR',
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
    avgTemp: [25.1, 25.4, 25.9, 26.2, 26.5, 26.8, 27.0],
    annualRainfallMm: [790, 1420, 810, 1020, 780, 890, 840],
    extremeEventsCount: [5, 7, 8, 9, 11, 13, 14],
    insight: 'Data reveals that heatwave days above 42°C in May-June have expanded by 4.8 days per decade on average, coupled with more concentrated, sudden monsoon rain spikes.'
  }
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'demo-1',
    title: 'Heavy Rain in Dehradun',
    tagline: 'High Rain & Flash Flood Vulnerability',
    city: 'Dehradun, Uttarakhand',
    description: 'Simulates intense mountain orographic rain with 72/100 risk, NH-7 waterlogging, and actionable travel rescheduling advice.',
    condition: 'Torrential Evening Showers',
    temperature: 28,
    rainChance: 85,
    riskScore: 72,
    alertTitle: 'Heavy Rain & Urban Waterlogging Alert'
  },
  {
    id: 'demo-2',
    title: 'Cyclone Alert on Coastal Area',
    tagline: 'Severe Wind & Storm Surge Warning',
    city: 'Bhubaneswar, Odisha',
    description: 'Simulates Severe Cyclonic Storm approaching coastal belt with 94/100 risk, 85 km/h gusts, fishing bans, and safe evacuation radius.',
    condition: 'Squally Winds & Heavy Rain',
    temperature: 27,
    rainChance: 95,
    riskScore: 94,
    alertTitle: 'Severe Cyclonic Storm Early Warning'
  },
  {
    id: 'demo-3',
    title: 'Heatwave in Delhi NCR',
    tagline: 'Extreme Temperature & Dehydration Risk',
    city: 'New Delhi, Delhi NCR',
    description: 'Simulates 43°C scorching dry westerlies, high heat index (47°C feels like), red heat advisory, and school/work timing advice.',
    condition: 'Severe Heatwave',
    temperature: 43,
    rainChance: 5,
    riskScore: 88,
    alertTitle: 'Severe Heatwave Red Alert'
  },
  {
    id: 'demo-4',
    title: 'Farmer Irrigation Decision',
    tagline: 'Agri Decision Support for Wheat/Paddy',
    city: 'Ludhiana, Punjab',
    description: 'Demonstrates WeatherGPT decision engine calculating that 80% rain within 24h saves ₹4,200/hectare by halting tube-well pumping.',
    condition: 'Overcast & Imminent Rains',
    temperature: 26,
    rainChance: 80,
    riskScore: 65,
    alertTitle: 'Agricultural Weather Advisory Active'
  }
];

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    appTitle: 'WeatherGPT',
    tagline: "Don't Just Know the Weather. Know What to Do.",
    subtitle: "Your AI Weather Intelligence Assistant",
    greeting: 'Good Morning, Anmol! 👋',
    greetingSub: "Here's your weather overview",
    currentLocation: 'Current Location',
    feelsLike: 'Feels like',
    humidity: 'Humidity',
    wind: 'Wind',
    rainChance: 'Rain Chance',
    tempRange: 'Max / Min',
    aqi: 'AQI',
    weatherRisk: 'WEATHER RISK',
    whyThis: 'Why this recommendation?',
    yourNextTrip: 'Your Next Trip',
    viewDetails: 'View Details',
    viewAll: 'View All',
    weatherAlerts: 'Weather Alerts',
    askWeatherGPT: 'Ask WeatherGPT',
    askPlaceholder: 'Ask anything about weather...',
    exploreMore: 'Explore More',
    sevenDayForecast: '7 Day Forecast',
    airQualityIndex: 'Air Quality',
    rainMap: 'Rain Map',
    cycloneTracker: 'Cyclone Tracker',
    farmerAdvisory: 'Farmer Advisory',
    climateAnalytics: 'Climate Analytics',
    navHome: 'Home',
    navMap: 'Map',
    navVoice: 'Voice',
    navChat: 'Chat',
    navProfile: 'Profile',
    whyHeading: 'WHY IS THIS WEATHER EXPECTED?',
    forecastConfidence: 'Forecast Confidence',
    modelAgreement: 'Model Agreement'
  },
  hi: {
    appTitle: 'WeatherGPT',
    tagline: 'सिर्फ मौसम मत जानो। जानो क्या करना है।',
    subtitle: 'आपका एआई मौसम बुद्धिमत्ता सहायक',
    greeting: 'शुभ प्रभात, अनमोल! 👋',
    greetingSub: 'यहाँ है आपका आज का मौसम विश्लेषण',
    currentLocation: 'वर्तमान स्थान',
    feelsLike: 'महसूस हो रहा है',
    humidity: 'नमी',
    wind: 'हवा',
    rainChance: 'बारिश की संभावना',
    tempRange: 'अधिकतम / न्यूनतम',
    aqi: 'वायु गुणवत्ता (AQI)',
    weatherRisk: 'मौसम जोखिम स्कोर',
    whyThis: 'यह सलाह क्यों दी गई?',
    yourNextTrip: 'आपकी अगली यात्रा',
    viewDetails: 'विवरण देखें',
    viewAll: 'सभी देखें',
    weatherAlerts: 'मौसम चेतावनियाँ',
    askWeatherGPT: 'WeatherGPT से पूछें',
    askPlaceholder: 'मौसम के बारे में कुछ भी पूछें...',
    exploreMore: 'और जानें',
    sevenDayForecast: '7-दिन का पूर्वानुमान',
    airQualityIndex: 'वायु गुणवत्ता',
    rainMap: 'वर्षा रडार मानचित्र',
    cycloneTracker: 'चक्रवात ट्रैकर',
    farmerAdvisory: 'किसान सलाह',
    climateAnalytics: 'जलवायु रुझान',
    navHome: 'होम',
    navMap: 'मानचित्र',
    navVoice: 'आवाज़',
    navChat: 'चैट',
    navProfile: 'प्रोफ़ाइल',
    whyHeading: 'यह मौसम क्यों अनुमानित है?',
    forecastConfidence: 'पूर्वानुमान विश्वसनीयता',
    modelAgreement: 'मॉडल सहमति'
  },
  gu: {
    appTitle: 'WeatherGPT',
    tagline: 'માત્ર હવામાન ન જાણો. જાણો શું કરવું.',
    subtitle: 'તમારું AI હવામાન બુદ્ધિમત્તા સહાયક',
    greeting: 'શુભ સવાર, અનમોલ! 👋',
    greetingSub: 'આ રહ્યું તમારા હવામાનનું સંક્ષિપ્ત વિશ્લેષણ',
    currentLocation: 'વર્તમાન સ્થળ',
    feelsLike: 'અનુભવાય છે',
    humidity: 'ભેજ',
    wind: 'પવન',
    rainChance: 'વરસાદની શક્યતા',
    tempRange: 'મહત્તમ / લઘુત્તમ',
    aqi: 'હવાની ગુણવત્તા (AQI)',
    weatherRisk: 'હવામાન જોખમ સ્કોર',
    whyThis: 'આ સલાહ શા માટે?',
    yourNextTrip: 'તમારી આગામી મુસાફરી',
    viewDetails: 'વિગતો જુઓ',
    viewAll: 'બધા જુઓ',
    weatherAlerts: 'હવામાન ચેતવણીઓ',
    askWeatherGPT: 'WeatherGPT ને પૂછો',
    askPlaceholder: 'હવામાન અંગે કંઈ પણ પૂછો...',
    exploreMore: 'વધુ શોધો',
    sevenDayForecast: '7 દિવસની આગાહી',
    airQualityIndex: 'હવા ગુણવત્તા',
    rainMap: 'વરસાદ નકશો',
    cycloneTracker: 'વાવાઝોડું ટ્રેકર',
    farmerAdvisory: 'ખેડૂત સલાહ',
    climateAnalytics: 'આબોહવા વિશ્લેષણ',
    navHome: 'હોમ',
    navMap: 'નકશો',
    navVoice: 'અવાજ',
    navChat: 'ચેટ',
    navProfile: 'પ્રોફાઇલ',
    whyHeading: 'આ હવામાન શા માટે અપેક્ષિત છે?',
    forecastConfidence: 'આગાહી વિશ્વાસપાત્રતા',
    modelAgreement: 'મોડેલ સંમતિ'
  }
};
