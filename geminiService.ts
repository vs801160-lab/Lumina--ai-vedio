import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "./types";

export class GeminiVideoService {

  /**
   * Create Gemini client using Vite environment variable
   */
  private static createClient() {
    const key = import.meta.env.VITE_GEMINI_API_KEY;

    if (!key || key === "undefined" || key === "") {
      throw new Error("API_KEY_MISSING");
    }

    return new GoogleGenAI({ apiKey: key });
  }

  /**
   * Check if API key exists
   */
  static async checkApiKey(): Promise<boolean> {
    try {
      const key = import.meta.env.VITE_GEMINI_API_KEY;
      return !!(key && key !== "undefined" && key !== "");
    } catch {
      return false;
    }
  }

  /**
   * Optional: keep for future UI integration
   */
  static async openKeySelection(): Promise<void> {
    console.warn("Key selection UI not supported in web version");
  }

  /**
   * Generate video using Gemini
   */
  static async generateVideo(settings: GenerationSettings) {
    const client = this.createClient();

    // ⚠️ Example call — adjust as per your actual Gemini API usage
    const response = await client.models.generateContent({
      model: "gemini-1.5-pro",
      contents: [
        {
          role: "user",
          parts: [
            { text: settings.prompt }
          ]
        }
      ]
    });

    return response;
  }
}
