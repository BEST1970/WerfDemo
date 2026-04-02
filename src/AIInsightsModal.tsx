import { useState, useMemo, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3-force';
import { X, Activity } from 'lucide-react';
import type { Task } from './types';

interface Props {
  tasks: Task[];
  projectTitle: string;
  onClose: () => void;
}

export default function AIInsightsModal({ tasks, projectTitle, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('Clash Detection');
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
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

    // ==========================================
    // TAB: PROJECT PULSE
    // ==========================================
    if (activeTab === 'Project Pulse') {
        const nodes: any[] = [];
        const links: any[] = [];
        
        // 1. Central Project Node
        nodes.push({
            id: 'core_project',
            group: 'project',
            name: projectTitle,
            val: 28,
            color: '#fbbf24' // gold
        });
        
        // 2. Map disciplines
        const disciplineStats = {
            Structural: { total: 0, done: 0, color: '#22c55e' }, // green
            MEP: { total: 0, done: 0, color: '#3b82f6' }, // blue
            Electrical: { total: 0, done: 0, color: '#a855f7' }, // purple
            Steelwork: { total: 0, done: 0, color: '#f97316' }, // orange
            Other: { total: 0, done: 0, color: '#94a3b8' } // slate
        };
        
        for (const t of tasks) {
            const tk = t.discipline;
            const key = tk === 'Structural' || tk === 'MEP' || tk === 'Electrical' || tk === 'Steelwork' ? tk : 'Other';
            disciplineStats[key].total++;
            if (t.isDone) disciplineStats[key].done++;
        }
        
        // 3. Build discipline nodes & links
        for (const [disc, stats] of Object.entries(disciplineStats)) {
            if (stats.total > 0) {
                const completionRatio = stats.done / stats.total; // 0 to 1
                nodes.push({
                    id: `disc_${disc}`,
                    group: 'discipline',
                    name: disc,
                    val: 14,
                    color: stats.color,
                    completion: completionRatio
                });
                
                links.push({
                    source: `disc_${disc}`,
                    target: 'core_project',
                    isPulse: true,
                    completion: completionRatio,
                    particles: Math.max(0, Math.min(10, Math.round(completionRatio * 10))), // 0 to 10 max
                    color: stats.color
                });
            }
        }
        
        return { nodes, links };
    }

    // ==========================================
    // TAB: CLASH DETECTION
    // ==========================================
    const tasksByLocation = new Map<string, Task[]>();
    for (const task of tasks) {
        if (!tasksByLocation.has(task.location)) tasksByLocation.set(task.location, []);
        tasksByLocation.get(task.location)!.push(task);
    }

    const clashingLocations = new Set<string>();

    for (const [location, locTasks] of tasksByLocation.entries()) {
        const sorted = [...locTasks].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let hasClash = false;
        // O(n^2) overlap check
        for (let i = 0; i < sorted.length; i++) {
            const taskA = sorted[i];
            const startA = new Date(taskA.date).getTime();
            const endA = startA + (taskA.duration - 1) * 86400000;

            for (let j = i + 1; j < sorted.length; j++) {
                const taskB = sorted[j];
                if (taskA.contractor !== taskB.contractor) {
                    const startB = new Date(taskB.date).getTime();
                    const endB = startB + (taskB.duration - 1) * 86400000;
                    if (startA <= endB && endA >= startB) {
                        hasClash = true;
                        break;
                    }
                }
            }
            if (hasClash) break;
        }

        if (hasClash) clashingLocations.add(location);
    }

    const nodes: any[] = [];
    const links: any[] = [];

    const activeLocations = new Set<string>(tasks.map(t => t.location));
    const activeContractors = new Set<string>(tasks.map(t => t.contractor));
    
    // Add Location Nodes
    for (const loc of activeLocations) {
        nodes.push({ id: `loc_${loc}`, group: 'location', name: loc, isClashing: clashingLocations.has(loc), val: 18 });
    }

    // Add Contractor Nodes
    for (const cont of activeContractors) {
        nodes.push({ id: `cont_${cont}`, group: 'contractor', name: cont, val: 6 });
    }

    // Add Links
    const seenLinks = new Set<string>();
    for (const task of tasks) {
        const linkId = `${task.contractor}___${task.location}`;
        if (!seenLinks.has(linkId)) {
            seenLinks.add(linkId);
            links.push({ source: `cont_${task.contractor}`, target: `loc_${task.location}`, targetIsClashing: clashingLocations.has(task.location) });
        }
    }

    return { nodes, links };
  }, [tasks, activeTab, projectTitle]);

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
        if (activeTab === 'Project Pulse') {
            // Highly repulsed, spaced out structure for the project pulse
            fgRef.current.d3Force('charge').strength(-4000).distanceMax(2000);
            fgRef.current.d3Force('collide', d3.forceCollide((node: any) => node.val * 3 + 20));
        } else {
            // Standard layout for Clash Graph
            fgRef.current.d3Force('charge').strength(-1200).distanceMax(1000);
            fgRef.current.d3Force('collide', d3.forceCollide((node: any) => (node.val * 2) + 24));
        }
        fgRef.current.d3ReheatSimulation();
    }
  }, [graphData, dimensions, activeTab]);

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
                    <p className="text-xs font-medium text-slate-400">Force-Directed Graph Dashboard</p>
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
                <button
                    onClick={() => setActiveTab('Project Pulse')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'Project Pulse' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Project Pulse
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

      {/* Graph Area */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden" style={{ cursor: 'grab' }}>
        {graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-medium">
                No active tasks to visualize.
            </div>
        ) : (
            <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeRelSize={4}
                nodeVal={(node: any) => node.val}
                nodeLabel={(node: any) => node.name}
                nodeColor={(node: any) => {
                    if (activeTab === 'Project Pulse') {
                        return node.color;
                    }
                    if (node.group === 'location') {
                        return node.isClashing ? '#ef4444' : '#93c5fd'; // Red vs Soft Blue
                    }
                    return '#86efac'; // Soft Green for contractors
                }}
                linkColor={(link: any) => {
                    if (activeTab === 'Project Pulse') {
                        return `${link.color}60`; // Semi-transparent colored link
                    }
                    return link.targetIsClashing ? '#ef4444' : 'rgba(255,255,255,0.15)';
                }}
                linkWidth={(link: any) => {
                    if (activeTab === 'Project Pulse') {
                        return Math.max(1.5, link.completion * 6); // Thicker depending on completion
                    }
                    return link.targetIsClashing ? 2.5 : 1.5;
                }}
                linkDirectionalParticles={(link: any) => activeTab === 'Project Pulse' ? link.particles : 0}
                linkDirectionalParticleSpeed={(link: any) => activeTab === 'Project Pulse' ? link.completion * 0.015 : 0}
                linkDirectionalParticleWidth={() => activeTab === 'Project Pulse' ? 4 : 0}
                linkDirectionalParticleColor={(link: any) => link.color}
                nodeCanvasObjectMode={() => 'after'}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    // Stroke wrappers
                    if (activeTab === 'Clash Detection') {
                        if (node.group === 'location') {
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                            ctx.strokeStyle = '#0f172a'; // dark border
                            ctx.lineWidth = 2 / globalScale;
                            ctx.stroke();
                        }
                    } else if (activeTab === 'Project Pulse') {
                        if (node.group === 'project') {
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, node.val + 6, 0, 2 * Math.PI, false);
                            ctx.fillStyle = 'rgba(251, 191, 36, 0.15)'; // gold glow
                            ctx.fill();
                            
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                            ctx.strokeStyle = '#fff';
                            ctx.lineWidth = 4 / globalScale;
                            ctx.stroke();
                        } else if (node.group === 'discipline') {
                            // Dark border for discipline nodes
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                            ctx.strokeStyle = '#0f172a';
                            ctx.lineWidth = 2 / globalScale;
                            ctx.stroke();
                        }
                    }

                    // Labels
                    const isCentral = activeTab === 'Project Pulse' && node.group === 'project';
                    const isDiscipline = activeTab === 'Project Pulse' && node.group === 'discipline';
                    
                    const label = isDiscipline ? `${node.name} (${Math.round(node.completion * 100)}%)` : node.name;
                    const baseFontSize = isCentral ? 18 : (node.group === 'location' ? 14 : 11);
                    const fontSize = baseFontSize / Math.max(1, globalScale * 0.8);
                    
                    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.shadowColor = 'black';
                    ctx.shadowBlur = 4;
                    ctx.fillText(label, node.x, node.y + (node.val * 1.5) + fontSize);
                    ctx.shadowBlur = 0;
                    
                    // Specific Clash Glow
                    if (activeTab === 'Clash Detection' && node.group === 'location' && node.isClashing) {
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
        
        {/* Dynamic Graph Legend */}
        {activeTab === 'Clash Detection' ? (
            <div className="absolute bottom-6 left-6 p-4 rounded-xl bg-black/50 border border-white/10 backdrop-blur-md">
                <h3 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Legend</h3>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-300 border border-slate-900" />
                        <span className="text-xs font-semibold text-slate-200">Location Hub</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-3.5 h-3.5">
                            <div className="absolute inset-[-4px] rounded-full bg-red-500/20 animate-pulse" />
                            <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-slate-900" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">Clashing Location</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-0.5 bg-red-500" />
                        <span className="text-xs font-semibold text-slate-200">Clashing Path</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                        <span className="text-xs font-semibold text-slate-200">Contractor Instance</span>
                    </div>
                </div>
            </div>
        ) : (
            <div className="absolute bottom-6 left-6 p-4 rounded-xl bg-black/50 border border-white/10 backdrop-blur-md">
                <h3 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Pulse Legend</h3>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-4 h-4">
                            <div className="absolute inset-[-4px] rounded-full bg-amber-400/20" />
                            <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-white" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">Project Core</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-slate-900" />
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-slate-900" />
                            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-slate-900" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">Discipline Nodes</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <div className="w-6 h-1 bg-gradient-to-r from-blue-500/80 to-transparent relative overflow-hidden rounded overflow-hidden">
                            <div className="absolute left-1 top-1 w-1 h-1 bg-white rounded-full" />
                            <div className="absolute left-4 top-1 w-1 h-1 bg-white rounded-full" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-200">Energy Streams</span>
                            <span className="text-[9px] text-slate-400">Particles emit based on % done</span>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
