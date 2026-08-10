"use client";

import { useState } from "react";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import { Sliders } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage?: string | null;
  afterImage?: string | null;
  loading?: boolean;
}

export function BeforeAfterSlider({ 
  beforeImage, 
  afterImage, 
  loading = false,
}: BeforeAfterSliderProps) {
  const [sliderMode, setSliderMode] = useState(true);

  const showComparison = beforeImage && afterImage;
  const showBeforeOnly = beforeImage && !afterImage;
  const showAfterOnly = afterImage && !beforeImage;

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-white/90 text-sm font-medium animate-pulse">AI Staging in progress...</p>
          </div>
        </div>
      )}

      {showComparison && (
        <>
          {sliderMode ? (
            <div className="w-full h-full flex items-center justify-center">
              <ReactCompareSlider
                itemOne={
                  <ReactCompareSliderImage
                    src={beforeImage!}
                    alt="Before"
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  />
                }
                itemTwo={
                  <ReactCompareSliderImage
                    src={afterImage!}
                    alt="After"
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  />
                }
                style={{
                  width: "100%",
                  height: "100%",
                }}
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="flex w-full h-full">
              <div className="flex-1 border-r border-zinc-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={beforeImage!} alt="Before" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={afterImage!} alt="After" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <div className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded font-medium text-sm border border-white/10">
            Base Render
          </div>
          <div className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-md text-blue-400 px-3 py-1 rounded font-medium text-sm border border-blue-500/30">
            AI Staged
          </div>

          <button
            onClick={() => setSliderMode(!sliderMode)}
            className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 px-3 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-2 transition-colors z-30 border border-white/10 shadow-xl"
            title={sliderMode ? "Switch to Split View" : "Switch to Slider View"}
          >
            <Sliders className="w-4 h-4" />
            <span>{sliderMode ? "Split View" : "Slider View"}</span>
          </button>
        </>
      )}

      {showBeforeOnly && (
        <div className="relative w-full h-full flex">
          <div className="flex-1 border-r border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={beforeImage!} alt="Before" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 flex items-center justify-center bg-zinc-900/50">
            <p className="text-zinc-500 text-sm">Awaiting AI Staging...</p>
          </div>
          <div className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded font-medium text-sm">
            Base Render
          </div>
        </div>
      )}
    </div>
  );
}
