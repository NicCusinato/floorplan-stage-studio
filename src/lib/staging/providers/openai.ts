// ─── OpenAI GPT Image Provider ─────────────────────────────────────────────────

import { BaseStagingProvider } from "./base";
import type {
  StagingRequest,
  StagingResult,
  RoomAnalysis,
  ProviderCapabilities,
  GeneratedImage,
} from "../types";
import { buildStagingPrompt, wrapPromptForProvider, NEGATIVE_PROMPTS, CLAUDE_ANALYSIS_PROMPT } from "../prompts";
import fs from "fs";
import path from "path";

export class OpenAIProvider extends BaseStagingProvider {
  readonly name = "openai" as const;
  readonly capabilities: ProviderCapabilities = {
    canGenerate: true,
    canEdit: true,
    canAnalyze: true,
    canUpscale: false,
    canRecolor: true,
    maxImages: 4,
    maxResolution: { width: 2048, height: 2048 },
    costPerImage: { low: 0.011, medium: 0.042, high: 0.167 },
  };

  private getApiKey(): string {
    return process.env.OPENAI_API_KEY || "";
  }

  isAvailable(): boolean {
    return !!this.getApiKey();
  }

  async generateDesign(request: StagingRequest): Promise<StagingResult> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return this.errorResult("OpenAI API key not configured");
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

      const prompt = wrapPromptForProvider(basePrompt, "openai");
      const numImages = Math.min(request.numImages || 1, 4);

      // Determine quality and size
      const quality = request.quality || "medium";
      const size = quality === "high" ? "1536x1024" : "1024x1024";

      // If we have an input image and want to edit, use the edit endpoint
      const hasInputImage = request.inputImagePath && fs.existsSync(request.inputImagePath);

      let responseData;

      if (hasInputImage && request.mode === "redesign") {
        // Use the image edit API
        const imageBuffer = fs.readFileSync(request.inputImagePath);
        const base64Image = imageBuffer.toString("base64");

        const response = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "dall-e-3",
            image: base64Image,
            prompt: prompt,
            n: numImages,
            size: size,
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          return this.errorResult(`OpenAI API error: ${response.status} - ${err}`, Date.now() - startTime);
        }

        responseData = await response.json();
      } else {
        // Use the image generation API
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt,
            n: numImages,
            size: size,
            quality: quality === "high" ? "hd" : "standard",
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          return this.errorResult(`OpenAI API error: ${response.status} - ${err}`, Date.now() - startTime);
        }

        responseData = await response.json();
      }

      const images: GeneratedImage[] = (responseData.data || []).map(
        (img: { url?: string; b64_json?: string }, _i: number) => ({
          url: img.url,
          base64: img.b64_json,
          width: quality === "high" ? 1536 : 1024,
          height: 1024,
          format: "png" as const,
          promptUsed: prompt,
        })
      );

      const costPerImage = this.capabilities.costPerImage[quality];
      const totalCost = costPerImage * images.length;

      return this.successResult(images, totalCost, Date.now() - startTime, {
        model: "dall-e-3",
        quality,
        size,
        promptUsed: prompt,
      });
    } catch (error) {
      return this.errorResult(
        `OpenAI error: ${error instanceof Error ? error.message : String(error)}`,
        Date.now() - startTime
      );
    }
  }

  async analyzeRoom(imageBuffer: Buffer): Promise<RoomAnalysis | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const base64 = imageBuffer.toString("base64");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: CLAUDE_ANALYSIS_PROMPT },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64}` },
                },
              ],
            },
          ],
          max_tokens: 1000,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      return JSON.parse(content) as RoomAnalysis;
    } catch {
      return null;
    }
  }
}
