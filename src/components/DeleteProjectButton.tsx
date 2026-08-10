"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface DeleteProjectButtonProps {
  projectId: string;
  projectTitle: string;
  /** If true renders a small icon-only button for dashboard cards */
  compact?: boolean;
}

export function DeleteProjectButton({ projectId, projectTitle, compact = false }: DeleteProjectButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Delete failed: ${data.error}`);
        setIsDeleting(false);
        setShowConfirm(false);
      }
    } catch {
      alert("Network error while deleting");
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();  // prevent Link navigation on dashboard cards
          e.stopPropagation();
          setShowConfirm(true);
        }}
        className={
          compact
            ? "p-1.5 rounded-lg bg-zinc-800/80 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors border border-zinc-700 hover:border-red-500/30"
            : "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors border border-zinc-700 hover:border-red-500/30 text-sm"
        }
        title="Delete project"
      >
        <Trash2 className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        {!compact && "Delete"}
      </button>

      {/* Confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !isDeleting && setShowConfirm(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Delete project?</h3>
                <p className="text-xs text-zinc-400 mt-0.5">This cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-zinc-400 mb-6">
              <span className="font-medium text-zinc-300">&ldquo;{projectTitle}&rdquo;</span> and all its staged photos, floor plans, and generation history will be permanently deleted.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
