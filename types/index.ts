export interface VideoMetadata {
  id: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  description: string;
}

export interface CaptionCue {
  start: number;
  dur: number;
  text: string;
}

export interface CaptionTrack {
  lang: string;
  langName: string;
  data: CaptionCue[];
}

export interface VideoData {
  videoId: string;
  videoUrl: string;
  metadata: VideoMetadata;
  captions: CaptionTrack[];
}

export interface ScrollPlayerState {
  currentTime: number;
  duration: number;
  progress: number;
  isReady: boolean;
  activeCaption: CaptionCue | null;
  selectedLang: string;
}
