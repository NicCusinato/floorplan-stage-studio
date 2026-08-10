"use client";

import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";

const STYLE_PRESETS = [
  { label: "Modern", prompt: "modern minimalist style, clean lines, neutral tones, contemporary furniture" },
  { label: "Scandinavian", prompt: "scandinavian style, light wood, white walls, cozy textiles, hygge" },
  { label: "Japandi", prompt: "japandi style, wabi-sabi, natural materials, zen minimalism, muted tones" },
  { label: "Industrial", prompt: "industrial style, exposed brick, metal accents, dark tones, Edison bulbs" },
  { label: "Luxury", prompt: "luxury style, high-end finishes, gold accents, rich fabrics, designer furniture" },
  { label: "Coastal", prompt: "coastal style, light blues and whites, natural textures, airy and bright" },
  { label: "Bohemian", prompt: "bohemian style, eclectic patterns, rich warm colors, layered textiles" },
];

export function GlobalStyleBar({ projectId }: { projectId: string }) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleApply = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }), // no roomName = applies to all rooms
      });
      if (res.ok) {
        setPrompt("");
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "Styling failed"}`);
      }
    } catch {
      alert("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
        <Sparkles className="w-4 h-4 text-blue-400" />
        Restyle All Rooms
      </div>

      {/* Style presets */}
      <div className="flex flex-wrap gap-2">
        {STYLE_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPrompt(p.prompt)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              prompt === p.prompt
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700 hover:border-zinc-600 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom prompt */}
      <div className="flex gap-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
          disabled={isLoading}
          placeholder='e.g. "warm terracotta walls with light oak floors" or "dark moody industrial look"'
          className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-colors"
        />
        <button
          onClick={handleApply}
          disabled={isLoading || !prompt.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 text-white px-5 py-3 rounded-xl text-sm font-medium transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Applying…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Apply to All
            </>
          )}
        </button>
      </div>

      {isLoading && (
        <p className="text-xs text-blue-400/70">
          Gemini is editing all room photos… this may take 1–2 minutes. The page will refresh when done.
        </p>
      )}
    </div>
  );
}
