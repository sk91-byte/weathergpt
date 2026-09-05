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
  };
}

interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const QUICK_QUESTIONS = [
  'Should I leave now?',
  'Will it rain on my route?',
  'Where should I wait?',
  'Why is this route safer?',
  'क्या मुझे अभी निकलना चाहिए?',
  'रास्ते में बारिश या जलभराव होगा क्या?',
  'Paani bhara hoga kya raste me?',
  'Safe jagah kahan hai rukne ke liye?'
];

export const RouteChatDrawer: React.FC<RouteChatDrawerProps> = ({
  isOpen,
  onClose,
  routeContext
}) => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am WeatherGPT Copilot for your trip from **${routeContext.origin || 'Current Location'}** to **${routeContext.destination || 'Destination'}**. \n\nCurrent Route Safety Score: **${
        routeContext.safetyScore !== null && routeContext.safetyScore !== undefined
          ? `${routeContext.safetyScore}/100`
          : 'Unavailable'
      }** (${routeContext.rainRisk || 'Moderate'} rain risk). How can I assist your commute?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>(`conv_${Date.now()}`);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    setIsLoading(true);

    try {
      const response = await apiSendChat(query, {
        conversation_id: conversationId,
        route_context: {
          origin: routeContext.origin,
          destination: routeContext.destination,
          safety_score: routeContext.safetyScore,
          rain_risk: routeContext.rainRisk,
          waterlogging_risk: routeContext.waterloggingRisk,
          summary_condition: routeContext.summaryCondition,
          best_departure_time: routeContext.bestDepartureTime,
          distance_km: routeContext.distanceKm,
          duration_minutes: routeContext.durationMinutes
        }
      });

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
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
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to connect to WeatherGPT assistant right now. Please drive carefully.',
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
    <div className="absolute inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
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
          <span className="text-slate-400">Score:</span>
          <span className="font-extrabold text-sky-400">
            {routeContext.safetyScore !== null && routeContext.safetyScore !== undefined
              ? `${routeContext.safetyScore}/100`
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
          <div className="flex items-center space-x-2 text-slate-400 text-xs py-1">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span>Analyzing route weather conditions...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-2 border-t border-slate-800 bg-slate-900/90 overflow-x-auto no-scrollbar flex space-x-1.5">
        {QUICK_QUESTIONS.map((q, idx) => (
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
