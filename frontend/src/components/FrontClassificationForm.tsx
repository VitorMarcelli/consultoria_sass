import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/utils/api';

interface FrontClassificationFormProps {
  tenantId: string;
  frontName: string;
  value: any;
  onChange: (value: any) => void;
}

export default function FrontClassificationForm({ tenantId, frontName, value, onChange }: FrontClassificationFormProps) {
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (tenantId) {
      apiRequest(`/employees?tenantId=${tenantId}`)
        .then(res => setEmployees(res || []))
        .catch(console.error);
    }
  }, [tenantId]);

  const frontType = React.useMemo(() => {
    const name = frontName.toLowerCase();
    if (name.includes('fiscal') || name.includes('tribut')) return 'FISCAL';
    if (name.includes('dp') || name.includes('pessoal') || name.includes('rh') || name.includes('humanos')) return 'HR';
    if (name.includes('contábil') || name.includes('contabil') || name.includes('contabilidade')) return 'ACCOUNTING';
    return 'OTHER';
  }, [frontName]);

  useEffect(() => {
    if (value.frontType !== frontType) {
      onChange({ ...value, frontType });
    }
  }, [frontType]);

  const handleChange = (field: string, val: any, section?: 'taxInfo' | 'hrInfo' | 'accountingInfo') => {
    if (section) {
      onChange({
        ...value,
        [section]: {
          ...(value[section] || {}),
          [field]: val
        }
      });
    } else {
      onChange({ ...value, [field]: val });
    }
  };

  const renderSelect = (label: string, field: string, options: {label: string, value: string}[], section?: any) => {
    const val = section ? (value[section]?.[field] || '') : (value[field] || '');
    return (
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
        <select
          value={val}
          onChange={(e) => handleChange(field, e.target.value, section)}
          className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
        >
          <option value="">Selecione...</option>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
    );
  };

  const renderInput = (label: string, field: string, type: string = 'text', section?: any) => {
    const val = section ? (value[section]?.[field] || '') : (value[field] || '');
    return (
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
        <input
          type={type}
          value={val}
          onChange={(e) => handleChange(field, e.target.value, section)}
          className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
        />
      </div>
    );
  };

  const renderCheckbox = (label: string, field: string, section?: any) => {
    const val = section ? (value[section]?.[field] || false) : (value[field] || false);
    return (
      <div className="flex items-center gap-2 mt-6">
        <input
          type="checkbox"
          checked={val}
          onChange={(e) => handleChange(field, e.target.checked, section)}
          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
        />
        <label className="text-sm font-medium text-slate-700">{label}</label>
      </div>
    );
  };

  return (
    <div className="space-y-6 mt-4 pt-4 border-t border-slate-200/60">
      <h6 className="text-sm font-black text-slate-800 tracking-tight">Parâmetros Globais do Cliente na Frente</h6>
      
      {/* Global Fields */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Líder Responsável</label>
          <select
            value={value.leaderId || ''}
            onChange={(e) => handleChange('leaderId', e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
          >
            <option value="">Selecione um líder</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Operador Responsável 1</label>
          <select
            value={value.operator1Id || ''}
            onChange={(e) => handleChange('operator1Id', e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
          >
            <option value="">Selecione um operador</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Operador Responsável 2</label>
          <select
            value={value.operator2Id || ''}
            onChange={(e) => handleChange('operator2Id', e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
          >
            <option value="">Selecione um operador</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        {renderSelect('Frequência de Atendimento', 'frequency', [
          {label: 'Diário', value: 'DIARIO'},
          {label: 'Semanal', value: 'SEMANAL'},
          {label: 'Quinzenal', value: 'QUINZENAL'},
          {label: 'Mensal', value: 'MENSAL'},
          {label: 'Bimestral', value: 'BIMESTRAL'},
          {label: 'Trimestral', value: 'TRIMESTRAL'},
          {label: 'Semestral', value: 'SEMESTRAL'},
          {label: 'Anual', value: 'ANUAL'}
        ])}
        {renderSelect('Percepção de Complexidade', 'complexity', [
          {label: '1 - Baixa', value: '1'},
          {label: '2 - Média', value: '2'},
          {label: '3 - Alta', value: '3'}
        ])}
      </div>

      {/* FISCAL FIELDS */}
      {frontType === 'FISCAL' && (
        <div className="space-y-4 pt-4 border-t border-slate-200/60">
          <h6 className="text-sm font-black text-slate-800 tracking-tight text-teal-700">Parâmetros Fiscais</h6>
          <div className="grid sm:grid-cols-2 gap-4">
            {renderSelect('Volume de Notas / Mês', 'monthlyNotesVolume', [
              {label: 'Até 50', value: 'ATE_50'},
              {label: '51 a 200', value: '51_200'},
              {label: '201 a 500', value: '201_500'},
              {label: 'Mais de 500', value: 'MAIS_500'}
            ], 'taxInfo')}
            {renderSelect('Nível de Automação', 'automationLevel', [
              {label: 'Manual', value: 'MANUAL'},
              {label: 'Parcial', value: 'PARCIAL'},
              {label: 'Automatizada', value: 'AUTOMATIZADA'}
            ], 'taxInfo')}
            {renderSelect('Sistema Fiscal', 'fiscalSystem', [
              {label: 'Domínio', value: 'DOMINIO'},
              {label: 'Alterdata', value: 'ALTERDATA'},
              {label: 'Nasajon', value: 'NASAJON'},
              {label: 'Outro', value: 'OUTRO'}
            ], 'taxInfo')}
            {renderSelect('Plataforma de Notas', 'notesPlatform', [
              {label: 'Sieg', value: 'SIEG'},
              {label: 'Arquivei', value: 'ARQUIVEI'},
              {label: 'Outro', value: 'OUTRO'}
            ], 'taxInfo')}
            {renderInput('Formas NFe Entrada', 'inNfeMethods', 'text', 'taxInfo')}
            {renderInput('Formas NFe Saída', 'outNfeMethods', 'text', 'taxInfo')}
            {renderCheckbox('Possui Regime Especial?', 'hasSpecialRegime', 'taxInfo')}
            {value.taxInfo?.hasSpecialRegime && renderInput('Descrição do Regime', 'specialRegimeDescription', 'text', 'taxInfo')}
          </div>
        </div>
      )}

      {/* HR FIELDS */}
      {frontType === 'HR' && (
        <div className="space-y-4 pt-4 border-t border-slate-200/60">
          <h6 className="text-sm font-black text-slate-800 tracking-tight text-teal-700">Parâmetros de DP/Pessoal</h6>
          <div className="grid sm:grid-cols-2 gap-4">
            {renderInput('Qtd. Funcionários na Folha', 'employeesCount', 'number', 'hrInfo')}
            {renderInput('Qtd. Pró-labores', 'prolaboreCount', 'number', 'hrInfo')}
            {renderInput('Qtd. Domésticas', 'domesticsCount', 'number', 'hrInfo')}
            {renderSelect('Recebimento de Ponto', 'pointReceiptMethod', [
              {label: 'Sistema/App', value: 'SISTEMA'},
              {label: 'Planilha', value: 'PLANILHA'},
              {label: 'Papel/Manual', value: 'MANUAL'}
            ], 'hrInfo')}
            {renderSelect('Tipo de Processamento', 'processingType', [
              {label: 'Normal', value: 'NORMAL'},
              {label: 'Complexo (Múltiplos sindicatos)', value: 'COMPLEXO'}
            ], 'hrInfo')}
            {renderCheckbox('Admissões/Rescisões Frequentes?', 'frequentAdmissions', 'hrInfo')}
          </div>
        </div>
      )}

      {/* ACCOUNTING FIELDS */}
      {frontType === 'ACCOUNTING' && (
        <div className="space-y-4 pt-4 border-t border-slate-200/60">
          <h6 className="text-sm font-black text-slate-800 tracking-tight text-teal-700">Parâmetros Contábeis</h6>
          <div className="grid sm:grid-cols-2 gap-4">
            {renderSelect('Regime de Escrituração', 'bookkeepingRegime', [
              {label: 'Caixa', value: 'CAIXA'},
              {label: 'Competência', value: 'COMPETENCIA'}
            ], 'accountingInfo')}
            {renderInput('Último Mês de Fechamento', 'lastClosingMonth', 'text', 'accountingInfo')}
            {renderSelect('Período de Fechamento', 'closingPeriod', [
              {label: 'Mensal', value: 'MENSAL'},
              {label: 'Trimestral', value: 'TRIMESTRAL'},
              {label: 'Anual', value: 'ANUAL'}
            ], 'accountingInfo')}
            {renderSelect('Nível de Integração', 'integrationLevel', [
              {label: 'Sem Integração', value: 'NENHUMA'},
              {label: 'Parcial (Planilhas)', value: 'PARCIAL'},
              {label: 'Total (Sistemas via API)', value: 'TOTAL'}
            ], 'accountingInfo')}
            {renderSelect('Total de Lançamentos', 'launchesVolume', [
              {label: 'Até 100', value: 'ATE_100'},
              {label: '101 a 500', value: '101_500'},
              {label: 'Mais de 500', value: 'MAIS_500'}
            ], 'accountingInfo')}
          </div>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Particularidades / Observações Livres</label>
        <textarea
          value={value.particulars || ''}
          onChange={(e) => handleChange('particulars', e.target.value)}
          rows={3}
          className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
          placeholder="Ex: Cliente só envia documentos no dia 15..."
        />
      </div>

    </div>
  );
}
