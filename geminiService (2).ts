
import { GoogleGenAI, VideoGenerationReferenceType, Modality } from "@google/genai";
import { GenerationSettings } from "./types";

export class GeminiVideoService {
  private static async getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async checkApiKey(): Promise<boolean> {
    // @ts-ignore
    return await window.aistudio.hasSelectedApiKey();
  }

  static async openKeySelection(): Promise<void> {
    // @ts-ignore
    await window.aistudio.openSelectKey();
  }

  static async sendMessage(history: {role: string, parts: {text: string}[]}[], message: string) {
    const ai = await this.getClient();
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: "You are 'Lumina Director', a world-class AI cinematography and screenwriting assistant. Help users write scripts, describe camera shots, and refine prompts for a Video AI generator. Keep responses creative but concise. If a user asks for a video prompt, provide a high-quality cinematic description.",
      }
    });
    
    // We send the history manually since we don't store the chat object
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
    });

    return response.text || "I'm sorry, I couldn't process that.";
  }

  static async refinePrompt(simplePrompt: string): Promise<string> {
    const ai = await this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: `Rewrite the following simple video prompt into a professional, highly detailed cinematic description for an AI video model. Include technical camera terms, lighting descriptions, and atmospheric details. Keep it under 80 words. Simple prompt: "${simplePrompt}"` }
            ]
          }
        ]
      });
      return response.text || simplePrompt;
    } catch (e) {
      console.error("Prompt refinement failed", e);
      return simplePrompt;
    }
  }

  static async generateScript(videoPrompt: string, language: string = "English"): Promise<string> {
    const ai = await this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: `Write a world-class, 15-second cinematic narration script for a video with this visual prompt: "${videoPrompt}". 
              IMPORTANT: The script MUST be written in ${language}. 
              The tone should be epic, immersive, and professional. Only return the script text in ${language}.` }
            ]
          }
        ]
      });
      return response.text?.trim() || "";
    } catch (e) {
      console.error("Script generation failed", e);
      return "";
    }
  }

  static async generateAudio(text: string, voiceName: string = 'Zephyr'): Promise<string> {
    const ai = await this.getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed");

    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  static async generateVideo(
    settings: GenerationSettings,
    onProgress: (status: string) => void
  ): Promise<{ videoUrl: string, audioUrl?: string, apiVideoData: any }> {
    const ai = await this.getClient();
    
    onProgress("Synthesizing creative parameters...");
    
    const stylePrefix = settings.style ? `[Style: ${settings.style}] ` : "";
    const characterSuffix = settings.characterCues ? `. Character actions: ${settings.characterCues}` : "";
    const ambianceSuffix = settings.ambiance ? `. Environment & Lighting: ${settings.ambiance}` : "";
    
    const finalPrompt = `${stylePrefix}${settings.prompt}${characterSuffix}${ambianceSuffix}`;

    let operation;

    try {
      if (settings.previousVideo) {
        onProgress("Extending temporal sequence (Adding 7s)...");
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: settings.prompt || "Something unexpected happens",
          video: settings.previousVideo,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: settings.aspectRatio,
          }
        });
      } else if (settings.referenceImages && settings.referenceImages.length > 0) {
        onProgress("Injecting visual references...");
        const referenceImagesPayload = settings.referenceImages.map(img => ({
          image: {
            imageBytes: img.split(',')[1],
            mimeType: 'image/jpeg',
          },
          referenceType: VideoGenerationReferenceType.ASSET,
        }));

        operation = await ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: finalPrompt,
          config: {
            numberOfVideos: 1,
            referenceImages: referenceImagesPayload,
            resolution: '720p',
            aspectRatio: '16:9'
          }
        });
      } else if (settings.startImage || settings.endImage) {
        onProgress("Analyzing image-to-video reference frames...");
        
        const config: any = {
          numberOfVideos: 1,
          resolution: settings.resolution,
          aspectRatio: settings.aspectRatio
        };

        if (settings.endImage) {
          config.lastFrame = {
            imageBytes: settings.endImage.split(',')[1],
            mimeType: 'image/jpeg',
          };
        }

        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: finalPrompt,
          image: settings.startImage ? {
            imageBytes: settings.startImage.split(',')[1],
            mimeType: 'image/jpeg',
          } : undefined,
          config
        });
      } else {
        onProgress("Initializing text-to-scene engine...");
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

      let waitCount = 0;
      const statusMessages = [
        "Calculating spatial depth...",
        "Simulating actor physics...",
        "Baking procedural lighting...",
        "Refining texture detail...",
        "Polishing motion vectors...",
        "Encoding cinematic output..."
      ];

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        waitCount++;
        onProgress(statusMessages[Math.min(waitCount % statusMessages.length, statusMessages.length - 1)]);
      }

      const apiVideoData = operation.response?.generatedVideos?.[0]?.video;
      const downloadLink = apiVideoData?.uri;
      if (!downloadLink) throw new Error("Video synthesis failed - no result from engine");

      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);

      let audioUrl;
      let finalNarration = settings.narrationScript;

      if (settings.autoGenerateScript && !finalNarration) {
        onProgress(`AI is crafting an epic narration in ${settings.languageId || 'English'}...`);
        finalNarration = await this.generateScript(settings.prompt, settings.languageId);
      }

      if (finalNarration) {
        onProgress(`Synthesizing audio with ${settings.voiceId || 'Zephyr'}...`);
        audioUrl = await this.generateAudio(finalNarration, settings.voiceId);
      }

      return { videoUrl, audioUrl, apiVideoData };

    } catch (error: any) {
      if (error?.message?.includes("Requested entity was not found")) {
        throw new Error("API_KEY_ERROR");
      }
      throw error;
    }
  }
}
