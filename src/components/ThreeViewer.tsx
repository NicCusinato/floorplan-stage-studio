"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Stage } from "@react-three/drei";
import { Loader2 } from "lucide-react";

interface ThreeViewerProps {
  url: string;
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export function ThreeViewer({ url }: ThreeViewerProps) {
  return (
    <div className="w-full h-[500px] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 relative">
      <Suspense fallback={
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Loading 3D Geometry...</p>
        </div>
      }>
        <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
          <color attach="background" args={["#18181b"]} />
          <Stage environment="city" intensity={0.5}>
            <Model url={url} />
          </Stage>
          <OrbitControls makeDefault />
        </Canvas>
      </Suspense>
    </div>
  );
}
