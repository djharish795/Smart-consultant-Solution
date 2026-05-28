import React from "react";
import { UserRound, MailOpen, Shield, BadgeDollarSign, Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single();

  const userEmail = user?.email || "valuer@bank.com";
  const userPlan = profile?.plan || "Starter";
  const userCredits = profile?.credits || 0;
  const planPrice = userPlan === "Professional" ? "₹14,999/mo" : userPlan === "Firm" ? "₹49,999/mo" : "₹4,999/mo";

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 max-w-3xl mx-auto">
      <div className="glass p-10 rounded-[3rem] border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
          <div className="w-32 h-32 bg-white/5 rounded-[2rem] border-2 border-primary/20 flex items-center justify-center shadow-xl">
            <UserRound className="w-12 h-12 text-primary opacity-80" />
          </div>
          
          <div className="space-y-4 text-center md:text-left flex-1">
            <div>
              <h2 className="text-3xl font-serif font-black tracking-tight">{profile?.full_name || "Valuer Professional"}</h2>
              <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mt-1">
                <MailOpen className="w-4 h-4" />
                <span>{userEmail}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] uppercase font-bold tracking-widest text-primary flex items-center gap-1">
                <Shield className="w-3 h-3" /> Authenticated
              </span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-widest text-white/70">
                {userPlan} Plan
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass p-8 rounded-[2rem] border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-bold">Subscription</h3>
            <BadgeDollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-1 pt-2">
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Current Plan</p>
            <p className="text-xl font-bold">{userPlan} <span className="text-sm font-normal text-muted-foreground">{planPrice}</span></p>
          </div>
          <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-primary">Available Credits</p>
              <p className="font-mono font-bold text-lg text-white">{userCredits}</p>
            </div>
            <Crown className="w-5 h-5 text-primary opacity-50" />
          </div>
          <p className="text-xs text-primary pt-2 cursor-pointer hover:underline">Upgrade Plan &rarr;</p>
        </div>

        <div className="glass p-8 rounded-[2rem] border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-bold">Security & Auth</h3>
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-1 pt-2">
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Account ID</p>
            <p className="text-xs font-mono text-muted-foreground truncate" title={user?.id || ""}>{user?.id}</p>
          </div>
          <div className="space-y-1 pt-2">
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Last Login</p>
            <p className="text-sm">{new Date(user?.last_sign_in_at || "").toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
