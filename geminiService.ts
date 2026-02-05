
import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "./types";

const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

export class GeminiVideoService {
  // Guidelines: must use new GoogleGenAI({ apiKey: process.env.API_KEY })
  private static createClient() {
    const key = process.env.API_KEY;
    if (!key) {
      throw new Error("API_KEY_MISSING");
    }
    return new GoogleGenAI({ apiKey: key });
  }

  static async checkApiKey(): Promise<boolean> {
    try {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) return true;
      }
      return !!process.env.API_KEY;
    } catch (e) {
      return false;
    }
  }

  static async openKeySelection(): Promise<void> {
    try {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
      }
    } catch (e) {
      console.error("Key selection UI failed", e);
    }
  }

  static async generateVideo(
    settings: GenerationSettings,
    onProgress: (status: string) => void
  ): Promise<{ videoUrl: string, apiVideoData: any }> {
    // Guidelines: Create a new instance right before making an API call
    const ai = this.createClient();
    onProgress("Connecting to VEO compute cluster...");
    
    const stylePrefix = settings.style ? `[Style: ${settings.style}] ` : "";
    const finalPrompt = `${stylePrefix}${settings.prompt}`;

    try {
      let operation;
      if (settings.previousVideo) {
        onProgress("Extending cinematic timeline...");
        // Guidelines: Use 'veo-3.1-generate-preview' for extending videos (720p)
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
        // Guidelines: Use 'veo-3.1-fast-generate-preview' for general video tasks
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

      let pollStep = 0;
      while (!operation.done) {
        pollStep++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        // Guidelines: Create a new instance right before making an API call
        const aiPolling = this.createClient();
        operation = await aiPolling.operations.getVideosOperation({ operation: operation });
        onProgress(`Rendering scene... (${Math.min(pollStep * 12, 98)}%)`);
      }

      const apiVideoData = operation.response?.generatedVideos?.[0]?.video;
      const downloadLink = apiVideoData?.uri;
      if (!downloadLink) throw new Error("GEN_EMPTY_RESULT");

      onProgress("Finalizing cinematic export...");
      // Guidelines: Append API key when fetching from the download link
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      
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
      console.error("Gemini Service Error:", error);
      if (error.message === 'API_KEY_MISSING' || error.message?.includes("403")) {
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
