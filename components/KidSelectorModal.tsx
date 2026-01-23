import React from 'react';
import { KidProfile } from '../types';
import { Button } from './Button';
import { X, Plane } from 'lucide-react';

interface KidSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  kids: KidProfile[];
  onSelect: (kidId: string) => void;
  title?: string;
}

export const KidSelectorModal: React.FC<KidSelectorModalProps> = ({
  isOpen,
  onClose,
  kids,
  onSelect,
  title = "Who's going on this trip?"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Plane size={24} className="text-teal-600" />
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-3">
          {kids.map((kid) => (
            <button
              key={kid.id}
              onClick={() => onSelect(kid.id)}
              className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all flex items-center gap-4 text-left group"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl border-2 border-indigo-200 group-hover:border-teal-300 transition-colors">
                {kid.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{kid.name}</p>
                <p className="text-sm text-slate-500">
                  Age {kid.age} • {kid.sessions.length} trip{kid.sessions.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </div>
            </button>
          ))}
        </div>
        
        <div className="mt-6">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

