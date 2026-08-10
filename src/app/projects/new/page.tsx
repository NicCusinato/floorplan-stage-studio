"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProviderStatus, StagingProvider, DesignStyle } from "@/lib/staging/types";
import { ProviderPicker } from "@/components/ProviderPicker";
import { StyleGrid } from "@/components/StyleGrid";
import { ArrowRight, Image as ImageIcon, Check, Loader2 } from "lucide-react";

export default function NewProject() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [designStyle, setDesignStyle] = useState<DesignStyle>("MODERN");
  const [provider, setProvider] = useState<StagingProvider>("gemini");
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/providers")
      .then(res => res.json())
      .then(data => {
        setProviders(data.providers);
        setProvider(data.defaultProvider);
      });
  }, []);

  const handleNext = () => {
    if (step === 1 && !title) return;
    if (step === 2 && !file) return;
    if (step < 3) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!title || !file) return;
    setIsSubmitting(true);
    
    try {
      // 1. Create project
      const projRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, designStyle }),
      });
      const project = await projRes.json();
      
      // 2. Upload file
      const formData = new FormData();
      formData.append("file", file);
      
      await fetch(`/api/projects/${project.id}/upload`, {
        method: "POST",
        body: formData,
      });

      // Navigate to project page where conversion/staging will be triggered
      router.push(`/projects/${project.id}`);
      
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">New Staging Project</h1>
        <p className="text-zinc-400">Configure your project and select AI staging preferences.</p>
      </div>

      <div className="flex gap-4 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-zinc-800'}`} />
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-semibold">Project Details</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Project Title</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 123 Main St - Master Bedroom"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-semibold">Upload Floor Plan</h2>
            <p className="text-zinc-400 text-sm">Upload a 2D builder floor plan image. It will be extruded to 3D geometry automatically.</p>
            
            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-12 text-center hover:bg-zinc-800/50 transition-colors">
              <input 
                type="file" 
                id="file-upload"
                className="hidden" 
                accept="image/*"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <ImageIcon className="w-12 h-12 text-zinc-500 mb-4" />
                {file ? (
                  <span className="text-blue-400 font-medium">{file.name}</span>
                ) : (
                  <>
                    <span className="text-zinc-300 font-medium mb-1">Click to browse or drag image here</span>
                    <span className="text-zinc-500 text-sm">PNG, JPG up to 10MB</span>
                  </>
                )}
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Design Style</h2>
              <StyleGrid selectedStyle={designStyle} onSelect={setDesignStyle} />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Select AI Provider</h2>
              <ProviderPicker 
                providers={providers} 
                selectedProvider={provider} 
                onSelect={setProvider} 
              />
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-zinc-800">
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="px-6 py-2 rounded-lg font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Back
            </button>
          )}
          
          {step < 3 ? (
            <button 
              onClick={handleNext}
              disabled={step === 1 && !title || step === 2 && !file}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-8 py-2 rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
