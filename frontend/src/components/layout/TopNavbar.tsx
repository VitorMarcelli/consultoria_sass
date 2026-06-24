'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Building2,
  Sparkles,
  LogOut,
  ShieldCheck,
  Settings,
  Bell,
  CheckSquare,
  Zap
} from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { createClient } from '@/utils/supabase/client';
import NotificationDropdown from './NotificationDropdown';

const menuItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Escritórios', path: '/escritorios', icon: Building2 },
  { name: 'Entregas', path: '/entregas', icon: CheckSquare },
  { name: 'Oportunidades', path: '/oportunidades', icon: Zap },
  { name: 'Administradores', path: '/admin/administradores', icon: ShieldCheck },
  { name: 'Consultores', path: '/admin/consultores', icon: Users },
];

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

export default function TopNavbar() {
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
        console.warn('Failed to load user profile in top navbar:', err);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[96%] max-w-7xl h-16 z-50">
      <div className="w-full h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-slate-800/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.1)] rounded-full flex items-center justify-between px-4 lg:px-6 transition-all duration-300">
        
        {/* Logo Section */}
        <div className="flex items-center group cursor-pointer">
          <div className="hidden sm:flex flex-col">
            <div className="flex items-baseline">
              <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">Sevilha</span>
              <span className="text-teal-600 dark:text-teal-400 font-black text-2xl leading-none ml-0.5">.</span>
            </div>
            <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-[0.2em] block mt-1">Performance</span>
          </div>
          {/* Mobile version (just S.) */}
          <div className="sm:hidden flex items-baseline">
            <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">S</span>
            <span className="text-teal-600 dark:text-teal-400 font-black text-2xl leading-none">.</span>
          </div>
        </div>

        {/* Central Navigation */}
        <nav 
          onMouseLeave={() => setHoveredTab(null)}
          className="hidden md:flex items-center bg-slate-200/50 dark:bg-slate-950/50 p-1.5 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] border border-slate-300/50 dark:border-slate-800/50 transition-all duration-500"
        >
          {menuItems.filter(item => {
            if (item.path.startsWith('/admin') || item.path === '/') {
              return profile?.role === 'ADMIN';
            }
            return true;
          }).map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            
            return (
              <div
                key={item.name}
                className="overflow-hidden whitespace-nowrap origin-center"
              >
                <Link 
                  href={item.path} 
                    className="relative flex px-5 py-2.5 mx-0.5 rounded-full outline-none group"
                    onMouseEnter={() => setHoveredTab(item.name)}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="topnavActiveTab"
                        className="absolute inset-0 bg-slate-900 dark:bg-teal-600 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    {hoveredTab === item.name && !isActive && (
                      <motion.div
                        layoutId="topnavHoverTab"
                        className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 rounded-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                    <div className="relative flex items-center gap-2 z-10 w-full justify-center">
                      <span className={`text-[13px] font-bold transition-colors duration-200 tracking-wide ${
                        isActive 
                          ? 'text-white' 
                          : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white'
                      }`}>
                        {item.name}
                      </span>
                    </div>
                  </Link>
              </div>
            );
          })}

        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 lg:gap-3">
          
          {/* Settings Button (Isolated) */}
          <Link href="/configuracoes" className="group flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-full transition-colors border border-slate-200/50 dark:border-slate-700/50">
            <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:rotate-45 transition-transform duration-300" />
            <span className="hidden lg:block text-xs font-bold text-slate-700 dark:text-slate-200">Ajustes</span>
          </Link>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

          <NotificationDropdown />

          {/* Profile */}
          {profile ? (
            <div className="flex items-center gap-2 pl-1 group cursor-pointer relative">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{profile.name.split(' ')[0]}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">{profile.role === 'ADMIN' ? 'SuperAdmin' : 'Consultor'}</span>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-white shadow-inner relative ring-2 ring-transparent group-hover:ring-teal-500 transition-all">
                {getUserInitials(profile.name)}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-800"></span>
              </div>
              
              {/* Dropdown Menu on Hover */}
              <div className="absolute top-full right-0 mt-4 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 overflow-hidden">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{profile.name}</p>
                  <p className="text-xs text-slate-500">{profile.email}</p>
                </div>
                <div className="p-2">
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                    <LogOut className="w-4 h-4" />
                    Sair da Conta
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
          )}
        </div>

      </div>
    </div>
  );
}
