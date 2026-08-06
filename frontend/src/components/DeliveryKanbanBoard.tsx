'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Clock, AlertCircle, Building2, User, PlayCircle, MoreHorizontal } from 'lucide-react';
import DeliveryStatusBadges from './DeliveryStatusBadges';

interface Delivery {
  id: string;
  competence: string;
  originalName: string;
  standardizedName: string;
  status: string;
  responsible: { name: string };
  front: { name: string };
  client: { name: string };
  clientId?: string;
  frontId?: string;
  responsibleId?: string;
  priority?: string;
  estimatedTimeMinutes?: number;
  realTimeMinutes?: number;
  timeLogs?: any[];
  legalDeadline?: string | null;
  internalDeadline?: string | null;
  executionDeadline?: string | null;
  completedAt?: string | null;
}

interface DeliveryKanbanBoardProps {
  deliveries: Delivery[];
  onDeliveryClick: (delivery: Delivery) => void;
  onStatusChange: (deliveryId: string, newStatus: string) => void;
  userRole?: string;
  userId?: string;
}

// 2 colunas (Realizada / Não Realizada) no lugar dos 5 valores antigos de
// status — as classificações de prazo (STATUS OBRIGAÇÃO/AGENDA) aparecem
// como selos dentro do card, não como coluna (ver DeliveryStatusBadges).
const KANBAN_COLUMNS = [
  { id: 'NAO_REALIZADA', label: 'Não Realizada', color: 'slate' },
  { id: 'REALIZADA', label: 'Realizada', color: 'emerald' }
];

export default function DeliveryKanbanBoard({ 
  deliveries, 
  onDeliveryClick, 
  onStatusChange,
  userRole,
  userId
}: DeliveryKanbanBoardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;

    if (sourceCol !== destCol) {
      // Arrastar só marca/desmarca conclusão — reaproveita o mesmo
      // PATCH /deliveries/:id/status de sempre (updateStatus() só faz algo
      // especial com 'CONCLUIDA', que seta completedAt; qualquer outro valor
      // o reabre). 'PREVISTA' aqui é só o literal genérico de "não concluída".
      onStatusChange(result.draggableId, destCol === 'REALIZADA' ? 'CONCLUIDA' : 'PREVISTA');
    }
  };

  // INATIVA (soft-delete) nunca aparece neste board, seja qual for a coluna.
  const getDeliveriesByColumn = (columnId: string) => {
    const active = deliveries.filter(d => d.status !== 'INATIVA');
    return columnId === 'REALIZADA'
      ? active.filter(d => d.completedAt)
      : active.filter(d => !d.completedAt);
  };

  if (!mounted) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[600px] w-full snap-x">
      <DragDropContext onDragEnd={handleDragEnd}>
        {KANBAN_COLUMNS.map(column => {
          const colDeliveries = getDeliveriesByColumn(column.id);
          
          return (
            <div key={column.id} className="flex-1 min-w-[240px] max-w-[320px] flex flex-col snap-center">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    column.color === 'slate' ? 'bg-slate-400' : 'bg-emerald-500'
                  }`} />
                  <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">{column.label}</h3>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {colDeliveries.length}
                </span>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 min-h-[150px] p-2 rounded-2xl transition-colors ${
                      snapshot.isDraggingOver ? 'bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 border-dashed' : 'bg-transparent'
                    }`}
                  >
                    {colDeliveries.map((delivery, index) => {
                      // Determinar se o usuário pode arrastar o card
                      const canDrag = userRole === 'SUPERADMIN' || userRole === 'ADMIN' || userRole === 'CONSULTANT' || delivery.responsibleId === userId;
                      
                      return (
                        <Draggable key={delivery.id} draggableId={delivery.id} index={index} isDragDisabled={!canDrag}>
                          {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onDeliveryClick(delivery)}
                            className={`group relative mb-3 p-4 rounded-xl border bg-white dark:bg-slate-900 
                              hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer
                              ${snapshot.isDragging ? 'shadow-xl scale-105 border-indigo-500/50 z-50' : 'border-slate-200 dark:border-slate-800 shadow-sm'}
                              ${!canDrag ? 'opacity-90 cursor-not-allowed hover:translate-y-0' : ''}`}
                            style={provided.draggableProps.style}
                          >
                            {/* Card Top Border Accent */}
                            <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl opacity-80 ${
                                column.color === 'slate' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                              }`}
                            />
                            
                            <div className="flex justify-between items-start mt-1">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                                  {delivery.standardizedName || delivery.originalName}
                                </h4>
                              </div>
                              {/* Icons always visible */}
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                {delivery.priority === 'HIGH' && (
                                  <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-500" title="Alta Prioridade">
                                    <AlertCircle className="w-3 h-3" />
                                  </div>
                                )}
                                {delivery.timeLogs?.some((log: any) => log.status === 'RUNNING') && (
                                  <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-500" title="Timer Rodando">
                                    <PlayCircle className="w-3 h-3 animate-pulse" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Expandable Section */}
                            <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                              <div className="overflow-hidden">
                                <div className="pt-3 pb-1 space-y-2">
                                  <p className="text-xs text-slate-500 font-medium line-clamp-1">
                                    {delivery.front?.name || 'Sem frente'}
                                  </p>
                                  
                                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 w-fit px-2 py-1 rounded-md">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span className="font-semibold truncate max-w-[150px]">{delivery.client?.name || 'Sem Cliente'}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                    <User className="w-3.5 h-3.5" />
                                    <span className="font-medium truncate">{delivery.responsible?.name || 'Não atribuído'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Competence + selos de classificação - Always visible at bottom */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{delivery.competence}</span>
                                </div>
                                <DeliveryStatusBadges delivery={delivery} size="xs" />
                              </div>

                              <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-500 transition-opacity p-1">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
}
