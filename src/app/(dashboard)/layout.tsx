import React from "react";
import Header from "@/components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen p-6 lg:p-12 bg-[#050505] text-white selection:bg-primary/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-900/10 rounded-full blur-[160px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-16">
        <Header />
        
        <div className="animate-in fade-in duration-1000">
          {children}
        </div>

        {/* Footer Credit */}
        <footer className="text-center pt-16 border-t border-white/5 opacity-10 text-[9px] font-black uppercase tracking-[0.5em]">
          Empowered by Claude 4.6 Advanced Intelligence & High-Fidelity Rendering
        </footer>
      </div>
    </main>
  );
}
