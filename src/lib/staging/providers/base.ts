// ─── Abstract base for all staging providers ──────────────────────────────────

import type {
  StagingProvider,
  StagingRequest,
  StagingResult,
  RoomAnalysis,
  ProviderCapabilities,
  GeneratedImage,
} from "../types";

export abstract class BaseStagingProvider {
  abstract readonly name: StagingProvider;
  abstract readonly capabilities: ProviderCapabilities;

  /** Check if this provider is configured and ready */
  abstract isAvailable(): boolean;

  /** Generate a staged room image */
  abstract generateDesign(request: StagingRequest): Promise<StagingResult>;

  /** Edit/inpaint an existing room image (if supported) */
  async editRoom(
    _imageBuffer: Buffer,
    _request: StagingRequest
  ): Promise<StagingResult> {
    return {
      success: false,
      provider: this.name,
      images: [],
      costUsd: 0,
      durationMs: 0,
      error: `${this.name} does not support image editing`,
      metadata: {},
    };
  }

  /** Analyze a room image (if supported) */
  async analyzeRoom(_imageBuffer: Buffer): Promise<RoomAnalysis | null> {
    return null;
  }

  /** Helper: create a successful result */
  protected successResult(
    images: GeneratedImage[],
    costUsd: number,
    durationMs: number,
    metadata: Record<string, unknown> = {}
  ): StagingResult {
    return {
      success: true,
      provider: this.name,
      images,
      costUsd,
      durationMs,
      metadata,
    };
  }

  /** Helper: create a failed result */
  protected errorResult(error: string, durationMs: number = 0): StagingResult {
    return {
      success: false,
      provider: this.name,
      images: [],
      costUsd: 0,
      durationMs,
      error,
      metadata: {},
    };
  }
}
