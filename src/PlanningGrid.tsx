import { useState, useRef, useEffect, useMemo } from 'react';
import type { Task, Location } from './types';
import TaskCard from './TaskCard';

interface Props {
  tasks: Task[];
  startDate: string;    // YYYY-MM-DD — drives the real calendar engine
  numWeeks: number;
  locations: string[];
  onTaskMove: (taskId: string, newDate: string, newLocation: Location) => void;
  onTaskClick: (taskId: string) => void;
  onCellClick: (date: string, location: Location) => void;
  onResize: (taskId: string, newDuration: number) => void;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const CELL_W    = 160;
const CELL_H    = 140;
const WEEK_H    = 44;
const DAY_H     = 44;
const SIDEBAR_W = 160;
const DRAG_CLICK_SUPPRESSION_MS = 300;

function buildColumns(startDate: string, numWeeks: number) {
  const cols: { date: string; dayLabel: string; dayShort: string; week: number }[] = [];
  const d = new Date(startDate);
  let week = 1, dayInWeek = 0;
  while (cols.length < numWeeks * 5) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      cols.push({
        date:     d.toISOString().slice(0, 10),
        dayLabel: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        dayShort: DAY_NAMES[dayInWeek % 5],
        week,
      });
      dayInWeek++;
      if (dayInWeek % 5 === 0) week++;
    }
    d.setDate(d.getDate() + 1);
  }
  return cols;
}

// ── Location metadata (known names → icon/strip; fallback for custom names) ──
const KNOWN_META: Record<string, { icon: string; strip: string }> = {
  'Basement':     { icon: '⛏️', strip: 'bg-slate-600' },
  'Ground Floor': { icon: '🏢', strip: 'bg-slate-500' },
  'Floor 1':      { icon: '1️⃣', strip: 'bg-indigo-500' },
  'Floor 2':      { icon: '2️⃣', strip: 'bg-indigo-600' },
  'Floor 3':      { icon: '3️⃣', strip: 'bg-indigo-700' },
  'Floor 4':      { icon: '4️⃣', strip: 'bg-violet-600' },
  'Floor 5':      { icon: '5️⃣', strip: 'bg-violet-700' },
  'Floor 6':      { icon: '6️⃣', strip: 'bg-purple-600' },
  'Floor 7':      { icon: '7️⃣', strip: 'bg-purple-700' },
  'Floor 8':      { icon: '8️⃣', strip: 'bg-fuchsia-600' },
  'Floor 9':      { icon: '9️⃣', strip: 'bg-fuchsia-700' },
  'Roof':         { icon: '🏠', strip: 'bg-slate-800' },
  'Penthouse':    { icon: '⭐', strip: 'bg-amber-600' },
  'Parking':      { icon: '🅿️', strip: 'bg-slate-400' },
  'Lobby':        { icon: '🚪', strip: 'bg-emerald-600' },
  'Mezzanine':    { icon: '📐', strip: 'bg-teal-600' },
};
const FALLBACK_STRIPS = ['bg-indigo-500','bg-violet-600','bg-blue-600','bg-emerald-600','bg-amber-600','bg-rose-600','bg-cyan-600','bg-teal-600'];
function getLocationMeta(location: string, idx: number) {
  return KNOWN_META[location] ?? { icon: '📍', strip: FALLBACK_STRIPS[idx % FALLBACK_STRIPS.length] };
}

// ── Resize ref shape ──────────────────────────────────────
interface ResizeRef {
  taskId: string;
  startX: number;
  startDuration: number;
  currentDuration: number;
}

