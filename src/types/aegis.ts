export type SimulationVector = 
  | 'PORT_SCAN' 
  | 'SSH_BRUTE_FORCE' 
  | 'HTTP_ANOMALY' 
  | 'NETWORK_FLOOD';

export type OperatingMode = 'MONITOR' | 'SIMULATION' | 'ENFORCEMENT';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type IncidentStatus = 
  | 'OPEN' 
  | 'INVESTIGATING' 
  | 'MITIGATED' 
  | 'RESOLVED' 
  | 'FALSE_POSITIVE';

export type FirewallAction = 'DROP' | 'REJECT' | 'ALLOW';

export interface SecurityEvent {
  id: string;
  timestamp: number;
  vector: SimulationVector;
  sourceIp: string;
  sourcePort: number;
  destIp: string;
  destPort: number;
  protocol: 'TCP' | 'UDP' | 'HTTP' | 'ICMP';
  signature: string;
  severity: SeverityLevel;
  riskDelta: number;
  payloadPreview: string;
  rawPacketHex: string;
  actionTaken: 'LOGGED' | 'ALERTED' | 'BLOCKED' | 'RATE_LIMITED';
  blockedByRuleId?: string;
}

export interface SecurityAlert {
  id: string;
  eventId?: string;
  title: string;
  description: string;
  timestamp: number;
  severity: SeverityLevel;
  vector: SimulationVector;
  sourceIp: string;
  riskScore: number;
  acknowledged: boolean;
}

export interface IncidentTimelineItem {
  id: string;
  timestamp: number;
  action: string;
  user: string;
  note?: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  vector: SimulationVector;
  sourceIp: string;
  status: IncidentStatus;
  riskScore: number;
  createdAt: number;
  updatedAt: number;
  assignee: string;
  logsCount: number;
  timeline: IncidentTimelineItem[];
}

export interface FirewallRule {
  id: string;
  ipCidr: string;
  action: FirewallAction;
  ttlSeconds: number; // 0 = permanent
  createdAt: number;
  expiresAt: number | null;
  reason: string;
  hits: number;
  chain: 'aegis_input' | 'aegis_blacklist' | 'aegis_whitelist';
  comment?: string;
}

export interface RiskReport {
  currentScore: number; // 0 - 100
  threatLevel: 'DEFCON 5 (NORMAL)' | 'DEFCON 4 (GUARDED)' | 'DEFCON 3 (ELEVATED)' | 'DEFCON 2 (HIGH)' | 'DEFCON 1 (CRITICAL)';
  threatColor: string;
  vectorBreakdown: {
    portScan: number;
    sshBruteForce: number;
    httpAnomaly: number;
    networkFlood: number;
  };
  activeThreatsCount: number;
  blockedAttemptsCount: number;
  recentTrend: 'UP' | 'DOWN' | 'STABLE';
}

export interface SystemStatus {
  mode: OperatingMode;
  isSafeMode: boolean;
  uptimeSeconds: number;
  packetsAnalyzed: number;
  activeBlocksCount: number;
  openIncidentsCount: number;
  trafficPps: number;
  bandwidthMbps: number;
  lastSimulatedVector: SimulationVector | null;
  soundEnabled: boolean;
}
