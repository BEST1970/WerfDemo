import { useState, useMemo, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { X, Activity } from 'lucide-react';
import type { Task } from './types';

interface Props {
  tasks: Task[];
  onClose: () => void;
}

export default function AIInsightsModal({ tasks, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('Clash Detection');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
        setDimensions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight
        });
    }
    const handleResize = () => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
        }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const graphData = useMemo(() => {
    if (tasks.length === 0) return { nodes: [], links: [] };

    // 1. Calculate Clashes
    const tasksByLocation = new Map<string, Task[]>();
    for (const task of tasks) {
        if (!tasksByLocation.has(task.location)) tasksByLocation.set(task.location, []);
        tasksByLocation.get(task.location)!.push(task);
    }

    const clashingLocations = new Set<string>();

    for (const [location, locTasks] of tasksByLocation.entries()) {
        const sorted = [...locTasks].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let hasClash = false;
        // O(n^2) check for overlap between distinct contractors
        for (let i = 0; i < sorted.length; i++) {
            const taskA = sorted[i];
            const startA = new Date(taskA.date).getTime();
            const endA = startA + (taskA.duration - 1) * 86400000;

            for (let j = i + 1; j < sorted.length; j++) {
                const taskB = sorted[j];
                // Different contractors only
                if (taskA.contractor !== taskB.contractor) {
                    const startB = new Date(taskB.date).getTime();
                    const endB = startB + (taskB.duration - 1) * 86400000;

                    // Overlap check
                    if (startA <= endB && endA >= startB) {
                        hasClash = true;
                        break;
                    }
                }
            }
            if (hasClash) break;
        }

        if (hasClash) {
            clashingLocations.add(location);
        }
    }

    // 2. Build Nodes and Links
    const nodes: any[] = [];
    const links: any[] = [];

    const activeLocations = new Set<string>(tasks.map(t => t.location));
    const activeContractors = new Set<string>(tasks.map(t => t.contractor));
    
    // Add Location Nodes
    for (const loc of activeLocations) {
        nodes.push({
            id: `loc_${loc}`,
            group: 'location',
            name: loc,
            isClashing: clashingLocations.has(loc),
            val: 10 // larger visually
        });
    }

    // Map contractors to stable hex colors (from existing tasks or fallback)
    const contractorMap = new Map<string, string>();
    for (const t of tasks) contractorMap.set(t.contractor, t.contractorColor || '#8b5cf6');

    // Add Contractor Nodes
    for (const cont of activeContractors) {
        nodes.push({
            id: `cont_${cont}`,
            group: 'contractor',
            name: cont,
            color: contractorMap.get(cont),
            val: 5 // smaller visually
        });
    }

    // Add Links
    const seenLinks = new Set<string>();
    for (const task of tasks) {
        const linkId = `${task.contractor}___${task.location}`;
        if (!seenLinks.has(linkId)) {
            seenLinks.add(linkId);
            links.push({
                source: `cont_${task.contractor}`,
                target: `loc_${task.location}`,
            });
        }
    }

    return { nodes, links };
  }, [tasks]);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-950/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Activity size={20} className="text-white" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white leading-tight">AI Insights</h2>
                    <p className="text-xs font-medium text-slate-400">Force-Directed Graph Visualization</p>
                </div>
            </div>

            <div className="h-8 w-px bg-white/10 mx-2" />

            <div className="flex bg-white/5 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab('Clash Detection')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'Clash Detection' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Clash Detection
                </button>
            </div>
        </div>

        <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
            title="Close Insights"
        >
            <X size={24} />
        </button>
      </div>

      {/* Graph Area / Physics Container */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden" style={{ cursor: 'grab' }}>
        {graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-medium">
                No active tasks to visualize.
            </div>
        ) : (
            <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeRelSize={4}
                nodeVal={(node: any) => node.val}
                nodeLabel={(node: any) => node.name}
                nodeColor={(node: any) => {
                    if (node.group === 'location') {
                        return node.isClashing ? '#ef4444' : '#475569'; // Red vs slate-600
                    }
                    return node.color || '#8b5cf6';
                }}
                linkColor={() => 'rgba(255,255,255,0.15)'}
                linkWidth={1.5}
                nodeCanvasObjectMode={() => 'after'}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    const label = node.name;
                    const fontSize = node.group === 'location' ? 14 / Math.max(1, globalScale * 0.8) : 11 / Math.max(1, globalScale * 0.8);
                    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Name label on bottom of node
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.shadowColor = 'black';
                    ctx.shadowBlur = 4;
                    ctx.fillText(label, node.x, node.y + (node.val * 1.5) + fontSize);
                    ctx.shadowBlur = 0;
                    
                    // Glow for clashing nodes
                    if (node.group === 'location' && node.isClashing) {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val * 2, 0, 2 * Math.PI, false);
                        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
                        ctx.fill();
                        
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val + 2, 0, 2 * Math.PI, false);
                        ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
                        ctx.lineWidth = 2 / globalScale;
                        ctx.stroke();
                    }
                }}
            />
        )}
        
        {/* Graph Legend */}
        <div className="absolute bottom-6 left-6 p-4 rounded-xl bg-black/50 border border-white/10 backdrop-blur-md">
            <h3 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Legend</h3>
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-600" />
                    <span className="text-xs font-semibold text-slate-200">Location Area</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-3.5 h-3.5">
                        <div className="absolute inset-[-4px] rounded-full bg-red-500/20 animate-pulse" />
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-red-400" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200">Clash (Overlapping Dates)</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="text-xs font-semibold text-slate-200">Contractor Instance</span>
                </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 max-w-[200px] leading-relaxed">
                Nodes automatically arrange themselves via physical forces based on connection gravity.
            </p>
        </div>
      </div>
    </div>
  );
}
