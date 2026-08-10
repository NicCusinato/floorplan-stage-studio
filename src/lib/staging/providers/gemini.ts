// ─── Google Gemini / Imagen Provider ───────────────────────────────────────────

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { BaseStagingProvider } from "./base";
import type {
  StagingRequest,
  StagingResult,
  RoomAnalysis,
  ProviderCapabilities,
  GeneratedImage,
} from "../types";
import { buildStagingPrompt, wrapPromptForProvider, CLAUDE_ANALYSIS_PROMPT } from "../prompts";
import fs from "fs";

export class GeminiProvider extends BaseStagingProvider {
  readonly name = "gemini" as const;
  readonly capabilities: ProviderCapabilities = {
    canGenerate: true,
    canEdit: true,
    canAnalyze: true,
    canUpscale: true,
    canRecolor: true,
    maxImages: 4,
    maxResolution: { width: 2048, height: 2048 },
    costPerImage: { low: 0.045, medium: 0.067, high: 0.101 },
  };

  private getApiKey(): string {
    return process.env.GEMINI_API_KEY || "";
  }

  isAvailable(): boolean {
    return !!this.getApiKey();
  }

  async generateDesign(request: StagingRequest): Promise<StagingResult> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return this.errorResult("Gemini API key not configured");
    }

    try {
      const modeMap: Record<string, string> = {
        stage_empty: "stage",
        redesign: "redesign",
        wall_recolor: "recolor_wall",
        cabinet_recolor: "recolor_cabinet",
        remodel_kitchen: "remodel",
        remodel_bathroom: "remodel",
        remove_objects: "remove",
      };

      const basePrompt = buildStagingPrompt({
        roomType: request.roomType,
        designStyle: request.designStyle,
        customPrompt: request.prompt,
        promptPrefix: request.promptPrefix,
        promptSuffix: request.promptSuffix,
        targetColor: request.targetColor,
        mode: (modeMap[request.mode] || "stage") as "stage" | "redesign" | "recolor_wall" | "recolor_cabinet" | "remodel" | "remove",
      });

      const prompt = wrapPromptForProvider(basePrompt, "gemini");
      const numImages = Math.min(request.numImages || 1, 4);

      // Build the request parts
      const parts: Array<Record<string, unknown>> = [];

      // If we have an input image, include it
      const hasInputImage = request.inputImagePath && fs.existsSync(request.inputImagePath);
      if (hasInputImage) {
        const imageBuffer = fs.readFileSync(request.inputImagePath);
        const base64 = imageBuffer.toString("base64");
        const mimeType = request.inputImagePath.endsWith(".png") ? "image/png" : "image/jpeg";

        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64,
          },
        });

        // For editing, prepend instruction
        parts.push({
          text: `Edit this room image: ${prompt}`,
        });
      } else {
        parts.push({ text: prompt });
      }

      // Use Gemini's generateContent with image generation enabled
      const model = "gemini-2.0-flash-exp"; // Supports image generation
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            candidateCount: Math.min(numImages, 1), // Gemini returns 1 candidate at a time
          },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return this.errorResult(`Gemini API error: ${response.status} - ${err}`, Date.now() - startTime);
      }

      const data = await response.json();

      // Extract images from response
      const images: GeneratedImage[] = [];
      const candidates = data.candidates || [];

      for (const candidate of candidates) {
        const candidateParts = candidate.content?.parts || [];
        for (const part of candidateParts) {
          if (part.inline_data?.mime_type?.startsWith("image/")) {
            images.push({
              base64: part.inline_data.data,
              width: 1024,
              height: 1024,
              format: part.inline_data.mime_type === "image/png" ? "png" : "jpeg",
              promptUsed: prompt,
            });
          }
        }
      }

      // If we need more images, make additional requests
      for (let i = images.length; i < numImages; i++) {
        try {
          const additionalResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                responseModalities: ["IMAGE", "TEXT"],
                candidateCount: 1,
              },
            }),
          });

          if (additionalResponse.ok) {
            const additionalData = await additionalResponse.json();
            for (const candidate of (additionalData.candidates || [])) {
              for (const part of (candidate.content?.parts || [])) {
                if (part.inline_data?.mime_type?.startsWith("image/")) {
                  images.push({
                    base64: part.inline_data.data,
                    width: 1024,
                    height: 1024,
                    format: "png",
                    promptUsed: prompt,
                  });
                }
              }
            }
          }
        } catch {
          // Skip failed additional images
        }
      }

      const quality = request.quality || "medium";
      const costPerImage = this.capabilities.costPerImage[quality];
      const totalCost = costPerImage * images.length;

      return this.successResult(images, totalCost, Date.now() - startTime, {
        model,
        quality,
        promptUsed: prompt,
      });
    } catch (error) {
      return this.errorResult(
        `Gemini error: ${error instanceof Error ? error.message : String(error)}`,
        Date.now() - startTime
      );
    }
  }

  async analyzeRoom(imageBuffer: Buffer): Promise<RoomAnalysis | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const base64 = imageBuffer.toString("base64");
      const model = "gemini-2.0-flash-exp";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64,
                  },
                },
                { text: CLAUDE_ANALYSIS_PROMPT },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      return JSON.parse(text) as RoomAnalysis;
    } catch {
      return null;
    }
  }
}
