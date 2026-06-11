'use client';

import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Activity, Shield, Users, Sparkles } from 'lucide-react';
import { login } from './actions';
import { useState, useEffect } from 'react';

export default function LoginClient({ error }: { error?: string }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  };

  return (
    <div className="flex min-h-screen w-full bg-white overflow-hidden">
      
      {/* ----------------- BRANDING SIDE (Left) ----------------- */}
      <div className="relative hidden w-[55%] flex-col items-center justify-center bg-slate-950 lg:flex">
        
        {/* Animated Orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-[10%] top-[10%] h-[40rem] w-[40rem] rounded-full bg-teal-500/20 blur-[120px] mix-blend-screen"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute right-[10%] bottom-[10%] h-[40rem] w-[40rem] rounded-full bg-teal-500/20 blur-[120px] mix-blend-screen"
        />

        {/* Intricate Geometric Grid Overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.03]" 
             style={{ 
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
             }}>
        </div>

        {/* Parallax Container */}
        <motion.div 
          className="relative z-10 flex w-full max-w-lg flex-col items-start justify-center"
          animate={{ x: mousePosition.x * -1, y: mousePosition.y * -1 }}
          transition={{ type: 'spring' as const, stiffness: 150, damping: 15, mass: 0.5 }}
        >
          {/* Main Glass Panel */}
          <div className="relative w-full rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-12 shadow-[0_0_80px_rgba(0,0,0,0.5)] backdrop-blur-3xl overflow-hidden">
            
            {/* Shimmer effect inside panel */}
            <motion.div 
              className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent w-[200%] skew-x-[-20deg]"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: "linear" }}
            />

            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
              className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-inner relative"
            >
              <Sparkles className="h-8 w-8 text-teal-400" />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-left text-5xl font-black tracking-tight text-white leading-tight relative z-10"
            >
              Gestão de <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-sky-400">Alto Nível.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 max-w-sm text-left text-lg font-medium text-slate-400 leading-relaxed relative z-10"
            >
              Centralize seus clientes, otimize processos de consultoria e expanda seus resultados com nossa tecnologia proprietária.
            </motion.p>
          </div>

          {/* Floating UI Badges */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-12 top-10 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20">
              <Activity className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <div className="h-2 w-20 rounded-full bg-slate-300/50 mb-2"></div>
              <div className="h-2 w-12 rounded-full bg-slate-500/50"></div>
            </div>
          </motion.div>

          <motion.div 
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -left-8 -bottom-8 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20">
              <Shield className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <div className="h-2 w-24 rounded-full bg-slate-300/50 mb-2"></div>
              <div className="h-2 w-16 rounded-full bg-slate-500/50"></div>
            </div>
          </motion.div>
        </motion.div>
      </div>
      
      {/* ----------------- FORM SIDE (Right) ----------------- */}
      <div className="flex w-full flex-col justify-center bg-white px-6 py-12 lg:w-[45%] lg:px-16 xl:px-24">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mx-auto w-full max-w-[420px]"
        >
          {/* Mobile Header */}
          <motion.div variants={fadeUp} className="mb-10 lg:hidden text-center flex flex-col items-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-xl shadow-teal-500/20">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Consultoria Pro
            </h2>
          </motion.div>

          {/* Desktop Header */}
          <motion.div variants={fadeUp} className="hidden lg:block mb-12">
            <h2 className="text-[2.5rem] font-bold tracking-tight text-slate-900 leading-none">
              Bem-vindo
            </h2>
            <p className="mt-3 text-lg text-slate-500 font-medium">Insira suas credenciais para acessar o painel.</p>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-700 shadow-sm"
            >
              <Shield className="h-5 w-5 flex-shrink-0 text-teal-500" />
              <span className="text-sm font-semibold">Credenciais inválidas. Verifique seu e-mail e senha.</span>
            </motion.div>
          )}

          <form action={login} className="space-y-6">
            <motion.div variants={fadeUp} className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">Email Corporativo</label>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pl-12 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all duration-300 font-medium"
                  placeholder="exemplo@suaempresa.com"
                />
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Senha</label>
                <a href="#" className="text-sm font-bold text-teal-500 hover:text-teal-600 transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pl-12 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all duration-300 font-medium tracking-widest"
                  placeholder="••••••••"
                />
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="flex items-center pt-2">
              <div className="relative flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-200 checked:border-teal-500 checked:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:ring-offset-2 transition-all"
                />
                <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <label htmlFor="remember-me" className="ml-3 block text-sm text-slate-600 font-semibold cursor-pointer">
                Manter conectado
              </label>
            </motion.div>

            <motion.div variants={fadeUp}>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-4 text-base font-bold text-white shadow-xl shadow-slate-900/20 focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all mt-6"
              >
                Entrar na Plataforma
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </motion.button>
            </motion.div>
            
            <motion.div variants={fadeUp} className="mt-10 text-center text-sm font-semibold text-slate-500">
              Precisa de ajuda?{' '}
              <a href="#" className="text-slate-900 hover:text-teal-500 transition-colors underline decoration-slate-300 underline-offset-4 hover:decoration-teal-500">
                Fale com o suporte
              </a>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
