import React, { useState } from 'react';
import { DiagramNode, FlowDiagram, PresetScenario } from '../types';
import { parseTextToDiagram } from '../utils/localParser';
import { Sparkles, Cpu } from 'lucide-react';

interface ControlPanelProps {
  presets: PresetScenario[];
  selectedNode: DiagramNode | null;
  onApplyDiagram: (diagram: FlowDiagram) => void;
  onUpdateNode: (updated: DiagramNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddNode: (type: DiagramNode['type']) => void;
  onAddEdge: (fromId: string, toId: string, label: string) => void;
  allNodes: DiagramNode[];
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  presets,
  selectedNode,
  onApplyDiagram,
  onUpdateNode,
  onDeleteNode,
  onAddNode,
  onAddEdge,
  allNodes,
}) => {
  const [inputText, setInputText] = useState<string>(presets[0].rawText);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseMode, setParseMode] = useState<'AI' | 'Offline' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Trigger Local Rule-Based Fast Heuristics Parser
  const handleLocalOfflineParse = () => {
    setErrorMessage(null);
    try {
      const diagram = parseTextToDiagram(inputText);
      diagram.rawPromptText = inputText;
      onApplyDiagram(diagram);
    } catch (err: any) {
      setErrorMessage('Local parser failed: ' + err.message);
    }
  };

  // Trigger Gemini API Parser
  const handleAISmartParse = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Please type or paste some technical text first!');
      return;
    }

    setIsParsing(true);
    setParseMode('AI');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/parse-diagram', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`);
      }

      const data = await response.json();

      if (data.fallback) {
        console.info('Server falls back to local layout heuristics.');
        const localDiag = parseTextToDiagram(inputText);
        localDiag.rawPromptText = inputText;
        onApplyDiagram(localDiag);
        setErrorMessage('Notice: Working in dynamic local layout sandbox mode.');
      } else {
        data.rawPromptText = inputText;
        onApplyDiagram(data);
      }
    } catch (error: any) {
      console.warn('AI Parsing failed, invoking automatic fallback...', error);
      const fallbackDiagram = parseTextToDiagram(inputText);
      fallbackDiagram.rawPromptText = inputText;
      onApplyDiagram(fallbackDiagram);
      setErrorMessage('Using high-fidelity offline layout sandbox engine.');
    } finally {
      setIsParsing(false);
      setParseMode(null);
    }
  };

  const handleApplyPreset = (preset: PresetScenario) => {
    setInputText(preset.rawText);
    const diagramCopy = { ...preset.diagram, rawPromptText: preset.rawText };
    onApplyDiagram(diagramCopy);
    setErrorMessage(null);
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/85 rounded-xl p-5 flex flex-col gap-6">
      
      {/* SECTION 1: INTERACTIVE TEXT TO DIAGRAM PORT */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3.5">
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" /> ENGINE SOURCE WRITER
          </h2>
          <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            READY
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-2 leading-relaxed">
          Type or paste any tech system tutorial, code description, block layout context, or architecture logic below:
        </p>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="e.g. A client laptop connects to Nginx load balancer to make inquiries to separate database servers."
          className="w-full h-24 bg-slate-950/90 border border-slate-800/80 rounded-lg p-3 font-mono text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 resize-none transition-all selection:bg-cyan-500/40"
        />

        {errorMessage && (
          <div className="text-[10px] font-mono text-amber-400 bg-amber-950/20 border border-amber-900/60 p-2.5 rounded-lg mt-2 flex items-center gap-1.5">
            <span className="w-1 h-3 bg-amber-400 rounded-full" />
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-3">
          {/* AI Smart Parse Button */}
          <button
            onClick={handleAISmartParse}
            disabled={isParsing}
            className={`py-3 px-3 rounded-lg font-mono text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition border ${
              isParsing && parseMode === 'AI'
                ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-400 animate-pulse cursor-wait'
                : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-550 text-white shadow-cyan-950/50 cursor-pointer glow-cyan active:scale-98'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isParsing && parseMode === 'AI' ? 'COMPILING...' : 'AI SMART PARSE'}
          </button>

          {/* Instant Local Parse Button */}
          <button
            onClick={handleLocalOfflineParse}
            disabled={isParsing}
            className="py-3 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98"
          >
            <Cpu className="w-3.5 h-3.5" />
            INSTANT OFFLINE
          </button>
        </div>
      </div>

      {/* SECTION 2: LITERAL PRESETS TEMPLATES */}
      <div className="pb-1">
        <label className="font-mono text-[9px] uppercase text-slate-400 tracking-wider block mb-2.5">
          SELECT COHESIVE TUTORIAL PRESETS
        </label>
        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
          {presets.map((preset) => {
            const isActive = inputText === preset.rawText;
            return (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`w-full p-2.5 rounded-lg text-left border text-xs transition duration-200 flex flex-col gap-1 ${
                  isActive
                    ? 'bg-slate-800/60 border-cyan-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:bg-slate-900/40 hover:text-slate-200'
                }`}
              >
                <div className="font-mono font-bold flex items-center gap-1.5 text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                  {preset.name}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 leading-normal">{preset.description}</div>
              </button>
            );
          })}
        </div>
      </div>



    </div>
  );
};
