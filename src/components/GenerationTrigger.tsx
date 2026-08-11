"use client";

import { useState } from "react";
import { Zap, Star, Upload, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface GenerationTriggerProps {
  projectId: string;
  hasFloorplan: boolean;
  compact?: boolean;
}

export function GenerationTrigger({ projectId, hasFloorplan, compact = false }: GenerationTriggerProps) {
  const [isLoading, setIsLoading] = useState<"preview" | "quality" | null>(null);
  const router = useRouter();

  const handleGenerate = async (mode: "preview" | "quality") => {
    if (!hasFloorplan) {
      alert("Please upload a floor plan first.");
      return;
    }
    setIsLoading(mode);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else if (res.status === 503) {
        // FAL_KEY not configured
        alert(
          `⚠️ AI Provider API key not set.\n\nTo fix:\n1. Check your .env file and ensure OPENAI_API_KEY (or FAL_KEY) is set.\n2. Restart Docker.`
        );
      } else {
        alert(`Error: ${data.error || "Generation failed"}`);
      }
    } catch {
      alert("Network error — please try again");
    } finally {
      setIsLoading(null);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleGenerate("preview")}
          disabled={!!isLoading || !hasFloorplan}
          className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-zinc-700"
          title="Fast preview (~3s/room)"
        >
          {isLoading === "preview" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-yellow-400" />}
          Preview
        </button>
        <button
          onClick={() => handleGenerate("quality")}
          disabled={!!isLoading || !hasFloorplan}
          className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-zinc-700"
          title="High quality render (~20s/room)"
        >
          {isLoading === "quality" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3 text-blue-400" />}
          Quality
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-12 text-center space-y-6">
      <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
        <Zap className="w-10 h-10 text-blue-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold">Ready to Stage</h2>
        {hasFloorplan ? (
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Gemini Vision will read your floor plan and identify every room. 
            Then the selected AI Provider will generate a photorealistic staged photo for each room.
          </p>
        ) : (
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Upload a floor plan image first (PNG or JPEG — with room labels, dimensions, or both).
          </p>
        )}
      </div>

      {!hasFloorplan && (
        <a
          href={`/projects/${projectId}/upload`}
          className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-6 py-3 rounded-xl font-medium transition-colors border border-zinc-700"
        >
          <Upload className="w-4 h-4" />
          Upload Floor Plan
        </a>
      )}

      {hasFloorplan && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Preview mode */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => handleGenerate("preview")}
              disabled={!!isLoading}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-semibold transition-colors border border-zinc-600 hover:border-zinc-500"
            >
              {isLoading === "preview" ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Generating previews…</>
              ) : (
                <><Zap className="w-5 h-5 text-yellow-400" /> Quick Preview</>
              )}
            </button>
            <span className="text-xs text-zinc-500">~3s per room · draft quality</span>
          </div>

          <div className="text-zinc-600 text-sm hidden sm:block">or</div>

          {/* Quality mode */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => handleGenerate("quality")}
              disabled={!!isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/20"
            >
              {isLoading === "quality" ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Generating…</>
              ) : (
                <><Star className="w-5 h-5" /> High Quality</>
              )}
            </button>
            <span className="text-xs text-zinc-500">~20s per room · AI</span>
          </div>
        </div>
      )}

      {isLoading && (
        <p className="text-xs text-blue-400/70 animate-pulse">
          {isLoading === "preview"
            ? `Gemini is reading your floor plan… AI is generating quick previews.`
            : `Gemini is reading your floor plan… AI is generating high-quality photos.`}
          {" "}Page will update automatically.
        </p>
      )}
    </div>
  );
}
