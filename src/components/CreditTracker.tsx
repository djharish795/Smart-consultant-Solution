"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Coins } from "lucide-react";

const ANTHROPIC_BUDGET = 10.00; // Total Anthropic Balance in USD
const FALLBACK_COST_PER_DOC = 0.03; // Estimated cost for Claude 4.6 Sonnet extraction

export default function CreditTracker() {
  const [stats, setStats] = useState<{ spent: number, count: number } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let subscription: any = null;
    let isMounted = true;

    const fetchUsage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: reports } = await supabase
        .from('reports')
        .select('data')
        .eq('user_id', user.id);

      if (!isMounted) return;

      let totalCost = 0;
      let count = 0;
      if (reports) {
        count = reports.length;
        totalCost = reports.reduce((sum, r) => {
          return sum + (r.data?._billing?.cost || 0);
        }, 0);
      }
      setStats({ spent: totalCost, count });

      if (subscription) {
        supabase.removeChannel(subscription);
      }

      subscription = supabase
        .channel('public:reports')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reports', filter: `user_id=eq.${user.id}` },
          () => {
            fetchUsage();
          }
        )
        .subscribe();
    };

    fetchUsage();

    const handleCreditsUpdate = () => {
      fetchUsage();
    };

    window.addEventListener("creditsUpdated", handleCreditsUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("creditsUpdated", handleCreditsUpdate);
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [supabase]);

  if (!stats) return null;

  const { spent, count } = stats;
  const remaining = Math.max(0, ANTHROPIC_BUDGET - spent);
  const percentage = Math.max(0, Math.min(100, (spent / ANTHROPIC_BUDGET) * 100));
  
  // Calculate real average cost if we have valid billing data, else fallback to estimate
  const realAvgCost = (count > 0 && spent > 0) ? (spent / count) : FALLBACK_COST_PER_DOC;
  const docsLeft = Math.floor(remaining / realAvgCost);

  return (
    <div className="flex flex-col gap-1.5 px-4 hidden lg:flex min-w-[220px]">
      <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-white/50">
        <span className="flex items-center gap-1.5" title={`Balance: $${remaining.toFixed(2)}`}><Coins className="w-3.5 h-3.5 text-primary" /> Anthropic Wallet</span>
        <span className="text-white/90">~{docsLeft} Docs Left</span>
      </div>
      <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10 relative" title={`Spent: $${spent.toFixed(4)} / $${ANTHROPIC_BUDGET.toFixed(2)}`}>
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-1000 ease-out glow-primary"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-[8px] uppercase font-black tracking-widest text-white/40">
        <span>${spent.toFixed(2)} Used</span>
        <span>${ANTHROPIC_BUDGET.toFixed(2)} Limit</span>
      </div>
    </div>
  );
}
