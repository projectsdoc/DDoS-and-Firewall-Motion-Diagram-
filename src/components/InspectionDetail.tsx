import React, { useState } from 'react';
import { DiagramNode, DiagramEdge, FlowDiagram } from '../types';
import { List, Cpu, FileText, Server, MessageSquare, Terminal, Eye, Link } from 'lucide-react';

interface InspectionDetailProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  bullets: string[];
  diagramDescription: string;
}

export const InspectionDetail: React.FC<InspectionDetailProps> = ({
  nodes,
  edges,
  bullets = [],
  diagramDescription,
}) => {
  const [activeTab, setActiveTab] = useState<'blueprint' | 'parser-logs' | 'how-it-works'>('blueprint');

  // Generate mock parser logs that represent compiler feedback explaining what is drawn
  const generateParserLogs = () => {
    const logs: string[] = [];
    logs.push('[COM_LOG] FlowMotion Engine initialized parsing pipelines...');
    if (nodes.length > 0) {
      logs.push(`[COM_LOG] Sentence semantic search located ${nodes.length} distinct systems inside raw text.`);
    }
    nodes.forEach((n) => {
      logs.push(
        `[COM_LOG] Detected entity [${n.label}] -> Configured to Icon [${n.type.toUpperCase()}] at coordinate (${Math.round(n.x)}%, ${Math.round(n.y)}%).`
      );
    });
    edges.forEach((e) => {
      logs.push(
        `[COM_LOG] Determined transmission pathway: [${e.from}] ➔ Connected to [${e.to}]` +
        (e.label ? ` via [${e.label}] protocol.` : '.')
      );
    });
    logs.push('[COM_LOG] Semantic schema compiling green. Running live 2D animation loop.');
    return logs;
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 flex flex-col gap-4">
      {/* Tab Select Headers */}
      <div className="flex border-b border-slate-800/60 pb-2">
        <button
          onClick={() => setActiveTab('blueprint')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold rounded-lg transition ${
            activeTab === 'blueprint'
              ? 'bg-slate-800 text-slate-100 border border-slate-700/60 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5 text-cyan-400" />
          Active Specifications
        </button>
        <button
          onClick={() => setActiveTab('parser-logs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold rounded-lg transition ${
            activeTab === 'parser-logs'
              ? 'bg-slate-800 text-slate-100 border border-slate-700/60 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          Parser Compiler Details
        </button>
        <button
          onClick={() => setActiveTab('how-it-works')}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold rounded-lg transition ${
            activeTab === 'how-it-works'
              ? 'bg-slate-800 text-slate-100 border border-slate-700/60 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          Tutorial Explanation
        </button>
      </div>

      {/* Description area */}
      <div className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
        <span className="font-bold text-cyan-400 font-mono text-[10px] uppercase block mb-1">
          DIAGRAM FOCUS DESCRIPTOR:
        </span>
        <p className="leading-relaxed">{diagramDescription || 'Empty architectural context.'}</p>
      </div>

      {/* Tab Content 1: Active Blueprint parameters */}
      {activeTab === 'blueprint' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[220px] overflow-y-auto pr-1">
          {nodes.length === 0 ? (
            <div className="col-span-2 text-center text-slate-500 py-12 text-xs font-mono">
              [ NO INGESTED DEVICES ON THE BOARD ]
            </div>
          ) : (
            nodes.map((node) => (
              <div
                key={node.id}
                className="bg-slate-950 p-3.5 rounded-lg border flex flex-col justify-between"
                style={{ borderColor: `${node.color}25` }}
              >
                <div className="flex justify-between items-start border-b border-slate-800/80 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: node.color || '#a78bfa' }}
                    />
                    <span className="font-mono text-[10px] font-bold text-slate-200 uppercase">
                      {node.label}
                    </span>
                  </div>
                  <span className="text-[7.5px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase">
                    {node.type}
                  </span>
                </div>

                <div className="font-mono text-[8.5px] text-slate-400 space-y-1">
                  <p>
                    <span className="text-slate-600">STATE STATS:</span>{' '}
                    <span className="text-emerald-400">{node.statusLabel || 'ACTIVE'}</span>
                  </p>
                  <p>
                    <span className="text-slate-600">COORDINATE:</span> ({Math.round(node.x)}%,{' '}
                    {Math.round(node.y)}%)
                  </p>
                  {node.ip && (
                    <p>
                      <span className="text-slate-600">IP ADDRESS:</span> {node.ip}
                    </p>
                  )}
                  {node.port && (
                    <p>
                      <span className="text-slate-600">ACTIVE PORT:</span> {node.port}
                    </p>
                  )}
                  {node.details && node.details.length > 0 && (
                    <p className="text-[8px] text-slate-500 italic mt-1 line-clamp-1 border-t border-slate-900 pt-1">
                      Specs: {node.details.join(' | ')}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content 2: Parser Compiler Logs */}
      {activeTab === 'parser-logs' && (
        <div className="flex flex-col h-[220px]">
          <div className="flex-1 bg-slate-950 border border-slate-850 rounded-lg overflow-y-auto px-4 py-3 font-mono text-[9px] leading-relaxed text-slate-400 space-y-2.5">
            {generateParserLogs().map((log, idx) => {
              const isEvent = log.includes('Detected') || log.includes('Determined');
              return (
                <div key={idx} className={`border-b border-slate-900/60 pb-1.5 flex gap-2 ${isEvent ? 'text-cyan-300' : 'text-slate-400'}`}>
                  <span className="text-slate-600 select-none">[{idx.toString().padStart(2, '0')}]</span>
                  <span className="break-all">{log}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content 3: How It Works / Tutorial Text Bullets */}
      {activeTab === 'how-it-works' && (
        <div className="bg-slate-950 p-4 border border-slate-850 rounded-lg h-[220px] overflow-y-auto space-y-3">
          <h4 className="font-mono text-[10px] font-bold text-slate-300 tracking-wider uppercase flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            COMPREHENSIVE TUTORIAL EXPANSE
          </h4>

          {bullets.length > 0 ? (
            <ul className="space-y-2.5">
              {bullets.map((b, i) => (
                <li key={i} className="text-xs text-slate-400 leading-relaxed flex items-start gap-2">
                  <span className="text-emerald-500 font-bold font-mono mt-0.5 select-none shrink-0">➔</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3.5 text-xs text-slate-400 leading-relaxed">
              <p>
                The parsed diagram on the canvas above models the selected system configuration. Every connection represents an active network route allowing data packet transmissions natively.
              </p>
              <p className="bg-emerald-950/10 p-2.5 border border-emerald-950/40 rounded text-[11px] text-emerald-400">
                💡 <strong>Try this:</strong> Try selecting Nginx Load Balancer or Web Server Listening presets from the panel, or replace it entirely with your own text to see instant diagrams compiler feedback!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
