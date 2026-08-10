export { getStagingEngine, StagingEngine } from "./engine";
export type {
  StagingProvider,
  StagingRequest,
  StagingResult,
  RoomAnalysis,
  ProviderStatus,
  ProviderCapabilities,
  GeneratedImage,
  RoomType,
  DesignStyle,
  StagingMode,
} from "./types";
export { DESIGN_STYLE_META, ROOM_TYPE_META } from "./types";
export { buildStagingPrompt, NEGATIVE_PROMPTS } from "./prompts";
