
import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Save, Trash2, Pencil } from 'lucide-react';
import { Button } from '../Button';

interface DrawingCanvasProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'draw' | 'photo'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const colors = ['#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

  // Initialize Canvas
  useEffect(() => {
    if (activeTab === 'draw') {
        const canvas = canvasRef.current;
        if (canvas) {
        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = 400; // Fixed height
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            }
        }
        }
    }
  }, [activeTab]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.closePath();
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setUploadedImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSave = () => {
    if (activeTab === 'draw' && canvasRef.current) {
      onSave(canvasRef.current.toDataURL());
    } else if (activeTab === 'photo' && uploadedImage) {
        onSave(uploadedImage);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100">
      <div className="bg-indigo-50 p-2 flex items-center justify-center gap-2 border-b border-indigo-100">
         <button 
            onClick={() => setActiveTab('draw')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'draw' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
         >
            Draw
         </button>
         <button 
            onClick={() => setActiveTab('photo')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'photo' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
         >
            Upload Photo
         </button>
      </div>

      {activeTab === 'draw' ? (
          <>
            <div className="p-4 bg-indigo-50/50 flex items-center justify-between">
                <h3 className="text-indigo-900 font-bold text-lg">Draw your memory!</h3>
                <button onClick={clearCanvas} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                    <Trash2 size={20} />
                </button>
            </div>
            
            <div className="w-full relative bg-white touch-none border-y border-indigo-50">
                <canvas
                ref={canvasRef}
                className="block cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                />
            </div>

            <div className="p-4 bg-indigo-50 flex flex-col gap-4">
                <div className="flex justify-center gap-2 overflow-x-auto pb-2">
                    {colors.map(c => (
                        <button 
                            key={c} 
                            onClick={() => setColor(c)}
                            className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                    <div className="w-px h-8 bg-slate-300 mx-2"></div>
                    <button onClick={() => setColor('#ffffff')} className={`flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border-2 ${color === '#ffffff' ? 'border-slate-800' : 'border-slate-200'}`}>
                        <Eraser size={16} className="text-slate-600"/>
                    </button>
                </div>
            </div>
          </>
      ) : (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px] bg-indigo-50/30">
              {uploadedImage ? (
                  <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden shadow-md">
                      <img src={uploadedImage} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setUploadedImage(null)}
                        className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-red-500"
                      >
                          <Trash2 size={16} />
                      </button>
                  </div>
              ) : (
                  <div className="border-4 border-dashed border-indigo-200 rounded-xl p-10 text-center w-full mb-6 hover:bg-indigo-50 transition-colors">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload}
                        className="hidden" 
                        id="photo-upload"
                      />
                      <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center">
                          <div className="bg-indigo-100 p-4 rounded-full mb-4">
                             <Save className="text-indigo-500" size={32} />
                          </div>
                          <span className="text-indigo-800 font-bold text-lg">Choose a Photo</span>
                          <span className="text-indigo-400 text-sm mt-1">from your device</span>
                      </label>
                  </div>
              )}
          </div>
      )}

      <div className="p-4 bg-white border-t border-indigo-100 flex gap-3">
        <Button onClick={onCancel} variant="secondary" fullWidth>Cancel</Button>
        <Button onClick={handleSave} variant="accent" fullWidth disabled={activeTab === 'photo' && !uploadedImage}>Save Memory</Button>
      </div>
    </div>
  );
};
