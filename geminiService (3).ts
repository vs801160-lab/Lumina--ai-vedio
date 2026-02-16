
import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "./types.ts";

export class GeminiVideoService {
  private static getActiveKey(): string {
    const key = process.env.API_KEY;
    if (!key || key === 'undefined' || key === '') {
      throw new Error("API_KEY_MISSING");
    }
    return key;
  }

  static async refinePrompt(userPrompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.getActiveKey() });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Act as a cinematic director. Refine this video prompt for an AI generator (Veo 3.1). Make it descriptive, focus on lighting, camera angle, and movement. Keep it under 50 words. Prompt: "${userPrompt}"`,
        config: { temperature: 0.7 }
      });
      return response.text?.trim() || userPrompt;
    } catch (e) {
      console.error("Refinement failed", e);
      return userPrompt;
    }
  }

  static async generateVideo(
    settings: GenerationSettings,
    onProgress: (status: string) => void
  ): Promise<{ videoUrl: string, apiVideoData: any }> {
    const ai = new GoogleGenAI({ apiKey: this.getActiveKey() });
    onProgress("Initializing Lumina Engine...");
    
    try {
      const model = 'veo-3.1-fast-generate-preview';
      const config: any = {
        numberOfVideos: 1,
        resolution: settings.resolution || '720p',
        aspectRatio: settings.aspectRatio || '16:9'
      };

      onProgress("Contacting Google Veo Servers...");
      
      let operation = await ai.models.generateVideos({
        model,
        prompt: `${settings.style ? `[Style: ${settings.style}] ` : ""}${settings.prompt}`,
        config
      });

      // Poll for completion
      while (!operation.done) {
        onProgress("AI is rendering pixels... (Usually 1-2 mins)");
        await new Promise(resolve => setTimeout(resolve, 10000));
        const aiPoll = new GoogleGenAI({ apiKey: this.getActiveKey() });
        operation = await aiPoll.operations.getVideosOperation({ operation: operation });
      }

      const videoData = operation.response?.generatedVideos?.[0]?.video;
      if (!videoData || !videoData.uri) throw new Error("Video generation completed but no URI found.");

      onProgress("Finalizing download...");
      // Must append API key to fetch video bytes
      const response = await fetch(`${videoData.uri}&key=${this.getActiveKey()}`);
      if (!response.ok) throw new Error(`Download error: ${response.status}`);
      
      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);
      
      return { videoUrl, apiVideoData: videoData };
    } catch (error: any) {
      console.error("Gemini Service Error:", error);
      throw error;
    }
  }
}
