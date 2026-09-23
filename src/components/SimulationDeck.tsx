import React, { useState } from 'react';
import { 
  Play, 
  Radar, 
  KeyRound, 
  Globe, 
  Waves, 
  ShieldCheck, 
  AlertOctagon, 
  CheckCircle2, 
  Loader2,
  Terminal,
  ArrowRight
} from 'lucide-react';
import { SimulationVector, OperatingMode } from '../types/aegis';

interface SimulationDeckProps {
  currentMode: OperatingMode;
  onSimulate: (vector: SimulationVector) => Promise<unknown>;
}

export const SimulationDeck: React.FC<SimulationDeckProps> = ({ currentMode, onSimulate }) => {
  const [runningVector, setRunningVector] = useState<SimulationVector | null>(null);
  const [lastResult, setLastResult] = useState<{
    vector: SimulationVector;
    message: string;
    details: string;
    actionTaken: string;
  } | null>(null);

  const vectors: {
    id: SimulationVector;
    title: string;
    description: string;
    target: string;
    signature: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgGlow: string;
    defaultAction: string;
  }[] = [
    {
      id: 'PORT_SCAN',
      title: 'PORT_SCAN',
      description: 'Simulates fast SYN scanning reconnaissance across common server daemons.',
      target: 'Ports: 21, 22, 80, 443, 3306, 8080',
      signature: 'ET SCAN Potential SSH/Web Port Reconnaissance (SYN sweep)',
      icon: Radar,
      color: 'text-amber-400 border-amber-500/40',
      bgGlow: 'hover:border-amber-400/80 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      defaultAction: currentMode === 'ENFORCEMENT' ? 'Auto-Drop Attacker IP (900s TTL)' : 'Alert & Log Event',
    },
    {
      id: 'SSH_BRUTE_FORCE',
      title: 'SSH_BRUTE_FORCE',
      description: 'Simulates high-frequency credential stuffing targeting OpenSSH daemon.',
      target: 'Port 22/TCP (users: root, admin, ubuntu)',
      signature: 'AEGIS_SSH_AUTH_FAIL: Repeated auth failure threshold reached',
      icon: KeyRound,
      color: 'text-orange-400 border-orange-500/40',
      bgGlow: 'hover:border-orange-400/80 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]',
      defaultAction: currentMode === 'ENFORCEMENT' ? 'Quarantine IP (1800s TTL)' : 'Rate Limit & High Alert',
    },
    {
      id: 'HTTP_ANOMALY',
      title: 'HTTP_ANOMALY',
      description: 'Simulates web application exploits (SQL injection, path traversal /etc/passwd).',
      target: 'Port 443/HTTPS (URI injection payload)',
      signature: 'OWASP_CRS_942100: SQLi / Path Traversal syntax detected',
      icon: Globe,
      color: 'text-red-400 border-red-500/40',
      bgGlow: 'hover:border-red-400/80 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
      defaultAction: currentMode === 'ENFORCEMENT' ? 'Immediate DROP (3600s TTL)' : 'Raise Critical Alert & Incident',
    },
    {
      id: 'NETWORK_FLOOD',
      title: 'NETWORK_FLOOD',
      description: 'Simulates high-pps volumetric UDP/SYN amplification flood attack.',
      target: 'Ingress Interface (45,000 pps burst / 180 Mbps)',
      signature: 'AEGIS_VOLUMETRIC_FLOOD: Anomalous bandwidth spike threshold',
      icon: Waves,
      color: 'text-purple-400 border-purple-500/40',
      bgGlow: 'hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
      defaultAction: currentMode === 'ENFORCEMENT' ? 'Subnet Quarantine (600s TTL)' : 'Ingress Volumetric Alarm',
    },
  ];

  const handleRun = async (vector: SimulationVector) => {
    setRunningVector(vector);
    try {
      await onSimulate(vector);
      let actionMsg = '';
      if (currentMode === 'ENFORCEMENT') {
        actionMsg = 'ENFORCEMENT ACTION: Offending source IP automatically placed into nftables DROP chain with temporary TTL!';
      } else if (currentMode === 'MONITOR') {
        actionMsg = 'MONITOR ACTION: Passive observation mode. Event logged, no firewall mutation performed.';
      } else {
        actionMsg = 'SIMULATION ACTION: Safe test telemetry generated, alert logged, and incident triage record created.';
      }

      setLastResult({
        vector,
        message: `Simulation Completed: ${vector}`,
        details: `Simulated attack packets injected into Aegis IDS/IPS inspection pipeline.`,
        actionTaken: actionMsg,
      });
    } finally {
      setTimeout(() => setRunningVector(null), 300);
    }
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-tactical text-sm font-bold tracking-wider text-slate-200 uppercase">
              ATTACK SIMULATION VECTORS
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 font-mono-code">
              SAFE MODE ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono-code mt-0.5">
            Safely test intrusion detection, alerting, and automated mitigation workflows without host impact.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono-code">
          <span className="text-slate-500">POLICY:</span>
          <span className={`px-2 py-0.5 rounded border font-semibold ${
            currentMode === 'ENFORCEMENT' 
              ? 'bg-red-950/60 text-red-300 border-red-500/50' 
              : currentMode === 'SIMULATION' 
              ? 'bg-amber-950/60 text-amber-300 border-amber-500/50' 
              : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/50'
          }`}>
            {currentMode}
          </span>
        </div>
      </div>

      {/* 4 Vector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        {vectors.map((vec) => {
          const Icon = vec.icon;
          const isRunning = runningVector === vec.id;

          return (
            <div
              key={vec.id}
              className={`bg-slate-900/60 border rounded-lg p-3.5 flex flex-col justify-between transition-all duration-200 ${vec.color} ${vec.bgGlow}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="font-tactical font-bold text-xs tracking-wider text-slate-100">
                      {vec.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-code text-slate-400">VECTOR</span>
                </div>

                <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                  {vec.description}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1 text-[11px] font-mono-code">
                  <div className="text-slate-400 truncate">
                    <span className="text-slate-500">TARGET:</span> {vec.target}
                  </div>
                  <div className="text-slate-400 truncate">
                    <span className="text-slate-500">ACTION:</span> <span className="text-cyan-300">{vec.defaultAction}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2">
                <button
                  onClick={() => handleRun(vec.id)}
                  disabled={isRunning}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-tactical font-bold tracking-wider uppercase bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-slate-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>INJECTING...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>TRIGGER TEST</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Execution Feedback Notification */}
      {lastResult && (
        <div className="mt-3 p-3 bg-slate-900/90 border border-cyan-800/60 rounded-md flex items-start justify-between gap-3 text-xs font-mono-code">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-200">{lastResult.message}</div>
              <div className="text-slate-400 mt-0.5">{lastResult.details}</div>
              <div className="text-cyan-300 mt-1 font-semibold">{lastResult.actionTaken}</div>
            </div>
          </div>
          <button
            onClick={() => setLastResult(null)}
            className="text-slate-500 hover:text-slate-300 text-[11px]"
          >
            [DISMISS]
          </button>
        </div>
      )}
    </div>
  );
};
