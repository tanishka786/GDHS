// Custom hook for voice input functionality using Web Speech API

import { useCallback, useEffect, useRef, useState } from 'react';
import { VoiceInputConfig, VoiceInputError, VoiceInputHook, VoiceInputResult, VoiceStatus } from '@/lib/types/voice';
import { getSpeechRecognition, isSpeechRecognitionSupported } from '@/lib/utils/voice-utils';

interface UseVoiceInputOptions {
  config?: VoiceInputConfig;
  onResult?: (result: VoiceInputResult) => void;
  onError?: (error: VoiceInputError) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): VoiceInputHook {
  const {
    config = {
      language: 'en-US',
      continuous: false,
      interimResults: false,
      maxAlternatives: 1
    },
    onResult,
    onError,
    onStart,
    onEnd
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<VoiceInputError | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  const isSupported = isSpeechRecognitionSupported();

  // Monitor audio levels for visual feedback
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(average);
    
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  }, [isRecording]);

  // Initialize audio context for level monitoring
  const initializeAudioContext = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      return stream;
    } catch (err) {
      throw new Error('Microphone access denied. Please enable microphone permissions.');
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      const error: VoiceInputError = {
        type: 'service-not-allowed',
        message: 'Speech recognition not supported in this browser'
      };
      setError(error);
      onError?.(error);
      return;
    }

    try {
      setError(null);
      setStatus('recording');
      
      const SpeechRecognition = getSpeechRecognition();
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not available');
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = config.continuous || false;
      recognition.interimResults = config.interimResults || false;
      recognition.lang = config.language || 'en-US';
      recognition.maxAlternatives = config.maxAlternatives || 1;

      recognition.onstart = () => {
        setIsRecording(true);
        onStart?.();
        monitorAudioLevel();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        const isFinal = result.isFinal;

        const voiceResult: VoiceInputResult = {
          transcript,
          confidence,
          isFinal
        };

        onResult?.(voiceResult);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const voiceError: VoiceInputError = {
          type: event.error as any,
          message: `Speech recognition error: ${event.error}`
        };
        
        setError(voiceError);
        setStatus('error');
        onError?.(voiceError);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setStatus('idle');
        setAudioLevel(0);
        onEnd?.();
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      recognitionRef.current = recognition;
      
      // Initialize audio context for level monitoring
      try {
        await initializeAudioContext();
      } catch (audioError) {
        console.warn('Could not initialize audio level monitoring:', audioError);
      }
      
      recognition.start();
      
    } catch (err) {
      const error: VoiceInputError = {
        type: 'audio-capture',
        message: 'Failed to start recording. Please check microphone permissions.'
      };
      setError(error);
      setStatus('error');
      onError?.(error);
    }
  }, [isSupported, config, onResult, onError, onStart, onEnd, monitorAudioLevel, initializeAudioContext]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
      
      setIsRecording(false);
      setStatus('idle');
      setAudioLevel(0);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    audioLevel,
    status,
    error,
    startRecording,
    stopRecording,
    isSupported
  };
}