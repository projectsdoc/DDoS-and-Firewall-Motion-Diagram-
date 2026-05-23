import React from 'react';
import { NetworkMetrics, SimulationConfig } from '../types';
import { Shield, ShieldAlert, Cpu, Activity, ArrowUpRight, Ban, RefreshCw } from 'lucide-react';

interface MetricsDashboardProps {
  metrics: NetworkMetrics;
  config: SimulationConfig;
  onResetCounters: () => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  metrics,
  config,
  onResetCounters,
}) => {
  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getCpuColor = () => {
    if (metrics.cpuUsage > 85) return 'text-red-500 border-red-500/20 bg-red-950/20';
    if (metrics.cpuUsage > 50) return 'text-amber-500 border-amber-500/20 bg-amber-950/20';
    return 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Metrics Card 1: Server CPU Load */}
      <div className={`p-4 rounded-xl border bg-slate-900/60 backdrop-blur-md transition-all duration-300 ${getCpuColor()}`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-mono tracking-wider uppercase opacity-80">SERVER CPU UTILITY</p>
            <h3 className="text-2xl font-mono font-bold mt-1 tracking-tight">
              {metrics.cpuUsage.toFixed(1)}%
            </h3>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/40">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        {/* Dynamic loading progress bar */}
        <div className="w-full bg-slate-800/40 h-1.5 rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-current transition-all duration-200"
            style={{ width: `${Math.min(100, Math.max(2, metrics.cpuUsage))}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono mt-2 opacity-75">
          <span>CORES: 32 xeon</span>
          <span>
            {metrics.cpuUsage > 85 ? '🚨 OVERLOAD LIMIT' : 'SYSTEM OPTIMAL'}
          </span>
        </div>
      </div>

      {/* Metrics Card 2: Safe Packet Throughput Rate */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="flex justify-between items-start text-emerald-400">
          <div>
            <p className="text-[10px] font-mono tracking-wider uppercase text-slate-400">PASSED BANDWIDTH</p>
            <h3 className="text-2xl font-mono font-bold mt-1 text-slate-100 tracking-tight">
              {metrics.allowedBandwidth.toFixed(1)} <span className="text-xs text-slate-400">Mbps</span>
            </h3>
          </div>
          <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/25">
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, (metrics.allowedBandwidth / 40) * 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono mt-2 text-slate-400">
          <span>TX PACKETS: {metrics.packetsProcessed.toLocaleString()}</span>
          <span className="text-emerald-400 font-semibold">SECURE TCP OK</span>
        </div>
      </div>

      {/* Metrics Card 3: Filtered DDoS Attack Volume */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className={`flex justify-between items-start ${config.firewallActive && config.ddosIntensity > 0 ? 'text-cyan-400' : 'text-rose-500'}`}>
          <div>
            <p className="text-[10px] font-mono tracking-wider uppercase text-slate-400">
              {config.firewallActive ? 'SHIELDED BLOCKS' : 'INTRUSION TRAFFIC'}
            </p>
            <h3 className="text-2xl font-mono font-bold mt-1 text-slate-100 tracking-tight">
              {metrics.blockedBandwidth.toFixed(1)} <span className="text-xs text-slate-400">Mbps</span>
            </h3>
          </div>
          <div className={`p-2 rounded-lg border ${
            config.firewallActive 
              ? 'bg-cyan-950/30 border-cyan-500/25' 
              : 'bg-rose-950/30 border-rose-500/25'
          }`}>
            <Ban className="w-5 h-5" />
          </div>
        </div>

        {/* Dynamic drop scale bar */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${config.firewallActive ? 'bg-cyan-500' : 'bg-rose-500'}`}
            style={{ width: `${Math.min(100, (metrics.blockedBandwidth / 250) * 100)}%` }}
          />
        </div>

        <div className={`flex justify-between items-center text-[9px] font-mono mt-2 ${config.firewallActive ? 'text-cyan-400' : 'text-rose-400 font-semibold animate-pulse'}`}>
          <span>BLOCKED: {metrics.packetsDropped.toLocaleString()}</span>
          <span>{config.firewallActive ? 'MITIGATED 100%' : 'FLOOD CRITICAL'}</span>
        </div>
      </div>

      {/* Metrics Card 4: System Connection Uptime */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between">
        <div className="flex justify-between items-start text-blue-400">
          <div>
            <p className="text-[10px] font-mono tracking-wider uppercase text-slate-400">SIMULATION RUNTIME</p>
            <h3 className="text-2xl font-mono font-bold mt-1 text-slate-100 tracking-tight">
              {formatUptime(metrics.uptime)}
            </h3>
          </div>
          <button 
            id="reset-counters-btn"
            onClick={onResetCounters}
            title="Reset Packets & Metrics"
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono mt-auto pt-4 border-t border-slate-800/60 text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
            ACTIVE CONNS: {metrics.activeConnections}
          </span>
          <span className="text-[8px] bg-slate-950 px-1.5 py-0.5 rounded text-blue-400 border border-slate-800">
            AUTO-RESTORED
          </span>
        </div>
      </div>
    </div>
  );
};
