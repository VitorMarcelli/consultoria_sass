'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Search, Plus, MoreHorizontal, Users, BarChart3, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function OfficesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Placeholder data mapping to M0 requirement
  const offices = [
    {
      id: '1',
      name: 'Contabilidade Nova Era',
      cnpj: '12.345.678/0001-90',
      status: 'MAPPING',
      consultant: 'Ana Souza',
      clientsCount: 450,
      createdAt: '2026-05-10'
    },
    {
      id: '2',
      name: 'Exata Soluções Contábeis',
      cnpj: '98.765.432/0001-12',
      status: 'PREPARATION',
      consultant: 'Carlos Mendes',
      clientsCount: 120,
      createdAt: '2026-06-01'
    },
    {
      id: '3',
      name: 'Grupo Valor & Cia',
      cnpj: '45.123.890/0001-44',
      status: 'ROUTINE',
      consultant: 'Mariana Lima',
      clientsCount: 890,
      createdAt: '2025-11-20'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PREPARATION':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">Preparação</span>;
      case 'MAPPING':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">Mapeamento (M1)</span>;
      case 'ROUTINE':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">Rotina Ativa</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">{status}</span>;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Escritórios de Contabilidade
          </h1>
          <p className="text-slate-500 mt-1">Gestão da carteira de clientes Sevilha Performance (Camada 1)</p>
        </div>
        
        <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm shadow-blue-200 hover:shadow-md hover:shadow-blue-300 active:scale-95">
          <Plus size={18} />
          <span>Novo Escritório</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CNPJ..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Mostrar:</span>
            <select className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer">
              <option>Todos os Status</option>
              <option>Preparação</option>
              <option>Mapeamento</option>
              <option>Rotina</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                <th className="p-4 font-semibold">Escritório</th>
                <th className="p-4 font-semibold">Consultor Resp.</th>
                <th className="p-4 font-semibold">Status / Fase</th>
                <th className="p-4 font-semibold">Volume (Carteira)</th>
                <th className="p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {offices.map((office, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={office.id} 
                  className="group hover:bg-slate-50/80 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{office.name}</div>
                        <div className="text-xs text-slate-400">{office.cnpj}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {office.consultant.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{office.consultant}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(office.status)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Users size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{office.clientsCount}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/offices/${office.id}/structure`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip-trigger" title="Estruturar Frentes">
                        <BarChart3 size={18} />
                      </Link>
                      <button className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                      <Link href={`/offices/${office.id}`} className="ml-2 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors">
                        Acessar <ChevronRight size={14} />
                      </Link>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
