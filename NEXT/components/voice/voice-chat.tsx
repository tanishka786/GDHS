// Comprehensive Voice Chat component combining voice input and text-to-speech

"use client";

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VoiceChatMode } from '@/lib/types/voice';
import { AlertCircle, Phone, PhoneOff, Volume2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { TextToSpeech } from './text-to-speech';
import { VoiceInput } from './voice-input';

interface VoiceChatProps {
  onTextMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  lastBotMessage?: string;
  className?: string;
}

export function VoiceChat({ 
  onTextMessage, 
  isLoading, 
  lastBotMessage,
  className = ''
}: VoiceChatProps) {
  const [voiceMode, setVoiceMode] = useState<VoiceChatMode>({
    isActive: false,
    conversationActive: false,
    autoPlayResponses: true,
    autoStartRecording: true
  });
  
  const [error, setError] = useState<string | null>(null);
  const [lastSpokenMessage, setLastSpokenMessage] = useState<string>('');

  // Handle voice input transcript
  const handleTranscript = useCallback(async (transcript: string) => {
    try {
      setError(null);
      await onTextMessage(transcript);
    } catch (err) {
      setError('Failed to send voice message');
    }
  }, [onTextMessage]);

  // Handle voice input errors
  const handleVoiceInputError = useCallback((error: any) => {
    setError(error.message);
  }, []);

  // Handle text-to-speech errors
  const handleTTSError = useCallback((error: any) => {
    setError(error.message);
  }, []);

  // Toggle voice chat mode
  const toggleVoiceMode = useCallback(() => {
    setVoiceMode(prev => ({
      ...prev,
      isActive: !prev.isActive,
      conversationActive: !prev.isActive
    }));
    setError(null);
  }, []);

  // Auto-play bot responses in voice mode
  useEffect(() => {
    if (voiceMode.isActive && 
        voiceMode.autoPlayResponses && 
        lastBotMessage && 
        !isLoading && 
        lastBotMessage !== lastSpokenMessage) {
      setLastSpokenMessage(lastBotMessage);
    }
  }, [lastBotMessage, voiceMode.isActive, voiceMode.autoPlayResponses, isLoading, lastSpokenMessage]);

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Voice Assistant
          {voiceMode.isActive && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Voice Mode Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Voice Mode Toggle */}
        <div className="flex justify-center">
          <Button
            variant={voiceMode.isActive ? "default" : "outline"}
            size="lg"
            onClick={toggleVoiceMode}
            className="flex-1"
          >
            {voiceMode.isActive ? (
              <PhoneOff className="w-5 h-5 mr-2" />
            ) : (
              <Phone className="w-5 h-5 mr-2" />
            )}
            {voiceMode.isActive ? 'End Voice Chat' : 'Start Voice Chat'}
          </Button>
        </div>

        {/* Voice Controls */}
        {voiceMode.isActive ? (
          <div className="space-y-4">
            {/* Voice Input */}
            <div className="flex justify-center">
              <VoiceInput
                onTranscript={handleTranscript}
                onError={handleVoiceInputError}
                disabled={isLoading}
                className="w-full max-w-xs"
                showAudioLevel={true}
              />
            </div>

            {/* Auto Text-to-Speech for responses */}
            {lastBotMessage && (
              <div className="flex justify-center">
                <TextToSpeech
                  text={lastBotMessage}
                  onError={handleTTSError}
                  autoPlay={voiceMode.autoPlayResponses}
                  className="w-full max-w-xs"
                />
              </div>
            )}

            {/* Voice Mode Instructions */}
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p><strong>Voice Chat Active:</strong> Speak naturally, I'll listen and respond</p>
              <p>The conversation will continue automatically after each response</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Manual Controls */}
            <div className="flex gap-2">
              <VoiceInput
                onTranscript={handleTranscript}
                onError={handleVoiceInputError}
                disabled={isLoading}
                className="flex-1"
                showAudioLevel={true}
              />

              {lastBotMessage && (
                <TextToSpeech
                  text={lastBotMessage}
                  onError={handleTTSError}
                  className="flex-1"
                />
              )}
            </div>

            {/* Manual Mode Instructions */}
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p><strong>Manual Mode:</strong> Click to record your message or play responses</p>
              <p>Use Voice Chat mode for hands-free conversation</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}