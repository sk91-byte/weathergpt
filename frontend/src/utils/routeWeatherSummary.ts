/**
 * WeatherGPT Route Weather & Advisory Intelligence Generator
 * Generates dynamic, context-aware summaries, recommendations, and actionable checklists
 * in English, Hindi, and Hinglish.
 */

export type AppLanguage = 'en' | 'hi' | 'hinglish' | 'gu' | string;

export interface RouteSummaryContext {
  originName: string;
  destinationName: string;
  distanceKm: number;
  durationMinutes: number;
  departureTime?: string;
  safetyScore: number | null;
  rainRisk?: string;
  waterloggingRisk?: string;
  fogRisk?: string;
  windRisk?: string;
  thunderstormRisk?: string;
  summaryCondition?: string;
  peakPrecipitationMm?: number;
  temperatureC?: number;
  userRole?: string; // 'traveller' | 'farmer' | 'citizen' | 'researcher'
}

export interface ActionSuggestion {
  id: string;
  icon: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Generates a friendly, practical route weather summary card text in the selected language.
 */
export function generateRouteWeatherSummary(
  ctx: RouteSummaryContext,
  lang: AppLanguage = 'en'
): string {
  const origin = ctx.originName.split(',')[0].trim();
  const dest = ctx.destinationName.split(',')[0].trim();
  const score = ctx.safetyScore ?? 80;
  const isRain = ctx.rainRisk === 'High' || ctx.rainRisk === 'Moderate' || (ctx.summaryCondition || '').toLowerCase().includes('rain');
  const isFlood = ctx.waterloggingRisk === 'High' || ctx.waterloggingRisk === 'Moderate';
  const isFog = ctx.fogRisk === 'High' || ctx.fogRisk === 'Moderate';
  const isStorm = ctx.thunderstormRisk === 'High';

  // Format arrival time estimate
  const now = new Date();
  const arrivalDate = new Date(now.getTime() + (ctx.durationMinutes || 30) * 60000);
  const arrivalTimeStr = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (lang === 'hi') {
    // Hindi Summary
    if (score >= 85 && !isRain && !isFlood) {
      return `आपका रास्ता (${origin} से ${dest}) अभी पूरी तरह सुरक्षित है। मौसम सामान्य और सड़कें सूखी हैं। लगभग ${arrivalTimeStr} तक पहुँचने का अनुमान है। यात्रा के लिए यह सबसे सही समय है।`;
    }
    if (isFlood || isStorm) {
      return `सावधानी! ${dest} के रास्ते में कुछ निचले इलाकों में जलभराव और तेज मौसम का जोखिम है। यदि संभव हो तो 20 मिनट रुककर निकलें या सबसे सुरक्षित (ग्रीन) रास्ता चुनें। गीली सड़कों पर गति धीमी रखें।`;
    }
    if (isRain) {
      return `आपका रास्ता अभी ज्यादातर सुरक्षित है। ${dest} के पास शाम ${arrivalTimeStr} के आसपास हल्की से मध्यम बारिश हो सकती है। छाता या रेनकोट साथ रखें और गीली सड़क पर धीरे चलें।`;
    }
    if (isFog) {
      return `${origin} से ${dest} के बीच दृश्यता कम हो सकती है और हल्का कोहरा सम्भव है। फॉग लाइट का उपयोग करें और आगे वाले वाहन से सुरक्षित दूरी बनाए रखें।`;
    }
    return `${origin} से ${dest} तक का रास्ता अनुकूल है (सुरक्षा स्कोर: ${score}/100)। समय पर निकलें और सामान्य सावधानी बरतें।`;
  }

  if (lang === 'hinglish') {
    // Hinglish Summary
    if (score >= 85 && !isRain && !isFlood) {
      return `Route (${origin} se ${dest}) abhi completely safe hai. Weather normal hai aur roads dry hain. Expected arrival around ${arrivalTimeStr} hai. Drive safe!`;
    }
    if (isFlood || isStorm) {
      return `Caution! ${dest} ke raste mein low-lying areas me paani bharne (waterlogging) ka risk hai. Ho sake toh 20 mins wait karke niklo ya Safest Green route select karo. Speed kam rakhna.`;
    }
    if (isRain) {
      return `Route abhi mostly safe hai. ${dest} ke paas around ${arrivalTimeStr} halki baarish ho sakti hai. Umbrella ya raincoat rakh lena aur wet road par slowly drive karna.`;
    }
    if (isFog) {
      return `${origin} se ${dest} ke corridor me visibility thodi kam hai (fog risk). Headlights low beam pe rakho aur safe distance maintain karo.`;
    }
    return `${origin} se ${dest} ka route overall theek hai (Safety Score: ${score}/100). On time nikal sakte hain, normal traffic rules follow karein.`;
  }

  // English Summary (Default)
  if (score >= 85 && !isRain && !isFlood) {
    return `Your route from ${origin} to ${dest} is fully clear right now. Weather is pleasant with dry road pavement. Expected arrival around ${arrivalTimeStr}. Optimal time to travel.`;
  }
  if (isFlood || isStorm) {
    return `Caution: elevated waterlogging and storm risks detected along the corridor to ${dest}. Consider waiting ~20 minutes or selecting the Safest (Green) route. Maintain moderate speeds on slick roadways.`;
  }
  if (isRain) {
    return `Your route is mostly safe right now. Light to moderate rain may appear near ${dest} around ${arrivalTimeStr}. Leave on time, keep an umbrella with you, and drive carefully on wet roads.`;
  }
  if (isFog) {
    return `Moderate fog and reduced visibility expected between ${origin} and ${dest}. Use low-beam fog headlights and maintain a safe following distance.`;
  }
  return `Your trip from ${origin} to ${dest} is calculated with a ${score}/100 safety rating. Conditions are manageable—drive attentively and stay weather-aware.`;
}

/**
 * Generates an array of actionable suggestion pills for the route.
 */
export function getActionableSuggestions(
  ctx: RouteSummaryContext,
  lang: AppLanguage = 'en'
): ActionSuggestion[] {
  const suggestions: ActionSuggestion[] = [];
  const isRain = ctx.rainRisk === 'High' || ctx.rainRisk === 'Moderate' || (ctx.summaryCondition || '').toLowerCase().includes('rain');
  const isFlood = ctx.waterloggingRisk === 'High' || ctx.waterloggingRisk === 'Moderate';
  const isFog = ctx.fogRisk === 'High' || ctx.fogRisk === 'Moderate';
  const score = ctx.safetyScore ?? 85;

  if (lang === 'hi') {
    if (isRain) {
      suggestions.push({ id: 'umbrella', icon: '☂️', text: 'छाता साथ रखें', priority: 'high' });
      suggestions.push({ id: 'raincoat', icon: '🧥', text: 'रेनकोट तैयार रखें', priority: 'high' });
      suggestions.push({ id: 'slow_down', icon: '🚗', text: 'सड़क पर गति धीमी रखें', priority: 'medium' });
    }
    if (isFlood || score < 75) {
      suggestions.push({ id: 'safest_route', icon: '🟢', text: 'सबसे सुरक्षित रास्ता चुनें', priority: 'high' });
      suggestions.push({ id: 'avoid_underpass', icon: '⚠️', text: 'निचले अंडरपास से बचें', priority: 'high' });
      suggestions.push({ id: 'wait_20', icon: '⏱️', text: '20 मिनट रुककर निकलें', priority: 'medium' });
    }
    if (isFog) {
      suggestions.push({ id: 'fog_lights', icon: '🔦', text: 'फॉग लाइट ऑन रखें', priority: 'high' });
    }
    suggestions.push({ id: 'tyre_check', icon: '🛞', text: 'टायर प्रेशर चेक करें', priority: 'low' });
    suggestions.push({ id: 'charged_phone', icon: '🔋', text: 'फ़ोन चार्ज रखें', priority: 'low' });
    suggestions.push({ id: 'water', icon: '💧', text: 'पीने का पानी रखें', priority: 'low' });
  } else if (lang === 'hinglish') {
    if (isRain) {
      suggestions.push({ id: 'umbrella', icon: '☂️', text: 'Umbrella rakh lo', priority: 'high' });
      suggestions.push({ id: 'raincoat', icon: '🧥', text: 'Raincoat ready rakho', priority: 'high' });
      suggestions.push({ id: 'slow_down', icon: '🚗', text: 'Wet road pe speed slow rakho', priority: 'medium' });
    }
    if (isFlood || score < 75) {
      suggestions.push({ id: 'safest_route', icon: '🟢', text: 'Safest green route lo', priority: 'high' });
      suggestions.push({ id: 'avoid_underpass', icon: '⚠️', text: 'Waterlogged underpass avoid karo', priority: 'high' });
      suggestions.push({ id: 'wait_20', icon: '⏱️', text: '20 mins wait karke niklo', priority: 'medium' });
    }
    if (isFog) {
      suggestions.push({ id: 'fog_lights', icon: '🔦', text: 'Fog lights on rakho', priority: 'high' });
    }
    suggestions.push({ id: 'tyre_check', icon: '🛞', text: 'Tyre pressure check karo', priority: 'low' });
    suggestions.push({ id: 'charged_phone', icon: '🔋', text: 'Phone charged rakho', priority: 'low' });
    suggestions.push({ id: 'water', icon: '💧', text: 'Water bottle saath rakho', priority: 'low' });
  } else {
    // English
    if (isRain) {
      suggestions.push({ id: 'umbrella', icon: '☂️', text: 'Carry umbrella', priority: 'high' });
      suggestions.push({ id: 'raincoat', icon: '🧥', text: 'Carry raincoat', priority: 'high' });
      suggestions.push({ id: 'slow_down', icon: '🚗', text: 'Reduce driving speed', priority: 'medium' });
    }
    if (isFlood || score < 75) {
      suggestions.push({ id: 'safest_route', icon: '🟢', text: 'Choose safest route', priority: 'high' });
      suggestions.push({ id: 'avoid_underpass', icon: '⚠️', text: 'Avoid low-lying roads', priority: 'high' });
      suggestions.push({ id: 'wait_20', icon: '⏱️', text: 'Wait 20 minutes', priority: 'medium' });
    }
    if (isFog) {
      suggestions.push({ id: 'fog_lights', icon: '🔦', text: 'Use low-beam fog lights', priority: 'high' });
    }
    suggestions.push({ id: 'tyre_check', icon: '🛞', text: 'Check tyre grip & pressure', priority: 'low' });
    suggestions.push({ id: 'charged_phone', icon: '🔋', text: 'Keep phone charged', priority: 'low' });
    suggestions.push({ id: 'water', icon: '💧', text: 'Carry drinking water', priority: 'low' });
  }

  return suggestions;
}

/**
 * Generates point-specific advice for the map point popup or timeline item.
 */
export function getPointWeatherAdvice(
  pointName: string,
  condition: string,
  tempC: number,
  rainProb: number,
  safetyScore: number,
  lang: AppLanguage = 'en'
): string {
  const isHeavyRain = rainProb >= 70;
  const isModerateRain = rainProb >= 40 && rainProb < 70;

  if (lang === 'hi') {
    if (isHeavyRain) {
      return 'यहाँ अगले 20 मिनट में तेज बारिश हो सकती है। वाहन की गति धीमी रखें और पास के सुरक्षित शेल्टर पर रुकें।';
    }
    if (isModerateRain) {
      return 'यहाँ हल्की बारिश सम्भव है। रेनकोट तैयार रखें और सतर्कता से ड्राइव करें।';
    }
    if (safetyScore >= 80) {
      return 'सड़क सूखी और सुरक्षित है। सामान्य रूप से यात्रा जारी रख सकते हैं।';
    }
    return 'सावधानी बरतें और सड़क की स्थिति पर ध्यान दें।';
  }

  if (lang === 'hinglish') {
    if (isHeavyRain) {
      return 'Yahan next 20 mins me heavy rain ho sakti hai. Slowly drive karo aur paas ke shelter me ruk jao.';
    }
    if (isModerateRain) {
      return 'Light rain start ho sakti hai. Raincoat ready rakho aur careful drive karo.';
    }
    if (safetyScore >= 80) {
      return 'Road safe and dry hai. Normal driving theek hai.';
    }
    return 'Thodi caution rakhein aur slippery surface se bachein.';
  }

  // English
  if (isHeavyRain) {
    return 'Moderate to heavy rain may start here in about 20 minutes. Drive slowly and keep your raincoat or shelter ready.';
  }
  if (isModerateRain) {
    return 'Passing showers likely in this area. Reduce speed and watch for surface spray.';
  }
  if (safetyScore >= 80) {
    return 'Normal travel is fine. Road surface is dry with good tire traction.';
  }
  return 'Exercise caution on this corridor segment; monitor live traffic & weather.';
}
