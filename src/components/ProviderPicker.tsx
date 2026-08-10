"use client";

import { ProviderStatus, StagingProvider } from "@/lib/staging/types";
import { cn } from "@/lib/utils";

interface ProviderPickerProps {
  providers: ProviderStatus[];
  selectedProvider: StagingProvider;
  onSelect: (provider: StagingProvider) => void;
}

const PROVIDER_INFO: Record<StagingProvider, { name: string, icon: string, desc: string }> = {
  openai: { name: "GPT-4o Image", icon: "🧠", desc: "Best for high quality full redesigns" },
  gemini: { name: "Gemini Imagen", icon: "✨", desc: "Great quality, supports upscaling" },
  flux: { name: "FLUX (BFL)", icon: "🎨", desc: "Photorealistic, excellent prompt adherence" },
  claude: { name: "Claude 3.5", icon: "👁️", desc: "Analysis only (cannot generate images)" }
};

export function ProviderPicker({ providers, selectedProvider, onSelect }: ProviderPickerProps) {
  // Only show providers that can generate images
  const imageProviders = providers.filter(p => p.capabilities.canGenerate);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {imageProviders.map((p) => {
        const isSelected = selectedProvider === p.provider;
        const info = PROVIDER_INFO[p.provider];
        const costStr = `$${p.capabilities.costPerImage.medium.toFixed(3)}`;

        return (
          <button
            key={p.provider}
            type="button"
            disabled={!p.available}
            onClick={() => onSelect(p.provider)}
            className={cn(
              "flex flex-col text-left p-5 rounded-xl border transition-all h-full relative overflow-hidden",
              isSelected 
                ? "bg-purple-500/10 border-purple-500 ring-1 ring-purple-500" 
                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700",
              !p.available && "opacity-50 grayscale cursor-not-allowed hover:border-zinc-800"
            )}
          >
            {!p.available && (
              <div className="absolute top-2 right-2 text-[10px] font-bold bg-zinc-800 px-2 py-1 rounded text-zinc-400">
                MISSING KEY
              </div>
            )}
            <div className="text-3xl mb-3">{info.icon}</div>
            <div className="font-bold text-zinc-100 mb-1 flex items-center justify-between">
              {info.name}
              <span className="text-xs font-mono bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-zinc-400">
                {costStr}/img
              </span>
            </div>
            <div className="text-sm text-zinc-400">{info.desc}</div>
          </button>
        );
      })}
    </div>
  );
}
