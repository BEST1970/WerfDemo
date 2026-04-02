import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Plus, LayoutGrid,
  Download, Upload, Trash2, Settings,
  CheckCheck, AlertCircle, ClipboardList, FileJson,
} from 'lucide-react';
import type { Task, Discipline, DisciplineDef, Location } from './types';
import { getTheme } from './theme';
import {
  DEFAULT_NUM_WEEKS,
  DEFAULT_LOCATIONS,
} from './mockData';

const DEFAULT_DISCIPLINES: DisciplineDef[] = [
  { name: 'Structural', theme: 'slate' },
  { name: 'MEP', theme: 'blue' },
  { name: 'Electrical', theme: 'green' },
  { name: 'Steelwork', theme: 'orange' },
];
import PlanningGrid from './PlanningGrid';
import AddTaskModal from './AddTaskModal';
import TaskDrawer from './TaskDrawer';
import GridSettingsModal from './GridSettingsModal';

interface ModalContext { date: string; location: Location; }


// ── Toast ─────────────────────────────────────────────────
interface Toast { id: number; type: 'success' | 'error'; msg: string; }
let _toastId = 0;
// ── LocalStorage helpers (module-level so lazy initialisers can use them) ────
/** Key under which the full board state is persisted. */
const LS_KEY = 'company_brain_last_planning';

