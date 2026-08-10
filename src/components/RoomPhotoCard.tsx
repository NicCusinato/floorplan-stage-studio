"use client";

import { useState, useRef } from "react";
import { Sparkles, ChevronRight, ChevronLeft, Download, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";

const STYLE_PRESETS = [
  { label: "Modern", prompt: "modern minimalist style, clean lines, neutral tones, contemporary furniture" },
  { label: "Scandinavian", prompt: "scandinavian style, light wood, white walls, cozy textiles, hygge aesthetic" },
  { label: "Japandi", prompt: "japandi style, japanese-scandinavian fusion, wabi-sabi, natural materials, zen minimalism" },
  { label: "Industrial", prompt: "industrial style, exposed brick, metal accents, dark tones, Edison bulbs" },
  { label: "Luxury", prompt: "luxury style, high-end finishes, gold accents, rich fabrics, designer furniture" },
  { label: "Coastal", prompt: "coastal style, light blues and whites, natural textures, beach inspired, airy and bright" },
  { label: "Bohemian", prompt: "bohemian style, eclectic patterns, rich colors, layered textiles, artistic decor" },
];

const OBJECT_PRESETS = [
  { label: "Replace armchair with desk", prompt: "Replace the armchair with a modern wooden study desk and chair" },
  { label: "Remove plant", prompt: "Remove the potted plant from the table and leave the surface empty" },
  { label: "Add pendant light", prompt: "Add a modern hanging pendant light fixture hanging from the ceiling" },
  { label: "Swap rug", prompt: "Replace the floor rug with a neutral textured jute area rug" },
  { label: "Remove clutter", prompt: "Remove all decorative items and clutter from the countertops and tables" },
];

interface Asset {
  id: string;
  path: string;
  roomName: string | null;
  createdAt: string;
}

interface RoomPhotoCardProps {
  roomName: string;
  assets: Asset[];
  projectId: string;
}

export function RoomPhotoCard({ roomName, assets, projectId }: RoomPhotoCardProps) {
  const [currentIdx, setCurrentIdx] = useState(assets.length - 1); // show latest
  const [prompt, setPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<"none" | "style" | "object" | "angle">("none");
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushSize, setBrushSize] = useState(25);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const router = useRouter();

  const currentAsset = assets[currentIdx];

  const exportMaskDataUrl = (): string | undefined => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawingMode) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let hasDrawnPixels = false;
    for (let i = 3; i < imgData.data.length; i += 4) {
      if (imgData.data[i] > 10) {
        hasDrawnPixels = true;
        break;
      }
    }
    if (!hasDrawnPixels) return undefined;

    const off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    const offCtx = off.getContext("2d");
    if (!offCtx) return undefined;

    offCtx.fillStyle = "#000000";
    offCtx.fillRect(0, 0, off.width, off.height);

    const offData = offCtx.getImageData(0, 0, off.width, off.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      if (imgData.data[i + 3] > 10) {
        offData.data[i] = 255;
        offData.data[i + 1] = 255;
        offData.data[i + 2] = 255;
        offData.data[i + 3] = 255;
      }
    }
    offCtx.putImageData(offData, 0, 0);
    return off.toDataURL("image/png");
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255, 180, 0, 0.75)";
    ctx.lineWidth = brushSize;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleRestyle = async (mode: "style" | "object") => {
    if (!prompt.trim() || isEditing) return;
    setIsEditing(true);
    try {
      const maskDataUrl = mode === "object" ? exportMaskDataUrl() : undefined;
      const res = await fetch(`/api/projects/${projectId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, roomName, editMode: mode, maskDataUrl }),
      });
      if (res.ok) {
        setPrompt("");
        setEditTab("none");
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "Failed to edit"}`);
      }
    } catch {
      alert("Network error — please try again");
    } finally {
      setIsEditing(false);
    }
  };

  const handleAngleChange = async (angleName: string) => {
    if (isEditing) return;
    setIsEditing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, isAngleChange: true, angleName }),
      });
      if (res.ok) {
        setEditTab("none");
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "Failed to generate new angle"}`);
      }
    } catch {
      alert("Network error — please try again");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDownload = () => {
    if (!currentAsset) return;
    const a = document.createElement("a");
    a.href = `/api/assets/${currentAsset.id}`;
    a.download = `${roomName.toLowerCase()}_staged.jpg`;
    a.click();
  };

  return (
    <div className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-300">
      {/* Room Label Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm tracking-wide">{roomName}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Version counter */}
          {assets.length > 1 && (
            <span className="text-xs text-zinc-500">v{currentIdx + 1}/{assets.length}</span>
          )}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setEditTab(editTab === "angle" ? "none" : "angle")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              editTab === "angle"
                ? "bg-purple-600 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            Angles
          </button>
          <button
            onClick={() => setEditTab(editTab === "style" ? "none" : "style")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              editTab === "style"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            🎨 Style Makeover
          </button>
          <button
            onClick={() => setEditTab(editTab === "object" ? "none" : "object")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              editTab === "object"
                ? "bg-amber-600 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            🖌️ Edit Object
          </button>
        </div>
      </div>

        {/* Photo */}
      <div className="relative aspect-video bg-zinc-950">
        {currentAsset ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/assets/${currentAsset.id}`}
            alt={`${roomName} staged`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        {/* Drawing canvas overlay for Masked Inpainting */}
        {editTab === "object" && isDrawingMode && (
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
            className="absolute inset-0 w-full h-full cursor-crosshair z-10 touch-none border-2 border-amber-500/60"
          />
        )}

        {/* Version nav arrows */}
        {assets.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentIdx((i) => Math.min(assets.length - 1, i + 1))}
              disabled={currentIdx === assets.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white disabled:opacity-30 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Loading overlay */}
        {isEditing && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm text-blue-300">AI is restyling {roomName.toLowerCase()}…</p>
          </div>
        )}
      </div>

      {/* Style Makeover Panel */}
      {editTab === "style" && (
        <div className="p-4 border-t border-zinc-800 space-y-3">
          <p className="text-xs text-blue-400 font-medium">Global Style Makeover — Transforms all furniture textiles, rugs, wood tones, and lighting.</p>
          <div className="flex flex-wrap gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setPrompt(preset.prompt)}
                className="px-2.5 py-1 text-xs rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-600"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRestyle("style")}
              disabled={isEditing}
              placeholder={`e.g. "bohemian aesthetic with warm rattan and earthy tones"`}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={() => handleRestyle("style")}
              disabled={isEditing || !prompt.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 rounded-lg text-white transition-colors"
            >
              {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Targeted Object Edit Panel */}
      {editTab === "object" && (
        <div className="p-4 border-t border-zinc-800 space-y-3">
          <p className="text-xs text-amber-400 font-medium">Targeted Object Edit — Replaces, removes, or adds specific items without touching the rest of the room.</p>
          <div className="flex items-center justify-between bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDrawingMode(!isDrawingMode)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  isDrawingMode
                    ? "bg-amber-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                🎨 {isDrawingMode ? "Smart Erase Brush: ON" : "Smart Erase Brush: OFF"}
              </button>
              {isDrawingMode && (
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-2.5 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                >
                  Clear Mask
                </button>
              )}
            </div>
            {isDrawingMode && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>Brush:</span>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-20 accent-amber-500"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {OBJECT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setPrompt(preset.prompt)}
                className="px-2.5 py-1 text-xs rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-600"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRestyle("object")}
              disabled={isEditing}
              placeholder={`e.g. "replace the armchair with a wooden study desk"`}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            />
            <button
              onClick={() => handleRestyle("object")}
              disabled={isEditing || !prompt.trim()}
              className="p-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/40 rounded-lg text-white transition-colors"
            >
              {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Angle Edit Panel */}
      {editTab === "angle" && (
        <div className="p-4 border-t border-zinc-800 space-y-3">
          <p className="text-xs text-zinc-400">Select a new perspective. AI will maintain the current furniture and layout.</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "doorway", label: "Doorway (Wide)" },
              { id: "window", label: "Window (Looking in)" },
              { id: "corner", label: "Corner Shot" },
              { id: "top-down", label: "Top-Down" }
            ].map((angle) => (
              <button
                key={angle.id}
                onClick={() => handleAngleChange(angle.id)}
                disabled={isEditing}
                className="px-3 py-1.5 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-600 disabled:opacity-50"
              >
                {angle.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
