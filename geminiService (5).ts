import { GoogleGenAI, VideoGenerationReferenceType, Modality } from "@google/genai";
import { GenerationSettings } from "./types";

// Helper function to decode base64 data
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export class GeminiVideoService {
  /**
   * Always create a fresh instance of GoogleGenAI to ensure the latest API key is used.
   */
  private static createClient() {
    const key = process.env.API_KEY;
    // Ensure we handle "undefined" string literal from some build tools
    const validKey = key && key !== 'undefined' && key !== '' ? key : undefined;
    return new GoogleGenAI({ apiKey: validKey as string });
  }

  /**
   * Checks if an API key is available.
   * Priority: 1. AI Studio Selection, 2. Environment Variable
   */
  static async checkApiKey(): Promise<boolean> {
    try {
      // Check AI Studio wrapper first
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const studioKey = await window.aistudio.hasSelectedApiKey();
        if (studioKey) return true;
      }
      
      // Fallback to environment variable (common in Netlify/Vercel)
      const envKey = process.env.API_KEY;
      return !!(envKey && envKey !== 'undefined' && envKey !== '');
    } catch (e) {
      const envKey = process.env.API_KEY;
      return !!(envKey && envKey !== 'undefined' && envKey !== '');
    }
  }

  /**
   * Triggers the API key selection dialog in AI Studio.
   */
  static async openKeySelection(): Promise<void> {
    try {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
      } else {
        console.warn("API Key selection dialog is only available in AI Studio environment.");
      }
    } catch (e) {
      console.error("Key selection failed", e);
    }
  }

  /**
   * Core video generation logic using Veo models.
   */
  static async generateVideo(
    settings: GenerationSettings,
    onProgress: (status: string) => void
  ): Promise<{ videoUrl: string, audioUrl?: string, apiVideoData: any }> {
    const ai = this.createClient();
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
        onProgress("Synthesizing initial frames...");
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

      // Polling loop
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        // Refresh client for each poll to ensure key freshness
        const aiPolling = this.createClient();
        operation = await aiPolling.operations.getVideosOperation({ operation: operation });
        onProgress("Processing cinematic vectors...");
      }

      const apiVideoData = operation.response?.generatedVideos?.[0]?.video;
      const downloadLink = apiVideoData?.uri;
      if (!downloadLink) throw new Error("Synthesis failed - result empty.");

      // Fetch video content using the API key
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) throw new Error("Failed to download video file. Check if your API key is from a paid project.");
      
      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);

      return { videoUrl, apiVideoData };
    } catch (error: any) {
      if (error?.message?.includes("Requested entity was not found") || error?.message?.includes("API_KEY_INVALID")) {
        throw new Error("API_KEY_ERROR");
      }
      throw error;
    }
  }
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}