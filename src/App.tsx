import React, { useState, useEffect } from 'react';
import { DiagramNode, DiagramEdge, FlowDiagram, PresetScenario } from './types';
import { NetworkCanvas } from './components/NetworkCanvas';
import { ControlPanel } from './components/ControlPanel';
import { MetricsDashboard } from './components/MetricsDashboard';
import { InspectionDetail } from './components/InspectionDetail';
import { Sparkles, HelpCircle, Activity, Globe, Info, Play, Network, HelpCircle as HelpIcon } from 'lucide-react';

const PRESETS: PresetScenario[] = [
  {
    id: "car_tracker",
    name: "Smart Car Telemetry (Mockup 1)",
    description: "GPS Location telemetry data streams from physical IoT coordinates to Cloud Servers.",
    rawText: "A car tracking system sends location packets from the car to the cloud database server.",
    diagram: {
      name: "Smart Car Telemetry System",
      description: "GPS Location packets streamed in real-time from mobile IoT vehicle tracking modules to secure cloud analytical API endpoints.",
      nodes: [
        { id: "car_1", label: "Smart Car IoT", type: "car", x: 20, y: 70, color: "#eab308", statusLabel: "GPS Linked", details: ["LTE Model B12", "Accuracy: 3m"] },
        { id: "cloud_1", label: "Cloud DB Server", type: "cloud", x: 80, y: 30, color: "#22d3ee", statusLabel: "Receiving Influx", details: ["IP: 35.244.18.2", "Port: 443", "TLS Secured"] }
      ],
      edges: [
        { id: "edge_c_c", from: "car_1", to: "cloud_1", label: "Telemetry Stream", lineStyle: "dashed", color: "#eab308" }
      ],
      packets: [
        { from: "car_1", to: "cloud_1", label: "Coords [51.5, -0.1]", color: "#eab308", speed: 0.007 }
      ]
    }
  },
  {
    id: "listening_server",
    name: "Server Listen Port (Mockup 2)",
    description: "Server core listening for network connections on custom IPs and TCP ports.",
    rawText: "The server will host using its IP and port, and listen for incoming connections.",
    diagram: {
      name: "Server Binding Socket Lifecycle",
      description: "Standalone server instance listening to incoming client gateway socket handshakes on configured IP address and active listening port.",
      nodes: [
        { id: "serv_1", label: "Server Node Host", type: "server", x: 50, y: 50, color: "#a78bfa", ip: "192.168.1.50", port: "8080", statusLabel: "Active Listening", details: ["Sockets bound", "Threads: 16"] }
      ],
      edges: [],
      packets: []
    }
  },
  {
    id: "load_balancer",
    name: "Load-Balanced Cache (Mockup 3)",
    description: "Nginx reverse proxy distributing traffic to Express servers and caching via Redis.",
    rawText: "A client sends HTTP requests to Nginx, Nginx load balances it to two Express servers, and both write to a Redis cache.",
    diagram: {
      name: "Load Balanced Microservices Architecture",
      description: "Client traffic distributed evenly by a reverse proxy load balancer to multiple backend microservice servers, querying an in-memory database cache.",
      nodes: [
        { id: "client_1", label: "User Client Host", type: "browser", x: 15, y: 50, color: "#38bdf8", statusLabel: "Connected" },
        { id: "nginx_1", label: "Nginx Gateway", type: "gateway", x: 40, y: 50, color: "#fb923c", statusLabel: "Proxying Traffic", port: "80" },
        { id: "exp_1", label: "Express Engine A", type: "server", x: 65, y: 25, color: "#a78bfa", statusLabel: "Healthy", port: "3001" },
        { id: "exp_2", label: "Express Engine B", type: "server", x: 65, y: 75, color: "#a78bfa", statusLabel: "Healthy", port: "3002" },
        { id: "redis_1", label: "Redis Memo-Store", type: "cache", x: 88, y: 50, color: "#34d399", statusLabel: "Active Sync", port: "6379" }
      ],
      edges: [
        { id: "e_c_n", from: "client_1", to: "nginx_1", label: "HTTP GET" },
        { id: "e_n_e1", from: "nginx_1", to: "exp_1", label: "Split Route A" },
        { id: "e_n_e2", from: "nginx_1", to: "exp_2", label: "Split Route B" },
        { id: "e_e1_r", from: "exp_1", to: "redis_1", label: "Mem Sync" },
        { id: "e_e2_r", from: "exp_2", to: "redis_1", label: "Mem Sync" }
      ],
      packets: [
        { from: "client_1", to: "nginx_1", label: "GET /api/v1/users", color: "#38bdf8", speed: 0.008 },
        { from: "nginx_1", to: "exp_1", label: "Proxy Pass A", color: "#fb923c", speed: 0.012 },
        { from: "nginx_1", to: "exp_2", label: "Proxy Pass B", color: "#fb923c", speed: 0.012 },
        { from: "exp_1", to: "redis_1", label: "Read Cash", color: "#34d399", speed: 0.015 },
        { from: "exp_2", to: "redis_1", label: "Read Cash", color: "#34d399", speed: 0.015 }
      ]
    }
  },
  {
    id: "stripe_payment",
    name: "Payment Secure Authorization",
    description: "Customer purchasing lifecycle requesting auth signatures from Stripe API gateway.",
    rawText: "A customer orders a product in the browser, triggering the frontend to request Stripe payment auth which replies with a secure token.",
    diagram: {
      name: "Stripe Payment Handshake Flow",
      description: "Secure customer checkout sequence generating authenticated tokens via Stripe payment processor API gateway.",
      nodes: [
        { id: "cust", label: "Customer Browser", type: "browser", x: 15, y: 50, color: "#60a5fa", statusLabel: "Active Cart" },
        { id: "gateway", label: "Stripe Gateway", type: "gateway", x: 50, y: 50, color: "#fb923c", statusLabel: "Verifying Sig" },
        { id: "auth_serv", label: "Authorize Host", type: "cloud", x: 85, y: 50, color: "#f43f5e", statusLabel: "Approved" }
      ],
      edges: [
        { id: "e_cg", from: "cust", to: "gateway", label: "POST /v1/charge" },
        { id: "e_gs", from: "gateway", to: "auth_serv", label: "Token Signature Check" },
        { id: "e_sc", from: "auth_serv", to: "cust", label: "HTTP 200 SUCCESS", lineStyle: "dashed" }
      ],
      packets: [
        { from: "cust", to: "gateway", label: "Purchase Request", color: "#60a5fa", speed: 0.008 },
        { from: "gateway", to: "auth_serv", label: "Validate Token", color: "#fb923c", speed: 0.011 },
        { from: "auth_serv", to: "cust", label: "Success Response", color: "#f43f5e", speed: 0.010 }
      ]
    }
  },
  {
    id: "dns_resolv",
    name: "DNS Hierarchy Resolver",
    description: "The browser querying local, root, and authoritative DNS to fetch Web Host IP.",
    rawText: "The browser queries the local DNS resolver, which asks the Root Nameserver, then the TLD, and finally the Web Host IP is returned.",
    diagram: {
      name: "DNS Tree Resolution Hierarchy",
      description: "Recursive IP lookup sequence mapping domain queries sequentially starting from browser hosts up to Root and Authoritative DNS.",
      nodes: [
        { id: "brows", label: "Web Browser", type: "browser", x: 15, y: 50, color: "#38bdf8", statusLabel: "Searching IP" },
        { id: "dns_local", label: "Local Resolver", type: "gateway", x: 40, y: 50, color: "#fb923c", statusLabel: "Recursive Lookup" },
        { id: "dns_root", label: "Root DNS", type: "server", x: 65, y: 25, color: "#a78bfa", statusLabel: "Cached" },
        { id: "dns_tld", label: "TLD Server (.com)", type: "server", x: 65, y: 75, color: "#a78bfa", statusLabel: "Cached" },
        { id: "dns_host", label: "Authoritative DNS", type: "server", x: 88, y: 50, color: "#f43f5e", statusLabel: "Responsive" }
      ],
      edges: [
        { id: "e_bl", from: "brows", to: "dns_local", label: "Query domain.com" },
        { id: "e_lr", from: "dns_local", to: "dns_root", label: "Ask Root" },
        { id: "e_lt", from: "dns_local", to: "dns_tld", label: "Ask TLD" },
        { id: "e_lh", from: "dns_local", to: "dns_host", label: "Ask Authoritative" }
      ],
      packets: [
        { from: "brows", to: "dns_local", label: "Lookup domain.com", color: "#38bdf8", speed: 0.009 },
        { from: "dns_local", to: "dns_root", label: "Root Query", color: "#fb923c", speed: 0.013 },
        { from: "dns_local", to: "dns_tld", label: "TLD Query", color: "#fb923c", speed: 0.013 },
        { from: "dns_local", to: "dns_host", label: "Authoritative Query", color: "#fb923c", speed: 0.013 }
      ]
    }
  }
];

