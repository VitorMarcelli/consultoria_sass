import React from 'react';

export const CircularProgress = ({ progress, colorClass }: { progress: number, colorClass: string }) => {
  const strokeDasharray = 2 * Math.PI * 18; 
  const strokeDashoffset = strokeDasharray - (progress / 100) * strokeDasharray;
  return (
    <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
      <svg className="transform -rotate-90 w-12 h-12 drop-shadow-sm">
        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-slate-800" />
        <circle 
          cx="24" cy="24" r="18" 
          stroke="currentColor" 
          strokeWidth="4" 
          fill="transparent" 
          strokeDasharray={strokeDasharray} 
          strokeDashoffset={strokeDashoffset} 
          className={`${colorClass} transition-all duration-1000 ease-out`} 
          strokeLinecap="round" 
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-black text-slate-700 dark:text-slate-300">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};
