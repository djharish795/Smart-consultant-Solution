import React from "react";
import { SaveAll, LockKeyhole, SlidersHorizontal } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-12 animate-in fade-in duration-1000 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-4xl font-serif font-black tracking-tighter italic">System Preferences</h2>
        <p className="text-muted-foreground">Configure intelligence layer defaults and UI parameters.</p>
      </div>

      <div className="grid gap-8">
        {/* Intelligence Settings */}
        <div className="glass p-8 rounded-[2rem] border-white/5 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <LockKeyhole className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Intelligence Providers</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Anthropic API Key</label>
              <input type="password" value="sk-ant-api03-xxxxxxxxxxxxxxxx" disabled className="w-full bg-white/5 p-4 rounded-xl border border-white/5 text-sm font-mono opacity-50" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Default Claude Model</label>
              <select className="w-full bg-white/5 p-4 rounded-xl border border-white/5 text-sm appearance-none outline-none focus:border-primary">
                <option>claude-sonnet-4-6</option>
                <option>claude-opus-3</option>
              </select>
            </div>
          </div>
        </div>

        {/* Financial Defaults */}
        <div className="glass p-8 rounded-[2rem] border-white/5 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Smart Consultants Defaults</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Default Distress Margin (%)</label>
              <input type="number" defaultValue="15" className="w-full bg-white/5 p-4 rounded-xl border border-white/5 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Depreciation per year (%)</label>
              <input type="number" defaultValue="1.5" className="w-full bg-white/5 p-4 rounded-xl border border-white/5 text-sm outline-none focus:border-primary" />
            </div>
          </div>
        </div>

        <button className="w-full md:w-auto px-8 py-4 bg-primary text-white rounded-xl font-black text-sm tracking-widest uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3">
          <SaveAll className="w-4 h-4" />
          Save Preferences
        </button>
      </div>
    </div>
  );
}
