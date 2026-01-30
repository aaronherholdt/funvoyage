import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../Button';
import { getAgeTheme } from '../../constants';

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((event: any) => void) | null;
    onend: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
}

interface JournalStepProps {
    city: string;
    countryName: string;
    age: number;
    onComplete: (journalEntry: string) => void;
    onBack: () => void;
}

export const JournalStep: React.FC<JournalStepProps> = ({
    city,
    countryName,
    age,
    onComplete,
    onBack
}) => {
    const [journalText, setJournalText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const theme = getAgeTheme(age);

    const location = city || countryName;

    // Track the text that was in the textarea BEFORE we started this recording session
    const baseTextRef = useRef('');
    // Track what we've already "committed" as final from this session
    const committedTextRef = useRef('');

    // Initialize speech recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            if (recognitionRef.current) {
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onresult = (event: any) => {
                    let finalTranscript = '';
                    let interimTranscript = '';

                    // Loop through results - start from resultIndex (new results only)
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const result = event.results[i];
                        const transcript = result[0].transcript;

                        if (result.isFinal) {
                            // This phrase is complete - add to final transcript
                            finalTranscript += transcript;
                        } else {
                            // Still being processed - show as preview
                            interimTranscript += transcript;
                        }
                    }

                    // If we got final results, commit them
                    if (finalTranscript) {
                        committedTextRef.current += finalTranscript;
                    }

                    // Build the display text:
                    // Base (what was there before) + Committed (finalized this session) + Interim (preview)
                    const base = baseTextRef.current.trim();
                    const committed = committedTextRef.current;
                    const interim = interimTranscript;

                    // Combine with proper spacing
                    let displayText = base;
                    if (committed) {
                        displayText = displayText ? `${displayText} ${committed}` : committed;
                    }
                    if (interim) {
                        displayText = displayText ? `${displayText} ${interim}` : interim;
                    }

                    setJournalText(displayText);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);
                };
            }
        }

        return () => {
            recognitionRef.current?.abort?.();
        };
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            // Save current text as base before starting new recording
            baseTextRef.current = journalText;
            // Reset committed text for this new session
            committedTextRef.current = '';
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const handleNext = () => {
        onComplete(journalText.trim());
    };

    // Age-appropriate prompts
    const getPrompt = () => {
        if (age <= 6) {
            return `What did you see in ${location}? 🌟`;
        } else if (age <= 9) {
            return `Tell me about your adventure in ${location}!`;
        } else if (age <= 12) {
            return `What stood out to you about ${location}? Write about your experience.`;
        }
        return `Reflect on your time in ${location}. What did you observe, think, or feel?`;
    };

    const getPlaceholder = () => {
        if (age <= 6) {
            return 'I saw...';
        } else if (age <= 9) {
            return 'Today I went to... and I saw...';
        } else if (age <= 12) {
            return 'During my visit, I noticed...';
        }
        return 'Write your thoughts and observations here...';
    };

    return (
        <div className={`min-h-dvh ${theme.containerBg} flex flex-col overscroll-contain`}>
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md p-4 border-b border-sand-100 flex items-center justify-between sticky top-0 z-10">
                <Button variant="ghost" size="sm" onClick={onBack} className="text-sand-500">
                    ← Back
                </Button>
                <div className="flex items-center gap-2">
                    <Sparkles className="text-coral-500" size={20} />
                    <span className="font-bold text-sand-800">Travel Journal</span>
                </div>
                <div className="w-16" />
            </header>

            {/* Main Content */}
            <div className="flex-1 p-4 md:p-6 px-safe flex flex-col max-w-2xl mx-auto w-full">
                <div className="mb-6">
                    <h1 className={`text-2xl font-bold text-slate-800 mb-2 ${theme.font}`}>
                        {getPrompt()}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Write or speak about your trip. What did you notice? What was interesting?
                    </p>
                </div>

                {/* Journal Text Area */}
                <div className="flex-1 mb-6">
                    <textarea
                        value={journalText}
                        onChange={(e) => setJournalText(e.target.value)}
                        placeholder={getPlaceholder()}
                        className={`w-full h-full min-h-[200px] md:min-h-[300px] p-4 rounded-2xl border-2 ${isListening ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
                            } focus:border-teal-500 focus:outline-none resize-none text-lg leading-relaxed transition-colors ${theme.font}`}
                    />
                </div>

                {/* Mic Button */}
                <div className="flex flex-col items-center gap-4 mb-6">
                    <button
                        onClick={toggleListening}
                        className={`
              w-16 h-16 rounded-full flex items-center justify-center transition-all transform active:scale-95 border-4 border-white shadow-lg
              ${isListening
                                ? 'bg-coral-500 text-white animate-pulse-glow'
                                : 'bg-ocean-500 text-white hover:bg-ocean-600 btn-magnetic'
                            }
            `}
                    >
                        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>
                    <p className="text-sand-400 text-sm">
                        {isListening ? 'Tap to stop recording' : 'Tap to speak your journal'}
                    </p>
                </div>

                {/* Next Button */}
                <Button
                    fullWidth
                    size="lg"
                    onClick={handleNext}
                    className={`${theme.button} flex items-center justify-center gap-2`}
                >
                    Next: Spot Challenges <ArrowRight size={18} />
                </Button>
            </div>
        </div>
    );
};
