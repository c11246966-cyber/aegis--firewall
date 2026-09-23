import { 
  SecurityEvent, 
  SecurityAlert, 
  SecurityIncident, 
  FirewallRule, 
  RiskReport, 
  SystemStatus, 
  SimulationVector, 
  OperatingMode, 
  IncidentStatus,
  FirewallAction
} from '../types/aegis';
import { validateIpOrCidr } from '../utils/ipValidator';
import { playTacticalBlip } from '../utils/audio';

const STORAGE_KEY_EVENTS = 'aegis_events_v1';
const STORAGE_KEY_ALERTS = 'aegis_alerts_v1';
const STORAGE_KEY_INCIDENTS = 'aegis_incidents_v1';
const STORAGE_KEY_RULES = 'aegis_rules_v1';
const STORAGE_KEY_CONFIG = 'aegis_config_v1';

// Initial Seed Data for immediate high-density SOC view
const INITIAL_EVENTS: SecurityEvent[] = [
  {
    id: 'EVT-9042',
    timestamp: Date.now() - 142000,
    vector: 'PORT_SCAN',
    sourceIp: '185.220.101.5',
    sourcePort: 49152,
    destIp: '192.0.2.10',
    destPort: 22,
    protocol: 'TCP',
    signature: 'ET SCAN Potential SSH Scan (SYN to 22)',
    severity: 'MEDIUM',
    riskDelta: 15,
    payloadPreview: 'SYN seq=28491024 win=1024 len=0 [Nmap/7.94 probe]',
    rawPacketHex: '45000028 1a2b4000 40062a1c b9dc6505 c000020a c0000016',
    actionTaken: 'ALERTED',
  },
  {
    id: 'EVT-9043',
    timestamp: Date.now() - 138000,
    vector: 'PORT_SCAN',
    sourceIp: '185.220.101.5',
    sourcePort: 49153,
    destIp: '192.0.2.10',
    destPort: 80,
    protocol: 'TCP',
    signature: 'ET SCAN Rapid Multiport Reconnaissance Sequence',
    severity: 'HIGH',
    riskDelta: 25,
    payloadPreview: 'SYN seq=28491025 win=1024 len=0 ports=[22,80,443,3306,8080]',
    rawPacketHex: '45000028 1a2c4000 40062a1b b9dc6505 c000020a c0010050',
    actionTaken: 'ALERTED',
  },
  {
    id: 'EVT-9044',
    timestamp: Date.now() - 95000,
    vector: 'SSH_BRUTE_FORCE',
    sourceIp: '198.51.100.77',
    sourcePort: 54120,
    destIp: '192.0.2.10',
    destPort: 22,
    protocol: 'TCP',
    signature: 'AEGIS_SSH_AUTH_FAIL: Repeated failed auth (user: root, admin)',
    severity: 'HIGH',
    riskDelta: 35,
    payloadPreview: 'SSH-2.0-OpenSSH_8.9p1 invalid user root from 198.51.100.77',
    rawPacketHex: '5353482d 322e302d 4f70656e 5353485f 382e3970 310a0000',
    actionTaken: 'RATE_LIMITED',
  },
  {
    id: 'EVT-9045',
    timestamp: Date.now() - 42000,
    vector: 'HTTP_ANOMALY',
    sourceIp: '203.0.113.19',
    sourcePort: 38290,
    destIp: '192.0.2.10',
    destPort: 443,
    protocol: 'HTTP',
    signature: 'OWASP_CRS_942100: SQL Injection Attempt detected in URI parameter',
    severity: 'CRITICAL',
    riskDelta: 45,
    payloadPreview: 'GET /api/v1/telemetry?node=1%27%20UNION%20SELECT%20user,hash%20FROM%20users--',
    rawPacketHex: '47455420 2f617069 2f76312f 74656c65 6d657472 793f6e6f',
    actionTaken: 'ALERTED',
  },
];

