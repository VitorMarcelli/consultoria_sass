'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Save, ArrowLeft, Clock, Users, Database } from 'lucide-react';
import Link from 'next/link';

export default function ClientMaintenancePage() {
  const [activeLayer, setActiveLayer] = useState('layer3');

  const tabs = [
    { id: 'layer3', name: 'Cadastro Básico (Camada 3)', icon: Building2 },
    { id: 'tax', name: 'Perfil Fiscal', icon: Database },
    { id: 'layer4', name: 'Entregas e Responsáveis (Camada 4)', icon: Users },
    { id: 'times', name: 'Revisão de Tempos', icon: Clock },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <div className="flex items-center gap-4">
        <Link href="/offices/1" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manutenção de Cliente</h1>
          <p className="text-sm text-slate-500">Ajuste pontual da operação viva (Sem templates)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        {/* TABS MENU */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 p-4 shrink-0">
          <nav className="space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveLayer(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${
                  activeLayer === tab.id 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                    : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                <tab.icon size={18} />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 p-8">
          <AnimatePresence mode="wait">
            {activeLayer === 'layer3' && (
              <motion.div 
                key="layer3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Dados Principais do Cliente</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Razão Social</label>
                    <input type="text" defaultValue="Tech Solutions Brasil LTDA" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Nome Fantasia</label>
                    <input type="text" defaultValue="TechBR" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">CNPJ</label>
                    <input type="text" defaultValue="12.345.678/0001-99" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Status na Operação</label>
                    <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                      <option value="ACTIVE">Ativo</option>
                      <option value="INACTIVE">Inativo (Histórico preservado)</option>
                      <option value="PAUSED">Pausado</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium">
                    <Save size={18} />
                    Salvar Alterações
                  </button>
                </div>
              </motion.div>
            )}

            {activeLayer === 'layer4' && (
              <motion.div 
                key="layer4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-800">Responsáveis pelas Entregas</h2>
                  <button className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                    + Adicionar Entrega
                  </button>
                </div>
                
                <p className="text-sm text-slate-500">Se houver diferença entre o responsável pelo cliente e o responsável pela entrega, prevalece a responsabilidade específica aqui definida.</p>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-3 font-medium">Frente</th>
                        <th className="p-3 font-medium">Entrega</th>
                        <th className="p-3 font-medium">Responsável</th>
                        <th className="p-3 font-medium">Tempo Previsto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">Fiscal</span></td>
                        <td className="p-3 font-medium text-slate-700">ICMS ST</td>
                        <td className="p-3">
                          <select className="bg-transparent border border-slate-200 rounded px-2 py-1 outline-none text-slate-700">
                            <option>João Silva</option>
                            <option>Maria Clara</option>
                          </select>
                        </td>
                        <td className="p-3 text-slate-500">45 min</td>
                      </tr>
                      <tr>
                        <td className="p-3"><span className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-semibold">DP/Pessoal</span></td>
                        <td className="p-3 font-medium text-slate-700">Folha de Pagamento</td>
                        <td className="p-3">
                          <select className="bg-transparent border border-slate-200 rounded px-2 py-1 outline-none text-slate-700">
                            <option>Pedro Souza</option>
                            <option>Ana Maria</option>
                          </select>
                        </td>
                        <td className="p-3 text-slate-500">120 min</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 flex justify-end">
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium">
                    <Save size={18} />
                    Salvar Tabela
                  </button>
                </div>
              </motion.div>
            )}

            {/* Other tabs omitted for brevity but logic stands */}
            {['tax', 'times'].includes(activeLayer) && (
              <motion.div 
                key="other"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Database size={28} />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">Sessão em Construção</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  A demonstração das abas de Camada 3 e 4 já refletem a estrutura de dados planejada.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
