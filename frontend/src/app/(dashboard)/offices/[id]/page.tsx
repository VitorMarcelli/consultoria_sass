'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, AlertTriangle, Clock, Briefcase, FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function OfficeDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');

  // Placeholder data for M1 demonstration
  const stats = [
    { title: 'Total de Clientes', value: '450', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Entregas Previstas', value: '1.284', icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50' },
    { title: 'Tempo Total (h)', value: '342h', icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Gargalos Identificados', value: '8', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const frontDistribution = [
    { name: 'Fiscal', clients: 410, hours: 145, color: 'bg-blue-500' },
    { name: 'DP/Pessoal', clients: 450, hours: 120, color: 'bg-teal-500' },
    { name: 'Contábil', clients: 380, hours: 77, color: 'bg-emerald-500' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-7xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/offices" className="text-sm font-medium text-slate-400 hover:text-blue-600 transition-colors">
              Escritórios
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-blue-600">Contabilidade Nova Era</span>
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Painel de Performance (M1)
          </h1>
          <p className="text-slate-500 mt-1">Leitura da operação, concentração de carteira e esforço por frente.</p>
        </div>
        
        <Link href={`/imports`} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium rounded-xl transition-all shadow-sm active:scale-95">
          <TrendingUp size={18} />
          <span>Atualizar Base (CSV)</span>
        </Link>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* FRONT DISTRIBUTION */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Briefcase size={20} className="text-blue-600" /> 
            Distribuição por Frente Operacional
          </h2>
          
          <div className="space-y-6">
            {frontDistribution.map((front, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-slate-700">{front.name}</span>
                  <div className="flex gap-4 text-slate-500">
                    <span>{front.clients} Clientes</span>
                    <span className="font-medium text-slate-800">{front.hours}h estimadas</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(front.clients / 450) * 100}%` }}
                    transition={{ duration: 1, delay: i * 0.2 }}
                    className={`h-full ${front.color} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OPPORTUNITIES & BOTTLENECKS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" /> 
            Gargalos e Concentrações
          </h2>
          
          <div className="flex-1 space-y-3">
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <h4 className="font-semibold text-amber-800 text-sm">Concentração de Carteira</h4>
              <p className="text-xs text-amber-700 mt-1">O colaborador <strong>João Silva</strong> concentra 38% das entregas do setor Fiscal.</p>
            </div>
            
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
              <h4 className="font-semibold text-red-800 text-sm">Entregas sem Tempo</h4>
              <p className="text-xs text-red-700 mt-1">15 entregas do DP/Pessoal estão sem esforço estimado cadastrado.</p>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <h4 className="font-semibold text-blue-800 text-sm">Oportunidade (M1)</h4>
              <p className="text-xs text-blue-700 mt-1">Padronizar nomenclatura das obrigações acessórias do Fiscal 02.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* QUICK ACTIONS FOR MANUAL MAINTENANCE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <CheckCircle size={20} className="text-emerald-500" /> 
          Manutenção Pontual
        </h2>
        <p className="text-sm text-slate-500 mb-6">Acesse diretamente os cadastros para ajustes na operação viva (clientes, responsáveis e prazos) sem precisar de planilhas.</p>
        
        <div className="grid sm:grid-cols-3 gap-4">
          <Link href="/offices/1/clients/new" className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center text-center group">
            <Users size={24} className="text-slate-400 group-hover:text-blue-600 mb-2 transition-colors" />
            <span className="font-semibold text-slate-700 group-hover:text-blue-700">Novo Cliente</span>
            <span className="text-xs text-slate-500 mt-1">Adicionar individualmente</span>
          </Link>
          
          <button className="p-4 border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-colors flex flex-col items-center justify-center text-center group">
            <Clock size={24} className="text-slate-400 group-hover:text-emerald-600 mb-2 transition-colors" />
            <span className="font-semibold text-slate-700 group-hover:text-emerald-700">Revisar Tempos</span>
            <span className="text-xs text-slate-500 mt-1">Ajustar esforço (Camada 4)</span>
          </button>
          
          <button className="p-4 border border-slate-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-colors flex flex-col items-center justify-center text-center group">
            <Briefcase size={24} className="text-slate-400 group-hover:text-teal-600 mb-2 transition-colors" />
            <span className="font-semibold text-slate-700 group-hover:text-teal-700">Responsáveis</span>
            <span className="text-xs text-slate-500 mt-1">Re-alocar carteira</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
