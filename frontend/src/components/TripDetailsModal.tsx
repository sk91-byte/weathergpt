import React, { useState, useEffect } from 'react';
import { X, Navigation, Clock, Umbrella, CloudRain, AlertTriangle, CheckCircle2, ChevronRight } from './Icons';
import { RouteTrip } from '../types';

interface TripDetailsModalProps {
  trip: RouteTrip;
  isOpen: boolean;
  onClose: () => void;
  onSaveTrip?: (trip: RouteTrip) => void;
  initialMode?: 'details' | 'new' | 'all';
  savedTrips?: RouteTrip[];
  onSelectTrip?: (trip: RouteTrip) => void;
  onOpenLiveMap?: () => void;
}

export const TripDetailsModal: React.FC<TripDetailsModalProps> = ({
  trip: initialTrip,
  isOpen,
  onClose,
  onSaveTrip,
  initialMode = 'details',
  savedTrips = [],
  onSelectTrip,
  onOpenLiveMap
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'details' | 'new' | 'all'>(initialMode);
  const [trip, setTrip] = useState<RouteTrip>(initialTrip);
  const [selectedTime, setSelectedTime] = useState(trip.leaveBy || '08:00 AM');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states for New Trip
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');
  const [newLeaveBy, setNewLeaveBy] = useState('08:30 AM');
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    setTrip(initialTrip);
    setSelectedTime(initialTrip.leaveBy || '08:00 AM');
    setMode(initialMode);
  }, [initialTrip, initialMode, isOpen]);

  const handleTimeChange = (newTime: string) => {
    setSelectedTime(newTime);
    setTrip((prev) => ({
      ...prev,
      leaveBy: newTime
    }));
  };

  const handleSave = () => {
    setSavedSuccess(true);
    const updated = {
      ...trip,
      leaveBy: selectedTime
    };
    if (onSaveTrip) onSaveTrip(updated);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleCreateNewTrip = () => {
    if (!newFrom.trim() || !newTo.trim()) return;
    setIsCalculating(true);

    setTimeout(() => {
      const calculatedScore = Math.floor(70 + Math.random() * 25);
      const newTripObj: RouteTrip = {
        id: `trip-${Date.now()}`,
        from: newFrom.trim(),
        to: newTo.trim(),
        leaveBy: newLeaveBy,
        estDuration: '30 mins',
        status: calculatedScore > 75 ? 'Mild weather with passing clouds' : 'Rain showers likely on route',
        statusType: calculatedScore > 75 ? 'clear' : 'rain',
        weatherOnRoute: calculatedScore > 75 ? 'Clear with light breeze' : 'Scattered drizzle and wet roadways',
        safetyScore: calculatedScore,
        recommendation: `Optimal window: Depart around ${newLeaveBy} for smoothest transit.`,
        stops: [
          { time: newLeaveBy, pointName: newFrom.trim(), condition: 'Clear', rainProb: 20, temp: 27, windSpeed: 10 },
          { time: 'In-transit', pointName: 'Midway Corridor', condition: 'Passing Showers', rainProb: 40, temp: 26, windSpeed: 12 },
          { time: 'Arrival', pointName: newTo.trim(), condition: 'Overcast', rainProb: 30, temp: 26, windSpeed: 10 }
        ],
        alternativeAdvice: 'Departing on schedule provides optimal weather margins before afternoon showers.'
      };

      if (onSaveTrip) onSaveTrip(newTripObj);
      if (onSelectTrip) onSelectTrip(newTripObj);
      setTrip(newTripObj);
      setIsCalculating(false);
      setMode('details');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }, 600);
  };

  const safetyScore = trip.safetyScore ?? 78;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="modal-trip-details"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[88vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Route Weather Intelligence</h3>
              <p className="text-[11px] text-blue-200">Trip Commute & Disruption Forecast</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
            aria-label="Close trip details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-bold px-4 pt-2">
          <button
            onClick={() => setMode('details')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
              mode === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Active Trip Details
          </button>
          <button
            onClick={() => setMode('new')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
              mode === 'new'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            + Plan New Trip
          </button>
          {savedTrips.length > 0 && (
            <button
              onClick={() => setMode('all')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                mode === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Saved Trips ({savedTrips.length})
            </button>
          )}
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* MODE: DETAILS */}
          {mode === 'details' && (
            <>
              {/* Origin and Destination Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Current Route
                  </span>
                  <span className="font-bold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-full">
                    Est: {trip.estDuration}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex flex-col items-center">
                    <span className="text-base leading-none">🟢</span>
                    <span className="w-0.5 h-6 bg-slate-300 my-0.5" />
                    <span className="text-base leading-none">📍</span>
                  </div>
                  <div className="flex-1 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">START POINT</span>
                      <input
                        type="text"
                        value={trip.from}
                        onChange={(e) => setTrip({ ...trip, from: e.target.value })}
                        className="w-full font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-hidden py-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">DESTINATION</span>
                      <input
                        type="text"
                        value={trip.to}
                        onChange={(e) => setTrip({ ...trip, to: e.target.value })}
                        className="w-full font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-hidden py-0.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Weather Safety Score Highlight */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Weather Safety Score</span>
                  <span className="text-[11px] text-slate-500">
                    {safetyScore >= 80 ? 'Safe conditions with low risk' : 'Moderate precautions advised'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${safetyScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    {safetyScore}/100
                  </span>
                </div>
              </div>

              {/* Weather on Route Callout */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-2xl flex items-start space-x-2.5">
                <span className="text-xl shrink-0 mt-0.5">🌧️</span>
                <div className="text-xs space-y-1">
                  <span className="font-extrabold text-blue-900 block uppercase tracking-wider text-[10px]">
                    Weather on Route
                  </span>
                  <p className="text-slate-800 font-bold leading-relaxed">
                    {trip.weatherOnRoute || trip.status}
                  </p>
                  <p className="text-slate-600 text-[11px] font-medium">
                    {trip.recommendation}
                  </p>
                </div>
              </div>

              {/* Departure Selector */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Leave By Departure Time:
                  </span>
                  <span className="text-xs font-extrabold text-blue-700 bg-white px-2.5 py-0.5 rounded-md shadow-2xs border border-blue-100">
                    {selectedTime}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {['07:30 AM', '07:45 AM', '08:00 AM', '08:30 AM', '09:00 AM'].map((time) => (
                    <button
                      key={time}
                      onClick={() => handleTimeChange(time)}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                        selectedTime === time
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200/60'
                      }`}
                    >
                      {time.replace(' AM', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stop by Stop Timeline */}
              {trip.stops && trip.stops.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Route Weather Timeline
                  </h4>
                  <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {trip.stops.map((stop, i) => (
                      <div key={i} className="relative flex items-start justify-between text-xs">
                        <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900">{stop.time}</span>
                            <span className="font-medium text-slate-600">• {stop.pointName}</span>
                          </div>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-0.5 font-medium">
                            <span>{stop.condition}</span>
                            <span>Rain: {stop.rainProb}%</span>
                            <span>Wind: {stop.windSpeed} km/h</span>
                          </div>
                          {stop.hazard && (
                            <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200/60">
                              ⚠️ {stop.hazard}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-700 text-sm">{stop.temp}°C</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 space-y-2">
                {onOpenLiveMap && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenLiveMap();
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 text-white fill-white" />
                    <span>View in WeatherGPT Live Map</span>
                  </button>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    {savedSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Trip Saved!</span>
                      </>
                    ) : (
                      <span>Save Trip Changes</span>
                    )}
                  </button>
                  <button
                    onClick={() => setMode('new')}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    + New
                  </button>
                </div>
              </div>
            </>
          )}

          {/* MODE: NEW TRIP */}
          {mode === 'new' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900 font-medium">
                Enter your starting point and destination. WeatherGPT will calculate real-time route weather hazards and safety scores.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Origin (Start Point)
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 space-x-2">
                    <span className="text-emerald-500">🟢</span>
                    <input
                      type="text"
                      placeholder="e.g. Home, Sector 18, Railway Station"
                      value={newFrom}
                      onChange={(e) => setNewFrom(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Destination
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 space-x-2">
                    <span className="text-red-500">📍</span>
                    <input
                      type="text"
                      placeholder="e.g. College, Office, Airport"
                      value={newTo}
                      onChange={(e) => setNewTo(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Leave By Time
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewLeaveBy(t)}
                        className={`py-2 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                          newLeaveBy === t
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {t.replace(' AM', '')} AM
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preset quick routes */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Popular Route Presets
                </span>
                <div className="space-y-1.5">
                  {[
                    { from: 'Home', to: 'College', time: '08:00 AM' },
                    { from: 'Home', to: 'Tech Park', time: '09:30 AM' },
                    { from: 'College', to: 'City Center Library', time: '04:00 PM' }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setNewFrom(p.from);
                        setNewTo(p.to);
                        setNewLeaveBy(p.time);
                      }}
                      className="w-full text-left p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200/80 rounded-xl text-xs flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="font-semibold text-slate-800">
                        {p.from} → {p.to}
                      </span>
                      <span className="text-[11px] text-blue-600 font-bold">{p.time}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={!newFrom.trim() || !newTo.trim() || isCalculating}
                onClick={handleCreateNewTrip}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer mt-3"
              >
                {isCalculating ? (
                  <span>Analyzing Route Weather Hazards...</span>
                ) : (
                  <>
                    <span>+</span>
                    <span>Calculate & Set Next Trip</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* MODE: ALL SAVED TRIPS */}
          {mode === 'all' && (
            <div className="space-y-3">
              <span className="text-xs text-slate-500 block">
                Select any saved trip to make it your active commute:
              </span>
              <div className="space-y-2.5">
                {savedTrips.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => {
                      setTrip(st);
                      if (onSelectTrip) onSelectTrip(st);
                      setMode('details');
                    }}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                      trip.id === st.id
                        ? 'bg-blue-50/70 border-blue-500 shadow-xs ring-1 ring-blue-400/40'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center space-x-1.5 font-bold text-slate-900">
                        <span>🟢 {st.from}</span>
                        <span className="text-slate-400">→</span>
                        <span>📍 {st.to}</span>
                      </div>
                      <span className="font-extrabold text-blue-600 bg-white border border-blue-100 px-2 py-0.5 rounded-md text-[11px]">
                        {st.leaveBy}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mt-1">
                      {st.weatherOnRoute || st.status}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                        Score: {st.safetyScore ?? 78}/100
                      </span>
                      <span className="text-blue-600 font-bold">
                        {trip.id === st.id ? '✓ Active' : 'Tap to switch'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setMode('new')}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                + Add Another Route
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
