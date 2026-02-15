
import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "./types.ts";

export class GeminiVideoService {
  private static getActiveKey(): string {
    // Safe access to process.env to prevent ReferenceError: process is not defined
    const env = typeof process !== 'undefined' ? process.env : (window as any).process?.env || {};
    const key = env.API_KEY;
    
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
        resolution: settings.resolution || '720p',
        aspectRatio: settings.aspectRatio || '16:9'
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
          image: { 
            imageBytes: img.includes(',') ? img.split(',')[1] : img, 
            mimeType: 'image/png' 
          },
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
          image: { 
            imageBytes: settings.image.includes(',') ? settings.image.split(',')[1] : settings.image, 
            mimeType: 'image/jpeg' 
          },
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
      if (!videoData || !videoData.uri) {
        throw new Error("Video synthesis completed but download URI is missing.");
      }

      onProgress("Downloading cinematic master...");
      
      const currentKey = this.getActiveKey();
      const separator = videoData.uri.includes('?') ? '&' : '?';
      const downloadUrl = `${videoData.uri}${separator}key=${currentKey}`;

      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        const status = response.status;
        let errorBody = "";
        try { errorBody = await response.text(); } catch(e) {}

        if (status === 403) {
          if (errorBody.toLowerCase().includes("leaked")) throw new Error("KEY_LEAKED");
          throw new Error("BILLING_REQUIRED");
        }
        
        throw new Error(`Download failed with status ${status}.`);
      }
      
      const blob = await response.blob();
      return { 
        videoUrl: URL.createObjectURL(blob), 
        apiVideoData: videoData 
      };
    } catch (error: any) {
      const msg = error.message || "Unknown error";
      if (msg === "BILLING_REQUIRED") {
        throw new Error("BILLING_ERROR: Project needs active billing to download videos.");
      }
      if (msg.includes("leaked") || msg === "KEY_LEAKED" || msg === "API_KEY_MISSING") {
        throw new Error("KEY_RESET_REQUIRED");
      }
      throw error;
    }
  }
}
