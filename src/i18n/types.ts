/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Internationalization (i18n) System
 *  @author Ruslan Aliyev
 *  Multi-language support for the application
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Supported languages
export type Language = 'en' | 'tr' | 'az' | 'ru';

// Language metadata
export interface LanguageInfo {
    code: Language;
    name: string;
    nativeName: string;
    flag: string;
}

export const LANGUAGES: LanguageInfo[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
    { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycanca', flag: '🇦🇿' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
];

// Translation keys structure
export interface Translations {
    // App general
    app: {
        title: string;
        subtitle: string;
        version: string;
        createdBy: string;
    };

    // Welcome screen
    welcome: {
        getStarted: string;
        features: {
            multiTrackVideo: string;
            multiTrackVideoDesc: string;
            multiOutput: string;
            multiOutputDesc: string;
            eq3Band: string;
            eq3BandDesc: string;
            realTimeSync: string;
            realTimeSyncDesc: string;
        };
    };

    // Sidebar
    sidebar: {
        saveProject: string;
        loadProject: string;
        mainVideoSource: string;
        selectFile: string;
        loadUrl: string;
        subtitles: string;
        load: string;
        active: string;
        offset: string;
        audioTracks: string;
        masterVolume: string;
        noAudioTracks: string;
        videoVolume: string;
        mute: string;
        muted: string;
        videoAudioOutput: string;
        defaultOutput: string;
        markers: string;
        addMarker: string;
        noMarkers: string;
        audioUrlLabel: string;
        audioUrlPlaceholder: string;
        addAudioTrackBtn: string;
        cancelBtn: string;
        audioSupports: string;
    };

    // URL Loader Modal
    urlLoader: {
        title: string;
        subtitle: string;
        label: string;
        placeholder: string;
        loadBtn: string;
        supportedSources: {
            title: string;
            directLinks: string;
            dropbox: string;
            googleDrive: string;
            youtube: string;
            https: string;
        };
        limitations: {
            title: string;
            youtube: string;
            googleDrive: string;
            drm: string;
        };
    };

    // Audio track row
    audioTrack: {
        volume: string;
        speed: string;
        delete: string;
        outputDevice: string;
        defaultDevice: string;
        advanced: string;
        offsetAdjustment: string;
        reset: string;
        eq3Band: string;
        bass: string;
        mid: string;
        treble: string;
        limiter: string;
        limiterActive: string;
        enableLimiter: string;
    };

    // Video player
    player: {
        noVideoLoaded: string;
        play: string;
        pause: string;
        fullscreen: string;
        exitFullscreen: string;
        volume: string;
        speed: string;
        loading: string;
    };



    // Help panel - expanded for all sections
    help: {
        title: string;
        guide: string;
        pressEscToClose: string;
        sections: {
            videoControls: string;
            audioTracks: string;
            projectManagement: string;
            keyboardShortcuts: string;
            settings: string;
            urlSources: string;
            platformRequirements: string;
        };
        // Video Controls items
        videoControls: {
            playPause: string;
            playPauseDesc: string;
            rewind: string;
            rewindDesc: string;
            forward: string;
            forwardDesc: string;
            progressBar: string;
            progressBarDesc: string;
            volume: string;
            volumeDesc: string;
            fullscreen: string;
            fullscreenDesc: string;
            detachPlayer: string;
            detachPlayerDesc: string;
        };
        // Audio Tracks items
        audioTracks: {
            addAudio: string;
            addAudioDesc: string;
            outputDevice: string;
            outputDeviceDesc: string;
            startOffset: string;
            startOffsetDesc: string;
            playbackSpeed: string;
            playbackSpeedDesc: string;
            volume: string;
            volumeDesc: string;
            masterVolume: string;
            masterVolumeDesc: string;
            eq3Band: string;
            eq3BandDesc: string;
            limiter: string;
            limiterDesc: string;
        };
        // Project Management items
        projectManagement: {
            saveProject: string;
            saveProjectDesc: string;
            loadProject: string;
            loadProjectDesc: string;
            subtitles: string;
            subtitlesDesc: string;
            markers: string;
            markersDesc: string;
        };
        // Keyboard shortcuts
        keyboardShortcuts: {
            space: string;
            spaceDesc: string;
            arrows: string;
            arrowsDesc: string;
            fKey: string;
            fKeyDesc: string;
            mKey: string;
            mKeyDesc: string;
            escKey: string;
            escKeyDesc: string;
        };
        // Settings
        settingsSection: {
            theme: string;
            themeDesc: string;
            language: string;
            languageDesc: string;
        };
        // URL Sources
        urlSources: {
            youtube: string;
            youtubeDesc: string;
            dropbox: string;
            dropboxDesc: string;
            googleDrive: string;
            googleDriveDesc: string;
            directLinks: string;
            directLinksDesc: string;
            youtubeLimitations: string;
            youtubeLimitationsDesc: string;
            notSupported: string;
            notSupportedDesc: string;
        };
        // Platform Requirements
        platform: {
            desktop: string;
            desktopDesc: string;
            mobile: string;
            mobileDesc: string;
            mobileWhy: string;
            mobileWhyDesc: string;
            mobileWorks: string;
            mobileWorksDesc: string;
        };
    };

    // Settings
    settings: {
        title: string;
        theme: string;
        dark: string;
        light: string;
        language: string;
    };

    // Common
    common: {
        close: string;
        save: string;
        cancel: string;
        delete: string;
        reset: string;
        loading: string;
        error: string;
        success: string;
        warning: string;
        info: string;
        yes: string;
        no: string;
        ok: string;
        back: string;
        next: string;
        skip: string;
        done: string;
    };

    // Onboarding tour
    tour: {
        welcome: string;
        welcomeDesc: string;
        videoSource: string;
        videoSourceDesc: string;
        audioTracks: string;
        audioTracksDesc: string;
        controls: string;
        controlsDesc: string;
        complete: string;
        completeDesc: string;
    };
}
