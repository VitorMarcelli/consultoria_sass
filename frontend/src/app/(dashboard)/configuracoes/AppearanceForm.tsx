'use client';

import { useState, useEffect } from 'react';
import { Palette, Monitor, Moon, Sun, LayoutTemplate, Brush, Check } from 'lucide-react';

export default function AppearanceForm() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  
  // Load initial preference from localStorage if available
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-preference');
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      setTheme(savedTheme);
    }
  }, []);

  const handleThemeSelect = (selected: 'light' | 'dark' | 'system') => {
    setTheme(selected);
    localStorage.setItem('theme-preference', selected);
    // Note: Em uma implementação futura, aqui faríamos a adição da classe 'dark' no HTML
  };

  const accentColors = [
    { name: 'Indigo (Padrão)', value: 'indigo', bg: 'bg-teal-600', ring: 'ring-teal-600' },
    { name: 'Azul', value: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-500' },
    { name: 'Esmeralda', value: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-500' },
    { name: 'Ciano', value: 'cyan', bg: 'bg-cyan-500', ring: 'ring-cyan-500' },
    { name: 'Âmbar', value: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-500' },
    { name: 'Ardósia', value: 'slate', bg: 'bg-slate-700', ring: 'ring-slate-700' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Theme Section */}
      <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-8 sm:p-10">
        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-teal-50 text-teal-600">
            <Monitor className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tema do Sistema</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Escolha a aparência que for mais confortável para você.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Light Theme */}
          <button 
            onClick={() => handleThemeSelect('light')}
            className={`group text-left border-2 rounded-2xl p-1.5 transition-all ${
              theme === 'light' ? 'border-teal-500 ring-4 ring-teal-500/10' : 'border-slate-100 hover:border-slate-200'
            }`}
          >
            <div className="bg-slate-100 rounded-xl overflow-hidden mb-3 aspect-video relative p-2 flex flex-col gap-2">
              <div className="h-4 w-full bg-white rounded-md shadow-sm border border-slate-200 flex items-center px-2">
                <div className="h-2 w-12 bg-slate-200 rounded-full"></div>
              </div>
              <div className="flex gap-2 flex-1">
                <div className="w-1/4 h-full bg-white rounded-md shadow-sm border border-slate-200"></div>
                <div className="flex-1 h-full bg-white rounded-md shadow-sm border border-slate-200"></div>
              </div>
            </div>
            <div className="px-3 pb-3 flex items-center justify-between">
              <span className={`text-sm font-bold ${theme === 'light' ? 'text-teal-600' : 'text-slate-700'}`}>Claro</span>
              <Sun className={`h-5 w-5 ${theme === 'light' ? 'text-teal-500' : 'text-slate-400'}`} />
            </div>
          </button>

          {/* Dark Theme */}
          <button 
            onClick={() => handleThemeSelect('dark')}
            className={`group text-left border-2 rounded-2xl p-1.5 transition-all ${
              theme === 'dark' ? 'border-teal-500 ring-4 ring-teal-500/10' : 'border-slate-100 hover:border-slate-200'
            }`}
          >
            <div className="bg-slate-900 rounded-xl overflow-hidden mb-3 aspect-video relative p-2 flex flex-col gap-2">
              <div className="h-4 w-full bg-slate-800 rounded-md border border-slate-700 flex items-center px-2">
                <div className="h-2 w-12 bg-slate-700 rounded-full"></div>
              </div>
              <div className="flex gap-2 flex-1">
                <div className="w-1/4 h-full bg-slate-800 rounded-md border border-slate-700"></div>
                <div className="flex-1 h-full bg-slate-800 rounded-md border border-slate-700"></div>
              </div>
            </div>
            <div className="px-3 pb-3 flex items-center justify-between">
              <span className={`text-sm font-bold ${theme === 'dark' ? 'text-teal-600' : 'text-slate-700'}`}>Escuro</span>
              <Moon className={`h-5 w-5 ${theme === 'dark' ? 'text-teal-500' : 'text-slate-400'}`} />
            </div>
          </button>

          {/* System Theme */}
          <button 
            onClick={() => handleThemeSelect('system')}
            className={`group text-left border-2 rounded-2xl p-1.5 transition-all ${
              theme === 'system' ? 'border-teal-500 ring-4 ring-teal-500/10' : 'border-slate-100 hover:border-slate-200'
            }`}
          >
            <div className="bg-gradient-to-br from-slate-100 to-slate-900 rounded-xl overflow-hidden mb-3 aspect-video relative p-2 flex flex-col gap-2">
              <div className="h-4 w-full bg-white/50 backdrop-blur-md rounded-md shadow-sm border border-white/20 flex items-center px-2">
                <div className="h-2 w-12 bg-slate-400/50 rounded-full"></div>
              </div>
              <div className="flex gap-2 flex-1">
                <div className="w-1/4 h-full bg-white/50 backdrop-blur-md rounded-md shadow-sm border border-white/20"></div>
                <div className="flex-1 h-full bg-white/50 backdrop-blur-md rounded-md shadow-sm border border-white/20"></div>
              </div>
            </div>
            <div className="px-3 pb-3 flex items-center justify-between">
              <span className={`text-sm font-bold ${theme === 'system' ? 'text-teal-600' : 'text-slate-700'}`}>Sistema</span>
              <Monitor className={`h-5 w-5 ${theme === 'system' ? 'text-teal-500' : 'text-slate-400'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Accent Color Section (Visual Only) */}
      <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-8 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-pink-50 text-pink-600 shrink-0 mt-1">
              <Brush className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Cor de Destaque</h3>
                <span className="text-[10px] font-bold uppercase bg-amber-50 border border-amber-200/50 text-amber-700 px-2 py-0.5 rounded-md">Em Breve</span>
              </div>
              <p className="text-sm font-medium text-slate-500 mt-2 max-w-xl leading-relaxed">
                Personalize a cor principal dos botões, links e menus para refletir a marca do seu escritório.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 opacity-50 pointer-events-none pl-16">
          {accentColors.map((color) => (
            <button
              key={color.value}
              className={`h-10 w-10 rounded-full ${color.bg} shadow-sm border-2 border-white flex items-center justify-center transition-transform hover:scale-110 focus:outline-none ${color.value === 'indigo' ? `ring-2 ${color.ring}` : 'hover:ring-2 hover:ring-slate-300'}`}
              title={color.name}
            >
              {color.value === 'indigo' && <Check className="h-5 w-5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* Interface Density (Visual Only) */}
      <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-8 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 shrink-0 mt-1">
              <LayoutTemplate className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Densidade da Interface</h3>
                <span className="text-[10px] font-bold uppercase bg-amber-50 border border-amber-200/50 text-amber-700 px-2 py-0.5 rounded-md">Em Breve</span>
              </div>
              <p className="text-sm font-medium text-slate-500 mt-2 max-w-xl leading-relaxed">
                Ajuste o espaçamento entre os elementos. O modo compacto é ideal para telas menores e relatórios extensos.
              </p>
            </div>
          </div>
          
          <div className="opacity-50 pointer-events-none flex bg-slate-100 p-1.5 rounded-xl shrink-0">
            <button className="px-5 py-2.5 text-sm font-bold rounded-lg bg-white text-slate-900 shadow-sm border border-slate-200">
              Padrão
            </button>
            <button className="px-5 py-2.5 text-sm font-bold rounded-lg text-slate-500 hover:text-slate-700">
              Compacta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
