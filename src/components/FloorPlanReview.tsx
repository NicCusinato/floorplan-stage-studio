"use client";

import { useState } from "react";
import {
  ScanSearch, Loader2, CheckCircle2, XCircle, Plus, Trash2,
  Edit3, RefreshCw, Zap, Star, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface RoomEntry {
  name: string;
  sqft: number;
  features: string[];
  approximate_dimensions?: string;
  cameraAngle?: string;
}

interface FloorPlanReviewProps {
  projectId: string;
  floorplanAssetId: string;
  /** Already-extracted room state from DB, or null if not analyzed yet */
  existingAnalysis: { totalSqft: number; rooms: RoomEntry[] } | null;
}

const SKIP_ROOMS = new Set([
  "BATHROOM", "CLOSET", "CL", "UTILITY RM", "UTILITY",
  "LAUNDRY", "STORAGE", "CORRIDOR", "HALLWAY",
]);

export function FloorPlanReview({ projectId, floorplanAssetId, existingAnalysis }: FloorPlanReviewProps) {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ totalSqft: number; rooms: RoomEntry[] } | null>(existingAnalysis);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<RoomEntry | null>(null);
  const [generateMode, setGenerateMode] = useState<"preview" | "quality">("preview");
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Analyze floor plan ────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysis(data.analysis);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Edit a room entry ─────────────────────────────────────────────────────
  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValues({ ...analysis!.rooms[index] });
  };

  const saveEdit = () => {
    if (!analysis || editValues === null || editingIndex === null) return;
    const updated = [...analysis.rooms];
    updated[editingIndex] = editValues;
    setAnalysis({ ...analysis, rooms: updated });
    setEditingIndex(null);
    setEditValues(null);
  };

  const deleteRoom = (index: number) => {
    if (!analysis) return;
    const updated = analysis.rooms.filter((_, i) => i !== index);
    setAnalysis({ ...analysis, rooms: updated });
  };

  const addRoom = () => {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      rooms: [...analysis.rooms, { name: "NEW ROOM", sqft: 100, features: [], cameraAngle: "doorway" }],
    });
    setEditingIndex(analysis.rooms.length);
    setEditValues({ name: "NEW ROOM", sqft: 100, features: [], cameraAngle: "doorway" });
  };

  // ── Save edited rooms back to DB and trigger generation ───────────────────
  const handleGenerate = async () => {
    if (!analysis) return;
    setIsGenerating(true);
    try {
      // Persist edited room state back to the project
      await fetch(`/api/projects/${projectId}/analyze`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysis),
      });

      // Kick off generation
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: generateMode }),
      });
      const data = await res.json();

      if (res.status === 503) {
        alert(
          `⚠️ fal.ai API key not set.\n\n1. Go to https://fal.ai/dashboard → API Keys\n2. Open .env and paste as FAL_KEY="key_xxx"\n3. Restart Docker`
        );
        return;
      }
      if (!res.ok) throw new Error(data.error || "Generation failed");

      router.refresh();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const stageableRooms = analysis?.rooms.filter((r) => !SKIP_ROOMS.has(r.name.toUpperCase().trim())) ?? [];
  const skippedRooms = analysis?.rooms.filter((r) => SKIP_ROOMS.has(r.name.toUpperCase().trim())) ?? [];

  // ── Not yet analyzed ──────────────────────────────────────────────────────
  if (!analysis) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
          <ScanSearch className="w-8 h-8 text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-1">Analyze Floor Plan</h3>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto">
            Gemini Vision will read the floor plan and identify every room with its approximate size.
            You&apos;ll be able to review and edit the results before generating photos.
          </p>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 max-w-sm mx-auto">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-amber-500/20"
        >
          {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing…</> : <><ScanSearch className="w-5 h-5" /> Analyze Floor Plan</>}
        </button>
        {isAnalyzing && (
          <p className="text-xs text-zinc-500 animate-pulse">Gemini is reading the floor plan layout and room labels…</p>
        )}
      </div>
    );
  }

  // ── Analysis results ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold">Floor Plan Extracted</h3>
          <span className="text-xs text-zinc-500">{analysis.totalSqft} sqft total · {analysis.rooms.length} spaces found</span>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors border border-zinc-700 disabled:opacity-50"
          title="Re-run analysis"
        >
          {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Re-analyze
        </button>
      </div>

      {/* Room list — editable */}
      <div className="space-y-2">
        {analysis.rooms.map((room, i) => {
          const isSkipped = SKIP_ROOMS.has(room.name.toUpperCase().trim());
          const isEditing = editingIndex === i;

          return (
            <div
              key={i}
              className={`rounded-xl border transition-colors ${
                isSkipped
                  ? "bg-zinc-900/50 border-zinc-800 opacity-60"
                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {isEditing && editValues ? (
                // Edit mode
                <div className="p-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-zinc-400 block mb-1">Room name</label>
                      <input
                        className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        value={editValues.name}
                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value.toUpperCase() })}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                        autoFocus
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-zinc-400 block mb-1">Sqft</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        value={editValues.sqft}
                        onChange={(e) => setEditValues({ ...editValues, sqft: Number(e.target.value) })}
                      />
                    </div>
                    <div className="w-48">
                      <label className="text-xs text-zinc-400 block mb-1">Camera Angle</label>
                      <select
                        className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none"
                        value={editValues.cameraAngle || "doorway"}
                        onChange={(e) => setEditValues({ ...editValues, cameraAngle: e.target.value })}
                      >
                        <option value="doorway">Doorway (Wide)</option>
                        <option value="window">Window (Looking in)</option>
                        <option value="corner">Corner Shot</option>
                        <option value="top-down">Top-Down</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Features (comma-separated)</label>
                    <input
                      className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      value={editValues.features.join(", ")}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          features: e.target.value.split(",").map((f) => f.trim()).filter(Boolean),
                        })
                      }
                      placeholder="window, island, closet, balcony…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingIndex(null); setEditValues(null); }}
                      className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm py-1.5 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSkipped ? "bg-zinc-600" : "bg-emerald-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{room.name}</span>
                      {isSkipped && <span className="text-xs text-zinc-500 italic">skipped</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-zinc-500">{room.sqft} sqft</span>
                      {room.approximate_dimensions && (
                        <span className="text-xs text-zinc-600">{room.approximate_dimensions}</span>
                      )}
                      <span className="text-xs text-blue-400/80">Angle: {room.cameraAngle || "doorway"}</span>
                      {room.features.length > 0 && (
                        <span className="text-xs text-zinc-600 truncate">
                          {room.features.slice(0, 3).join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(i)}
                      className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                      title="Edit room"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteRoom(i)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove room"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add room manually */}
        <button
          onClick={addRoom}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add room manually
        </button>
      </div>

      {/* Summary */}
      {skippedRooms.length > 0 && (
        <p className="text-xs text-zinc-500">
          {skippedRooms.map(r => r.name).join(", ")} will be skipped (bathrooms, closets, utility rooms are not staged).
        </p>
      )}

      {/* Generate section */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Ready to generate</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Will stage {stageableRooms.length} room{stageableRooms.length !== 1 ? "s" : ""}: {stageableRooms.map(r => r.name).join(", ")}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setGenerateMode("preview"); handleGenerate(); }}
            disabled={isGenerating || stageableRooms.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-xl transition-colors"
          >
            {isGenerating && generateMode === "preview" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              <><Zap className="w-4 h-4 text-yellow-400" /> Quick Preview (~3s/room)</>
            )}
          </button>
          <button
            onClick={() => { setGenerateMode("quality"); handleGenerate(); }}
            disabled={isGenerating || stageableRooms.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 text-white text-sm font-medium py-3 rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            {isGenerating && generateMode === "quality" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              <><Star className="w-4 h-4" /> High Quality (~20s/room)</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
