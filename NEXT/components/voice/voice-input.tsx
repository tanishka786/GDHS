// Modular Voice Input component for speech-to-text functionality

"use client";

import { Button } from '@/components/ui/button';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { VoiceInputConfig, VoiceInputError, VoiceInputResult } from '@/lib/types/voice';
import { formatAudioLevel } from '@/lib/utils/voice-utils';
import { Mic, Square } from 'lucide-react';
import { useCallback } from 'react';

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  onError?: (error: VoiceInputError) => void;
  disabled?: boolean;
  config?: VoiceInputConfig;
  className?: string;
  showAudioLevel?: boolean;
}

export function VoiceInput({
  onTranscript,
  onError,
  disabled = false,
  config,
  className = '',
  showAudioLevel = true
}: VoiceInputProps) {
  const handleResult = useCallback((result: VoiceInputResult) => {
    if (result.isFinal && result.transcript.trim()) {
      onTranscript(result.transcript.trim());
    }
  }, [onTranscript]);

  const handleError = useCallback((error: VoiceInputError) => {
    onError?.(error);
  }, [onError]);

  const {
    isRecording,
    audioLevel,
    status,
    error,
    startRecording,
    stopRecording,
    isSupported
  } = useVoiceInput({
    config,
    onResult: handleResult,
    onError: handleError
  });

  if (!isSupported) {
    return (
      <Button
        variant="outline"
        disabled
        className={className}
        title="Speech recognition not supported in this browser"
      >
        <Mic className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Audio Level Indicator */}
      {showAudioLevel && isRecording && (
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-green-600 h-1 rounded-full transition-all duration-100"
            style={{ width: `${formatAudioLevel(audioLevel)}%` }}
          />
        </div>
      )}

      {/* Voice Input Button */}
      <Button
        variant={isRecording ? "destructive" : "outline"}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || status === 'processing'}
        className={className}
        title={isRecording ? 'Stop recording' : 'Start voice input'}
      >
        {isRecording ? (
          <Square className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>

      {/* Error Display */}
      {error && (
        <div className="text-xs text-red-600 text-center max-w-xs">
          {error.message}
        </div>
      )}
    </div>
  );
}