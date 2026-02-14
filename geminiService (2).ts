
import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "./types";

export class GeminiVideoService {
  private static createClient() {
    const key = process.env.API_KEY;
    if (!key || key === 'undefined' || key === '') {
      throw new Error("Missing AI Service Credentials.");
    }
    return new GoogleGenAI({ apiKey: key });
  }

  static async refinePrompt(userPrompt: string): Promise<string> {
    const ai = this.createClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a Hollywood Director. Rewrite this video prompt to be cinematic, detailed, and visually stunning. Original Prompt: "${userPrompt}"`,
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
    onProgress("Initializing AI Core...");
    
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
        onProgress("Synthesizing cinematic frames...");
      }

      const videoData = operation.response?.generatedVideos?.[0]?.video;
      const response = await fetch(`${videoData.uri}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return { videoUrl: URL.createObjectURL(blob), apiVideoData: videoData };
    } catch (error: any) {
      throw new Error(error.message || "Synthesis failed.");
    }
  }
}
