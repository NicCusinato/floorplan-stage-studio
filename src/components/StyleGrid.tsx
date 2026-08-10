"use client";

import { DESIGN_STYLE_META, DesignStyle } from "@/lib/staging/types";
import { cn } from "@/lib/utils";

interface StyleGridProps {
  selectedStyle?: DesignStyle;
  onSelect: (style: DesignStyle) => void;
}

export function StyleGrid({ selectedStyle, onSelect }: StyleGridProps) {
  const styles = Object.entries(DESIGN_STYLE_META) as [DesignStyle, typeof DESIGN_STYLE_META[DesignStyle]][];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {styles.map(([key, meta]) => {
        const isSelected = selectedStyle === key;
        
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={cn(
              "flex flex-col text-left p-4 rounded-xl border transition-all h-full",
              isSelected 
                ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500 shadow-[0_0_20px_-5px_rgba(37,99,235,0.3)]" 
                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
            )}
          >
            <div className="text-3xl mb-3">{meta.emoji}</div>
            <div className="font-semibold text-zinc-100 mb-1">{meta.label}</div>
            <div className="text-xs text-zinc-400 leading-relaxed">{meta.description}</div>
          </button>
        );
      })}
    </div>
  );
}
