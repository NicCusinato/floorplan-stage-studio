"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface GenerationPollerProps {
  projectId: string;
  /** Only poll when the project is currently generating */
  isGenerating: boolean;
}

/**
 * Invisible component that polls the project status while generation is in progress.
 * When the job finishes (complete or failed), it does a full router.refresh() to show results.
 */
export function GenerationPoller({ projectId, isGenerating }: GenerationPollerProps) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isGenerating) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/jobs`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const latest = data.jobs?.[0];
        if (!latest) return;

        if (latest.status === "complete" || latest.status === "failed") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          router.refresh();
        }
      } catch {}
    };

    // Poll every 4 seconds
    intervalRef.current = setInterval(poll, 4000);
    poll(); // immediate first check

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isGenerating, projectId, router]);

  return null;
}
