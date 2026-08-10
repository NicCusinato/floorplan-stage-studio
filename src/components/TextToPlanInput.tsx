"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function TextToPlanInput({ projectId }: { projectId: string }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSend = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error("Failed to execute staging");
      }

      setPrompt("");
      // Force a hard refresh or router.refresh to pull the new Photo from the server cache
      router.refresh(); 
    } catch (error) {
      console.error(error);
      alert("Error processing text-to-plan command.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
      <input 
        type="text" 
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        disabled={loading}
        placeholder={loading ? "AI is restaging your room..." : "Ask AI to change colors, move furniture, or redesign..."} 
        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <button 
        onClick={handleSend}
        disabled={loading || !prompt.trim()}
        className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 p-3 rounded-lg text-white transition-colors flex items-center justify-center"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
      </button>
    </div>
  );
}
