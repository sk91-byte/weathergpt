import React, { useState, useRef, useEffect } from 'react';
import { apiSendChat } from '../../services/api';
import {
  MessageSquare,
  Send,
  X,
  Bot,
  User,
  Sparkles,
  Mic,
  MicOff,
  RotateCcw,
  ShieldAlert,
  HelpCircle
} from '../Icons';

interface RouteChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
  userRole?: string;
  routeContext: {
    origin?: string;
    destination?: string;
    safetyScore?: number | null;
    rainRisk?: string;
    waterloggingRisk?: string;
    summaryCondition?: string;
    bestDepartureTime?: string;
    distanceKm?: number;
    durationMinutes?: number;
    destinationCoords?: [number, number];
    currentTemperature?: number;
    currentWindSpeed?: number;
    nearbyPlaces?: Array<{
      name: string;
      category?: string;
      address?: string;
      distanceFromRouteMeters?: number;
      distanceFromStartKm?: number;
      openStatus?: string;
      phone?: string;
    }>;
  };
}

interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const QUICK_QUESTIONS_BY_ROLE: Record<string, { en: string[]; hi: string[]; hinglish: string[] }> = {
  student: {
    en: ['Should I leave now for college?', 'Will rain affect my college trip?', 'What should I carry in my bag?', 'Where can I wait safely?'],
    hi: ['कॉलेज के लिए अभी निकलना चाहिए?', 'क्या बारिश से कॉलेज का रास्ता प्रभावित होगा?', 'बैग में क्या लेकर जाऊं?', 'सुरक्षित जगह पर कहां रुकूं?'],
    hinglish: ['College ke liye abhi nikalna chahiye?', 'Kya rain se college route affect hoga?', 'Bag mein kya carry karun?', 'Safe jagah par kahan rukun?']
  },
  traveller: {
    en: ['Should I leave now?', 'Will it rain on my route?', 'What weather risk should I prepare for?', 'Where can I wait safely?'],
    hi: ['क्या मुझे अभी निकलना चाहिए?', 'क्या मेरे रास्ते में बारिश होगी?', 'मुझे किस मौसम जोखिम की तैयारी करनी चाहिए?', 'सुरक्षित जगह पर कहां रुकूं?'],
    hinglish: ['Kya mujhe abhi nikalna chahiye?', 'Kya mere route par rain hogi?', 'Kis weather risk ki preparation karun?', 'Safe jagah par kahan rukun?']
  },
  commuter: {
    en: ['Should I leave now for work?', 'Will rain delay my commute?', 'What is the expected temperature?', 'Why is this route recommended?'],
    hi: ['काम के लिए अभी निकलना चाहिए?', 'क्या बारिश से मेरा सफर देर होगा?', 'तापमान कितना रहेगा?', 'यह रास्ता क्यों सुझाया गया है?'],
    hinglish: ['Work ke liye abhi nikalna chahiye?', 'Kya rain se commute late hoga?', 'Expected temperature kya hai?', 'Ye route kyun recommend hua hai?']
  },
  general_public: {
    en: ['Should I leave now?', 'Will it rain on my route?', 'What is the expected temperature?', 'Where can I wait safely?'],
    hi: ['क्या मुझे अभी निकलना चाहिए?', 'क्या मेरे रास्ते में बारिश होगी?', 'तापमान कितना रहेगा?', 'सुरक्षित जगह पर कहां रुकूं?'],
    hinglish: ['Kya mujhe abhi nikalna chahiye?', 'Kya mere route par rain hogi?', 'Expected temperature kya hai?', 'Safe jagah par kahan rukun?']
  }
};

const quickQuestionsFor = (language: string, userRole: string) => {
  const set = QUICK_QUESTIONS_BY_ROLE[userRole] || QUICK_QUESTIONS_BY_ROLE.general_public;
  return language === 'hi' ? set.hi : language === 'hinglish' ? set.hinglish : set.en;
};

