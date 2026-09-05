import React from 'react';

interface WeatherIllustrationProps {
  condition: string;
  className?: string;
}

export const WeatherIllustration: React.FC<WeatherIllustrationProps> = ({ condition, className = '' }) => {
  const condLower = (condition || '').toLowerCase();
  const isRain = condLower.includes('rain') || condLower.includes('shower');
  const isThunder = condLower.includes('thunder') || condLower.includes('storm');
  const isSun = condLower.includes('sun') || condLower.includes('clear') || condLower.includes('partly');

  return (
    <div className={`relative w-28 h-28 flex items-center justify-center select-none pointer-events-none ${className}`}>
      {/* Sun element */}
      {isSun && (
        <div className="absolute top-1 right-2 w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 shadow-[0_0_24px_rgba(251,191,36,0.7)] animate-pulse">
          {/* Subtle sun rays aura */}
          <div className="absolute inset-0 rounded-full border border-yellow-300/40 animate-ping opacity-30" />
        </div>
      )}

      {/* Main Front Cloud */}
      <div className="absolute -bottom-1 -right-1 z-10 animate-float-slow">
        <div className="relative">
          {/* Cloud body puffs */}
          <div className="w-20 h-10 bg-white/95 rounded-full shadow-[0_8px_16px_rgba(15,23,42,0.18)] backdrop-blur-xs flex items-center" />
          <div className="absolute -top-5 left-3 w-10 h-10 bg-white rounded-full shadow-xs" />
          <div className="absolute -top-3 left-9 w-8 h-8 bg-white rounded-full shadow-xs" />
        </div>
      </div>

      {/* Secondary Depth Cloud */}
      <div className="absolute bottom-2 -left-1 opacity-85 z-0" style={{ transform: 'scale(0.85)' }}>
        <div className="relative">
          <div className="w-16 h-8 bg-blue-100/90 rounded-full shadow-sm" />
          <div className="absolute -top-4 left-2 w-8 h-8 bg-blue-100/90 rounded-full" />
        </div>
      </div>

      {/* Rain drops animation if rainy */}
      {isRain && (
        <div className="absolute bottom-0 right-4 z-20 flex space-x-2">
          <div className="w-0.5 h-3 bg-blue-200 rounded-full animate-bounce" style={{ animationDuration: '0.8s' }} />
          <div className="w-0.5 h-3.5 bg-blue-200 rounded-full animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.2s' }} />
          <div className="w-0.5 h-3 bg-blue-200 rounded-full animate-bounce" style={{ animationDuration: '0.9s', animationDelay: '0.4s' }} />
        </div>
      )}

      {/* Lightning bolt if thunderstorm */}
      {isThunder && (
        <div className="absolute -bottom-1 right-8 z-20 text-yellow-300 font-bold text-lg animate-pulse drop-shadow-[0_0_8px_rgba(253,224,71,0.9)]">
          ⚡
        </div>
      )}
    </div>
  );
};
