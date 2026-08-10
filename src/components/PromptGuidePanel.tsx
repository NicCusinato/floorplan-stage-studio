"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Check, X } from "lucide-react";

export function PromptGuidePanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Prompting Guide
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 pt-0 text-sm border-t border-zinc-800 bg-zinc-900/50 space-y-5 mt-2">
          
          {/* Style Makeover Section */}
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-400">🎨 Style Makeover</h4>
            <p className="text-xs text-zinc-400">
              Uses FLUX Dev Image-to-Image (medium strength 0.65) to transform overall interior aesthetic, upholstery, rugs, wood tones, and lighting across the entire room while preserving architectural walls and windows.
            </p>
            <ul className="text-xs space-y-1">
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300"><b>Do:</b> Choose cohesive design styles (e.g., "Bohemian aesthetic with warm rattan", "Japandi minimalist interior").</span>
              </li>
              <li className="flex items-start gap-1.5">
                <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300"><b>Don't:</b> Try to remove individual small items here — use Edit Object instead!</span>
              </li>
            </ul>
          </div>

          {/* Edit Object Section */}
          <div className="space-y-2">
            <h4 className="font-semibold text-amber-400">🖌️ Edit Object</h4>
            <p className="text-xs text-zinc-400">
              Uses FLUX Dev Image-to-Image (high strength 0.82) with background-freeze instructions to replace, remove, or add a specific item while leaving the surrounding room untouched.
            </p>
            <ul className="text-xs space-y-1">
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300"><b>Do:</b> Name the specific item to change (e.g., "Replace armchair with wooden study desk", "Remove potted plant from table").</span>
              </li>
              <li className="flex items-start gap-1.5">
                <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300"><b>Don't:</b> Include whole-room style descriptions here, or the entire room aesthetic may change.</span>
              </li>
            </ul>
          </div>

          {/* Angles Section */}
          <div className="space-y-2">
            <h4 className="font-semibold text-purple-400">Changing Angles</h4>
            <p className="text-xs text-zinc-400">
              Uses a parametric 3D model to shift perspective.
            </p>
            <ul className="text-xs space-y-1">
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300"><b>Do:</b> Just click the desired angle! It uses math, not text, to rotate the camera.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300"><b>Don't:</b> Expect layout changes. This feature perfectly preserves the existing furniture and only shifts the view.</span>
              </li>
            </ul>
          </div>

          {/* Initial Generation Section */}
          <div className="space-y-2">
            <h4 className="font-semibold text-amber-400">Initial Generation</h4>
            <p className="text-xs text-zinc-400">
              Uses FLUX Pro to construct the room entirely from scratch based on the floorplan.
            </p>
            <ul className="text-xs space-y-1">
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300"><b>Do:</b> Specify overall interior styles (e.g., "Mid-Century Modern") and dominant colors.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300"><b>Don't:</b> Try to dictate exact coordinate placement of furniture (e.g., "couch exactly 2 feet from left wall").</span>
              </li>
            </ul>
          </div>

        </div>
      )}
    </div>
  );
}
