
import React, { useState } from 'react';
import { Search, MapPin, Navigation, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '../Button';
import { resolveLocation } from '../../services/geminiService';

interface LocationPickerProps {
  onLocationSelect: (countryCode: string, city: string, countryName: string) => void;
  onCancel: () => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelect, onCancel }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    countryCode: string;
    countryName: string;
    city: string;
    lat: number;
    lng: number;
    fact: string;
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setIsLoading(true);
    const data = await resolveLocation(input);
    setIsLoading(false);
    
    if (data) {
      setResult(data);
    }
  };

  const getPinStyle = (lat: number, lng: number) => {
    const x = (lng + 180) * (100 / 360);
    const y = (lat * -1 + 90) * (100 / 180);
    return { left: `${x}%`, top: `${y}%` };
  };

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center p-6">
       <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-indigo-100">
          <div className="bg-teal-600 p-6 text-white text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
             <h2 className="font-kid text-3xl font-bold mb-2 relative z-10">Where are you today?</h2>
             <p className="opacity-90 relative z-10">Type the city or place name!</p>
          </div>

          <div className="p-8">
             {/* Search Form */}
             <form onSubmit={handleSearch} className="flex gap-2 mb-8">
                <div className="relative flex-1">
                   <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                   <input 
                     type="text"
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     placeholder="e.g. Paris, Tokyo, Bali..."
                     className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-lg transition-colors"
                   />
                </div>
                <Button type="submit" size="lg" disabled={isLoading} className="rounded-xl aspect-square flex items-center justify-center bg-teal-600 hover:bg-teal-700">
                   {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
                </Button>
             </form>

             {/* Map / Result Area */}
             <div className="relative w-full aspect-video bg-indigo-100 rounded-xl overflow-hidden border border-indigo-200 mb-6 group">
                 <svg className="absolute inset-0 w-full h-full opacity-30 text-indigo-300" fill="currentColor" viewBox="0 0 100 50" preserveAspectRatio="none">
                     <path d="M20,10 Q25,5 30,10 T40,15 T50,10 T60,15 T70,10 T80,15 T90,10 V40 H20 Z" /> 
                     <rect x="0" y="0" width="100" height="50" fill="#e0e7ff" />
                     <path d="M10,10 C15,5 25,5 30,15 C25,25 15,25 10,15 Z" fill="white" /> 
                     <path d="M35,30 C40,25 50,25 55,35 C50,45 40,45 35,35 Z" fill="white" />
                     <path d="M45,10 C50,5 65,5 60,20 C55,25 45,20 45,10 Z" fill="white" /> 
                     <path d="M65,10 C70,5 90,5 85,20 C80,25 70,20 65,10 Z" fill="white" />
                     <path d="M75,35 C80,30 90,30 85,40 C80,45 75,40 75,35 Z" fill="white" />
                 </svg>

                 {result && (
                    <div className="absolute w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out animate-bounce"
                         style={getPinStyle(result.lat, result.lng)}>
                    </div>
                 )}

                 {!result && !isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center text-indigo-400 font-medium text-lg">
                       Search to drop a pin!
                    </div>
                 )}
             </div>

             {/* Confirmation */}
             {result && (
                <div className="bg-teal-50 rounded-xl p-6 border border-teal-100 animate-in slide-in-from-bottom-4">
                   <div className="flex items-start gap-4">
                      <div className="bg-white p-3 rounded-full shadow-sm text-2xl border border-teal-100">
                         📍
                      </div>
                      <div className="flex-1">
                         <h3 className="font-bold text-slate-800 text-xl">{result.city}, {result.countryName}</h3>
                         <p className="text-teal-700 font-medium mt-1">"{result.fact}"</p>
                      </div>
                   </div>
                   <div className="mt-6 flex gap-3">
                      <Button variant="secondary" onClick={onCancel} className="flex-1">Try Again</Button>
                      <Button 
                        variant="accent" 
                        className="flex-[2]" 
                        onClick={() => onLocationSelect(result.countryCode, result.city, result.countryName)}
                      >
                        Start Adventure <ArrowRight className="ml-2" size={18} />
                      </Button>
                   </div>
                </div>
             )}
             
             {!result && (
                <div className="text-center">
                    <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};
