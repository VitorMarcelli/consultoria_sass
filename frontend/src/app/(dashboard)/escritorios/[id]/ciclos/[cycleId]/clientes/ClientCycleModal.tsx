import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import FrontClassificationForm from '@/components/FrontClassificationForm';

interface ClientCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  cycleId: string;
  onSuccess: () => void;
}

export default function ClientCycleModal({ isOpen, onClose, tenantId, cycleId, onSuccess }: ClientCycleModalProps) {
  const [fronts, setFronts] = useState<any[]>([]);
  const [subdivisions, setSubdivisions] = useState<any[]>([]);
  
  // Client Data
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [taxRegime, setTaxRegime] = useState('SIMPLES_NACIONAL');
  const [segment, setSegment] = useState('');
  const [revenueBracket, setRevenueBracket] = useState('');
  const [hasEconomicGroup, setHasEconomicGroup] = useState(false);
  const [economicGroupName, setEconomicGroupName] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [classification, setClassification] = useState('A');
  const [status, setStatus] = useState('ACTIVE');
  const [observations, setObservations] = useState('');
  
  // Allocation Data
  const [selectedFront, setSelectedFront] = useState('');
  const [selectedSubdivision, setSelectedSubdivision] = useState('');
  const [classificationData, setClassificationData] = useState<any>({});
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFronts();
    } else {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedFront) {
      const front = fronts.find(f => f.id === selectedFront);
      setSubdivisions(front?.subdivisions || []);
      setSelectedSubdivision('');
    } else {
      setSubdivisions([]);
    }
  }, [selectedFront]);

  const loadFronts = async () => {
    setIsFetching(true);
    try {
      const data = await apiRequest(`/structures/fronts?tenantId=${tenantId}`);
      setFronts(data || []);
    } catch (err) {
      console.error('Error fetching fronts:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const resetForm = () => {
    setName('');
    setTradeName('');
    setCnpj('');
    setTaxRegime('SIMPLES_NACIONAL');
    setSegment('');
    setRevenueBracket('');
    setHasEconomicGroup(false);
    setEconomicGroupName('');
    setMonthlyFee('');
    setClassification('A');
    setStatus('ACTIVE');
    setObservations('');
    setSelectedFront('');
    setSelectedSubdivision('');
    setClassificationData({});
    setStep(1);
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    
    // Format
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
    
    setCnpj(value);
  };

  const handleNextStep = () => {
    if (!name || !cnpj) {
      alert('Preencha os campos obrigatórios (Razão Social e CNPJ).');
      return;
    }
    const unmaskedCnpj = cnpj.replace(/\D/g, '');
    if (unmaskedCnpj.length !== 14) {
      alert('CNPJ inválido.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFront) {
      alert('Selecione uma Frente para alocar.');
      return;
    }

    const unmaskedCnpj = cnpj.replace(/\D/g, '');

    setIsLoading(true);
    try {
      const result = await apiRequest(`/clients`, {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          cycleId,
          name,
          tradeName,
          cnpj: unmaskedCnpj,
          taxRegime,
          segment,
          revenueBracket,
          hasEconomicGroup,
          economicGroupName,
          monthlyFee: monthlyFee ? Number(monthlyFee) : null,
          classification,
          status,
          observations,
          frontId: selectedFront,
          subdivisionId: selectedSubdivision || null
        })
      });

      if (Object.keys(classificationData).length > 0 && result?.client?.id) {
        await apiRequest(`/clients/${result.client.id}/fronts/${selectedFront}/classification`, {
          method: 'PUT',
          body: JSON.stringify({ ...classificationData, tenantId })
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao criar e alocar cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none">
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
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-xl bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20 pointer-events-auto"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Novo Cliente
                <span className="text-xs font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded-lg">Passo {step} de 2</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {step === 1 ? 'Cadastre os dados básicos da empresa.' : 'Alocação de escopo e definições de parâmetros.'}
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            {isFetching ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (step === 2) handleSubmit(e); }} className="space-y-6">
                
                {step === 1 && (
                  <div className="space-y-4 animate-in fade-in">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Dados da Empresa</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Razão Social *</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          placeholder="Ex: Empresa Exemplo LTDA"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome Fantasia</label>
                        <input
                          type="text"
                          value={tradeName}
                          onChange={(e) => setTradeName(e.target.value)}
                          placeholder="Ex: Empresa Exemplo"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">CNPJ *</label>
                        <input
                          type="text"
                          value={cnpj}
                          onChange={handleCnpjChange}
                          required
                          maxLength={18}
                          placeholder="00.000.000/0000-00"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Regime Tributário</label>
                        <select
                          value={taxRegime}
                          onChange={(e) => setTaxRegime(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        >
                          <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                          <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                          <option value="LUCRO_REAL">Lucro Real</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Segmento</label>
                        <input
                          type="text"
                          value={segment}
                          onChange={(e) => setSegment(e.target.value)}
                          placeholder="Ex: Varejo, Indústria..."
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Faixa de Faturamento</label>
                        <input
                          type="text"
                          value={revenueBracket}
                          onChange={(e) => setRevenueBracket(e.target.value)}
                          placeholder="Ex: Até R$ 1M"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Honorário Mensal (R$)</label>
                        <input
                          type="number"
                          value={monthlyFee}
                          onChange={(e) => setMonthlyFee(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Classificação</label>
                        <select
                          value={classification}
                          onChange={(e) => setClassification(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        >
                          <option value="ACTIVE">Ativo</option>
                          <option value="INACTIVE">Inativo</option>
                          <option value="PREPARATION">Em Preparação</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2 flex flex-col justify-center mt-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasEconomicGroup}
                            onChange={(e) => setHasEconomicGroup(e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-5 h-5"
                          />
                          Pertence a Grupo Empresarial?
                        </label>
                      </div>

                      {hasEconomicGroup && (
                        <div className="sm:col-span-2 animate-in fade-in">
                          <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Grupo Empresarial</label>
                          <input
                            type="text"
                            value={economicGroupName}
                            onChange={(e) => setEconomicGroupName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                          />
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Observações Cadastrais</label>
                        <textarea
                          value={observations}
                          onChange={(e) => setObservations(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                          placeholder="Anotações sobre o cliente..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4 pt-2 animate-in fade-in">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Alocação e Parâmetros</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Frente *</label>
                        <select
                          value={selectedFront}
                          onChange={(e) => setSelectedFront(e.target.value)}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                        >
                          <option value="">Selecione uma frente</option>
                          {fronts.map(front => (
                            <option key={front.id} value={front.id}>{front.name}</option>
                          ))}
                        </select>
                      </div>

                      {selectedFront && subdivisions.length > 0 && (
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Célula (Opcional)</label>
                          <select
                            value={selectedSubdivision}
                            onChange={(e) => setSelectedSubdivision(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700"
                          >
                            <option value="">Selecione uma célula (opcional)</option>
                            {subdivisions.map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {selectedFront && (
                      <FrontClassificationForm 
                        tenantId={tenantId}
                        frontName={fronts.find(f => f.id === selectedFront)?.name || ''}
                        value={classificationData}
                        onChange={setClassificationData}
                      />
                    )}
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  {step === 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="flex-1 py-3 px-4 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors"
                      >
                        Avançar →
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 py-3 px-4 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        ← Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || !selectedFront}
                        className="flex-1 py-3 px-4 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finalizar e Alocar'}
                      </button>
                    </>
                  )}
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