export const RouteChatDrawer: React.FC<RouteChatDrawerProps> = ({
  isOpen,
  onClose,
  language = 'en',
  userRole = 'general_public',
  routeContext
}) => {
  const routeRiskScore = routeContext.safetyScore == null ? null : Math.max(0, Math.min(100, 100 - routeContext.safetyScore));
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am WeatherGPT Copilot for your trip from **${routeContext.origin || 'Current Location'}** to **${routeContext.destination || 'Destination'}**. \n\nCurrent Route Weather Risk Score: **${
        routeRiskScore !== null
          ? `${routeRiskScore}/100`
          : 'Unavailable'
      }** (${routeContext.rainRisk || 'Unavailable'} rain risk). How can I assist your commute?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Preparing route context');
  const [conversationId, setConversationId] = useState<string>(`conv_${Date.now()}`);
  const [isListening, setIsListening] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(quickQuestionsFor(language, userRole));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const quickQuestions = quickQuestionsFor(language, userRole);

  useEffect(() => {
    // Keep useful persona/language fallback chips visible until the first
    // route answer returns AI-generated, conversation-aware suggestions.
    setSuggestedQuestions(quickQuestions);
  }, [language, userRole]);

  useEffect(() => {
    if (!isLoading) { setLoadingProgress(0); return; }
    const stages = [[20, 'Understanding your route question'], [45, 'Reading live route weather'], [70, 'Applying your persona'], [86, 'Generating AI response']] as const;
    let index = 0;
    setLoadingProgress(8);
    setLoadingStage(stages[0][1]);
    const timer = window.setInterval(() => {
      if (index < stages.length - 1) index += 1;
      setLoadingProgress(stages[index][0]);
      setLoadingStage(stages[index][1]);
    }, 900);
    return () => window.clearInterval(timer);
  }, [isLoading]);

  const localPresetAnswer = (query: string): string | null => {
    const text = query.toLowerCase();
    const risk = routeRiskScore;
    const riskText = risk === null ? 'unavailable' : `${risk}/100`;
    const personaAdvice = userRole === 'student'
      ? 'As a student, keep extra travel time and carry water or rain protection.'
      : userRole === 'commuter'
        ? 'For your commute, allow extra time and recheck conditions before leaving.'
        : 'Recheck live conditions before departure because weather can change.';

    if (/(leave now|abhi nikal|अभी निकल|હમણાં નીકળ|should i leave)/i.test(text)) {
      if (risk === null) return 'Live route risk is still loading. Please wait for the route analysis to finish.';
      if (risk >= 60) return `The current Weather Risk Score is ${riskText}. Consider waiting${routeContext.bestDepartureTime ? ` until around ${routeContext.bestDepartureTime}` : ' and checking again'} before leaving. ${personaAdvice}`;
      return `The current Weather Risk Score is ${riskText}. You can leave now, but continue to monitor the route and follow normal precautions. ${personaAdvice}`;
    }
    if (/(rain|बारिश|વરસાદ|rainfall|baarish|barish)/i.test(text)) {
      return routeContext.rainRisk && routeContext.rainRisk !== 'Unavailable'
        ? `Rain risk along this route is ${routeContext.rainRisk}. The route analysis is based on live provider data. ${routeContext.rainRisk === 'High' ? 'Carry rain protection and reduce speed.' : 'Keep rain protection ready in case conditions change.'}`
        : 'Rain risk is still loading for this route. Please wait for the live route analysis.';
    }
    if (/(temperature|तापमान|તાપમાન)/i.test(text)) {
      return Number.isFinite(routeContext.currentTemperature)
        ? `The latest available temperature near the route is ${routeContext.currentTemperature}°C. ${personaAdvice}`
        : 'The route temperature is still loading. Please wait for the live weather analysis.';
    }
    if (/(where.*wait|safe.*wait|कहां रुक|ક્યાં રોક|ruk|rukun)/i.test(text)) {
      return 'Use the Places Along Your Route section below the map to find nearby hospitals, hotels, restaurants, petrol pumps, or EV charging stations where you can stop.';
    }
    if (/(why.*route|route.*recommend|क्यों.*रास्त|શા માટે.*રસ્ત)/i.test(text)) {
      return `This route is recommended because it currently has a Weather Risk Score of ${riskText}, with ${routeContext.rainRisk || 'available'} rain risk. ${personaAdvice}`;
    }
    return null;
  };

  useEffect(() => {
    const risk = routeContext.safetyScore == null
      ? 'Unavailable'
      : `${Math.max(0, Math.min(100, 100 - routeContext.safetyScore))}/100`;
    setMessages((previous) => previous.map((message, index) => index === 0 && message.id === 'welcome'
      ? { ...message, text: `Hello! I am WeatherGPT Copilot for your trip from **${routeContext.origin || 'Current Location'}** to **${routeContext.destination || 'Destination'}**.\n\nCurrent Route Weather Risk Score: **${risk}** (${routeContext.rainRisk || 'Unavailable'} rain risk). How can I assist your commute?` }
      : message));
  }, [routeContext.origin, routeContext.destination, routeContext.safetyScore, routeContext.rainRisk]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessageItem = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoadingProgress(8);
    setLoadingStage('Understanding your route question');
    setIsLoading(true);

    try {
      const response = await apiSendChat(query, {
        conversation_id: conversationId,
        language,
        role: userRole,
        location: routeContext.destination,
        latitude: routeContext.destinationCoords?.[0],
        longitude: routeContext.destinationCoords?.[1],
        route_context: {
          origin: routeContext.origin,
          destination: routeContext.destination,
          safety_score: routeContext.safetyScore,
          rain_risk: routeContext.rainRisk,
          waterlogging_risk: routeContext.waterloggingRisk,
          summary_condition: routeContext.summaryCondition,
          best_departure_time: routeContext.bestDepartureTime,
          distance_km: routeContext.distanceKm,
          duration_minutes: routeContext.durationMinutes,
          destination_coords: routeContext.destinationCoords,
          nearby_places: routeContext.nearbyPlaces || []
        }
      });

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }
      if (Array.isArray(response.suggestions) && response.suggestions.length) {
        setSuggestedQuestions(response.suggestions.filter((item: unknown): item is string => typeof item === 'string').slice(0, 4));
      }
      const assistantMsg: ChatMessageItem = {
        id: `msg_bot_${Date.now()}`,
        sender: 'assistant',
        text: response.response || 'Stay safe on your commute. Road surface might be wet.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error('Chat error:', e);
      const detail = e instanceof Error ? e.message : 'Unknown assistant error';
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'assistant',
          text: `WeatherGPT Copilot could not answer this request (${detail}). Please try again shortly.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Speech Recognition support if available
  const handleVoiceToggle = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setInputQuery('Should I leave now?');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputQuery(transcript);
        handleSendMessage(transcript);
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech recognition error:', e);
      setIsListening(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-[90] w-full sm:w-96 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-xs font-black text-white">Route Copilot</h3>
              <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-xs">
                Active
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
              {routeContext.destination ? `To ${routeContext.destination}` : 'Trip Weather Advisor'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Route Context Banner */}
      <div className="bg-slate-800/80 px-3 py-2 border-b border-slate-700/60 flex items-center justify-between text-[10px]">
        <div className="flex items-center space-x-1.5 text-slate-300 truncate">
          <span className="text-emerald-400 font-bold">Trip:</span>
          <span className="truncate">{routeContext.origin || 'Start'} → {routeContext.destination || 'End'}</span>
        </div>
        <div className="flex items-center space-x-1 shrink-0 ml-2">
          <span className="text-slate-400">Weather Risk:</span>
          <span className="font-extrabold text-sky-400">
            {routeRiskScore !== null
              ? `${routeRiskScore}/100`
              : 'N/A'}
          </span>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-xs font-medium shadow-md'
                  : 'bg-slate-800 border border-slate-700/70 text-slate-200 rounded-bl-xs leading-relaxed'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
            <span className="text-[9px] text-slate-500 mt-1 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="text-slate-400 text-xs py-1 w-full">
            <div className="flex items-center justify-between mb-1">
              <span>{loadingStage}</span>
              <span className="text-blue-400 font-bold">{loadingProgress}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500" style={{ width: `${loadingProgress}%` }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-2 border-t border-slate-800 bg-slate-900/90 overflow-x-auto no-scrollbar flex space-x-1.5">
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            disabled={isLoading}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700/80 text-[10px] font-semibold transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box and Action Controls */}
      <div className="p-3 border-t border-slate-800 bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <button
            type="button"
            onClick={handleVoiceToggle}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
              isListening
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700'
            }`}
            title="Voice Input"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about weather, safety, when to leave..."
            className="flex-1 bg-slate-800 text-white placeholder-slate-400 text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-hidden focus:border-blue-500"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-600/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
