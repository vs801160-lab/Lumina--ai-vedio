
import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "./types.ts";

export class GeminiVideoService {
  private static getActiveKey(): string {
    // Check for platform injected key first (dynamic)
    const platformKey = (window as any).process?.env?.API_KEY;
    if (platformKey && platformKey !== 'undefined' && platformKey !== '' && platformKey !== 'your_gemini_api_key_here') {
      return platformKey;
    }
    
    // Fallback to Vite defined key (static from .env)
    const key = process.env.API_KEY;
    if (!key || key === 'undefined' || key === '' || key === 'your_gemini_api_key_here') {
      throw new Error("API_KEY_PENDING");
    }
    return key;
  }

  static async refinePrompt(userPrompt: string): Promise<string> {
    if (!userPrompt) return "";
    try {
      const key = this.getActiveKey();
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a professional cinematographer. Improve this video prompt for an AI video model (Veo 3.1). Keep it concise but descriptive about lighting, movement, and mood. Prompt: "${userPrompt}"`,
        config: { temperature: 0.8 }
      });
      return response.text?.trim() || userPrompt;
    } catch (e: any) {
      if (e.message === "API_KEY_PENDING") return userPrompt;
      console.error("Refinement failed", e);
      return userPrompt;
    }
  }
  
  static async planStoryboard(script: string): Promise<any[]> {
    if (!script) return [];
    try {
      const key = this.getActiveKey();
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a film director. Break this short script into 3 cinematic scenes for an AI video model. 
        Return ONLY a JSON array of objects with keys: "title" (short name), "prompt" (detailed visual description), "shotType" (e.g. Wide, Close-up, POV).
        Script: "${script}"`,
        config: { 
          responseMimeType: "application/json"
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Storyboard planning failed", e);
      return [];
    }
  }

  static async generateAudio(prompt: string): Promise<string> {
    try {
      const key = this.getActiveKey();
      const ai = new GoogleGenAI({ apiKey: key });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Generate a cinematic Dolby Atmos soundscape and voiceover for this scene: ${prompt}` }] }],
        config: {
          responseModalities: ["AUDIO" as any],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return `data:audio/mp3;base64,${base64Audio}`;
      }
      throw new Error("Audio generation failed");
    } catch (e) {
      console.error("Audio generation error", e);
      throw e;
    }
  }

  static async generateDirectorsNote(prompt: string): Promise<string> {
    try {
      const key = this.getActiveKey();
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `As a legendary film director, write a 1-sentence "Director's Note" about the cinematic potential of this scene: "${prompt}". Focus on mood and visual storytelling.`,
      });
      return response.text?.trim() || "";
    } catch (e) {
      return "";
    }
  }

  static async generateVideo(
    settings: GenerationSettings,
    onProgress: (status: string) => void
  ): Promise<{ videoUrl: string, apiVideoData: any }> {
    try {
      const key = this.getActiveKey();
      const ai = new GoogleGenAI({ apiKey: key });
      onProgress("Initializing Lumina...");
      
      const model = 'veo-3.1-generate-preview'; // Use standard model for reference images
      const config: any = {
        numberOfVideos: 1,
        resolution: settings.resolution || '720p',
        aspectRatio: settings.aspectRatio || '16:9'
      };

      if (settings.referenceImages && settings.referenceImages.length > 0) {
        config.referenceImages = settings.referenceImages.map(img => {
          // Extract base64 data and mimeType
          const matches = img.match(/^data:([^;]+);base64,(.+)$/);
          const mimeType = matches ? matches[1] : 'image/png';
          const data = matches ? matches[2] : img;
          
          return {
            image: {
              imageBytes: data,
              mimeType: mimeType
            },
            referenceType: 'ASSET' // Using string literal for ASSET
          };
        });
      }

      onProgress("Connecting to Veo Servers...");
      
      let operation = await ai.models.generateVideos({
        model,
        prompt: `${settings.style ? `[Style: ${settings.style}] ` : ""}${settings.prompt}`,
        config
      });

      let pollCount = 0;
      const statusMessages = [
        "Synthesizing motion...",
        "Applying cinematic lighting...",
        "Rendering temporal consistency...",
        "Optimizing frame transitions...",
        "Finalizing pixels..."
      ];

      while (!operation.done) {
        const msg = statusMessages[pollCount % statusMessages.length];
        onProgress(msg);
        await new Promise(resolve => setTimeout(resolve, 10000));
        const pollAi = new GoogleGenAI({ apiKey: key });
        operation = await pollAi.operations.getVideosOperation({ operation: operation });
        pollCount++;
      }

      const videoData = operation.response?.generatedVideos?.[0]?.video;
      if (!videoData || !videoData.uri) throw new Error("No video data returned.");

      onProgress("Downloading Masterpiece...");
      const response = await fetch(videoData.uri, {
        method: 'GET',
        headers: {
          'x-goog-api-key': key,
        },
      });
      if (!response.ok) throw new Error("Could not fetch video stream.");
      
      const blob = await response.blob();
      return { videoUrl: URL.createObjectURL(blob), apiVideoData: videoData };
    } catch (error: any) {
      if (error.message === "API_KEY_PENDING") {
        throw new Error("आपका गूगल क्लाउड अकाउंट अभी वेरिफिकेशन में है। कृपया एक्टिव होने का इंतज़ार करें।");
      }
      throw error;
    }
  }
}
