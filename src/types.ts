export interface ExtendedMediaElement extends HTMLMediaElement {
  setSinkId(deviceId: string): Promise<void>;
  sinkId: string;
}

export interface AudioTrack {
  id: string;
  name: string;
  file: File;
  objectUrl: string;
  offset: number; // in seconds
  playbackRate: number; // 1.0 is normal speed
  deviceId: string;
  volume: number;
  isMuted: boolean;
  eq: {
    low: number;
    mid: number;
    high: number;
  };
  useCompressor: boolean;
  gainBoost: number; // 1.0 = normal, up to 3.0 = 3x amplification
  audioFingerprint: string | null;
  isCloudSynced?: boolean;
}

export interface SubtitleStyle {
  color: string;
  backgroundColor: string;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  textShadow: boolean;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}