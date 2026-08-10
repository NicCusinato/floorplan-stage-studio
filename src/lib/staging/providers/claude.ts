// ─── Claude Provider (Room Analysis Only) ──────────────────────────────────────

import { BaseStagingProvider } from "./base";
import type {
  StagingRequest,
  StagingResult,
  RoomAnalysis,
  ProviderCapabilities,
} from "../types";
import { CLAUDE_ANALYSIS_PROMPT } from "../prompts";

export class ClaudeProvider extends BaseStagingProvider {
  readonly name = "claude" as const;
  readonly capabilities: ProviderCapabilities = {
    canGenerate: false,   // Claude cannot generate images
    canEdit: false,
    canAnalyze: true,     // Excellent at room analysis
    canUpscale: false,
    canRecolor: false,
    maxImages: 0,
    maxResolution: { width: 0, height: 0 },
    costPerImage: { low: 0, medium: 0, high: 0 },
  };

  private getApiKey(): string {
    return process.env.ANTHROPIC_API_KEY || "";
  }

  isAvailable(): boolean {
    return !!this.getApiKey();
  }

  async generateDesign(_request: StagingRequest): Promise<StagingResult> {
    return this.errorResult(
      "Claude cannot generate images. Use Claude for room analysis, then switch to GPT/Gemini/FLUX for image generation."
    );
  }

  async analyzeRoom(imageBuffer: Buffer): Promise<RoomAnalysis | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const base64 = imageBuffer.toString("base64");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: CLAUDE_ANALYSIS_PROMPT + "\n\nRespond with ONLY the JSON object, no markdown or other text.",
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`Claude analysis error: ${response.status} - ${err}`);
        return null;
      }

      const data = await response.json();
      const textContent = data.content?.find(
        (c: { type: string }) => c.type === "text"
      );
      if (!textContent?.text) return null;

      // Parse JSON from the response (handle potential markdown wrapping)
      let jsonStr = textContent.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      return JSON.parse(jsonStr) as RoomAnalysis;
    } catch (error) {
      console.error("Claude analysis failed:", error);
      return null;
    }
  }
}
