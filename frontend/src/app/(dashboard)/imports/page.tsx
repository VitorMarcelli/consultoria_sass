'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, FileDown, CheckCircle2, AlertCircle, Building2, Server, Download, Upload } from 'lucide-react';

export default function ImportsPage() {
  const [selectedFront, setSelectedFront] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const templates = [
    { id: 'clients', name: 'Carteira de Clientes', layer: 'Camada 3', description: 'Template para carga inicial ou atualização de clientes da contabilidade.', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'deliveries', name: 'Entregas Recorrentes', layer: 'Camada 4', description: 'Template contendo prazos, competência e tempos estimados.', icon: Server, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          Central de Templates (M1)
        </h1>
        <p className="text-slate-500 mt-1">
          Faça o download dos templates em branco ou importe planilhas preenchidas (CSV/XLSX) para alimentar a operação viva.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* DOWNLOAD SECTION */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileDown size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">1. Baixar Templates</h2>
              <p className="text-sm text-slate-500">Escolha o modelo que deseja preencher</p>
            </div>
          </div>

          <div className="space-y-4">
            {templates.map(t => (
              <div key={t.id} className="group relative flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all hover:shadow-sm">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${t.bg} ${t.color}`}>
                  <t.icon size={22} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{t.name}</h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">
                      {t.layer}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                </div>
                <button className="p-2.5 text-slate-400 group-hover:text-teal-600 group-hover:bg-teal-50 rounded-lg transition-colors">
                  <Download size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* UPLOAD SECTION */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileUp size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">2. Importar Dados</h2>
              <p className="text-sm text-slate-500">Faça o upload do template preenchido</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Importação</label>
            <select 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
              value={selectedFront}
              onChange={(e) => setSelectedFront(e.target.value)}
            >
              <option value="" disabled>Selecione o tipo de dado...</option>
              <option value="clients">Carteira de Clientes (Camada 3)</option>
              <option value="deliveries">Entregas e Tempos (Camada 4)</option>
            </select>
          </div>

          <div 
            className={`flex-1 relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-colors text-center ${
              dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <p className="font-semibold text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <button 
                  onClick={() => setFile(null)}
                  className="mt-4 text-xs font-medium text-red-500 hover:text-red-600"
                >
                  Remover arquivo
                </button>
              </motion.div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <Upload size={20} />
                </div>
                <p className="font-medium text-slate-700">Arraste e solte o arquivo aqui</p>
                <p className="text-xs text-slate-500 mt-1">ou clique para selecionar (Apenas .csv ou .xlsx)</p>
                
                <label className="mt-4 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 text-sm font-medium rounded-lg shadow-sm cursor-pointer transition-all active:scale-95">
                  Procurar Arquivo
                  <input type="file" className="hidden" accept=".csv,.xlsx" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                </label>
              </>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
              <AlertCircle size={14} />
              <span>A importação irá atualizar ou inserir dados na base do escritório ativo.</span>
            </div>
            <button 
              disabled={!file || !selectedFront}
              className={`px-5 py-2.5 font-medium rounded-xl transition-all ${
                file && selectedFront 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Iniciar Importação
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
