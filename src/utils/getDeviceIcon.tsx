import React from 'react';
import { Headphones, Mic, Radio, Monitor, Speaker } from 'lucide-react';

/**
 * Returns an icon component based on the device label.
 * @param label - The label of the audio device
 * @returns ReactNode containing the appropriate Lucide icon
 */
export const getDeviceIcon = (label: string): React.ReactNode => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('headphone') || lowerLabel.includes('headset') || lowerLabel.includes('earphone')) {
        return <Headphones size={14} />;
    }
    if (lowerLabel.includes('microphone') || lowerLabel.includes('mic')) {
        return <Mic size={14} />;
    }
    if (lowerLabel.includes('bluetooth') || lowerLabel.includes('wireless')) {
        return <Radio size={14} />;
    }
    if (lowerLabel.includes('monitor') || lowerLabel.includes('display') || lowerLabel.includes('hdmi')) {
        return <Monitor size={14} />;
    }
    return <Speaker size={14} />;
};
