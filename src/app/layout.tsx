import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Home, Settings, FolderPlus } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FloorPlan Stage Studio",
  description: "Multi-provider AI virtual staging and 3D floor plan conversion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-50 min-h-screen flex flex-col`}>
        <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <span className="text-blue-500">FloorPlan</span>
              <span className="text-zinc-300">StageStudio</span>
            </Link>
            
            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                <Home className="w-4 h-4" />
                Dashboard
              </Link>
              <Link href="/projects/new" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                <FolderPlus className="w-4 h-4" />
                New Project
              </Link>
              <Link href="/settings" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </nav>
          </div>
        </header>
        
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
