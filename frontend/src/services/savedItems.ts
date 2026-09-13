import { RouteTrip, SavedPlace } from '../types';

export const SAVED_TRIPS_STORAGE_KEY = 'weathergpt_saved_trips';
export const SAVED_PLACES_STORAGE_KEY = 'weathergpt_saved_places';

function readArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private browsing. The in-memory state still works.
  }
}

export function loadSavedTrips(): RouteTrip[] {
  return readArray<RouteTrip>(SAVED_TRIPS_STORAGE_KEY).filter(
    (trip) => Boolean(trip && trip.id && trip.from && trip.to)
  );
}

export function persistSavedTrips(trips: RouteTrip[]) {
  writeArray(SAVED_TRIPS_STORAGE_KEY, trips);
}

export function loadSavedPlaces(): SavedPlace[] {
  return readArray<SavedPlace>(SAVED_PLACES_STORAGE_KEY).filter(
    (place) => Boolean(
      place && place.id && place.name && Array.isArray(place.coords) &&
      place.coords.length >= 2 && Number.isFinite(Number(place.coords[0])) && Number.isFinite(Number(place.coords[1]))
    )
  );
}

export function persistSavedPlaces(places: SavedPlace[]) {
  writeArray(SAVED_PLACES_STORAGE_KEY, places);
}
