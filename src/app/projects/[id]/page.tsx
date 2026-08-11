import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import {
  Download, Share2, Sparkles, RefreshCw, CheckCircle,
  XCircle, Clock, Upload, ScanSearch, ImageIcon, AlertTriangle, CreditCard,
} from "lucide-react";
import { RoomPhotoCard } from "@/components/RoomPhotoCard";
import { GlobalStyleBar } from "@/components/GlobalStyleBar";
import { FloorPlanReview } from "@/components/FloorPlanReview";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";
import { GenerationPoller } from "@/components/GenerationPoller";
import { PromptGuidePanel } from "@/components/PromptGuidePanel";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      assets: { orderBy: { createdAt: "asc" } },
      jobs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) notFound();

  const floorplan = project.assets.find((a) => a.type === "floorplan");
  const stagedAssets = project.assets.filter((a) => a.type === "render_staged");

  // Group staged assets by room — only keep latest per room
  const latestByRoom = new Map<string, typeof stagedAssets[0]>();
  for (const asset of stagedAssets) {
    latestByRoom.set(asset.roomName ?? "Room", asset);
  }

  // For history display we still group all versions
  const roomVersionMap = new Map<string, typeof stagedAssets>();
  for (const asset of stagedAssets) {
    const key = asset.roomName ?? "Room";
    if (!roomVersionMap.has(key)) roomVersionMap.set(key, []);
    roomVersionMap.get(key)!.push(asset);
  }
  const rooms = Array.from(roomVersionMap.entries());

  const latestJob = project.jobs[0];
  const isGenerating =
    latestJob?.status === "running" || latestJob?.status === "pending" || project.status === "staging";
  const hasStagedPhotos = stagedAssets.length > 0;

  // ── Determine current step ─────────────────────────────────────────────────
  // Step 1: no floorplan
  // Step 2: floorplan uploaded, not yet generated (analyze + review)
  // Step 3: photos generated
  const currentStep = hasStagedPhotos ? 3 : floorplan ? 2 : 1;

  // Parse existing analysis if available
  let existingAnalysis: { totalSqft: number; rooms: any[] } | null = null;
  if (project.roomStateJson) {
    try {
      const parsed = JSON.parse(project.roomStateJson);
      if (parsed.rooms && Array.isArray(parsed.rooms)) existingAnalysis = parsed;
    } catch {}
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── Header ── */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-zinc-500 hover:text-white text-sm transition-colors">
              ← Dashboard
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">{project.title}</h1>
                <StatusBadge status={project.status} />
              </div>
              {project.designStyle && (
                <p className="text-xs text-zinc-500">{project.designStyle} • {project.roomType}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DeleteProjectButton projectId={id} projectTitle={project.title} />
            <button className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
            {hasStagedPhotos && (
              <button className="flex items-center gap-2 bg-white hover:bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4" />
                Export All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Step indicator ── */}
        <StepIndicator currentStep={currentStep} isGenerating={isGenerating} />

        <div className="flex gap-8 mt-8">
          {/* ── Main content ── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Step 1: No floor plan */}
            {currentStep === 1 && (
              <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-10 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-zinc-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-1">Upload a Floor Plan</h2>
                  <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                    Upload a JPEG or PNG floor plan — with room labels, dimensions, or both.
                    Gemini Vision will read the layout and identify every room.
                  </p>
                </div>
                <Link
                  href={`/projects/${id}/upload`}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Floor Plan
                </Link>
              </div>
            )}

            {/* Step 2: Floor plan review */}
            {currentStep === 2 && !isGenerating && floorplan && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <ScanSearch className="w-5 h-5 text-amber-400" />
                  <h2 className="font-semibold">Review & Confirm Rooms</h2>
                  <span className="text-xs text-zinc-500">Step 2 of 3</span>
                </div>
                <FloorPlanReview
                  projectId={id}
                  floorplanAssetId={floorplan.id}
                  existingAnalysis={existingAnalysis}
                />
              </div>
            )}

            {/* Auto-poller — refreshes page when generation finishes */}
            <GenerationPoller projectId={id} isGenerating={isGenerating} />

            {/* Generating banner */}
            {isGenerating && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-300 mb-1">{project.provider === 'openai' ? 'OpenAI DALL-E 3' : 'fal.ai FLUX'} is staging your rooms…</h3>
                  <p className="text-sm text-blue-400/70">
                    Generating photorealistic photos for each room.
                    This page will refresh automatically when done.
                  </p>
                </div>
              </div>
            )}

            {/* Failed job banner */}
            {latestJob?.status === "failed" && !hasStagedPhotos && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex items-start gap-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-300 mb-1">Generation failed</h3>
                  {latestJob.errorMessage?.includes("Exhausted balance") || latestJob.errorMessage?.includes("balance") ? (
                    <div className="space-y-2">
                      <p className="text-sm text-red-400/80">Your AI provider account has run out of credits.</p>
                      <a
                        href={project.provider === 'openai' ? "https://platform.openai.com/account/billing" : "https://fal.ai/dashboard/billing"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-500/30 mt-1"
                      >
                        <CreditCard className="w-4 h-4" />
                        Top up billing
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-red-400/80">{latestJob.errorMessage ?? "Unknown error. Check Docker logs for details."}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Staged photos */}
            {hasStagedPhotos && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    Staged Rooms ({rooms.length})
                  </h2>
                  {/* Re-generate compact trigger — shows preview/quality inline */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">Regenerate:</span>
                    <RegenerateButtons projectId={id} />
                  </div>
                </div>

                <GlobalStyleBar projectId={id} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {rooms.map(([roomName, assets]) => (
                    <RoomPhotoCard
                      key={roomName}
                      roomName={roomName}
                      assets={assets.map((a) => ({
                        id: a.id,
                        path: a.path,
                        roomName: a.roomName,
                        createdAt: a.createdAt.toISOString(),
                      }))}
                      projectId={id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Job history */}
            {project.jobs.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Generation History</h3>
                <div className="space-y-3">
                  {project.jobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="flex items-center gap-3 text-sm">
                      <JobStatusIcon status={job.status} />
                      <span className="flex-1 capitalize text-zinc-300">{job.type} — <span className="text-zinc-500">{job.provider}</span></span>
                      <span className="text-zinc-500 text-xs">{new Date(job.createdAt).toLocaleTimeString()}</span>
                      <span className={`text-xs font-medium ${
                        job.status === "complete" ? "text-emerald-400" :
                        job.status === "failed" ? "text-red-400" :
                        job.status === "running" ? "text-blue-400" : "text-zinc-500"
                      }`}>{job.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="w-72 flex-shrink-0 space-y-5">
            <PromptGuidePanel />
            
            {/* Floor plan */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Floor Plan</h3>
                {floorplan && (
                  <Link
                    href={`/projects/${id}/upload`}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Replace
                  </Link>
                )}
              </div>
              {floorplan ? (
                <div className="rounded-xl overflow-hidden border border-zinc-700 bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/assets/${floorplan.id}`}
                    alt="Floor plan"
                    className="w-full h-auto object-contain"
                  />
                </div>
              ) : (
                <Link
                  href={`/projects/${id}/upload`}
                  className="flex flex-col items-center gap-2 py-8 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Upload className="w-8 h-8" />
                  <span className="text-sm">Upload floor plan</span>
                </Link>
              )}
            </div>

            {/* Rooms summary */}
            {(existingAnalysis || rooms.length > 0) && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Rooms</h3>
                <div className="space-y-1.5">
                  {(existingAnalysis?.rooms ?? rooms.map(([name]) => ({ name, sqft: 0, features: [] }))).map((room: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{room.name}</span>
                      {room.sqft > 0 && <span className="text-xs text-zinc-500">{room.sqft} sqft</span>}
                    </div>
                  ))}
                </div>
                {existingAnalysis?.totalSqft && (
                  <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between text-sm">
                    <span className="text-zinc-400">Total</span>
                    <span className="font-medium">{existingAnalysis.totalSqft} sqft</span>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Photos generated</span>
                  <span className="font-medium">{stagedAssets.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Rooms staged</span>
                  <span className="font-medium">{rooms.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Analysis</span>
                  <span className="font-medium text-amber-400">Gemini Vision</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Generation</span>
                  <span className="font-medium text-blue-400">
                    {project.provider === 'openai' ? 'OpenAI DALL-E 3' : project.provider === 'gemini' ? 'Gemini Imagen' : 'fal.ai FLUX'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep, isGenerating }: { currentStep: number; isGenerating: boolean }) {
  const steps = [
    { n: 1, label: "Upload Floor Plan", icon: Upload },
    { n: 2, label: "Review Rooms", icon: ScanSearch },
    { n: 3, label: "Staged Photos", icon: ImageIcon },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const isDone = step.n < currentStep;
        const isCurrent = step.n === currentStep;
        const Icon = step.icon;
        return (
          <div key={step.n} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isDone ? "text-emerald-400" :
              isCurrent ? "text-white bg-blue-600/20 border border-blue-500/40" :
              "text-zinc-600"
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isDone ? "bg-emerald-500/20 text-emerald-400" :
                isCurrent ? "bg-blue-500 text-white" :
                "bg-zinc-800 text-zinc-600"
              }`}>
                {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : step.n}
              </div>
              {step.label}
              {isCurrent && isGenerating && (
                <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 mx-1 ${step.n < currentStep ? "bg-emerald-500/30" : "bg-zinc-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RegenerateButtons({ projectId }: { projectId: string }) {
  // This is intentionally a server-rendered placeholder linking to client logic
  // Real buttons are in GenerationTrigger — import it compact
  return (
    <span className="text-zinc-600 text-xs italic">
      Use &quot;Re-analyze&quot; in the floor plan panel to update
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    staging: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    analyzing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    analyzed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    created: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium uppercase tracking-wide ${colors[status] ?? colors.created}`}>
      {status}
    </span>
  );
}

function JobStatusIcon({ status }: { status: string }) {
  if (status === "complete") return <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
  if (status === "running") return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />;
  return <Clock className="w-4 h-4 text-zinc-500 flex-shrink-0" />;
}
