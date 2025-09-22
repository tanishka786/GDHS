// Utility functions for voice processing

/**
 * Cleans markdown formatting from text to make it suitable for text-to-speech
 */
export function cleanMarkdownForSpeech(text: string): string {
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
    .replace(/🔍/g, 'Analysis:')
    .replace(/💭/g, 'Assessment:')
    .replace(/📄/g, 'Reports:')
    .replace(/🏥/g, 'Specialists:')
    .replace(/❓/g, 'Questions:')
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
}

/**
 * Checks if the Web Speech API is supported in the current browser
 */
export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

/**
 * Gets the SpeechRecognition constructor for the current browser
 */
export function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/**
 * Checks if the browser supports audio playback
 */
export function isAudioPlaybackSupported(): boolean {
  return typeof window !== 'undefined' && 'Audio' in window;
}

/**
 * Validates ElevenLabs API configuration
 */
export function validateElevenLabsConfig(apiKey?: string, voiceId?: string): boolean {
  return Boolean(apiKey && voiceId);
}

/**
 * Formats audio level for visual display (0-100)
 */
export function formatAudioLevel(level: number): number {
  return Math.min(Math.max(level * 2, 0), 100);
}