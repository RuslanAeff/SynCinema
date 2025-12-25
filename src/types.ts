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
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}