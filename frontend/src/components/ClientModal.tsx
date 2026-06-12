import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: any) => Promise<void>;
  initialData?: any;
  isLoading?: boolean;
}

export default function ClientModal({ isOpen, onClose, onSave, initialData, isLoading }: ClientModalProps) {
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

  // Format CNPJ as user types: 00.000.000/0000-00
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

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setTradeName(initialData.tradeName || '');
        // Apply CNPJ mask to initial data
        let initialCnpj = initialData.cnpj || '';
        if (initialCnpj && initialCnpj.length === 14 && !initialCnpj.includes('.')) {
           initialCnpj = initialCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        }
        setCnpj(initialCnpj);
        setTaxRegime(initialData.taxRegime || 'SIMPLES_NACIONAL');
        setSegment(initialData.segment || '');
        setRevenueBracket(initialData.revenueBracket || '');
        setHasEconomicGroup(initialData.hasEconomicGroup || false);
        setEconomicGroupName(initialData.economicGroupName || '');
        setMonthlyFee(initialData.monthlyFee ? String(initialData.monthlyFee) : '');
        setClassification(initialData.classification || 'A');
        setStatus(initialData.status || 'ACTIVE');
        setObservations(initialData.observations || '');
      } else {
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
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Unmask CNPJ before saving
    const unmaskedCnpj = cnpj.replace(/\D/g, '');
    
    await onSave({
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
      observations
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {initialData ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Preencha as informações essenciais do cliente.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Razão Social *</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                placeholder="Ex: Empresa Exemplo LTDA"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Nome Fantasia</label>
              <input 
                type="text" 
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                placeholder="Ex: Empresa Exemplo"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">CNPJ *</label>
              <input 
                type="text" 
                value={cnpj}
                onChange={handleCnpjChange}
                required
                maxLength={18}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Regime Tributário</label>
              <select 
                value={taxRegime}
                onChange={e => setTaxRegime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              >
                <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                <option value="LUCRO_REAL">Lucro Real</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Segmento</label>
              <input 
                type="text" 
                value={segment}
                onChange={e => setSegment(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                placeholder="Ex: Varejo, Indústria..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Faixa de Faturamento</label>
              <input 
                type="text" 
                value={revenueBracket}
                onChange={e => setRevenueBracket(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                placeholder="Ex: Até R$ 1M"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Honorário Mensal (R$)</label>
              <input 
                type="number" 
                value={monthlyFee}
                onChange={e => setMonthlyFee(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Classificação</label>
              <select 
                value={classification}
                onChange={e => setClassification(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>

            <div className="space-y-1 flex flex-col justify-center">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={hasEconomicGroup}
                  onChange={e => setHasEconomicGroup(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                Pertence a Grupo Empresarial?
              </label>
            </div>

            {hasEconomicGroup && (
              <div className="space-y-1 animate-in fade-in">
                <label className="text-sm font-medium text-slate-700">Nome do Grupo Empresarial</label>
                <input 
                  type="text" 
                  value={economicGroupName}
                  onChange={e => setEconomicGroupName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select 
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="PREPARATION">Em Preparação</option>
              </select>
            </div>
            
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-slate-700">Observações Cadastrais</label>
              <textarea 
                value={observations}
                onChange={e => setObservations(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                placeholder="Anotações sobre o cliente..."
              />
            </div>
          </div>

          <div className="pt-6 flex gap-3 shrink-0 mt-4 border-t border-slate-100 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
