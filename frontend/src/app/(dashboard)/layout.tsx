'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-900 dark:text-slate-50 font-sans flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content Container */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-container shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] relative my-2 mr-2 lg:my-3 lg:mr-3 overflow-hidden transition-all duration-300">
        <Header onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 relative custom-scrollbar bg-slate-50/30 dark:bg-slate-900/50 transition-colors">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
