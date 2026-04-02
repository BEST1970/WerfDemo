import { useState, useRef, useEffect } from 'react';
import { X, Plus, MapPin, Calendar, CheckCircle2, Pencil } from 'lucide-react';
import type { Task, Discipline, Location, DisciplineDef } from './types';
import { getTheme } from './theme';

interface Props {
  prefilledDate: string;
  prefilledLocation: Location;
  editTask?: Task;          // if set → Edit Mode
  contractors: string[];    // dynamic list from App state
  disciplines: DisciplineDef[];
  onSave: (task: Task) => void;
  onClose: () => void;
}



function generateId() { return 'task-' + Math.random().toString(36).slice(2, 9); }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AddTaskModal({ prefilledDate, prefilledLocation, editTask, contractors, disciplines, onSave, onClose }: Props) {
  const isEdit = !!editTask;

  // Pre-fill from editTask when in edit mode
  const [name, setName]             = useState(editTask?.name ?? '');
  const [discipline, setDiscipline] = useState<Discipline>(editTask?.discipline ?? disciplines[0]?.name ?? 'Structural');
  const [contractor, setContractor] = useState(editTask?.contractor ?? contractors[0] ?? '');
  const [duration, setDuration]     = useState(editTask?.duration ?? 1);
  const [error, setError]           = useState('');

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = setTimeout(() => nameRef.current?.focus(), 50); return () => clearTimeout(t); }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === 'Escape') onClose();
  }

  function submit() {
    if (!name.trim()) { setError('Task name is required.'); return; }
    const task: Task = {
      id:              editTask?.id ?? generateId(), // preserve ID in edit mode
      name:            name.trim(),
      discipline,
      location:        prefilledLocation,
      date:            prefilledDate,
      contractor,
      contractorColor: theme.hexColor,
      isDone:          editTask?.isDone ?? false,
      duration:        Math.max(1, duration),
    };
    onSave(task);
    onClose();
  }

  const discDef = disciplines.find(d => d.name === discipline) || { name: discipline, theme: 'slate' };
  const theme = getTheme(discDef.theme);
  const avatarInitials = contractor.split(' ')[0].slice(0, 2).toUpperCase();

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 ' +
    'placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition';
  const labelCls = 'block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5';

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 ${isEdit
          ? 'bg-gradient-to-r from-indigo-700 to-violet-700'
          : 'bg-gradient-to-r from-slate-900 to-slate-700'}`}>
          <div className="flex items-center gap-2">
            {isEdit && <Pencil size={14} className="text-indigo-200" />}
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">{isEdit ? 'Edit Task' : 'Add Task'}</h2>
              <p className="text-[11px] text-slate-300 mt-0.5">Press Enter to {isEdit ? 'save' : 'confirm'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition">
            <X size={16} />
          </button>
        </div>

        {/* Context bar */}
        <div className="flex items-center gap-3 px-5 py-3 bg-indigo-50 border-b border-indigo-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
            <MapPin size={12} strokeWidth={2.5} /> {prefilledLocation}
          </div>
          <span className="text-indigo-200 font-bold">·</span>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
            <Calendar size={12} strokeWidth={2.5} /> {formatDate(prefilledDate)}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="px-5 py-4 space-y-4">
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}

          {/* Task name */}
          <div>
            <label className={labelCls}>Task Name</label>
            <input ref={nameRef} type="text" value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Install cable trays"
              className={`${inputCls} font-medium`} />
          </div>

          {/* Discipline + Duration */}
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div>
              <label className={labelCls}>Discipline</label>
              <select value={discipline} onChange={(e) => setDiscipline(e.target.value as Discipline)} className={inputCls}>
                {disciplines.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                  {discipline}
                </span>
                <span className="text-[10px] text-slate-400">auto-color</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Duration (d)</label>
              <input type="number" min={1} max={20} value={duration}
                onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                className={`${inputCls} text-center font-bold`} />
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">working days</p>
            </div>
          </div>

          {/* Contractor */}
          <div>
            <label className={labelCls}>Contractor</label>
            <select value={contractor} onChange={(e) => setContractor(e.target.value)} className={inputCls}>
              {contractors.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="mt-2 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shadow transition-colors duration-200"
                style={{ backgroundColor: theme.hexColor }}>
                {avatarInitials}
              </span>
              <span className="text-[11px] text-slate-400">Avatar preview — color matches discipline</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <CheckCircle2 size={10} className="text-emerald-400" />
            Click any task card to view details, mark done, or delete
          </p>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit"
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white shadow flex items-center justify-center gap-1.5 transition-all active:scale-95 ${isEdit
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:shadow-md hover:shadow-indigo-300'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:shadow-md hover:shadow-indigo-300'}`}>
              {isEdit ? <><Pencil size={14} strokeWidth={2.5} /> Save Changes</> : <><Plus size={14} strokeWidth={2.5} /> Add to Board</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
