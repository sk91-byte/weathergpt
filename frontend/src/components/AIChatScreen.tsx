import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Sparkles, Volume2, VolumeX, ArrowRight, Umbrella, CloudRain, RotateCcw, ChevronLeft, Bot, Loader2, AlertTriangle } from './Icons';
import { ChatMessage, Language, WeatherData, RouteTrip, UserRole } from '../types';
import { apiSendChat } from '../services/api';

interface AIChatScreenProps {
  weather: WeatherData;
  trip: RouteTrip;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onBackToHome: () => void;
  initialQuery?: string;
  userRole: UserRole;
}

export const AIChatScreen: React.FC<AIChatScreenProps> = ({
  weather,
  trip,
  currentLanguage,
  onLanguageChange,
  onBackToHome,
  initialQuery,
  userRole
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'weathergpt',
      text: currentLanguage === 'hi'
        ? `नमस्ते अनमोल! मैं WeatherGPT हूँ। मैं केवल मौसम नहीं बताता, बल्कि यह समझाता हूँ कि आपको क्या सावधानी रखनी चाहिए। आज आप क्या जानना चाहते हैं?`
        : currentLanguage === 'gu'
        ? `નમસ્તે અનમોલ! હું WeatherGPT છું. હું માત્ર હવામાન નથી કહેતો, પણ તમારે શું પગલાં લેવા જોઈએ તે જણાવું છું. આજે તમે શું જાણવા માગો છો?`
        : `Hello Anmol! I'm WeatherGPT. I can chat with you, answer your questions, explain app features, and give live weather guidance when you need it. How can I assist you today?`,
      timestamp: 'Just now'
    }
  ]);

  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
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
    if (initialQuery) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

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

  const localSuggestions = [
    currentLanguage === 'hi' ? 'कल बारिश होगी?' : 'Will it rain today?',
    currentLanguage === 'hi' ? 'क्या कल कॉलेज जाना सुरक्षित है?' : 'Should I travel to college tomorrow morning?',
    currentLanguage === 'hi' ? 'क्या आज फसलों की सिंचाई करूँ?' : 'Can I irrigate my crops today?',
    currentLanguage === 'hi' ? 'क्या छाता ले जाना चाहिए?' : 'Should I carry an umbrella?'
  ];
  if (currentLanguage === 'gu') {
    localSuggestions.splice(0, localSuggestions.length, 'આજે વરસાદ પડશે?', 'શું કાલે કોલેજ જવું સુરક્ષિત છે?', 'આજે સિંચાઈ કરવી યોગ્ય છે?', 'શું છત્રી લઈ જવી જોઈએ?');
  }
  const suggestions = serverSuggestions.length ? serverSuggestions : localSuggestions;

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

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    try {
      let coordinates = deviceCoordinates;
      if (needsCurrentLocation(textToSend) && !coordinates) {
        coordinates = await requestDeviceCoordinates();
      }
      const data = await apiSendChat(textToSend, {
        conversation_id: conversationId,
        language: currentLanguage,
        role: userRole,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        route_context: { from: trip.from, to: trip.to, leave_by: trip.leaveBy }
      });
      if (data.conversation_id) setConversationId(data.conversation_id);
      if (Array.isArray(data.suggestions)) setServerSuggestions(data.suggestions);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'weathergpt',
        text: data.response,
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
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'weathergpt',
        text: !needsCurrentLocation(textToSend)
          ? (currentLanguage === 'hi'
            ? 'नमस्ते! मैं आपकी बातचीत, सामान्य सवालों और WeatherGPT के फीचर्स में मदद कर सकता हूँ। मैं आपकी कैसे सहायता करूँ?'
            : currentLanguage === 'gu'
            ? 'નમસ્તે! હું તમારી વાતચીત, સામાન્ય પ્રશ્નો અને WeatherGPT ફીચર્સમાં મદદ કરી શકું છું. હું તમારી કેવી રીતે મદદ કરું?'
            : `Hi! I'm WeatherGPT. I can answer general questions, explain app features, and help with live weather whenever you need it. How can I assist you?`)
          : err instanceof Error && err.message.includes('Location permission')
          ? (currentLanguage === 'hi'
            ? 'आपके आसपास का मौसम बताने के लिए स्थान की अनुमति चाहिए। कृपया ब्राउज़र में Location Allow करें और फिर दोबारा पूछें।'
            : currentLanguage === 'gu'
            ? 'તમારા આસપાસનું હવામાન બતાવવા માટે લોકેશનની પરવાનગી જોઈએ. બ્રાઉઝરમાં Location Allow કરો અને ફરી પૂછો.'
            : 'I need your location to answer that. Please allow Location access in your browser and ask again.')
          : currentLanguage === 'hi'
          ? `अभी ${weather.city} के लिए लाइव मौसम सेवा उपलब्ध नहीं है। कृपया कुछ देर बाद फिर कोशिश करें।`
          : currentLanguage === 'gu'
          ? `હમણાં ${weather.city} માટે લાઇવ હવામાન સેવા ઉપલબ્ધ નથી. થોડા સમય પછી ફરી પ્રયાસ કરો.`
          : `Live weather data for ${weather.city} is temporarily unavailable. I won't guess the conditions—please try again shortly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cardData: {
          type: 'weather',
          payload: {
            ai_used: false,
            fallback_used: needsCurrentLocation(textToSend),
            fallback_reason: needsCurrentLocation(textToSend) ? 'request_failed' : undefined,
            data_source: needsCurrentLocation(textToSend) ? 'none' : 'conversation',
            is_live: false,
          },
        },
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
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
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
          {(['en', 'hi', 'gu'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => onLanguageChange(l)}
              className={`px-2 py-1 rounded-md transition cursor-pointer ${
                currentLanguage === l
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {l === 'en' ? 'EN' : l === 'hi' ? 'हिन्दी' : 'ગુજરાતી'}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
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
          <div className="flex items-center space-x-2 p-3 bg-white border border-slate-200 rounded-2xl w-36 shadow-2xs">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0.4s' }} />
            <span className="text-[10px] font-bold text-slate-400 ml-1">Analyzing...</span>
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
