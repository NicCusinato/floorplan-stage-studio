// ─── Cost Tracker Utility ──────────────────────────────────────────────────────
// Estimates and tracks costs across different AI providers.

import { ProviderCapabilities } from "../types";

export function estimateCost(
  capabilities: ProviderCapabilities,
  quality: "low" | "medium" | "high",
  numImages: number
): number {
  const costPerImage = capabilities.costPerImage[quality];
  return costPerImage * numImages;
}

export function formatCost(costUsd: number): string {
  if (costUsd === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
  }).format(costUsd);
}

/**
 * Parses actual costs from API responses if available,
 * otherwise falls back to the estimate.
 */
export function calculateActualCost(
  estimatedCost: number,
  _metadata: Record<string, unknown>
): number {
  // In a real production app, some APIs return token usage in the response.
  // For images, cost is usually fixed per image, so estimate == actual.
  return estimatedCost;
}
