
import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "./types";

export class GeminiVideoService {
  /**
   * Always creates a fresh instance to use the most current API key from process.env.
   */
  private static createClient() {
    const key = process.env.API_KEY;
    if (!key || key === 'undefined' || key === '') {
      throw new Error("API_KEY_MISSING");
    }
    return new GoogleGenAI({ apiKey: key });
  }

  /**
   * Checks if an API key has been selected or set in env.
   */
  static async checkApiKey(): Promise<boolean> {
    try {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) return true;
      }
      const envKey = process.env.API_KEY;
      return !!(envKey && envKey !== 'undefined' && envKey !== '');
    } catch (e) {
      return false;
    }
  }

  /**
   * Opens the key selection dialog.
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
   * Generates video using Veo 3.1 models.
   */
  static async generateVideo(
    settings: GenerationSettings,
    onProgress: (status: string) => void
  ): Promise<{ videoUrl: string, apiVideoData: any }> {
    const ai = this.createClient();
    onProgress("Connecting to VEO compute cluster...");
    
    const stylePrefix = settings.style ? `[Style: ${settings.style}] ` : "";
    const finalPrompt = `${stylePrefix}${settings.prompt}`;

    try {
      let operation;
      if (settings.previousVideo) {
        onProgress("Extending cinematic timeline...");
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: settings.prompt || "Continue action",
          video: settings.previousVideo,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: settings.aspectRatio,
          }
        });
      } else {
        onProgress("Synthesizing neural imagery...");
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

      // Dynamic polling with progress increments
      let pollStep = 0;
      while (!operation.done) {
        pollStep++;
        await new Promise(resolve => setTimeout(resolve, 8000));
        // Use fresh client for each poll to avoid stale state
        const aiPolling = this.createClient();
        operation = await aiPolling.operations.getVideosOperation({ operation: operation });
        onProgress(`Rendering scene... (${Math.min(pollStep * 12, 98)}%)`);
      }

      const apiVideoData = operation.response?.generatedVideos?.[0]?.video;
      const downloadLink = apiVideoData?.uri;
      if (!downloadLink) throw new Error("GEN_EMPTY_RESULT");

      const apiKey = process.env.API_KEY;
      onProgress("Finalizing cinematic export...");
      const response = await fetch(`${downloadLink}&key=${apiKey}`);
      
      if (!response.ok) {
        const errorData = await response.text();
        if (errorData.includes("Requested entity was not found")) {
          throw new Error("Requested entity was not found");
        }
        throw new Error("API_KEY_ERROR");
      }
      
      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);

      return { videoUrl, apiVideoData };
    } catch (error: any) {
      console.error("Gemini Service Error Details:", error);
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
