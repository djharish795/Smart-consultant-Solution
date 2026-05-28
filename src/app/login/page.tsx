import React from "react";
import { Bot, MoveRight } from "lucide-react";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <main className="min-h-screen p-6 flex flex-col items-center justify-center bg-[#050505] text-white selection:bg-primary/30 relative">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-900/10 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass p-10 rounded-[3rem] border-white/5 space-y-8 text-center shadow-2xl">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-primary rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-primary/40 glow-primary animate-float">
              <Bot className="text-white w-10 h-10" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-serif font-black tracking-tight leading-none italic">Valuation<span className="text-primary not-italic">Studio</span></h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-black opacity-60 mt-2">Secure Access Gateway</p>
          </div>

          <form action={login} className="space-y-6 text-left mt-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-primary ml-2">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  required
                  defaultValue="valuer@bank.com"
                  className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 outline-none focus:border-primary focus:bg-primary/5 transition-all text-sm font-medium"
                  placeholder="Enter your professional email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-primary ml-2">Secure Password</label>
                <input 
                  type="password" 
                  name="password"
                  required
                  defaultValue="password"
                  className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 outline-none focus:border-primary focus:bg-primary/5 transition-all text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-5 bg-primary text-white rounded-2xl font-black text-sm tracking-widest uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 mt-4"
            >
              Authenticate Identity
              <MoveRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-40 pt-4">
            Authorized Personnel Only
          </p>
        </div>
      </div>
    </main>
  );
}
