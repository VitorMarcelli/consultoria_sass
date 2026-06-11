'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Settings,
  Building2,
  Sparkles,
  LogOut,
  ShieldCheck,
  X,
  Plus
} from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { createClient } from '@/utils/supabase/client';

const menuItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Escritórios', path: '/escritorios', icon: Building2 },
  { name: 'Consultores', path: '/admin/consultores', icon: Users },
  { name: 'Configurações', path: '/configuracoes', icon: Settings },
];

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiRequest('/users/me');
        setProfile(data);
      } catch (err) {
        console.warn('Failed to load user profile in sidebar:', err);
      }
    };
    fetchProfile();
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose?.();
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'SuperAdmin';
      case 'LEADER': return 'Líder';
      default: return 'Consultor';
    }
  };

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex h-16 items-center justify-between px-6 mt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-400 shadow-md shadow-emerald-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white block">Sevilha</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block -mt-1">Performance</span>
            </div>
          </div>
          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* The prominent 'New Action' button to match 1:1 the image's "Upload New Files" */}
        <div className="mt-8 px-6">
          <button className="w-full bg-white text-slate-900 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold shadow-lg shadow-white/5 hover:scale-[1.02] transition-transform">
            <Plus className="w-5 h-5 text-teal-600" />
            Criar Novo
          </button>
        </div>

        {/* Navigation menu */}
        <div className="px-4 py-2">
          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-5">Menu Principal</p>
          <nav className="flex flex-col gap-2">
            {menuItems.filter(item => {
              if (item.path === '/admin/consultores' || item.path === '/') {
                return profile?.role === 'ADMIN';
              }
              return true;
            }).map((item) => {
              const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
              return (
                <Link key={item.name} href={item.path} className="relative group block">
                  {isActive && (
                    <motion.div 
                      layoutId="sidebarActiveTab"
                      className="absolute inset-0 bg-slate-900/80 rounded-xl"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <div className={`relative flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'text-white font-bold' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <item.icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${
                        isActive ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`} />
                      <span className="text-sm font-semibold tracking-wide">{item.name}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User profile area */}
      <div className="p-4 px-6 mb-4">
        {profile ? (
          <div className="flex flex-col gap-3 rounded-2xl bg-slate-900/40 p-4 relative group hover:bg-slate-900/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-white shadow-inner relative overflow-hidden">
                {getUserInitials(profile.name)}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-slate-900"></span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate">{profile.name}</span>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5 uppercase tracking-wider">
                  <ShieldCheck className="h-3 w-3 text-teal-400" />
                  {getRoleLabel(profile.role)}
                </span>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950/50 hover:bg-red-500/10 hover:text-red-400 py-2.5 text-xs font-bold text-slate-400 transition-all duration-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        ) : (
          <div className="h-20 rounded-2xl bg-slate-900/40 animate-pulse flex items-center justify-center">
            <span className="text-xs text-slate-500 font-semibold">Carregando perfil...</span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-72 flex-col justify-between bg-transparent text-slate-400 hidden lg:flex relative z-40 py-6">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-screen w-72 flex flex-col justify-between border-r border-slate-900 bg-slate-950 text-slate-400 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
