'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Clock, CheckCircle2, AlertCircle, Building2, User, Zap, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';

interface DeliveryAllocationBoardProps {
  deliveries: any[];
  globalCapacity: any[];
  onDeliveryClick: (delivery: any) => void;
  onAllocationChange: (deliveryId: string, newDate: string) => Promise<void>;
  onAutoSchedule?: () => void;
}

export default function DeliveryAllocationBoard({
  deliveries,
  globalCapacity,
  onDeliveryClick,
  onAllocationChange,
  onAutoSchedule
}: DeliveryAllocationBoardProps) {
  const [boardData, setBoardData] = useState<any>({});
  const [calendarGrid, setCalendarGrid] = useState<{ day: number | null, dateStr: string | null }[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (deliveries.length > 0) {
      // Find competence e.g. "05/2026"
      const comp = deliveries[0].competence;
      if (comp) {
        const [m, y] = comp.split('/');
        const month = parseInt(m, 10);
        const year = parseInt(y, 10);
        setCurrentMonth(month);
        setCurrentYear(year);
        
        const days = new Date(year, month, 0).getDate();
        const daysArray = Array.from({ length: days }, (_, i) => i + 1);

        const firstDay = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
        
        const grid = [];
        for (let i = 0; i < firstDay; i++) {
          grid.push({ day: null, dateStr: null });
        }
        for (let day of daysArray) {
          const mm = String(month).padStart(2, '0');
          const dd = String(day).padStart(2, '0');
          grid.push({ day, dateStr: `${year}-${mm}-${dd}` });
        }
        setCalendarGrid(grid);
      }
    }
  }, [deliveries]);

  // Build the board structure: { employeeId: { "unallocated": [...], "2026-05-01": [...] } }
  useEffect(() => {
    const newBoard: any = {};

    // First pass: create structure for each responsible
    deliveries.forEach(d => {
      const respId = d.responsibleId;
      if (!respId) return;
      
      if (!newBoard[respId]) {
        newBoard[respId] = {
          name: d.responsible?.name || 'Desconhecido',
          capacityData: globalCapacity.find(c => c.employee === d.responsible?.name),
          columns: {
            'unallocated': []
          }
        };
      }
    });

    // Second pass: distribute deliveries
    deliveries.forEach(d => {
      const respId = d.responsibleId;
      if (!respId) return;

      const dateStr = d.executionDeadline ? d.executionDeadline.split('T')[0] : null;
      if (!dateStr) {
        newBoard[respId].columns['unallocated'].push(d);
      } else {
        if (!newBoard[respId].columns[dateStr]) {
          newBoard[respId].columns[dateStr] = [];
        }
        newBoard[respId].columns[dateStr].push(d);
      }
    });

    setBoardData(newBoard);
  }, [deliveries, globalCapacity]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // droppableId is in format "empId_dateStr" or "empId_unallocated"
    const [sourceEmpId, sourceDate] = source.droppableId.split('_');
    const [destEmpId, destDate] = destination.droppableId.split('_');

    // We only allow dragging within the same employee for now
    if (sourceEmpId !== destEmpId) {
      return; 
    }

    const startColumn = boardData[sourceEmpId].columns[sourceDate] || [];
    const finishColumn = boardData[destEmpId].columns[destDate] || [];

    const startTask = startColumn[source.index];

    // Optimistic UI Update
    const newBoard = { ...boardData };
    startColumn.splice(source.index, 1);
    
    if (sourceDate === destDate) {
      startColumn.splice(destination.index, 0, startTask);
    } else {
      finishColumn.splice(destination.index, 0, startTask);
      newBoard[destEmpId].columns[destDate] = finishColumn;
    }

    setBoardData(newBoard);

    // Call API
    let newDateStr = '';
    if (destDate !== 'unallocated') {
      newDateStr = destDate; // "YYYY-MM-DD"
    }

    onAllocationChange(draggableId, newDateStr);
  };

  const calculateUsedMinutes = (tasks: any[]) => {
    return tasks.reduce((acc, t) => acc + (t.estimatedTimeMinutes || 0), 0);
  };

  const formatMinutesToHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950/20 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 p-4 overflow-hidden">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 px-2 gap-4 shrink-0">
        <div>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-teal-500" />
            Alocação Diária em Calendário
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Arraste as entregas para organizar o mês de cada colaborador
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {onAutoSchedule && (
            <button 
              onClick={onAutoSchedule}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-sm font-bold rounded-xl shadow-md transition-all shrink-0"
            >
              <Zap className="w-4 h-4" />
              Auto-Alocar (IA)
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-col gap-6 pb-6">
            
            {Object.entries(boardData).map(([empId, empData]: [string, any]) => {
              
              const dailyCapacityHours = empData.capacityData?.available || 6;
              const dailyCapacityMins = dailyCapacityHours * 60;

              return (
                <div key={empId} className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row gap-6">
                  
                  {/* Left Column: Info & Unallocated */}
                  <div className="w-full xl:w-80 flex flex-col gap-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight">{empData.name}</h4>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">Capacidade: {dailyCapacityHours}h / dia</p>
                      </div>
                    </div>

                    <div className="flex-1 min-h-[250px] flex flex-col bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Sem Data Definida</span>
                        <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700">
                          {empData.columns['unallocated']?.length || 0}
                        </span>
                      </div>
                      
                      <Droppable droppableId={`${empId}_unallocated`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 overflow-y-auto custom-scrollbar pr-2 rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-teal-50 dark:bg-teal-900/10' : ''}`}
                          >
                            {empData.columns['unallocated']?.map((task: any, index: number) => (
                              <DraggableTask key={task.id} task={task} index={index} onClick={() => onDeliveryClick(task)} />
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>

                  {/* Right Column: Calendar Grid */}
                  <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/50">
                    <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-2">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="text-center text-[10px] sm:text-xs font-black uppercase text-slate-400">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2 sm:gap-3">
                      {calendarGrid.map((cell, idx) => {
                        if (!cell.day || !cell.dateStr) {
                          return <div key={`empty-${idx}`} className="bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[120px]" />;
                        }

                        const dateStr = cell.dateStr;
                        const tasks = empData.columns[dateStr] || [];
                        const usedMins = calculateUsedMinutes(tasks);
                        const isOverLimit = usedMins > dailyCapacityMins;
                        const percentage = Math.min(100, (usedMins / dailyCapacityMins) * 100);

                        return (
                          <div key={dateStr} className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl p-2 sm:p-3 border shadow-sm ${isOverLimit ? 'border-red-300 dark:border-red-900/50' : 'border-slate-200 dark:border-slate-700'} h-[160px] sm:h-[180px] transition-all hover:border-teal-300 dark:hover:border-teal-700`}>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1 shrink-0">
                              <span className={`text-xs sm:text-sm font-extrabold ${isOverLimit ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                {cell.day}
                              </span>
                              <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md text-center shrink-0 ${isOverLimit ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                {formatMinutesToHours(usedMins)} / {dailyCapacityHours}h
                              </span>
                            </div>

                            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full mb-2 overflow-hidden shrink-0">
                              <div 
                                className={`h-full rounded-full ${isOverLimit ? 'bg-red-500' : percentage > 80 ? 'bg-amber-500' : 'bg-teal-500'}`} 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            
                            <Droppable droppableId={`${empId}_${dateStr}`}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`flex-1 overflow-y-auto custom-scrollbar pr-1 rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-teal-50/50 dark:bg-teal-900/20' : ''}`}
                                >
                                  {tasks.map((task: any, index: number) => (
                                    <DraggableTask key={task.id} task={task} index={index} onClick={() => onDeliveryClick(task)} />
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}

// Draggable Task Card
function DraggableTask({ task, index, onClick }: { task: any, index: number, onClick: () => void }) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-2 cursor-grab active:cursor-grabbing hover:border-teal-300 dark:hover:border-teal-700 transition-colors ${
            snapshot.isDragging ? 'shadow-lg rotate-2 scale-105 z-50' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-1 mb-1">
            <h5 className="text-[10px] sm:text-xs font-black text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
              {task.standardizedName}
            </h5>
          </div>
          
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-50 dark:border-slate-800/50">
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 truncate max-w-[60%]">
              <Building2 className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{task.client?.name}</span>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[9px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
              <Clock className="w-2.5 h-2.5" />
              {task.estimatedTimeMinutes ? `${task.estimatedTimeMinutes}m` : '--'}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
