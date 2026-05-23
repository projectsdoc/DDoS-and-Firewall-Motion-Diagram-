import React from 'react';
import { SimulationConfig } from '../types';
import { Shield, ShieldOff, Zap, ShieldAlert, Cpu, HelpCircle, Activity } from 'lucide-react';

interface ControlPanelProps {
  config: SimulationConfig;
  onChange: (updates: Partial<SimulationConfig>) => void;
  onTriggerPreset: (preset: 'idle' | 'moderate' | 'full-attack') => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onChange,
  onTriggerPreset,
}) => {
  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" /> SIMULATION ENGINE CONTROL
          </h2>
          <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-slate-950 text-amber-500 border border-slate-800/60 animate-pulse">
            LIVE PRESET
          </span>
        </div>

        {/* 1. FIREWALL TOGGLE (THE MAIN SWITCH) */}
        <div className="mt-5">
          <label className="font-mono text-[10px] uppercase text-slate-400 tracking-wider block mb-2">
            PROACTIVE DEFENSE GATEWAY
          </label>
          <button
            id="firewall-toggle-btn"
            onClick={() => onChange({ firewallActive: !config.firewallActive })}
            className={`w-full py-3.5 px-4 rounded-xl font-mono text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 border shadow-lg ${
              config.firewallActive
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 hover:from-cyan-500 hover:to-blue-500 glow-cyan'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {config.firewallActive ? (
              <>
                <Shield className="w-4 h-4 animate-bounce" />
                L7 FIREWALL ACTIVE (ENFORCING)
              </>
            ) : (
              <>
                <ShieldOff className="w-4 h-4 text-rose-500 mr-1" />
                BYPASSED / DISARMED (DANGER)
              </>
            )}
          </button>
        </div>

        {/* 2. SYSTEM SCENARIOS PRESETS */}
        <div className="mt-6">
          <label className="font-mono text-[10px] uppercase text-slate-400 tracking-wider block mb-2">
            SIMULATION PRESETS
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              id="preset-idle-btn"
              onClick={() => onTriggerPreset('idle')}
              className="py-1.5 px-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded font-mono text-[9px] text-slate-300 text-center transition"
            >
              🟢 Healthy State
            </button>
            <button
              id="preset-moderate-btn"
              onClick={() => onTriggerPreset('moderate')}
              className="py-1.5 px-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded font-mono text-[9px] text-amber-400 text-center transition"
            >
              🟡 Mitigated DDoS
            </button>
            <button
              id="preset-full-btn"
              onClick={() => onTriggerPreset('full-attack')}
              className="py-1.5 px-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded font-mono text-[9px] text-rose-500 text-center transition animate-pulse"
            >
              🔴 Volumetric Overrun
            </button>
          </div>
        </div>

        {/* 3. DDOS BOTNET INTENSITY */}
        <div className="mt-6 pt-5 border-t border-slate-800/60">
          <div className="flex justify-between items-center mb-1.5">
            <label className="font-mono text-[10px] uppercase text-slate-400 tracking-wider">
              DDoS ATTACK INTENSITY
            </label>
            <span className={`font-mono text-xs font-bold ${config.ddosIntensity > 60 ? 'text-rose-500' : config.ddosIntensity > 15 ? 'text-amber-500' : 'text-slate-400'}`}>
              {config.ddosIntensity}%
            </span>
          </div>
          <input
            id="ddos-intensity-range"
            type="range"
            min="0"
            max="100"
            value={config.ddosIntensity}
            onChange={(e) => onChange({ ddosIntensity: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
          <div className="flex justify-between font-mono text-[8px] text-slate-500 mt-1">
            <span>0% (CLEAN)</span>
            <span>50% (MODERATE)</span>
            <span>100% (CRITICAL Volumetric)</span>
          </div>
        </div>

        {/* 4. ATTACK VECTOR METHODOLOGY */}
        <div className="mt-5">
          <label className="font-mono text-[10px] uppercase text-slate-400 tracking-wider block mb-2">
            ATTACK METHODOLOGY VECTOR
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['SYN Flood', 'UDP Flood', 'HTTP GET Flood'] as const).map((type) => (
              <button
                id={`attack-type-${type.replace(/\s+/g, '-').toLowerCase()}`}
                key={type}
                onClick={() => onChange({ attackType: type })}
                className={`py-1.5 px-0.5 rounded border text-[9px] font-mono text-center transition ${
                  config.attackType === type
                    ? 'bg-rose-950/40 text-rose-400 border-rose-500/60'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800/80 hover:bg-slate-800/60'
                }`}
                disabled={config.ddosIntensity === 0}
              >
                {type}
              </button>
            ))}
          </div>
          {config.ddosIntensity === 0 && (
            <p className="text-[7.5px] font-mono text-slate-500 mt-1">
              * Increase Attack Intensity above 0% to modify attack vector.
            </p>
          )}
        </div>

        {/* 5. VALID CLIENT RATE */}
        <div className="mt-6 pt-5 border-t border-slate-800/60">
          <div className="flex justify-between items-center mb-1.5">
            <label className="font-mono text-[10px] uppercase text-slate-400 tracking-wider">
              VALID TRAFFIC RATE (CLIENT FEED)
            </label>
            <span className="font-mono text-xs font-bold text-emerald-400">
              {config.validTrafficRate} Hz
            </span>
          </div>
          <input
            id="valid-traffic-range"
            type="range"
            min="1"
            max="10"
            value={config.validTrafficRate}
            onChange={(e) => onChange({ validTrafficRate: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <div className="flex justify-between font-mono text-[8px] text-slate-500 mt-1">
            <span>Slow Feed (1 Hz)</span>
            <span>Standard TCP Line</span>
            <span>High Load Line (10 Hz)</span>
          </div>
        </div>
      </div>

      {/* FOOTER INFO: FIREWALL RULES LIST */}
      <div className="mt-6 pt-4 border-t border-slate-800/60 bg-slate-950 p-3 rounded-lg border border-slate-800/50">
        <h4 className="font-mono text-[9px] font-bold text-slate-400 tracking-wider mb-2 uppercase flex items-center justify-between">
          <span>ACTIVE RULES LOGICAL FILTER</span>
          <span className="text-[7px] bg-cyan-950 px-1 py-0.5 rounded text-cyan-400">
            {config.firewallActive ? 'ENFORCED' : 'OFFLINE'}
          </span>
        </h4>
        <div className="space-y-1.5 text-[8.5px] font-mono text-slate-400 leading-snug">
          <div className="flex items-center justify-between p-1 rounded bg-slate-900 border border-slate-800/40">
            <span className="text-emerald-400 text-[8px]">01 // ALLOW</span>
            <span className="text-slate-300">TCP 203.0.113.88 → PORT 8080</span>
          </div>
          {config.firewallActive ? (
            <div className="flex items-center justify-between p-1 rounded bg-rose-950/20 border border-cyan-800/40 animate-pulse">
              <span className="text-cyan-400 text-[8px]">02 // DROP</span>
              <span className="text-slate-300">
                {config.attackType === 'SYN Flood' 
                  ? 'SYN_LIMIT_RATE 100/sec' 
                  : config.attackType === 'UDP Flood' 
                    ? 'UDP_PROTOCOL_DROP_ALL' 
                    : 'HTTP_USER_AGENT_BLOCKED'}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-1 rounded bg-slate-900/40 border border-dashed border-rose-950/60 text-slate-500">
              <span className="text-[8px] text-rose-500">02 // BYPASS</span>
              <span>MALICIOUS CONNECTIONS PASSED</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
