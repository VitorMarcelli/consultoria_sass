export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-40 space-y-6 animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing rings */}
        <div className="absolute inset-0 border-2 border-teal-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
        <div className="absolute inset-2 border-2 border-sky-500/30 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
        
        {/* Logo Mark */}
        <div className="h-16 w-16 bg-white dark:bg-slate-900 shadow-xl rounded-2xl flex items-baseline justify-center pt-3 border border-slate-100 dark:border-slate-800 z-10">
          <span className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">S</span>
          <span className="text-teal-500 font-black text-3xl leading-none">.</span>
        </div>
      </div>
      
      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="h-2 w-2 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">Carregando Módulos</p>
      </div>
    </div>
  );
}
