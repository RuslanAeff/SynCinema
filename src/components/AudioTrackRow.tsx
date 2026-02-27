import React, { useEffect, useRef, useState } from 'react';
import { AudioTrack, AudioDevice, ExtendedMediaElement } from '../types';
import { Trash2, Volume2, VolumeX, Clock, Gauge, ChevronDown, ChevronUp, Headphones, Check, RotateCcw } from 'lucide-react';
import { AudioGraphManager } from './AudioGraphManager';
import { useI18n } from '../context/I18nContext';
import { eqPresets, getCurrentPresetId } from '../constants/eqPresets';
import { formatTime } from '../utils/formatTime';
import { getDeviceIcon } from '../utils/getDeviceIcon';

// Format seconds to MM:SS.d


// Get device icon based on label


interface AudioTrackRowProps {
  track: AudioTrack;
  availableDevices: AudioDevice[];
  videoCurrentTime: number;
  isVideoPlaying: boolean;
  onUpdate: (id: string, updates: Partial<AudioTrack>) => void;
  onDelete: (id: string) => void;
  syncThreshold: number;
  masterVolume?: number;
  onTrackEvent?: (event: string) => void;
  onShareSync?: (id: string, offset: number) => void;
}

export const AudioTrackRow: React.FC<AudioTrackRowProps> = ({
  track,
  availableDevices,
  videoCurrentTime,
  isVideoPlaying,
  onUpdate,
  onDelete,
  syncThreshold = 0.3,
  masterVolume = 1,
  onTrackEvent,
  onShareSync,
}) => {
  const { t } = useI18n();
  const audioRef = useRef<ExtendedMediaElement>(null);
  const [driftWarning, setDriftWarning] = useState(false);
  const [isSwitchingDevice, setIsSwitchingDevice] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const deviceDropdownRef = useRef<HTMLDivElement>(null);
  const warningTimeoutRef = useRef<number>(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deviceDropdownRef.current && !deviceDropdownRef.current.contains(event.target as Node)) {
        setIsDeviceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize audio source
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = track.objectUrl;
    }
  }, [track.objectUrl]);

  // Handle Play/Pause
  useEffect(() => {
    if (!audioRef.current || isSwitchingDevice) return;

    if (isVideoPlaying) {
      const targetTime = videoCurrentTime - track.offset;
      if (targetTime >= 0) {
        audioRef.current.play().catch(e => console.error("Audio play deferred", e));
      }
    } else {
      audioRef.current.pause();
    }
  }, [isVideoPlaying, isSwitchingDevice]);

  // Handle Playback Speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = track.playbackRate;
    }
  }, [track.playbackRate]);

  // Handle Synchronization - throttled to prevent audio crackling
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    if (!audioRef.current || isSwitchingDevice) return;

    // Throttle sync checks to every 500ms to prevent audio crackling
    const now = Date.now();
    if (now - lastSyncRef.current < 500) return;

    const audioTime = audioRef.current.currentTime;
    const targetTime = Math.max(0, videoCurrentTime - track.offset);
    const diff = Math.abs(audioTime - targetTime);

    // Only sync if drift is significant (> syncThreshold, default 0.3s)
    if (diff > syncThreshold) {
      lastSyncRef.current = now;
      audioRef.current.currentTime = targetTime;
      setDriftWarning(true);

      if (warningTimeoutRef.current) {
        window.clearTimeout(warningTimeoutRef.current);
      }

      warningTimeoutRef.current = window.setTimeout(() => {
        setDriftWarning(false);
      }, 1500);
    }
  }, [videoCurrentTime, track.offset, syncThreshold, isSwitchingDevice]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        window.clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

  // Device Switching Lock State
  useEffect(() => {
    if (track.deviceId) {
      setIsSwitchingDevice(true);
      const timer = setTimeout(async () => {
        if (audioRef.current && isVideoPlaying) {
          const targetTime = Math.max(0, videoCurrentTime - track.offset);
          audioRef.current.currentTime = targetTime;
          try {
            await audioRef.current.play();
          } catch (e) {
            // Ignore autoplay errors
          }
        }
        setIsSwitchingDevice(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [track.deviceId]);

  // Handle Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = track.volume * masterVolume;
      audioRef.current.muted = track.isMuted;
    }
  }, [track.volume, track.isMuted, masterVolume]);

  // Get selected device name
  const getDeviceName = () => {
    if (!track.deviceId) return t.audioTrack.defaultDevice;
    const device = availableDevices.find(d => d.deviceId === track.deviceId);
    if (device?.label) {
      // Truncate long names
      return device.label.length > 20 ? device.label.slice(0, 18) + '...' : device.label;
    }
    return t.audioTrack.unknownDevice;
  };

  return (
    <div
      className={`relative rounded-xl bg-white dark:bg-gray-800/60 border backdrop-blur-sm transition-all duration-300 shadow-sm dark:shadow-none ${driftWarning
        ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)]'
        : 'border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
    >
      <audio ref={audioRef} className="hidden" crossOrigin="anonymous" />
      <AudioGraphManager
        audioElement={audioRef.current}
        eqSettings={track.eq}
        deviceId={track.deviceId}
        useCompressor={track.useCompressor}
        gainBoost={track.gainBoost ?? 1}
      />

      {/* Main Content */}
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-center gap-3 mb-3">
          {/* Icon */}
          <div className={`p-2.5 rounded-xl transition-colors ${driftWarning
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-primary-500/20 text-primary-400'
            }`}>
            <Volume2 size={20} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={track.name}>
              {track.name}
            </h3>
            {/* Device Selector - Custom Dropdown */}
            <div className="relative mt-1" ref={deviceDropdownRef}>
              <button
                onClick={() => setIsDeviceDropdownOpen(!isDeviceDropdownOpen)}
                disabled={isSwitchingDevice}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all ${isSwitchingDevice
                  ? 'opacity-50 cursor-wait'
                  : 'hover:bg-gray-700/50 cursor-pointer'
                  } ${isDeviceDropdownOpen
                    ? 'bg-gray-700/50 text-primary-400'
                    : 'text-gray-400'
                  }`}
              >
                <Headphones size={12} />
                <span className="truncate max-w-[180px]">
                  {track.deviceId
                    ? (availableDevices.find(d => d.deviceId === track.deviceId)?.label || 'Unknown').slice(0, 25) + ((availableDevices.find(d => d.deviceId === track.deviceId)?.label || '').length > 25 ? '...' : '')
                    : t.audioTrack.defaultDevice
                  }
                </span>
                <ChevronDown size={12} className={`transition-transform ${isDeviceDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu - iOS Liquid Design */}
              {isDeviceDropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-80 py-2 bg-white/80 dark:bg-gray-800/90 backdrop-blur-2xl border border-white/20 dark:border-gray-600/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-[9999] max-h-56 overflow-y-auto"
                >
                  {/* Default Option */}
                  <button
                    onClick={() => {
                      onUpdate(track.id, { deviceId: '' });
                      setIsDeviceDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${!track.deviceId
                      ? 'bg-primary-500/20 dark:bg-primary-500/30'
                      : 'hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${!track.deviceId
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                      }`}>
                      <Volume2 size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${!track.deviceId ? 'text-primary-600 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200'}`}>
                        {t.audioTrack.defaultDevice}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">{t.audioTrack.systemDefaultDevice}</div>
                    </div>
                    {!track.deviceId && (
                      <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>

                  {/* Divider */}
                  {availableDevices.length > 0 && (
                    <div className="border-t border-gray-200/50 dark:border-gray-600/50 my-1 mx-3" />
                  )}

                  {/* Device Options */}
                  {availableDevices.map(device => (
                    <button
                      key={device.deviceId}
                      onClick={() => {
                        onUpdate(track.id, { deviceId: device.deviceId });
                        setIsDeviceDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${track.deviceId === device.deviceId
                        ? 'bg-primary-500/20 dark:bg-primary-500/30'
                        : 'hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${track.deviceId === device.deviceId
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                        }`}>
                        {getDeviceIcon(device.label || '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${track.deviceId === device.deviceId ? 'text-primary-600 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200'}`}>
                          {device.label || 'Unknown Device'}
                        </div>
                      </div>
                      {track.deviceId === device.deviceId && (
                        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Share Sync Button */}
            {onShareSync && !track.isCloudSynced && (
              <button
                onClick={() => onShareSync(track.id, track.offset)}
                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                title="Share this sync with the community"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /><path d="M12 12v6" /><path d="m8 15 4-4 4 4" /></svg>
              </button>
            )}

            {/* Delete Button */}
            <button
              onClick={() => onDelete(track.id)}
              className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Sync Timecode Display */}
        <div className="mb-2 flex items-center justify-between text-[11px] font-mono text-gray-500 dark:text-gray-500">
          <div className="flex items-center gap-3">
            {/* Audio Time - Green Hover */}
            <div className="group relative flex items-center gap-1 cursor-help">
              <span className="absolute bottom-full left-0 mb-0.5 hidden group-hover:block whitespace-nowrap text-[10px] font-sans font-bold text-primary-600 dark:text-primary-400 animate-in fade-in slide-in-from-bottom-1 duration-200">
                {t.audioTrack.audioTime}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
              <span className="text-gray-600 dark:text-gray-400 transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
                {formatTime(Math.max(0, videoCurrentTime - track.offset))}
              </span>
            </div>

            <span className="text-gray-300 dark:text-gray-700">|</span>

            {/* Video Time - Teal Hover */}
            <div className="group relative flex items-center gap-1 cursor-help">
              <span className="absolute bottom-full left-0 mb-0.5 hidden group-hover:block whitespace-nowrap text-[10px] font-sans font-bold text-tertiary-600 dark:text-tertiary-400 animate-in fade-in slide-in-from-bottom-1 duration-200">
                {t.audioTrack.videoTime}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
              <span className="text-gray-600 dark:text-gray-400 transition-colors group-hover:text-teal-600 dark:group-hover:text-teal-400">
                {formatTime(videoCurrentTime)}
              </span>
            </div>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${Math.abs(track.offset) < 0.1
            ? 'bg-secondary-500/10 text-secondary-600 dark:text-secondary-400'
            : Math.abs(track.offset) < 0.5
              ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
              : 'bg-red-500/10 text-red-500 dark:text-red-400'
            }`}>
            {track.offset >= 0 ? '+' : ''}{track.offset.toFixed(1)}s
          </span>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => onUpdate(track.id, { isMuted: !track.isMuted })}
            className={`p-1.5 rounded-lg transition-colors ${track.isMuted
              ? 'bg-red-500/20 text-red-400'
              : 'text-gray-400 hover:text-primary-400'
              }`}
          >
            {track.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.isMuted ? 0 : track.volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdate(track.id, { volume: val });
                if (val > 0 && track.isMuted) {
                  onUpdate(track.id, { isMuted: false });
                }
              }}
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary-500 ${track.isMuted ? 'opacity-40' : ''
                }`}
              style={{
                background: `linear-gradient(to right, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-500)) ${(track.isMuted ? 0 : track.volume) * 100}%, rgba(107,114,128,0.3) ${(track.isMuted ? 0 : track.volume) * 100}%, rgba(107,114,128,0.3) 100%)`
              }}
            />
          </div>

          <span className="text-sm font-mono text-primary-400 w-12 text-right">
            {Math.round(track.volume * 100)}%
          </span>
        </div>

        {/* Offset & Speed Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Offset */}
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-[11px] text-gray-500 dark:text-gray-500">{t.sidebar.offset}:</span>
            <div className={`flex items-center rounded-lg overflow-hidden transition-colors py-0.5 ${track.isCloudSynced
              ? 'bg-blue-500/10 border border-blue-500/30'
              : 'bg-gray-100 dark:bg-gray-900/50'
              }`}>
              <button
                onClick={() => onUpdate(track.id, { offset: Number((track.offset - 0.1).toFixed(1)), isCloudSynced: false })}
                className="px-2 py-0.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
              >
                −
              </button>
              <input
                type="number"
                step="0.1"
                value={track.offset}
                onChange={(e) => onUpdate(track.id, { offset: parseFloat(e.target.value) || 0, isCloudSynced: false })}
                className="w-10 py-0.5 text-[11px] font-mono text-gray-900 dark:text-white text-center bg-transparent border-none outline-none"
              />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 pr-1">s</span>
              <button
                onClick={() => onUpdate(track.id, { offset: Number((track.offset + 0.1).toFixed(1)), isCloudSynced: false })}
                className="px-2 py-0.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
              >
                +
              </button>
              {track.isCloudSynced && (
                <div className="px-1.5 flex items-center justify-center text-blue-500" title="Community Synced">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>
                </div>
              )}
            </div>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-1.5">
            <Gauge size={12} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-[11px] text-gray-500 dark:text-gray-500">{t.audioTrack.speed}:</span>
            <div className="flex items-center bg-gray-100 dark:bg-gray-900/50 rounded-lg overflow-hidden">
              <button
                onClick={() => onUpdate(track.id, { playbackRate: Number((track.playbackRate - 0.1).toFixed(1)) })}
                className="px-1.5 py-1 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
              >
                −
              </button>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="2.0"
                value={track.playbackRate}
                onChange={(e) => onUpdate(track.id, { playbackRate: parseFloat(e.target.value) || 1 })}
                className="w-8 py-1 text-[11px] font-mono text-gray-900 dark:text-white text-center bg-transparent border-none outline-none"
              />
              <span className="text-[10px] text-gray-400 dark:text-gray-500">x</span>
              <button
                onClick={() => onUpdate(track.id, { playbackRate: Number((track.playbackRate + 0.1).toFixed(1)) })}
                className="px-1.5 py-1 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/30 flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} />
              <span>{t.audioTrack.hideAdvanced}</span>
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              <span>{t.audioTrack.showAdvanced}</span>
            </>
          )}
        </button>
      </div >

      {/* Advanced Section (Collapsible) */}
      < div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700/30 space-y-4">

          {/* Offset Adjustment */}
          <div>
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="text-gray-600 dark:text-gray-500">{t.audioTrack.offsetAdjustment}</span>
              {track.offset !== 0 && (
                <button
                  onClick={() => onUpdate(track.id, { offset: 0 })}
                  className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                >
                  <RotateCcw size={10} />
                  {t.audioTrack.reset}
                </button>
              )}
            </div>

            {/* Visual Offset Slider */}
            <div className="relative bg-gray-100 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/30">
              {/* Scale markers */}
              <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-600 mb-2">
                <span>-5s</span>
                <span>-2.5s</span>
                <span className="text-primary-500 dark:text-primary-400">0</span>
                <span>+2.5s</span>
                <span>+5s</span>
              </div>

              {/* Track with center indicator */}
              <div className="relative h-8 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
                {/* Center line (zero point) */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-primary-500/50 -translate-x-1/2" />

                {/* Offset indicator bar */}
                <div
                  className={`absolute top-1 bottom-1 rounded transition-all duration-150 ${track.offset >= 0
                    ? 'bg-gradient-to-r from-primary-500 to-primary-400'
                    : 'bg-gradient-to-l from-primary-500 to-primary-400'
                    }`}
                  style={{
                    left: track.offset >= 0 ? '50%' : `${50 + (track.offset / 5) * 50}%`,
                    width: `${Math.abs(track.offset) / 5 * 50}%`,
                  }}
                />

                {/* Current position marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-primary-600 dark:bg-white rounded shadow-[0_0_10px_rgba(var(--color-primary-500),0.5)] dark:shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-150"
                  style={{ left: `${50 + (track.offset / 5) * 50}%`, transform: 'translateX(-50%)' }}
                />
              </div>

              {/* Slider input */}
              <input
                type="range"
                min="-5"
                max="5"
                step="0.1"
                value={track.offset}
                onChange={(e) => onUpdate(track.id, { offset: parseFloat(e.target.value) })}
                className="w-full h-2 mt-3 bg-transparent rounded-lg appearance-none cursor-pointer accent-primary-500"
                style={{
                  background: 'linear-gradient(to right, rgba(107,114,128,0.3) 0%, rgba(107,114,128,0.3) 100%)'
                }}
              />

              {/* Current value */}
              <div className="text-center mt-2">
                <span className="text-lg font-mono font-bold text-gray-900 dark:text-white">{track.offset > 0 ? '+' : ''}{track.offset.toFixed(1)}s</span>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {track.offset > 0 ? t.audioTrack.audioStartsLater : track.offset < 0 ? t.audioTrack.audioStartsEarlier : t.audioTrack.perfectlySynced}
                </p>
              </div>
            </div>
          </div>

          {/* EQ Controls */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-tertiary-600 dark:text-tertiary-400 uppercase tracking-wider">{t.audioTrack.eq3Band}</span>
              <div className="flex items-center gap-2">
                {/* Preset Dropdown */}
                <select
                  value={getCurrentPresetId(track.eq || { low: 0, mid: 0, high: 0 }) || ''}
                  onChange={(e) => {
                    const preset = eqPresets.find(p => p.id === e.target.value);
                    if (preset) {
                      onUpdate(track.id, { eq: { low: preset.low, mid: preset.mid, high: preset.high } });
                      onTrackEvent?.('eqAdjustments');
                    }
                  }}
                  className="text-[10px] px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-tertiary-500 cursor-pointer"
                >
                  <option value="" disabled>{t.audioTrack.eqPresets.label}</option>
                  {eqPresets.map(preset => (
                    <option key={preset.id} value={preset.id}>
                      {t.audioTrack.eqPresets[preset.id as keyof typeof t.audioTrack.eqPresets]}
                    </option>
                  ))}
                </select>
                {(track.eq?.low !== 0 || track.eq?.mid !== 0 || track.eq?.high !== 0) && (
                  <button
                    onClick={() => onUpdate(track.id, { eq: { low: 0, mid: 0, high: 0 } })}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-tertiary-500 dark:hover:text-tertiary-400 transition-colors"
                  >
                    <RotateCcw size={10} />
                    {t.audioTrack.reset}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'low', label: 'LOW', color: 'from-tertiary-500 to-tertiary-600' },
                { key: 'mid', label: 'MID', color: 'from-secondary-500 to-secondary-600' },
                { key: 'high', label: 'HIGH', color: 'from-tertiary-400 to-tertiary-500' }
              ].map(band => (
                <div key={band.key} className="text-center">
                  <div className="relative h-24 flex items-center justify-center mb-2">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      value={track.eq?.[band.key as keyof typeof track.eq] || 0}
                      onChange={(e) => { onUpdate(track.id, { eq: { ...track.eq, [band.key]: parseFloat(e.target.value) } }); onTrackEvent?.('eqAdjustments'); }}
                      className="h-20 w-2 appearance-none cursor-pointer rounded-full"
                      style={{
                        writingMode: 'vertical-lr',
                        direction: 'rtl',
                        background: `linear-gradient(to top, rgb(var(--color-tertiary-500)) 0%, rgb(var(--color-tertiary-500)) ${((track.eq?.[band.key as keyof typeof track.eq] || 0) + 12) / 24 * 100}%, rgba(107,114,128,0.3) ${((track.eq?.[band.key as keyof typeof track.eq] || 0) + 12) / 24 * 100}%, rgba(107,114,128,0.3) 100%)`
                      }}
                    />
                  </div>
                  <span className="text-[10px] uppercase text-gray-600 dark:text-gray-500 font-medium">{band.label}</span>
                  <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {(track.eq?.[band.key as keyof typeof track.eq] || 0) > 0 ? '+' : ''}
                    {track.eq?.[band.key as keyof typeof track.eq] || 0}dB
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gain Boost */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-gray-600 dark:text-gray-500 whitespace-nowrap">🔊 Boost</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={track.gainBoost ?? 1}
              onChange={(e) => onUpdate(track.id, { gainBoost: parseFloat(e.target.value) })}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer
                bg-gray-200 dark:bg-gray-700
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-primary-500
                [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(var(--color-primary-500),0.5)]
                [&::-webkit-slider-thumb]:transition-shadow
                [&::-webkit-slider-thumb]:hover:shadow-[0_0_10px_rgba(var(--color-primary-500),0.7)]"
            />
            <span className={`text-xs font-mono w-10 text-right ${(track.gainBoost ?? 1) > 1
              ? 'text-primary-500 font-bold'
              : 'text-gray-500'
              }`}>
              {Math.round((track.gainBoost ?? 1) * 100)}%
            </span>
            {(track.gainBoost ?? 1) > 1 && (
              <button
                onClick={() => onUpdate(track.id, { gainBoost: 1 })}
                className="text-[10px] text-gray-500 hover:text-primary-400 transition-colors"
                title="Reset"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>

          {/* Limiter Toggle */}
          <div className="flex justify-center pt-2">
            <button
              onClick={() => onUpdate(track.id, { useCompressor: !track.useCompressor })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${track.useCompressor
                ? 'bg-tertiary-500/20 border border-tertiary-500 text-tertiary-600 dark:text-tertiary-400 shadow-[0_0_15px_rgba(var(--color-tertiary-500),0.2)]'
                : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
            >
              {track.useCompressor ? `✓ ${t.audioTrack.limiterActive}` : t.audioTrack.enableLimiter}
            </button>
          </div>
        </div>
      </div >
    </div >
  );
};