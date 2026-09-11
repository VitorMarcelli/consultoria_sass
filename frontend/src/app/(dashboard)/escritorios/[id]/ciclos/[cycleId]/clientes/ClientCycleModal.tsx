import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@/components/ui/Portal';
import { maskCnpj, maskCpf } from '@/utils/masks';
import {
  useClientCatalog,
  isRenderableField,
  CatalogField,
  ComplexityFront,
} from '@/components/catalog/useClientCatalog';
import CatalogFieldInput from '@/components/catalog/CatalogFieldInput';
import IndexProgress from '@/components/catalog/IndexProgress';

interface ClientCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  cycleId: string;
  onSuccess: () => void;
}

// As três frentes do motor de complexidade. O escritório pode nomear a sua
// OperationalFront como quiser; o casamento entre o nome livre e a frente fixa
// é feito no backend (cc-co.input.ts).
const FRONT_STEPS: { front: ComplexityFront; label: string }[] = [
  { front: 'FISCAL', label: 'Fiscal' },
  { front: 'CONTABIL', label: 'Contábil' },
  { front: 'PESSOAL', label: 'Pessoal' },
];

function matchFront(name: string | undefined, front: ComplexityFront): boolean {
  const n = (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (front === 'FISCAL') return /fiscal|tributar|impost/.test(n);
  if (front === 'CONTABIL') return /contab|escritur|societ/.test(n);
  return /pessoal|folha|trabalhista|rh|\bdp\b/.test(n);
}

export default function ClientCycleModal({
  isOpen,
  onClose,
  tenantId,
  cycleId,
  onSuccess,
}: ClientCycleModalProps) {
  const { catalog, loading: loadingCatalog, error: catalogError, fieldsOf } =
    useClientCatalog();

  const [fronts, setFronts] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // Identificação — campos com coluna própria no banco.
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [document, setDocument] = useState('');
  const [isCpf, setIsCpf] = useState(false);
  const [monthlyFee, setMonthlyFee] = useState('');
  const [entryDate, setEntryDate] = useState('');

  // Respostas do catálogo: bloco MESTRE e um mapa por frente.
  const [masterAnswers, setMasterAnswers] = useState<Record<string, string>>({});
  const [frontAnswers, setFrontAnswers] = useState<
    Record<ComplexityFront, Record<string, string>>
  >({ FISCAL: {}, CONTABIL: {}, PESSOAL: {} });

  // Responsáveis por frente. Ficam fora de frontAnswers porque são relação
  // com Employee, gravada em coluna própria — é por esse id que o Diagnóstico
  // agrupa o coeficiente por responsável.
  const [owners, setOwners] = useState<
    Record<ComplexityFront, { primary: string; secondary: string }>
  >({
    FISCAL: { primary: '', secondary: '' },
    CONTABIL: { primary: '', secondary: '' },
    PESSOAL: { primary: '', secondary: '' },
  });
  const [employees, setEmployees] = useState<any[]>([]);

  // Escopo contratado — é o gatilho que decide quais passos existem.
  const [scope, setScope] = useState<Record<ComplexityFront, boolean>>({
    FISCAL: false,
    CONTABIL: false,
    PESSOAL: false,
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const masterFields = useMemo(
    () => fieldsOf('MESTRE').filter(isRenderableField),
    [catalog],
  );

  // Os passos existentes dependem do escopo marcado: quem não contrata a
  // frente não responde as perguntas dela. É a semântica de "Gatilho" do
  // template, e é o que impede o formulário de virar um questionário gigante.
  const activeFronts = FRONT_STEPS.filter((s) => scope[s.front]);
  const steps = ['MESTRE', ...activeFronts.map((f) => f.front)];
  const currentStep = steps[stepIndex] as 'MESTRE' | ComplexityFront;
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }
    loadFronts();
  }, [isOpen]);

  const loadFronts = async () => {
    setIsFetching(true);
    try {
      const [data, equipe] = await Promise.all([
        apiRequest(`/structures/fronts?tenantId=${tenantId}`),
        apiRequest(`/employees?tenantId=${tenantId}`),
      ]);
      setFronts(data || []);
      setEmployees(Array.isArray(equipe) ? equipe : []);
    } catch (err) {
      console.error('Erro ao buscar frentes ou equipe:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const resetForm = () => {
    setName('');
    setTradeName('');
    setDocument('');
    setIsCpf(false);
    setMonthlyFee('');
    setEntryDate('');
    setMasterAnswers({});
    setFrontAnswers({ FISCAL: {}, CONTABIL: {}, PESSOAL: {} });
    setScope({ FISCAL: false, CONTABIL: false, PESSOAL: false });
    setOwners({
      FISCAL: { primary: '', secondary: '' },
      CONTABIL: { primary: '', secondary: '' },
      PESSOAL: { primary: '', secondary: '' },
    });
    setStepIndex(0);
    setError(null);
  };

  const handleDocumentChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    // Pessoa física, produtor rural PF e empregador doméstico entram por CPF —
    // o formulário antigo exigia 14 dígitos e bloqueava esses cadastros.
    const cpf = isCpf || digits.length <= 11;
    setDocument(cpf ? maskCpf(raw) : maskCnpj(raw));
  };

  const setMaster = (key: string, value: string) =>
    setMasterAnswers((prev) => ({ ...prev, [key]: value }));

  const setFront = (front: ComplexityFront) => (key: string, value: string) =>
    setFrontAnswers((prev) => ({
      ...prev,
      [front]: { ...prev[front], [key]: value },
    }));

  // Descobre o id da OperationalFront do escritório que corresponde à frente
  // do motor. Sem isso não há onde alocar o cliente.
  const frontIdFor = (front: ComplexityFront): string | null =>
    fronts.find((f) => matchFront(f.name, front))?.id ?? null;

  const validateMaster = (): string | null => {
    if (!name.trim()) return 'Informe a razão social ou o nome.';
    const digits = document.replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 14)
      return 'Informe um CNPJ (14 dígitos) ou CPF (11 dígitos) válido.';
    if (!scope.FISCAL && !scope.CONTABIL && !scope.PESSOAL)
      return 'Marque ao menos uma frente contratada.';
    for (const s of FRONT_STEPS) {
      if (scope[s.front] && !frontIdFor(s.front))
        return `O escritório não tem uma frente cadastrada que corresponda a "${s.label}".`;
    }
    return null;
  };

  const goNext = () => {
    if (currentStep === 'MESTRE') {
      const problem = validateMaster();
      if (problem) return setError(problem);
    }
    setError(null);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goBack = () => {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleSubmit = async () => {
    const problem = validateMaster();
    if (problem) {
      setStepIndex(0);
      return setError(problem);
    }

    setIsSaving(true);
    setError(null);
    try {
      const digits = document.replace(/\D/g, '');
      const chosen = FRONT_STEPS.filter((s) => scope[s.front]);
      const firstFrontId = frontIdFor(chosen[0].front) as string;

      // 1. Cria o cliente já alocado na primeira frente contratada.
      const result = await apiRequest('/clients', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          cycleId,
          name,
          tradeName,
          cnpj: digits,
          monthlyFee: monthlyFee ? Number(monthlyFee) : null,
          entryDate: entryDate || null,
          // Guarda também nas colunas legadas, que as telas antigas ainda leem.
          taxRegime: masterAnswers['MESTRE__REGIME_TRIBUTARIO'] || null,
          segment: masterAnswers['MESTRE__SEGMENTO'] || null,
          revenueBracket:
            masterAnswers['MESTRE__FAIXA_FATURAMENTO_ANUAL'] || null,
          classification: masterAnswers['MESTRE__CLASSIFICACAO_A_D'] || null,
          status: masterAnswers['MESTRE__STATUS_CONTRATO'] || 'ACTIVE',
          observations: masterAnswers['MESTRE__OBSERVACOES_GERAIS'] || null,
          frontId: firstFrontId,
        }),
      });

      const clientId = result?.client?.id ?? result?.id;
      if (!clientId) throw new Error('O servidor não devolveu o cliente criado.');

      // 2. Aloca nas demais frentes contratadas.
      for (const s of chosen.slice(1)) {
        await apiRequest(`/management-cycles/${cycleId}/clients`, {
          method: 'POST',
          body: JSON.stringify({
            tenantId,
            clientId,
            frontId: frontIdFor(s.front),
          }),
        });
      }

      // 3. Grava as respostas e deixa o backend calcular. O índice nunca é
      //    enviado pela tela — é sempre derivado no servidor.
      for (const s of chosen) {
        await apiRequest(
          `/cc-co/clients/${clientId}/fronts/${frontIdFor(s.front)}/answers`,
          {
            method: 'POST',
            body: JSON.stringify({
              tenantId,
              profileType: masterAnswers['MESTRE__PERFIL_DO_CLIENTE'] || null,
              masterAnswers,
              frontAnswers: frontAnswers[s.front],
              primaryOwnerId: owners[s.front].primary || null,
              secondaryOwnerId: owners[s.front].secondary || null,
            }),
          },
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao cadastrar o cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const stepTitle =
    currentStep === 'MESTRE'
      ? 'Dados gerais e escopo contratado'
      : `Frente ${FRONT_STEPS.find((f) => f.front === currentStep)?.label}`;

  const inputClasses =
    'w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm font-medium ' +
    'focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all';

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
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      Novo Cliente
                      <span className="text-xs font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded-lg">
                        Passo {stepIndex + 1} de {steps.length}
                      </span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{stepTitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {steps.length > 1 && (
                  <div className="flex gap-1.5 mt-4">
                    {steps.map((s, i) => (
                      <div
                        key={s}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= stepIndex ? 'bg-teal-500' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {loadingCatalog || isFetching ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                  </div>
                ) : catalogError ? (
                  <p className="text-sm font-medium text-rose-600">
                    {catalogError}
                  </p>
                ) : (
                  <div className="space-y-6">
                    {currentStep === 'MESTRE' && (
                      <>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Razão Social / Nome *
                            </label>
                            <input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className={inputClasses}
                              placeholder="Ex: Empresa Exemplo LTDA"
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
                              className={inputClasses}
                              placeholder={
                                isCpf ? '000.000.000-00' : '00.000.000/0000-00'
                              }
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
                              placeholder="0.00"
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

                        <div className="grid sm:grid-cols-2 gap-4">
                          {masterFields.map((f: CatalogField) => (
                            <CatalogFieldInput
                              key={f.key}
                              field={f}
                              value={masterAnswers[f.key] ?? ''}
                              onChange={setMaster}
                            />
                          ))}
                        </div>

                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3">
                            Frentes contratadas
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {FRONT_STEPS.map((s) => {
                              const disponivel = !!frontIdFor(s.front);
                              const on = scope[s.front];
                              return (
                                <button
                                  key={s.front}
                                  type="button"
                                  disabled={!disponivel}
                                  onClick={() =>
                                    setScope((p) => ({
                                      ...p,
                                      [s.front]: !p[s.front],
                                    }))
                                  }
                                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors flex items-center gap-2 ${
                                    on
                                      ? 'bg-teal-600 text-white border-teal-600'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'
                                  } ${!disponivel ? 'opacity-40 cursor-not-allowed' : ''}`}
                                  title={
                                    disponivel
                                      ? undefined
                                      : 'O escritório não tem esta frente cadastrada'
                                  }
                                >
                                  {on && <Check className="w-4 h-4" />}
                                  {s.label}
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-3 text-[11px] font-medium text-slate-500">
                            Só aparecem os passos das frentes marcadas. Frente
                            não contratada fica fora do cálculo — não é tratada
                            como complexidade zero.
                          </p>
                        </div>
                      </>
                    )}

                    {currentStep !== 'MESTRE' && (
                      <>
                        <IndexProgress
                          front={currentStep}
                          masterFields={masterFields}
                          frontFields={fieldsOf(currentStep).filter(
                            isRenderableField,
                          )}
                          answers={{
                            ...masterAnswers,
                            ...frontAnswers[currentStep],
                          }}
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Responsável principal
                            </label>
                            <select
                              value={owners[currentStep].primary}
                              onChange={(e) =>
                                setOwners((p) => ({
                                  ...p,
                                  [currentStep]: {
                                    ...p[currentStep],
                                    primary: e.target.value,
                                  },
                                }))
                              }
                              className={inputClasses}
                            >
                              <option value="">Selecione...</option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Responsável secundário
                            </label>
                            <select
                              value={owners[currentStep].secondary}
                              onChange={(e) =>
                                setOwners((p) => ({
                                  ...p,
                                  [currentStep]: {
                                    ...p[currentStep],
                                    secondary: e.target.value,
                                  },
                                }))
                              }
                              className={inputClasses}
                            >
                              <option value="">Nenhum</option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {fieldsOf(currentStep)
                            .filter(isRenderableField)
                            .map((f: CatalogField) => (
                              <CatalogFieldInput
                                key={f.key}
                                field={f}
                                value={frontAnswers[currentStep][f.key] ?? ''}
                                onChange={setFront(currentStep)}
                              />
                            ))}
                        </div>
                      </>
                    )}

                    {error && (
                      <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                        {error}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-between gap-3">
                <button
                  type="button"
                  onClick={stepIndex === 0 ? onClose : goBack}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white transition-colors text-sm flex items-center gap-2"
                >
                  {stepIndex === 0 ? (
                    'Cancelar'
                  ) : (
                    <>
                      <ChevronLeft className="w-4 h-4" /> Voltar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isSaving || loadingCatalog}
                  onClick={isLastStep ? handleSubmit : goNext}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isLastStep ? (
                    'Cadastrar cliente'
                  ) : (
                    <>
                      Avançar <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