const INITIAL_ALERTS: SecurityAlert[] = [
  {
    id: 'ALT-1091',
    eventId: 'EVT-9045',
    title: 'SQL Injection Signature Detected (OWASP 942100)',
    description: 'Malicious payload in URI parameter targeting telemetry API from 203.0.113.19.',
    timestamp: Date.now() - 42000,
    severity: 'CRITICAL',
    vector: 'HTTP_ANOMALY',
    sourceIp: '203.0.113.19',
    riskScore: 88,
    acknowledged: false,
  },
  {
    id: 'ALT-1090',
    eventId: 'EVT-9044',
    title: 'SSH High-Velocity Credential Stuffing',
    description: 'Multiple authentication failures within 3000ms window from 198.51.100.77.',
    timestamp: Date.now() - 95000,
    severity: 'HIGH',
    vector: 'SSH_BRUTE_FORCE',
    sourceIp: '198.51.100.77',
    riskScore: 74,
    acknowledged: true,
  },
  {
    id: 'ALT-1089',
    eventId: 'EVT-9043',
    title: 'Port Scan Sweep: 16 Ports in 400ms',
    description: 'Coordinated TCP SYN sweep reconnaissance targeting critical daemon ports.',
    timestamp: Date.now() - 138000,
    severity: 'MEDIUM',
    vector: 'PORT_SCAN',
    sourceIp: '185.220.101.5',
    riskScore: 56,
    acknowledged: true,
  },
];

const INITIAL_INCIDENTS: SecurityIncident[] = [
  {
    id: 'INC-2026-042',
    title: 'Automated SQL Injection Exploit Probe on REST API',
    vector: 'HTTP_ANOMALY',
    sourceIp: '203.0.113.19',
    status: 'INVESTIGATING',
    riskScore: 88,
    createdAt: Date.now() - 42000,
    updatedAt: Date.now() - 40000,
    assignee: 'SOC-Analyst-01',
    logsCount: 14,
    timeline: [
      { id: '1', timestamp: Date.now() - 42000, action: 'Incident Raised', user: 'Aegis-IDS Engine', note: 'Automated trigger by rule SQLi-CRS-942100' },
      { id: '2', timestamp: Date.now() - 35000, action: 'Status changed to INVESTIGATING', user: 'SOC-Analyst-01', note: 'Analyzing payload query syntax' },
    ],
  },
  {
    id: 'INC-2026-041',
    title: 'Distributed SSH Dictionary Attack against Bastion Host',
    vector: 'SSH_BRUTE_FORCE',
    sourceIp: '198.51.100.77',
    status: 'OPEN',
    riskScore: 74,
    createdAt: Date.now() - 95000,
    updatedAt: Date.now() - 90000,
    assignee: 'Unassigned',
    logsCount: 42,
    timeline: [
      { id: '1', timestamp: Date.now() - 95000, action: 'Incident Raised', user: 'Aegis-IDS Engine', note: 'Exceeded threshold: 20 failed logins/min' },
    ],
  },
  {
    id: 'INC-2026-040',
    title: 'External Subnet Port Reconnaissance Probe',
    vector: 'PORT_SCAN',
    sourceIp: '185.220.101.5',
    status: 'MITIGATED',
    riskScore: 52,
    createdAt: Date.now() - 142000,
    updatedAt: Date.now() - 60000,
    assignee: 'SOC-Lead-02',
    logsCount: 8,
    timeline: [
      { id: '1', timestamp: Date.now() - 142000, action: 'Incident Raised', user: 'Aegis-IDS Engine', note: 'Nmap SYN fingerprint identified' },
      { id: '2', timestamp: Date.now() - 60000, action: 'Status changed to MITIGATED', user: 'SOC-Lead-02', note: 'Firewall drop rule applied with 3600s TTL' },
    ],
  },
];

