import { GoogleGenAI, VideoGenerationReferenceType, Modality } from "@google/genai";
import { GenerationSettings } from "./types";

// Manual base64 decoding helper as per guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to wrap raw PCM data from Gemini TTS into a playable WAV blob
function encodeWAV(samples: Int16Array, sampleRate: number = 24000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export class GeminiVideoService {
  // CRITICAL: Always create a fresh instance to use the most up-to-date API key
  private static createClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async checkApiKey(): Promise<boolean> {
    try {
      // @ts-ignore
      return await window.aistudio.hasSelectedApiKey();
    } catch (e) {
      return false;
    }
  }

  static async openKeySelection(): Promise<void> {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    } catch (e) {
      console.error("Key selection dialog failed", e);
    }
  }

  static async refinePrompt(simplePrompt: string): Promise<string> {
    const ai = this.createClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
          {
            parts: [
              { text: `Rewrite the following simple video prompt into a professional, highly detailed cinematic description for an AI video model. Include technical camera terms, lighting, and atmosphere. Simple prompt: "${simplePrompt}"` }
            ]
          }
        ]
      });
      return response.text || simplePrompt;
    } catch (e) {
      return simplePrompt;
    }
  }

  static async generateAudio(text: string, voiceName: string = 'Zephyr'): Promise<string> {
    const ai = this.createClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("Audio generation failed");

      const rawData = decode(base64Audio);
      const samples = new Int16Array(rawData.buffer);
      const wavBlob = encodeWAV(samples, 24000);
      return URL.createObjectURL(wavBlob);
    } catch (e) {
      console.error("TTS failed", e);
      return "";
    }
  }

  static async generateVideo(
    settings: GenerationSettings,
    onProgress: (status: string) => void
  ): Promise<{ videoUrl: string, audioUrl?: string, apiVideoData: any }> {
    let ai = this.createClient();
    
    onProgress("Initializing rendering engine...");
    
    const stylePrefix = settings.style ? `[Style: ${settings.style}] ` : "";
    const finalPrompt = `${stylePrefix}${settings.prompt}`;

    let operation;

    try {
      if (settings.previousVideo) {
        onProgress("Extending sequence (+7s)...");
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: settings.prompt || "Continuous sequence",
          video: settings.previousVideo,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: settings.aspectRatio,
          }
        });
      } else {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: finalPrompt,
          config: {
            numberOfVideos: 1,
            resolution: settings.resolution,
            aspectRatio: settings.aspectRatio
          }
        });
      }

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        // Refresh client every poll to ensure we use the current session key
        ai = this.createClient();
        operation = await ai.operations.getVideosOperation({ operation: operation });
        onProgress("Processing cinematic vectors...");
      }

      const apiVideoData = operation.response?.generatedVideos?.[0]?.video;
      const downloadLink = apiVideoData?.uri;
      if (!downloadLink) throw new Error("Synthesis failed - result empty.");

      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);

      let audioUrl = "";
      if (settings.narrationScript) {
        audioUrl = await this.generateAudio(settings.narrationScript, settings.voiceId);
      }

      return { videoUrl, audioUrl, apiVideoData };

    } catch (error: any) {
      if (error?.message?.includes("Requested entity was not found")) {
        throw new Error("API_KEY_ERROR");
      }
      throw error;
    }
  }
}