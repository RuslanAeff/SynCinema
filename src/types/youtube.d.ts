// YouTube IFrame API type definitions
declare namespace YT {
    interface Player {
        playVideo(): void;
        pauseVideo(): void;
        stopVideo(): void;
        seekTo(seconds: number, allowSeekAhead: boolean): void;
        setVolume(volume: number): void;
        getVolume(): number;
        mute(): void;
        unMute(): void;
        isMuted(): boolean;
        getDuration(): number;
        getCurrentTime(): number;
        getPlayerState(): number;
        getPlaybackQuality(): string;
        getAvailableQualityLevels(): string[];
        destroy(): void;
    }

    interface PlayerEvent {
        target: Player;
        data: number;
    }

    interface PlayerOptions {
        videoId?: string;
        width?: number | string;
        height?: number | string;
        playerVars?: {
            autoplay?: 0 | 1;
            controls?: 0 | 1;
            modestbranding?: 0 | 1;
            rel?: 0 | 1;
            showinfo?: 0 | 1;
            fs?: 0 | 1;
            playsinline?: 0 | 1;
            origin?: string;
        };
        events?: {
            onReady?: (event: PlayerEvent) => void;
            onStateChange?: (event: PlayerEvent) => void;
            onError?: (event: PlayerEvent) => void;
        };
    }

    const PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
    };

    class Player {
        constructor(element: HTMLElement | string, options: PlayerOptions);
    }
}
