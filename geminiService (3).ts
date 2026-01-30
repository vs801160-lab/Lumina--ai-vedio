
import { GoogleGenAI, VideoGenerationReferenceType, Modality } from "@google/genai";
import { GenerationSettings } from "./types";

// Manual base64 decoding helper as per guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to wrap raw PCM data from Gemini TTS into a playable WAV blob
function encodeWAV(samples: Int16Array, sampleRate: number = 24000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

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
    // Use gemini-3-pro-preview for complex creative tasks and ensure system instruction is in config
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: "You are 'Lumina Director', a world-class AI cinematography and screenwriting assistant. Help users write scripts, describe camera shots, and refine prompts for a Video AI generator. Keep responses creative but concise. If a user asks for a video prompt, provide a high-quality cinematic description.",
      }
    });

    return response.text || "I'm sorry, I couldn't process that.";
  }

  static async refinePrompt(simplePrompt: string): Promise<string> {
    const ai = await this.getClient();
    try {
      // Upgraded to pro for better reasoning in refinement tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
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
      // Upgraded to pro for high-quality creative writing
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
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

    // Gemini TTS returns raw PCM. We need to decode it and wrap it in a WAV header for browser <audio> compatibility.
    const rawData = decode(base64Audio);
    const samples = new Int16Array(rawData.buffer);
    const wavBlob = encodeWAV(samples, 24000);
    return URL.createObjectURL(wavBlob);
  }

  static async generateVideo(
    settings: GenerationSettings,
    onProgress: (status: string) => void
  ): Promise<{ videoUrl: string, audioUrl?: string, apiVideoData: any }> {
    let ai = await this.getClient();
    
    onProgress("Synthesizing creative parameters...");
    
    const stylePrefix = settings.style ? `[Style: ${settings.style}] ` : "";
    const characterSuffix = settings.characterCues ? `. Character actions: ${settings.characterCues}` : "";
    const ambianceSuffix = settings.ambiance ? `. Environment & Lighting: ${settings.ambiance}` : "";
    
    const finalPrompt = `${stylePrefix}${settings.prompt}${characterSuffix}${ambianceSuffix}`;

    let operation;

    try {
      if (settings.previousVideo) {
        onProgress("Extending temporal sequence (Adding 7s)...");
        // Extension must be 720p and use the same aspect ratio as the previous operation
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
        // Reference images requirement: veo-3.1-generate-preview, 720p resolution, 16:9 aspect ratio
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
        // Re-creating client to ensure latest API key is used for the operation polling as per guidelines
        ai = await this.getClient();
        operation = await ai.operations.getVideosOperation({ operation: operation });
        waitCount++;
        onProgress(statusMessages[Math.min(waitCount % statusMessages.length, statusMessages.length - 1)]);
      }

      const apiVideoData = operation.response?.generatedVideos?.[0]?.video;
      const downloadLink = apiVideoData?.uri;
      if (!downloadLink) throw new Error("Video synthesis failed - no result from engine");

      // Appending API key to fetch MP4 bytes from the secure download link
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
      // Handling key selection error as mandated by guidelines for Veo models
      if (error?.message?.includes("Requested entity was not found")) {
        throw new Error("API_KEY_ERROR");
      }
      throw error;
    }
  }
}
