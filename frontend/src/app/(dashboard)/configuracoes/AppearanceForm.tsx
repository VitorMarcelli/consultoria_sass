'use client';

import { Palette, Monitor, Moon, Sun, LayoutTemplate, Brush, Check } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

export default function AppearanceForm() {
  const { theme, setTheme, accentColor, setAccentColor, density, setDensity } = useTheme();

  const accentColors = [
    { name: 'Índigo (Padrão)', value: 'indigo', bg: 'bg-indigo-600', ring: 'ring-indigo-600' },
    { name: 'Azul', value: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-500' },
    { name: 'Esmeralda', value: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-500' },
    { name: 'Ciano', value: 'cyan', bg: 'bg-cyan-500', ring: 'ring-cyan-500' },
    { name: 'Âmbar', value: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-500' },
    { name: 'Ardósia', value: 'slate', bg: 'bg-slate-700', ring: 'ring-slate-700' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Theme Section */}
      <div className="rounded-container border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 sm:p-10 transition-colors">
        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 rounded-inner bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Monitor className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Tema do Sistema</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              Escolha a aparência que for mais confortável para você.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Light Theme */}
          <button 
            onClick={() => setTheme('light')}
            className={`group text-left border-2 rounded-inner p-1.5 transition-all ${
              theme === 'light' ? 'border-teal-500 ring-4 ring-teal-500/10 dark:ring-teal-500/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
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
              <span className={`text-sm font-bold ${theme === 'light' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>Claro</span>
              <Sun className={`h-5 w-5 ${theme === 'light' ? 'text-teal-500' : 'text-slate-400'}`} />
            </div>
          </button>

          {/* Dark Theme */}
          <button 
            onClick={() => setTheme('dark')}
            className={`group text-left border-2 rounded-inner p-1.5 transition-all ${
              theme === 'dark' ? 'border-teal-500 ring-4 ring-teal-500/10 dark:ring-teal-500/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
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
              <span className={`text-sm font-bold ${theme === 'dark' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>Escuro</span>
              <Moon className={`h-5 w-5 ${theme === 'dark' ? 'text-teal-500' : 'text-slate-400'}`} />
            </div>
          </button>

          {/* System Theme */}
          <button 
            onClick={() => setTheme('system')}
            className={`group text-left border-2 rounded-inner p-1.5 transition-all ${
              theme === 'system' ? 'border-teal-500 ring-4 ring-teal-500/10 dark:ring-teal-500/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
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
              <span className={`text-sm font-bold ${theme === 'system' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>Sistema</span>
              <Monitor className={`h-5 w-5 ${theme === 'system' ? 'text-teal-500' : 'text-slate-400'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Accent Color Section */}
      <div className="rounded-container border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 sm:p-10 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-inner bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 shrink-0 mt-1">
              <Brush className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Cor de Destaque</h3>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 max-w-xl leading-relaxed">
                Personalize a cor principal dos botões, links e menus para refletir a marca do seu escritório.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pl-0 sm:pl-16">
          {accentColors.map((color) => (
            <button
              key={color.value}
              onClick={() => setAccentColor(color.value as any)}
              className={`h-10 w-10 rounded-full ${color.bg} shadow-sm border-2 border-white dark:border-slate-900 flex items-center justify-center transition-transform hover:scale-110 focus:outline-none ${accentColor === color.value ? `ring-2 ${color.ring}` : 'hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600'}`}
              title={color.name}
            >
              {accentColor === color.value && <Check className="h-5 w-5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* Interface Density */}
      <div className="rounded-container border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 sm:p-10 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-inner bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 mt-1">
              <LayoutTemplate className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Densidade da Interface</h3>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 max-w-xl leading-relaxed">
                Controle o espaçamento entre os elementos nas tabelas e listas.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setDensity('comfortable')}
            className={`flex items-center justify-between p-4 rounded-inner border-2 transition-all ${
              density === 'comfortable' ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-500/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
            }`}
          >
            <div className="text-left">
              <div className={`font-bold ${density === 'comfortable' ? 'text-teal-900 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>Confortável</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Mais espaço para leitura</div>
            </div>
            <div className="flex flex-col gap-2 opacity-50">
              <div className="h-2 w-16 bg-slate-300 dark:bg-slate-600 rounded"></div>
              <div className="h-2 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </button>

          <button
            onClick={() => setDensity('compact')}
            className={`flex items-center justify-between p-4 rounded-inner border-2 transition-all ${
              density === 'compact' ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-500/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
            }`}
          >
            <div className="text-left">
              <div className={`font-bold ${density === 'compact' ? 'text-teal-900 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>Compacto</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Mais itens visíveis na tela</div>
            </div>
            <div className="flex flex-col gap-1 opacity-50">
              <div className="h-2 w-16 bg-slate-300 dark:bg-slate-600 rounded"></div>
              <div className="h-2 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-2 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
