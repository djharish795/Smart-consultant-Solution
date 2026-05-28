import React from "react";
import { BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function PricingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user?.id).single();
  
  const userPlan = profile?.plan || "Starter";

  const plans = [
    {
      name: "Starter",
      price: "₹4,999",
      period: "/month",
      desc: "For independent valuers with lighter loads.",
      features: ["50 Reports per month", "Standard Templates", "Basic Data Extraction", "Email Support"],
      cta: userPlan === "Starter" ? "Current Plan" : "Downgrade",
      active: userPlan === "Starter"
    },
    {
      name: "Professional",
      price: "₹14,999",
      period: "/month",
      desc: "Ideal for high-volume valuators.",
      features: ["250 Reports per month", "Custom Bank Templates", "High-Fidelity Twin Gen", "Priority Support", "Cost: ~₹60/report"],
      cta: userPlan === "Professional" ? "Current Plan" : "Upgrade to Pro",
      active: userPlan === "Professional"
    },
    {
      name: "Firm",
      price: "₹49,999",
      period: "/month",
      desc: "For large scale valuation agencies.",
      features: ["1,000 Reports per month", "White-label Output", "Team Access (5 Seats)", "Dedicated Success Manager"],
      cta: userPlan === "Firm" ? "Current Plan" : "Contact Sales",
      active: userPlan === "Firm"
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-serif font-black tracking-tighter leading-tight italic">Intelligence Pricing</h2>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
          Scale your valuation firm with high-fidelity automated reporting.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto pt-8">
        {plans.map((plan) => (
          <div key={plan.name} className={`glass p-8 rounded-[2rem] flex flex-col relative overflow-hidden transition-all duration-500 hover:-translate-y-2 ${plan.active ? 'border-primary/50 shadow-2xl shadow-primary/20' : 'border-white/5'}`}>
            {plan.active && <div className="absolute top-0 left-0 w-full h-1 bg-primary" />}
            
            <div className="mb-8">
              <h3 className="text-xl font-black uppercase tracking-widest mb-2">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.desc}</p>
            </div>
            
            <div className="mb-8">
              <span className="text-4xl font-bold font-mono tracking-tighter">{plan.price}</span>
              <span className="text-muted-foreground">{plan.period}</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${plan.active ? 'bg-primary/20 text-primary' : 'bg-white/10'}`}>
                    <BadgeCheck className="w-3 h-3" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            
            <button className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-colors ${plan.active ? 'bg-primary text-white hover:bg-amber-500' : 'bg-white/5 hover:bg-white/10'}`}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
