'use client';

import React, { useState, use } from 'react';
import { Search, FileCheck, Plus, Filter, DownloadCloud, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import DeliverySlideOver from '@/components/DeliverySlideOver';

const mockDeliveries = [
  {
    id: '1',
    name: 'Apuração ICMS Mensal',
    client: 'Cliente Premium LTDA',
    deadline: '10/06/2026',
    status: 'COMPLETED',
    responsible: 'Ana Analista',
  },
  {
    id: '2',
    name: 'Fechamento de Folha',
    client: 'Comércio Varejo S/A',
    deadline: '05/06/2026',
    status: 'LATE',
    responsible: 'Marcos DP',
  },
  {
    id: '3',
    name: 'Declaração DCTFWeb',
    client: 'Cliente Premium LTDA',
    deadline: '15/06/2026',
    status: 'PENDING',
    responsible: 'Ana Analista',
  },
  {
    id: '4',
    name: 'Imposto de Renda PJ',
    client: 'Indústria ABC',
    deadline: '30/06/2026',
    status: 'PENDING',
    responsible: 'Carlos Líder',
  }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100"><CheckCircle2 className="w-3.5 h-3.5" /> Concluído</span>;
    case 'PENDING':
      return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100"><Clock className="w-3.5 h-3.5" /> Pendente</span>;
    case 'LATE':
      return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100"><AlertCircle className="w-3.5 h-3.5" /> Atrasado</span>;
    default:
      return <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">Desconhecido</span>;
  }
};

export default function CycleDeliveriesPage({
  params,
}: {
  params: Promise<{ id: string; cycleId: string }>;
}) {
  const { id, cycleId } = use(params);
  const [search, setSearch] = useState('');
  
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);

  const filteredDeliveries = mockDeliveries.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.client.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Entregas Mensais</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Visualize e acompanhe as entregas mapeadas para este ciclo.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl hover:bg-slate-50 transition-all font-bold text-sm shadow-sm"
          >
            <Filter className="w-4 h-4 text-slate-400" />
            Filtros
          </button>
          <button 
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-2xl hover:bg-teal-600 transition-all font-bold text-sm shadow-xl hover:shadow-teal-600/30"
          >
            <Plus className="w-4 h-4" />
            Nova Entrega
          </button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8"
      >
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar entrega ou cliente..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all hover:border-slate-300 shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-teal-600 transition-colors">
              <DownloadCloud className="w-4 h-4" />
              Exportar
            </button>
            <div className="text-sm font-bold text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              Total: <span className="text-slate-900">{filteredDeliveries.length}</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 font-bold">Entrega</th>
                <th className="px-8 py-5 font-bold">Cliente</th>
                <th className="px-8 py-5 font-bold">Prazo</th>
                <th className="px-8 py-5 font-bold">Status</th>
                <th className="px-8 py-5 font-bold">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                      <FileCheck className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-700 text-lg mb-1">Nenhuma entrega encontrada</p>
                    <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto">Tente buscar por outro termo ou remova os filtros atuais.</p>
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr 
                    key={delivery.id} 
                    onClick={() => {
                      setSelectedDelivery(delivery);
                      setIsDeliveryOpen(true);
                    }}
                    className="bg-white hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{delivery.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-slate-600 font-medium">{delivery.client}</td>
                    <td className="px-8 py-5 text-slate-600 font-semibold">{delivery.deadline}</td>
                    <td className="px-8 py-5">
                      {getStatusBadge(delivery.status)}
                    </td>
                    <td className="px-8 py-5 text-slate-600 font-medium">{delivery.responsible}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <DeliverySlideOver 
        isOpen={isDeliveryOpen}
        onClose={() => setIsDeliveryOpen(false)}
        delivery={selectedDelivery}
      />
    </div>
  );
}
