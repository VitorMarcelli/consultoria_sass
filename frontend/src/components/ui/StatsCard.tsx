import React from 'react';
import { motion } from 'framer-motion';
import { CircularProgress } from './CircularProgress';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  name: string;
  value: string | number;
  total: string;
  color: string;
  stripColor: string;
  icon: LucideIcon;
  progress: number;
  desc: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 25 } }
};

export const StatsCard = ({ stat }: { stat: StatsCardProps }) => {
  return (
    <motion.div 
      variants={cardVariants}
      className="rounded-[2.5rem] bg-white dark:bg-slate-900 p-7 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] dark:shadow-none border border-slate-50 dark:border-slate-800 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.12)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group cursor-pointer flex flex-col justify-between min-h-[160px]"
    >
      {/* Decorative colored strip on the right edge */}
      <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-16 rounded-l-full opacity-90 transition-all duration-300 group-hover:h-24 group-hover:shadow-lg ${stat.stripColor}`}></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex flex-col">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 w-max mb-3 border border-slate-100 dark:border-slate-700 shadow-sm group-hover:shadow-md transition-shadow">
            <stat.icon className="h-5 w-5" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{stat.total}</p>
        </div>
        <CircularProgress progress={stat.progress} colorClass={stat.color} />
      </div>

      <div className="relative z-10">
        <h3 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tighter truncate">
          {stat.value}
        </h3>
        <div className="relative h-5 mt-2 overflow-hidden">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 absolute inset-0 transition-all duration-300 transform group-hover:-translate-y-full opacity-100 group-hover:opacity-0">
            {stat.desc}
          </p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 absolute inset-0 transition-all duration-300 transform translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-400"></span> {stat.name}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
