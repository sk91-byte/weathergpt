import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Sparkles, Volume2, VolumeX, ArrowRight, Umbrella, CloudRain, RotateCcw, ChevronLeft, Bot, Loader2, AlertTriangle } from './Icons';
import { APP_LANGUAGES, ChatMessage, Language, WeatherData, RouteTrip, UserRole, RouteChatContext } from '../types';
import { apiGetRecommendedQuestions, apiSendChat } from '../services/api';

interface AIChatScreenProps {
  weather: WeatherData;
  trip: RouteTrip;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onBackToHome: () => void;
  initialQuery?: string;
  userRole: UserRole;
  userName?: string;
  currentCoordinates?: { latitude: number; longitude: number } | null;
  routeContext?: RouteChatContext;
}

export const AIChatScreen: React.FC<AIChatScreenProps> = ({
  weather,
  trip,
  currentLanguage,
  onLanguageChange,
  onBackToHome,
  initialQuery,
  userRole,
  userName = 'Shubham',
  currentCoordinates,
  routeContext
}) => {
  const displayName = userName.trim() || 'Shubham';
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'weathergpt',
      text: currentLanguage === 'hi'
        ? `नमस्ते ${displayName}! मैं WeatherGPT हूँ। मैं केवल मौसम नहीं बताता, बल्कि यह समझाता हूँ कि आपको क्या सावधानी रखनी चाहिए। आज आप क्या जानना चाहते हैं?`
        : currentLanguage === 'gu'
        ? `નમસ્તે ${displayName}! હું WeatherGPT છું. હું માત્ર હવામાન નથી કહેતો, પણ તમારે શું પગલાં લેવા જોઈએ તે જણાવું છું. આજે તમે શું જાણવા માગો છો?`
        : `Hello ${displayName}! I'm WeatherGPT. I can chat with you, answer your questions, explain app features, and give live weather guidance when you need it. How can I assist you today?`,
      timestamp: 'Just now'
    }
  ]);

  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Preparing your live weather context');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [serverSuggestions, setServerSuggestions] = useState<string[]>([]);
  const [deviceCoordinates, setDeviceCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptBufferRef = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(0);
      return;
    }
    const stages = [
      [18, 'Understanding your question'],
      [42, 'Loading live weather data'],
      [68, 'Preparing persona-aware context'],
      [84, 'Generating your response'],
    ] as const;
    let index = 0;
    setLoadingProgress(8);
    setLoadingStage(stages[0][1]);
    const timer = window.setInterval(() => {
      if (index < stages.length - 1) index += 1;
      setLoadingProgress(stages[index][0]);
      setLoadingStage(stages[index][1]);
    }, 900);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (initialQuery) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  // A language or live-weather change starts a fresh suggestion set. The next
  // server response replaces these with conversation-aware suggestions.
  useEffect(() => {
    setServerSuggestions([]);
    apiGetRecommendedQuestions(userRole, currentLanguage === 'hi' ? 'hi' : currentLanguage === 'gu' ? 'gu' : 'en', Boolean(trip.from && trip.to))
      .then((questions) => { if (questions.length) setServerSuggestions(questions); })
      .catch(() => { /* local persona suggestions remain available */ });
  }, [currentLanguage, userRole, trip.from, trip.to, weather.city, weather.temperature, weather.rainChance]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const isRainLikely = weather.rainChance >= 40 || /rain|storm|shower/i.test(weather.condition);
  const isHot = weather.temperature >= 35;
  const localSuggestions = currentLanguage === 'hi'
    ? (isRainLikely
      ? ['आज बारिश के लिए क्या तैयारी करूं?', 'क्या छाता और रेनकोट साथ रखूं?', 'क्या अभी बाहर जाना सुरक्षित है?', 'बारिश से यात्रा पर क्या असर होगा?']
      : isHot
        ? ['आज गर्मी से कैसे बचूं?', 'क्या दोपहर में बाहर जाना सुरक्षित है?', 'आज कितना पानी पीना चाहिए?', 'मौसम के अनुसार क्या पहनूं?']
        : ['आज का मौसम कैसा रहेगा?', 'क्या आज बाहर जाना सुरक्षित है?', 'आज मुझे क्या साथ रखना चाहिए?', 'मुख्य मौसम जोखिम समझाइए।'])
    : currentLanguage === 'gu'
      ? (isRainLikely
        ? ['આજે વરસાદ માટે શું તૈયારી કરું?', 'શું છત્રી અને રેઇનકોટ સાથે રાખું?', 'શું અત્યારે બહાર જવું સલામત છે?', 'વરસાદથી મુસાફરી પર શું અસર થશે?']
        : ['આજે બહાર જવું સલામત છે?', 'આજે શું સાથે રાખવું જોઈએ?', 'મુખ્ય હવામાન જોખમ સમજાવો.', 'આજની આગાહી સમજાવો.'])
      : (isRainLikely
        ? ['What should I prepare for the rain?', 'Should I carry an umbrella or raincoat?', 'Is it safe to go outside now?', 'Will rain affect my travel?']
        : isHot
          ? ['How should I stay safe in today’s heat?', 'Is it safe to go outside this afternoon?', 'How much water should I carry?', 'What should I wear today?']
          : ['What will today’s weather be like?', 'Is it safe to go outside today?', 'What should I carry today?', 'Explain the main weather risk.']);
  const suggestions = serverSuggestions.length ? serverSuggestions : localSuggestions;

  const followUpSuggestionsFor = (question: string): string[] => {
    const text = question.toLowerCase();
    const isRain = /rain|rainfall|umbrella|बारिश|वर्षा|छाता|વરસાદ|છત્રી/i.test(text);
    const isSafety = /safe|risk|danger|बाहर|सुरक्षित|જોખમ|સલામત/i.test(text);
    const isTravel = /travel|route|drive|journey|यात्रा|रास्ता|મુસાફરી|રસ્તો/i.test(text);
    if (currentLanguage === 'hi') {
      if (isTravel) return ['क्या मुझे अभी निकलना चाहिए?', 'रास्ते में बारिश होगी?', 'यात्रा में क्या साथ रखूं?', 'रूट का मौसम जोखिम क्या है?'];
      if (isRain) return ['क्या मुझे छाता या रेनकोट रखना चाहिए?', 'बारिश कब तक रहेगी?', 'क्या बारिश से बाहर जाना सुरक्षित है?', 'बारिश से यात्रा पर क्या असर होगा?'];
      if (isSafety) return ['मुख्य मौसम जोखिम क्या है?', 'मुझे क्या सावधानी रखनी चाहिए?', 'क्या बाद में निकलना बेहतर होगा?', 'आज क्या साथ रखना चाहिए?'];
      return ['आज का तापमान कितना रहेगा?', 'क्या आज बारिश होगी?', 'आज बाहर जाने का सबसे अच्छा समय क्या है?', 'आज क्या साथ रखना चाहिए?'];
    }
    if (currentLanguage === 'gu') {
      if (isTravel) return ['શું મારે અત્યારે નીકળવું જોઈએ?', 'રસ્તામાં વરસાદ પડશે?', 'મુસાફરીમાં શું સાથે રાખવું?', 'રૂટનું હવામાન જોખમ શું છે?'];
      if (isRain) return ['શું છત્રી કે રેઇનકોટ સાથે રાખું?', 'વરસાદ કેટલો સમય રહેશે?', 'વરસાદમાં બહાર જવું સલામત છે?', 'વરસાદથી મુસાફરી પર શું અસર થશે?'];
      if (isSafety) return ['મુખ્ય હવામાન જોખમ શું છે?', 'મારે કઈ સાવચેતી રાખવી?', 'શું પછી નીકળવું વધુ સારું રહેશે?', 'આજે શું સાથે રાખવું?'];
      return ['આજે તાપમાન કેટલું રહેશે?', 'આજે વરસાદ પડશે?', 'આજે બહાર જવાનો શ્રેષ્ઠ સમય કયો છે?', 'આજે શું સાથે રાખવું?'];
    }
    if (isTravel) return ['Should I leave now?', 'Will it rain along the route?', 'What should I carry for the journey?', 'What is the route weather risk?'];
    if (isRain) return ['Should I carry an umbrella or raincoat?', 'How long will the rain last?', 'Is it safe to go outside in the rain?', 'Will rain affect my travel?'];
    if (isSafety) return ['What is the main weather risk?', 'What precautions should I take?', 'Would it be better to leave later?', 'What should I carry today?'];
    return ['What temperature should I expect today?', 'Will it rain today?', 'When is the best time to go outside?', 'What should I carry today?'];
  };

  // Use only the weather already loaded in the app if the chat backend is
  // temporarily unavailable. This never invents a forecast.
  const localWeatherFallback = (question: string): string | null => {
    if (/(tomorrow|forecast|next few days|कल|पूर्वानुमान|આગાહી)/i.test(question)) return null;
    const temperatureValue = Number(weather.temperature);
    if (!Number.isFinite(temperatureValue)) return null;
    const rainValue = Number(weather.rainChance);
    const windValue = Number(weather.windSpeed);
    const temperature = `${temperatureValue}°C`;
    const rainChance = Number.isFinite(rainValue) ? `${rainValue}%` : 'unavailable';
    const wind = Number.isFinite(windValue) ? `${windValue} km/h` : 'unavailable';
    const isSafetyQuestion = /safe|risk|danger|outside|सुरक्षित|जोखिम|बाहर|સલામત|જોખમ/i.test(question);
    if (isSafetyQuestion) {
      const caution = rainValue >= 60 || windValue >= 35
        ? 'Use extra caution and consider waiting for conditions to improve.'
        : rainValue >= 30
        ? 'Conditions may change, so carry rain protection and check again before leaving.'
        : 'No strong rain or wind signal is present in the loaded data, but conditions can change.';
      if (currentLanguage === 'hi') return `${weather.city} में अभी तापमान ${temperature}, बारिश की संभावना ${rainChance} और हवा ${wind} है। ${caution} यह केवल ऐप में लोड वर्तमान मौसम डेटा पर आधारित है, पूर्ण सुरक्षा की गारंटी नहीं।`;
      if (currentLanguage === 'gu') return `${weather.city}માં અત્યારે તાપમાન ${temperature}, વરસાદની શક્યતા ${rainChance} અને પવન ${wind} છે. ${caution} આ ફક્ત એપમાં લોડ થયેલા વર્તમાન હવામાન ડેટા પર આધારિત છે, સંપૂર્ણ સલામતીની ગેરંટી નથી.`;
      return `Current conditions for ${weather.city}: ${temperature}, rain probability ${rainChance}, and wind ${wind}. ${caution} This uses the current weather already loaded in the app and is not a guarantee of safety.`;
    }
    if (currentLanguage === 'hi') {
      return `${weather.city} का अभी का मौसम ${weather.condition} और ${temperature} है। बारिश की संभावना ${rainChance} और हवा की गति ${wind} है। यह जवाब ऐप में लोड किए गए लाइव मौसम डेटा पर आधारित है। पूर्वानुमान के लिए बाद में फिर कोशिश करें।`;
    }
    if (currentLanguage === 'gu') {
      return `${weather.city}માં અત્યારે હવામાન ${weather.condition} અને તાપમાન ${temperature} છે. વરસાદની શક્યતા ${rainChance} અને પવનની ઝડપ ${wind} છે. આ જવાબ એપમાં લોડ થયેલા લાઇવ ડેટા પર આધારિત છે. આગાહી માટે થોડા સમય પછી ફરી પ્રયાસ કરો.`;
    }
    return `Current conditions for ${weather.city}: ${weather.condition}, ${temperature}. Rain probability is ${rainChance} and wind speed is ${wind}. This answer uses the live weather data already loaded in the app. Please try again later for a forecast.`;
  };

  const needsCurrentLocation = (text: string) => {
    const value = text.trim().toLowerCase();
    const explicitlyNearby = /(weather of my location|weather near me|weather around me|near me|my current location|where i am|mere paas|meri location|मेरे पास|मेरी लोकेशन|मेरे आसपास|અહીં|મારી લોકેશન)/i.test(value);
    if (explicitlyNearby) return true;

    // Generic weather questions are implicitly about the user's current
    // location. Without this, queries such as "Will it rain today?" were sent
    // without coordinates and the backend had to ask for a city instead of
    // reaching the live weather/LLM pipeline.
    const isWeatherQuestion = /(weather|rain|rainfall|forecast|temperature|hot|cold|humid|wind|umbrella|raincoat|outside|मौसम|बारिश|वर्षा|तापमान|गर्मी|ठंड|छाता|બારીશ|વરસાદ|હવામાન|તાપમાન|છત્રી)/i.test(value);
    if (!isWeatherQuestion) return false;

    // If the user explicitly names a place, let the backend resolve that
    // place rather than overriding it with device GPS.
    const hasNamedPlace = /\b(?:in|at|for|near)\s+[a-z][a-z .'-]{1,50}(?:\?|$)/i.test(value)
      || /(?:में|मे|के लिए|માં|માટે)\s+[\u0900-\u097F\u0A80-\u0AFFA-Za-z][\u0900-\u097F\u0A80-\u0AFFA-Za-z .'-]{1,50}(?:\?|$)/i.test(value);
    return !hasNamedPlace;
  };

  const requestDeviceCoordinates = () => new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setDeviceCoordinates(coordinates);
        resolve(coordinates);
      },
      () => reject(new Error('Location permission is required for weather near you.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });

  const toggleVoiceInput = () => {
    setVoiceError(null);

    if (isListeningVoice) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListeningVoice(false);
      const spoken = transcriptBufferRef.current.trim();
      if (spoken) {
        handleSendMessage(spoken);
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    try {
      transcriptBufferRef.current = '';
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : currentLanguage === 'gu' ? 'gu-IN' : 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListeningVoice(true);
      };

      recognition.onresult = (event: any) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript;
        }
        transcriptBufferRef.current = combined;
        setInputVal(combined);
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice input error:', event.error);
        setIsListeningVoice(false);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission blocked. Please allow microphone in browser settings.');
        } else if (event.error === 'network') {
          setVoiceError('Speech service connection error. Please try again.');
        }
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
        const spoken = transcriptBufferRef.current.trim();
        if (spoken) {
          handleSendMessage(spoken);
        }
      };

      recognition.start();
    } catch (err: any) {
      setIsListeningVoice(false);
      setVoiceError('Unable to start microphone.');
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    const questionNeedsWeather = needsCurrentLocation(textToSend);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    // Update chips immediately from the question itself. They no longer stay
    // stuck on the initial catalogue when Gemini or the backend is unavailable.
    setServerSuggestions(followUpSuggestionsFor(textToSend));
    setLoadingProgress(8);
    setLoadingStage('Understanding your question');
    setLoading(true);

    try {
      let coordinates = deviceCoordinates;
      if (questionNeedsWeather && !coordinates && currentCoordinates) {
        coordinates = currentCoordinates;
        setDeviceCoordinates(currentCoordinates);
      }
      if (questionNeedsWeather && !coordinates) {
        try {
          coordinates = await requestDeviceCoordinates();
        } catch (locationError) {
          // A blocked GPS prompt should not make chat unusable. The backend
          // can resolve the selected city as a fallback.
          console.warn('Chat location permission unavailable; using selected city:', locationError);
        }
      }
      const data = await apiSendChat(textToSend, {
        conversation_id: conversationId,
        language: currentLanguage,
        role: userRole,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        location: weather.city,
        route_context: routeContext || { from: trip.from, to: trip.to, leave_by: trip.leaveBy }
      });
      if (data.conversation_id) setConversationId(data.conversation_id);
      if (Array.isArray(data.suggestions)) setServerSuggestions(data.suggestions);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'weathergpt',
        text: data.response || data.message || data.answer || data.reply || 'WeatherGPT did not return a response. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: currentLanguage,
        cardData: {
          type: 'weather',
          payload: {
            ai_used: data.ai_used,
            fallback_used: data.fallback_used,
            fallback_reason: data.fallback_reason,
            intent: data.intent,
            data_source: data.data_source,
            is_live: data.is_live,
            llm_provider: data.llm_provider,
            llm_model: data.llm_model,
            weather_timestamp: data.weather_timestamp,
            response_source: data.response_source,
            retrieved_at: data.retrieved_at,
            source_metadata: data.source_metadata,
          },
        },
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.warn('Chat request failed:', err);
      const localAnswer = questionNeedsWeather ? localWeatherFallback(textToSend) : null;
      const serviceUnavailable = currentLanguage === 'hi'
        ? 'WeatherGPT अभी अस्थायी रूप से उपलब्ध नहीं है। जो मौसम डेटा ऐप में पहले से लोड है, उसके आधार पर ऊपर की जानकारी दी गई है। कृपया थोड़ी देर बाद फिर कोशिश करें।'
        : currentLanguage === 'gu'
        ? 'WeatherGPT હાલમાં થોડા સમય માટે ઉપલબ્ધ નથી. ઉપરની માહિતી એપમાં પહેલેથી લોડ થયેલા હવામાન ડેટા પર આધારિત છે. થોડી વાર પછી ફરી પ્રયાસ કરો.'
        : 'WeatherGPT is temporarily unavailable. The information above uses weather data already loaded in the app. Please try again shortly.';
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'weathergpt',
        text: localAnswer
          || (err instanceof Error && err.message.includes('Location permission')
          ? (currentLanguage === 'hi'
            ? 'आपके आसपास का मौसम बताने के लिए स्थान की अनुमति चाहिए। कृपया ब्राउज़र में Location Allow करें और फिर दोबारा पूछें।'
            : currentLanguage === 'gu'
            ? 'તમારા આસપાસનું હવામાન બતાવવા માટે લોકેશનની પરવાનગી જોઈએ. બ્રાઉઝરમાં Location Allow કરો અને ફરી પૂછો.'
            : 'I need your location to answer that. Please allow Location access in your browser and ask again.')
          : serviceUnavailable),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cardData: {
          type: 'weather',
          payload: {
            ai_used: false,
            fallback_used: Boolean(localAnswer),
            fallback_reason: localAnswer ? 'backend_request_failed_used_loaded_weather' : 'backend_request_failed',
            data_source: localAnswer ? 'loaded_weather_card' : 'conversation',
            is_live: Boolean(localAnswer),
          },
        },
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoadingProgress(100);
      setLoading(false);
    }
  };

  const handleSpeak = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (currentLanguage === 'hi') {
      utterance.lang = 'hi-IN';
    } else if (currentLanguage === 'gu') {
      utterance.lang = 'gu-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 select-none">
      {/* Chat Top Appbar */}
      <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBackToHome}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 font-heading flex items-center gap-1">
                WeatherGPT AI Assistant
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">Grounded in live provider data</p>
            </div>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center max-w-[58vw] overflow-x-auto bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
          {APP_LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => onLanguageChange(language.code)}
              className={`px-2 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
                currentLanguage === language.code
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language.short}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
        {routeContext && (
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-3 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-blue-700">
                <Sparkles className="w-3.5 h-3.5" /> Selected route intelligence
              </div>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-1.5 py-0.5">LIVE ROUTE DATA</span>
            </div>
            <div className="text-xs font-bold text-slate-800 truncate">{routeContext.origin || 'Start'} → {routeContext.destination || 'Destination'}</div>
            <div className="grid grid-cols-3 gap-1.5 mt-2 text-[10px]">
              <div className="rounded-lg bg-white/80 border border-blue-100 p-1.5"><span className="block text-slate-500">Safety</span><strong className="text-blue-700">{routeContext.safetyScore == null ? '—' : `${routeContext.safetyScore}/100`}</strong></div>
              <div className="rounded-lg bg-white/80 border border-blue-100 p-1.5"><span className="block text-slate-500">Rain risk</span><strong className="text-slate-800">{routeContext.rainRisk || '—'}</strong></div>
              <div className="rounded-lg bg-white/80 border border-blue-100 p-1.5"><span className="block text-slate-500">Trip</span><strong className="text-slate-800">{routeContext.distanceKm == null ? '—' : `${routeContext.distanceKm.toFixed(1)} km`}</strong></div>
            </div>
            <div className="mt-2 text-[10px] text-slate-600">{routeContext.durationMinutes != null ? `${Math.round(routeContext.durationMinutes)} min` : 'Travel time unavailable'} · {routeContext.summaryCondition || 'Live weather details loading'}</div>
            <div className="mt-2 flex flex-wrap gap-1 text-[9px] font-semibold text-slate-600">
              <span className="rounded-full bg-white/80 border border-blue-100 px-1.5 py-0.5">Waterlogging: {routeContext.waterloggingRisk || '—'}</span>
              <span className="rounded-full bg-white/80 border border-blue-100 px-1.5 py-0.5">Storm: {routeContext.thunderstormRisk || '—'}</span>
              {routeContext.bestDepartureTime && <span className="rounded-full bg-white/80 border border-blue-100 px-1.5 py-0.5">Best departure: {routeContext.bestDepartureTime}</span>}
              {routeContext.currentTemperature != null && <span className="rounded-full bg-white/80 border border-blue-100 px-1.5 py-0.5">{routeContext.currentTemperature}°C</span>}
              {routeContext.nearbyPlaces?.length ? <span className="rounded-full bg-white/80 border border-blue-100 px-1.5 py-0.5">{routeContext.nearbyPlaces.length} nearby places</span> : null}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs font-medium leading-relaxed shadow-xs ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-xs'
                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
              }`}
            >
              {/* If bot, show small icon & voice read & badges */}
              {m.sender === 'weathergpt' && (
                <div className="flex flex-col gap-1 pb-1.5 mb-1.5 border-b border-slate-100 text-[10px]">
                  <div className="flex items-center justify-between font-bold text-slate-400">
                    <span className="flex items-center gap-1 text-blue-600">
                      <Sparkles className="w-3 h-3" /> WeatherGPT Intelligence
                    </span>
                    <button
                      onClick={() => handleSpeak(m.id, m.text)}
                      className="p-1 hover:bg-slate-100 rounded-md text-slate-500 transition cursor-pointer"
                      title="Speak text"
                    >
                      {speakingId === m.id ? (
                        <VolumeX className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  {m.cardData?.payload && (
                    <div className="flex flex-wrap items-center gap-1 text-[9px] font-semibold">
                      {m.cardData.payload.ai_used ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          AI response • {m.cardData.payload.llm_provider || 'Gemini'}
                        </span>
                      ) : m.cardData.payload.fallback_used && (m.cardData.payload.is_live || ['current_weather', 'forecast'].includes(m.cardData.payload.intent)) ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Weather data live, AI temporarily unavailable
                        </span>
                      ) : null}
                      {m.cardData.payload.retrieved_at && (
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                          Updated {new Date(m.cardData.payload.retrieved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {m.cardData.payload.is_live || ['current_weather', 'forecast'].includes(m.cardData.payload.intent) ? (
                        m.cardData.payload.data_source && m.cardData.payload.data_source !== 'none' ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Live weather • {m.cardData.payload.data_source}
                        </span>
                        ) : (
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Live data unavailable — no guess shown
                        </span>
                        )
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
            <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="p-3 bg-white border border-slate-200 rounded-2xl w-64 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-500">{loadingStage}</span>
              <span className="text-[10px] font-bold text-blue-600">{loadingProgress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500" style={{ width: `${loadingProgress}%` }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested chips */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/60 overflow-x-auto flex space-x-1.5 no-scrollbar">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(s)}
            className="shrink-0 px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 rounded-full text-[11px] font-medium transition active:scale-95 cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Voice Error Banner */}
      {voiceError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>{voiceError}</span>
          </div>
          <button
            onClick={() => setVoiceError(null)}
            className="text-red-500 hover:text-red-800 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live Voice Recording Status */}
      {isListeningVoice && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-600 flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-ping" />
            <span className="font-semibold">Listening... Speak now, tap mic to finish</span>
          </div>
          <button
            onClick={toggleVoiceInput}
            className="px-2 py-0.5 bg-red-600 text-white rounded-lg text-[10px] font-bold"
          >
            Done
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="p-3 bg-white border-t border-slate-200 mb-16">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal);
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={
              isListeningVoice
                ? 'Listening to your voice...'
                : currentLanguage === 'hi'
                ? 'मौसम और यात्रा संबंधी कोई भी प्रश्न पूछें...'
                : 'Ask WeatherGPT anything about weather...'
            }
            className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 transition"
          />

          {/* Microphone button for voice input */}
          <button
            type="button"
            id="btn-chat-mic"
            onClick={toggleVoiceInput}
            title={isListeningVoice ? 'Stop listening' : 'Speak to WeatherGPT'}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition shadow-xs cursor-pointer ${
              isListeningVoice
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse ring-4 ring-red-300'
                : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>

          <button
            type="submit"
            id="btn-chat-send"
            disabled={!inputVal.trim() || loading}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
