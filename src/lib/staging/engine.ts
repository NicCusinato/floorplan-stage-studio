// ─── Staging Engine: Multi-Provider Orchestrator ───────────────────────────────
//
// This is the main entry point for all AI staging operations.
// It manages provider selection, fallbacks, and the Claude analysis pipeline.

import type {
  StagingProvider,
  StagingRequest,
  StagingResult,
  RoomAnalysis,
  ProviderStatus,
} from "./types";
import { BaseStagingProvider } from "./providers/base";
import { OpenAIProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";
import { FluxProvider } from "./providers/flux";
import { ClaudeProvider } from "./providers/claude";
import fs from "fs";

class StagingEngine {
  private providers: Map<StagingProvider, BaseStagingProvider>;

  constructor() {
    this.providers = new Map();
    this.providers.set("openai", new OpenAIProvider());
    this.providers.set("gemini", new GeminiProvider());
    this.providers.set("flux", new FluxProvider());
    this.providers.set("claude", new ClaudeProvider());
  }

  /** Get a specific provider */
  getProvider(name: StagingProvider): BaseStagingProvider | undefined {
    return this.providers.get(name);
  }

  /** Get the default provider from env config */
  getDefaultProvider(): StagingProvider {
    const envDefault = process.env.DEFAULT_STAGING_PROVIDER as StagingProvider;
    if (envDefault && this.providers.has(envDefault)) {
      const provider = this.providers.get(envDefault)!;
      if (provider.isAvailable() && provider.capabilities.canGenerate) {
        return envDefault;
      }
    }

    // Fallback: find first available provider that can generate images
    for (const [name, provider] of this.providers) {
      if (provider.isAvailable() && provider.capabilities.canGenerate) {
        return name;
      }
    }

    return "gemini"; // Last resort default
  }

  /** List all providers and their status */
  getProviderStatuses(): ProviderStatus[] {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      provider: name,
      available: provider.isAvailable(),
      hasApiKey: provider.isAvailable(),
      capabilities: provider.capabilities,
    }));
  }

  /** Get only providers that can generate images */
  getImageProviders(): ProviderStatus[] {
    return this.getProviderStatuses().filter((p) => p.capabilities.canGenerate);
  }

  /** Get only providers that can analyze rooms */
  getAnalysisProviders(): ProviderStatus[] {
    return this.getProviderStatuses().filter(
      (p) => p.capabilities.canAnalyze && p.available
    );
  }

  // ─── Core Operations ──────────────────────────────────────────────────────

  /**
   * Generate a staged room design.
   *
   * If Claude is available, it will first analyze the room to build a better
   * prompt, then pass that to the chosen image generation provider.
   */
  async stageRoom(request: StagingRequest): Promise<StagingResult> {
    const provider = this.providers.get(request.provider);
    if (!provider) {
      return {
        success: false,
        provider: request.provider,
        images: [],
        costUsd: 0,
        durationMs: 0,
        error: `Unknown provider: ${request.provider}`,
        metadata: {},
      };
    }

    if (!provider.isAvailable()) {
      return {
        success: false,
        provider: request.provider,
        images: [],
        costUsd: 0,
        durationMs: 0,
        error: `${request.provider} is not configured. Add the API key to your .env file.`,
        metadata: {},
      };
    }

    if (!provider.capabilities.canGenerate) {
      return {
        success: false,
        provider: request.provider,
        images: [],
        costUsd: 0,
        durationMs: 0,
        error: `${request.provider} cannot generate images. Use it for analysis only.`,
        metadata: {},
      };
    }

    // ─── Optional: Pre-analyze with Claude ────────────────────────────────
    let analysis: RoomAnalysis | null = null;

    if (
      request.inputImagePath &&
      fs.existsSync(request.inputImagePath) &&
      !request.prompt // Only auto-analyze if no custom prompt
    ) {
      analysis = await this.analyzeRoom(request.inputImagePath);

      if (analysis?.suggestedPrompt) {
        // Enhance the request with Claude's suggestions
        request = {
          ...request,
          prompt: analysis.suggestedPrompt,
          roomType: analysis.roomType || request.roomType,
        };
      }
    }

    // ─── Generate the staged image ────────────────────────────────────────
    const result = await provider.generateDesign(request);

    // Attach analysis if we did one
    if (analysis) {
      result.analysis = analysis;
    }

    return result;
  }

  /**
   * Analyze a room image using the best available analysis provider.
   * Priority: Claude > GPT-4o > Gemini
   */
  async analyzeRoom(imagePath: string): Promise<RoomAnalysis | null> {
    if (!fs.existsSync(imagePath)) return null;

    const imageBuffer = fs.readFileSync(imagePath);

    // Try Claude first (best at structured analysis)
    const claude = this.providers.get("claude");
    if (claude?.isAvailable() && claude.capabilities.canAnalyze) {
      const analysis = await claude.analyzeRoom(imageBuffer);
      if (analysis) return analysis;
    }

    // Fallback to OpenAI GPT-4o
    const openai = this.providers.get("openai");
    if (openai?.isAvailable() && openai.capabilities.canAnalyze) {
      const analysis = await openai.analyzeRoom(imageBuffer);
      if (analysis) return analysis;
    }

    // Fallback to Gemini
    const gemini = this.providers.get("gemini");
    if (gemini?.isAvailable() && gemini.capabilities.canAnalyze) {
      const analysis = await gemini.analyzeRoom(imageBuffer);
      if (analysis) return analysis;
    }

    return null;
  }

  /**
   * Stage with automatic fallback: if the primary provider fails,
   * try the next available one.
   */
  async stageRoomWithFallback(request: StagingRequest): Promise<StagingResult> {
    // Try the requested provider first
    const result = await this.stageRoom(request);
    if (result.success) return result;

    // If it failed, try other providers
    const fallbackOrder: StagingProvider[] = ["gemini", "openai", "flux"];
    for (const providerName of fallbackOrder) {
      if (providerName === request.provider) continue;

      const provider = this.providers.get(providerName);
      if (!provider?.isAvailable() || !provider.capabilities.canGenerate) continue;

      console.log(
        `[StagingEngine] ${request.provider} failed, falling back to ${providerName}`
      );

      const fallbackResult = await this.stageRoom({
        ...request,
        provider: providerName,
      });

      if (fallbackResult.success) {
        fallbackResult.metadata.fallbackFrom = request.provider;
        return fallbackResult;
      }
    }

    // All providers failed
    return {
      success: false,
      provider: request.provider,
      images: [],
      costUsd: 0,
      durationMs: 0,
      error: "All staging providers failed. Check your API keys and try again.",
      metadata: { attemptedProviders: [request.provider, ...fallbackOrder] },
    };
  }
}

// ─── Singleton instance ────────────────────────────────────────────────────────

let engineInstance: StagingEngine | null = null;

export function getStagingEngine(): StagingEngine {
  if (!engineInstance) {
    engineInstance = new StagingEngine();
  }
  return engineInstance;
}

export { StagingEngine };
