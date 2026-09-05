import React from 'react';
import { Volume2, Sparkles } from './Icons';

interface GreetingSectionProps {
  userName?: string;
  greetingText?: string;
  subtitleText?: string;
  onOpenBriefing: () => void;
}

export const GreetingSection: React.FC<GreetingSectionProps> = ({
  userName = 'Anmol',
  greetingText,
  subtitleText,
  onOpenBriefing
}) => {
  return (
    <div className="px-5 pt-1 pb-3 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5 font-heading">
          {greetingText || `Good Morning, ${userName}!`} <span>👋</span>
        </h2>
        <p className="text-xs font-medium text-slate-500 mt-0.5">
          {subtitleText || "Here's your weather overview"}
        </p>
      </div>

      <button
        id="btn-daily-briefing-pill"
        onClick={onOpenBriefing}
        className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200/60 shadow-xs transition active:scale-95 cursor-pointer"
        title="Listen to Morning AI Briefing"
      >
        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        <span>AI Briefing</span>
        <Volume2 className="w-3.5 h-3.5 ml-0.5 text-blue-500" />
      </button>
    </div>
  );
};
