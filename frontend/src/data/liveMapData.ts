import { LiveMapRoute, NearbySafePlace, DepartureTimeOption, RouteRiskZone } from '../types';

export interface DestinationPreset {
  id: string;
  name: string;
  subtitle: string;
  category: 'university' | 'office' | 'transport' | 'home' | 'landmark';
  coords: { x: number; y: number; lat: number; lon: number };
  city: string;
}

export const DESTINATION_PRESETS: DestinationPreset[] = [
  {
    id: 'sushant-uni',
    name: 'Sushant University',
    subtitle: 'Golf Course Road, Sector 55, Gurugram',
    category: 'university',
    coords: { x: 74, y: 78, lat: 28.4358, lon: 77.1082 },
    city: 'Gurugram'
  },
  {
    id: 'cyber-hub',
    name: 'DLF Cyber Hub',
    subtitle: 'DLF Phase 2, NH-48, Gurugram',
    category: 'office',
    coords: { x: 58, y: 42, lat: 28.4950, lon: 77.0895 },
    city: 'Gurugram'
  },
  {
    id: 'upes-dehradun',
    name: 'Graphic Era / UPES Campus',
    subtitle: 'Bidholi / Bell Road, Dehradun, Uttarakhand',
    category: 'university',
    coords: { x: 70, y: 30, lat: 30.4160, lon: 77.9667 },
    city: 'Dehradun'
  },
  {
    id: 'delhi-airport',
    name: 'IGI Airport Terminal 3',
    subtitle: 'Aerocity, New Delhi',
    category: 'transport',
    coords: { x: 44, y: 35, lat: 28.5562, lon: 77.1000 },
    city: 'Delhi'
  },
  {
    id: 'home-vasant',
    name: 'Home (Vasant Kunj)',
    subtitle: 'Sector B, Pocket 1, New Delhi',
    category: 'home',
    coords: { x: 26, y: 24, lat: 28.5283, lon: 77.1512 },
    city: 'Delhi'
  },
  {
    id: 'tech-park',
    name: 'Electronic City Tech Park',
    subtitle: 'Hosur Road, Bengaluru',
    category: 'office',
    coords: { x: 80, y: 82, lat: 12.8399, lon: 77.6770 },
    city: 'Bengaluru'
  }
];

export const NEARBY_SAFE_PLACES: NearbySafePlace[] = [
  {
    id: 'cafe-aroma',
    name: 'Cafe Aroma & Roasters',
    category: 'cafe',
    categoryLabel: 'Specialty Cafe',
    rating: 4.8,
    reviews: 342,
    distanceMeters: 300,
    walkingMinutes: 4,
    address: 'Near Metro Pillar 142, Main Boulevard',
    coords: { x: 28, y: 28 },
    openStatus: 'Open • Cozy indoor seating',
    shelterFeature: 'Covered veranda, high-speed WiFi & charging ports',
    phone: '+91 98112 34567'
  },
  {
    id: 'bistro-olive',
    name: 'The Olive Grove Bistro',
    category: 'restaurant',
    categoryLabel: 'Multi-cuisine Restaurant',
    rating: 4.6,
    reviews: 512,
    distanceMeters: 450,
    walkingMinutes: 6,
    address: 'Galleria Commercial Block, 2nd Floor',
    coords: { x: 32, y: 32 },
    openStatus: 'Open • Full Dine-in Available',
    shelterFeature: 'Underground dry parking & spacious waiting lounge',
    phone: '+91 98110 99881'
  },
  {
    id: 'seven-eleven-mart',
    name: '24Seven Quick Convenience',
    category: 'convenience',
    categoryLabel: 'Convenience Store',
    rating: 4.4,
    reviews: 189,
    distanceMeters: 180,
    walkingMinutes: 2,
    address: 'Ground Floor, City Arcade',
    coords: { x: 24, y: 22 },
    openStatus: 'Open 24/7',
    shelterFeature: 'Dry entryway shelter, umbrellas, hot beverages',
    phone: '+91 124 4567890'
  },
  {
    id: 'novotel-lobby',
    name: 'The Grand Atrium Lounge',
    category: 'hotel',
    categoryLabel: 'Hotel Lounge',
    rating: 4.7,
    reviews: 620,
    distanceMeters: 600,
    walkingMinutes: 8,
    address: 'Asset Area 4, Aerocity Corridor',
    coords: { x: 36, y: 20 },
    openStatus: 'Open 24 Hours',
    shelterFeature: 'Valet drop, storm shelter reception & cafe',
    phone: '+91 11 4567 8000'
  },
  {
    id: 'hp-petrol',
    name: 'HP AutoCare & Canopy Stop',
    category: 'petrol',
    categoryLabel: 'Fuel & Service Canopy',
    rating: 4.2,
    reviews: 130,
    distanceMeters: 520,
    walkingMinutes: 7,
    address: 'NH-48 Service Road, Entry 3',
    coords: { x: 22, y: 36 },
    openStatus: 'Open 24/7',
    shelterFeature: 'Wide reinforced overhead roof canopy, tyre air station',
    phone: '+91 98711 22334'
  },
  {
    id: 'fortis-emergency',
    name: 'City Care Medical & Pharmacy',
    category: 'hospital',
    categoryLabel: '24/7 Clinic & Pharmacy',
    rating: 4.9,
    reviews: 840,
    distanceMeters: 750,
    walkingMinutes: 10,
    address: 'Sector Health Hub, Gate 2',
    coords: { x: 18, y: 30 },
    openStatus: 'Emergency Open 24/7',
    shelterFeature: 'Full medical safety station, emergency waiting area',
    phone: '+91 124 7111111'
  }
];

