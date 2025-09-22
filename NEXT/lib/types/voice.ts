// Voice-related types and interfaces for the voice chat integration

export type VoiceStatus = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

export type SpeechRecognitionErrorType = 
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';

export interface VoiceInputConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface VoiceInputResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceInputError {
  type: SpeechRecognitionErrorType;
  message: string;
}

export interface TextToSpeechConfig {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  modelId?: string;
}

export interface TextToSpeechError {
  code: string;
  message: string;
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  duration?: number;
  currentTime?: number;
}

export interface VoiceInputHook {
  isRecording: boolean;
  audioLevel: number;
  status: VoiceStatus;
  error: VoiceInputError | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  isSupported: boolean;
}

export interface TextToSpeechHook {
  isPlaying: boolean;
  status: VoiceStatus;
  error: TextToSpeechError | null;
  playText: (text: string) => Promise<void>;
  stopAudio: () => void;
  playbackState: AudioPlaybackState;
}

export interface VoiceChatMode {
  isActive: boolean;
  conversationActive: boolean;
  autoPlayResponses: boolean;
  autoStartRecording: boolean;
}