'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch,
  Plus,
  Pencil,
  Check,
  X,
  Loader2,
  ChevronRight,
  ChevronDown,
  EyeOff,
  Eye
} from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface TaxonomyNode {
  id: string;
  parentId: string | null;
  name: string;
  status: string;
  children: TaxonomyNode[];
}

function TaxonomyNodeRow({
  node,
  depth,
  canManage,
  onChanged
}: {
  node: TaxonomyNode;
  depth: number;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [saving, setSaving] = useState(false);

  const hasChildren = node.children.length > 0;
  const isInactive = node.status !== 'ACTIVE';

  const handleAddChild = async () => {
    if (!newChildName.trim()) return;
    setSaving(true);
    try {
      await apiRequest('/taxonomy/nodes', {
        method: 'POST',
        body: JSON.stringify({ name: newChildName.trim(), parentId: node.id })
      });
      setNewChildName('');
      setIsAddingChild(false);
      setExpanded(true);
      onChanged();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar categoria.');
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async () => {
    if (!editName.trim() || editName === node.name) {
      setIsEditing(false);
      setEditName(node.name);
      return;
    }
    setSaving(true);
    try {
      await apiRequest(`/taxonomy/nodes/${node.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim() })
      });
      setIsEditing(false);
      onChanged();
    } catch (err: any) {
      alert(err.message || 'Erro ao renomear categoria.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    setSaving(true);
    try {
      if (isInactive) {
        await apiRequest(`/taxonomy/nodes/${node.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ACTIVE' })
        });
      } else {
        await apiRequest(`/taxonomy/nodes/${node.id}/deactivate`, { method: 'PATCH' });
      }
      onChanged();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status da categoria.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
        style={{ paddingLeft: `${depth * 28}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-5 h-5 flex items-center justify-center text-slate-400 shrink-0 ${!hasChildren && 'invisible'}`}
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="flex-1 h-8 px-3 rounded-lg border border-teal-400 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <button onClick={handleRename} disabled={saving} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setIsEditing(false); setEditName(node.name); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span className={`font-bold text-sm flex-1 ${isInactive ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
              {node.name}
            </span>
            {isInactive && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md mr-2">
                Inativo
              </span>
            )}
            {canManage && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => setIsAddingChild(true)}
                  title="Adicionar categoria filha"
                  className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  title="Renomear"
                  className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToggleStatus}
                  disabled={saving}
                  title={isInactive ? 'Reativar' : 'Desativar'}
                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  {isInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {isAddingChild && (
        <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${(depth + 1) * 28 + 20}px` }}>
          <input
            autoFocus
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddChild()}
            placeholder="Nome da nova categoria..."
            className="flex-1 max-w-xs h-8 px-3 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
          />
          <button onClick={handleAddChild} disabled={saving || !newChildName.trim()} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg disabled:opacity-40">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setIsAddingChild(false); setNewChildName(''); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TaxonomyNodeRow key={child.id} node={child} depth={depth + 1} canManage={canManage} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

// Só Super Admin e Consultor (Sevilha) administram a árvore global — Líderes/
// Responsáveis de equipe do escritório e Operadores ficam só na leitura,
// mesmo alcance de permissão aplicado no backend (RolesGuard em taxonomy.controller.ts).
const MANAGE_ROLES = ['ADMIN', 'CONSULTANT'];

export default function TaxonomiaPage() {
  const [tree, setTree] = useState<TaxonomyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [newRootName, setNewRootName] = useState('');
  const [savingRoot, setSavingRoot] = useState(false);

  const fetchTree = async () => {
    try {
      const data = await apiRequest('/taxonomy/nodes?format=tree');
      setTree(data || []);
    } catch (err) {
      console.error('Erro ao buscar taxonomia:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiRequest('/users/me')
      .then((profile) => setCanManage(MANAGE_ROLES.includes(profile?.role)))
      .catch(() => setCanManage(false))
      .finally(() => setProfileLoading(false));
    fetchTree();
  }, []);

  const handleAddRoot = async () => {
    if (!newRootName.trim()) return;
    setSavingRoot(true);
    try {
      await apiRequest('/taxonomy/nodes', {
        method: 'POST',
        body: JSON.stringify({ name: newRootName.trim() })
      });
      setNewRootName('');
      fetchTree();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar categoria raiz.');
    } finally {
      setSavingRoot(false);
    }
  };

  return (
    <div className="relative pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Taxonomia de Atividades</h2>
            <p className="text-sm text-slate-500 font-medium mt-1 max-w-2xl">
              Árvore global de classificação (ex: Fiscal → Imposto → PIS). Cada escritório aponta suas próprias
              atividades para um nó daqui, permitindo comparar entregas entre escritórios diferentes.
            </p>
          </div>
        </div>
      </motion.div>

      {!canManage && !loading && !profileLoading && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm font-semibold text-amber-800">
          Você está vendo a árvore em modo leitura. Só Super Admins e Consultores podem criar, renomear ou desativar categorias.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8"
      >
        {loading || profileLoading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : tree.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-bold text-slate-700 text-lg mb-1">Nenhuma categoria cadastrada ainda</p>
            <p className="text-sm font-medium text-slate-400">Crie a primeira categoria raiz abaixo (ex: Fiscal, Contábil, DP).</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {tree.map((node) => (
              <TaxonomyNodeRow key={node.id} node={node} depth={0} canManage={canManage} onChanged={fetchTree} />
            ))}
          </div>
        )}

        {canManage && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-400" /> Nova Categoria Raiz
            </h4>
            <div className="flex items-center gap-3 max-w-lg">
              <input
                type="text"
                value={newRootName}
                onChange={(e) => setNewRootName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRoot()}
                placeholder="Ex: Fiscal, Contábil, DP..."
                className="flex-1 h-11 px-4 rounded-2xl border border-slate-200 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
              <button
                onClick={handleAddRoot}
                disabled={savingRoot || !newRootName.trim()}
                className="h-11 px-5 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingRoot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
