import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@/components/ui/Portal';
import { maskCnpj, maskCpf } from '@/utils/masks';
import {
  useClientCatalog,
  isRenderableField,
  CatalogField,
} from '@/components/catalog/useClientCatalog';
import CatalogFieldInput from '@/components/catalog/CatalogFieldInput';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: any) => Promise<void>;
  initialData?: any;
  isLoading?: boolean;
}

// Edição do bloco MESTRE do cadastro — os dados que valem para todas as
// frentes. As características de cada frente são editadas na ficha do cliente
// (FrontCatalogEditor), porque é lá que o índice daquela frente é recalculado.
//
// Os campos vêm do catálogo, não escritos à mão. Antes desta troca, criar um
// cliente pelo formulário novo e depois editá-lo aqui devolvia o regime para
// o valor do dropdown antigo, divergindo do que estava em catalogAnswers —
// duas verdades sobre o mesmo cliente.
export default function ClientModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isLoading,
}: ClientModalProps) {
  const { loading: loadingCatalog, fieldsOf } = useClientCatalog();

  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [document, setDocument] = useState('');
  const [isCpf, setIsCpf] = useState(false);
  const [monthlyFee, setMonthlyFee] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const masterFields = useMemo(
    () => fieldsOf('MESTRE').filter(isRenderableField),
    [loadingCatalog],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!initialData) {
      setName('');
      setTradeName('');
      setDocument('');
      setIsCpf(false);
      setMonthlyFee('');
      setEntryDate('');
      setAnswers({});
      return;
    }

    setName(initialData.name || '');
    setTradeName(initialData.tradeName || '');

    const digits = String(initialData.cnpj || '').replace(/\D/g, '');
    setIsCpf(digits.length === 11);
    setDocument(digits.length === 11 ? maskCpf(digits) : maskCnpj(digits));

    setMonthlyFee(
      initialData.monthlyFee != null ? String(initialData.monthlyFee) : '',
    );
    setEntryDate(
      initialData.entryDate
        ? String(initialData.entryDate).slice(0, 10)
        : '',
    );

    const gravadas =
      initialData.catalogAnswers &&
      typeof initialData.catalogAnswers === 'object' &&
      !Array.isArray(initialData.catalogAnswers)
        ? { ...initialData.catalogAnswers }
        : {};
    // profileType tem coluna própria e é o campo canônico do perfil.
    if (initialData.profileType) {
      gravadas['MESTRE__PERFIL_DO_CLIENTE'] = initialData.profileType;
    }
    setAnswers(gravadas);
  }, [isOpen, initialData]);

  const handleDocumentChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const cpf = isCpf || digits.length <= 11;
    setDocument(cpf ? maskCpf(raw) : maskCnpj(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = document.replace(/\D/g, '');

    await onSave({
      name,
      tradeName,
      cnpj: digits,
      monthlyFee: monthlyFee ? Number(monthlyFee) : null,
      entryDate: entryDate || null,
      profileType: answers['MESTRE__PERFIL_DO_CLIENTE'] || null,
      // Respostas canônicas do catálogo — é o que o motor lê.
      catalogAnswers: answers,
      // Colunas legadas, mantidas em sincronia para as telas ainda não
      // migradas não divergirem do catálogo.
      taxRegime: answers['MESTRE__REGIME_TRIBUTARIO'] || null,
      segment: answers['MESTRE__SEGMENTO'] || null,
      revenueBracket: answers['MESTRE__FAIXA_FATURAMENTO_ANUAL'] || null,
      classification: answers['MESTRE__CLASSIFICACAO_A_D'] || null,
      status: answers['MESTRE__STATUS_CONTRATO'] || undefined,
      observations: answers['MESTRE__OBSERVACOES_GERAIS'] || null,
    });
  };

  const inputClasses =
    'w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm font-medium ' +
    'focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all';

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {initialData ? 'Editar Cliente' : 'Novo Cliente'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Dados gerais, válidos para todas as frentes. As
                    características de cada frente são editadas na ficha do
                    cliente.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-6 overflow-y-auto flex-1"
              >
                {loadingCatalog ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Razão Social / Nome *
                        </label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Nome Fantasia
                        </label>
                        <input
                          value={tradeName}
                          onChange={(e) => setTradeName(e.target.value)}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          <span>{isCpf ? 'CPF *' : 'CNPJ *'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCpf(!isCpf);
                              setDocument('');
                            }}
                            className="text-[10px] font-bold text-teal-600 hover:text-teal-700 normal-case"
                          >
                            usar {isCpf ? 'CNPJ' : 'CPF'}
                          </button>
                        </label>
                        <input
                          value={document}
                          onChange={(e) => handleDocumentChange(e.target.value)}
                          required
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Honorário Faturado (R$)
                        </label>
                        <input
                          type="number"
                          value={monthlyFee}
                          onChange={(e) => setMonthlyFee(e.target.value)}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Data de Início (Operação)
                        </label>
                        <input
                          type="date"
                          value={entryDate}
                          onChange={(e) => setEntryDate(e.target.value)}
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {masterFields.map((f: CatalogField) => (
                        <CatalogFieldInput
                          key={f.key}
                          field={f}
                          value={answers[f.key] ?? ''}
                          onChange={(key, value) =>
                            setAnswers((prev) => ({ ...prev, [key]: value }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </form>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || loadingCatalog}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
