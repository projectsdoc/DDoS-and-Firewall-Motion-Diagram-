import React from 'react';
import { DiagramNode } from '../types';
import { Cpu, HelpCircle, Network, HardDrive, Layers, RefreshCw } from 'lucide-react';

interface MetricsDashboardProps {
  nodes: DiagramNode[];
  edgesCount: number;
  packetsCount: number;
  aiConnected: boolean;
  onClearDiagram: () => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  nodes,
  edgesCount,
  packetsCount,
  aiConnected,
  onClearDiagram,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Metrics Card 1: Node Chassis Count */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <div className="flex justify-between items-start text-indigo-400">
          <div>
            <p className="text-[10px] font-mono tracking-wider uppercase text-slate-400">TOTAL SYSTEM DEVICES</p>
            <h3 className="text-2xl font-mono font-bold mt-1 text-slate-100 tracking-tight">
              {nodes.length} <span className="text-xs text-slate-400">Chassis</span>
            </h3>
          </div>
          <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/25">
            <HardDrive className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        {/* Small horizontal segment distribution of nodes by type */}
        <div className="flex gap-1 mt-4">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="h-2 rounded-full flex-1"
              style={{ backgroundColor: node.color || '#a78bfa' }}
              title={`${node.label} (${node.type})`}
            />
          ))}
          {nodes.length === 0 && <div className="h-2 rounded-full flex-1 bg-slate-800" />}
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono mt-2 text-slate-500">
          <span>ACTIVE CHASSIS LIST</span>
          <span className="text-indigo-400">STABLE</span>
        </div>
      </div>

      {/* Metrics Card 2: Transmission Channels */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <div className="flex justify-between items-start text-emerald-400">
          <div>
            <p className="text-[10px] font-mono tracking-wider uppercase text-slate-400">COMMUNICATION PATHWAYS</p>
            <h3 className="text-2xl font-mono font-bold mt-1 text-slate-100 tracking-tight">
              {edgesCount} <span className="text-xs text-slate-400">Channels</span>
            </h3>
          </div>
          <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/25">
            <Network className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="w-full bg-slate-800/40 h-1.5 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, (edgesCount / 8) * 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono mt-2 text-slate-500">
          <span>TRANSMISSION MEDIUMS</span>
          <span className="text-emerald-400">ONLINE</span>
        </div>
      </div>

      {/* Metrics Card 3: Packet Pipelines */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <div className="flex justify-between items-start text-cyan-400">
          <div>
            <p className="text-[10px] font-mono tracking-wider uppercase text-slate-400">PACKET STREAMS</p>
            <h3 className="text-2xl font-mono font-bold mt-1 text-slate-100 tracking-tight">
              {packetsCount} <span className="text-xs text-slate-400">Streamlines</span>
            </h3>
          </div>
          <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/25">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        <div className="w-full bg-slate-800/40 h-1.5 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${Math.min(100, (packetsCount / 6) * 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono mt-2 text-slate-500">
          <span>REAL-TIME TELEMETRY</span>
          <span className="text-cyan-400">ACTIVE FLOW</span>
        </div>
      </div>

      {/* Metrics Card 4: AI Status and Clear Canvas */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-mono tracking-wider uppercase text-slate-400">AI EXTRACTOR ENGINE</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`w-2 h-2 rounded-full ${aiConnected ? 'bg-cyan-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-mono text-xs font-bold text-slate-200">
                {aiConnected ? 'GEMINI CONNECTED' : 'LOCAL HEURISTICS'}
              </span>
            </div>
          </div>

          <button
            onClick={onClearDiagram}
            title="Wipe diagram canvas and start blank"
            className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-rose-400 hover:text-rose-300 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono pt-3 border-t border-slate-800/40 mt-3 text-slate-500">
          <span>SANDBOX CONTROLLER</span>
          <span className="text-cyan-400">[V3.5 FLASH]</span>
        </div>
      </div>
    </div>
  );
};
