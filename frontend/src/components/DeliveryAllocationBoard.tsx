'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Clock, CheckCircle2, AlertCircle, Building2, User, Zap, AlertTriangle } from 'lucide-react';

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
  const [daysInMonth, setDaysInMonth] = useState<number[]>([]);
  const [chunkedDays, setChunkedDays] = useState<number[][]>([]);
  const [selectedWeek, setSelectedWeek] = useState(0);
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
        setDaysInMonth(daysArray);

        // Chunk into weeks (7 days each)
        const chunks = [];
        for (let i = 0; i < daysArray.length; i += 7) {
          chunks.push(daysArray.slice(i, i + 7));
        }
        setChunkedDays(chunks);
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
      return; // Could implement cross-employee allocation later
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

  const getDayDateStr = (day: number) => {
    const mm = String(currentMonth).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
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
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 px-2 gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-500" />
            Alocação Diária
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Arraste as entregas para alocar nos dias do mês
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {chunkedDays.length > 0 && (
            <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto max-w-[400px] custom-scrollbar">
              {chunkedDays.map((chunk, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedWeek(idx)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                    selectedWeek === idx
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Dias {chunk[0]} a {chunk[chunk.length - 1]}
                </button>
              ))}
            </div>
          )}
          
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

      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-col gap-6 pb-6">
            
            {Object.entries(boardData).map(([empId, empData]: [string, any]) => {
              
              const dailyCapacityHours = empData.capacityData?.available || 6;
              const dailyCapacityMins = dailyCapacityHours * 60;

              return (
                <div key={empId} className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-4 sticky left-0 z-10 bg-white dark:bg-slate-900 w-max px-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white">{empData.name}</h4>
                      <p className="text-xs font-bold text-slate-500">Capacidade: {dailyCapacityHours}h / dia</p>
                    </div>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    
                    {/* Unallocated Column */}
                    <div className="min-w-[260px] max-w-[260px] flex flex-col bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-3 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Sem Data</span>
                        <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg text-slate-500">
                          {empData.columns['unallocated']?.length || 0}
                        </span>
                      </div>
                      
                      <Droppable droppableId={`${empId}_unallocated`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 min-h-[150px] rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-teal-50 dark:bg-teal-900/10' : ''}`}
                          >
                            {empData.columns['unallocated']?.map((task: any, index: number) => (
                              <DraggableTask key={task.id} task={task} index={index} onClick={() => onDeliveryClick(task)} />
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>

                    {/* Days Columns */}
                    {(chunkedDays[selectedWeek] || []).map(day => {
                      const dateStr = getDayDateStr(day);
                      const tasks = empData.columns[dateStr] || [];
                      const usedMins = calculateUsedMinutes(tasks);
                      const isOverLimit = usedMins > dailyCapacityMins;
                      const percentage = Math.min(100, (usedMins / dailyCapacityMins) * 100);

                      return (
                        <div key={dateStr} className={`min-w-[260px] max-w-[260px] flex flex-col bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-3 border ${isOverLimit ? 'border-red-200 dark:border-red-900/50' : 'border-slate-200 dark:border-slate-800'}`}>
                          
                          <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                              Dia {day}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${isOverLimit ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
                              {formatMinutesToHours(usedMins)} / {dailyCapacityHours}h
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full mb-3 overflow-hidden">
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
                                className={`flex-1 min-h-[150px] rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-teal-50 dark:bg-teal-900/10' : ''}`}
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
          className={`bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-2 cursor-grab active:cursor-grabbing hover:border-teal-300 dark:hover:border-teal-700 transition-colors ${
            snapshot.isDragging ? 'shadow-lg rotate-2 scale-105 z-50' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
              {task.standardizedName}
            </h5>
          </div>
          
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
              <Building2 className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{task.client?.name}</span>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600 dark:text-slate-400">
              <Clock className="w-3 h-3" />
              {task.estimatedTimeMinutes ? `${task.estimatedTimeMinutes}m` : '--'}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
