import React from 'react';
import { Navigation, MapPin, Mic, MessageSquare, User, Cloud } from './Icons';

export type TabType = 'home' | 'map' | 'voice' | 'chat' | 'profile';

interface BottomNavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenVoiceAssistant: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onChangeTab,
  onOpenVoiceAssistant
}) => {
  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-1.5 flex items-center justify-between shadow-[0_-8px_20px_rgba(15,23,42,0.06)] select-none"
    >
      {/* 1. Home Tab */}
      <button
        id="nav-tab-home"
        onClick={() => onChangeTab('home')}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
          activeTab === 'home' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className="relative">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={activeTab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span className="text-[10px] mt-0.5">Home</span>
      </button>

      {/* 2. Live Map Tab */}
      <button
        id="nav-tab-map"
        onClick={() => onChangeTab('map')}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer relative ${
          activeTab === 'map' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className="relative">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
            <line x1="9" x2="9" y1="3" y2="18"/>
            <line x1="15" x2="15" y1="6" y2="21"/>
          </svg>
          <span className="absolute -top-1 -right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
        <span className="text-[10px] mt-0.5 flex items-center space-x-0.5">
          <span>Live Map</span>
        </span>
      </button>

      {/* 3. Center Elevated Microphone Button */}
      <div className="relative -top-4 px-2">
        <button
          id="btn-nav-mic-center"
          onClick={onOpenVoiceAssistant}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-sky-500 to-blue-700 text-white flex items-center justify-center shadow-[0_8px_20px_rgba(25,118,210,0.45)] hover:scale-105 active:scale-95 transition cursor-pointer ring-4 ring-white animate-pulse-ring"
          aria-label="Talk to WeatherGPT"
        >
          <Mic className="w-6 h-6 stroke-[2.4]" />
        </button>
      </div>

      {/* 4. Chat Tab */}
      <button
        id="nav-tab-chat"
        onClick={() => onChangeTab('chat')}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
          activeTab === 'chat' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <MessageSquare className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] mt-0.5">Chat</span>
      </button>

      {/* 5. Profile Tab */}
      <button
        id="nav-tab-profile"
        onClick={() => onChangeTab('profile')}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
          activeTab === 'profile' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <User className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] mt-0.5">Profile</span>
      </button>
    </nav>
  );
};
