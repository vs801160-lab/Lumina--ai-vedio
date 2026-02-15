
import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "./types";

export class GeminiVideoService {
  private static getActiveKey(): string {
    const key = process.env.API_KEY;
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
      
      const currentKey = this.getActiveKey();
      // Ensure we append the key correctly
      const downloadUrl = new URL(videoData.uri);
      downloadUrl.searchParams.set('key', currentKey);

      const response = await fetch(downloadUrl.toString());
      
      if (!response.ok) {
        let errorBody = "";
        try {
           errorBody = await response.text();
        } catch (e) {}

        console.error("Download Failed details:", {
          status: response.status,
          body: errorBody
        });

        if (response.status === 403) {
          if (errorBody.toLowerCase().includes("leaked")) throw new Error("KEY_LEAKED");
          // If 403 happens during download but generation worked, it's almost always missing billing
          throw new Error("BILLING_REQUIRED");
        }
        
        throw new Error(`Download failed (Status: ${response.status}). Project billing or quota exceeded.`);
      }
      
      const blob = await response.blob();
      return { videoUrl: URL.createObjectURL(blob), apiVideoData: videoData };
    } catch (error: any) {
      const msg = error.message || "";
      console.error("Critical Generation Error:", msg);

      if (msg === "BILLING_REQUIRED") {
        throw new Error("BILLING_ERROR: Your Google Cloud project needs an active billing account to download videos. Please go to ai.google.dev/gemini-api/docs/billing");
      }
      
      if (msg.includes("leaked") || msg === "KEY_LEAKED" || msg === "API_KEY_MISSING") {
        throw new Error("KEY_RESET_REQUIRED");
      }

      throw error;
    }
  }
}