export default function PlanningGrid({ tasks, startDate, numWeeks, locations, onTaskMove, onTaskClick, onCellClick, onResize }: Props) {

  // ── Derived grid structures (memoised — recompute when start date or dimensions change) ──
  const COLUMNS = useMemo(() => buildColumns(startDate, numWeeks), [startDate, numWeeks]);
  const DATE_TO_COL_IDX     = useMemo(() => new Map(COLUMNS.map((c, i) => [c.date, i])), [COLUMNS]);
  const LOCATION_TO_ROW_IDX = useMemo(() => new Map(locations.map((loc, i) => [loc, i])), [locations]);
  const WEEKS = useMemo(() =>
    Array.from({ length: numWeeks }, (_, i) => ({ label: `Week ${i + 1}`, startCol: i * 5 + 2 })),
    [numWeeks]);

  // ── Drag state ────────────────────────────────────────────
  const [dragOverCell, setDragOverCell] = useState<{ date: string; location: Location } | null>(null);
  const dragIdRef        = useRef<string | null>(null);
  const dragJustFinished = useRef(false);

  // ── Resize state ──────────────────────────────────────────
  const resizeRef = useRef<ResizeRef | null>(null);
  const [resizePreview, setResizePreview] = useState<{ taskId: string; duration: number } | null>(null);

  // Register global mouse listeners once — read mutable state via ref
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizeRef.current) return;
      const { startX, startDuration } = resizeRef.current;
      const deltaDays = Math.round((e.clientX - startX) / CELL_W);
      const newDuration = Math.max(1, startDuration + deltaDays);
      if (newDuration !== resizeRef.current.currentDuration) {
        resizeRef.current.currentDuration = newDuration;
        setResizePreview({ taskId: resizeRef.current.taskId, duration: newDuration });
      }
    }
    function onMouseUp() {
      if (!resizeRef.current) return;
      onResize(resizeRef.current.taskId, resizeRef.current.currentDuration);
      resizeRef.current = null;
      setResizePreview(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onResize]);

  function handleResizeStart(e: React.MouseEvent, taskId: string, currentDuration: number) {
    resizeRef.current = { taskId, startX: e.clientX, startDuration: currentDuration, currentDuration };
    setResizePreview({ taskId, duration: currentDuration });
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  // ── Per-render computations ───────────────────────────────
  const tasksAtCell = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const key = `${task.date}__${task.location}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [tasks]);

  function getTaskColSpan(task: Task): number {
    const startIdx = DATE_TO_COL_IDX.get(task.date);
    if (startIdx === undefined) return 1;
    const duration = resizePreview?.taskId === task.id ? resizePreview.duration : task.duration;
    const numHere  = tasksAtCell.get(`${task.date}__${task.location}`)?.length ?? 0;
    if (numHere > 1) return 1;
    return Math.min(duration, COLUMNS.length - startIdx);
  }

  const coveredBySpan = useMemo(() => {
    const covered = new Set<string>();
    for (const task of tasks) {
      const startIdx = DATE_TO_COL_IDX.get(task.date);
      if (startIdx === undefined) continue;
      const span = getTaskColSpan(task);
      for (let d = 1; d < span; d++) {
        if (startIdx + d < COLUMNS.length) {
          covered.add(`${COLUMNS[startIdx + d].date}__${task.location}`);
        }
      }
    }
    return covered;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, resizePreview, DATE_TO_COL_IDX, COLUMNS]);

  // ── Drag handlers ─────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, taskId: string) {
    dragIdRef.current = taskId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  }
  function handleDragOver(e: React.DragEvent, date: string, location: Location) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell({ date, location });
  }
  function handleDragLeave(e: React.DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDragOverCell(null);
  }
  function handleDrop(e: React.DragEvent, date: string, location: Location) {
    e.preventDefault();
    const taskId = dragIdRef.current || e.dataTransfer.getData('text/plain');
    if (taskId) onTaskMove(taskId, date, location);
    dragIdRef.current = null; setDragOverCell(null);
    dragJustFinished.current = true;
    setTimeout(() => { dragJustFinished.current = false; }, DRAG_CLICK_SUPPRESSION_MS);
  }
  function handleDragEnd() {
    dragIdRef.current = null; setDragOverCell(null);
    dragJustFinished.current = true;
    setTimeout(() => { dragJustFinished.current = false; }, DRAG_CLICK_SUPPRESSION_MS);
  }
  function handleCellClick(e: React.MouseEvent, date: string, location: Location) {
    if (dragJustFinished.current || resizeRef.current) return;
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('cell-click-zone')) {
      onCellClick(date, location);
    }
  }

  const totalCols = COLUMNS.length;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex-1 h-full overflow-auto" style={{ background: '#f1f5f9' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${SIDEBAR_W}px repeat(${totalCols}, ${CELL_W}px)`,
          minWidth: SIDEBAR_W + totalCols * CELL_W,
          position: 'relative',
        }}
      >
        {/* ── Week headers (row 1) ──────────────────────── */}
        <div className="corner-sticky header-sticky bg-slate-900 border-b border-r border-slate-700 flex items-end px-3 pb-2"
          style={{ gridRow: 1, gridColumn: 1, height: WEEK_H }}>
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Zone / Week</span>
        </div>
        {WEEKS.map((week) => (
          <div key={week.label}
            className="header-sticky week-header border-b border-r border-slate-600 flex items-center justify-center"
            style={{ gridRow: 1, gridColumnStart: week.startCol, gridColumnEnd: week.startCol + 5, height: WEEK_H }}>
            <span className="text-xs font-bold text-white tracking-wide">{week.label}</span>
          </div>
        ))}

        {/* ── Day headers (row 2) ──────────────────────── */}
        <div className="corner-sticky bg-slate-900 border-b border-r border-slate-700"
          style={{ gridRow: 2, gridColumn: 1, height: DAY_H, top: WEEK_H }} />
        {COLUMNS.map((col, ci) => (
          <div key={`dh-${col.date}`}
            className={`header-sticky bg-slate-800 border-b border-r border-slate-700 flex flex-col items-center justify-center
              ${col.dayShort === 'Mon' && ci > 0 ? 'border-l-2 border-l-slate-500' : ''}`}
            style={{ gridRow: 2, gridColumn: ci + 2, top: WEEK_H, height: DAY_H }}>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{col.dayShort}</span>
            <span className="text-[9px] text-slate-500 mt-0.5">{col.dayLabel}</span>
          </div>
        ))}

        {/* ── Data rows: sidebar + dropzone cells ──────── */}
        {locations.map((location, li) => {
          const isLast = li === locations.length - 1;
          const meta   = getLocationMeta(location, li);
          return [
            // Sidebar
            <div key={`sb-${location}`}
              className={`sidebar-sticky bg-white border-r border-b border-slate-200 flex items-center px-4 gap-2.5 ${isLast ? 'border-b-0' : ''}`}
              style={{ gridRow: li + 3, gridColumn: 1, minHeight: CELL_H }}>
              <div className={`w-1.5 h-10 rounded-full ${meta.strip} flex-shrink-0`} />
              <div>
                <span className="text-lg leading-none">{meta.icon}</span>
                <p className="text-[11px] font-semibold text-slate-700 mt-0.5 leading-tight">{location}</p>
              </div>
            </div>,
            // Cells
            ...COLUMNS.map((col, ci) => {
              const cellKey   = `${col.date}__${location}`;
              const isOver    = dragOverCell?.date === col.date && dragOverCell?.location === location;
              const isMonday  = col.dayShort === 'Mon' && ci > 0;
              const isCovered = coveredBySpan.has(cellKey);
              const hasTask   = (tasksAtCell.get(cellKey)?.length ?? 0) > 0;
              const isEmpty   = !hasTask && !isCovered;
              return (
                <div key={`cell-${location}-${col.date}`}
                  className={`grid-cell border-r border-b border-slate-200 relative group
                    ${isMonday ? 'border-l-2 border-l-slate-300' : ''}
                    ${isLast ? 'border-b-0' : ''}
                    ${isOver ? 'cell-drag-over' : 'bg-white hover:bg-slate-50/60'}
                    transition-colors duration-100`}
                  style={{ gridRow: li + 3, gridColumn: ci + 2, minHeight: CELL_H, zIndex: 1 }}
                  onDragOver={(e) => handleDragOver(e, col.date, location)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.date, location)}
                  onClick={(e) => handleCellClick(e, col.date, location)}
                >
                  {isEmpty && !isOver && (
                    <div className="cell-click-zone absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                      <div className="cell-click-zone flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-white/90 border border-dashed border-slate-300 rounded-lg px-2 py-1">
                        <span className="text-slate-300 text-sm leading-none">＋</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            }),
          ];
        })}

        {/* ── Task cards — direct grid children ─────────── */}
        {tasks.map((task) => {
          const startColIdx = DATE_TO_COL_IDX.get(task.date);
          const rowIdx      = LOCATION_TO_ROW_IDX.get(task.location);
          if (startColIdx === undefined || rowIdx === undefined) return null;

          const span            = getTaskColSpan(task);
          const gridColumnStart = startColIdx + 2;
          const gridColumnEnd   = gridColumnStart + span;
          const isResizingThis  = resizePreview?.taskId === task.id;

          return (
            <div
              key={`card-${task.id}`}
              style={{
                gridRow: rowIdx + 3,
                gridColumnStart,
                gridColumnEnd,
                zIndex: isResizingThis ? 5 : 2,
                alignSelf: 'start',
                padding: '8px',
                pointerEvents: 'none',
              }}
            >
              <div style={{ pointerEvents: 'auto' }}>
                <TaskCard
                  task={task}
                  isResizing={isResizingThis}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onTaskClick={onTaskClick}
                  onResizeStart={handleResizeStart}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
