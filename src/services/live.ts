import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export class LiveTutorSession {
  private ai: GoogleGenAI;
  private session: any;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStream | null = null;

  constructor() {
    const isPro = localStorage.getItem('academy_modelMode') === 'pro';
    const proKey = localStorage.getItem('academy_apiKey');
    const apiKey = (isPro && proKey) ? proKey : process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("No API Key found for Live Session. Please set your API key in Settings.");
    }
    
    this.ai = new GoogleGenAI({ apiKey });
  }

  private nextStartTime: number = 0;
  private accumulatedText: string = "";

  private audioSources: AudioBufferSourceNode[] = [];

  async connect(callbacks: {
    onMessage: (text: string) => void;
    onInterrupted: () => void;
    onError: (err: any) => void;
  }) {
    try {
      this.accumulatedText = "";
      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            console.log("Live session opened");
            this.startMic();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.text) {
                  this.accumulatedText += part.text;
                  callbacks.onMessage(this.accumulatedText);
                }
                if (part.inlineData?.data) {
                  this.playAudio(part.inlineData.data);
                }
              }
            }
            
            if (message.serverContent?.interrupted) {
              this.accumulatedText = "";
              this.stopAudio();
              callbacks.onInterrupted();
            }

            if (message.serverContent?.turnComplete) {
              this.accumulatedText = "";
            }
          },
          onerror: (err) => callbacks.onError(err),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are Dr. Lem, a warm Science tutor. Keep responses brief and conversational for voice. When explaining concepts, ALWAYS provide a visualization at the end using ```mermaid ... ``` or ```html <svg>...</svg> ``` blocks. The visualization should appear as you finish your explanation.",
        },
      });
    } catch (err) {
      callbacks.onError(err);
    }
  }

  private async startMic() {
    try {
      this.source = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const micSource = this.audioContext.createMediaStreamSource(this.source);
      
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert to 16-bit PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        
        if (this.session) {
          this.session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };

      micSource.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }

  private async playAudio(base64Data: string) {
    if (!this.audioContext) return;
    
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    // PCM 16-bit to Float32
    const pcm = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      float32[i] = pcm[i] / 0x7FFF;
    }

    const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    
    const now = this.audioContext.currentTime;
    if (this.nextStartTime < now) {
      this.nextStartTime = now + 0.05; // Small buffer for network jitter
    }
    
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    this.audioSources.push(source);
    source.onended = () => {
      this.audioSources = this.audioSources.filter(s => s !== source);
    };
  }

  private stopAudio() {
    this.audioSources.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    this.audioSources = [];
    this.nextStartTime = 0;
  }

  disconnect() {
    if (this.session) this.session.close();
    if (this.source) this.source.getTracks().forEach(t => t.stop());
    if (this.audioContext) this.audioContext.close();
  }
}
