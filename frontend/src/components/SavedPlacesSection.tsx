import React from 'react';
import { SavedPlace, RouteTrip } from '../types';
import { Map, MapPin } from 'lucide-react';

interface SavedPlacesSectionProps {
  savedPlaces: SavedPlace[];
  savedTrips: RouteTrip[];
  onSelectSavedPlace: (place: SavedPlace) => void;
  onSelectSavedTrip: (trip: RouteTrip) => void;
  onOpenMap: () => void;
  onManagePlaces: () => void;
}

export const SavedPlacesSection: React.FC<SavedPlacesSectionProps> = ({
  savedPlaces,
  savedTrips,
  onSelectSavedPlace,
  onSelectSavedTrip,
  onOpenMap,
  onManagePlaces
}) => {
  return (
    <div className="px-5 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-heading">
          SAVED PLACES
        </h3>
        <button
          onClick={onManagePlaces}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
        >
          Manage
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 transition hover:border-blue-200">
        {savedPlaces.length === 0 && savedTrips.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-slate-500 mb-3">No saved places yet.</p>
            <button
              onClick={onOpenMap}
              className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition cursor-pointer"
            >
              Open Map to Save Places
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {savedPlaces.map((place) => (
              <div
                key={place.id}
                className="p-3 bg-slate-50 rounded-xl flex items-center justify-between gap-3 text-xs border border-slate-100 hover:border-blue-200 transition"
              >
                <button
                  type="button"
                  onClick={() => onSelectSavedPlace(place)}
                  className="flex-1 min-w-0 text-left cursor-pointer flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block truncate">{place.label}: {place.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {place.address || `${place.coords[0].toFixed(4)}, ${place.coords[1].toFixed(4)}`}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectSavedPlace(place);
                    onOpenMap();
                  }}
                  className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-lg shrink-0 cursor-pointer"
                  title="Open in Live Map"
                >
                  <Map className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {savedTrips.map((trip) => (
              <div
                key={trip.id}
                className="p-3 bg-blue-50 rounded-xl flex items-center justify-between gap-3 text-xs border border-blue-100 hover:border-blue-300 transition"
              >
                <button
                  type="button"
                  onClick={() => onSelectSavedTrip(trip)}
                  className="flex-1 min-w-0 text-left cursor-pointer flex items-center gap-2"
                >
                  <div className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  </div>
                  <div>
                    <span className="font-bold text-blue-900 block truncate">{trip.from} → {trip.to}</span>
                    <span className="text-[10px] text-blue-700 block">
                      {trip.estDuration}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectSavedTrip(trip);
                    onOpenMap();
                  }}
                  className="p-2 text-blue-400 hover:text-blue-700 bg-white border border-blue-200 rounded-lg shrink-0 cursor-pointer"
                  title="Open Route in Live Map"
                >
                  <Map className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