/** Reads + parses the saved state once. Returns the parsed object or null. */
function loadSaved(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function App() {
  // ── Core state (lazy-initialised from localStorage) ──────
  const [tasks, setTasks] = useState<Task[]>(() => {
    const s = loadSaved();
    return (s?.tasks && Array.isArray(s.tasks)) ? (s.tasks as Task[]) : [];
  });
  const [disciplines, setDisciplines] = useState<DisciplineDef[]>(() => {
    const s = loadSaved();
    return (s?.disciplines && Array.isArray(s.disciplines) && s.disciplines.length > 0)
      ? (s.disciplines as DisciplineDef[])
      : DEFAULT_DISCIPLINES;
  });
  const [modalCtx, setModalCtx]             = useState<ModalContext | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask]       = useState<Task | null>(null);
  const [toasts, setToasts]                 = useState<Toast[]>([]);

  // ── Grid settings (lazy-initialised) ──────────────────────
  const [numWeeks, setNumWeeks] = useState<number>(() => {
    const s = loadSaved();
    return (s?.numWeeks && typeof s.numWeeks === 'number') ? s.numWeeks : DEFAULT_NUM_WEEKS;
  });
  const [locations, setLocations] = useState<string[]>(() => {
    const s = loadSaved();
    return (s?.locations && Array.isArray(s.locations) && s.locations.length > 0)
      ? (s.locations as string[])
      : DEFAULT_LOCATIONS;
  });
  const [showGridSettings, setShowGridSettings] = useState(false);

  // ── Project metadata (lazy-initialised) ───────────────────
  const [projectTitle, setProjectTitle] = useState<string>(() => {
    const s = loadSaved();
    return (s?.projectTitle && typeof s.projectTitle === 'string') ? s.projectTitle : 'Werf Planning';
  });
  const [projectStartDate, setProjectStartDate] = useState<string>(() => {
    const s = loadSaved();
    return (s?.projectStartDate && typeof s.projectStartDate === 'string') ? s.projectStartDate : '2026-04-06';
  });
  const [contractors, setContractors] = useState<string[]>(() => {
    const s = loadSaved();
    return (s?.contractors && Array.isArray(s.contractors) && s.contractors.length > 0)
      ? (s.contractors as string[])
      : ['CFE', 'Sanitair', 'Electroplan', 'Maes Chape', 'Batinord'];
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;

  // ── Auto-save on every state change ─────────────────────────
  // Note: because all states are lazy-initialised from localStorage, on the
  // first render this effect re-saves the correct data instead of overwriting
  // it with empty defaults.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        projectTitle, projectStartDate, numWeeks, locations, contractors, disciplines, tasks,
      }));
    } catch {
      // storage quota exceeded — ignore
    }
  }, [tasks, projectTitle, projectStartDate, numWeeks, locations, contractors, disciplines]);

  // ── Stats ──────────────────────────────────────────────────
  const totalTasks  = tasks.length;
  const doneTasks   = tasks.filter((t) => t.isDone).length;
  const activeTasks = totalTasks - doneTasks;
  const donePercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const disciplineStats = useMemo(() => {
    return disciplines.map(d => ({
      ...d,
      count: tasks.filter(t => t.discipline === d.name).length
    }));
  }, [disciplines, tasks]);

  // ── Active contractors legend ─────────────────────────────────
  // Stable palette — each contractor gets a consistent hue based on its name
  const CONTRACTOR_PALETTE = [
    { bg: 'bg-violet-600',  text: 'text-white',       ring: 'ring-violet-300'  },
    { bg: 'bg-blue-600',    text: 'text-white',       ring: 'ring-blue-300'    },
    { bg: 'bg-emerald-600', text: 'text-white',       ring: 'ring-emerald-300' },
    { bg: 'bg-amber-500',   text: 'text-white',       ring: 'ring-amber-300'   },
    { bg: 'bg-rose-600',    text: 'text-white',       ring: 'ring-rose-300'    },
    { bg: 'bg-cyan-600',    text: 'text-white',       ring: 'ring-cyan-300'    },
    { bg: 'bg-indigo-600',  text: 'text-white',       ring: 'ring-indigo-300'  },
    { bg: 'bg-teal-600',    text: 'text-white',       ring: 'ring-teal-300'    },
    { bg: 'bg-fuchsia-600', text: 'text-white',       ring: 'ring-fuchsia-300' },
    { bg: 'bg-orange-600',  text: 'text-white',       ring: 'ring-orange-300'  },
  ];
  /** Derive 2-letter initials: first char of each word (up to 2 words), else first 2 chars */
  function contractorInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  /** Stable colour index from contractor string */
  function contractorColorIdx(name: string): number {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return h % CONTRACTOR_PALETTE.length;
  }

  const activeContractors = useMemo(() => {
    // Count tasks per contractor (all tasks, incl. done)
    const countMap = new Map<string, number>();
    for (const t of tasks) {
      if (t.contractor) countMap.set(t.contractor, (countMap.get(t.contractor) ?? 0) + 1);
    }
    // Return sorted by count desc
    return [...countMap.entries()].sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  // ── Toast helpers ─────────────────────────────────────────
  function showToast(type: 'success' | 'error', msg: string) {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, type, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }

  // ── Export (File System Access API + Blob fallback) ──────
  async function handleExport() {
    if (tasks.length === 0) { showToast('error', 'Nothing to export — board is empty.'); return; }

    const payload = { projectTitle, projectStartDate, numWeeks, locations, contractors, disciplines, tasks };
    const data    = JSON.stringify(payload, null, 2);
    const suggestedName = `${projectTitle || 'planning'}.json`;

    // ── Attempt native Save-As dialog (Chromium 86+) ────────
    if ('showSaveFilePicker' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        showToast('success', `✓ Saved ${tasks.length} tasks to "${fileHandle.name}"`);
        return;
      } catch (err) {
        // AbortError = user clicked Cancel → silently exit
        if ((err as DOMException).name === 'AbortError') return;
        // Any other error (permissions, etc.) → fall through to Blob fallback
        console.warn('showSaveFilePicker failed, falling back to Blob download:', err);
      }
    }

    // ── Fallback: prompt for filename → Blob download ───────
    const fileName = window.prompt('Enter filename:', suggestedName);
    if (!fileName) return; // user cancelled prompt
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', `✓ Exported ${tasks.length} tasks as "${fileName}"`);
  }

  // ── Import ────────────────────────────────────────────────
  function handleImportClick() { fileInputRef.current?.click(); }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);

        // Resolve tasks array from either the new envelope or a legacy plain array
        let rawTasks: Record<string, unknown>[];
        let importedTitle:       string | null   = null;
        let importedNumWeeks:   number | null   = null;
        let importedLocations:  string[] | null = null;
        let importedContractors: string[] | null = null;

        if (Array.isArray(raw)) {
          // Legacy format: root is a plain Task[]
          rawTasks = raw;
        } else if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).tasks)) {
          // New envelope format: { projectTitle, numWeeks, locations, tasks }
          const env = raw as Record<string, unknown>;
          rawTasks          = env.tasks as Record<string, unknown>[];
          importedTitle     = typeof env.projectTitle === 'string'  ? env.projectTitle            : null;
          importedNumWeeks  = typeof env.numWeeks     === 'number'  ? (env.numWeeks as number)    : null;
          importedLocations   = Array.isArray(env.locations)                          ? (env.locations    as string[]) : null;
          importedContractors = Array.isArray(env.contractors)                         ? (env.contractors  as string[]) : null;
          const importedDisciplinesRaw = Array.isArray(env.disciplines) ? env.disciplines : null;
          if (importedDisciplinesRaw && importedDisciplinesRaw.length > 0) {
              setDisciplines(importedDisciplinesRaw as DisciplineDef[]);
          }
          if (typeof env.projectStartDate === 'string' && env.projectStartDate) {
            setProjectStartDate(env.projectStartDate);
          }
        } else {
          throw new Error('Unrecognised file format — expected a JSON array or planning envelope.');
        }

        const validated: Task[] = rawTasks.map((item, index) => {
          const missing = ['id', 'name', 'discipline', 'location', 'date'].filter((k) => !item[k]);
          if (missing.length) throw new Error(`Task #${index + 1} is missing: ${missing.join(', ')}`);
          return {
            id:              String(item.id),
            name:            String(item.name),
            discipline:      item.discipline as Discipline,
            location:        String(item.location),
            date:            String(item.date),
            contractor:      String(item.contractor ?? contractors[0] ?? ''),
            contractorColor: String(item.contractorColor ?? '#64748b'),
            isDone:          Boolean(item.isDone),
            duration:        Math.max(1, Number(item.duration) || 1),
          };
        });

        // Apply state — restore grid dimensions/metadata from envelope if present
        setTasks(validated);
        if (importedTitle)                                         setProjectTitle(importedTitle);
        if (importedNumWeeks)                                      setNumWeeks(importedNumWeeks);
        if (importedLocations   && importedLocations.length > 0)   setLocations(importedLocations);
        if (importedContractors && importedContractors.length > 0) setContractors(importedContractors);

        const extra = (importedNumWeeks || importedLocations)
          ? ` · grid restored (${importedNumWeeks ?? numWeeks}w × ${(importedLocations ?? locations).length} loc)` : '';
        showToast('success', `✓ Imported ${validated.length} tasks from "${file.name}"${extra}`);
      } catch (err) {
        showToast('error', `Import failed: ${(err as Error).message}`);
      }
    };
    reader.onerror = () => showToast('error', 'Could not read the file.');
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── Clear board ───────────────────────────────────────────
  function handleClearBoard() {
    if (tasks.length === 0) { showToast('error', 'Board is already empty.'); return; }
    const confirmed = window.confirm(
      `Are you sure you want to clear the entire planning board?\n\nThis will remove all ${tasks.length} task(s) and cannot be undone.`
    );
    if (confirmed) {
      // Reset ALL persisted state to defaults — prevents stale data rehydrating on next mount
      setTasks([]);
      setProjectTitle('New Project');
      setProjectStartDate('2026-04-06');
      setNumWeeks(DEFAULT_NUM_WEEKS);
      setLocations(DEFAULT_LOCATIONS);
      setContractors(['CFE', 'Sanitair', 'Electroplan', 'Maes Chape', 'Batinord']);
      setDisciplines(DEFAULT_DISCIPLINES);
      localStorage.removeItem(LS_KEY);
      showToast('success', 'Board cleared — all state reset to defaults');
    }
  }

  // ── Grid settings ──────────────────────────────────────────
  function handleSaveGridSettings(newWeeks: number, newLocations: string[], newContractors: string[], newStartDate: string, newDisciplines: DisciplineDef[]) {
    setNumWeeks(newWeeks);
    setLocations(newLocations);
    setContractors(newContractors);
    setProjectStartDate(newStartDate);
    setDisciplines(newDisciplines);
    showToast('success', `Grid updated: ${newStartDate} · ${newWeeks}w · ${newLocations.length} loc`);
  }

  // ── Board handlers ─────────────────────────────────────────
  function handleTaskMove(taskId: string, newDate: string, newLocation: Location) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, date: newDate, location: newLocation } : t));
  }
  function handleTaskClick(taskId: string) { setSelectedTaskId(taskId); }
  function handleCellClick(date: string, location: Location) {
    setEditingTask(null);
    setModalCtx({ date, location });
  }
  const handleResize = useCallback((taskId: string, newDuration: number) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, duration: newDuration } : t));
  }, []);

  // ── Drawer handlers ────────────────────────────────────────
  function handleToggleDone(taskId: string) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, isDone: !t.isDone } : t));
  }
  function handleDeleteTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }
  function handleStartEdit() {
    if (!selectedTask) return;
    const task = selectedTask;
    setSelectedTaskId(null);
    setEditingTask(task);
    setModalCtx({ date: task.date, location: task.location });
  }

  // ── Modal save ─────────────────────────────────────────────
  function handleSaveTask(task: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = task; return u; }
      return [...prev, task];
    });
    setEditingTask(null);
    setModalCtx(null);
  }
  function handleCloseModal() { setEditingTask(null); setModalCtx(null); }

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">

      {/* ── TOPBAR ─────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">

        {/* Top row: brand + actions */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow shadow-indigo-200 flex-shrink-0">
              <LayoutGrid size={18} className="text-white" />
            </div>
            <div className="flex flex-col">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Lean Pull Planning — v17</p>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Project title…"
                size={Math.max(12, projectTitle.length + 2)}
                className="text-xl font-bold text-slate-900 border-none bg-transparent focus:ring-0 focus:outline-none leading-tight mt-0.5 placeholder-slate-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress ring */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mr-1">
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="3.5"
                    strokeDasharray={`${donePercent * 0.879} 87.96`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-700">
                  {donePercent}%
                </span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-700 leading-tight">{doneTasks}/{totalTasks} done</p>
                <p className="text-[10px] text-slate-400">{activeTasks} active</p>
              </div>
            </div>

            {/* Grid settings */}
            <button
              onClick={() => setShowGridSettings(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
              title={`Grid: ${numWeeks} weeks · ${locations.length} locations`}
            >
              <Settings size={14} strokeWidth={2} />
              Grid
            </button>

            {/* Import */}
            <button
              onClick={handleImportClick}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
            >
              <Upload size={14} strokeWidth={2.5} />
              Import
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
            >
              <Download size={14} strokeWidth={2.5} />
              Export
            </button>

            {/* Clear Board */}
            <button
              onClick={handleClearBoard}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 transition-all active:scale-95 shadow-sm"
              title="Clear all tasks from the board"
            >
              <Trash2 size={14} strokeWidth={2.5} />
              Clear
            </button>

            {/* Add Task */}
            <button
              onClick={() => { setEditingTask(null); setModalCtx({ date: projectStartDate, location: locations[0] ?? DEFAULT_LOCATIONS[0] }); }}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow shadow-indigo-200 transition-all hover:shadow-md hover:shadow-indigo-300 active:scale-95"
            >
              <Plus size={16} strokeWidth={2.5} /> Add Task
            </button>
          </div>
        </div>

        {/* Stats bar — clean enterprise look, no tutorial text */}
        <div className="flex items-center gap-3 px-5 py-2 border-t border-slate-100 overflow-x-auto">
          <span className="text-[11px] text-slate-500 font-medium flex-shrink-0">
            {totalTasks} task{totalTasks !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-200 flex-shrink-0">·</span>
          <span className="text-[11px] text-slate-500 font-medium flex-shrink-0">
            {numWeeks} weeks · {locations.length} locations
          </span>
          <div className="w-px h-4 bg-slate-200 flex-shrink-0 mx-1" />

          {/* Discipline chips */}
          {disciplineStats.map((stat) => {
            const theme = getTheme(stat.theme);
            return (
              <span key={stat.name} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder} flex-shrink-0`}>
                <span className={`w-2 h-2 rounded-full ${theme.resizeBar}`} />
                {stat.name} <span className="font-bold opacity-70">{stat.count}</span>
              </span>
            );
          })}

          {/* Active Contractors legend */}
          {activeContractors.length > 0 && (
            <>
              <div className="w-px h-4 bg-slate-200 flex-shrink-0 mx-1" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex-shrink-0">On site</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {activeContractors.map(([name, count]) => {
                  const palette = CONTRACTOR_PALETTE[contractorColorIdx(name)];
                  const initials = contractorInitials(name);
                  return (
                    <div
                      key={name}
                      title={`${name} — ${count} task${count !== 1 ? 's' : ''}`}
                      className={`flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-default transition-all hover:ring-2 ${palette.ring} ${palette.bg} ${palette.text} flex-shrink-0`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-black tracking-tight flex-shrink-0">
                        {initials}
                      </span>
                      <span className="leading-none">{name}</span>
                      <span className="ml-0.5 opacity-60 font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── BOARD (with empty-state overlay) ───────────────── */}
      <div className="relative flex-1 overflow-hidden">
        <PlanningGrid
          tasks={tasks}
          startDate={projectStartDate}
          numWeeks={numWeeks}
          locations={locations}
          disciplines={disciplines}
          onTaskMove={handleTaskMove}
          onTaskClick={handleTaskClick}
          onCellClick={handleCellClick}
          onResize={handleResize}
        />

        {tasks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div
              className="pointer-events-auto text-center max-w-sm px-8 py-10 bg-white/95 border border-slate-200 rounded-2xl shadow-xl"
              style={{ backdropFilter: 'blur(8px)' }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-200 flex items-center justify-center mx-auto mb-4">
                <ClipboardList size={28} className="text-indigo-500" strokeWidth={1.5} />
              </div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Your planning board is empty</h2>
              <p className="text-[12px] text-slate-500 mb-6 leading-relaxed">
                Import an existing planning file, or click any cell on the board to start adding tasks manually.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleImportClick}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all active:scale-95 shadow shadow-indigo-200"
                >
                  <Upload size={15} strokeWidth={2.5} /> Import Planning File
                </button>
                <button
                  onClick={() => { setEditingTask(null); setModalCtx({ date: projectStartDate, location: locations[0] ?? DEFAULT_LOCATIONS[0] }); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                >
                  <Plus size={15} strokeWidth={2.5} /> Add First Task
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 flex items-center justify-center gap-1">
                <FileJson size={10} /> Exports/imports use .json format
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── HIDDEN file input ──────────────────────────────── */}
      <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />

      {/* ── GRID SETTINGS MODAL ────────────────────────────── */}
      {showGridSettings && (
        <GridSettingsModal
          numWeeks={numWeeks}
          locations={locations}
          contractors={contractors}
          disciplines={disciplines}
          projectStartDate={projectStartDate}
          onSave={handleSaveGridSettings}
          onClose={() => setShowGridSettings(false)}
        />
      )}

      {/* ── SLIDE-OVER DRAWER ──────────────────────────────── */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          disciplines={disciplines}
          onClose={() => setSelectedTaskId(null)}
          onToggleDone={handleToggleDone}
          onDelete={handleDeleteTask}
          onEdit={handleStartEdit}
        />
      )}

      {/* ── ADD / EDIT MODAL ───────────────────────────────── */}
      {modalCtx && (
        <AddTaskModal
          prefilledDate={modalCtx.date}
          prefilledLocation={modalCtx.location}
          editTask={editingTask ?? undefined}
          contractors={contractors}
          disciplines={disciplines}
          onSave={handleSaveTask}
          onClose={handleCloseModal}
        />
      )}

      {/* ── TOAST STACK ────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold
              animate-[slideUp_.25s_ease-out]
              ${toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'}
            `}
          >
            {toast.type === 'success'
              ? <CheckCheck size={16} className="text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
              : <AlertCircle size={16} className="text-red-500 flex-shrink-0" strokeWidth={2.5} />}
            <span>{toast.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