const INITIAL_RULES: FirewallRule[] = [
  {
    id: 'RUL-801',
    ipCidr: '185.220.101.5',
    action: 'DROP',
    ttlSeconds: 3600,
    createdAt: Date.now() - 60000,
    expiresAt: Date.now() + (3600 - 60) * 1000,
    reason: 'Mitigation for INC-2026-040: Port scan reconnaissance probe',
    hits: 284,
    chain: 'aegis_blacklist',
    comment: 'Auto-mitigated via SOC Incident triage',
  },
  {
    id: 'RUL-802',
    ipCidr: '198.51.100.200/29',
    action: 'DROP',
    ttlSeconds: 900,
    createdAt: Date.now() - 300000,
    expiresAt: Date.now() + 600000,
    reason: 'Volumetric flood protection subnet quarantine',
    hits: 1420,
    chain: 'aegis_blacklist',
    comment: 'TTL countdown active',
  },
  {
    id: 'RUL-803',
    ipCidr: '192.0.2.254',
    action: 'ALLOW',
    ttlSeconds: 0,
    createdAt: Date.now() - 86400000,
    expiresAt: null,
    reason: 'SOC Bastion Management Gateway',
    hits: 9812,
    chain: 'aegis_whitelist',
    comment: 'Permanent allowlist rule',
  },
];

class AegisStoreService {
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private incidents: SecurityIncident[] = [];
  private rules: FirewallRule[] = [];
  private mode: OperatingMode = 'SIMULATION'; // Default is SIMULATION as requested
  private isSafeMode: boolean = true;
  private soundEnabled: boolean = false;
  private subscribers: Set<() => void> = new Set();
  private ppsRate: number = 1640;
  private mbpsBandwidth: number = 14.8;
  private packetsAnalyzed: number = 492108;
  private lastSimulatedVector: SimulationVector | null = null;
  private uptimeSeconds: number = 43280;

  constructor() {
    this.loadFromStorage();
    this.startBackgroundTicker();
  }

