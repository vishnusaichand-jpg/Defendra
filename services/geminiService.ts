
import { GoogleGenAI, Chat, GenerateContentResponse, Modality, Type, LiveServerMessage } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { PlanType } from "../types";

export class GeminiService {
  // Fix: Removed permanent private instance to ensure fresh clients per call as per guidelines
  private getClient(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private wrapPrompt(message: string, plan: PlanType): string {
    return `[USER_PLAN: ${plan}] ${message}`;
  }

  async *streamMessageLite(message: string, plan: PlanType): AsyncGenerator<string> {
    const ai = this.getClient();
    const chat = ai.chats.create({
      // Fix: Used correct model alias for lite tasks
      model: 'gemini-flash-lite-latest',
      config: { systemInstruction: SYSTEM_INSTRUCTION },
    });
    const result = await chat.sendMessageStream({ message: this.wrapPrompt(message, plan) });
    for await (const chunk of result) {
      const text = (chunk as GenerateContentResponse).text;
      if (text) yield text;
    }
  }

  async *streamMessage(message: string, plan: PlanType): AsyncGenerator<string> {
    const ai = this.getClient();
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction: SYSTEM_INSTRUCTION },
    });
    const result = await chat.sendMessageStream({ message: this.wrapPrompt(message, plan) });
    for await (const chunk of result) {
      const text = (chunk as GenerateContentResponse).text;
      if (text) yield text;
    }
  }

  async generateGroundedContent(message: string, tool: 'googleSearch' | 'googleMaps', plan: PlanType): Promise<{ text: string; links: any[] }> {
    const ai = this.getClient();
    const config: any = { 
      tools: [],
      systemInstruction: SYSTEM_INSTRUCTION 
    };
    if (tool === 'googleSearch') config.tools.push({ googleSearch: {} });
    if (tool === 'googleMaps') config.tools.push({ googleMaps: {} });

    const response = await ai.models.generateContent({
      model: tool === 'googleMaps' ? 'gemini-2.5-flash' : 'gemini-3-flash-preview',
      contents: this.wrapPrompt(message, plan),
      config,
    });

    return {
      text: response.text || '',
      links: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  }

  async generateWithThinking(prompt: string, plan: PlanType): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: this.wrapPrompt(prompt, plan),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: 'low' }
      },
    });
    return response.text || '';
  }

  async generateImage(prompt: string, size: '1K' | '2K' | '4K'): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      },
    });
    for (const part of response.candidates?.[0].content.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image generated");
  }

  async editImage(prompt: string, base64Image: string): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } },
          { text: prompt }
        ]
      },
    });
    for (const part of response.candidates?.[0].content.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Edit failed");
  }

  async generateVideo(prompt: string, imageBase64?: string): Promise<string> {
    const ai = this.getClient();
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: imageBase64 ? {
        imageBytes: imageBase64.split(',')[1],
        mimeType: 'image/png'
      } : undefined,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed: No download link");
    
    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': process.env.API_KEY || '',
      },
    });
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async analyzeMedia(prompt: string, base64Data: string, mimeType: string, plan: PlanType): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data.split(',')[1], mimeType } },
          { text: this.wrapPrompt(prompt, plan) }
        ]
      },
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });
    return response.text || '';
  }

  connectLive(callbacks: any) {
    const ai = this.getClient();
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });
  }

  async generateSpeech(text: string): Promise<string | undefined> {
    try {
      const ai = this.getClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this naturally and concisely: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e) { return undefined; }
  }

  // Implementation follows SDK guidelines for raw PCM streaming
  decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  encodeBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000, numChannels: number = 1): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  }
}

export const gemini = new GeminiService();
