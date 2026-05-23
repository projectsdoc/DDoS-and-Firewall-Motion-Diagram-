import React, { useState, useEffect, useRef } from 'react';
import { SimulationConfig, NetworkMetrics, LogEntry } from './types';
import { NetworkCanvas } from './components/NetworkCanvas';
import { ControlPanel } from './components/ControlPanel';
import { MetricsDashboard } from './components/MetricsDashboard';
import { InspectionDetail } from './components/InspectionDetail';
import { Shield, ShieldCheck, ShieldAlert, BookOpen, Cpu, Info, Globe, HelpCircle } from 'lucide-react';

export default function App() {
  // 1. Initial State matching prompt requirements perfectly
  const [config, setConfig] = useState<SimulationConfig>({
    firewallActive: true,
    ddosIntensity: 60, // Rapid red connection waves active
    validTrafficRate: 4, // Smooth green packet feed active
    activeTab: 'inspection',
    attackType: 'SYN Flood',
  });

  // 2. Continuous system metrics state
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    cpuUsage: 8.5,
    memoryUsage: 22.1,
    allowedBandwidth: 12.0,
    blockedBandwidth: 108.0,
    activeConnections: 1,
    packetsProcessed: 124,
    packetsDropped: 2390,
    uptime: 0,
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdCounter = useRef<number>(1000);

  // Helper to construct log timestamps
  const getTimestamp = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds().toString().padStart(3, '0');
  };

  // 3. Reset Counters handler
  const handleResetCounters = () => {
    setMetrics(prev => ({
      ...prev,
      packetsProcessed: 0,
      packetsDropped: 0,
    }));
    setLogs([
      {
        id: `log-${logIdCounter.current++}`,
        timestamp: getTimestamp(),
        source: 'SYSTEM',
        type: 'INFO',
        message: 'SYSLOG engine counters re-initialized by cluster operator.',
        port: 8080,
      },
    ]);
  };

  // 4. Update metrics counters from canvas animation hits
  const handleMetricsUpdate = (blockedCount: number, allowedCount: number) => {
    setMetrics(prev => {
      const nextProcessed = prev.packetsProcessed + allowedCount;
      const nextDropped = prev.packetsDropped + blockedCount;
      return {
        ...prev,
        packetsProcessed: nextProcessed,
        packetsDropped: nextDropped,
      };
    });

    // Throttled log generator
    if (blockedCount > 0 && Math.random() > 0.8) {
      const spoofedIPs = [
        '185.39.22.84',
        '91.240.118.52',
        '203.18.99.117',
        '45.221.3.18',
        '103.4.15.220',
      ];
      const randomIP = spoofedIPs[Math.floor(Math.random() * spoofedIPs.length)];
      
      const newLog: LogEntry = {
        id: `log-${logIdCounter.current++}`,
        timestamp: getTimestamp(),
        source: randomIP,
        type: 'ALERT',
        message: `Firewall blocked unauthorized ${config.attackType} sequence (Mitgated).`,
        port: 8080,
      };
      setLogs(prev => [newLog, ...prev.slice(0, 40)]);
    }

    if (allowedCount > 0 && Math.random() > 0.6) {
      const newLog: LogEntry = {
        id: `log-${logIdCounter.current++}`,
        timestamp: getTimestamp(),
        source: '203.0.113.88',
        type: 'SUCCESS',
        message: 'Passing compliant HTTP connection TCP handshaking.',
        port: 8080,
      };
      setLogs(prev => [newLog, ...prev.slice(0, 40)]);
    }
  };

  // 5. Presets handler for fast configuration
  const handleTriggerPreset = (preset: 'idle' | 'moderate' | 'full-attack') => {
    if (preset === 'idle') {
      setConfig({
        firewallActive: true,
        ddosIntensity: 0,
        validTrafficRate: 3,
        activeTab: 'inspection',
        attackType: 'SYN Flood',
      });
      setLogs(prev => [
        {
          id: `log-${logIdCounter.current++}`,
          timestamp: getTimestamp(),
          source: 'FIREWALL_MGMT',
          type: 'INFO',
          message: 'Preset: Healthy State. Standard valid connections active.',
          port: 8080,
        },
        ...prev,
      ]);
    } else if (preset === 'moderate') {
      setConfig({
        firewallActive: true,
        ddosIntensity: 45,
        validTrafficRate: 4,
        activeTab: 'inspection',
        attackType: 'SYN Flood',
      });
      setLogs(prev => [
        {
          id: `log-${logIdCounter.current++}`,
          timestamp: getTimestamp(),
          source: 'FIREWALL_MGMT',
          type: 'WARNING',
          message: 'Preset: Mitigated attack. Shield blocks 100% of Botnet waves.',
          port: 8080,
        },
        ...prev,
      ]);
    } else if (preset === 'full-attack') {
      setConfig({
        firewallActive: false, // FIREWALL DEACTIVATED -> DANGER
        ddosIntensity: 90, // Massive chaotic flood
        validTrafficRate: 4,
        activeTab: 'inspection',
        attackType: 'UDP Flood',
      });
      setLogs(prev => [
        {
          id: `log-${logIdCounter.current++}`,
          timestamp: getTimestamp(),
          source: 'SERVER_CORE',
          type: 'ALERT',
          message: 'CRITICAL WARNING: Volumetric bypass! Host ingress overflow detected!',
          port: 8080,
        },
        ...prev,
      ]);
    }
  };

  // 6. Simulator dynamic status engine (tick metrics every 0.3s)
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        // Calculate CPU usage dynamically based on ddos and firewall active
        let targetCpu = 3.5 + (config.validTrafficRate * 0.9) + (Math.random() * 2);
        let targetMem = 20.0 + (config.validTrafficRate * 0.5);

        if (!config.firewallActive && config.ddosIntensity > 0) {
          // Heat up server resources when firewall is disarmed!
          targetCpu += config.ddosIntensity * 0.95;
          targetMem += config.ddosIntensity * 0.7;
        } else {
          // Minimal standard overhead when firewall isolates the attack
          targetCpu += config.ddosIntensity * 0.04;
          targetMem += config.ddosIntensity * 0.02;
        }

        const nextCpu = Math.min(100, Math.max(1, targetCpu));
        const nextMem = Math.min(100, Math.max(1, targetMem));

        // Connectors bandwidth calculations
        const allowedBw = config.validTrafficRate * 2.8 + (Math.random() * 0.5);
        // Blocked Bandwidth is proportional to intensity
        const blockedBw = config.firewallActive 
          ? config.ddosIntensity * 2.2 
          : config.ddosIntensity * 2.2; // showing how much enters the interface either way

        // Active TCP sockets count
        const connectionsCount = config.firewallActive 
          ? 1 
          : 1 + Math.floor(config.ddosIntensity * 0.4);

        return {
          ...prev,
          cpuUsage: nextCpu,
          memoryUsage: nextMem,
          allowedBandwidth: allowedBw,
          blockedBandwidth: blockedBw,
          activeConnections: connectionsCount,
        };
      });
    }, 400);

    return () => clearInterval(interval);
  }, [config.firewallActive, config.ddosIntensity, config.validTrafficRate]);

  // 7. System runtime clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        uptime: prev.uptime + 1,
      }));
    }, 1000);

    // Initial load generic logs
    setLogs([
      {
        id: `log-${logIdCounter.current++}`,
        timestamp: getTimestamp(),
        source: 'FIREWALL_MGMT',
        type: 'SUCCESS',
        message: 'L7 Cyber-Defense Firewall Engine Online & Enforcing standard rules.',
        port: 8080,
      },
      {
        id: `log-${logIdCounter.current++}`,
        timestamp: getTimestamp(),
        source: 'SERVER_TCP',
        type: 'INFO',
        message: 'Listening socket bound peacefully to IP 192.168.1.50 port 8080.',
        port: 8080,
      },
    ]);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased selection:bg-cyan-500/35">
      {/* Sleek Technical Head Area */}
      <header className="border-b border-slate-900 bg-slate-950 px-5 md:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-950 to-blue-900 border border-cyan-500/25 flex items-center justify-center glow-cyan shadow-lg">
            <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider font-mono text-slate-100 uppercase">
                CYBER-DEFENSE TECHNICAL MONITOR
              </h1>
              <span className="text-[7.5px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-900 text-slate-400 border border-slate-800">
                v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive 2D Network Ingress Mitigation & Volumetric Traffic Model
            </p>
          </div>
        </div>

        {/* Global Security Status Indicator Widget */}
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-right">
          <div className="hidden xs:block">
            <p className="text-[8.5px] font-mono text-slate-400 tracking-wider">DEFENSE POSTURE</p>
            <p className={`text-[10px] font-bold font-mono ${
              config.firewallActive && config.ddosIntensity > 0 
                ? 'text-cyan-400' 
                : !config.firewallActive && config.ddosIntensity > 15
                  ? 'text-rose-400 animate-pulse' 
                  : 'text-emerald-400'
            }`}>
              {config.firewallActive && config.ddosIntensity > 0 
                ? 'SHIELDING ENGAGED' 
                : !config.firewallActive && config.ddosIntensity > 15
                  ? '⚠️ HOST CRITICAL FLOOD' 
                  : 'STABLE / SECURE'}
            </p>
          </div>
          <div className={`p-2 rounded-lg border ${
            config.firewallActive && config.ddosIntensity > 0
              ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-400'
              : !config.firewallActive && config.ddosIntensity > 15
                ? 'bg-rose-950/30 border-rose-500/30 text-rose-500'
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
          }`}>
            {config.firewallActive && config.ddosIntensity > 0 ? (
              <ShieldCheck className="w-5 h-5" />
            ) : !config.firewallActive && config.ddosIntensity > 15 ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
        </div>
      </header>

      {/* Main Responsive Grid Layout Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Dynamic Metric Dashboard at Top */}
        <MetricsDashboard 
          metrics={metrics} 
          config={config} 
          onResetCounters={handleResetCounters} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main Visual Arena (Canvas & Tabs) - Left Side */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-4 md:p-5 relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-cyan-500" />
                  REAL-TIME TRAFFIC FLOW BLUEPRINT
                </span>
                
                {/* Active vector hint details */}
                {config.ddosIntensity > 0 && (
                  <span className="font-mono text-[9px] bg-red-950/30 border border-red-800/50 text-red-400 px-2 py-0.5 rounded-md animate-pulse">
                    ATTACK IN PROGRESS: {config.attackType}
                  </span>
                )}
              </div>
              
              <NetworkCanvas 
                config={config} 
                onMetricsUpdate={handleMetricsUpdate} 
              />
            </div>

            {/* Ingress packet description details */}
            <InspectionDetail 
              logs={logs} 
              config={config} 
              blockedRate={metrics.blockedBandwidth} 
            />
          </div>

          {/* Controls and Educational sidebar - Right Side */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <ControlPanel 
              config={config} 
              onChange={(updates) => setConfig(prev => ({ ...prev, ...updates }))}
              onTriggerPreset={handleTriggerPreset}
            />

            {/* Quick Informational Guide Widget */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-lg">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-cyan-400" /> LESSON: SYSLOG ANALYSIS
              </h3>
              
              <div className="space-y-3.5 text-xs text-slate-400 leading-relaxed">
                <p>
                  Observe what happens when you press <strong>"Bypassed / Disarmed"</strong> under intense DDoS Attack. Without the glowing firewall wall, rapid malicious connection waves hit the server directly.
                </p>
                <div className="border border-slate-800 bg-slate-950 p-3 rounded-lg font-mono text-[9.5px] text-slate-300">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <Cpu className="w-3.5 h-3.5 text-rose-500" />
                    Resource Depletion Effect
                  </div>
                  <p className="mt-1 text-slate-400">
                    Host processing limits are finite. When inundating a socket listening to PORT 8080 with dummy requests, the core kernel spends 100% of clock cycles handling bad frames. Valid traffic gets choked out.
                  </p>
                </div>
                <div className="flex items-start gap-1 text-[10px] text-cyan-400 bg-cyan-950/10 p-2 border border-cyan-950/30 rounded">
                  <Info className="w-3.5 h-3.5 inline shrink-0 mt-0.5 mr-1" />
                  <span>
                    Try clicking the <strong>Presets</strong> buttons inside the simulator panel to view instant healthy vs critical volumetric scenarios.
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Cyber status footer bar */}
      <footer className="mt-auto py-4 bg-slate-950 border-t border-slate-900 text-center font-mono text-[9px] text-slate-500 tracking-widest uppercase">
        SECURE INGRESS GATEWAY SYSTEMS // ENFORCING ACTIVE PROTOCOL COMPLIANCE RULES
      </footer>
    </div>
  );
}
