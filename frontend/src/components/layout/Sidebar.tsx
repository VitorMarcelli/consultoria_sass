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
  CheckSquare,
  Zap
} from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { createClient } from '@/utils/supabase/client';

const menuItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Entregas', path: '/entregas', icon: CheckSquare },
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
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

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
        <div className="flex items-center group cursor-pointer pl-1">
          {/* S. for collapsed state */}
          <div className="flex-shrink-0 w-10 flex items-baseline justify-center lg:group-hover/sidebar:hidden transition-all">
            <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">S</span>
            <span className="text-teal-500 dark:text-teal-400 font-black text-2xl leading-none">.</span>
          </div>
          
          {/* Full logo for expanded state */}
          <div className={`flex-col lg:hidden lg:group-hover/sidebar:flex ${textTransitionClasses}`}>
            <div className="flex items-baseline">
              <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">Sevilha</span>
              <span className="text-teal-500 dark:text-teal-400 font-black text-2xl leading-none ml-0.5">.</span>
            </div>
            <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-[0.2em] block mt-1">Performance</span>
          </div>
        </div>
        {/* Close button for mobile */}
        <button 
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {/* Navigation menu */}
      <div className="mt-8 px-3 flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <nav className="flex flex-col gap-2">
          {menuItems.filter(item => {
            if (profile?.role === 'OPERATOR') {
              return item.name === 'Entregas';
            }
            if (item.path.startsWith('/admin') || item.path === '/') {
              return profile?.role === 'ADMIN';
            }
            return true;
          }).map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
              <Link 
                key={item.name} 
                href={item.path} 
                className="relative flex items-center h-12 rounded-2xl outline-none group/item mb-1 overflow-hidden"
                onMouseEnter={() => setHoveredTab(item.name)}
                onMouseLeave={() => setHoveredTab(null)}
              >
                {isActive && (
                  <motion.div 
                    layoutId="sidebarActiveTab"
                    className="absolute inset-0 bg-slate-900 dark:bg-teal-600 shadow-[0_4px_12px_rgba(0,0,0,0.15)] rounded-2xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {hoveredTab === item.name && !isActive && (
                  <motion.div
                    layoutId="sidebarHoverTab"
                    className="absolute inset-0 bg-slate-100/60 dark:bg-slate-800/60 rounded-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                
                <div className="relative flex items-center z-10 w-full">
                  <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? 'text-white' 
                      : 'text-slate-500 group-hover/item:text-slate-900 dark:text-slate-400 dark:group-hover/item:text-white group-hover/item:scale-110'
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className={`${textTransitionClasses} ${
                    isActive ? 'text-white font-bold' : 'text-slate-500 font-medium group-hover/item:text-slate-900 dark:text-slate-400 dark:group-hover/item:text-white'
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
          <div className="flex items-center h-14 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors p-1 relative group/profile cursor-pointer">
            <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-white shadow-inner relative overflow-hidden">
              {getUserInitials(profile.name)}
              <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900"></span>
            </div>
            
            <div className="flex flex-col justify-center overflow-hidden transition-all duration-300 whitespace-nowrap opacity-100 ml-3 lg:opacity-0 lg:ml-0 lg:group-hover/sidebar:opacity-100 lg:group-hover/sidebar:ml-3 max-w-[130px] lg:max-w-0 lg:group-hover/sidebar:max-w-[130px]">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">{profile.name}</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 uppercase tracking-wider truncate">
                <ShieldCheck className="h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400" />
                <span className="truncate">{getRoleLabel(profile.role)}</span>
              </span>
            </div>

            <button 
              onClick={handleLogout}
              className="absolute right-3 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors opacity-100 lg:opacity-0 lg:group-hover/sidebar:opacity-100"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="h-14 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 animate-pulse flex items-center justify-center">
            <span className="text-xs text-slate-500 font-semibold lg:hidden lg:group-hover/sidebar:block">Carregando...</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Collapsible on Hover) */}
      <aside 
        className="group/sidebar w-[80px] hover:w-[260px] transition-[width] duration-300 ease-in-out flex-col justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-[2rem] m-4 hidden lg:flex relative z-[60] py-4 overflow-hidden"
      >
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
              className="fixed inset-0 z-50 bg-slate-900/20 dark:bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-screen w-72 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 lg:hidden shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
