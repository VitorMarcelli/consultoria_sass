'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Bell, Shield, Palette, Globe, Database, Construction } from 'lucide-react';
import ProfileForm from './ProfileForm';
import NotificationPreferencesForm from './NotificationPreferencesForm';
import SecurityForm from './SecurityForm';
import AppearanceForm from './AppearanceForm';


export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('Perfil & Conta');

  const tabs = [
    { name: 'Perfil & Conta', desc: 'Gerencie suas informações', icon: Settings },

    { name: 'Notificações', desc: 'Configure seus alertas', icon: Bell },
    { name: 'Segurança', desc: 'Senha e autenticação', icon: Shield },
    { name: 'Aparência', desc: 'Tema e interface', icon: Palette },
    { name: 'Integrações', desc: 'Conecte ferramentas', icon: Globe },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-teal-600" />
          Configurações
        </h1>
        <p className="text-slate-500 font-medium mt-1">Gerencie as preferências e configurações da sua conta.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-72 shrink-0 space-y-1.5 bg-white rounded-[2rem] border border-slate-100 p-4 shadow-sm">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all ${
                  isActive 
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' 
                    : 'text-slate-600 hover:bg-teal-50 hover:text-teal-900'
                }`}
              >
                <tab.icon className={`h-5 w-5 ${isActive ? 'text-teal-200' : 'text-slate-400'}`} />
                <div>
                  <div className="text-sm font-bold tracking-wide">{tab.name}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isActive ? 'text-teal-200/80' : 'text-slate-400'}`}>
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'Perfil & Conta' ? (
                <ProfileForm />

              ) : activeTab === 'Notificações' ? (
                <NotificationPreferencesForm />
              ) : activeTab === 'Segurança' ? (
                <SecurityForm />
              ) : activeTab === 'Aparência' ? (
                <AppearanceForm />
              ) : (
                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-600 to-teal-900 p-10 shadow-lg shadow-teal-900/10 border border-teal-500/20">
                  <div className="absolute right-0 top-0 -mt-16 -mr-16 h-56 w-56 rounded-full bg-white/10 blur-[80px] mix-blend-screen pointer-events-none"></div>
                  <div className="absolute left-1/4 bottom-0 -mb-16 h-56 w-56 rounded-full bg-purple-500/20 blur-[80px] mix-blend-screen pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                    <div className="flex shrink-0 h-16 w-16 items-center justify-center rounded-2xl bg-white/10 border border-white/20 shadow-sm">
                      <Construction className="h-8 w-8 text-teal-50" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tight">Módulo em Desenvolvimento</h2>
                      <p className="text-teal-100/80 text-sm font-medium mt-2 leading-relaxed">
                        As configurações de <strong>{activeTab}</strong> estarão disponíveis em breve.<br className="hidden sm:block" /> Acompanhe as atualizações da plataforma.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

