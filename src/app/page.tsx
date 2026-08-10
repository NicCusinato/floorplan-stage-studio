import Link from "next/link";
import { ArrowRight, Box, Image as ImageIcon, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto">
      
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-8 border border-blue-500/20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        Multi-Provider Engine v2.0
      </div>

      <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
        Virtual Staging, <br /> Done Right.
      </h1>
      
      <p className="text-xl text-zinc-400 mb-12 max-w-2xl">
        Transform 2D builder floor plans into photorealistic 3D staged interiors.
        Powered by your choice of GPT-4o, Gemini, or FLUX.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-20">
        <Link 
          href="/projects/new" 
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
        >
          Start New Project
          <ArrowRight className="w-5 h-5" />
        </Link>
        <Link 
          href="/dashboard" 
          className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-xl font-medium transition-all"
        >
          View Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-left">
        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
          <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4 border border-blue-500/20">
            <Box className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-zinc-100">Floorplan to 3D</h3>
          <p className="text-zinc-400 text-sm">Automatically extrude 2D floor plans into 3D Blender geometry with accurate walls and windows.</p>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
          <div className="bg-purple-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4 border border-purple-500/20">
            <ImageIcon className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-zinc-100">Multi-Provider AI</h3>
          <p className="text-zinc-400 text-sm">Swap between GPT, Gemini, and FLUX depending on your quality needs and API budget.</p>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
          <div className="bg-emerald-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4 border border-emerald-500/20">
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-zinc-100">Smart Analysis</h3>
          <p className="text-zinc-400 text-sm">Claude analyzes the room to build the perfect prompt for the staging engine automatically.</p>
        </div>
      </div>
    </div>
  );
}
