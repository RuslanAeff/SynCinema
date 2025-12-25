import React, { useEffect, useRef, useState } from 'react';
import { AudioTrack, AudioDevice, ExtendedMediaElement } from '../types';
import { Trash2, Volume2, Clock, MonitorSpeaker, Gauge } from 'lucide-react';
import { Waveform } from './Waveform';
import { AudioGraphManager } from './AudioGraphManager';

interface AudioTrackRowProps {
  track: AudioTrack;
  availableDevices: AudioDevice[];
  videoCurrentTime: number;
  isVideoPlaying: boolean;
  onUpdate: (id: string, updates: Partial<AudioTrack>) => void;
  onDelete: (id: string) => void;
  syncThreshold: number;
  masterVolume?: number;
}

export const AudioTrackRow: React.FC<AudioTrackRowProps> = ({
  track,
  availableDevices,
  videoCurrentTime,
  isVideoPlaying,
  onUpdate,
  onDelete,
  syncThreshold = 0.3,
  masterVolume = 1
}) => {
  const audioRef = useRef<ExtendedMediaElement>(null);
  const [driftWarning, setDriftWarning] = useState(false);
  const [isSwitchingDevice, setIsSwitchingDevice] = useState(false);
  const warningTimeoutRef = useRef<number>(0);

  // Initialize audio source
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = track.objectUrl;
    }
  }, [track.objectUrl]);

  // Handle Play/Pause
  // We skip this effect if we are currently switching devices to prevent conflict
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

  // Handle Synchronization
  useEffect(() => {
    // If we are switching devices, DO NOT force sync, let the hardware settle first.
    if (!audioRef.current || isSwitchingDevice) return;

    const audioTime = audioRef.current.currentTime;
    const targetTime = Math.max(0, videoCurrentTime - track.offset);
    const diff = Math.abs(audioTime - targetTime);

    if (diff > syncThreshold) {
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

  // Device Switching Lock State (used when AudioGraphManager switches devices)
  useEffect(() => {
    // Device switching is now handled by AudioGraphManager via AudioContext.setSinkId
    // This effect only handles the UI state and playback sync after device change
    if (track.deviceId) {
      setIsSwitchingDevice(true);
      // Give AudioGraphManager time to switch, then sync playback
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.deviceId]);

  // Handle Volume (track volume * masterVolume)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = track.volume * masterVolume;
      audioRef.current.muted = track.isMuted;
    }
  }, [track.volume, track.isMuted, masterVolume]);

  return (
    <div
      className={`relative p-4 rounded-xl bg-gray-800/50 border backdrop-blur-sm transition-colors duration-300 ${driftWarning
        ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)] bg-yellow-500/5'
        : 'border-gray-700'
        }`}
    >
      <audio ref={audioRef} className="hidden" crossOrigin="anonymous" />
      {/* Web Audio Graph Manager */}
      <AudioGraphManager
        audioElement={audioRef.current}
        eqSettings={track.eq}
        deviceId={track.deviceId}
        useCompressor={track.useCompressor}
      />

      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${driftWarning ? 'bg-yellow-500/20 text-yellow-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
              <Volume2 size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-white truncate max-w-[150px] md:max-w-[200px]" title={track.name}>{track.name}</h3>
              <p className="text-xs text-gray-400">External Audio Track</p>
            </div>
          </div>

          {/* Simple Volume Bar Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 h-3 items-end">
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((t, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-sm transition-colors ${(track.volume * masterVolume) >= t ? (t > 0.8 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-700'}`}
                  style={{ height: `${(i + 1) * 20}%` }}
                />
              ))}
            </div>
            <button onClick={() => onDelete(track.id)} className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Device Selection */}
        <div data-tour="device-select" className="space-y-1">
          <label className="text-xs font-medium text-gray-400 flex items-center gap-1"><MonitorSpeaker size={12} /> Output Device</label>
          <select
            value={track.deviceId}
            onChange={(e) => onUpdate(track.id, { deviceId: e.target.value })}
            disabled={isSwitchingDevice}
            className={`w-full bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 transition-opacity ${isSwitchingDevice ? 'opacity-50 cursor-wait' : ''}`}
          >
            <option value="">Default System Output</option>
            {availableDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>{device.label || `Unknown Device (${device.deviceId.slice(0, 5)}...)`}</option>
            ))}
          </select>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div data-tour="offset-control" className="space-y-1">
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1"><Clock size={12} /> Start Offset (s)</label>
            <div className="flex items-center gap-1">
              <button className="w-6 h-8 flex items-center justify-center bg-gray-700 rounded hover:bg-gray-600" onClick={() => onUpdate(track.id, { offset: track.offset - 0.1 })}>-</button>
              <input type="number" step="0.1" value={track.offset} onChange={(e) => onUpdate(track.id, { offset: parseFloat(e.target.value) || 0 })} className="flex-1 text-center bg-gray-900 border-gray-700 rounded-lg text-xs p-1.5 focus:ring-indigo-500 focus:border-indigo-500" />
              <button className="w-6 h-8 flex items-center justify-center bg-gray-700 rounded hover:bg-gray-600" onClick={() => onUpdate(track.id, { offset: track.offset + 0.1 })}>+</button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1" title="Drift Correction (FPS Fix)"><Gauge size={12} /> Speed (x)</label>
            <div className="flex items-center gap-1">
              <button className="w-6 h-8 flex items-center justify-center bg-gray-700 rounded hover:bg-gray-600" onClick={() => onUpdate(track.id, { playbackRate: Number((track.playbackRate - 0.001).toFixed(4)) })}>-</button>
              <input type="number" step="0.001" min="0.5" max="2.0" value={track.playbackRate} onChange={(e) => onUpdate(track.id, { playbackRate: parseFloat(e.target.value) || 1 })} className="flex-1 text-center bg-gray-900 border-gray-700 rounded-lg text-xs p-1.5 focus:ring-indigo-500 focus:border-indigo-500" />
              <button className="w-6 h-8 flex items-center justify-center bg-gray-700 rounded hover:bg-gray-600" onClick={() => onUpdate(track.id, { playbackRate: Number((track.playbackRate + 0.001).toFixed(4)) })}>+</button>
            </div>
          </div>
        </div>

        {/* Volume Control */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1">
              <Volume2 size={12} /> Volume
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-indigo-400">{Math.round(track.volume * 100)}%</span>
              <button
                onClick={() => onUpdate(track.id, { isMuted: !track.isMuted })}
                className={`text-[10px] px-2 py-0.5 rounded ${track.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                {track.isMuted ? 'Muted' : 'Mute'}
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={track.volume}
            onChange={(e) => onUpdate(track.id, { volume: parseFloat(e.target.value) })}
            className={`w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 ${track.isMuted ? 'opacity-50' : ''}`}
          />
        </div>

        {/* Waveform Visualization */}
        <div className="pt-2 border-t border-gray-700/50">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Waveform Sync</span>
            <span className="text-indigo-400 font-mono">{track.offset.toFixed(2)}s</span>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-2 mb-2 border border-gray-700/50">
            <Waveform
              url={track.objectUrl}
              currentTime={videoCurrentTime}
              offset={track.offset}
              isPlaying={isVideoPlaying}
              onSeek={(time) => { }} // We don't need seek here yet as it's complex to map back to offset
              height={30}
            />
          </div>

          <input type="range" min="-5" max="5" step="0.05" value={track.offset} onChange={(e) => onUpdate(track.id, { offset: parseFloat(e.target.value) })} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />


          {/* EQ Controls */}
          <div data-tour="eq-control" className="mt-3 pt-2 border-t border-gray-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider">🎛️ 3-Band EQ</span>
              <span className="text-[9px] text-gray-600">Bass / Vokal / Treble</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['low', 'mid', 'high'].map(band => (
                <div key={band} className="text-center">
                  <label className="block text-[10px] uppercase text-gray-500 mb-1">{band}</label>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={track.eq?.[band as keyof typeof track.eq] || 0}
                    onChange={(e) => onUpdate(track.id, { eq: { ...track.eq, [band]: parseFloat(e.target.value) } })}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Limiter/Compressor */}
          <div className="mt-3 pt-2 border-t border-gray-700/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-[9px] text-gray-600">Yüksek sesleri otomatik bastırır</span>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => onUpdate(track.id, { useCompressor: !track.useCompressor })}
                className={`text-[10px] px-3 py-1 rounded-full border transition-colors ${track.useCompressor ? 'bg-teal-500/20 border-teal-500 text-teal-400' : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-500'}`}
              >
                {track.useCompressor ? '🔊 Limiter Active' : '🔇 Enable Limiter'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};