  private loadFromStorage() {
    try {
      const storedEvents = localStorage.getItem(STORAGE_KEY_EVENTS);
      this.events = storedEvents ? JSON.parse(storedEvents) : INITIAL_EVENTS;

      const storedAlerts = localStorage.getItem(STORAGE_KEY_ALERTS);
      this.alerts = storedAlerts ? JSON.parse(storedAlerts) : INITIAL_ALERTS;

      const storedIncidents = localStorage.getItem(STORAGE_KEY_INCIDENTS);
      this.incidents = storedIncidents ? JSON.parse(storedIncidents) : INITIAL_INCIDENTS;

      const storedRules = localStorage.getItem(STORAGE_KEY_RULES);
      this.rules = storedRules ? JSON.parse(storedRules) : INITIAL_RULES;

      const storedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (storedConfig) {
        const config = JSON.parse(storedConfig);
        if (config.mode) this.mode = config.mode;
        if (typeof config.soundEnabled === 'boolean') this.soundEnabled = config.soundEnabled;
      }
    } catch {
      this.events = INITIAL_EVENTS;
      this.alerts = INITIAL_ALERTS;
      this.incidents = INITIAL_INCIDENTS;
      this.rules = INITIAL_RULES;
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(this.events.slice(0, 200)));
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(this.alerts.slice(0, 100)));
      localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(this.incidents));
      localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(this.rules));
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({
        mode: this.mode,
        soundEnabled: this.soundEnabled,
      }));
    } catch {
      // Storage quota safety
    }
  }

  private notify() {
    this.subscribers.forEach(cb => cb());
  }

  public subscribe(cb: () => void) {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private startBackgroundTicker() {
    // 1-second pulse for TTL expiration, traffic variation, and stats
    setInterval(() => {
      const now = Date.now();
      let changed = false;

      // Check TTL rule expirations
      const activeRules: FirewallRule[] = [];
      for (const rule of this.rules) {
        if (rule.expiresAt && now >= rule.expiresAt) {
          changed = true;
          // Record expiration log
          this.events.unshift({
            id: `EVT-${Math.floor(1000 + Math.random() * 9000)}`,
            timestamp: now,
            vector: 'PORT_SCAN',
            sourceIp: rule.ipCidr,
            sourcePort: 0,
            destIp: '0.0.0.0',
            destPort: 0,
            protocol: 'TCP',
            signature: `AEGIS_TTL_EXPIRED: Rule for ${rule.ipCidr} has expired and was removed from chain ${rule.chain}`,
            severity: 'INFO',
            riskDelta: 0,
            payloadPreview: `Automated TTL removal after ${rule.ttlSeconds}s lifetime`,
            rawPacketHex: '00000000',
            actionTaken: 'LOGGED',
          });
        } else {
          // Increment random hits for active drop rules to simulate active firewall inspection
          if (rule.action === 'DROP' && Math.random() < 0.2) {
            rule.hits += Math.floor(1 + Math.random() * 4);
            changed = true;
          }
          activeRules.push(rule);
        }
      }

      if (changed) {
        this.rules = activeRules;
        this.saveToStorage();
      }

      // Simulate live network telemetry jitter
      this.uptimeSeconds += 1;
      const jitterPps = Math.floor(Math.sin(now / 3000) * 120 + (Math.random() * 60 - 30));
      this.ppsRate = Math.max(800, 1600 + jitterPps);
      this.packetsAnalyzed += Math.floor(this.ppsRate / 8);
      this.mbpsBandwidth = parseFloat((this.ppsRate * 0.0092 + (Math.random() * 0.4 - 0.2)).toFixed(2));

      this.notify();
    }, 1000);
  }

  // Getters
  public getEvents(): SecurityEvent[] {
    return [...this.events];
  }

  public getAlerts(): SecurityAlert[] {
    return [...this.alerts];
  }

  public getIncidents(): SecurityIncident[] {
    return [...this.incidents];
  }

  public getRules(): FirewallRule[] {
    return [...this.rules];
  }

  public getSystemStatus(): SystemStatus {
    const openIncidents = this.incidents.filter(i => i.status === 'OPEN' || i.status === 'INVESTIGATING').length;
    const activeBlocks = this.rules.filter(r => r.action === 'DROP').length;

    return {
      mode: this.mode,
      isSafeMode: this.isSafeMode,
      uptimeSeconds: this.uptimeSeconds,
      packetsAnalyzed: this.packetsAnalyzed,
      activeBlocksCount: activeBlocks,
      openIncidentsCount: openIncidents,
      trafficPps: this.ppsRate,
      bandwidthMbps: this.mbpsBandwidth,
      lastSimulatedVector: this.lastSimulatedVector,
      soundEnabled: this.soundEnabled,
    };
  }

  public setMode(newMode: OperatingMode) {
    this.mode = newMode;
    this.saveToStorage();
    playTacticalBlip('click', this.soundEnabled);
    this.notify();
  }

  public toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    this.saveToStorage();
    playTacticalBlip('click', this.soundEnabled);
    this.notify();
    return this.soundEnabled;
  }

  // Incident Triage
  public updateIncidentStatus(id: string, newStatus: IncidentStatus, user: string = 'SOC-Operator', note?: string): boolean {
    const incident = this.incidents.find(i => i.id === id);
    if (!incident) return false;

    incident.status = newStatus;
    incident.updatedAt = Date.now();
    incident.timeline.unshift({
      id: String(Date.now()),
      timestamp: Date.now(),
      action: `Status changed to ${newStatus}`,
      user,
      note: note || `Triaged via Aegis SOC Console by ${user}`,
    });

    playTacticalBlip('clear', this.soundEnabled);
    this.saveToStorage();
    this.notify();
    return true;
  }

  // Alert acknowledgment
  public acknowledgeAlert(id: string) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
      playTacticalBlip('click', this.soundEnabled);
      this.saveToStorage();
      this.notify();
    }
  }

  public acknowledgeAllAlerts() {
    this.alerts.forEach(a => { a.acknowledged = true; });
    playTacticalBlip('clear', this.soundEnabled);
    this.saveToStorage();
    this.notify();
  }

  // Rules management with Input Validation and Safeguards
  public addRule(
    ipCidr: string, 
    action: FirewallAction = 'DROP', 
    ttlSeconds: number = 900, 
    reason: string = 'Manual operator rule', 
    comment?: string,
    overrideSafeguard: boolean = false
  ): { success: boolean; error?: string; rule?: FirewallRule } {
    const validation = validateIpOrCidr(ipCidr);

    if (!validation.isValid) {
      return { success: false, error: validation.error || 'Invalid IP address or CIDR format' };
    }

    if (validation.isSafeguarded && !overrideSafeguard) {
      return {
        success: false,
        error: validation.safeguardMessage || 'Aegis safeguard interlock active. Cannot block loopback or RFC1918 space without explicit override.',
      };
    }

    // Check if duplicate rule already exists
    const existingIndex = this.rules.findIndex(r => r.ipCidr === validation.normalized);
    const now = Date.now();
    const expiresAt = ttlSeconds > 0 ? now + (ttlSeconds * 1000) : null;
    const chain = action === 'ALLOW' ? 'aegis_whitelist' : 'aegis_blacklist';

    const newRule: FirewallRule = {
      id: `RUL-${Math.floor(100 + Math.random() * 900)}`,
      ipCidr: validation.normalized,
      action,
      ttlSeconds,
      createdAt: now,
      expiresAt,
      reason,
      hits: 0,
      chain,
      comment: comment || (ttlSeconds > 0 ? `Active TTL: ${ttlSeconds}s` : 'Permanent enforcement'),
    };

    if (existingIndex >= 0) {
      this.rules[existingIndex] = newRule;
    } else {
      this.rules.unshift(newRule);
    }

    playTacticalBlip('block', this.soundEnabled);
    this.saveToStorage();
    this.notify();
    return { success: true, rule: newRule };
  }

  public removeRule(idOrIp: string): boolean {
    const initialLen = this.rules.length;
    this.rules = this.rules.filter(r => r.id !== idOrIp && r.ipCidr !== idOrIp);
    if (this.rules.length !== initialLen) {
      playTacticalBlip('clear', this.soundEnabled);
      this.saveToStorage();
      this.notify();
      return true;
    }
    return false;
  }

  // Dynamic Risk Engine calculation
  public getRiskReport(): RiskReport {
    const openIncidents = this.incidents.filter(i => i.status === 'OPEN' || i.status === 'INVESTIGATING');
    const recentHighEvents = this.events.filter(e => 
      (e.severity === 'CRITICAL' || e.severity === 'HIGH') && 
      (Date.now() - e.timestamp < 10 * 60 * 1000)
    );

    // Calculate vector scores
    let portScanScore = 15;
    let sshScore = 20;
    let httpScore = 25;
    let floodScore = 10;

    for (const incident of openIncidents) {
      if (incident.vector === 'PORT_SCAN') portScanScore += 20;
      if (incident.vector === 'SSH_BRUTE_FORCE') sshScore += 25;
      if (incident.vector === 'HTTP_ANOMALY') httpScore += 30;
      if (incident.vector === 'NETWORK_FLOOD') floodScore += 35;
    }

    portScanScore = Math.min(100, portScanScore);
    sshScore = Math.min(100, sshScore);
    httpScore = Math.min(100, httpScore);
    floodScore = Math.min(100, floodScore);

    // Base score from active incidents & recent event burst
    let composite = (openIncidents.length * 18) + (recentHighEvents.length * 8);

    // If currently in ENFORCEMENT mode and rules are blocking, risk is controlled (-12%)
    if (this.mode === 'ENFORCEMENT') {
      composite = Math.max(12, composite * 0.82);
    } else if (this.mode === 'MONITOR') {
      composite = composite * 1.1; // Monitor mode has higher unmitigated risk
    }

    const finalScore = Math.min(98, Math.max(8, Math.round(composite)));

    let threatLevel: RiskReport['threatLevel'] = 'DEFCON 5 (NORMAL)';
    let threatColor = '#10b981'; // green

    if (finalScore >= 85) {
      threatLevel = 'DEFCON 1 (CRITICAL)';
      threatColor = '#ef4444'; // red
    } else if (finalScore >= 70) {
      threatLevel = 'DEFCON 2 (HIGH)';
      threatColor = '#f97316'; // orange
    } else if (finalScore >= 45) {
      threatLevel = 'DEFCON 3 (ELEVATED)';
      threatColor = '#eab308'; // amber
    } else if (finalScore >= 25) {
      threatLevel = 'DEFCON 4 (GUARDED)';
      threatColor = '#06b6d4'; // cyan
    }

    return {
      currentScore: finalScore,
      threatLevel,
      threatColor,
      vectorBreakdown: {
        portScan: portScanScore,
        sshBruteForce: sshScore,
        httpAnomaly: httpScore,
        networkFlood: floodScore,
      },
      activeThreatsCount: openIncidents.length,
      blockedAttemptsCount: this.rules.reduce((sum, r) => sum + r.hits, 0),
      recentTrend: recentHighEvents.length > 3 ? 'UP' : recentHighEvents.length === 0 ? 'DOWN' : 'STABLE',
    };
  }

  // Simulation Vectors (SAFE MODE)
  public async simulateVector(vector: SimulationVector): Promise<{
    event: SecurityEvent;
    alert?: SecurityAlert;
    incident?: SecurityIncident;
    mitigatedRule?: FirewallRule;
  }> {
    this.lastSimulatedVector = vector;
    const now = Date.now();
    let event: SecurityEvent;
    let alert: SecurityAlert | undefined;
    let incident: SecurityIncident | undefined;
    let mitigatedRule: FirewallRule | undefined;

    playTacticalBlip('alert', this.soundEnabled);

    // Pick realistic mock attacker IPs (using RFC 5737 documentation ranges to be 100% safe)
    if (vector === 'PORT_SCAN') {
      const attackerIp = `198.51.100.${Math.floor(10 + Math.random() * 50)}`;
      const targetPorts = [21, 22, 80, 443, 3306, 8080];
      const probedPort = targetPorts[Math.floor(Math.random() * targetPorts.length)];

      event = {
        id: `EVT-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: now,
        vector: 'PORT_SCAN',
        sourceIp: attackerIp,
        sourcePort: Math.floor(40000 + Math.random() * 20000),
        destIp: '192.0.2.10',
        destPort: probedPort,
        protocol: 'TCP',
        signature: `ET SCAN Rapid SYN Probe to port ${probedPort} [Nmap/7.94-SYN-Stealth]`,
        severity: 'MEDIUM',
        riskDelta: 20,
        payloadPreview: `TCP SYN probe flag=SYN seq=${Math.floor(Math.random() * 1000000)} win=1024`,
        rawPacketHex: `45000028 ${Math.floor(Math.random() * 9999).toString(16).padStart(4, '0')}4000 40062a1c c63364${attackerIp.split('.')[3]} c000020a`,
        actionTaken: this.mode === 'ENFORCEMENT' ? 'BLOCKED' : 'ALERTED',
      };

      alert = {
        id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
        eventId: event.id,
        title: `Port Scan Ingress: SYN Sweep from ${attackerIp}`,
        description: `Sequential reconnaissance probe targeted TCP daemon ports including ${probedPort}.`,
        timestamp: now,
        severity: 'MEDIUM',
        vector: 'PORT_SCAN',
        sourceIp: attackerIp,
        riskScore: 58,
        acknowledged: false,
      };

      incident = {
        id: `INC-2026-${Math.floor(100 + Math.random() * 900)}`,
        title: `Host Reconnaissance & Multiport Port Scan Sweep`,
        vector: 'PORT_SCAN',
        sourceIp: attackerIp,
        status: this.mode === 'ENFORCEMENT' ? 'MITIGATED' : 'OPEN',
        riskScore: 58,
        createdAt: now,
        updatedAt: now,
        assignee: 'Unassigned',
        logsCount: 6,
        timeline: [
          { id: '1', timestamp: now, action: 'Reconnaissance Detected', user: 'Aegis-Sim Engine', note: 'SYN scan burst from test vector' },
        ],
      };

      if (this.mode === 'ENFORCEMENT') {
        const res = this.addRule(attackerIp, 'DROP', 900, `Automated enforcement for ${incident.id}`, 'Auto-dropped by Aegis IDS/IPS');
        if (res.rule) mitigatedRule = res.rule;
      }

    } else if (vector === 'SSH_BRUTE_FORCE') {
      const attackerIp = `203.0.113.${Math.floor(60 + Math.random() * 40)}`;
      const usernames = ['root', 'admin', 'ubuntu', 'devops', 'ansible'];
      const targetUser = usernames[Math.floor(Math.random() * usernames.length)];

      event = {
        id: `EVT-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: now,
        vector: 'SSH_BRUTE_FORCE',
        sourceIp: attackerIp,
        sourcePort: 55432,
        destIp: '192.0.2.10',
        destPort: 22,
        protocol: 'TCP',
        signature: `AEGIS_SSH_BRUTE_FORCE: Password guess burst (user: ${targetUser})`,
        severity: 'HIGH',
        riskDelta: 35,
        payloadPreview: `SSH-2.0-OpenSSH_8.4 failed password for invalid user '${targetUser}' from ${attackerIp} port 55432 ssh2`,
        rawPacketHex: `5353482d 322e302d 4f70656e 5353485f 382e3400 cb0071${attackerIp.split('.')[3]}`,
        actionTaken: this.mode === 'ENFORCEMENT' ? 'BLOCKED' : 'RATE_LIMITED',
      };

      alert = {
        id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
        eventId: event.id,
        title: `SSH Brute Force: High-Velocity Auth Failure`,
        description: `Burst of invalid credential exchanges against OpenSSH port 22 from ${attackerIp}.`,
        timestamp: now,
        severity: 'HIGH',
        vector: 'SSH_BRUTE_FORCE',
        sourceIp: attackerIp,
        riskScore: 78,
        acknowledged: false,
      };

      incident = {
        id: `INC-2026-${Math.floor(100 + Math.random() * 900)}`,
        title: `SSH Credential Stuffing & Dictionary Attack`,
        vector: 'SSH_BRUTE_FORCE',
        sourceIp: attackerIp,
        status: this.mode === 'ENFORCEMENT' ? 'MITIGATED' : 'OPEN',
        riskScore: 78,
        createdAt: now,
        updatedAt: now,
        assignee: 'Unassigned',
        logsCount: 24,
        timeline: [
          { id: '1', timestamp: now, action: 'Incident Escalated', user: 'Aegis-Sim Engine', note: `Exceeded auth failure threshold (user: ${targetUser})` },
        ],
      };

      if (this.mode === 'ENFORCEMENT') {
        const res = this.addRule(attackerIp, 'DROP', 1800, `Automated enforcement for ${incident.id}`, 'Brute-force auto-quarantine (30m)');
        if (res.rule) mitigatedRule = res.rule;
      }

    } else if (vector === 'HTTP_ANOMALY') {
      const attackerIp = `198.51.100.${Math.floor(120 + Math.random() * 50)}`;
      const payloads = [
        { sig: 'OWASP_CRS_942100: SQLi in URL query', uri: "/api/v1/auth?token=1'%20OR%20'1'='1" },
        { sig: 'OWASP_CRS_930110: Path Traversal /etc/shadow', uri: '/static/../../../../etc/passwd' },
        { sig: 'OWASP_CRS_932100: Remote Command Injection', uri: '/cgi-bin/status.sh?cmd=cat+/etc/issue;id' },
      ];
      const selected = payloads[Math.floor(Math.random() * payloads.length)];

      event = {
        id: `EVT-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: now,
        vector: 'HTTP_ANOMALY',
        sourceIp: attackerIp,
        sourcePort: 44102,
        destIp: '192.0.2.10',
        destPort: 443,
        protocol: 'HTTP',
        signature: selected.sig,
        severity: 'CRITICAL',
        riskDelta: 45,
        payloadPreview: `GET ${selected.uri} HTTP/1.1 [User-Agent: sqlmap/1.7.2#stable]`,
        rawPacketHex: `47455420 2f617069 2f76312f 61757468 3f746f6b 656e3d31`,
        actionTaken: this.mode === 'ENFORCEMENT' ? 'BLOCKED' : 'ALERTED',
      };

      alert = {
        id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
        eventId: event.id,
        title: `Web Exploit Anomaly: ${selected.sig.split(':')[0]}`,
        description: `Malicious HTTP request payload matched signature filter on port 443.`,
        timestamp: now,
        severity: 'CRITICAL',
        vector: 'HTTP_ANOMALY',
        sourceIp: attackerIp,
        riskScore: 92,
        acknowledged: false,
      };

      incident = {
        id: `INC-2026-${Math.floor(100 + Math.random() * 900)}`,
        title: `Web Application Injection & Exploit Attempt`,
        vector: 'HTTP_ANOMALY',
        sourceIp: attackerIp,
        status: this.mode === 'ENFORCEMENT' ? 'MITIGATED' : 'INVESTIGATING',
        riskScore: 92,
        createdAt: now,
        updatedAt: now,
        assignee: 'SOC-Analyst-01',
        logsCount: 18,
        timeline: [
          { id: '1', timestamp: now, action: 'Critical Alert Raised', user: 'Aegis-WAF Rule Engine', note: `Payload match: ${selected.uri}` },
        ],
      };

      if (this.mode === 'ENFORCEMENT') {
        const res = this.addRule(attackerIp, 'DROP', 3600, `Automated enforcement for ${incident.id}`, 'WAF injection auto-drop (1h)');
        if (res.rule) mitigatedRule = res.rule;
      }

    } else {
      // NETWORK_FLOOD
      const attackerSubnet = `203.0.113.${Math.floor(200 + Math.random() * 50)}`;
      const ppsBurst = Math.floor(38000 + Math.random() * 15000);
      this.ppsRate = ppsBurst;
      this.mbpsBandwidth = parseFloat((ppsBurst * 0.0094).toFixed(2));

      event = {
        id: `EVT-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: now,
        vector: 'NETWORK_FLOOD',
        sourceIp: `${attackerSubnet}/29`,
        sourcePort: 0,
        destIp: '192.0.2.10',
        destPort: 53,
        protocol: 'UDP',
        signature: `AEGIS_VOLUMETRIC_FLOOD: UDP amplification spike (${ppsBurst} pps)`,
        severity: 'CRITICAL',
        riskDelta: 50,
        payloadPreview: `UDP Flood burst: ${ppsBurst} pps / ${this.mbpsBandwidth} Mbps against ingress interface eth0`,
        rawPacketHex: `ffffffff 00000000 08004500 001c0000 40004011`,
        actionTaken: this.mode === 'ENFORCEMENT' ? 'BLOCKED' : 'ALERTED',
      };

      alert = {
        id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
        eventId: event.id,
        title: `Volumetric Flooding Ingress (${ppsBurst} pps)`,
        description: `Traffic spike exceeded anomalous ingress threshold (15,000 pps) from ${attackerSubnet}/29.`,
        timestamp: now,
        severity: 'CRITICAL',
        vector: 'NETWORK_FLOOD',
        sourceIp: `${attackerSubnet}/29`,
        riskScore: 96,
        acknowledged: false,
      };

      incident = {
        id: `INC-2026-${Math.floor(100 + Math.random() * 900)}`,
        title: `Volumetric UDP Network Ingress Flooding`,
        vector: 'NETWORK_FLOOD',
        sourceIp: `${attackerSubnet}/29`,
        status: this.mode === 'ENFORCEMENT' ? 'MITIGATED' : 'OPEN',
        riskScore: 96,
        createdAt: now,
        updatedAt: now,
        assignee: 'SOC-Lead-02',
        logsCount: 88,
        timeline: [
          { id: '1', timestamp: now, action: 'Volumetric Threshold Exceeded', user: 'Aegis-Kernel Monitor', note: `Bandwidth reached ${this.mbpsBandwidth} Mbps` },
        ],
      };

      if (this.mode === 'ENFORCEMENT') {
        const res = this.addRule(`${attackerSubnet}/29`, 'DROP', 600, `Automated flood mitigation for ${incident.id}`, 'Subnet quarantine (10m)');
        if (res.rule) mitigatedRule = res.rule;
      }
    }

    this.events.unshift(event);
    if (alert) this.alerts.unshift(alert);
    if (incident) this.incidents.unshift(incident);

    this.saveToStorage();
    this.notify();

    return { event, alert, incident, mitigatedRule };
  }

  // Reset to factory defaults
  public resetToDefaults() {
    this.events = [...INITIAL_EVENTS];
    this.alerts = [...INITIAL_ALERTS];
    this.incidents = [...INITIAL_INCIDENTS];
    this.rules = [...INITIAL_RULES];
    this.mode = 'SIMULATION';
    this.saveToStorage();
    this.notify();
  }
}

export const aegisStore = new AegisStoreService();
