// Modular Text-to-Speech component for audio playback functionality

"use client";

import { Button } from '@/components/ui/button';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { TextToSpeechConfig, TextToSpeechError } from '@/lib/types/voice';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import React, { useCallback } from 'react';

interface TextToSpeechProps {
  text: string;
  onError?: (error: TextToSpeechError) => void;
  disabled?: boolean;
  config?: TextToSpeechConfig;
  className?: string;
  autoPlay?: boolean;
}

export function TextToSpeech({
  text,
  onError,
  disabled = false,
  config,
  className = '',
  autoPlay = false
}: TextToSpeechProps) {
  const handleError = useCallback((error: TextToSpeechError) => {
    onError?.(error);
  }, [onError]);

  const {
    isPlaying,
    status,
    error,
    playText,
    stopAudio,
    playbackState
  } = useTextToSpeech({
    config,
    onError: handleError
  });

  // Auto-play functionality
  React.useEffect(() => {
    if (autoPlay && text && !isPlaying && status === 'idle') {
      playText(text);
    }
  }, [autoPlay, text, isPlaying, status, playText]);

  const handleClick = useCallback(() => {
    if (isPlaying) {
      stopAudio();
    } else {
      playText(text);
    }
  }, [isPlaying, stopAudio, playText, text]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Play/Stop Button */}
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={disabled || !text || status === 'speaking'}
        className={className}
        title={isPlaying ? 'Stop audio' : 'Play audio'}
      >
        {status === 'speaking' && !isPlaying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </Button>

      {/* Progress Indicator */}
      {isPlaying && playbackState.duration && (
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-blue-600 h-1 rounded-full transition-all duration-100"
            style={{ 
              width: `${((playbackState.currentTime || 0) / playbackState.duration) * 100}%` 
            }}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-xs text-red-600 text-center max-w-xs">
          {error.message}
        </div>
      )}
    </div>
  );
}