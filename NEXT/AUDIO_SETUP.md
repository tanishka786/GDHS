# Audio Chat Setup Guide

## ElevenLabs Integration

The audio chat component has been successfully integrated into the OrthoAssist chat interface. Here's how to set it up:

### 1. Get ElevenLabs API Key

1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up or log in to your account
3. Navigate to your profile settings
4. Copy your API key

### 2. Configure Environment Variables

Update the `.env.local` file in the GDHS/NEXT directory:

```bash
# Replace with your actual ElevenLabs API key
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_actual_api_key_here

# Optional: Change voice ID (default is provided)
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
```

### 3. Available Voice Features

The audio chat component provides:

- **Speech-to-Text**: Click the microphone to record your voice and convert it to text
- **Text-to-Speech**: Bot responses can be played as audio
- **Voice Mode**: Enable continuous voice conversation
- **Real-time Audio Monitoring**: Visual feedback during recording
- **Error Handling**: Proper microphone permission handling

### 4. How to Use

1. **Text Input**: Type normally in the chat
2. **Voice Input**: Click the microphone button to start recording
3. **Voice Mode**: Toggle voice mode for hands-free conversation
4. **Audio Playback**: Click play button on bot responses to hear them

### 5. Browser Requirements

- Modern browser with MediaRecorder API support
- Microphone permissions required for speech input
- HTTPS required for microphone access in production

### 6. Features

- **Auto-transcription**: Speech is automatically converted to text and sent
- **Audio Level Indicator**: Visual feedback while recording
- **Voice Mode**: Continuous conversation without clicking
- **Error Recovery**: Graceful handling of API failures
- **Responsive Design**: Works on desktop and mobile

The audio chat is now fully integrated into your medical chat assistant!