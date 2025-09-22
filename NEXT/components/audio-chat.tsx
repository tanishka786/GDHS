"use client";

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertCircle,
    Loader2,
    Mic,
    Phone,
    PhoneOff,
    Square,
    Volume2,
    VolumeX
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AudioChatProps {
  onTextMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  lastBotMessage?: string;
}

export function AudioChat({ onTextMessage, isLoading, lastBotMessage }: AudioChatProps) {
  // Global error handler for extension context issues
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('Extension context invalidated')) {
        // Silently handle extension context errors
        event.preventDefault();
        return false;
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Audio states
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'recording' | 'processing' | 'speaking'>('idle');
  
  // Track which messages have been spoken to avoid repetition
  const [lastSpokenMessage, setLastSpokenMessage] = useState<string>('');
  const [conversationActive, setConversationActive] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const restartCountRef = useRef<number>(0);
  const maxRestarts = 3; // Maximum number of automatic restarts
  const isMountedRef = useRef<boolean>(true);

  // Safe state setters that check if component is still mounted
  const safeSetError = (error: string | null) => {
    if (isMountedRef.current) setError(error);
  };
  
  const safeSetAudioStatus = (status: 'idle' | 'recording' | 'processing' | 'speaking') => {
    if (isMountedRef.current) setAudioStatus(status);
  };
  
  const safeSetIsRecording = (recording: boolean) => {
    if (isMountedRef.current) setIsRecording(recording);
  };

  // ElevenLabs API configuration
  const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  const VOICE_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Default voice

  // Browser compatibility checks
  const [browserSupport, setBrowserSupport] = useState({
    speechRecognition: false,
    mediaDevices: false,
    audioContext: false
  });

  // Check browser compatibility on mount
  useEffect(() => {
    const checkBrowserSupport = () => {
      try {
        const speechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
        const mediaDevices = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
        const audioContext = 'AudioContext' in window || 'webkitAudioContext' in window;
        
        setBrowserSupport({
          speechRecognition,
          mediaDevices,
          audioContext
        });

        if (!speechRecognition) {
          setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
        }
      } catch (error) {
        console.warn('Browser compatibility check failed:', error);
      }
    };

    checkBrowserSupport();
  }, []);

  // Function to clean markdown formatting for voice output
  const cleanMarkdownForSpeech = (text: string): string => {
    return text
      // Remove bold markers (**text** or __text__)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      // Remove italic markers (*text* or _text_)
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      // Remove header markers (# ## ###)
      .replace(/^#{1,6}\s+/gm, '')
      // Clean up list markers but preserve structure
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove horizontal rules
      .replace(/^---+$/gm, '')
      // Convert emoji bullets to natural speech
      .replace(/🔍/g, 'X-ray Analysis:')
      .replace(/💭/g, 'Symptom Assessment:')
      .replace(/📄/g, 'Medical Reports:')
      .replace(/🏥/g, 'Find Specialists:')
      .replace(/❓/g, 'Medical Questions:')
      // Clean up extra whitespace and line breaks
      .replace(/\n{3,}/g, '. ')
      .replace(/\n{2}/g, '. ')
      .replace(/\n/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      // Convert multiple spaces to single space
      .replace(/\s{2,}/g, ' ')
      // Replace dashes with natural pauses
      .replace(/\s+-\s+/g, ': ')
      .trim();
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (mediaRecorderRef.current) {
          try {
            (mediaRecorderRef.current as any).stop();
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
      } catch (error) {
        // Ignore cleanup errors to prevent extension context issues
        console.log('Cleanup completed with minor issues (normal)');
      }
      
      // Mark component as unmounted
      isMountedRef.current = false;
    };
  }, []);

  // Initialize audio context for voice level monitoring
  const initializeAudioContext = async () => {
    try {
      if (!browserSupport.mediaDevices) {
        throw new Error('Media devices not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
      
      if (!browserSupport.audioContext) {
        console.warn('AudioContext not supported, audio level monitoring disabled');
        return stream;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      return stream;
    } catch (err: any) {
      let errorMessage = 'Microphone access denied. Please enable microphone permissions.';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application. Please close other apps and try again.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Microphone constraints not supported. Please try with a different microphone.';
      }
      
      setError(errorMessage);
      throw err;
    }
  };

  // Monitor audio levels for visual feedback
  const monitorAudioLevel = () => {
    try {
      if (!analyserRef.current || !isRecording) return;
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average);
      
      if (isRecording) {
        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
      }
    } catch (error) {
      // Silently handle audio level monitoring errors
      console.warn('Audio level monitoring error:', error);
    }
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      setError(null);
      setAudioStatus('recording');
      
      // Use Speech Recognition API directly for better real-time experience
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported in this browser');
      }

      const recognition = new SpeechRecognition();
      
      // Wrap all recognition operations in try-catch to prevent extension context errors
      try {
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      // Add better configuration to reduce no-speech errors
      if ('webkitSpeechRecognition' in window) {
        // Chrome-specific settings
        (recognition as any).serviceURI = 'wss://www.google.com/speech-api/full-duplex/v1/up';
      }

      recognition.onstart = () => {
        setIsRecording(true);
        restartCountRef.current = 0; // Reset restart counter on successful start
        console.log('Speech recognition started');
      };

      recognition.onresult = async (event: any) => {
        try {
          const transcript = event.results[0][0].transcript;
          console.log('Speech recognized:', transcript);
          
          setIsRecording(false);
          setAudioStatus('processing');
          
          if (transcript.trim()) {
            await onTextMessage(transcript);
          }
          setAudioStatus('idle');
        } catch (error) {
          console.error('Error processing transcript:', error);
          setError('Failed to process your message');
          setAudioStatus('idle');
          setIsRecording(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        // Handle specific error types with user-friendly messages
        let errorMessage = '';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking closer to the microphone.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not accessible. Please check your microphone permissions.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
            break;
          case 'network':
            errorMessage = 'Network error occurred. Please check your internet connection.';
            break;
          case 'aborted':
            errorMessage = 'Speech recognition was cancelled.';
            break;
          case 'language-not-supported':
            errorMessage = 'Language not supported for speech recognition.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        // Only show error for critical issues, not for no-speech
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(errorMessage);
        } else if (event.error === 'no-speech') {
          // Increment restart counter for no-speech errors
          restartCountRef.current += 1;
        }
        
        setAudioStatus('idle');
        setIsRecording(false);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
        
        // Clear any previous errors when recognition ends normally
        if (error && (error.includes('no-speech') || error.includes('No speech detected'))) {
          setError(null);
        }
        
        if (audioStatus === 'recording') {
          setAudioStatus('idle');
        }
        
        // In voice mode, automatically restart recording after a brief pause if no speech was detected
        if (isVoiceMode && conversationActive && audioStatus !== 'speaking' && !isLoading && restartCountRef.current < maxRestarts) {
          setTimeout(() => {
            // Only restart if still in voice mode and not currently processing
            if (isVoiceMode && conversationActive && audioStatus === 'idle' && !isRecording && restartCountRef.current < maxRestarts) {
              startRecording();
            }
          }, 2000); // 2 second delay before restarting
        } else if (restartCountRef.current >= maxRestarts) {
          // Reset counter and show helpful message
          restartCountRef.current = 0;
          setError('Having trouble hearing you. Please check your microphone and try again.');
        }
      };

      // Store recognition instance for cleanup
      mediaRecorderRef.current = recognition as any;
      
        // Start recognition
        recognition.start();
        
      } catch (recognitionError) {
        // Handle recognition setup errors, including extension context issues
        console.warn('Speech recognition setup error:', recognitionError);
        throw new Error('Failed to initialize speech recognition');
      }
      
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError('Failed to start recording. Please check microphone permissions.');
      setAudioStatus('idle');
      setIsRecording(false);
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Stop speech recognition
      try {
        (mediaRecorderRef.current as any).stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
      setIsRecording(false);
      setAudioStatus('idle');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      setAudioLevel(0);
    }
  };

  // Convert text to speech using ElevenLabs
  const convertTextToSpeech = async (text: string) => {
    try {
      setAudioStatus('speaking');
      
      // Clean the markdown formatting before sending to TTS
      const cleanText = cleanMarkdownForSpeech(text);
      
      // Debug: Log the original and cleaned text
      console.log('Original text:', text);
      console.log('Cleaned text:', cleanText);
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY || '',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        setAudioStatus('idle');
        URL.revokeObjectURL(audioUrl);
        
        // In voice mode, automatically start recording after bot finishes speaking
        if (isVoiceMode && conversationActive) {
          setTimeout(() => {
            startRecording();
          }, 1000); // 1 second delay before starting to record
        }
      };
      
      audio.play();
    } catch (err) {
      setError('Failed to generate speech. Please check your ElevenLabs API key.');
      setAudioStatus('idle');
    }
  };

  // Toggle voice conversation mode
  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
    restartCountRef.current = 0; // Reset restart counter when toggling voice mode
    
    if (isVoiceMode) {
      // Stopping voice mode
      setConversationActive(false);
      stopRecording();
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setAudioStatus('idle');
    } else {
      // Starting voice mode
      setConversationActive(true);
      setError(null);
      // Start with recording for user input
      setTimeout(() => {
        startRecording();
      }, 500);
    }
  };

  // Auto-convert bot responses to speech in voice mode
  useEffect(() => {
    if (isVoiceMode && lastBotMessage && !isLoading && audioStatus === 'idle' && lastBotMessage !== lastSpokenMessage) {
      setLastSpokenMessage(lastBotMessage);
      convertTextToSpeech(lastBotMessage);
    }
  }, [lastBotMessage, isVoiceMode, isLoading, audioStatus, lastSpokenMessage]);

  const stopAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsPlaying(false);
      setAudioStatus('idle');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Voice Assistant
          {isVoiceMode && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Voice Mode Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Audio Level Indicator */}
        {isRecording && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-100"
              style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
            />
          </div>
        )}

        {/* Status Display */}
        <div className="text-center">
          <Badge 
            variant={audioStatus === 'idle' ? 'outline' : 'default'}
            className={`
              ${audioStatus === 'recording' ? 'bg-red-100 text-red-800' : ''}
              ${audioStatus === 'processing' ? 'bg-blue-100 text-blue-800' : ''}
              ${audioStatus === 'speaking' ? 'bg-green-100 text-green-800' : ''}
            `}
          >
            {audioStatus === 'idle' && (isVoiceMode ? 'Voice Chat Active' : 'Ready')}
            {audioStatus === 'recording' && 'Listening...'}
            {audioStatus === 'processing' && 'Processing your message...'}
            {audioStatus === 'speaking' && 'AI Speaking...'}
          </Badge>
          {isVoiceMode && (
            <p className="text-xs text-muted-foreground mt-1">
              {audioStatus === 'idle' && 'Say something to continue the conversation'}
              {audioStatus === 'speaking' && 'I will listen after speaking'}
            </p>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-2">
          {/* Voice Mode Toggle */}
          <Button
            variant={isVoiceMode ? "default" : "outline"}
            size="lg"
            onClick={toggleVoiceMode}
            className="flex-1"
          >
            {isVoiceMode ? <PhoneOff className="w-5 h-5 mr-2" /> : <Phone className="w-5 h-5 mr-2" />}
            {isVoiceMode ? 'End Voice Chat' : 'Start Voice Chat'}
          </Button>
        </div>

        {/* Manual Controls (hidden in voice mode) */}
        {!isVoiceMode && (
          <div className="flex gap-2">
            {/* Record Button */}
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={audioStatus === 'processing' || isLoading}
              className="flex-1"
            >
              {isRecording ? (
                <Square className="w-5 h-5 mr-2" />
              ) : (
                <Mic className="w-5 h-5 mr-2" />
              )}
              {isRecording ? 'Stop Recording' : 'Record Message'}
            </Button>

            {/* Play/Stop Audio Button */}
            <Button
              variant="outline"
              size="lg"
              onClick={isPlaying ? stopAudio : () => lastBotMessage && convertTextToSpeech(lastBotMessage)}
              disabled={!lastBotMessage || audioStatus === 'processing'}
              className="flex-1"
            >
              {audioStatus === 'speaking' ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : isPlaying ? (
                <VolumeX className="w-5 h-5 mr-2" />
              ) : (
                <Volume2 className="w-5 h-5 mr-2" />
              )}
              {audioStatus === 'speaking' ? 'Speaking...' : isPlaying ? 'Stop Audio' : 'Play Response'}
            </Button>
          </div>
        )}

        {/* Voice Mode Instructions */}
        <div className="text-sm text-muted-foreground text-center space-y-1">
          {isVoiceMode ? (
            <>
              <p><strong>Voice Chat Active:</strong> Speak naturally, I'll listen and respond</p>
              <p>The conversation will continue automatically after each response</p>
            </>
          ) : (
            <>
              <p><strong>Voice Mode:</strong> Automatically converts responses to speech</p>
              <p><strong>Record Message:</strong> Speak your question or symptoms</p>
              <p><strong>Play Response:</strong> Listen to the AI's latest response</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
