"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Plus, Trash2, Loader2, Users } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import * as XLSX from 'xlsx';
import CsvImportModal from '@/components/CsvImportModal';
import { motion, AnimatePresence } from 'framer-motion';

const tableVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function CadastroColaboradoresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [colaboradores, setColaboradores] = useState<{id: string, nome: string, cargo: string, nivel: string, email: string, salario_bruto: string, status: string, observations: string, dbId?: string}[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await apiRequest(`/employees?tenantId=${id}`);
        if (data && data.length > 0) {
          const loadedRows = data.map((emp: any) => ({
            id: crypto.randomUUID(),
            nome: emp.name,
            cargo: emp.role,
            nivel: emp.level || '',
            email: emp.email || '',
            salario_bruto: emp.grossSalary ? emp.grossSalary.toString() : '',
            status: emp.status || 'ACTIVE',
            observations: emp.observations || '',
            dbId: emp.id
          }));
          setColaboradores(loadedRows);
        } else {
          // Linha vazia por padrão
          setColaboradores([{ id: crypto.randomUUID(), nome: '', cargo: '', nivel: '', email: '', salario_bruto: '', status: 'ACTIVE', observations: '' }]);
        }
      } catch (err) {
        console.error('Erro ao buscar colaboradores:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSaveAndNext = async () => {
    try {
      setIsSaving(true);
      for (const row of colaboradores) {
        if (!row.nome.trim() || !row.cargo.trim()) continue;
        
        const payload = {
          tenantId: id,
          name: row.nome,
          role: row.cargo,
          level: row.nivel,
          email: row.email,
          status: row.status,
          observations: row.observations,
          grossSalary: row.salario_bruto ? parseFloat(row.salario_bruto.replace(',', '.')) : null
        };
        
        if (row.dbId) {
          await apiRequest(`/employees/${row.dbId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          });
        } else {
          await apiRequest(`/employees`, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        }
      }
      router.push(`/escritorios/${id}/ciclos`); // After Equipe, next flow is usually Gestão de Ciclos
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar os colaboradores.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRow = () => {
    setColaboradores([...colaboradores, { id: crypto.randomUUID(), nome: '', cargo: '', nivel: '', email: '', salario_bruto: '', status: 'ACTIVE', observations: '' }]);
  };

  const handleDeleteRow = async (rowId: string) => {
    const row = colaboradores.find(c => c.id === rowId);
    if (!row) return;

    if (row.dbId) {
       if (confirm('Deseja excluir este colaborador do banco de dados?')) {
          try {
            await apiRequest(`/employees/${row.dbId}?tenantId=${id}`, { method: 'DELETE' });
            setColaboradores(colaboradores.filter(c => c.id !== rowId));
          } catch (err) { alert('Erro ao excluir colaborador'); }
       }
    } else {
      setColaboradores(colaboradores.filter(c => c.id !== rowId));
    }
  };

  const handleImportCsv = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          const newRows = data.map((row: any) => {
            const keys = Object.keys(row);
            const getVal = (possibleNames: string[]) => {
              const key = keys.find(k => possibleNames.some(pn => k.toLowerCase().includes(pn)));
              return key ? row[key] : '';
            };

            return {
              id: crypto.randomUUID(),
              nome: getVal(['nome', 'name', 'colaborador', 'funcionário']),
              cargo: getVal(['cargo', 'papel', 'role', 'função', 'funcao']),
              nivel: getVal(['nível', 'nivel', 'senioridade']) || '',
              email: getVal(['email', 'e-mail']),
              salario_bruto: getVal(['salário', 'salario', 'bruto', 'remuneração']) || '',
              status: 'ACTIVE',
              observations: getVal(['obs', 'observações', 'observacao', 'observacoes']) || ''
            };
          }).filter(r => r.nome || r.cargo);

          if (newRows.length > 0) {
            setColaboradores(prev => {
              // remove initial empty row if exists
              if (prev.length === 1 && !prev[0].nome && !prev[0].cargo) {
                return newRows;
              }
              return [...prev, ...newRows];
            });
            alert(`${newRows.length} colaboradores processados! Verifique na tela e clique em "Salvar e Ir Para Alocação".`);
            setIsImportModalOpen(false);
            resolve();
          } else {
            reject(new Error('Não foi possível encontrar colunas de Nome e Cargo na planilha.'));
          }
        } catch (err) {
          console.error(err);
          reject(new Error('Erro ao processar o arquivo.'));
        }
      };
      reader.readAsBinaryString(file);
    });
  };

  return (
    <div className="relative">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/30 shrink-0">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Equipe do Escritório</h2>
            <p className="text-slate-500 font-medium mt-1">Insira os colaboradores que atuam ativamente na operação.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsImportModalOpen(true)} 
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-sm shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Importar RH (Planilha)
          </button>
          <button 
            onClick={handleAddRow} 
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-teal-600 transition-all font-bold text-sm shadow-xl hover:shadow-teal-600/30"
          >
            <Plus className="w-4 h-4" />
            Adicionar Manual
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center items-center py-32"><Loader2 className="w-10 h-10 animate-spin text-teal-600" /></div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-200 whitespace-nowrap">
                <tr>
                  <th className="px-6 py-5 font-bold">Nome Completo</th>
                  <th className="px-6 py-5 font-bold">Cargo / Papel</th>
                  <th className="px-6 py-5 font-bold">Nível</th>
                  <th className="px-6 py-5 font-bold">E-mail Profissional</th>
                  <th className="px-6 py-5 font-bold">Salário Bruto (R$)</th>
                  <th className="px-6 py-5 font-bold">Status</th>
                  <th className="px-6 py-5 font-bold">Observações</th>
                  <th className="px-6 py-5 text-right font-bold w-24">Ações</th>
                </tr>
              </thead>
              <motion.tbody 
                variants={tableVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-slate-100"
              >
                <AnimatePresence>
                  {colaboradores.map((colaborador) => (
                    <motion.tr 
                      variants={rowVariants}
                      key={colaborador.id} 
                      className="bg-white hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-6 py-5 min-w-[200px]">
                        <input 
                          type="text" 
                          value={colaborador.nome}
                          placeholder="Nome"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all hover:border-slate-300 shadow-sm"
                          onChange={(e) => {
                            const newRows = [...colaboradores];
                            newRows.find(c => c.id === colaborador.id)!.nome = e.target.value;
                            setColaboradores(newRows);
                          }}
                        />
                      </td>
                      <td className="px-6 py-5 min-w-[150px]">
                        <input 
                          type="text" 
                          value={colaborador.cargo}
                          placeholder="Ex: Analista Fiscal"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all hover:border-slate-300 shadow-sm"
                          onChange={(e) => {
                            const newRows = [...colaboradores];
                            newRows.find(c => c.id === colaborador.id)!.cargo = e.target.value;
                            setColaboradores(newRows);
                          }}
                        />
                      </td>
                      <td className="px-6 py-5 min-w-[120px]">
                        <select 
                          value={colaborador.nivel}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all hover:border-slate-300 shadow-sm"
                          onChange={(e) => {
                            const newRows = [...colaboradores];
                            newRows.find(c => c.id === colaborador.id)!.nivel = e.target.value;
                            setColaboradores(newRows);
                          }}
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
                      </td>
                      <td className="px-6 py-5 min-w-[200px]">
                        <input 
                          type="email" 
                          value={colaborador.email}
                          placeholder="email@escritorio.com"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all hover:border-slate-300 shadow-sm"
                          onChange={(e) => {
                            const newRows = [...colaboradores];
                            newRows.find(c => c.id === colaborador.id)!.email = e.target.value;
                            setColaboradores(newRows);
                          }}
                        />
                      </td>
                      <td className="px-6 py-5 min-w-[150px]">
                        <input 
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={colaborador.salario_bruto}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all hover:border-slate-300 shadow-sm"
                          onChange={(e) => {
                            const newRows = [...colaboradores];
                            newRows.find(c => c.id === colaborador.id)!.salario_bruto = e.target.value;
                            setColaboradores(newRows);
                          }}
                        />
                      </td>
                      <td className="px-6 py-5 min-w-[120px]">
                        <select 
                          value={colaborador.status}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all hover:border-slate-300 shadow-sm"
                          onChange={(e) => {
                            const newRows = [...colaboradores];
                            newRows.find(c => c.id === colaborador.id)!.status = e.target.value;
                            setColaboradores(newRows);
                          }}
                        >
                          <option value="ACTIVE">Ativo</option>
                          <option value="INACTIVE">Inativo</option>
                        </select>
                      </td>
                      <td className="px-6 py-5 min-w-[200px]">
                        <input 
                          type="text" 
                          value={colaborador.observations}
                          placeholder="Observações..."
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all hover:border-slate-300 shadow-sm"
                          onChange={(e) => {
                            const newRows = [...colaboradores];
                            newRows.find(c => c.id === colaborador.id)!.observations = e.target.value;
                            setColaboradores(newRows);
                          }}
                        />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button onClick={() => handleDeleteRow(colaborador.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </motion.tbody>
            </table>
          </div>
        </motion.div>
      )}

      <div className="pt-2 flex justify-end">
        <button 
          onClick={handleSaveAndNext}
          disabled={isSaving}
          className="bg-teal-600 text-white px-10 py-4 rounded-2xl hover:bg-teal-700 transition-all font-bold text-sm flex items-center gap-2 disabled:opacity-50 shadow-xl shadow-teal-600/20"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {isSaving ? 'Salvando...' : 'Salvar e Ir Para Alocação'}
        </button>
      </div>

      <CsvImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportCsv}
        title="Importar Equipe"
        description="Faça upload da planilha da equipe do escritório (RH)."
        templateUrl="/modelo_importacao_equipe.csv"
        templateName="Baixar Planilha Modelo (.CSV)"
      />
    </div>
  );
}

