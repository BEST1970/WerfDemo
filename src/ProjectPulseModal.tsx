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

export default function ProjectPulseModal({ tasks, projectTitle, onClose }: Props) {
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

    const nodes: any[] = [];
    const links: any[] = [];
    
    // 1. Central Project Node
    nodes.push({
        id: 'core_project',
        group: 'project',
        name: projectTitle,
        val: 28,
        color: '#fef08a' // Soft pale gold
    });
    
    // 2. Map disciplines and translate to Dutch
    const translations: Record<string, string> = {
        Structural: 'Ruwbouw',
        MEP: 'Sanitair / HVAC',
        Electrical: 'Elektriciteit',
        Steelwork: 'Staalstructuur',
        Other: 'Overig'
    };

    const disciplineStats = {
        Structural: { total: 0, done: 0, color: '#86efac' }, // Soft Green
        MEP: { total: 0, done: 0, color: '#93c5fd' },        // Soft Blue
        Electrical: { total: 0, done: 0, color: '#d8b4fe' }, // Soft Purple
        Steelwork: { total: 0, done: 0, color: '#fdba74' },  // Soft Orange
        Other: { total: 0, done: 0, color: '#cbd5e1' }       // Soft Slate
    };
    
    for (const t of tasks) {
        const tk = t.discipline;
        const key = tk === 'Structural' || tk === 'MEP' || tk === 'Electrical' || tk === 'Steelwork' ? tk : 'Other';
        disciplineStats[key].total++;
        if (t.isDone) disciplineStats[key].done++;
    }
    
    // 3. Build discipline nodes & pastel links
    for (const [disc, stats] of Object.entries(disciplineStats)) {
        if (stats.total > 0) {
            const completionRatio = stats.done / stats.total; // 0 to 1
            const displayName = translations[disc] || disc;

            nodes.push({
                id: `disc_${disc}`,
                group: 'discipline',
                name: displayName,
                val: 14,
                color: stats.color,
                completion: completionRatio
            });
            
            links.push({
                source: `disc_${disc}`,
                target: 'core_project',
                completion: completionRatio,
                particles: Math.max(0, Math.min(10, Math.round(completionRatio * 10))), // 0 to 10 max
                color: stats.color
            });
        }
    }
    
    return { nodes, links };
  }, [tasks, projectTitle]);

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
        // Highly repulsed, spaced out structure for the project pulse
        fgRef.current.d3Force('charge').strength(-4000).distanceMax(2000);
        fgRef.current.d3Force('collide', d3.forceCollide((node: any) => node.val * 3 + 20));
        fgRef.current.d3ReheatSimulation();
    }
  }, [graphData, dimensions]);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-950/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Activity size={20} className="text-white" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white leading-tight">Project Pulse</h2>
                    <p className="text-xs font-medium text-slate-400">Dynamic Schedule Completion Core</p>
                </div>
            </div>
        </div>

        <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
            title="Close Pulse"
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
                nodeLabel={() => ''}
                nodeColor={(node: any) => node.color}
                linkColor={(link: any) => `${link.color}60`} // Semi-transparent colored link
                linkWidth={(link: any) => Math.max(1.5, link.completion * 6)} // Thicker depending on completion
                linkDirectionalParticles={(link: any) => link.particles}
                linkDirectionalParticleSpeed={(link: any) => link.completion * 0.015}
                linkDirectionalParticleWidth={() => 4}
                linkDirectionalParticleColor={(link: any) => link.color}
                nodeCanvasObjectMode={() => 'after'}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    // Soft Pastel Core Node Glow
                    if (node.group === 'project') {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val + 8, 0, 2 * Math.PI, false);
                        ctx.fillStyle = 'rgba(254, 240, 138, 0.15)'; // Soft gold glow
                        ctx.fill();
                        
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 4 / globalScale;
                        ctx.stroke();
                    } else if (node.group === 'discipline') {
                        // Soft dark border for discipline nodes
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                        ctx.strokeStyle = '#1e293b'; 
                        ctx.lineWidth = 2 / globalScale;
                        ctx.stroke();
                    }

                    // Labels mapping with percentages
                    const label = node.group === 'discipline' ? `${node.name} (${Math.round(node.completion * 100)}%)` : node.name;
                    const baseFontSize = node.group === 'project' ? 18 : 12;
                    const fontSize = baseFontSize / Math.max(1, globalScale * 0.8);
                    
                    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                    ctx.shadowBlur = 6;
                    ctx.fillText(label, node.x, node.y + (node.val * 1.5) + fontSize);
                    ctx.shadowBlur = 0;
                }}
            />
        )}
        
        {/* Dynamic Pulse Legend */}
        <div className="absolute bottom-6 left-6 p-4 rounded-xl bg-slate-950/40 border border-white/5 backdrop-blur-md shadow-2xl">
            <h3 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Project Pulse Legend</h3>
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-4 h-4">
                        <div className="absolute inset-[-4px] rounded-full bg-yellow-200/20" />
                        <div className="w-4 h-4 rounded-full bg-yellow-200 border-2 border-white" />
                    </div>
                    <span className="text-xs font-semibold text-slate-300">Project Core</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-300 border border-slate-900" />
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-300 border border-slate-900" />
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-300 border border-slate-900" />
                    </div>
                    <span className="text-xs font-semibold text-slate-300">Discipline Nodes</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <div className="w-6 h-1 relative rounded overflow-hidden" style={{ background: 'linear-gradient(90deg, rgba(147, 197, 253, 0.7) 0%, transparent 100%)' }}>
                        <div className="absolute left-1 top-1 w-1 h-1 bg-white rounded-full shadow-[0_0_2px_#fff]" />
                        <div className="absolute left-4 top-1 w-1 h-1 bg-white rounded-full shadow-[0_0_2px_#fff]" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-300">Energy Streams</span>
                        <span className="text-[9px] text-slate-500">Flow intensity reflects % completion</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
