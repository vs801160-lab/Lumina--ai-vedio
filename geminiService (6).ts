
import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "./types";

export class GeminiVideoService {
  /**
   * Safely retrieves the API key from various possible environment sources.
   */
  private static getSafeKey(): string | undefined {
    const key = process.env.API_KEY;
    if (key && key !== 'undefined' && key !== 'null' && key !== '') {
      return key;
    }
    return undefined;
  }

  /**
   * Always create a fresh instance of GoogleGenAI.
   */
  private static createClient() {
    const validKey = this.getSafeKey();
    if (!validKey) throw new Error("API_KEY_MISSING");
    return new GoogleGenAI({ apiKey: validKey });
  }

  /**
   * Checks if an API key is available in any format.
   */
  static async checkApiKey(): Promise<boolean> {
    try {
      // 1. Check AI Studio window object
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const studioKey = await window.aistudio.hasSelectedApiKey();
        if (studioKey) return true;
      }
      
      // 2. Check injected process env
      return !!this.getSafeKey();
    } catch (e) {
      return !!this.getSafeKey();
    }
  }

  /**
   * Triggers the API key selection dialog.
   */
  static async openKeySelection(): Promise<void> {
    try {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
      }
    } catch (e) {
      console.error("Key selection UI failed", e);
    }
  }

  /**
   * Core video generation logic.
   */
  static async generateVideo(
    settings: GenerationSettings,
    onProgress: (status: string) => void
  ): Promise<{ videoUrl: string, apiVideoData: any }> {
    const ai = this.createClient();
    onProgress("Connecting to Lumina Compute Engine...");
    
    const stylePrefix = settings.style ? `[Style: ${settings.style}] ` : "";
    const finalPrompt = `${stylePrefix}${settings.prompt}`;

    try {
      let operation;
      if (settings.previousVideo) {
        onProgress("Extending cinematic sequence...");
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: settings.prompt || "Continue scene",
          video: settings.previousVideo,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: settings.aspectRatio,
          }
        });
      } else {
        onProgress("Synthesizing neural frames...");
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

      // Enhanced polling with status updates
      let pollCount = 0;
      while (!operation.done) {
        pollCount++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        const aiPolling = this.createClient();
        operation = await aiPolling.operations.getVideosOperation({ operation: operation });
        onProgress(`Rendering... (${pollCount * 10}%)`);
      }

      const apiVideoData = operation.response?.generatedVideos?.[0]?.video;
      const downloadLink = apiVideoData?.uri;
      if (!downloadLink) throw new Error("RENDER_EMPTY");

      const apiKey = this.getSafeKey();
      const response = await fetch(`${downloadLink}&key=${apiKey}`);
      if (!response.ok) throw new Error("DOWNLOAD_FAILED");
      
      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);

      return { videoUrl, apiVideoData };
    } catch (error: any) {
      console.error("Gemini Service Error:", error);
      if (error.message === 'API_KEY_MISSING' || error.message?.includes("403") || error.message?.includes("Key not found")) {
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
