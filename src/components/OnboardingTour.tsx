/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Onboarding Tour Component
 *  @author Ruslan Aliyev
 *  Interactive first-time user guide
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, SkipForward, CheckCircle } from 'lucide-react';

interface TourStep {
    id: string;
    target: string; // CSS selector
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    optional?: boolean; // Skip if target not found
    // Custom padding for spotlight (top, right, bottom, left)
    spotlightPadding?: { top?: number; right?: number; bottom?: number; left?: number };
}

interface OnboardingTourProps {
    onComplete: () => void;
    onSkip: () => void;
}

const tourSteps: TourStep[] = [
    {
        id: 'welcome',
        target: '',
        title: 'Welcome to SynCinema! 🎬',
        description: 'This quick tour will show you the main features. Click "Next" when you\'re ready.',
        position: 'center'
    },
    {
        id: 'video-area',
        target: '[data-tour="video-area"]',
        title: 'Video Player',
        description: 'Drag and drop your video file here, or use the "Load Video" button in the sidebar.',
        position: 'left',
        // Extend to screen edges (will be calculated dynamically)
        spotlightPadding: { top: 0, right: 20, bottom: 10, left: 0 }
    },
    {
        id: 'sidebar',
        target: '[data-tour="sidebar"]',
        title: 'Control Panel',
        description: 'Manage all your audio tracks, settings, and projects from this sidebar.',
        position: 'right'
    },
    {
        id: 'audio-tracks',
        target: '[data-tour="audio-tracks"]',
        title: 'Audio Tracks',
        description: 'Add multiple audio files and route each one to a different speaker or headphone.',
        position: 'right',
        // Ensure full panel is highlighted
        spotlightPadding: { top: 0, right: 0, bottom: 0, left: 0 }
    },
    {
        id: 'device-select',
        target: '[data-tour="device-select"]',
        title: 'Output Device',
        description: 'Select a different output device for each audio track. Perfect for family movie nights!',
        position: 'right',
        optional: true
    },
    {
        id: 'offset-control',
        target: '[data-tour="offset-control"]',
        title: 'Sync Offset',
        description: 'Fine-tune the audio delay to perfectly sync with the video.',
        position: 'right',
        optional: true
    },
    {
        id: 'eq-control',
        target: '[data-tour="eq-control"]',
        title: '3-Band Equalizer',
        description: 'Adjust Bass, Mid, and Treble to customize the audio quality.',
        position: 'right',
        optional: true
    },
    {
        id: 'shortcuts',
        target: '',
        title: 'Keyboard Shortcuts ⌨️',
        description: 'Space: Play/Pause | J-K-L: Rewind-Pause-Forward | F: Fullscreen | M: Mute | ←→: Seek 5s',
        position: 'center'
    },
    {
        id: 'complete',
        target: '',
        title: 'You\'re Ready! 🎉',
        description: 'Start by loading a video and adding audio tracks. Enjoy your movie!',
        position: 'center'
    }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, onSkip }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [activeSteps, setActiveSteps] = useState<TourStep[]>([]);

    // Filter steps based on available elements
    useEffect(() => {
        const filteredSteps = tourSteps.filter(step => {
            if (!step.target) return true;
            if (!step.optional) return true;
            const element = document.querySelector(step.target);
            return !!element;
        });
        setActiveSteps(filteredSteps);
    }, []);

    const step = activeSteps[currentStep] || tourSteps[0];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === activeSteps.length - 1;
    const progress = activeSteps.length > 0 ? ((currentStep + 1) / activeSteps.length) * 100 : 0;

    // Find and highlight target element
    useEffect(() => {
        if (activeSteps.length === 0) return;

        setIsVisible(false);

        const timer = setTimeout(() => {
            if (step.target) {
                const element = document.querySelector(step.target);
                if (element) {
                    // Get the full bounding rect including all children
                    const rect = element.getBoundingClientRect();
                    setTargetRect(rect);

                    // Smooth scroll to element
                    const scrollY = window.scrollY + rect.top - 100;
                    window.scrollTo({ top: Math.max(0, scrollY), behavior: 'smooth' });
                } else {
                    setTargetRect(null);
                }
            } else {
                setTargetRect(null);
            }
            setIsVisible(true);
        }, 400);

        return () => clearTimeout(timer);
    }, [currentStep, step.target, activeSteps.length]);

    const handleNext = useCallback(() => {
        if (isLastStep) {
            onComplete();
        } else {
            setCurrentStep(prev => Math.min(prev + 1, activeSteps.length - 1));
        }
    }, [isLastStep, onComplete, activeSteps.length]);

    const handlePrev = useCallback(() => {
        if (!isFirstStep) {
            setCurrentStep(prev => Math.max(prev - 1, 0));
        }
    }, [isFirstStep]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
            handleNext();
        } else if (e.key === 'ArrowLeft') {
            handlePrev();
        } else if (e.key === 'Escape') {
            onSkip();
        }
    }, [handleNext, handlePrev, onSkip]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Calculate tooltip position
    const getTooltipStyle = (): React.CSSProperties => {
        if (step.position === 'center' || !targetRect) {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            };
        }

        const padding = 24;

        switch (step.position) {
            case 'top':
                return {
                    bottom: window.innerHeight - targetRect.top + padding,
                    left: Math.max(200, Math.min(window.innerWidth - 200, targetRect.left + targetRect.width / 2)),
                    transform: 'translateX(-50%)'
                };
            case 'bottom':
                return {
                    top: targetRect.bottom + padding,
                    left: Math.max(200, Math.min(window.innerWidth - 200, targetRect.left + targetRect.width / 2)),
                    transform: 'translateX(-50%)'
                };
            case 'left':
                return {
                    top: Math.max(100, Math.min(window.innerHeight - 280, targetRect.top + targetRect.height / 2)),
                    right: window.innerWidth - targetRect.left + padding,
                    transform: 'translateY(-50%)',
                    maxWidth: 380
                };
            case 'right':
                return {
                    top: Math.max(100, Math.min(window.innerHeight - 280, targetRect.top + targetRect.height / 2)),
                    left: targetRect.right + padding,
                    transform: 'translateY(-50%)',
                    maxWidth: 380
                };
            default:
                return {
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                };
        }
    };

    if (activeSteps.length === 0) return null;

    // Calculate spotlight bounds with padding
    const basePadding = 8;
    const customPadding = step.spotlightPadding || {};

    // Special handling for video-area to extend to screen edges
    let spotlightStyle = null;
    if (targetRect) {
        if (step.id === 'video-area') {
            // For video player: extend from sidebar edge to screen right, and include control bar
            spotlightStyle = {
                top: targetRect.top - basePadding,
                left: targetRect.left - basePadding,
                width: (window.innerWidth - targetRect.left) + basePadding, // Extend to right edge
                height: (window.innerHeight - targetRect.top) + basePadding, // Extend to bottom edge
            };
        } else {
            // Default calculation
            spotlightStyle = {
                top: targetRect.top - basePadding - (customPadding.top || 0),
                left: targetRect.left - basePadding - (customPadding.left || 0),
                width: targetRect.width + (basePadding * 2) + (customPadding.left || 0) + (customPadding.right || 0),
                height: targetRect.height + (basePadding * 2) + (customPadding.top || 0) + (customPadding.bottom || 0),
            };
        }
    }

    return (
        <div className="fixed inset-0 z-[200]">
            {/* Dark overlay background */}
            <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                    opacity: isVisible ? 1 : 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)'
                }}
            />

            {/* Spotlight with neon border - COMPLETE RECTANGLE */}
            {spotlightStyle && (
                <>
                    {/* Clear cutout in the overlay */}
                    <div
                        className="absolute transition-all duration-500 ease-out pointer-events-none"
                        style={{
                            top: spotlightStyle.top,
                            left: spotlightStyle.left,
                            width: spotlightStyle.width,
                            height: spotlightStyle.height,
                            opacity: isVisible ? 1 : 0,
                            backgroundColor: 'transparent',
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85)'
                        }}
                    />

                    {/* Neon border - separate element for crisp borders */}
                    <div
                        className="absolute rounded-lg transition-all duration-500 ease-out pointer-events-none"
                        style={{
                            top: spotlightStyle.top - 3,
                            left: spotlightStyle.left - 3,
                            width: spotlightStyle.width + 6,
                            height: spotlightStyle.height + 6,
                            opacity: isVisible ? 1 : 0,
                            border: '3px solid #a78bfa',
                            borderRadius: '12px',
                            boxShadow: `
                                0 0 15px 2px rgba(167, 139, 250, 0.7),
                                0 0 40px 5px rgba(167, 139, 250, 0.4),
                                inset 0 0 15px 2px rgba(167, 139, 250, 0.1)
                            `
                        }}
                    />
                </>
            )}

            {/* Tooltip - ALWAYS DARK THEME */}
            <div
                className={`absolute rounded-2xl shadow-2xl p-6 w-[380px] transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    }`}
                style={{
                    ...getTooltipStyle(),
                    backgroundColor: '#1e1b4b',
                    border: '1px solid #4c1d95',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.3)'
                }}
            >
                {/* Close button */}
                <button
                    onClick={onSkip}
                    className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-purple-900/50 transition-colors"
                    title="Skip Tour"
                >
                    <X size={18} style={{ color: '#a78bfa' }} />
                </button>

                {/* Progress bar - with right margin to avoid X button */}
                <div className="h-1.5 rounded-full mb-4 overflow-hidden mr-10" style={{ backgroundColor: '#4c1d95' }}>
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)'
                        }}
                    />
                </div>

                {/* Step counter */}
                <div className="text-xs mb-3 font-medium" style={{ color: '#a78bfa' }}>
                    Step {currentStep + 1} of {activeSteps.length}
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3" style={{ color: '#ffffff' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: '#e9d5ff' }}>{step.description}</p>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-3">
                    {/* Skip button */}
                    <button
                        onClick={onSkip}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg hover:bg-purple-900/50 transition-colors"
                        style={{ color: '#c4b5fd' }}
                    >
                        <SkipForward size={14} />
                        <span>Skip</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {/* Previous button */}
                        {!isFirstStep && (
                            <button
                                onClick={handlePrev}
                                className="flex items-center gap-1 px-4 py-2.5 text-sm rounded-lg transition-colors"
                                style={{
                                    backgroundColor: '#4c1d95',
                                    color: '#ffffff'
                                }}
                            >
                                <ChevronLeft size={16} />
                                <span>Back</span>
                            </button>
                        )}

                        {/* Next/Complete button */}
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-1 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all hover:scale-105"
                            style={{
                                background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                                color: '#ffffff',
                                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.5)'
                            }}
                        >
                            {isLastStep ? (
                                <>
                                    <CheckCircle size={16} />
                                    <span>Done</span>
                                </>
                            ) : (
                                <>
                                    <span>Next</span>
                                    <ChevronRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Keyboard hint */}
                <div className="mt-4 pt-3 text-xs text-center" style={{ borderTop: '1px solid #4c1d95', color: '#7c3aed' }}>
                    Use ← → arrow keys to navigate
                </div>
            </div>
        </div>
    );
};
