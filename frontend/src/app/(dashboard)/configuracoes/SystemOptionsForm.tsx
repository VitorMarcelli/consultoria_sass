'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Tag, Building2, MonitorSmartphone } from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface SystemOption {
  id: string;
  category: string;
  label: string;
  value: string;
  color: string | null;
}

const COLORS = [
  { value: 'emerald', label: 'Verde', class: 'bg-emerald-500' },
  { value: 'amber', label: 'Amarelo', class: 'bg-amber-500' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'slate', label: 'Cinza', class: 'bg-slate-500' },
  { value: 'rose', label: 'Vermelho', class: 'bg-rose-500' },
  { value: 'purple', label: 'Roxo', class: 'bg-purple-500' },
];

export default function SystemOptionsForm() {
  const [options, setOptions] = useState<SystemOption[]>([]);
  const [loading, setLoading] = useState(true);

  // States for new items
  const [newSize, setNewSize] = useState('');
  const [newSystem, setNewSystem] = useState('');
  
  // States for Status
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('blue');

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/system-options');
      setOptions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleCreate = async (category: string, label: string, color?: string) => {
    if (!label.trim()) return;
    try {
      // create a value slug from label
      const value = label.trim().toUpperCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      await apiRequest('/system-options', {
        method: 'POST',
        body: JSON.stringify({ category, label: label.trim(), value, color: color || null })
      });
      fetchOptions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/system-options/${id}`, { method: 'DELETE' });
      fetchOptions();
    } catch (err) {
      console.error(err);
    }
  };

  const getOptionsByCategory = (category: string) => {
    return options.filter(o => o.category === category);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-[2rem] border border-slate-200">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* PORTE DO ESCRITÓRIO */}
      <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Porte do Escritório</h3>
            <p className="text-sm text-slate-500 font-medium">Tamanhos disponíveis no cadastro (Ex: Pequeno, Médio, Grande)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              placeholder="Digite um novo porte..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <button 
              onClick={() => { handleCreate('TENANT_SIZE', newSize); setNewSize(''); }}
              className="px-4 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {getOptionsByCategory('TENANT_SIZE').map(opt => (
              <div key={opt.id} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-sm font-bold text-slate-700">{opt.label}</span>
                <button onClick={() => handleDelete(opt.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {getOptionsByCategory('TENANT_SIZE').length === 0 && (
              <span className="text-sm text-slate-400 italic">Nenhum porte cadastrado.</span>
            )}
          </div>
        </div>
      </div>

      {/* SISTEMA CONTÁBIL */}
      <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <MonitorSmartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Sistema Contábil Principal</h3>
            <p className="text-sm text-slate-500 font-medium">Sistemas disponíveis no cadastro (Ex: Domínio, Alterdata)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSystem}
              onChange={(e) => setNewSystem(e.target.value)}
              placeholder="Digite um novo sistema..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <button 
              onClick={() => { handleCreate('ACCOUNTING_SYSTEM', newSystem); setNewSystem(''); }}
              className="px-4 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {getOptionsByCategory('ACCOUNTING_SYSTEM').map(opt => (
              <div key={opt.id} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-sm font-bold text-slate-700">{opt.label}</span>
                <button onClick={() => handleDelete(opt.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {getOptionsByCategory('ACCOUNTING_SYSTEM').length === 0 && (
              <span className="text-sm text-slate-400 italic">Nenhum sistema cadastrado.</span>
            )}
          </div>
        </div>
      </div>

      {/* STATUS DO PROJETO */}
      <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Status do Projeto</h3>
            <p className="text-sm text-slate-500 font-medium">Gerencie as fases e os status com cores associadas.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newStatusLabel}
              onChange={(e) => setNewStatusLabel(e.target.value)}
              placeholder="Nome do status..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setNewStatusColor(c.value)}
                  title={c.label}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${newStatusColor === c.value ? 'ring-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                >
                  <div className={`w-5 h-5 rounded-full ${c.class}`}></div>
                </button>
              ))}
            </div>

            <button 
              onClick={() => { handleCreate('TENANT_STATUS', newStatusLabel, newStatusColor); setNewStatusLabel(''); }}
              className="px-4 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {getOptionsByCategory('TENANT_STATUS').map(opt => {
              const baseColor = opt.color || 'slate';
              const badgeClass = `bg-${baseColor}-100 text-${baseColor}-700 border border-${baseColor}-200`;
              
              return (
                <div key={opt.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${badgeClass}`}>
                  <span className="text-xs font-bold uppercase tracking-wider">{opt.label}</span>
                  <button onClick={() => handleDelete(opt.id)} className="opacity-50 hover:opacity-100 hover:text-red-600 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            {getOptionsByCategory('TENANT_STATUS').length === 0 && (
              <span className="text-sm text-slate-400 italic">Nenhum status cadastrado.</span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
