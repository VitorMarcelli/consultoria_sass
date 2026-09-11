import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

import { Portal } from '@/components/ui/Portal';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  employeeData: any;
  onSuccess: () => void;
}

export default function EditEmployeeModal({ isOpen, onClose, tenantId, employeeData, onSuccess }: EditEmployeeModalProps) {
  // Employee Data
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('');
  const [email, setEmail] = useState('');
  const [grossSalary, setGrossSalary] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [observations, setObservations] = useState('');

  // Parâmetros da alocação no ciclo. Eram pedidos no cadastro e não existiam
  // na edição: para corrigir as horas disponíveis de alguém era preciso
  // desalocar e alocar de novo. E é esse número que serve de denominador no
  // planejamento de capacidade.
  const [dailyHours, setDailyHours] = useState('');
  const [predictable, setPredictable] = useState('');
  const [unpredictable, setUnpredictable] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // A tela passa a alocação inteira, com o colaborador aninhado. Aceita também
  // receber o colaborador direto, para não quebrar outros pontos de chamada.
  const employee = employeeData?.employee ?? employeeData;
  const allocationId = employeeData?.employee ? employeeData.id : null;

  useEffect(() => {
    if (isOpen && employee) {
      setName(employee.name || '');
      setRole(employee.role || '');
      setLevel(employee.level || '');
      setEmail(employee.email || '');
      setGrossSalary(employee.grossSalary ? String(employee.grossSalary) : '');
      setStatus(employee.status || 'ACTIVE');
      setObservations(employee.observations || '');

      setDailyHours(
        employeeData?.dailyAvailableTime != null
          ? String(employeeData.dailyAvailableTime)
          : '',
      );
      setPredictable(
        employeeData?.predictableRecurrentTimePercentage != null
          ? String(employeeData.predictableRecurrentTimePercentage)
          : '',
      );
      setUnpredictable(
        employeeData?.unpredictableRecurrentTimePercentage != null
          ? String(employeeData.unpredictableRecurrentTimePercentage)
          : '',
      );
    }
  }, [isOpen, employeeData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role) {
      alert('Preencha os campos obrigatórios (Nome e Cargo).');
      return;
    }

    const linkedClientsCount = employee?.linkedClientsCount || 0;
    const isDeactivating = employee?.status !== 'INACTIVE' && status === 'INACTIVE';
    if (isDeactivating && linkedClientsCount > 0) {
      const proceed = confirm(
        `${name} ainda é líder ou operador em ${linkedClientsCount} cliente${linkedClientsCount > 1 ? 's' : ''}. Desativar mesmo assim? Isso não remove o vínculo com esses clientes — só marca o colaborador como inativo.`
      );
      if (!proceed) return;
    }

    // A regra dos percentuais é do backend; conferir aqui evita gravar o
    // colaborador e só então falhar na alocação, deixando a edição pela
    // metade.
    if (allocationId) {
      const p = parseFloat((predictable || '').replace(',', '.'));
      const u = parseFloat((unpredictable || '').replace(',', '.'));
      if (isNaN(p) || isNaN(u)) {
        alert(
          'Informe os dois percentuais de tempo recorrente da alocação (previsível e não previsível).',
        );
        return;
      }
      if (p + u !== 100) {
        alert(
          `Os percentuais de tempo recorrente devem somar 100%. Hoje somam ${p + u}%.`,
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      await apiRequest(`/employees/${employee.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tenantId,
          name,
          role,
          level,
          email,
          status,
          observations,
          grossSalary: grossSalary ? parseFloat(grossSalary.replace(',', '.')) : null,
        })
      });

      // Alocação só é gravada quando a tela abriu a partir de uma: editar o
      // perfil do colaborador fora do contexto de ciclo não deve mexer nela.
      if (allocationId) {
        const num = (v: string) =>
          v.trim() === '' ? null : parseFloat(v.replace(',', '.'));
        await apiRequest(`/allocations/${allocationId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            tenantId,
            dailyAvailableTime: num(dailyHours),
            predictableRecurrentTimePercentage: num(predictable),
            unpredictableRecurrentTimePercentage: num(unpredictable),
          }),
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao editar colaborador.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-2xl bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20 pointer-events-auto"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Editar Colaborador Global</h2>
              <p className="text-sm text-slate-500 mt-1">Altere as informações do perfil. Isso refletirá em todo o sistema.</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 gap-6">
                  {/* DADOS PESSOAIS */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Ex: João da Silva"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Cargo / Papel *</label>
                        <input
                          type="text"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          required
                          placeholder="Ex: Analista Fiscal"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nível</label>
                        <select
                          value={level}
                          onChange={(e) => setLevel(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        >
                          <option value="">Selecione</option>
                          <option value="Estagiário">Estagiário</option>
                          <option value="Júnior">Júnior</option>
                          <option value="Pleno">Pleno</option>
                          <option value="Sênior">Sênior</option>
                          <option value="Especialista">Especialista</option>
                          <option value="Gerente">Gerente</option>
                          <option value="Diretor">Diretor</option>
                          <option value="Sócio">Sócio</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Salário Bruto (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={grossSalary}
                          onChange={(e) => setGrossSalary(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Status Global</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        >
                          <option value="ACTIVE">Ativo</option>
                          <option value="INACTIVE">Inativo</option>
                        </select>
                        {employeeData?.linkedClientsCount > 0 && (
                          <p className="text-xs font-semibold text-amber-600 mt-1.5">
                            Líder ou operador em {employeeData.linkedClientsCount} cliente{employeeData.linkedClientsCount > 1 ? 's' : ''} — desativar não remove esses vínculos.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">E-mail Profissional</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@escritorio.com.br"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Observações do Colaborador</label>
                      <textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Observações adicionais..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700 h-24 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {allocationId && (
                  <div className="pt-6 mt-6 border-t border-slate-100">
                    <h4 className="text-sm font-black text-slate-800 mb-1">
                      Alocação neste ciclo
                    </h4>
                    <p className="text-xs font-medium text-slate-500 mb-4">
                      As horas disponíveis por dia são o denominador do
                      planejamento de capacidade. Os dois percentuais são
                      obrigatórios e precisam somar 100%.
                    </p>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          Horas Alocadas / Dia
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={dailyHours}
                          onChange={(e) => setDailyHours(e.target.value)}
                          placeholder="6"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          Temp. Recorr. Prev. (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={predictable}
                          onChange={(e) => setPredictable(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          Temp. Recorr. Não Prev. (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={unpredictable}
                          onChange={(e) => setUnpredictable(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto flex-1 py-4 px-4 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto flex-1 py-4 px-4 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-teal-600/30"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
          </div>
        </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
