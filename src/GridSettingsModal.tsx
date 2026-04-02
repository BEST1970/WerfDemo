import { useState } from 'react';
import { X, Settings, Plus, Trash2, GripVertical } from 'lucide-react';

interface Props {
  numWeeks: number;
  locations: string[];
  contractors: string[];
  projectStartDate: string;   // YYYY-MM-DD
  onSave: (numWeeks: number, locations: string[], contractors: string[], startDate: string) => void;
  onClose: () => void;
}

// Reusable editable list section
function ListSection({
  badge,
  title,
  subtitle,
  items,
  onRemove,
  onAdd,
  addPlaceholder,
  newValue,
  onNewValueChange,
  error,
  emptyMsg,
}: {
  badge: string;
  title: string;
  subtitle?: string;
  items: string[];
  onRemove: (idx: number) => void;
  onAdd: () => void;
  addPlaceholder: string;
  newValue: string;
  onNewValueChange: (v: string) => void;
  error: string;
  emptyMsg: string;
}) {
  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 ' +
    'placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition';
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-indigo-600">{badge}</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-700 leading-none">{title}</h3>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <span className="ml-auto text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 flex-shrink-0">
          {items.length} items
        </span>
      </div>

      <div className="space-y-1.5 mb-3">
        {items.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-3">{emptyMsg}</p>
        )}
        {items.map((item, idx) => (
          <div
            key={`${item}-${idx}`}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 group"
          >
            <GripVertical size={14} className="text-slate-300 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium text-slate-700">{item}</span>
            <button
              onClick={() => onRemove(idx)}
              className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
              title={`Remove "${item}"`}
            >
              <Trash2 size={13} strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder={addPlaceholder}
          value={newValue}
          onChange={(e) => onNewValueChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
          className={`${inputCls} flex-1`}
        />
        <button
          onClick={onAdd}
          className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-1.5 transition active:scale-95 flex-shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} /> Add
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}

export default function GridSettingsModal({ numWeeks, locations, contractors, projectStartDate, onSave, onClose }: Props) {
  const [weeks,       setWeeks]       = useState(numWeeks);
  const [locs,        setLocs]        = useState<string[]>([...locations]);
  const [ctors,       setCtors]       = useState<string[]>([...contractors]);
  const [startDate,   setStartDate]   = useState(projectStartDate);
  const [newLoc,      setNewLoc]      = useState('');
  const [newCtor,     setNewCtor]     = useState('');
  const [weeksError,  setWeeksError]  = useState('');
  const [dateError,   setDateError]   = useState('');
  const [locError,    setLocError]    = useState('');
  const [ctorError,   setCtorError]   = useState('');

  function handleWeeksChange(val: string) {
    setWeeksError('');
    const n = parseInt(val);
    setWeeks(!isNaN(n) ? n : 0);
  }

  // ── Locations helpers ─────────────────────────
  function addLocation() {
    const t = newLoc.trim();
    if (!t)             { setLocError('Location name cannot be empty.'); return; }
    if (locs.includes(t)) { setLocError(`"${t}" already exists.`); return; }
    setLocs((p) => [...p, t]); setNewLoc(''); setLocError('');
  }
  function removeLocation(idx: number) { setLocs((p) => p.filter((_, i) => i !== idx)); }

  // ── Contractors helpers ───────────────────────
  function addContractor() {
    const t = newCtor.trim();
    if (!t)              { setCtorError('Contractor name cannot be empty.'); return; }
    if (ctors.includes(t)) { setCtorError(`"${t}" already exists.`); return; }
    setCtors((p) => [...p, t]); setNewCtor(''); setCtorError('');
  }
  function removeContractor(idx: number) { setCtors((p) => p.filter((_, i) => i !== idx)); }

  function handleSave() {
    if (!startDate) { setDateError('Please select a valid start date.'); return; }
    const dow = new Date(startDate).getDay();
    if (dow === 0 || dow === 6) { setDateError('Start date must be a working day (Mon–Fri).'); return; }
    if (weeks < 1 || weeks > 52) { setWeeksError('Must be between 1 and 52 weeks.'); return; }
    if (locs.length === 0)  { setLocError('At least one location is required.'); return; }
    if (ctors.length === 0) { setCtorError('At least one contractor is required.'); return; }
    onSave(weeks, locs, ctors, startDate);
    onClose();
  }

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 ' +
    'placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition';

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={15} className="text-slate-300" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Grid Settings</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Timeline · Locations · Contractors</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* ── Section 0: Start Date ──────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-indigo-600">D</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 leading-none">Project Start Date</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">All column dates are calculated from this date</p>
              </div>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setDateError(''); }}
              className={`${inputCls} w-48`}
            />
            {dateError && <p className="text-xs text-red-600 mt-1.5">{dateError}</p>}
            {startDate && (() => {
              const d = new Date(startDate);
              const dow = d.getDay();
              if (dow !== 0 && dow !== 6) {
                return <p className="text-[11px] text-emerald-700 mt-1.5 font-medium">
                  ✓ Week 1 starts {d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>;
              }
              return null;
            })()}
          </div>

          <div className="border-t border-slate-100" />

          {/* ── Section 1: Timeline ─────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-indigo-600">W</span>
              </div>
              <h3 className="text-sm font-bold text-slate-700">Timeline Duration</h3>
            </div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Number of Weeks (1 – 52)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" min={1} max={52} value={weeks}
                onChange={(e) => handleWeeksChange(e.target.value)}
                className={`${inputCls} w-28 text-center font-bold text-lg`}
              />
              <span className="text-sm text-slate-500">
                = <span className="font-semibold text-slate-700">{weeks * 5}</span> working days
              </span>
            </div>
            {weeksError && <p className="text-xs text-red-600 mt-1.5">{weeksError}</p>}
          </div>

          <div className="border-t border-slate-100" />

          {/* ── Section 2: Locations ────────────────────────── */}
          <ListSection
            badge="L"
            title="Locations / Floors"
            items={locs}
            onRemove={removeLocation}
            onAdd={addLocation}
            addPlaceholder="e.g. Floor 4, Parking, Penthouse…"
            newValue={newLoc}
            onNewValueChange={(v) => { setNewLoc(v); setLocError(''); }}
            error={locError}
            emptyMsg="No locations defined."
          />

          <div className="border-t border-slate-100" />

          {/* ── Section 3: Contractors ──────────────────────── */}
          <ListSection
            badge="C"
            title="Contractors"
            subtitle="Available in the Add / Edit Task form"
            items={ctors}
            onRemove={removeContractor}
            onAdd={addContractor}
            addPlaceholder="e.g. Steelfix, Insulation Pro…"
            newValue={newCtor}
            onNewValueChange={(v) => { setNewCtor(v); setCtorError(''); }}
            error={ctorError}
            emptyMsg="No contractors defined."
          />

          {/* Info notice */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
              ⚠️ Removing a location or reducing weeks does not delete tasks — off-grid tasks remain in state and will reappear if restored. Removing a contractor does not affect already-created tasks.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
            Cancel
          </button>
          <button onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition active:scale-95 shadow shadow-indigo-200 flex items-center justify-center gap-1.5">
            <Settings size={14} strokeWidth={2.5} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
