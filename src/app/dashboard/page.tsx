import prisma from "@/lib/db";
import Link from "next/link";
import { Plus, ArrowRight, Clock, CheckCircle2, AlertCircle, Upload, ScanSearch, ImageIcon } from "lucide-react";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      client: true,
      assets: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  const total = projects.length;
  const complete = projects.filter((p) => p.status === "complete").length;
  const inProgress = projects.filter(
    (p) => p.status === "staging" || p.status === "analyzing"
  ).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Projects</h1>
            <p className="text-zinc-400 text-sm">Manage your virtual staging projects</p>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-5 h-5" />
            New Project
          </Link>
        </div>

        {/* Stats row */}
        {total > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Total Projects</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
              <p className="text-2xl font-bold text-emerald-400">{complete}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Completed</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
              <p className="text-2xl font-bold text-blue-400">{inProgress}</p>
              <p className="text-xs text-zinc-400 mt-0.5">In Progress</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {projects.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-2xl p-16 text-center bg-zinc-900/30">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-xl font-medium mb-2">No projects yet</h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
              Upload a floor plan to begin generating photorealistic staged photos for every room.
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              // Find best thumbnail: prefer staged photo, then floor plan
              const staged = project.assets.find((a) => a.type === "render_staged");
              const floorplan = project.assets.find((a) => a.type === "floorplan");
              const thumbnailId = staged?.id ?? floorplan?.id ?? null;

              // Determine step label
              const hasPhotos = project.assets.some((a) => a.type === "render_staged");
              const hasFloorplan = !!floorplan;
              const stepLabel = hasPhotos ? null : hasFloorplan ? "Step 2: Review Rooms" : "Step 1: Upload Floor Plan";
              const StepIcon = hasPhotos ? null : hasFloorplan ? ScanSearch : Upload;

              return (
                <div key={project.id} className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all hover:shadow-xl hover:-translate-y-0.5">
                  {/* Thumbnail */}
                  <Link href={`/projects/${project.id}`} className="block">
                    <div className="aspect-video bg-zinc-950 flex items-center justify-center border-b border-zinc-800 relative overflow-hidden">
                      {thumbnailId ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/api/assets/${thumbnailId}`}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-zinc-700">
                          <ImageIcon className="w-10 h-10" />
                          <span className="text-xs">No preview</span>
                        </div>
                      )}

                      {/* Step overlay on non-complete projects */}
                      {stepLabel && StepIcon && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5">
                          <StepIcon className="w-7 h-7 text-zinc-300" />
                          <span className="text-xs font-medium text-zinc-200">{stepLabel}</span>
                        </div>
                      )}

                      {/* Status badge */}
                      <div className="absolute top-3 right-3">
                        <StatusBadge status={project.status} />
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-4">
                      <h3 className="font-semibold text-base mb-0.5 group-hover:text-blue-400 transition-colors truncate">
                        {project.title}
                      </h3>
                      {project.client && (
                        <p className="text-xs text-zinc-500 mb-2">{project.client.name}</p>
                      )}
                      <div className="flex items-center justify-between text-sm text-zinc-500 mt-3">
                        <span className="text-xs">{new Date(project.updatedAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1 text-xs group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all">
                          Open <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Delete button — absolute positioned so it doesn't interfere with the Link */}
                  <div className="absolute bottom-4 left-4">
                    <DeleteProjectButton
                      projectId={project.id}
                      projectTitle={project.title}
                      compact
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
        <CheckCircle2 className="w-3 h-3" /> Complete
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
        <AlertCircle className="w-3 h-3" /> Failed
      </span>
    );
  }
  if (status === "staging") {
    return (
      <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
        <Clock className="w-3 h-3" /> Staging
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
      <Clock className="w-3 h-3" /> {status}
    </span>
  );
}
