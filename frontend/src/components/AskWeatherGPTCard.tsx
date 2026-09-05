import React, { useState } from 'react';
import { Mic, Send, Sparkles } from './Icons';

interface AskWeatherGPTCardProps {
  onSendMessage: (query: string) => void;
  onOpenVoice: () => void;
}

export const AskWeatherGPTCard: React.FC<AskWeatherGPTCardProps> = ({
  onSendMessage,
  onOpenVoice
}) => {
  const [inputVal, setInputVal] = useState('');

  const suggestions = [
    'Will it rain today?',
    'Tomorrow forecast',
    'Flood alert in my area',
    'Should I carry an umbrella?',
    'Can I irrigate crops today?'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onSendMessage(inputVal.trim());
    setInputVal('');
  };

  return (
    <div className="px-5 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight font-heading flex items-center gap-1.5">
          <span>Ask WeatherGPT</span>
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        </h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          AI Assistant
        </span>
      </div>

      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
        {/* Input form */}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            id="input-ask-weathergpt"
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask anything about weather..."
            className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
          />

          <div className="absolute right-1.5 flex items-center space-x-1">
            <button
              type="button"
              id="btn-ask-mic"
              onClick={onOpenVoice}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
              title="Voice Query"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="submit"
              id="btn-ask-send"
              disabled={!inputVal.trim()}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-30 hover:bg-blue-700 transition cursor-pointer"
              title="Send to WeatherGPT"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center space-x-1.5 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(item)}
              className="shrink-0 px-2.5 py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200/70 hover:border-blue-200 text-[11px] font-medium rounded-full transition active:scale-95 cursor-pointer"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
