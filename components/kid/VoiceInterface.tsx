
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Send, Check, Loader2 } from 'lucide-react';
import { Button } from '../Button';
import { SessionEntry } from '../../types';
import { getAgeTheme } from '../../constants';

interface VoiceInterfaceProps {
  isSpeaking: boolean;
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  transcript: string;
  history: SessionEntry[];
  onSendTextFallback: (text: string) => void;
  age: number;
  forceTextFallback?: boolean;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  isSpeaking,
  isListening,
  onStartListening,
  onStopListening,
  transcript,
  history,
  onSendTextFallback,
  age,
  forceTextFallback = false
}) => {
  const [textInput, setTextInput] = useState('');
  const [visualizerBars, setVisualizerBars] = useState<number[]>([1, 1, 1, 1, 1]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const theme = getAgeTheme(age);
  const showTextFallback = theme.showText || forceTextFallback;

  // Auto scroll to bottom when history adds an item
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isListening]);

  // Audio visualizer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isListening || isSpeaking) {
      interval = setInterval(() => {
        setVisualizerBars(prev => prev.map(() => Math.random() * 24 + 8));
      }, 100);
    } else {
      setVisualizerBars([8, 8, 8, 8, 8]);
    }
    return () => clearInterval(interval);
  }, [isListening, isSpeaking]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      onSendTextFallback(textInput);
      setTextInput('');
    }
  };

  return (
    <div className={`flex flex-col h-full w-full mx-auto relative transition-colors duration-500 ${theme.containerBg} ${theme.font}`}>

      {/* Chat History Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 px-safe py-6 space-y-6 scroll-smooth mb-32 overscroll-contain">
        {history.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className={`animate-spin ${theme.navColor}`} size={32} />
          </div>
        )}

        {history.map((entry, index) => {
          const isUser = entry.role === 'user';
          const isLast = index === history.length - 1;

          return (
            <div
              key={index}
              className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} ${isLast && isUser ? 'animate-in slide-in-from-bottom-10 duration-500 ease-out' : ''}`}
            >
              {/* AI Bubble */}
              {!isUser && (
                <div className="flex items-end gap-2 max-w-[90%] md:max-w-[75%] lg:max-w-[65%]">
                  <div className="w-10 h-10 rounded-full bg-white flex-shrink-0 flex items-center justify-center text-xl shadow-sm border-2 border-sand-100">
                    {theme.aiAvatar}
                  </div>
                  <div className={`${theme.bubbleAi} p-5 relative leading-relaxed shadow-sm`}>
                    {entry.text}
                    {isLast && isSpeaking && (
                      <Volume2 size={20} className={`absolute -right-2 -top-2 ${theme.navColor} animate-pulse`} />
                    )}
                  </div>
                </div>
              )}

              {/* User Bubble */}
              {isUser && (
                <div className={`${theme.bubbleUser} p-4 max-w-[85%] md:max-w-[70%] lg:max-w-[60%] relative shadow-md`}>
                  {entry.text}
                  {/* Saved Indicator Icon */}
                  <div className="absolute -left-2 -top-2 bg-white text-green-500 rounded-full p-1 shadow-sm transform scale-0 animate-[popIn_0.3s_ease-out_0.2s_forwards]">
                    <Check size={14} strokeWidth={4} />
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Live Transcript Bubble */}
        {isListening && (
          <div className="flex justify-center w-full my-4">
            <div className="glass-dark text-white px-6 py-3 rounded-full animate-pulse shadow-lg max-w-[90%] text-center">
              <p className={`font-medium ${theme.font === 'font-kid' ? 'text-xl' : 'text-base'}`}>{transcript || "Listening..."}</p>
            </div>
          </div>
        )}

        <div className="h-24"></div>
      </div>

      {/* Bottom Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-safe px-safe bg-gradient-to-t from-white via-white/95 to-transparent pt-10">
        <div className="flex flex-col items-center gap-4">

          {/* Visualizer */}
          <div className={`h-8 flex items-center justify-center space-x-2 transition-opacity duration-300 ${isListening || isSpeaking ? 'opacity-100' : 'opacity-0'}`}>
            {visualizerBars.map((height, i) => (
              <div
                key={i}
                className={`w-2 rounded-full transition-all duration-100 visualizer-bar ${isListening ? 'bg-coral-500' : theme.visualizer
                  }`}
                style={{ height: `${height}px` }}
              />
            ))}
          </div>

          {/* Mic Button */}
          <button
            onClick={isListening ? onStopListening : onStartListening}
            className={`
                    relative rounded-full flex items-center justify-center transition-all transform active:scale-95 border-4 border-white
                    ${theme.micButtonSize}
                    ${isListening ? 'bg-coral-500 text-white scale-110 shadow-coral-200 animate-pulse-glow' : theme.button}
                `}
          >
            {isListening ? <MicOff size={theme.micIconSize} /> : <Mic size={theme.micIconSize} />}
          </button>

          <p className="text-sand-400 font-medium text-sm pb-2">
            {isListening ? "Tap to Save" : theme.prompt}
          </p>

          {/* Text Fallback - Hidden for toddlers unless explicitly needed */}
          {showTextFallback && (
            <div className="w-full max-w-md opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type here..."
                  className="flex-1 rounded-full border border-sand-200 bg-white px-4 py-2.5 text-base focus:outline-none focus:border-ocean-500 shadow-sm"
                />
                <Button type="submit" size="sm" variant="secondary" className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
                  <Send size={14} />
                </Button>
              </form>
            </div>
          )}

          <style>{`
                @keyframes popIn {
                    0% { transform: scale(0); }
                    80% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
      </div>
    </div>
  );
};
