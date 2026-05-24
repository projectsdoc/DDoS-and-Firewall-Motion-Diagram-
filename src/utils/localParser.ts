import { DiagramNode, DiagramEdge, FlowDiagram } from '../types';

// Colors for node categories
const CATEGORY_COLORS: Record<string, string> = {
  client: '#38bdf8',   // Light Sky Blue
  browser: '#60a5fa',  // Sky Blue
  server: '#a78bfa',   // Purple/Violet
  database: '#f43f5e', // Rose/Red-Pink
  cloud: '#22d3ee',    // Cyan
  car: '#eab308',      // Amber Yellow
  cache: '#34d399',    // Emerald Green
  gateway: '#fb923c',  // Orange
  firewall: '#ef4444'  // Intense Red
};

// Help map keyword to generic classifications
function detectNodeType(word: string): 'client' | 'browser' | 'server' | 'database' | 'cloud' | 'car' | 'cache' | 'gateway' | 'firewall' {
  const w = word.toLowerCase();
  if (w.includes('car') || w.includes('vehicle') || w.includes('gps') || w.includes('tracker') || w.includes('iot')) {
    return 'car';
  }
  if (w.includes('cloud') || w.includes('aws') || w.includes('gcp') || w.includes('azure') || w.includes('internet')) {
    return 'cloud';
  }
  if (w.includes('database') || w.includes('postgres') || w.includes('mysql') || w.includes('db') || w.includes('sql') || w.includes('store') || w.includes('mongodb')) {
    return 'database';
  }
  if (w.includes('redis') || w.includes('cache') || w.includes('memcached')) {
    return 'cache';
  }
  if (w.includes('gateway') || w.includes('router') || w.includes('balancer') || w.includes('nginx') || w.includes('proxy') || w.includes('resolver') || w.includes('dns')) {
    return 'gateway';
  }
  if (w.includes('firewall') || w.includes('shield') || w.includes('middleware') || w.includes('guard')) {
    return 'firewall';
  }
  if (w.includes('browser') || w.includes('web') || w.includes('chrome') || w.includes('frontend')) {
    return 'browser';
  }
  if (w.includes('client') || w.includes('customer') || w.includes('user') || w.includes('admin') || w.includes('device') || w.includes('laptop') || w.includes('attacker') || w.includes('hacker') || w.includes('bot') || w.includes('drone')) {
    return 'client';
  }
  return 'server';
}

