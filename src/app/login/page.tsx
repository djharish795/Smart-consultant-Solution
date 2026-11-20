'use client'

import React, { Suspense } from 'react'
import { Sparkles, ArrowRight, AlertCircle, Mail, Lock, ShieldCheck } from 'lucide-react'
import { login } from './actions'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  let errorMessage = ''
  if (errorParam === 'invalid_credentials') {
    errorMessage = 'Invalid email or password. Please verify your credentials with your administrator.'
  } else if (errorParam === 'email_not_confirmed') {
    errorMessage = 'Email address not confirmed. Please verify your inbox or contact your administrator.'
  } else if (errorParam === 'missing_fields') {
    errorMessage = 'Please provide both your email address and password.'
  } else if (errorParam) {
    errorMessage = decodeURIComponent(errorParam)
  }

  return (
    <main className="min-h-screen p-6 flex flex-col items-center justify-center bg-[#050505] text-white selection:bg-primary/30 relative">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass p-10 rounded-[3rem] border border-white/10 space-y-6 text-center shadow-2xl backdrop-blur-xl bg-black/40">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-primary rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-primary/40 glow-primary animate-float">
              <Sparkles className="text-white w-10 h-10" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-serif font-black tracking-tight leading-none italic">
              Smart<span className="text-primary not-italic"> Consultant</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-black opacity-60 mt-2 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Application Gateway
            </p>
          </div>

          {/* Dynamic Authentication Error Alert Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs text-left flex items-start gap-3 animate-in fade-in duration-200 mt-4">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-red-400">Authentication Failed</p>
                <p className="opacity-90 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form action={login} className="space-y-4 text-left mt-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-primary ml-2 flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> Email Address
              </label>
              <input 
                type="email" 
                name="email"
                required
                autoComplete="email"
                placeholder="Enter your professional email"
                className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 outline-none focus:border-primary focus:bg-primary/5 transition-all text-sm font-medium placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-primary ml-2 flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Secure Password
              </label>
              <input 
                type="password" 
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 outline-none focus:border-primary focus:bg-primary/5 transition-all text-sm font-medium placeholder:text-white/30"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-5 bg-primary text-white rounded-2xl font-black text-sm tracking-widest uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 mt-6"
            >
              Authenticate Identity
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-40 pt-4">
            Authorized Personnel Only
          </p>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
