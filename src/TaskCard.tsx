import { useRef } from 'react';
import type { Task, DisciplineDef } from './types';
import { getTheme } from './theme';
import {
  GripVertical, CheckCircle2,
} from 'lucide-react';
import { contractorInitials } from './mockData';

interface Props {
  task: Task;
  disciplines: DisciplineDef[];
  isResizing: boolean;          // visual highlight during resize
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onTaskClick: (taskId: string) => void;
  onResizeStart: (e: React.MouseEvent, taskId: string, currentDuration: number) => void;
}

export default function TaskCard({
  task, disciplines, isResizing,
  onDragStart, onDragEnd, onTaskClick, onResizeStart,
}: Props) {
  const discDef = disciplines.find(d => d.name === task.discipline) || { name: task.discipline, theme: 'slate' };
  const theme = getTheme(discDef.theme);
  const Icon = theme.Icon;
  const done = task.isDone;

  // Suppress click that fires immediately after a drag-end
  const wasDragging = useRef(false);

  function handleDragStart(e: React.DragEvent) {
    wasDragging.current = true;
    onDragStart(e, task.id);
  }
  function handleDragEnd() {
    onDragEnd();
    setTimeout(() => { wasDragging.current = false; }, 80);
  }
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (wasDragging.current) return;
    onTaskClick(task.id);
  }
  function handleResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation();  // don't trigger card drag
    e.preventDefault();
    onResizeStart(e, task.id, task.duration);
  }

  /* ── Computed styles ─────────────────────────────────── */
  const cardBg     = done ? 'bg-gray-100'     : theme.activeBg;
  const cardText   = done ? 'text-gray-400'   : theme.activeText;
  const cardBorder = done ? 'border-gray-200' : isResizing ? 'border-indigo-400' : theme.activeBorder;
  const badgeBg    = done ? 'bg-gray-200'     : theme.badgeBg;
  const badgeText  = done ? 'text-gray-400'   : theme.badgeText;

  return (
    <div
      draggable={!done}
      onDragStart={done ? undefined : handleDragStart}
      onDragEnd={done ? undefined : handleDragEnd}
      onClick={handleClick}
      title="Click to view details"
      className={`
        task-card relative select-none
        ${cardBg} ${cardText}
        border-2 ${cardBorder} rounded-xl
        ${done
          ? 'opacity-60 grayscale cursor-pointer'
          : 'cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md hover:-translate-y-0.5'}
        ${isResizing ? 'ring-2 ring-indigo-300 ring-offset-1' : ''}
        transition-all duration-200
        min-w-0 overflow-hidden
      `}
      style={{ minHeight: 80 }}
    >
      {/* ── Left grab handle ─────────────────────────── */}
      {!done && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-20 hover:opacity-50 transition-opacity z-10">
          <GripVertical size={14} strokeWidth={2} />
        </div>
      )}

      {/* ── Done check icon ───────────────────────────── */}
      {done && (
        <div className="absolute top-2 right-2 z-10">
          <CheckCircle2 size={15} className="text-emerald-500 opacity-90" strokeWidth={2.5} />
        </div>
      )}

      {/* ── Right resize handle (active tasks only) ───── */}
      {!done && (
        <div
          onMouseDown={handleResizeMouseDown}
          className={`
            absolute right-0 top-0 bottom-0 w-3.5 z-10
            flex flex-col items-center justify-center gap-0.5
            cursor-col-resize rounded-r-xl
            ${isResizing ? 'bg-indigo-400/20' : 'hover:bg-black/5'}
            transition-colors duration-150
          `}
          title="Drag to resize duration"
        >
          {/* 3 dots indicator */}
          <div className={`w-1 h-1 rounded-full ${isResizing ? theme.resizeBar : 'bg-current'} opacity-40 group-hover:opacity-80`} />
          <div className={`w-1 h-1 rounded-full ${isResizing ? theme.resizeBar : 'bg-current'} opacity-60 group-hover:opacity-80`} />
          <div className={`w-1 h-1 rounded-full ${isResizing ? theme.resizeBar : 'bg-current'} opacity-40 group-hover:opacity-80`} />
        </div>
      )}

      {/* ── Card content ──────────────────────────────── */}
      <div className={`p-3 ${done ? '' : 'pl-5 pr-5'}`}>
        {/* Discipline badge + avatar */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${badgeBg} ${badgeText} flex-shrink-0`}>
            <Icon size={10} strokeWidth={2.5} />
            {discDef.name}
          </span>
          <span
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: done ? '#9ca3af' : task.contractorColor }}
          >
            {contractorInitials(task.contractor)}
          </span>
        </div>

        {/* Task name */}
        <p className={`text-sm font-semibold leading-snug line-clamp-2 ${done ? 'line-through decoration-gray-400' : ''}`}>
          {task.name}
        </p>

        {/* Duration chip */}
        <p className={`text-[10px] mt-1.5 font-medium ${done ? 'text-gray-400' : 'text-slate-400'} ${isResizing ? '!text-indigo-500 font-bold' : ''}`}>
          {task.duration}d {isResizing ? '← drag to resize' : ''}
        </p>

        {done && (
          <p className="text-[10px] text-emerald-500 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 size={10} strokeWidth={2.5} /> Completed
          </p>
        )}
      </div>
    </div>
  );
}
