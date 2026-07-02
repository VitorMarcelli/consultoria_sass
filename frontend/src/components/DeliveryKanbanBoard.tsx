'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Clock, CheckCircle2, AlertCircle, Building2, User, PlayCircle, MoreHorizontal } from 'lucide-react';

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
}

interface DeliveryKanbanBoardProps {
  deliveries: Delivery[];
  onDeliveryClick: (delivery: Delivery) => void;
  onStatusChange: (deliveryId: string, newStatus: string) => void;
}

const KANBAN_COLUMNS = [
  { id: 'PREVISTA', label: 'Prevista', color: 'slate' },
  { id: 'ANDAMENTO', label: 'Em Andamento', color: 'amber' },
  { id: 'ATRASADA', label: 'Atrasada', color: 'rose' },
  { id: 'CONCLUIDA', label: 'Concluída', color: 'emerald' },
  { id: 'INATIVA', label: 'Inativa', color: 'slate' }
];

export default function DeliveryKanbanBoard({ deliveries, onDeliveryClick, onStatusChange }: DeliveryKanbanBoardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceStatus = result.source.droppableId;
    const destinationStatus = result.destination.droppableId;
    
    if (sourceStatus !== destinationStatus) {
      onStatusChange(result.draggableId, destinationStatus);
    }
  };

  const getDeliveriesByStatus = (status: string) => {
    return deliveries.filter(d => d.status === status);
  };

  if (!mounted) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[600px] w-full snap-x">
      <DragDropContext onDragEnd={handleDragEnd}>
        {KANBAN_COLUMNS.map(column => {
          const colDeliveries = getDeliveriesByStatus(column.id);
          
          return (
            <div key={column.id} className="flex-1 min-w-[240px] max-w-[320px] flex flex-col snap-center">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    column.color === 'slate' ? 'bg-slate-400' :
                    column.color === 'amber' ? 'bg-amber-400' :
                    column.color === 'rose' ? 'bg-rose-500' :
                    'bg-emerald-500'
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
                    {colDeliveries.map((delivery, index) => (
                      <Draggable key={delivery.id} draggableId={delivery.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onDeliveryClick(delivery)}
                            className={`group relative mb-3 p-4 rounded-xl border bg-white dark:bg-slate-900 
                              hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer
                              ${snapshot.isDragging ? 'shadow-xl scale-105 border-indigo-500/50 z-50' : 'border-slate-200 dark:border-slate-800 shadow-sm'}`}
                            style={provided.draggableProps.style}
                          >
                            {/* Card Top Border Accent */}
                            <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl opacity-80 ${
                                column.color === 'slate' ? 'bg-slate-200 dark:bg-slate-700' :
                                column.color === 'amber' ? 'bg-gradient-to-r from-amber-400 to-orange-400' :
                                column.color === 'rose' ? 'bg-gradient-to-r from-rose-500 to-red-500' :
                                'bg-gradient-to-r from-emerald-400 to-teal-500'
                              }`} 
                            />
                            
                            <div className="flex justify-between items-start mb-3 mt-1">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                                  {delivery.standardizedName || delivery.originalName}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-1">
                                  {delivery.front?.name || 'Sem frente'}
                                </p>
                              </div>
                              <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-500 transition-opacity p-1">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="space-y-2 mt-4">
                              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 w-fit px-2 py-1 rounded-md">
                                <Building2 className="w-3.5 h-3.5" />
                                <span className="font-semibold truncate max-w-[150px]">{delivery.client?.name || 'Sem Cliente'}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <User className="w-3.5 h-3.5" />
                                <span className="font-medium truncate">{delivery.responsible?.name || 'Não atribuído'}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{delivery.competence}</span>
                              </div>
                              
                              {/* Icon indicators */}
                              <div className="flex items-center gap-1">
                                {delivery.priority === 'HIGH' && (
                                  <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-500" title="Alta Prioridade">
                                    <AlertCircle className="w-3 h-3" />
                                  </div>
                                )}
                                {delivery.timeLogs?.some((log: any) => log.status === 'RUNNING') && (
                                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-500" title="Timer Rodando">
                                    <PlayCircle className="w-3 h-3 animate-pulse" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
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
