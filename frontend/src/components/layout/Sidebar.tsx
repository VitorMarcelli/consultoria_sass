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
  { name: 'Administradores', path: '/admin/administradores', icon: ShieldCheck },
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

  const textTransitionClasses = "overflow-hidden transition-all duration-300 whitespace-nowrap max-w-[200px] opacity-100 ml-3 lg:max-w-0 lg:opacity-0 lg:ml-0 lg:group-hover/sidebar:max-w-[200px] lg:group-hover/sidebar:opacity-100 lg:group-hover/sidebar:ml-3";

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden w-full">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-3 mt-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-400 shadow-md shadow-emerald-500/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className={textTransitionClasses}>
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
      
      {/* Criar Novo */}
      <div className="mt-8 px-3">
        <button className="w-full flex items-center h-12 bg-white text-slate-900 rounded-xl font-bold shadow-lg shadow-white/5 hover:bg-slate-100 transition-all group/btn overflow-hidden">
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
            <Plus className="w-5 h-5 text-teal-600 transition-transform group-hover/btn:rotate-90" />
          </div>
          <span className={textTransitionClasses.replace('ml-3', 'ml-1')}>
            Criar Novo
          </span>
        </button>
      </div>

      {/* Navigation menu */}
      <div className="mt-8 px-3 flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <nav className="flex flex-col gap-2">
          {menuItems.filter(item => {
            if (item.path.startsWith('/admin') || item.path === '/') {
              return profile?.role === 'ADMIN';
            }
            return true;
          }).map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
              <Link key={item.name} href={item.path} className="relative block group/item">
                <div className={`flex items-center h-12 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-slate-800/80' 
                    : 'hover:bg-slate-900/60'
                }`}>
                  <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25 scale-100' 
                      : 'text-slate-400 group-hover/item:text-white group-hover/item:scale-110'
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className={`${textTransitionClasses} ${
                    isActive ? 'text-white font-bold' : 'text-slate-400 font-medium group-hover/item:text-slate-200'
                  }`}>
                    {item.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile area */}
      <div className="p-3 mb-4 mt-auto">
        {profile ? (
          <div className="flex items-center h-14 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 transition-colors p-1 relative group/profile cursor-pointer">
            <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-white shadow-inner relative overflow-hidden">
              {getUserInitials(profile.name)}
              <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-slate-900"></span>
            </div>
            
            <div className={`flex flex-col justify-center ${textTransitionClasses}`}>
              <span className="text-sm font-bold text-white truncate">{profile.name}</span>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5 uppercase tracking-wider">
                <ShieldCheck className="h-3 w-3 text-teal-400" />
                {getRoleLabel(profile.role)}
              </span>
            </div>

            <button 
              onClick={handleLogout}
              className="absolute right-3 text-slate-500 hover:text-red-400 transition-colors opacity-100 lg:opacity-0 lg:group-hover/sidebar:opacity-100"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="h-14 rounded-xl bg-slate-900/40 animate-pulse flex items-center justify-center">
            <span className="text-xs text-slate-500 font-semibold lg:hidden lg:group-hover/sidebar:block">Carregando...</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Collapsible on Hover) */}
      <aside className="group/sidebar w-[72px] hover:w-72 transition-[width] duration-300 ease-in-out flex-col justify-between bg-transparent text-slate-400 hidden lg:flex relative z-40 py-4">
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
