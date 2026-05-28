"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Power, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/login/actions";
import CreditTracker from "@/components/CreditTracker";

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { name: "Intelligence", path: "/" },
    { name: "Archive", path: "/archive" },
    { name: "Pricing", path: "/pricing" },
    { name: "Settings", path: "/settings" },
  ];

  return (
    <header className="flex justify-between items-center glass p-8 rounded-[2.5rem] border-white/5">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-primary rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-primary/40 glow-primary">
          <Compass className="text-white w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-black tracking-tight leading-none">Smart Consultants<span className="text-primary italic">Ai</span></h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-black opacity-40 mt-1">Intelligence Layer 4.6</p>
        </div>
      </div>
      <div className="flex items-center gap-10">
        <nav className="hidden lg:flex gap-10">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.name} 
                href={item.path}
                className={cn(
                  "text-[10px] uppercase font-black tracking-widest transition-all duration-300",
                  isActive ? "text-primary opacity-100" : "opacity-40 hover:opacity-100 hover:text-primary"
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="w-px h-6 bg-white/10 hidden lg:block" />
        <CreditTracker />
        <div className="w-px h-6 bg-white/10 hidden lg:block" />
        <div className="flex items-center gap-4">
            <Link href="/profile" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10" title="Profile">
            <UserRound className="w-4 h-4 text-white/70" />
          </Link>
          <form action={logout}>
            <button 
              type="submit"
              className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 transition-colors border border-white/10 text-white/70"
              title="Sign out"
            >
              <Power className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