export function buildWeatherAwareRoutes(
  fromName: string = 'Current Location',
  toName: string = 'Sushant University',
  departureHourOffset: number = 0,
  scenario: 'normal' | 'no-dry-route' | 'all-high-risk' = 'normal'
): { routes: LiveMapRoute[]; departureOptions: DepartureTimeOption[] } {
  // Base timing
  const now = new Date();
  now.setMinutes(now.getMinutes() + departureHourOffset);
  const startHours = now.getHours();
  const startMinutes = now.getMinutes();

  const formatTime = (addMinutes: number) => {
    const t = new Date(now.getTime() + addMinutes * 60000);
    let h = t.getHours();
    const m = t.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m < 10 ? '0' : ''}${m} ${ampm}`;
  };

  if (scenario === 'all-high-risk') {
    const r1: LiveMapRoute = {
      id: 'route-elevated',
      name: 'Elevated Corridor Route',
      badge: '⚠️ ELEVATED RISK',
      type: 'avoid',
      distanceKm: 16.5,
      durationMinutes: 38,
      safetyScore: 42,
      summaryCondition: 'Torrential Squall & Wind',
      rainRisk: 'High',
      waterloggingRisk: 'Moderate',
      thunderstormRisk: 'High',
      hazardCount: 3,
      color: 'red',
      strokeColor: '#ef4444',
      pathPoints: [
        { x: 26, y: 24 },
        { x: 38, y: 32 },
        { x: 50, y: 48 },
        { x: 62, y: 64 },
        { x: 74, y: 78 }
      ],
      geoPoints: [
        [28.5283, 77.1512],
        [28.5050, 77.1150],
        [28.4750, 77.0950],
        [28.4450, 77.1020],
        [28.4358, 77.1082]
      ],
      waypoints: [
        { id: 'w1', name: fromName, expectedTime: formatTime(0), distanceFromStartKm: 0, weatherCondition: 'Heavy Rain', temp: 25, rainProb: 90, rainIntensity: 'Heavy', waterloggingRisk: 'Moderate', safetyScore: 45, coords: { x: 26, y: 24 } },
        { id: 'w2', name: 'Flyover Junction', expectedTime: formatTime(12), distanceFromStartKm: 5.2, weatherCondition: 'Thunderstorm', temp: 24, rainProb: 95, rainIntensity: 'Heavy', waterloggingRisk: 'High', safetyScore: 38, hazard: 'Lightning & High Crosswinds (42 km/h)', coords: { x: 42, y: 38 } },
        { id: 'w3', name: 'Ring Corridor', expectedTime: formatTime(25), distanceFromStartKm: 11.0, weatherCondition: 'Heavy Rain', temp: 24, rainProb: 85, rainIntensity: 'Heavy', waterloggingRisk: 'Moderate', safetyScore: 44, hazard: 'Low Visibility (< 200m)', coords: { x: 58, y: 58 } },
        { id: 'w4', name: toName, expectedTime: formatTime(38), distanceFromStartKm: 16.5, weatherCondition: 'Continuous Rain', temp: 23, rainProb: 90, rainIntensity: 'Heavy', waterloggingRisk: 'High', safetyScore: 40, coords: { x: 74, y: 78 } }
      ],
      riskZones: [
        { id: 'rz1', type: 'thunderstorm', title: 'Severe Thunderstorm Zone', locationName: 'Flyover Crossing', coords: { x: 44, y: 40 }, severity: 'Severe', description: 'Active cloud-to-ground lightning bolts and 45 km/h gusts', icon: '⚡' },
        { id: 'rz2', type: 'waterlogging', title: 'Waterlogging Alert', locationName: 'East Avenue Low Trench', coords: { x: 62, y: 64 }, severity: 'High', description: 'Water accumulation 15-25cm reported', icon: '🌊' }
      ],
      departureAdvice: 'Current weather conditions indicate elevated risk across all available routes. Consider delaying your journey and follow official weather and road advisories.',
      whyThisRoute: 'All routes currently feature active storm cells. We recommend postponing non-essential transit by 30-45 minutes.',
      whyWait: 'The convective storm cell is traveling eastward at 30 km/h and will clear the transit corridor shortly.'
    };

    const depOptions: DepartureTimeOption[] = [
      { id: 'dep-now', title: 'Leave Now', time: formatTime(0), safetyScore: 42, travelTime: '38 min', statusNote: 'Severe thunderstorm along route', isRecommended: false, rainRisk: 'High', conditionIcon: 'thunderstorm' },
      { id: 'dep-wait', title: 'Wait 30 Minutes', time: formatTime(30), safetyScore: 84, travelTime: '30 min', statusNote: 'Storm cell moves out; conditions drastically improve', isRecommended: true, tag: '⭐ STRONGLY RECOMMENDED', rainRisk: 'Low', conditionIcon: 'partly-cloudy' },
      { id: 'dep-later', title: 'Leave After 1 Hour', time: formatTime(60), safetyScore: 89, travelTime: '28 min', statusNote: 'Clear roadways with receding moisture', isRecommended: false, rainRisk: 'Low', conditionIcon: 'clear' }
    ];

    return { routes: [r1], departureOptions: depOptions };
  }

  // Normal / Default 3-Route Comparison:
  // Route 1: WeatherGPT Recommended (Safest Route)
  const rRecommended: LiveMapRoute = {
    id: 'route-safest',
    name: 'WeatherGPT Recommended',
    badge: '🟢 SAFEST ROUTE',
    type: 'recommended',
    distanceKm: 15.0,
    durationMinutes: 32,
    safetyScore: 92,
    summaryCondition: 'Mostly Cloudy',
    rainRisk: 'Low',
    waterloggingRisk: 'Low',
    thunderstormRisk: 'Low',
    hazardCount: 0,
    color: 'green',
    strokeColor: '#10b981', // emerald-500
    pathPoints: [
      { x: 26, y: 24 }, // Start (Home / Current Location)
      { x: 34, y: 20 }, // Elevated Ridge Bypass
      { x: 48, y: 28 }, // High Ridge Boulevard
      { x: 62, y: 46 }, // Golf Course Ext Elevated Flyover
      { x: 74, y: 64 }, // South City Link
      { x: 74, y: 78 }  // Sushant University (Destination)
    ],
    geoPoints: [
      [28.5283, 77.1512],
      [28.5085, 77.1260],
      [28.4862, 77.1004],
      [28.4610, 77.0980],
      [28.4480, 77.1040],
      [28.4358, 77.1082]
    ],
    waypoints: [
      {
        id: 'pt-0',
        name: fromName,
        expectedTime: formatTime(0),
        distanceFromStartKm: 0,
        weatherCondition: 'Mostly Cloudy',
        temp: 28,
        rainProb: 15,
        rainIntensity: 'None',
        waterloggingRisk: 'None',
        safetyScore: 95,
        coords: { x: 26, y: 24 }
      },
      {
        id: 'pt-1',
        name: 'Ridge Elevated Bypass',
        expectedTime: formatTime(7),
        distanceFromStartKm: 3.8,
        weatherCondition: 'Partly Cloudy',
        temp: 28,
        rainProb: 20,
        rainIntensity: 'Light',
        waterloggingRisk: 'None',
        safetyScore: 94,
        hazard: null,
        coords: { x: 40, y: 22 }
      },
      {
        id: 'pt-2',
        name: 'Cantonment Flyover',
        expectedTime: formatTime(18),
        distanceFromStartKm: 8.5,
        weatherCondition: 'Overcast & Breezy',
        temp: 27,
        rainProb: 25,
        rainIntensity: 'Light',
        waterloggingRisk: 'Low',
        safetyScore: 92,
        hazard: null,
        coords: { x: 55, y: 36 }
      },
      {
        id: 'pt-3',
        name: 'Golf Course Ext Arterial',
        expectedTime: formatTime(26),
        distanceFromStartKm: 12.2,
        weatherCondition: 'Light Drizzle',
        temp: 26,
        rainProb: 30,
        rainIntensity: 'Light',
        waterloggingRisk: 'Low',
        safetyScore: 90,
        hazard: 'Damp pavement, moderate traction',
        coords: { x: 70, y: 60 }
      },
      {
        id: 'pt-4',
        name: toName,
        expectedTime: formatTime(32),
        distanceFromStartKm: 15.0,
        weatherCondition: 'Passing Clouds',
        temp: 26,
        rainProb: 20,
        rainIntensity: 'None',
        waterloggingRisk: 'None',
        safetyScore: 93,
        coords: { x: 74, y: 78 }
      }
    ],
    riskZones: [
      {
        id: 'rz-green-1',
        type: 'visibility',
        title: 'Mild Mist Zone',
        locationName: 'Ridge Boulevard Junction',
        coords: { x: 48, y: 26 },
        severity: 'Moderate',
        description: 'Light evening mist; visibility remains safe (> 2.5 km)',
        icon: '🌫️'
      }
    ],
    departureAdvice: 'Excellent travel window! Taking the elevated ridge bypass reduces rain exposure by 70% and completely avoids low-lying underpass water accumulation.',
    whyThisRoute: 'We recommend this route because it utilizes elevated highways and avoids areas with higher predicted rainfall and waterlogging risk. Although it is 7 minutes longer than the fastest route, its Weather Safety Score is significantly higher (92 vs 68).',
    whyWait: 'Current rain intensity along this route is minimal (15-25%). Departing now offers a clean window before potential scattered evening showers.'
  };

  // Route 2: Fastest Route (Moderate Risk)
  const rFastest: LiveMapRoute = {
    id: 'route-fastest',
    name: 'Fastest Route',
    badge: '🟡 FASTEST ROUTE',
    type: 'fastest',
    distanceKm: 12.0,
    durationMinutes: 25,
    safetyScore: 68,
    summaryCondition: 'Scattered Showers',
    rainRisk: 'Moderate',
    waterloggingRisk: 'Moderate',
    thunderstormRisk: 'Low',
    hazardCount: 1,
    color: 'orange',
    strokeColor: '#f59e0b', // amber-500
    pathPoints: [
      { x: 26, y: 24 },
      { x: 42, y: 38 },
      { x: 52, y: 52 },
      { x: 66, y: 68 },
      { x: 74, y: 78 }
    ],
    geoPoints: [
      [28.5283, 77.1512],
      [28.4950, 77.0895],
      [28.4650, 77.0870],
      [28.4410, 77.0980],
      [28.4358, 77.1082]
    ],
    waypoints: [
      { id: 'f-0', name: fromName, expectedTime: formatTime(0), distanceFromStartKm: 0, weatherCondition: 'Overcast', temp: 28, rainProb: 35, rainIntensity: 'Light', waterloggingRisk: 'Low', safetyScore: 78, coords: { x: 26, y: 24 } },
      { id: 'f-1', name: 'Central Ring Road', expectedTime: formatTime(8), distanceFromStartKm: 4.1, weatherCondition: 'Moderate Rain', temp: 26, rainProb: 65, rainIntensity: 'Moderate', waterloggingRisk: 'Moderate', safetyScore: 68, hazard: 'Slick asphalt & brake spray', coords: { x: 42, y: 38 } },
      { id: 'f-2', name: 'Sector 56 Underpass Entry', expectedTime: formatTime(16), distanceFromStartKm: 8.0, weatherCondition: 'Steady Downpour', rainProb: 75, temp: 25, rainIntensity: 'Heavy', waterloggingRisk: 'Moderate', safetyScore: 62, hazard: '⚠️ Standing water up to 8 cm at underpass slope', coords: { x: 54, y: 54 } },
      { id: 'f-3', name: toName, expectedTime: formatTime(25), distanceFromStartKm: 12.0, weatherCondition: 'Light Rain', temp: 26, rainProb: 45, rainIntensity: 'Light', waterloggingRisk: 'Low', safetyScore: 72, coords: { x: 74, y: 78 } }
    ],
    riskZones: [
      {
        id: 'rz-orange-1',
        type: 'rain',
        title: 'Rain Zone',
        locationName: 'Central Ring Road',
        coords: { x: 44, y: 40 },
        severity: 'Moderate',
        description: 'Rain intensity peaking at 12 mm/h between 5:10 PM - 5:25 PM',
        icon: '🌧️'
      },
      {
        id: 'rz-orange-2',
        type: 'waterlogging',
        title: 'Waterlogging Risk',
        locationName: 'Sector 56 Low Underpass',
        coords: { x: 56, y: 56 },
        severity: 'Moderate',
        description: 'Known low-lying collection point; slow traffic crawling',
        icon: '🌊'
      }
    ],
    departureAdvice: 'Fastest transit time (25 min) but cuts directly through the central rain cluster and low-lying underpass. Drive with caution or choose the Safest Route.',
    whyThisRoute: 'This is the most direct geographic line saving 3 km, but carries a 68/100 safety score due to 8cm water accumulation at Sector 56 Underpass.',
    whyWait: 'If you wait 20 minutes, the rain band will have moved east, raising this route safety score from 68 to 86.'
  };

  // Route 3: Avoid If Possible (High Risk)
  const rAvoid: LiveMapRoute = {
    id: 'route-avoid',
    name: 'Avoid If Possible',
    badge: '🔴 AVOID IF POSSIBLE',
    type: 'avoid',
    distanceKm: 14.0,
    durationMinutes: 28,
    safetyScore: 35,
    summaryCondition: 'Heavy Downpour & Flooding',
    rainRisk: 'High',
    waterloggingRisk: 'High',
    thunderstormRisk: 'Moderate',
    hazardCount: 3,
    color: 'red',
    strokeColor: '#ef4444', // red-500
    pathPoints: [
      { x: 26, y: 24 },
      { x: 28, y: 48 }, // Valley Drainage Highway
      { x: 44, y: 68 }, // Low-lying Nullah Corridor
      { x: 60, y: 82 }, // Submerged underpass link
      { x: 74, y: 78 }  // Sushant University
    ],
    geoPoints: [
      [28.5283, 77.1512],
      [28.5020, 77.0780],
      [28.4720, 77.0700],
      [28.4390, 77.0890],
      [28.4358, 77.1082]
    ],
    waypoints: [
      { id: 'a-0', name: fromName, expectedTime: formatTime(0), distanceFromStartKm: 0, weatherCondition: 'Rain Building Up', temp: 27, rainProb: 60, rainIntensity: 'Moderate', waterloggingRisk: 'Low', safetyScore: 60, coords: { x: 26, y: 24 } },
      { id: 'a-1', name: 'Valley Drainage Highway', expectedTime: formatTime(10), distanceFromStartKm: 4.8, weatherCondition: 'Heavy Downpour', temp: 24, rainProb: 88, rainIntensity: 'Heavy', waterloggingRisk: 'High', safetyScore: 35, hazard: '🌊 Water runoff across lanes (> 15cm)', coords: { x: 28, y: 48 } },
      { id: 'a-2', name: 'Old Creek Underpass', expectedTime: formatTime(18), distanceFromStartKm: 9.2, weatherCondition: 'Torrential Squall', temp: 23, rainProb: 92, rainIntensity: 'Heavy', waterloggingRisk: 'High', safetyScore: 28, hazard: '⚠️ Severe waterlogging & trapped vehicles reported', coords: { x: 44, y: 68 } },
      { id: 'a-3', name: toName, expectedTime: formatTime(28), distanceFromStartKm: 14.0, weatherCondition: 'Continuous Rain', temp: 24, rainProb: 75, rainIntensity: 'Moderate', waterloggingRisk: 'Moderate', safetyScore: 48, coords: { x: 74, y: 78 } }
    ],
    riskZones: [
      {
        id: 'rz-red-1',
        type: 'waterlogging',
        title: 'Severe Waterlogging Zone',
        locationName: 'Old Creek Underpass',
        coords: { x: 42, y: 66 },
        severity: 'Severe',
        description: 'Water depth 20-35cm. High risk of engine stalling for sedans and two-wheelers.',
        icon: '🌊'
      },
      {
        id: 'rz-red-2',
        type: 'thunderstorm',
        title: 'Thunderstorm Zone',
        locationName: 'Valley Highway Cut',
        coords: { x: 30, y: 50 },
        severity: 'High',
        description: 'Frequent lightning activity and 38 km/h squalls',
        icon: '⚡'
      },
      {
        id: 'rz-red-3',
        type: 'wind',
        title: 'Strong Wind Zone',
        locationName: 'Open Basin Strip',
        coords: { x: 56, y: 78 },
        severity: 'Moderate',
        description: 'Crosswinds destabilizing light two-wheelers',
        icon: '💨'
      }
    ],
    departureAdvice: 'Extreme caution! This path crosses the valley drainage depression which floods rapidly during monsoon downpours. Strongly recommend taking Route 1 instead.',
    whyThisRoute: 'This route is categorized as AVOID because it passes through Old Creek Underpass where 25cm waterlogging has been reported. Safety score is critically low at 35/100.',
    whyWait: 'Water runoff along Valley Highway takes approximately 40 minutes to drain into municipal storm channels after rainfall tapers.'
  };

  // Departure time options for Best Departure Time AI
  const departureOptions: DepartureTimeOption[] = [
    {
      id: 'opt-now',
      title: 'Leave Now',
      time: formatTime(0),
      safetyScore: 92,
      travelTime: '32 min',
      statusNote: 'Stable conditions via Safest Route. Light drizzle possible near arrival.',
      isRecommended: false,
      rainRisk: 'Low',
      conditionIcon: 'partly-cloudy'
    },
    {
      id: 'opt-wait20',
      title: 'Wait 20 Minutes',
      time: formatTime(20),
      safetyScore: 97,
      travelTime: '30 min',
      statusNote: 'Rain intensity predicted to drop after arrival area clears.',
      isRecommended: true,
      tag: '⭐ RECOMMENDED',
      rainRisk: 'Low',
      conditionIcon: 'clear'
    },
    {
      id: 'opt-wait60',
      title: 'Leave After 1 Hour',
      time: formatTime(60),
      safetyScore: 75,
      travelTime: '34 min',
      statusNote: 'Late evening cloud accumulation may trigger secondary drizzle.',
      isRecommended: false,
      rainRisk: 'Moderate',
      conditionIcon: 'rain'
    }
  ];

  return {
    routes: [rRecommended, rFastest, rAvoid],
    departureOptions
  };
}