export function parseTextToDiagram(text: string): FlowDiagram {
  const cleanText = text.trim();
  if (!cleanText) {
    return { name: "Blank Slate", description: "Empty diagram context", nodes: [], edges: [], packets: [] };
  }

  // 1. Analyze and detect diagram-level behaviors
  const lowerText = cleanText.toLowerCase();
  
  // Plural/Continuous stream detection
  const isContinuousStream = lowerText.includes('requests') || 
                             lowerText.includes('traffic stream') || 
                             lowerText.includes('continuous') || 
                             lowerText.includes('stream') || 
                             lowerText.includes('flood') || 
                             lowerText.includes('overlapping') || 
                             lowerText.includes('ping') ||
                             lowerText.includes('sends multiple');

  // Overwhelm/Crash scenario detection - refined for high-precision context interpretation
  const hasDestructiveKeywords = lowerText.includes('crashes') || 
                                 lowerText.includes('overwhelmed') || 
                                 lowerText.includes('explodes') || 
                                 lowerText.includes('denial of service') || 
                                 lowerText.includes('mitigation failure');

  // Check if it is a standard academic/peaceful system explanation
  const isPeacefulContext = lowerText.includes('raft') || 
                            lowerText.includes('paxos') || 
                            lowerText.includes('distributed s') || 
                            lowerText.includes('sync') || 
                            lowerText.includes('dns') || 
                            lowerText.includes('storage') || 
                            lowerText.includes('consensus');

  const isOverwhelmScenario = hasDestructiveKeywords && !isPeacefulContext;

  // 2. Identify entity nouns present in text explanation (plural vs singular instantiation)
  const candidates = [
    { key: 'attacker', type: 'client', label: 'Attacker Bot', color: '#ef4444' }, // Red for hazard
    { key: 'hacker', type: 'client', label: 'Hacker Core', color: '#ff3333' },
    { key: 'bot', type: 'client', label: 'Botnet Node', color: '#b91c1c' },
    { key: 'drone', type: 'car', label: 'IoT Drone', color: '#fb923c' },
    { key: 'client', type: 'browser', label: 'Client Connection', color: '#38bdf8' },
    { key: 'browser', type: 'browser', label: 'User Browser', color: '#60a5fa' },
    { key: 'user', type: 'client', label: 'Active User', color: '#38bdf8' },
    { key: 'device', type: 'client', label: 'Smart Device', color: '#eab308' },
    { key: 'vehicle', type: 'car', label: 'Vehicle GPS', color: '#eab308' },
    { key: 'car', type: 'car', label: 'Smart Car IoT', color: '#eab308' },
    { key: 'server', type: 'server', label: 'Central Host Server', color: '#a78bfa' },
    { key: 'host', type: 'server', label: 'API Endpoint Host', color: '#a78bfa' },
    { key: 'database', type: 'database', label: 'Relational DB Store', color: '#f43f5e' },
    { key: 'db', type: 'database', label: 'Primary SQL Database', color: '#f43f5e' },
    { key: 'cache', type: 'cache', label: 'Redis Cache Memory', color: '#34d399' },
    { key: 'redis', type: 'cache', label: 'Redis In-Memory Stock', color: '#34d399' },
    { key: 'firewall', type: 'firewall', label: 'Security Firewall Guard', color: '#ef4444' },
    { key: 'shield', type: 'firewall', label: 'Shield Defender', color: '#f43f5e' },
    { key: 'middleware', type: 'firewall', label: 'Security Middleware', color: '#fb923c' },
    { key: 'gateway', type: 'gateway', label: 'Nginx Load Balancer', color: '#fb923c' },
    { key: 'balancer', type: 'gateway', label: 'Load Balancer Proxy', color: '#fb923c' },
    { key: 'nginx', type: 'gateway', label: 'Nginx Proxy Server', color: '#fb923c' },
    { key: 'cloud', type: 'cloud', label: 'Public Cloud AWS', color: '#22d3ee' },
    { key: 'internet', type: 'cloud', label: 'WAN Internet Feed', color: '#22d3ee' }
  ];

  const nodes: DiagramNode[] = [];
  const sourceNodes: DiagramNode[] = [];
  const attackerNodes: DiagramNode[] = [];
  const targetNodes: DiagramNode[] = [];
  const firewallNodes: DiagramNode[] = [];
  const gatewayNodes: DiagramNode[] = [];

  // Match entities
  candidates.forEach((cand) => {
    // Check plural ending in 's' or 'es' or ending natively (e.g. 'attackers', 'drones', 'devices')
    const regexPlural = new RegExp(`\\b${cand.key}(s|es)\\b`, 'i');
    const regexSingular = new RegExp(`\\b${cand.key}\\b`, 'i');

    const hasPlural = regexPlural.test(lowerText);
    const hasSingular = regexSingular.test(lowerText);

    if (hasPlural || hasSingular) {
      // Determine if count is specified in text immediately preceding
      const matchNum = lowerText.match(new RegExp(`(\\d+|two|three|four|five)\\s+${cand.key}`, 'i'));
      let count = 1;

      if (hasPlural && !matchNum) {
        // Automatically generate a random group of 2 to 5 distinct nodes representing that asset type
        count = Math.floor(Math.random() * 4) + 2; // 2 to 5
      } else if (matchNum) {
        const numWordObj: Record<string, number> = { two: 2, three: 3, four: 4, five: 5 };
        const numText = matchNum[1].toLowerCase();
        count = Number(numText) || numWordObj[numText] || 3;
        count = Math.max(1, Math.min(count, 5)); // cap between 1 and 5
      }

      // Generate distinct and unique nodes
      for (let i = 0; i < count; i++) {
        const indexStr = count > 1 ? ` ${(i + 1)}` : '';
        const id = `node_${cand.key}_${i}_${Math.floor(Math.random() * 1000)}`;
        const type = cand.type as DiagramNode['type'];
        
        // Custom labels for attackers vs clean clients
        const isAttacker = cand.key === 'attacker' || cand.key === 'hacker' || cand.key === 'bot';
        const isClient = cand.key === 'client' || cand.key === 'user' || cand.key === 'browser' || cand.key === 'device';
        const isFirewall = cand.key === 'firewall' || cand.key === 'shield' || cand.key === 'middleware';
        const isGateway = cand.key === 'gateway' || cand.key === 'balancer' || cand.key === 'nginx';

        const node: DiagramNode = {
          id,
          label: `${cand.label}${indexStr}`,
          type: type,
          color: cand.color || CATEGORY_COLORS[type],
          x: 0,
          y: 0,
          statusLabel: isAttacker ? 'Infiltrating' : 'Active',
          details: [`Name: ${cand.label}`, count > 1 ? `Group Instance #${i + 1}` : "Standalone Unit"]
        };

        if (isAttacker) {
          attackerNodes.push(node);
        } else if (isClient) {
          sourceNodes.push(node);
        } else if (isFirewall) {
          firewallNodes.push(node);
        } else if (isGateway) {
          gatewayNodes.push(node);
        } else {
          targetNodes.push(node);
        }
        nodes.push(node);
      }
    }
  });

  // If no nodes found, spawn a standard dynamic client-server fallback layout safely
  if (nodes.length === 0) {
    const cl: DiagramNode = { id: "node_fallback_client", label: "Standard Client Host", type: "client", x: 15, y: 50, color: CATEGORY_COLORS.client, statusLabel: "Active" };
    const sv: DiagramNode = { id: "node_fallback_server", label: "Fallback Core Host", type: "server", x: 80, y: 50, color: CATEGORY_COLORS.server, statusLabel: "Listening" };
    nodes.push(cl, sv);
    sourceNodes.push(cl);
    targetNodes.push(sv);
  }

  // 3. Topology layout positioning using physical logical columns (staggered dynamically)
  // Categories: Sources (attackers/clients) -> Firewalls (Security) -> Gateways (Nginx) -> Targets (servers/databases/caches)
  const layoutNodeColumn = (list: DiagramNode[], defaultX: number) => {
    const len = list.length;
    list.forEach((node, i) => {
      node.x = defaultX;
      // Stagger vertical height beautifully
      if (len === 1) {
        node.y = 50;
      } else {
        node.y = 15 + (i * 70) / (len - 1);
      }
    });
  };

  // Attacker and safe clients grouped together in the left lane
  const sourceGroup = [...attackerNodes, ...sourceNodes];
  layoutNodeColumn(sourceGroup, 15);
  
  // Firewalls placed physically in front of target nodes
  layoutNodeColumn(firewallNodes, 40);

  // Gateways/Load Balancers loaded in intermediate lane
  layoutNodeColumn(gatewayNodes, 62);

  // Core backends (servers, databases, caches) inside final right lane
  const backendGroup = targetNodes.length > 0 ? targetNodes : [nodes[nodes.length - 1]];
  const targetX = 85;
  backendGroup.forEach((node, i) => {
    node.x = targetX;
    // Database and cloud elements positioned slightly lower, caches higher
    if (backendGroup.length === 1) {
      node.y = 50;
    } else {
      if (node.type === 'database') {
        node.y = 65 + (i * 10);
      } else if (node.type === 'cache') {
        node.y = 25 - (i * 5);
      } else {
        node.y = 20 + (i * 60) / (backendGroup.length - 1);
      }
      // Clamping bounds
      node.y = Math.max(15, Math.min(node.y, 85));
    }
  });

  // Identify overwhelming targets to bind stress animation mechanics
  if (isOverwhelmScenario) {
    const potentialVictims = nodes.filter(n => n.type === 'server' || n.type === 'database');
    if (potentialVictims.length > 0) {
      potentialVictims.forEach(v => {
        v.isOverwhelmTarget = true;
        v.statusLabel = 'Stressed';
      });
    } else if (nodes.length > 1) {
      // Fallback target last node
      nodes[nodes.length - 1].isOverwhelmTarget = true;
      nodes[nodes.length - 1].statusLabel = 'Stressed';
    }
  }

  // 4. Edges and Packet flow builders including Firewalls middleware interceptor rules
  const edges: DiagramEdge[] = [];
  const packets: FlowDiagram['packets'] = [];

  const mainTargets = backendGroup;
  const interceptor = firewallNodes.length > 0 ? firewallNodes[0] : null;

  // Let's create beautiful transmission vector routes
  if (interceptor) {
    // SCENARIO WITH FIREWALL MIDDLEWARE SECURITY
    // 1. Safe clients route cleanly: Client -> Firewall -> Target
    sourceNodes.forEach((client, idx) => {
      const eId1 = `edge_safe_in_${client.id}`;
      edges.push({
        id: eId1,
        from: client.id,
        to: interceptor.id,
        label: "Secure Handshake",
        color: client.color
      });

      packets.push({
        from: client.id,
        to: interceptor.id,
        label: !lowerText.includes('packet') && !lowerText.includes('package') ? "Valid Request" : "Client TCP Data Packet",
        color: client.color,
        speed: 0.007 + Math.random() * 0.004,
        isContinuous: isContinuousStream,
        isLightOrb: !lowerText.includes('packet') && !lowerText.includes('package')
      });

      // Forward route firewall to server
      mainTargets.forEach((target) => {
        const eId2 = `edge_safe_out_${client.id}_${target.id}`;
        // Ensure only unique edges are drawn
        if (!edges.some(e => e.from === interceptor.id && e.to === target.id)) {
          edges.push({
            id: eId2,
            from: interceptor.id,
            to: target.id,
            label: "Authorized Forward",
            color: '#34d399'
          });
        }

        packets.push({
          from: interceptor.id,
          to: target.id,
          label: !lowerText.includes('packet') && !lowerText.includes('package') ? "Cleared Orb" : "Relayed Packet Stream",
          color: '#34d399',
          speed: 0.009,
          isContinuous: isContinuousStream,
          isLightOrb: !lowerText.includes('packet') && !lowerText.includes('package')
        });
      });
    });

    // 2. Attacker bot flows block at Firewall: Attacker -> Firewall (DROP!)
    attackerNodes.forEach((attacker) => {
      const eIdAtt = `edge_att_${attacker.id}`;
      edges.push({
        id: eIdAtt,
        from: attacker.id,
        to: interceptor.id,
        label: "Malicious Connection",
        lineStyle: "dashed",
        color: '#f43f5e'
      });

      packets.push({
        from: attacker.id,
        to: interceptor.id,
        label: !lowerText.includes('packet') && !lowerText.includes('package') ? "DDoS Probe" : "UDP Syn Flood Packet",
        color: '#ef4444',
        speed: 0.012 + Math.random() * 0.004,
        isContinuous: isContinuousStream,
        isLightOrb: !lowerText.includes('packet') && !lowerText.includes('package')
      });
    });
  } else {
    // STANDALONE / STANDARD DYNAMIC INTERACTIVE PATHS
    const mediators = gatewayNodes.length > 0 ? gatewayNodes : [];
    
    if (mediators.length > 0) {
      // Connect Clients to Gateways, and Gateways to Targets
      const mediator = mediators[0];
      
      sourceGroup.forEach((src) => {
        edges.push({
          id: `edge_src_med_${src.id}`,
          from: src.id,
          to: mediator.id,
          label: "Query Pipeline",
          color: src.color
        });
        packets.push({
          from: src.id,
          to: mediator.id,
          label: !lowerText.includes('packet') && !lowerText.includes('package') ? "Inbound Request" : "Ethernet Frame Packet",
          color: src.color,
          speed: 0.008,
          isContinuous: isContinuousStream,
          isLightOrb: !lowerText.includes('packet') && !lowerText.includes('package')
        });
      });

      mainTargets.forEach((target) => {
        edges.push({
          id: `edge_med_tgt_${target.id}`,
          from: mediator.id,
          to: target.id,
          label: "Proxy Relay"
        });
        packets.push({
          from: mediator.id,
          to: target.id,
          label: !lowerText.includes('packet') && !lowerText.includes('package') ? "Dispatched Query" : "Parsed Payload Packet",
          color: '#fb923c',
          speed: 0.010,
          isContinuous: isContinuousStream,
          isLightOrb: !lowerText.includes('packet') && !lowerText.includes('package')
        });
      });
    } else {
      // Connect Sources directly to Targets (Server / Database) concurrently
      sourceGroup.forEach((src, sIdx) => {
        mainTargets.forEach((tgt, tIdx) => {
          edges.push({
            id: `edge_direct_${src.id}_${tgt.id}`,
            from: src.id,
            to: tgt.id,
            label: "Direct Ingress",
            color: src.color
          });
          packets.push({
            from: src.id,
            to: tgt.id,
            label: !lowerText.includes('packet') && !lowerText.includes('package') ? "Data Stream" : "Custom Segment Packet",
            color: src.color,
            speed: 0.006 + Math.random() * 0.006,
            isContinuous: isContinuousStream,
            isLightOrb: !lowerText.includes('packet') && !lowerText.includes('package')
          });
        });
      });
    }
  }

  // Set professional standard details ports, and network specs
  nodes.forEach((n, i) => {
    if (n.type === 'server' || n.type === 'gateway') {
      n.port = n.port || (n.type === 'gateway' ? 80 : 8080 + i);
      n.ip = n.ip || `192.168.1.${10 + i}`;
      n.details = [`IP: ${n.ip}`, `Port: ${n.port}`, `Status: Active`];
    } else if (n.type === 'database') {
      n.port = n.port || 5432;
      n.ip = n.ip || `10.0.0.${20 + i}`;
      n.details = [`IP: ${n.ip}`, `Port: ${n.port}`, "Master SQL Core"];
    } else if (n.type === 'cache') {
      n.port = n.port || 6379;
      n.ip = n.ip || `10.0.0.${30 + i}`;
      n.details = [`IP: ${n.ip}`, `Port: ${n.port}`, "In-Memory Store"];
    } else if (n.type === 'firewall') {
      n.details = ["Decryption: SSL Off", "Inspection Level: Deep"];
    }
  });

  const parsedName = isOverwhelmScenario ? "Stress Resilient Contention Flow" : "Custom Systems Flow Map";
  const parsedDesc = `Dynamically generated topology containing ${nodes.length} nodes from user-supplied prompt text details.`;

  return {
    name: parsedName,
    description: parsedDesc,
    nodes,
    edges,
    packets,
    isContinuousStream,
    isOverwhelmScenario
  };
}
