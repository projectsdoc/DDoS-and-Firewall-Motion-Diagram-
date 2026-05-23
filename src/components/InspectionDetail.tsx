import React, { useState } from 'react';
import { LogEntry, SimulationConfig } from '../types';
import { List, FileText, BarChart3, Bell, Terminal, Shield, Eye, ShieldAlert } from 'lucide-react';

interface InspectionDetailProps {
  logs: LogEntry[];
  config: SimulationConfig;
  blockedRate: number;
}

export const InspectionDetail: React.FC<InspectionDetailProps> = ({
  logs,
  config,
  blockedRate,
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'inspection' | 'threat-report'>('logs');

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-5 h-full">
      {/* Tab select headers */}
      <div className="flex border-b border-slate-800/80 pb-2 mb-4">
        <button
          id="tab-btn-logs"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold rounded-lg transition ${
            activeTab === 'logs'
              ? 'bg-slate-800 text-slate-100 border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <List className="w-4 h-4 text-blue-400" />
          Live Logs
        </button>
        <button
          id="tab-btn-inspection"
          onClick={() => setActiveTab('inspection')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold rounded-lg transition ${
            activeTab === 'inspection'
              ? 'bg-slate-800 text-slate-100 border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-4 h-4 text-cyan-400" />
          Packet Inspection (Deep)
        </button>
        <button
          id="tab-btn-threat-report"
          onClick={() => setActiveTab('threat-report')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold rounded-lg transition ${
            activeTab === 'threat-report'
              ? 'bg-slate-800 text-slate-100 border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-rose-400" />
          Mitigation Telemetry
        </button>
      </div>

      {/* Tab 1: Live Network Filtation logs */}
      {activeTab === 'logs' && (
        <div className="flex flex-col h-[280px]">
          <div className="flex justify-between items-center bg-slate-950 px-3 py-1.5 rounded-t-lg border-t border-x border-slate-800/80">
            <span className="font-mono text-[9px] text-slate-400 flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-blue-400 inline" />
              FIREWALL PACKET INGRESS BUFFER
            </span>
            <span className="font-mono text-[8px] text-slate-500">
              COUNT: {logs.length} EVENTS
            </span>
          </div>
          
          <div className="flex-1 bg-slate-950 border border-slate-800/80 rounded-b-lg overflow-y-auto px-4 py-3 font-mono text-[9.5px] leading-relaxed space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-slate-500 py-12">
                * STABLE SYSLOG BUFFER EMPTY. WAITING FOR CONNECTION ACTIVITY *
              </div>
            ) : (
              logs.map((log) => {
                const badgeColor = 
                  log.type === 'SUCCESS' ? 'text-emerald-400' :
                  log.type === 'ALERT' ? 'text-rose-400 bg-rose-950/20 px-1 py-0.5 rounded' :
                  log.type === 'WARNING' ? 'text-amber-400' : 'text-blue-400';

                return (
                  <div key={log.id} className="border-b border-slate-900/60 pb-2 flex flex-col md:flex-row md:items-center justify-between text-slate-300">
                    <div className="flex items-start md:items-center gap-2">
                      <span className="text-slate-500 text-[8px] select-none">{log.timestamp}</span>
                      <span className={`font-semibold ${badgeColor} text-[8.5px] shrink-0`}>
                        [{log.type}]
                      </span>
                      <span className="text-slate-200 break-all">{log.message}</span>
                    </div>
                    <div className="text-right text-[8px] text-slate-500 shrink-0 mt-1 md:mt-0">
                      SRC: {log.source} ➔ DEstPort: {log.port}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Packet Inspection details */}
      {activeTab === 'inspection' && (
        <div className="space-y-4 h-[280px] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Safe Valid Packet Header Payload Structure */}
            <div className="border border-emerald-900/30 bg-emerald-950/5 p-3.5 rounded-lg">
              <div className="flex justify-between items-center border-b border-emerald-950/50 pb-2 mb-2">
                <span className="font-mono text-[9.5px] font-bold text-emerald-400 uppercase">
                  📦 SECURE CLIENT PACKET HEADER
                </span>
                <span className="text-[8px] font-mono bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-400">
                  STANDARD TCP-ACK
                </span>
              </div>
              <div className="font-mono text-[8.5px] text-slate-300 space-y-1 bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
                <p><span className="text-slate-500">SOURCE IP:</span> 203.0.113.88</p>
                <p><span className="text-slate-500">DEST IP  :</span> 192.168.1.50</p>
                <p><span className="text-slate-500">FLAGS    :</span> [SYN], [ACK] S:918239</p>
                <p><span className="text-slate-500">WINDOW   :</span> 64240 (Scalable)</p>
                <p><span className="text-slate-500">USER-AGT :</span> Mozilla/5.0 (Windows NT 10.0)</p>
                <p><span className="text-slate-500">HTTP REQ :</span> GET /index.html HTTP/1.1</p>
                <p className="text-emerald-400 text-[8px] mt-2 border-t border-emerald-900/30 pt-1">
                  ✓ VERDICT: RFC-COMPLIANT HEADERS. PASS.
                </p>
              </div>
            </div>

            {/* DDoS Rogue Packet Header Payload Structure */}
            <div className="border border-rose-950/30 bg-rose-950/5 p-3.5 rounded-lg">
              <div className="flex justify-between items-center border-b border-rose-950/50 pb-2 mb-2">
                <span className="font-mono text-[9.5px] font-bold text-rose-400 uppercase">
                  💀 BOTNET INTRUDER PACKET HEADER
                </span>
                <span className="text-[8px] font-mono bg-rose-950/30 px-1.5 py-0.5 rounded text-rose-400">
                  {config.attackType.toUpperCase()}
                </span>
              </div>
              <div className="font-mono text-[8.5px] text-slate-300 space-y-1 bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
                <p><span className="text-slate-500">SOURCE IP:</span> 185.39.22.41 (SPOOFED)</p>
                <p><span className="text-slate-500">DEST IP  :</span> 192.168.1.50</p>
                
                {config.attackType === 'SYN Flood' ? (
                  <>
                    <p><span className="text-slate-500">FLAGS    :</span> [SYN ONLY] S:NULL</p>
                    <p><span className="text-slate-500">INTENSITY:</span> 25,000 requests/sec</p>
                    <p><span className="text-slate-500">PAYLOAD  :</span> Volumetric TCP flood (Null Seq)</p>
                  </>
                ) : config.attackType === 'UDP Flood' ? (
                  <>
                    <p><span className="text-slate-500">FLAGS    :</span> [RAW UDP DATAGRAM]</p>
                    <p><span className="text-slate-500">LEN      :</span> 65,535 Bytes (Large Packet)</p>
                    <p><span className="text-slate-500">PAYLOAD  :</span> Repetitive Junk Strings</p>
                  </>
                ) : (
                  <>
                    <p><span className="text-slate-500">USER-AGT :</span> BotnetLoaderV4.0/Python</p>
                    <p><span className="text-slate-500">HTTP REQ :</span> GET /search?q=chaos HTTP/1.0</p>
                    <p><span className="text-slate-500">COOKIE   :</span> rand_cookie_flooder_9918239</p>
                  </>
                )}
                
                <p className={`text-[8px] mt-2 border-t pt-1 ${
                  config.firewallActive 
                    ? 'text-cyan-400 border-cyan-900/30' 
                    : 'text-rose-400 border-rose-900/30 animate-pulse'
                }`}>
                  {config.firewallActive 
                    ? '✗ FIREWALL SHIELD DETECTED: DROP_PACKET MATCHED.' 
                    : '⚠ WARNING: PACKET PASSED TO SERVER (NO FIREWALL PROTECTION)'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-2.5 text-[9px] font-mono text-slate-400 leading-normal">
            <div className="p-1.5 bg-blue-950 border border-blue-800 text-blue-400 rounded shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-300">How Layer 7 Filtration Works:</p>
              <p className="mt-0.5">
                Volumetric firewalls look deep into frame layers. A standard TCP socket handshake leaves a trace; malicious DDoS BOTNETS spoof source addresses generating thousands of pseudo requests per millisecond. When Firewall is enabled, these matching attack signatures (such as incomplete TCP handshake loops or raw UDP patterns) are completely mitigated, leaving clean lines of traffic active!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Mitigation statistics telemetry report with interactive meters */}
      {activeTab === 'threat-report' && (
        <div className="space-y-4 h-[280px] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mitigation success score circle gauge */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center">
              <h4 className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">
                MITIGATION RAMP GRADE
              </h4>
              <div className="my-3 relative">
                {/* SVG circular progress ring */}
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#1e293b"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={config.firewallActive ? '#06b6d4' : '#ef4444'}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - (config.firewallActive ? 1 : 0.05))}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col justify-center items-center font-mono">
                  <span className="text-xl font-bold text-slate-100">
                    {config.firewallActive ? '100%' : '5.0%'}
                  </span>
                  <span className="text-[7.5px] text-slate-400">SUCCESS</span>
                </div>
              </div>
              <p className="font-mono text-[8px] text-slate-400">
                {config.firewallActive 
                  ? 'All 5 DDoS infected streams successfully isolated' 
                  : 'Critical server ingestion leak! Overloaded system CPU'}
              </p>
            </div>

            {/* Attack mitigation summary factors */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="font-mono text-[9px] text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1.5 mb-1.5">
                DDoS FACTOR MATRIX
              </h4>
              <div className="space-y-2 text-[9px] font-mono">
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>BOTNET COUNT IN CLUSTER:</span>
                    <span className="text-slate-100">5 ACTIVE HOSTS</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded overflow-hidden">
                    <div className="h-full bg-red-500 w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>ATTACK VELOCITY FREQ:</span>
                    <span className="text-slate-100">{config.ddosIntensity * 42} packets/sec</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded overflow-hidden">
                    <div 
                      className="h-full bg-red-400 transition-all duration-300" 
                      style={{ width: `${config.ddosIntensity}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>SHIELD MITIGATION SPEED:</span>
                    <span className="text-slate-100">
                      {config.firewallActive ? '< 1.2 Milliseconds' : 'N/A BYPASSED'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded overflow-hidden">
                    <div 
                      className="h-full bg-cyan-400" 
                      style={{ width: config.firewallActive ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-rose-950/10 border border-rose-950/50 rounded-lg text-slate-400 font-mono text-[8.5px] leading-relaxed flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>
              <strong>DDoS BOTNET THREAT INTELLIGENCE SUMMARY:</strong> Botnets generate synchronous floods which trigger port exhausting tables in standard routers. A Deep Packet Firewall filters at Port ingress level, preventing the memory tables of the core server listening loop (Port 8080) from becoming filled with malicious half-open connections!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
