"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Settings() {
  const [keys, setKeys] = useState({
    openai: "",
    gemini: "",
    flux: "",
    anthropic: "",
  });

  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // In a real app we'd fetch the masked keys from the server API, 
  // but for local dev this just gives instructions.
  
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">API Settings</h1>
      <p className="text-zinc-400 mb-8">Manage your API keys for the different staging providers.</p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm">
          <strong>Local Development Note:</strong> Because this is a local desktop app, please edit your <code>.env</code> file directly in the project root to set these keys. Do not commit them to version control.
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">OpenAI API Key (GPT-4o)</label>
            <input 
              type="password" 
              disabled 
              placeholder="sk-proj-..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-500"
            />
            <p className="text-xs text-zinc-500 mt-1">Used for high-end redesigns and inpainting.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Google Gemini API Key</label>
            <input 
              type="password" 
              disabled 
              placeholder="AIzaSy..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-500"
            />
            <p className="text-xs text-zinc-500 mt-1">Used for fast, cost-effective generation and upscaling.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">FLUX BFL API Key</label>
            <input 
              type="password" 
              disabled 
              placeholder="bfl_..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-500"
            />
            <p className="text-xs text-zinc-500 mt-1">Used for ultra-photorealistic generations.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Anthropic API Key (Claude)</label>
            <input 
              type="password" 
              disabled 
              placeholder="sk-ant-..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-500"
            />
            <p className="text-xs text-zinc-500 mt-1">Used for intelligent room analysis and prompt construction.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