export default function App() {
  const [currentDiagram, setCurrentDiagram] = useState<FlowDiagram>(PRESETS[0].diagram);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [aiConnected, setAiConnected] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical' | 'distributed'>('distributed');
  const [globalSpeed, setGlobalSpeed] = useState<number>(1.0);

  // Probe API connection to check if server-side Gemini compiler is live
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'ok') {
          setAiConnected(data.aiAvailable);
        }
      })
      .catch(() => {
        console.info('Using dynamic offline rules-based layout compiler.');
      });
  }, []);

  const reapplyLayoutMode = (
    mode: 'horizontal' | 'vertical' | 'distributed',
    nodesToLayout: DiagramNode[]
  ): DiagramNode[] => {
    if (nodesToLayout.length === 0) return [];
    const N = nodesToLayout.length;

    if (mode === 'horizontal') {
      const sorted = [...nodesToLayout].sort((a, b) => a.x - b.x);
      return sorted.map((node, i) => {
        const x_target = N <= 1 ? 50 : 15 + (i * 70) / (N - 1);
        return { ...node, x: x_target, y: 50 };
      });
    } else if (mode === 'vertical') {
      const sorted = [...nodesToLayout].sort((a, b) => a.y - b.y);
      return sorted.map((node, i) => {
        const y_target = N <= 1 ? 50 : 15 + (i * 70) / (N - 1);
        return { ...node, x: 50, y: y_target };
      });
    } else {
      // Distributed beautiful scattered grid layout to prevent clustering
      const cols = Math.ceil(Math.sqrt(N));
      return nodesToLayout.map((node, i) => {
        const colIdx = i % cols;
        const rowIdx = Math.floor(i / cols);
        const rows = Math.ceil(N / cols);
        const x_target = cols <= 1 ? 50 : 18 + (colIdx * 64) / (cols - 1);
        const y_target = rows <= 1 ? 50 : 18 + (rowIdx * 60) / (rows - 1);
        return { ...node, x: x_target, y: y_target };
      });
    }
  };

  const handleApplyDiagram = (diagram: FlowDiagram) => {
    setCurrentDiagram(diagram);
    setSelectedNodeId(null);
    setLayoutMode('distributed'); // Default to distributed scattered for raw schemas
  };

  const handleLayoutModeChange = (mode: 'horizontal' | 'vertical' | 'distributed') => {
    setLayoutMode(mode);
    setCurrentDiagram((prev) => ({
      ...prev,
      nodes: reapplyLayoutMode(mode, prev.nodes),
    }));
  };

  const selectedNode = currentDiagram.nodes.find((n) => n.id === selectedNodeId) || null;

  // Handler to update a single Node's attributes (label, IP, Port, Color, Type)
  const handleUpdateNode = (updatedNode: DiagramNode) => {
    setCurrentDiagram((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n)),
    }));
  };

  // Handler to drop position coordinates on canvas drag
  const handleUpdateNodePosition = (nodeId: string, x: number, y: number) => {
    setCurrentDiagram((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
    }));
  };

  // Handler to delete a node, along with any of its connections and packet flows
  const handleDeleteNode = (nodeId: string) => {
    setCurrentDiagram((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
      packets: prev.packets.filter((p) => p.from !== nodeId && p.to !== nodeId),
    }));
    setSelectedNodeId(null);
  };

  // Handler to clear diagram board
  const handleClearDiagram = () => {
    setCurrentDiagram({
      name: "Custom Sandboxed Diagram",
      description: "Custom built blank slate diagram. Use the manual addition actions on the right to build components and connections.",
      nodes: [],
      edges: [],
      packets: []
    });
    setSelectedNodeId(null);
    setLayoutMode('distributed');
  };

  // Handler to inject custom node
  const handleAddNode = (type: DiagramNode['type']) => {
    const id = `node_${Date.now()}`;
    const labels: Record<string, string> = {
      server: "Express Server",
      database: "MySQL Store",
      cloud: "AWS Node",
      client: "New User Client",
      browser: "Chrome Client",
      cache: "Redis Memo-Cache",
      gateway: "API Gateway",
      firewall: "VPC Firewall",
      car: "IoT Trailer Tracker"
    };

    const colors: Record<string, string> = {
      client: '#38bdf8',
      browser: '#60a5fa',
      server: '#a78bfa',
      database: '#f43f5e',
      cloud: '#22d3ee',
      car: '#eab308',
      cache: '#34d399',
      gateway: '#fb923c',
      firewall: '#ef4444'
    };

    const newNode: DiagramNode = {
      id,
      label: labels[type] || `Generic Sys`,
      type,
      x: 35 + Math.random() * 30,
      y: 35 + Math.random() * 30,
      color: colors[type] || '#a78bfa',
      statusLabel: 'Active',
      details: ["User custom node", "Status: Active"]
    };

    setCurrentDiagram((prev) => {
      const nextNodes = [...prev.nodes, newNode];
      return {
        ...prev,
        nodes: layoutMode !== 'distributed' ? reapplyLayoutMode(layoutMode, nextNodes) : nextNodes,
      };
    });

    setSelectedNodeId(id);
  };

  // Handler to inject flow corridor
  const handleAddEdge = (fromId: string, toId: string, label: string) => {
    const id = `edge_${Date.now()}`;
    const newEdge: DiagramEdge = {
      id,
      from: fromId,
      to: toId,
      label: label || "Transmission link",
    };

    const newPacket = {
      from: fromId,
      to: toId,
      label: label || "Data frame",
      speed: 0.006 + Math.random() * 0.005,
    };

    setCurrentDiagram((prev) => ({
      ...prev,
      edges: [...prev.edges, newEdge],
      packets: [...prev.packets, newPacket],
    }));
  };

  // Derive semantic dynamic text explanation bullet summaries based on active types
  const getDerivedBullets = (): string[] => {
    const bullets: string[] = [];
    const types = new Set(currentDiagram.nodes.map((n) => n.type));

    if (types.has('car')) {
      bullets.push("Physical smart vehicle trackers use telemetry modules to stream real-time positional coordinate bytes down continuous communication lines.");
    }
    if (types.has('gateway')) {
      bullets.push("Gateway reverse-proxy devices receive incoming client commands and load-balance them systematically across child server pipelines.");
    }
    if (types.has('server')) {
      bullets.push("Active backend servers bind custom listening sockets to private IP ports, handling continuous requests through threadpools.");
    }
    if (types.has('database')) {
      bullets.push("Relational database structures receive persistent query statements from microservice endpoints to perform persistent storage write loops.");
    }
    if (types.has('cache')) {
      bullets.push("In-memory memory caches respond to cache requests in sub-milliseconds to reduce stress on secondary relational database storage.");
    }
    if (types.has('firewall')) {
      bullets.push("Cyber defense firewall layers inspect deep packet header protocols inside networks to drop malicious botnet arrays instantly.");
    }

    if (bullets.length === 0) {
      bullets.push("Drag any element on the graph canvas above to arrange your system layout visually.");
      bullets.push("Click on any node to adjust its operational label, service port, IP coordinates, or colors.");
      bullets.push("Type any engineering layout requirement explanation into the prompt on the right to auto-compile whole plans!");
    } else {
      bullets.push("Transmission coordinates adapt seamlessly as you drag-and-drop elements across the dashboard canvas grid.");
    }

    return bullets;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased selection:bg-cyan-500/35">
      
      {/* Sleek Technical Head Area */}
      <header className="border-b border-slate-900 bg-slate-950 px-5 md:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-950 to-indigo-900 border border-cyan-500/25 flex items-center justify-center glow-cyan shadow-lg">
            <Network className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider font-mono text-slate-100 uppercase">
                FLOWMOTION AI DIAGRAM COMPILER
              </h1>
              <span className="text-[7.5px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-900 text-slate-400 border border-slate-800">
                LATEST MODEL ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Compile technical sentences, tutorials, or code logics automatically into moving 2D animated flow diagrams
            </p>
          </div>
        </div>

        {/* Global Parsing Engine indicator */}
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-2 text-right">
          <div>
            <p className="text-[8.5px] font-mono text-slate-400 tracking-wider">AI EXTRACTOR PATH</p>
            <p className={`text-[10px] font-bold font-mono ${aiConnected ? 'text-cyan-400' : 'text-amber-400'}`}>
              {aiConnected ? '⚡ GEMINI PARSING LIVE' : '⚙️ HEURISTICS OFFLINE'}
            </p>
          </div>
          <div className={`p-2 rounded-lg border ${
            aiConnected
              ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-400'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-400'
          }`}>
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </header>

      {/* Main Responsive Grid Layout Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Dynamic Metric Dashboard at Top */}
        <MetricsDashboard
          nodes={currentDiagram.nodes}
          edgesCount={currentDiagram.edges.length}
          packetsCount={currentDiagram.packets.length}
          aiConnected={aiConnected}
          onClearDiagram={handleClearDiagram}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Visual Arena (Canvas & Tabs) - Left Side */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-4 md:p-5 relative overflow-hidden flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  {currentDiagram.name.toUpperCase()}
                </span>
                
                <span className="font-mono text-[8.5px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md">
                  TRANSMISSION LOOP ACTIVE
                </span>
              </div>
              
              <NetworkCanvas
                nodes={currentDiagram.nodes}
                edges={currentDiagram.edges}
                packets={currentDiagram.packets}
                selectedNodeId={selectedNodeId}
                onSelectNode={(node) => setSelectedNodeId(node.id)}
                onUpdateNodePosition={handleUpdateNodePosition}
                layoutMode={layoutMode}
                onLayoutModeChange={handleLayoutModeChange}
                globalSpeed={globalSpeed}
                onGlobalSpeedChange={setGlobalSpeed}
                onUpdateNode={handleUpdateNode}
                rawPromptText={currentDiagram.rawPromptText}
              />
            </div>

            {/* Ingress packet description details */}
            <InspectionDetail
              nodes={currentDiagram.nodes}
              edges={currentDiagram.edges}
              bullets={getDerivedBullets()}
              diagramDescription={currentDiagram.description}
            />
          </div>

          {/* Controls and Educational sidebar - Right Side */}
          <div className="lg:col-span-4 select-text">
            <ControlPanel
              presets={PRESETS}
              selectedNode={selectedNode}
              onApplyDiagram={handleApplyDiagram}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              onAddNode={handleAddNode}
              onAddEdge={handleAddEdge}
              allNodes={currentDiagram.nodes}
            />
          </div>

        </div>
      </main>

      {/* Cyber status footer bar */}
      <footer className="mt-auto py-4 bg-slate-950 border-t border-slate-900 text-center font-mono text-[9px] text-slate-500 tracking-widest uppercase">
        FLOWMOTION AUTOMATION DIAGRAM ENGINE // MODEL ENGINE: GEMINI 3.5 FLASH COGNITIVE PARSER
      </footer>
    </div>
  );
}
