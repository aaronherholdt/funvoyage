import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, ArrowRight, Loader2, Search, Globe2, Sparkles, X } from 'lucide-react';
import { Button } from '../Button';
import { searchLocationSuggestions, reverseGeocode, LocationResult } from '../../services/osmService';
import dynamic from 'next/dynamic';

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-teal-100 rounded-xl flex items-center justify-center">
      <Loader2 className="animate-spin text-teal-500" size={32} />
    </div>
  ),
});

interface LocationPickerProps {
  onLocationSelect: (countryCode: string, city: string, countryName: string) => void | Promise<void>;
  onCancel: () => void;
}

// Fun facts about different types of locations
const funFacts: Record<string, string[]> = {
  default: [
    "Every place on Earth has a unique story!",
    "There are 195 countries in the world to explore!",
    "The equator is an imaginary line that divides Earth into two halves.",
    "Mountains, oceans, and deserts all have different climates!",
  ],
  island: [
    "Islands are pieces of land completely surrounded by water!",
    "The largest island in the world is Greenland.",
    "Some islands are formed by volcanoes under the sea!",
  ],
  city: [
    "Cities are where lots of people live and work together!",
    "The most populated city in the world is Tokyo, Japan.",
    "Every city has its own special culture and traditions!",
  ],
  country: [
    "Countries have their own flags, languages, and governments!",
    "The smallest country in the world is Vatican City.",
    "People around the world eat different foods and celebrate different holidays!",
  ],
};

export const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelect, onCancel }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [funFact, setFunFact] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchRequestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get a random fun fact
  const getRandomFact = useCallback((type: string = 'default') => {
    const facts = funFacts[type] || funFacts.default;
    return facts[Math.floor(Math.random() * facts.length)];
  }, []);

  useEffect(() => {
    setFunFact(getRandomFact());
  }, [getRandomFact]);

  // Debounced search for suggestions
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      searchRequestIdRef.current += 1;
      setIsSearching(false);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchLocationSuggestions(query, 6);
        if (searchRequestIdRef.current !== requestId) return;
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        if (searchRequestIdRef.current !== requestId) return;
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        if (searchRequestIdRef.current === requestId) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleSuggestionClick = (location: LocationResult) => {
    setSelectedLocation(location);
    setQuery(location.city || location.displayName.split(',')[0]);
    setShowSuggestions(false);
    setError('');
    setFunFact(getRandomFact('city'));
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setIsSearching(true);
    try {
      const result = await reverseGeocode(lat, lng);
      if (result) {
        setSelectedLocation(result);
        setQuery(result.city || result.displayName.split(',')[0]);
        setError('');
        setFunFact(getRandomFact('city'));
      }
    } catch {
      setError('Could not identify that location. Try searching instead!');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLocation && !query.trim()) {
      setError('Search for a place or click on the map!');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (selectedLocation) {
        await onLocationSelect(
          selectedLocation.countryCode || 'XX',
          selectedLocation.city || query.trim(),
          selectedLocation.countryName || 'Unknown country'
        );
      } else {
        // If no selection, try to search
        const results = await searchLocationSuggestions(query.trim(), 1);
        if (results.length > 0) {
          const loc = results[0];
          await onLocationSelect(
            loc.countryCode || 'XX',
            loc.city || query.trim(),
            loc.countryName || 'Unknown country'
          );
        } else {
          setError("Couldn't find that place. Try clicking on the map!");
        }
      }
    } catch {
      setError('Something went wrong. Please try again!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSelection = () => {
    setSelectedLocation(null);
    setQuery('');
    setFunFact(getRandomFact());
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-indigo-50 via-white to-teal-50 flex flex-col items-center justify-start md:justify-center p-4 sm:p-6 py-8 px-safe overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-indigo-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <h2 className="font-kid text-2xl sm:text-3xl font-bold mb-2 relative z-10 flex items-center justify-center gap-2">
            <Globe2 className="animate-pulse" /> Where will you explore today?
          </h2>
          <p className="opacity-90 relative z-10 text-sm sm:text-base">
            Search for any place or click on the map to start your adventure!
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <label htmlFor="location-search" className="block text-sm font-bold text-slate-700 mb-2">
              Search for a city, country, or island
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                id="location-search"
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedLocation(null);
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Try: Tokyo, Iceland, Maldives, New York..."
                className="w-full pl-12 pr-12 py-3 sm:py-4 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-base sm:text-lg transition-colors"
                disabled={isSubmitting}
              />
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 animate-spin text-teal-500" size={20} />
              )}
              {selectedLocation && !isSearching && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear selected location"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.lat}-${suggestion.lng}-${index}`}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-teal-50 flex items-start gap-3 border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <MapPin className="text-teal-500 mt-0.5 flex-shrink-0" size={18} />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {suggestion.city || suggestion.displayName.split(',')[0]}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {suggestion.state ? `${suggestion.state}, ` : ''}{suggestion.countryName}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Map */}
          <div className="rounded-xl overflow-hidden border-2 border-slate-200">
            <MapComponent
              selectedLocation={selectedLocation}
              onMapClick={handleMapClick}
            />
          </div>

          {/* Selected Location Display */}
          {selectedLocation && (
            <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-200 rounded-xl p-4 flex items-center gap-3">
              <div className="bg-teal-500 rounded-full p-2">
                <MapPin className="text-white" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">
                  {selectedLocation.city || 'Selected Location'}
                </p>
                <p className="text-sm text-slate-600 truncate">
                  {selectedLocation.countryName}
                </p>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Clear selected location"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Fun Fact */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-amber-800">Did you know?</p>
              <p className="text-sm text-amber-700">{funFact}</p>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={onCancel}
              className="flex-1"
              disabled={isSubmitting}
            >
              Back
            </Button>
            <Button
              variant="accent"
              type="submit"
              className="flex-[2] flex items-center justify-center gap-2"
              disabled={isSubmitting || (!selectedLocation && !query.trim())}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Getting ready...
                </>
              ) : (
                <>
                  Start Adventure <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
