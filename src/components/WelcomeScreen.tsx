/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Welcome Screen Component
 *  @author Ruslan Aliyev
 *  First-time user onboarding and welcome splash screen
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { ArrowRight, Headphones, Film, Sliders, Zap } from 'lucide-react';

interface WelcomeScreenProps {
    onComplete: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleStart = () => {
        setIsExiting(true);
        // Wait for exit animation before calling onComplete
        setTimeout(() => {
            onComplete();
        }, 500);
    };

    const features = [
        { icon: <Film size={20} />, title: 'Multi-Track Video', desc: 'Play video with multiple audio tracks' },
        { icon: <Headphones size={20} />, title: 'Multi-Output', desc: 'Route audio to different devices' },
        { icon: <Sliders size={20} />, title: '3-Band EQ', desc: 'Fine-tune each audio channel' },
        { icon: <Zap size={20} />, title: 'Real-time Sync', desc: 'Perfect synchronization' },
    ];

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 transition-all duration-500 ${isExiting ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
                }`}
        >
            {/* Animated Background Glow */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Content */}
            <div
                className={`relative z-10 max-w-lg mx-auto px-8 text-center transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
            >
                {/* Logo */}
                <div className={`mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                    <Logo size={120} className="mx-auto drop-shadow-[0_0_40px_rgba(99,102,241,0.6)]" />
                </div>

                {/* Title */}
                <h1
                    className={`text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                >
                    SynCinema
                </h1>

                {/* Tagline */}
                <p
                    className={`text-lg text-gray-400 mb-10 font-medium tracking-wide transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                >
                    Multi-Output Synchronized Player
                </p>

                {/* Feature Cards */}
                <div
                    className={`grid grid-cols-2 gap-4 mb-10 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                >
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="p-5 rounded-xl bg-gray-800/60 border border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/80 hover:border-indigo-500/50 transition-all duration-300 group shadow-lg"
                            style={{ transitionDelay: `${600 + index * 100}ms` }}
                        >
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="p-3 rounded-xl bg-indigo-600/30 text-indigo-300 group-hover:bg-indigo-600/50 group-hover:text-indigo-200 transition-colors shadow-inner">
                                    {feature.icon}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white mb-1">{feature.title}</h3>
                                    <p className="text-xs text-gray-300 leading-relaxed">{feature.desc}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Start Button */}
                <button
                    onClick={handleStart}
                    className={`group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105 active:scale-95 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                    style={{ transitionDelay: '800ms' }}
                >
                    <span>Get Started</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />

                    {/* Button Glow Effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 blur-xl opacity-50 group-hover:opacity-75 transition-opacity -z-10" />
                </button>
            </div>

            {/* Bottom Info */}
            <div
                className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-center transition-all duration-700 delay-1000 ${isVisible ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                <p className="text-xs text-gray-400 mb-4">
                    Press <kbd className="px-2 py-1 mx-1 bg-gray-700 border border-gray-600 rounded text-gray-300 font-mono text-[10px]">Enter</kbd> to continue
                </p>
                <div className="flex items-center justify-center gap-3 text-[11px] text-gray-400 tracking-wide">
                    <span>Version 1.0.0</span>
                    <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                    <span>Created by Ruslan Aliyev</span>
                </div>
            </div>
        </div>
    );
};
