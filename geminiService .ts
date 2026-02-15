
import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "./types";

export class GeminiVideoService {
  private static getActiveKey(): string {
    const key = import.meta.env.VITE_GEMIMI_API_KEY;
    if (!key || key === 'undefined' || key === '') {
      throw new Error("API_KEY_MISSING");
    }
    return key;
  }

  private static createClient() {
    return new GoogleGenAI({ apiKey: this.getActiveKey() });
  }

  static async refinePrompt(userPrompt: string): Promise<string> {
    try {
      const ai = this.createClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a Hollywood Director. Rewrite this video prompt to be cinematic and detailed. Original: "${userPrompt}"`,
      });
      return response.text || userPrompt;
    } catch (error) {
      return userPrompt;
    }
  }

  static async generateVideo(
    settings: GenerationSettings,
    onProgress: (status: string) => void
  ): Promise<{ videoUrl: string, apiVideoData: any }> {
    const ai = this.createClient();
    onProgress("Connecting to Neural Engine...");
    
    try {
      let operation;
      const model = (settings.previousVideo || (settings.referenceImages && settings.referenceImages.length > 0)) 
        ? 'veo-3.1-generate-preview' 
        : 'veo-3.1-fast-generate-preview';

      const config: any = {
        numberOfVideos: 1,
        resolution: settings.resolution,
        aspectRatio: settings.aspectRatio
      };

      if (settings.previousVideo) {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: settings.prompt,
          video: settings.previousVideo,
          config
        });
      } else if (settings.referenceImages && settings.referenceImages.length > 0) {
        const referenceImagesPayload = settings.referenceImages.map(img => ({
          image: { imageBytes: img.includes(',') ? img.split(',')[1] : img, mimeType: 'image/png' },
          referenceType: 'ASSET' as any,
        }));
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: settings.prompt,
          config: { ...config, resolution: '720p', aspectRatio: '16:9', referenceImages: referenceImagesPayload }
        });
      } else if (settings.image) {
        operation = await ai.models.generateVideos({
          model,
          prompt: settings.prompt,
          image: { imageBytes: settings.image.split(',')[1], mimeType: 'image/jpeg' },
          config
        });
      } else {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: `${settings.style ? `[Style: ${settings.style}] ` : ""}${settings.prompt}`,
          config
        });
      }

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        const aiPoll = this.createClient();
        operation = await aiPoll.operations.getVideosOperation({ operation: operation });
        onProgress("Synthesizing cinematic pixels...");
      }

      const videoData = operation.response?.generatedVideos?.[0]?.video;
      if (!videoData?.uri) throw new Error("Video synthesis completed but no URI returned.");

      onProgress("Downloading cinematic master...");
      
      // Always get the latest key for the fetch call
      const currentKey = this.getActiveKey();
      const downloadUrl = videoData.uri.includes('?') 
        ? `${videoData.uri}&key=${currentKey}` 
        : `${videoData.uri}?key=${currentKey}`;

      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Download Error Details:", {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });

        if (response.status === 403) {
          if (errorBody.includes("leaked")) throw new Error("KEY_LEAKED");
          throw new Error("BILLING_REQUIRED: Video downloading requires a paid Google Cloud project with billing enabled.");
        }
        
        throw new Error(`Download failed (${response.status}): Please check your project billing or API quota.`);
      }
      
      const blob = await response.blob();
      return { videoUrl: URL.createObjectURL(blob), apiVideoData: videoData };
    } catch (error: any) {
      const msg = error.message || "";
      console.error("Generation/Download Error:", msg);

      if (msg.includes("leaked") || msg === "KEY_LEAKED" || msg.includes("403") || msg === "API_KEY_MISSING" || msg.includes("KEY_RESET_REQUIRED")) {
        throw new Error("KEY_RESET_REQUIRED");
      }
      if (msg.includes("BILLING_REQUIRED")) {
        throw new Error("Billing Required: This model requires a paid Google Cloud project. Please update your API key project settings.");
      }
      throw error;
    }
  }
}
