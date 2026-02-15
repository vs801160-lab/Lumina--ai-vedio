
import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "./types";

export class GeminiVideoService {
  private static createClient() {
    const key = process.env.API_KEY;
    // Hard requirement: API key availability is handled externally via process.env.API_KEY
    if (!key || key === 'undefined' || key === '') {
      throw new Error("AI Service Credentials not available.");
    }
    return new GoogleGenAI({ apiKey: key });
  }

  static async refinePrompt(userPrompt: string): Promise<string> {
    const ai = this.createClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a Hollywood Director. Rewrite this video prompt to be cinematic and detailed. Original: "${userPrompt}"`,
      });
      return response.text || userPrompt;
    } catch (error) {
      console.warn("Prompt refinement failed, using original.");
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

      console.log(`Starting generation with model: ${model}`);

      const config: any = {
        numberOfVideos: 1,
        resolution: settings.resolution,
        aspectRatio: settings.aspectRatio
      };

      if (settings.previousVideo) {
        // Extensions require veo-3.1-generate-preview and matched aspect ratio
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: settings.prompt,
          video: settings.previousVideo,
          config
        });
      } else if (settings.referenceImages && settings.referenceImages.length > 0) {
        // Multi-reference images require veo-3.1-generate-preview, 720p, and 16:9
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

      console.log("Operation started, polling for completion...");

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        // Fresh client instance for polling to ensure latest key is used
        const aiPoll = this.createClient();
        operation = await aiPoll.operations.getVideosOperation({ operation: operation });
        onProgress("Synthesizing cinematic pixels...");
      }

      const videoData = operation.response?.generatedVideos?.[0]?.video;
      if (!videoData?.uri) throw new Error("Video URI not found in response.");

      console.log("Downloading video from:", videoData.uri);
      const response = await fetch(`${videoData.uri}&key=${process.env.API_KEY}`);
      
      if (!response.ok) {
        const errText = await response.text();
        console.error("Download failed:", errText);
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const blob = await response.blob();
      return { videoUrl: URL.createObjectURL(blob), apiVideoData: videoData };
    } catch (error: any) {
      // Catch specific error for invalid projects or billing issues to trigger key selector
      if (error.message?.includes("Requested entity was not found.")) {
        throw new Error("KEY_RESET_REQUIRED");
      }
      console.error("Full Generation Error:", error);
      throw new Error(error.message || "Synthesis failed.");
    }
  }
}
