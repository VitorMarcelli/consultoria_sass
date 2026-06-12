import React, { useState } from 'react';
import { X, UploadCloud, Loader2, AlertCircle } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
  isLoading?: boolean;
}

export default function CsvImportModal({ isOpen, onClose, onImport, isLoading }: CsvImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Por favor, selecione um arquivo .CSV válido.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    try {
      await onImport(selectedFile);
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao importar arquivo');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Importar Clientes</h3>
            <p className="text-sm text-slate-500 mt-1">Faça upload de um arquivo CSV.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 mb-4 border border-slate-200">
            <p className="font-medium text-slate-800 mb-2">Instruções para o arquivo:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>O arquivo deve estar no formato <strong>.CSV</strong></li>
              <li>A planilha agora aceita <strong>64 colunas</strong> (incluindo todos os dados das frentes).</li>
              <li>Para as colunas com perguntas fechadas, digite <strong>SIM</strong> ou <strong>NÃO</strong>.</li>
              <li>Para líderes e operadores, informe o nome exato. Se não for encontrado, ficará em branco.</li>
            </ul>
            <a 
              href="data:text/csv;charset=utf-8,%EF%BB%BFRazão Social;Nome Fantasia;CNPJ;Município;Estado;Regime Tributário;Segmento;Faixa de Faturamento;Pertence a grupo empresarial?;Nome do grupo empresarial;Honorários;Classificação;Status;Possui Frente Fiscal?;Possui Frente Contábil?;Possui Frente DP?;Observações cadastrais;Fiscal - Líder responsável;Fiscal - Operador 1;Fiscal - Operador 2;Fiscal - Frequência de atendimento;Fiscal - Complexidade;Fiscal - Volume de notas/mês;Fiscal - Volume de notas de saída;Fiscal - Volume de notas de entrada;Fiscal - Nível de automação;Fiscal - Possui regime especial?;Fiscal - Descrição do regime especial;Fiscal - NF-e de entrada;Fiscal - NF-e de saída;Fiscal - NFS-e;Fiscal - Envio ao cliente;Fiscal - Sistema fiscal;Fiscal - Plataforma de gestão de notas;Fiscal - Cumpre prazos de envio?;Fiscal - Particularidades fiscais;DP - Líder responsável;DP - Operador 1;DP - Operador 2;DP - Frequência de atendimento;DP - Complexidade;DP - Quantidade de funcionários;DP - Quantidade de pró-labores;DP - Quantidade de domésticas;DP - Recebimento de ponto;DP - Meio de lançamento;DP - Tipo de processamento;DP - Envio folha ao cliente;DP - Admissões e rescisões frequentes;DP - Particularidades de DP;Contábil - Líder responsável;Contábil - Operador 1;Contábil - Operador 2;Contábil - Frequência de atendimento;Contábil - Complexidade;Contábil - Regime de escrituração;Contábil - Último mês de fechamento;Contábil - Período de fechamento;Contábil - Frequência de recebimento;Contábil - Forma de recebimento;Contábil - Integração com cliente;Contábil - Necessidade de apresentação de balancete;Contábil - Total de lançamentos;Contábil - Particularidades contábeis%0AExemplo LTDA;Exemplo;00.000.000/0001-00;São Paulo;SP;Simples Nacional;Tecnologia;Até 100k;NÃO;;1500;A;Ativo;SIM;SIM;NÃO;Cliente VIP;Vitor;João;Maria;Diário;1;Alto;Médio;Baixo;Automatizado;NÃO;;Email;Sistema;Portal;Email;Dominio;Sieg;SIM;Nenhuma;;;;;;;;;;;;;;;;;;;;;;;;;;;;" 
              download="modelo_importacao_clientes_completo.csv"
              className="text-teal-600 font-medium hover:underline text-sm inline-flex items-center gap-1"
            >
              Baixar modelo .CSV completo (64 colunas)
            </a>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200 text-slate-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-sm">
                {selectedFile ? (
                  <span className="font-medium text-slate-900">{selectedFile.name}</span>
                ) : (
                  <>
                    <span className="font-semibold text-slate-900">Clique para selecionar</span> ou arraste e solte<br/>
                    <span className="text-slate-500 text-xs">Apenas arquivos .CSV</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              Cancelar
            </button>
            <button 
              onClick={handleImport}
              disabled={!selectedFile || isLoading}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Importando...' : 'Importar Dados'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
