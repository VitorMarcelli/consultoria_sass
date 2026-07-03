'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopNavbar from '@/components/layout/TopNavbar';
import Header from '@/components/layout/Header';
import TimerWidget from '@/components/timesheet/TimerWidget';
import SessionGuardian from '@/components/auth/SessionGuardian';
import { useUIStore } from '@/store/useUIStore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { navigationLayout } = useUIStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-screen w-screen bg-slate-950 flex items-center justify-center"></div>;
  }

  const isTopbar = navigationLayout === 'topbar';

  return (
    <div className={`h-screen w-screen bg-slate-950 text-slate-900 dark:text-slate-50 font-sans flex overflow-hidden ${isTopbar ? 'flex-col' : ''}`}>
      
      {isTopbar ? (
        <TopNavbar />
      ) : (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}
      
      {/* Main Content Container */}
      <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-300 ${
        isTopbar 
          ? 'mt-24 rounded-t-[40px]' // give space for TopNavbar
          : 'my-2 mr-2 lg:my-3 lg:mr-3 rounded-container'
      }`}>
        <Header onToggleSidebar={() => setSidebarOpen(true)} isTopbar={isTopbar} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 relative custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
          <div className="mx-auto w-full max-w-[1800px]">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Widget & Guardian */}
      <TimerWidget />
      <SessionGuardian />
    </div>
  );
}
