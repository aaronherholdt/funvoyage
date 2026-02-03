import React from 'react';
import { Button } from './Button';
import { X, UserPlus } from 'lucide-react';

interface AddChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  data: { name: string; age: string };
  onChange: (data: { name: string; age: string }) => void;
  editMode?: boolean;
}

export const AddChildModal: React.FC<AddChildModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  data,
  onChange,
  editMode = false
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserPlus size={24} className="text-teal-600" />
            {editMode ? 'Edit Traveler' : 'Add New Traveler'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            type="button"
            aria-label="Close add traveler modal"
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="add-child-name" className="block text-sm font-bold text-slate-700 mb-1">
                First Name
              </label>
              <input
                id="add-child-name"
                type="text"
                value={data.name}
                onChange={(e) => onChange({ ...data, name: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors"
                placeholder="e.g. Maya"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="add-child-age" className="block text-sm font-bold text-slate-700 mb-1">
                Age
              </label>
              <input
                id="add-child-age"
                type="number"
                min="4"
                max="18"
                value={data.age}
                onChange={(e) => onChange({ ...data, age: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors"
                placeholder="e.g. 10"
              />
              <p className="text-xs text-slate-400 mt-1">
                Nia adapts her questions and style based on age (4-18).
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={onClose} fullWidth type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!data.name.trim() || !data.age || parseInt(data.age) < 4 || parseInt(data.age) > 18}
              fullWidth
            >
              {editMode ? 'Save Changes' : 'Add Traveler'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

