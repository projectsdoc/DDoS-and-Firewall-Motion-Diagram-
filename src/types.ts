export interface SimulationConfig {
  firewallActive: boolean;
  ddosIntensity: number; // 0 to 100
  validTrafficRate: number; // 1 to 10 (packets per second)
  activeTab: 'inspection' | 'rules' | 'logs';
  attackType: 'UDP Flood' | 'SYN Flood' | 'HTTP GET Flood';
}

export interface NetworkMetrics {
  cpuUsage: number;
  memoryUsage: number;
  allowedBandwidth: number; // Mbps
  blockedBandwidth: number; // Mbps
  activeConnections: number;
  packetsProcessed: number;
  packetsDropped: number;
  uptime: number; // seconds
}

export interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  message: string;
  port: number;
}
