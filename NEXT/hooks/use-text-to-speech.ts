// Custom hook for text-to-speech functionality using ElevenLabs API

import { useCallback, useRef, useState } from 'react';
import { AudioPlaybackState, TextToSpeechConfig, TextToSpeechError, TextToSpeechHook, VoiceStatus } from '@/lib/types/voice';
import { cleanMarkdownForSpeech, isAudioPlaybackSupported, validateElevenLabsConfig } from '@/lib/utils/voice-utils';

interface UseTextToSpeechOptions {
  config?: TextToSpeechConfig;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: TextToSpeechError) => void;
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}): TextToSpeechHook {
  const {
    config = {
      voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
      stability: 0.5,
      similarityBoost: 0.5,
      modelId: 'eleven_monolingual_v1'
    },
    onStart,
    onEnd,
    onError
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<TextToSpeechError | null>(null);
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
    isPlaying: false
  });

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

  const playText = useCallback(async (text: string) => {
    if (!isAudioPlaybackSupported()) {
      const error: TextToSpeechError = {
        code: 'AUDIO_NOT_SUPPORTED',
        message: 'Audio playback not supported in this browser'
      };
      setError(error);
      onError?.(error);
      return;
    }

    if (!validateElevenLabsConfig(apiKey, config.voiceId)) {
      const error: TextToSpeechError = {
        code: 'INVALID_CONFIG',
        message: 'ElevenLabs API key or voice ID not configured'
      };
      setError(error);
      onError?.(error);
      return;
    }

    try {
      setError(null);
      setStatus('speaking');
      
      // Clean the markdown formatting before sending to TTS
      const cleanText = cleanMarkdownForSpeech(text);
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey || '',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: config.modelId,
          voice_settings: {
            stability: config.stability,
            similarity_boost: config.similarityBoost,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      
      audio.onloadedmetadata = () => {
        setPlaybackState(prev => ({
          ...prev,
          duration: audio.duration
        }));
      };

      audio.ontimeupdate = () => {
        setPlaybackState(prev => ({
          ...prev,
          currentTime: audio.currentTime
        }));
      };

      audio.onplay = () => {
        setIsPlaying(true);
        setPlaybackState(prev => ({ ...prev, isPlaying: true }));
        onStart?.();
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        setStatus('idle');
        setPlaybackState(prev => ({ ...prev, isPlaying: false }));
        URL.revokeObjectURL(audioUrl);
        onEnd?.();
      };

      audio.onerror = () => {
        const error: TextToSpeechError = {
          code: 'PLAYBACK_ERROR',
          message: 'Failed to play audio'
        };
        setError(error);
        setStatus('error');
        setIsPlaying(false);
        setPlaybackState(prev => ({ ...prev, isPlaying: false }));
        URL.revokeObjectURL(audioUrl);
        onError?.(error);
      };
      
      await audio.play();
    } catch (err) {
      const error: TextToSpeechError = {
        code: 'TTS_ERROR',
        message: err instanceof Error ? err.message : 'Failed to generate speech'
      };
      setError(error);
      setStatus('error');
      onError?.(error);
    }
  }, [apiKey, config, onStart, onEnd, onError]);

  const stopAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsPlaying(false);
      setStatus('idle');
      setPlaybackState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    }
  }, []);

  return {
    isPlaying,
    status,
    error,
    playText,
    stopAudio,
    playbackState
  };
}