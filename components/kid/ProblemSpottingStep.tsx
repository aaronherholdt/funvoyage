import React, { useState } from 'react';
import { Lightbulb, MessageCircle, ChevronLeft, AlertTriangle } from 'lucide-react';
import { Button } from '../Button';
import { getAgeTheme } from '../../constants';

interface ProblemSpottingStepProps {
    city: string;
    countryName: string;
    age: number;
    onComplete: (problems: string[]) => void;
    onBack: () => void;
}

export const ProblemSpottingStep: React.FC<ProblemSpottingStepProps> = ({
    city,
    countryName,
    age,
    onComplete,
    onBack
}) => {
    const [problems, setProblems] = useState(['', '', '']);
    const theme = getAgeTheme(age);

    const location = city || countryName;

    const updateProblem = (index: number, value: string) => {
        const updated = [...problems];
        updated[index] = value;
        setProblems(updated);
    };

    const handleSubmit = () => {
        // Filter out empty problems
        const filledProblems = problems.filter(p => p.trim() !== '');
        onComplete(filledProblems);
    };

    // Age-appropriate prompts
    const getTitle = () => {
        if (age <= 6) {
            return `What was tricky in ${location}? 🤔`;
        } else if (age <= 9) {
            return `What challenges did you notice in ${location}?`;
        } else if (age <= 12) {
            return `What problems or issues did you spot in ${location}?`;
        }
        return `What challenges or issues stood out to you in ${location}?`;
    };

    const getSubtitle = () => {
        if (age <= 6) {
            return 'Was anything hard or not quite right? Tell me!';
        } else if (age <= 9) {
            return 'Think about things that seemed difficult or could be better.';
        } else if (age <= 12) {
            return 'Consider environmental, social, or practical challenges you observed.';
        }
        return 'Reflect on environmental, social, economic, or infrastructural issues you noticed.';
    };

    const getPlaceholders = () => {
        if (age <= 6) {
            return ['Something tricky...', 'Another thing...', 'One more...'];
        } else if (age <= 9) {
            return [
                'e.g. Lots of trash on the beach',
                'e.g. Long lines everywhere',
                'e.g. Hard to find recycling bins'
            ];
        } else if (age <= 12) {
            return [
                'e.g. Heavy traffic causing pollution',
                'e.g. Limited public transportation options',
                'e.g. Overflowing tourist areas'
            ];
        }
        return [
            'e.g. Informal settlements with limited services',
            'e.g. Water scarcity affecting local agriculture',
            'e.g. Cultural heritage sites at risk from overtourism'
        ];
    };

    const placeholders = getPlaceholders();
    const filledCount = problems.filter(p => p.trim() !== '').length;

    return (
        <div className={`min-h-screen ${theme.containerBg} flex flex-col`}>
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md p-4 border-b border-sand-100 flex items-center justify-between sticky top-0 z-10">
                <Button variant="ghost" size="sm" onClick={onBack} className="text-sand-500">
                    <ChevronLeft size={18} /> Back
                </Button>
                <div className="flex items-center gap-2">
                    <Lightbulb className="text-coral-500" size={20} />
                    <span className="font-bold text-sand-800">Problem Spotting</span>
                </div>
                <div className="w-16" />
            </header>

            {/* Main Content */}
            <div className="flex-1 p-6 flex flex-col max-w-2xl mx-auto w-full">
                <div className="mb-8">
                    <h1 className={`text-2xl font-bold text-slate-800 mb-2 ${theme.font}`}>
                        {getTitle()}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        {getSubtitle()}
                    </p>
                </div>

                {/* Problem Inputs */}
                <div className="space-y-4 mb-8 flex-1">
                    {problems.map((problem, index) => (
                        <div key={index} className="relative animate-reveal-up" style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-coral-100 flex items-center justify-center text-coral-600 font-bold text-sm">
                                {index + 1}
                            </div>
                            <input
                                type="text"
                                value={problem}
                                onChange={(e) => updateProblem(index, e.target.value)}
                                placeholder={placeholders[index]}
                                className={`w-full pl-14 pr-4 py-4 rounded-xl border-2 border-sand-200 focus:border-ocean-500 focus:outline-none text-lg transition-colors ${theme.font}`}
                            />
                        </div>
                    ))}
                </div>

                {/* Tip Box */}
                <div className="bg-coral-50 border border-coral-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertTriangle className="text-coral-500 mt-0.5" size={18} />
                    <div>
                        <p className="text-sm font-bold text-coral-800">Pro Tip</p>
                        <p className="text-sm text-coral-700">
                            {age <= 9
                                ? "It's okay if you only think of one or two! Every problem-spotter starts somewhere."
                                : "You don't need to fill all three. Quality over quantity – one well-thought-out observation is great!"
                            }
                        </p>
                    </div>
                </div>

                {/* Submit Button */}
                <Button
                    fullWidth
                    size="lg"
                    onClick={handleSubmit}
                    disabled={filledCount === 0}
                    className={`${filledCount > 0 ? theme.button : 'bg-sand-300 cursor-not-allowed'} flex items-center justify-center gap-2`}
                >
                    <MessageCircle size={18} />
                    {age <= 6 ? 'Talk with Nia! 🌟' : 'Discuss with Nia'}
                </Button>

                {filledCount === 0 && (
                    <p className="text-center text-sand-400 text-sm mt-3">
                        Add at least one challenge to continue
                    </p>
                )}
            </div>
        </div>
    );
};
