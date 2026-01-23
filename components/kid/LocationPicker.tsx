import React, { useState } from 'react';
import { MapPin, ArrowRight, Loader2, Search, Globe2 } from 'lucide-react';
import { Button } from '../Button';
import { searchLocationOSM } from '../../services/osmService';

interface LocationPickerProps {
  onLocationSelect: (countryCode: string, city: string, countryName: string) => void;
  onCancel: () => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelect, onCancel }) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Type a town or city to start.');
      return;
    }

    setError('');
    setIsResolving(true);
    try {
      const result = await searchLocationOSM(query.trim());
      if (!result) {
        setError("Couldn't find that place. Try adding the country or nearby city.");
        return;
      }

      onLocationSelect(
        result.countryCode || 'XX',
        result.city || query.trim(),
        result.countryName || result.countryCode || 'Unknown country'
      );
    } catch (err) {
      console.error('Location lookup failed', err);
      setError('We had trouble reaching the map service. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-indigo-100">
        <div className="bg-teal-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <h2 className="font-kid text-3xl font-bold mb-2 relative z-10">Where are you today?</h2>
          <p className="opacity-90 relative z-10 flex items-center justify-center gap-2">
            <Globe2 size={18} /> Search any town in the world. We will match the country.
          </p>
        </div>

        <div className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Town or City</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try: Paris, Nairobi, Kyoto, Cusco"
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-lg transition-colors"
                  disabled={isResolving}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">No need to type the country—Nia will fetch it. Map comes later.</p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={onCancel} className="flex-1" disabled={isResolving}>
                Back
              </Button>
              <Button 
                variant="accent" 
                type="submit" 
                className="flex-[2] flex items-center justify-center gap-2"
                disabled={isResolving}
              >
                {isResolving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Finding your spot...
                  </>
                ) : (
                  <>
                    Start Adventure <ArrowRight size={18} />
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
            <MapPin className="text-indigo-400 mt-1" size={18} />
            <div>
              <p className="text-sm font-bold text-slate-800">Examples</p>
              <p className="text-sm text-slate-600">"Queenstown", "Accra", "Reykjavik", "Cartagena".</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
