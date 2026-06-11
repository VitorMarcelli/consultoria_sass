import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-in fade-in duration-300">
      <Loader2 className="h-10 w-10 text-rose-500 animate-spin" />
      <p className="text-slate-500 font-bold text-sm">Carregando...</p>
    </div>
  );
}
