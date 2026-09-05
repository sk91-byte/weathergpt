import React, { useState } from 'react';
import { NearbySafePlace } from '../../types';
import { X, Utensils, Coffee, Store, Building2, Fuel, Hospital, MapPin, ExternalLink, ChevronRight } from '../Icons';

interface NearbyPlacesDrawerProps {
  places: NearbySafePlace[];
  isOpen: boolean;
  onClose: () => void;
  onSelectPlace: (place: NearbySafePlace) => void;
  selectedPlaceId?: string;
}

type PlaceCategoryFilter = 'all' | 'restaurant' | 'cafe' | 'convenience' | 'hotel' | 'petrol' | 'hospital';

export const NearbyPlacesDrawer: React.FC<NearbyPlacesDrawerProps> = ({
  places,
  isOpen,
  onClose,
  onSelectPlace,
  selectedPlaceId
}) => {
  const [filter, setFilter] = useState<PlaceCategoryFilter>('all');

  if (!isOpen) return null;

  const filteredPlaces = filter === 'all' ? places : places.filter((p) => p.category === filter);

  return (
    <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end pointer-events-auto">
      <div className="bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-amber-500 text-base">☕</span>
              <h3 className="text-sm font-black text-slate-900">
                NEARBY WHILE YOU WAIT
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Safe covered shelters, cafes & dry waiting spots nearby
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Suggestion Banner */}
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-xs text-blue-900 flex items-start space-x-2.5">
          <span className="text-lg">💡</span>
          <div>
            <span className="font-extrabold block text-blue-950">WeatherGPT Commute Advisory:</span>
            Heavy rainfall is expected for approximately 20 minutes. You may consider waiting at a nearby cafe or indoor lounge before continuing your journey.
          </div>
        </div>

        {/* Category Filters */}
        <div className="px-4 py-2.5 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ✨ All Places
          </button>
          <button
            onClick={() => setFilter('cafe')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1 ${
              filter === 'cafe' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Cafes</span>
          </button>
          <button
            onClick={() => setFilter('restaurant')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1 ${
              filter === 'restaurant' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Restaurants</span>
          </button>
          <button
            onClick={() => setFilter('convenience')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1 ${
              filter === 'convenience' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Stores</span>
          </button>
          <button
            onClick={() => setFilter('hotel')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1 ${
              filter === 'hotel' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hotels</span>
          </button>
          <button
            onClick={() => setFilter('petrol')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1 ${
              filter === 'petrol' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>Fuel Stops</span>
          </button>
          <button
            onClick={() => setFilter('hospital')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1 ${
              filter === 'hospital' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Hospital className="w-3.5 h-3.5" />
            <span>Medical</span>
          </button>
        </div>

        {/* Places List */}
        <div className="overflow-y-auto px-4 pb-6 space-y-2 flex-1">
          {filteredPlaces.map((place) => {
            const isSelected = place.id === selectedPlaceId;
            return (
              <div
                key={place.id}
                onClick={() => onSelectPlace(place)}
                className={`p-3 rounded-2xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="flex items-center space-x-1.5 mb-0.5">
                      <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-sm">
                        {place.categoryLabel}
                      </span>
                      <span className="text-xs font-extrabold text-amber-500">
                        ⭐ {place.rating} ({place.reviews})
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900">
                      {place.name}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-blue-600 block">
                      {place.distanceMeters}m
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {place.walkingMinutes} min walk
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 truncate mb-1.5">
                  📍 {place.address}
                </p>

                <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-medium text-slate-700 mb-2 flex items-center justify-between">
                  <span>🛡️ {place.shelterFeature}</span>
                  <span className="font-bold text-emerald-600">{place.openStatus.split('•')[0]}</span>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPlace(place);
                    }}
                    className="text-blue-600 font-extrabold hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View on Live Map</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-slate-400 font-medium">
                    {place.phone}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
