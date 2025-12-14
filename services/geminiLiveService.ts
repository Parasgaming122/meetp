import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState } from '../types';
import { base64ToBytes, decodeAudioData, bytesToBase64, float32ToPCM16 } from '../utils/audioUtils';

// Type definitions for callbacks
type AudioDataCallback = (audioBuffer: AudioBuffer) => void;
type TextCallback = (text: string, isUser: boolean, isFinal: boolean) => void;
type StatusCallback = (status: ConnectionState) => void;
type VolumeCallback = (volume: number) => void;

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private inputScriptProcessor: ScriptProcessorNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private currentStream: MediaStream | null = null;
  
  // Output Audio Queue Management
  private nextStartTime: number = 0;
  private outputGainNode: GainNode | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  // Callbacks
  private onAudioData: AudioDataCallback | null = null;
  private onText: TextCallback | null = null;
  private onStatus: StatusCallback | null = null;
  private onVolume: VolumeCallback | null = null; // AI volume
  
  private isConnected: boolean = false;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  public setCallbacks(
    onAudioData: AudioDataCallback,
    onText: TextCallback,
    onStatus: StatusCallback,
    onVolume: VolumeCallback
  ) {
    this.onAudioData = onAudioData;
    this.onText = onText;
    this.onStatus = onStatus;
    this.onVolume = onVolume;
  }

  public async connect() {
    if (this.isConnected) return;

    this.onStatus?.(ConnectionState.CONNECTING);

    try {
      // Initialize Audio Contexts
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.outputGainNode = this.audioContext.createGain();
      this.outputGainNode.connect(this.audioContext.destination);

      // Connect to Gemini Live
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: this.handleOpen.bind(this),
          onmessage: this.handleMessage.bind(this),
          onerror: this.handleError.bind(this),
          onclose: this.handleClose.bind(this),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: "You are an expert, engaging, and friendly university professor conducting an online class. Your goal is to teach the user about whatever topic they bring up, or ask them what they want to learn. Use a clear, encouraging tone. Keep responses relatively concise to allow for back-and-forth dialogue.",
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });
      
      this.isConnected = true;

    } catch (error) {
      console.error("Connection failed:", error);
      this.onStatus?.(ConnectionState.ERROR);
      this.isConnected = false;
    }
  }

  public async startAudioStream(stream: MediaStream) {
    this.currentStream = stream;
    if (!this.audioContext) return;

    // Wait for session to be ready before streaming
    if (!this.sessionPromise) return;

    // Use a separate input context for 16kHz requirement if needed, or just downsample.
    // The Live API docs example uses a 16kHz context for input.
    const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    
    this.inputSource = inputContext.createMediaStreamSource(stream);
    this.inputScriptProcessor = inputContext.createScriptProcessor(4096, 1, 1);

    this.inputScriptProcessor.onaudioprocess = (e) => {
      if (!this.isConnected) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Convert to PCM Int16
      const pcmInt16 = float32ToPCM16(inputData);
      const pcmUint8 = new Uint8Array(pcmInt16.buffer);
      const base64Data = bytesToBase64(pcmUint8);

      this.sessionPromise?.then((session) => {
          session.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data
            }
          });
      });
    };

    this.inputSource.connect(this.inputScriptProcessor);
    this.inputScriptProcessor.connect(inputContext.destination);
  }

  public sendVideoFrame(base64Data: string) {
    if (!this.isConnected || !this.sessionPromise) return;

    this.sessionPromise.then((session) => {
      session.sendRealtimeInput({
        media: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    });
  }

  public sendText(text: string) {
      if (!this.isConnected || !this.sessionPromise) return;

      this.sessionPromise.then((session) => {
          // Sending text as a user turn part
          session.send({
              client_content: {
                  turns: [{
                      role: 'user',
                      parts: [{ text: text }]
                  }],
                  turn_complete: true
              }
          });
      });
  }

  public async disconnect() {
    this.isConnected = false;
    
    // Stop Input
    if (this.inputSource) this.inputSource.disconnect();
    if (this.inputScriptProcessor) this.inputScriptProcessor.disconnect();
    this.inputSource = null;
    this.inputScriptProcessor = null;

    // Stop Output
    this.activeSources.forEach(source => source.stop());
    this.activeSources.clear();

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    if (this.sessionPromise) {
       // We can't easily cancel the promise or close connection without the session object exposed properly 
       // but typically closing the window or dropping references works. 
       // We'll rely on reloading or React unmount to clean up thoroughly.
    }

    this.onStatus?.(ConnectionState.DISCONNECTED);
  }

  private handleOpen() {
    this.onStatus?.(ConnectionState.CONNECTED);
    console.log("Gemini Live Session Opened");
  }

  private async handleMessage(message: LiveServerMessage) {
    if (!this.audioContext) return;

    // 1. Handle Transcription (User & AI)
    if (message.serverContent?.outputTranscription) {
        this.onText?.(message.serverContent.outputTranscription.text, false, false);
    }
    if (message.serverContent?.inputTranscription) {
        this.onText?.(message.serverContent.inputTranscription.text, true, false);
    }
    
    if (message.serverContent?.turnComplete) {
       // Could mark text as final here
    }

    // 2. Handle Audio Output
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        this.queueAudio(base64Audio);
    }

    // 3. Handle Interruption
    if (message.serverContent?.interrupted) {
      this.activeSources.forEach(source => {
        try { source.stop(); } catch(e){}
      });
      this.activeSources.clear();
      this.nextStartTime = 0;
    }
  }

  private async queueAudio(base64Audio: string) {
    if (!this.audioContext || !this.outputGainNode) return;

    try {
        const audioBytes = base64ToBytes(base64Audio);
        const audioBuffer = await decodeAudioData(audioBytes, this.audioContext);
        
        // Update timing
        this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
        
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputGainNode);
        
        source.start(this.nextStartTime);
        this.activeSources.add(source);

        // Calculate simple volume for visualizer
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        // Quick loop to update volume while playing
        const checkVolume = () => {
             analyser.getByteFrequencyData(dataArray);
             let sum = 0;
             for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
             const avg = sum / dataArray.length;
             this.onVolume?.(avg / 255);
             if (this.audioContext && this.audioContext.currentTime < endTime) {
                 requestAnimationFrame(checkVolume);
             } else {
                 this.onVolume?.(0);
             }
        };
        const endTime = this.nextStartTime + audioBuffer.duration;
        checkVolume();

        source.onended = () => {
          this.activeSources.delete(source);
        };

        this.nextStartTime += audioBuffer.duration;

    } catch (e) {
        console.error("Error decoding audio", e);
    }
  }

  private handleError(e: ErrorEvent) {
    console.error("Gemini Live Error", e);
    this.onStatus?.(ConnectionState.ERROR);
  }

  private handleClose(e: CloseEvent) {
    console.log("Gemini Live Closed", e);
    this.onStatus?.(ConnectionState.DISCONNECTED);
  }
}
