export interface DiagramNode {
  id: string;
  label: string;
  type: 'client' | 'browser' | 'server' | 'database' | 'cloud' | 'car' | 'cache' | 'gateway' | 'firewall';
  x: number; // 0 to 100 percent
  y: number; // 0 to 100 percent
  ip?: string;
  port?: number | string;
  statusLabel?: string;
  color?: string; // HEX outline color or text color
  details?: string[]; // e.g., ["IP: 10.0.0.1", "Port: 443"]
  size?: number; // custom scale radius/size (e.g. 20-70)
  isOverwhelmTarget?: boolean;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  lineStyle?: 'solid' | 'dashed';
  color?: string;
  isBidirectional?: boolean;
}

export interface DiagramPacketState {
  id: string;
  from: string;
  to: string;
  label: string;
  progress: number; // 0 to 1
  speed: number;
  color: string;
  size: number;
  dataSize?: string;
  isContinuous?: boolean;
  isLightOrb?: boolean;
  property?: 'Malicious' | 'Secure' | 'Encrypted' | 'Valid' | 'Decrypted';
}

export interface FlowDiagram {
  name: string;
  description: string;
  rawPromptText?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  packets: {
    from: string;
    to: string;
    label: string;
    color?: string;
    speed?: number;
    isContinuous?: boolean;
    isLightOrb?: boolean;
  }[];
  isContinuousStream?: boolean;
  isOverwhelmScenario?: boolean;
}

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  rawText: string;
  diagram: FlowDiagram;
}
