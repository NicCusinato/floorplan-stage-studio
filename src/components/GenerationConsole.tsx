"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Terminal, CheckCircle2, XCircle } from "lucide-react";

interface GenerationConsoleProps {
  projectId: string;
  initialStatus?: string;
  onComplete?: () => void;
}

export function GenerationConsole({ projectId, initialStatus, onComplete }: GenerationConsoleProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus || "idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const startGeneration = async () => {
    setIsGenerating(true);
    setStatus("pending");
    setLogs(["Initializing Gemini Vision model...", "Analyzing floorplan image..."]);
    
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error);
      }
      
      // Start polling for logs and status
      const interval = setInterval(async () => {
        const statusRes = await fetch(`/api/projects/${projectId}/jobs`);
        const statusData = await statusRes.json();
        
        if (statusData.jobs && statusData.jobs.length > 0) {
          const job = statusData.jobs[0];
          setStatus(job.status);
          
          if (job.status === "complete") {
            clearInterval(interval);
            setLogs(prev => [...prev, "Generation complete! Rendering AI Staged Photo..."]);
            setIsGenerating(false);
            if (onComplete) onComplete();
            else router.refresh();
          } else if (job.status === "failed") {
            clearInterval(interval);
            setLogs(prev => [...prev, `ERROR: ${job.errorMessage}`]);
            setIsGenerating(false);
          } else if (job.status === "running") {
             // Just add a dummy log to show progress
             setLogs(prev => {
                const msgs = ["Extracting room dimensions...", "Writing Blender Python script...", "Building 3D geometry...", "Rendering Depth Map...", "Running Replicate ControlNet..."];
                const msg = msgs[Math.floor(Math.random() * msgs.length)];
                // Avoid spamming too much
                if (prev.length < 15 && !prev.includes(msg)) return [...prev, msg];
                return prev;
             });
          }
        }
      }, 2000);
      
    } catch (err: any) {
      setStatus("failed");
      setLogs(prev => [...prev, `Failed to start: ${err.message}`]);
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-400 font-mono text-sm">
          <Terminal className="w-4 h-4" />
          Developer Console
        </div>
        <div>
          {(status === "idle" || status === "failed") && (
            <button 
              onClick={startGeneration}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              Generate AI Staged Room
            </button>
          )}
          {status === "pending" || status === "running" ? (
            <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </div>
          ) : null}
          {status === "complete" && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Complete
            </div>
          )}
          {status === "failed" && (
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
              <XCircle className="w-4 h-4" />
              Failed
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 font-mono text-xs text-zinc-300 h-48 overflow-y-auto bg-[#0c0c0c]">
        {logs.length === 0 ? (
          <div className="text-zinc-600 italic">Awaiting manual trigger...</div>
        ) : (
          <div className="space-y-1.5">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-zinc-600 shrink-0">{`[${new Date().toLocaleTimeString()}]`}</span>
                <span className={log.startsWith("ERROR") ? "text-red-400" : "text-emerald-400/90"}>
                  {log}
                </span>
              </div>
            ))}
            {(status === "running" || status === "pending") && (
              <div className="flex gap-3 animate-pulse">
                <span className="text-zinc-600 shrink-0">{`[${new Date().toLocaleTimeString()}]`}</span>
                <span className="text-zinc-500">_</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
