import React from "react";
import { Archive, Clock3, MapPinned } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import DownloadButton from "@/components/DownloadButton";

export default async function ArchivePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: archives } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-4xl font-serif font-black tracking-tighter italic">Report Archive</h2>
          <p className="text-muted-foreground">Access previously generated digital twins and financial extractions.</p>
        </div>
        <div className="text-[10px] uppercase font-black tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
          {archives?.length || 0} Reports Total
        </div>
      </div>

      <div className="grid gap-4">
        {archives && archives.length > 0 ? (
          archives.map((item) => (
            <div key={item.id} className="glass p-6 rounded-2xl border-white/5 hover:border-primary/30 transition-all flex flex-col md:flex-row items-center justify-between gap-6 group">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Archive className="w-5 h-5 text-white/50 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{item.owner_name}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><MapPinned className="w-3 h-3" /> {item.location || "N/A"}</span>
                    <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" /> {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">Valuation</p>
                  <p className="font-mono font-bold text-lg text-primary">{item.valuation_sum || "N/A"}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">Status</p>
                  <p className={`text-xs font-bold uppercase tracking-wider ${item.status === 'Verified' ? 'text-amber-400' : 'text-yellow-400'}`}>{item.status}</p>
                </div>
                <DownloadButton 
                  data={item.data} 
                  template={item.template} 
                  surveyNumber={item.data?.surveyNumber} 
                />
              </div>
            </div>
          ))
        ) : (
          <div className="glass p-12 rounded-[3rem] border-white/5 flex flex-col items-center justify-center min-h-[40vh] text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <Archive className="w-10 h-10 text-primary opacity-80" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">No Archives Found</h3>
              <p className="text-muted-foreground">Your recent valuation reports will automatically appear here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
