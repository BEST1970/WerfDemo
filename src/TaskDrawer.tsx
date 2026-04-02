import { useEffect, useState } from 'react';
import {
  X, MapPin, Calendar, Clock, Building2,
  Trash2, CheckCircle2, RotateCcw, Bot, ShieldCheck, Pencil,
  HardHat, Zap, Wind, Wrench,
} from 'lucide-react';
import type { Task, Discipline } from './types';
import { contractorInitials } from './mockData';

interface Props {
  task: Task;
  onClose: () => void;
  onToggleDone: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: () => void;
}

const DISCIPLINE_CFG: Record<Discipline, {
  Icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>;
  bg: string; text: string; border: string; label: string;
}> = {
  Structural: { Icon: HardHat, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Structural' },
  MEP:        { Icon: Wind,    bg: 'bg-blue-50',   text: 'text-blue-700',  border: 'border-blue-100',  label: 'MEP' },
  Electrical: { Icon: Zap,     bg: 'bg-green-50',  text: 'text-green-700', border: 'border-green-100', label: 'Electrical' },
  Steelwork:  { Icon: Wrench,  bg: 'bg-orange-50', text: 'text-orange-700',border: 'border-orange-100',label: 'Steelwork' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default function TaskDrawer({ task, onClose, onToggleDone, onDelete, onEdit }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  function animateClose(then: () => void) {
    setVisible(false);
    setTimeout(then, 280);
  }

  const handleClose = () => animateClose(onClose);
  const handleToggleDone = () => { onToggleDone(task.id); animateClose(onClose); };
  const handleDelete = () => {
    if (!confirm(`Delete "${task.name}"? This cannot be undone.`)) return;
    onDelete(task.id);
    animateClose(onClose);
  };
  const handleEdit = () => animateClose(onEdit);

  const cfg = DISCIPLINE_CFG[task.discipline];
  const { Icon } = cfg;

  const rowCls  = 'flex items-start gap-3 py-3 border-b border-slate-100 last:border-0';
  const iconCls = 'mt-0.5 flex-shrink-0 text-slate-400';
  const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5';
  const valueCls = 'text-sm font-semibold text-slate-800 leading-snug';

  return (
    <>
      {/* Dark overlay */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-slate-900/40 transition-opacity duration-300"
        style={{ zIndex: 100, opacity: visible ? 1 : 0 }}
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 right-0 bottom-0 bg-white shadow-2xl flex flex-col transition-transform duration-[280ms] ease-[cubic-bezier(.22,.68,0,1.2)]"
        style={{
          zIndex: 101,
          width: 'clamp(340px, 30vw, 480px)',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 bg-white flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              <Icon size={10} strokeWidth={2.5} /> {cfg.label}
            </div>
            <h2 className={`text-base font-bold leading-snug ${task.isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
              {task.name}
            </h2>
            {task.isDone && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
                <CheckCircle2 size={11} strokeWidth={2.5} /> Completed
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Edit icon in header */}
            <button onClick={handleEdit}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              title="Edit task">
              <Pencil size={16} />
            </button>
            <button onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Task Details */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Task Details</h3>
            <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 divide-y divide-slate-100">

              <div className={rowCls}>
                <MapPin size={15} className={iconCls} />
                <div><p className={labelCls}>Zone / Location</p><p className={valueCls}>{task.location}</p></div>
              </div>

              <div className={rowCls}>
                <Calendar size={15} className={iconCls} />
                <div><p className={labelCls}>Planned Start</p><p className={valueCls}>{formatDate(task.date)}</p></div>
              </div>

              <div className={rowCls}>
                <Clock size={15} className={iconCls} />
                <div>
                  <p className={labelCls}>Duration</p>
                  <p className={valueCls}>{task.duration} working {task.duration === 1 ? 'day' : 'days'}</p>
                </div>
              </div>

              <div className={rowCls}>
                <Building2 size={15} className={iconCls} />
                <div>
                  <p className={labelCls}>Contractor</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: task.isDone ? '#9ca3af' : task.contractorColor }}>
                      {contractorInitials(task.contractor)}
                    </span>
                    <p className={valueCls}>{task.contractor}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Actions</h3>
            <div className="space-y-2">

              {/* Toggle done */}
              <button onClick={handleToggleDone}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95
                  ${task.isDone
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow shadow-emerald-200 hover:shadow-md hover:shadow-emerald-300'}`}>
                {task.isDone
                  ? <><RotateCcw size={16} strokeWidth={2.5} /> Mark as Active</>
                  : <><CheckCircle2 size={16} strokeWidth={2.5} /> Mark as Completed</>}
              </button>

              {/* Edit */}
              <button onClick={handleEdit}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-all active:scale-95">
                <Pencil size={16} strokeWidth={2.5} /> Edit Task
              </button>

              {/* Delete */}
              <button onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-all active:scale-95">
                <Trash2 size={16} strokeWidth={2.5} /> Delete Task
              </button>
            </div>
          </section>

          {/* AI Insights */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <Bot size={12} className="text-violet-400" />
              AI Insights
              <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-violet-100 text-violet-600 border border-violet-200 uppercase tracking-wide">Beta</span>
            </h3>
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div>
                  <p className="text-sm font-semibold text-slate-700">No scheduling conflicts detected.</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    The AI scheduling engine will analyse predecessor tasks, crew availability, and critical path to flag conflicts automatically.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-violet-500 font-semibold">
                <Bot size={10} /> Powered by WerfAI — coming soon
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
