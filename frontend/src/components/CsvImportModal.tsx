import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Portal } from '@/components/ui/Portal';
import { motion, AnimatePresence } from 'framer-motion';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
  isLoading?: boolean;
  title?: string;
  description?: string;
  templateUrl?: string;
  templateName?: string;
  progressValue?: number;
  progressText?: string;
}

export default function CsvImportModal({ isOpen, onClose, onImport, isLoading, title = "Importar Clientes", description = "Faça upload de um arquivo CSV ou XLSX.", templateUrl = "/modelo_importacao_completo.xlsx", templateName = "Baixar Planilha Modelo (.XLSX)", progressValue, progressText }: CsvImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
        setError('Por favor, selecione um arquivo .CSV ou .XLSX válido.');
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
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{description}</p>
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
                      <li>O arquivo deve estar no formato <strong>.XLSX</strong> ou <strong>.CSV</strong></li>
                      <li>Para líderes e operadores, informe o nome exato.</li>
                    </ul>
                    <a 
                      href={templateUrl} 
                      download
                      className="text-teal-600 font-medium hover:underline text-sm inline-flex items-center gap-1"
                    >
                      {templateName}
                    </a>
                  </div>

                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                    <input 
                      type="file" 
                      accept=".csv, .xlsx"
                      onChange={handleFileChange}
                      aria-label="Upload de arquivo"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200 text-slate-400">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="text-sm text-slate-600">
                        {selectedFile ? selectedFile.name : 'Clique ou arraste o arquivo aqui'}
                      </div>
                    </div>
                  </div>

                  {progressValue !== undefined && (
                    <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2 mb-1 overflow-hidden">
                      <div className="bg-teal-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressValue}%` }}></div>
                    </div>
                  )}
                  {progressText && (
                    <p className="text-xs text-slate-500 text-center mb-2 font-medium">{progressText}</p>
                  )}

                  <button
                    onClick={handleImport}
                    disabled={!selectedFile || isLoading}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isLoading ? 'Importando...' : 'Importar Dados'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
