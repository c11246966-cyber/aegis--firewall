import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, 
  Play, 
  Code2, 
  Copy, 
  Check, 
  Trash2, 
  CornerDownLeft,
  Download
} from 'lucide-react';
import { aegisStore } from '../services/aegisStore';
import { SimulationVector, OperatingMode, IncidentStatus } from '../types/aegis';

interface CliTerminalProps {
  onSimulate: (vec: SimulationVector) => Promise<unknown>;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success';
  text: string;
}

export const CliTerminal: React.FC<CliTerminalProps> = ({ onSimulate }) => {
  const [activeSubTab, setActiveSubTab] = useState<'terminal' | 'python_source'>('terminal');
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: '1', type: 'output', text: 'Aegis-Linux IDS/IPS Interactive Operator CLI [v1.0.4-release]' },
    { id: '2', type: 'output', text: 'Connected to local socket /var/run/aegis.sock (MOCKED/SAFE MODE)' },
    { id: '3', type: 'output', text: 'Type "aegis --help" or click suggestions below to test commands.' },
  ]);
  const [copiedPython, setCopiedPython] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const addLine = (type: TerminalLine['type'], text: string) => {
    setLines(prev => [...prev, { id: String(Date.now() + Math.random()), type, text }]);
  };

  const executeCommand = async (cmdStr: string) => {
    const raw = cmdStr.trim();
    if (!raw) return;

    // Add to history
    setHistory(prev => [...prev, raw]);
    setHistoryIndex(-1);
    addLine('input', `operator@aegis-soc:~$ ${raw}`);

    const parts = raw.split(/\s+/);
    let cmd = parts[0];
    let args = parts.slice(1);

    if (cmd === 'aegis' && args.length > 0) {
      cmd = args[0];
      args = args.slice(1);
    }

    if (cmd === 'clear') {
      setLines([]);
      return;
    }

    if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
      addLine('output', `AEGIS COMMAND REFERENCE:
  aegis status                        Show system status, DEFCON risk score, and ingress rate
  aegis mode [MONITOR|SIM|ENFORCE]   Set active operating mode
  aegis simulate --vector <VECTOR>    Trigger attack vector: PORT_SCAN, SSH_BRUTE_FORCE, HTTP_ANOMALY, NETWORK_FLOOD
  aegis block <IP> [--ttl <SECS>]     Add firewall quarantine rule (with loopback safeguard)
  aegis unblock <IP>                  Remove quarantine rule for target IP
  aegis rules list                    List all active nftables/iptables rules
  aegis incidents list                Display all open and investigated security incidents
  aegis incidents triage <ID> <STATUS> Update triage status (OPEN, INVESTIGATING, MITIGATED, RESOLVED)
  aegis events tail [-n <COUNT>]      Inspect recent security telemetry events
  clear                               Clear terminal screen`);
      return;
    }

    if (cmd === 'status') {
      const st = aegisStore.getSystemStatus();
      const risk = aegisStore.getRiskReport();
      addLine('output', `[+] AEGIS SYSTEM STATUS:
    Operating Mode:    ${st.mode}
    Safe Simulation:   ${st.isSafeMode ? 'ENABLED (SAFE MODE)' : 'DISABLED'}
    Threat Level:      ${risk.threatLevel} (${risk.currentScore}/100)
    Ingress Traffic:   ${st.trafficPps.toLocaleString()} pps / ${st.bandwidthMbps} Mbps
    Packets Analyzed:  ${st.packetsAnalyzed.toLocaleString()}
    Active Blocks:     ${st.activeBlocksCount} rules
    Open Incidents:    ${st.openIncidentsCount}`);
      return;
    }

    if (cmd === 'mode') {
      const modeArg = (args[0] || '').toUpperCase();
      if (modeArg === 'MONITOR' || modeArg === 'SIMULATION' || modeArg === 'ENFORCEMENT') {
        aegisStore.setMode(modeArg as OperatingMode);
        addLine('success', `[✓] Aegis operating mode switched to: ${modeArg}`);
      } else if (modeArg === 'SIM') {
        aegisStore.setMode('SIMULATION');
        addLine('success', `[✓] Aegis operating mode switched to: SIMULATION`);
      } else if (modeArg === 'ENFORCE') {
        aegisStore.setMode('ENFORCEMENT');
        addLine('success', `[✓] Aegis operating mode switched to: ENFORCEMENT`);
      } else {
        addLine('error', `[!] Invalid mode "${args[0]}". Options: MONITOR, SIMULATION, ENFORCEMENT`);
      }
      return;
    }

    if (cmd === 'simulate') {
      let vec: SimulationVector = 'PORT_SCAN';
      const vecIdx = args.indexOf('--vector');
      if (vecIdx >= 0 && args[vecIdx + 1]) {
        const val = args[vecIdx + 1].toUpperCase();
        if (val === 'PORT_SCAN' || val === 'SSH_BRUTE_FORCE' || val === 'HTTP_ANOMALY' || val === 'NETWORK_FLOOD') {
          vec = val as SimulationVector;
        } else {
          addLine('error', `[!] Unknown simulation vector "${val}". Valid: PORT_SCAN, SSH_BRUTE_FORCE, HTTP_ANOMALY, NETWORK_FLOOD`);
          return;
        }
      } else if (args[0] && !args[0].startsWith('--')) {
        const val = args[0].toUpperCase();
        if (val === 'PORT_SCAN' || val === 'SSH_BRUTE_FORCE' || val === 'HTTP_ANOMALY' || val === 'NETWORK_FLOOD') {
          vec = val as SimulationVector;
        }
      }

      addLine('output', `[*] Triggering safe test scenario: ${vec}...`);
      await onSimulate(vec);
      const mode = aegisStore.getSystemStatus().mode;
      if (mode === 'ENFORCEMENT') {
        addLine('success', `[✓] Simulation completed. Event detected, alert dispatched, and automatic TTL DROP rule committed!`);
      } else {
        addLine('success', `[✓] Simulation completed. Security event recorded in SQLite database and incident opened.`);
      }
      return;
    }

    if (cmd === 'block') {
      const ip = args[0];
      if (!ip) {
        addLine('error', `[!] Missing IP argument. Usage: aegis block <IP> [--ttl <SECS>]`);
        return;
      }
      let ttl = 900;
      const ttlIdx = args.indexOf('--ttl');
      if (ttlIdx >= 0 && args[ttlIdx + 1]) {
        ttl = parseInt(args[ttlIdx + 1], 10) || 900;
      }
      const res = aegisStore.addRule(ip, 'DROP', ttl, 'Blocked via operator CLI command');
      if (res.success) {
        addLine('success', `[✓] Added DROP rule for ${ip} (Chain: aegis_blacklist, TTL: ${ttl}s)`);
      } else {
        addLine('error', `[!] Rule rejected: ${res.error}`);
      }
      return;
    }

    if (cmd === 'unblock') {
      const ip = args[0];
      if (!ip) {
        addLine('error', `[!] Missing IP argument. Usage: aegis unblock <IP>`);
        return;
      }
      const ok = aegisStore.removeRule(ip);
      if (ok) {
        addLine('success', `[✓] Removed rule for ${ip}`);
      } else {
        addLine('error', `[!] No active rule found matching ${ip}`);
      }
      return;
    }

    if (cmd === 'rules' && args[0] === 'list') {
      const rules = aegisStore.getRules();
      if (rules.length === 0) {
        addLine('output', 'No active firewall rules.');
        return;
      }
      const header = 'ID       IP/CIDR           ACTION  CHAIN            TTL     HITS  REASON';
      const rows = rules.map(r => 
        `${r.id.padEnd(8)} ${r.ipCidr.padEnd(17)} ${r.action.padEnd(7)} ${r.chain.padEnd(16)} ${(r.ttlSeconds + 's').padEnd(7)} ${String(r.hits).padEnd(5)} ${r.reason}`
      );
      addLine('output', [header, '----------------------------------------------------------------------------------', ...rows].join('\n'));
      return;
    }

    if (cmd === 'incidents') {
      if (args[0] === 'list') {
        const incidents = aegisStore.getIncidents();
        const header = 'ID            STATUS        RISK  ATTACKER         VECTOR';
        const rows = incidents.map(i => 
          `${i.id.padEnd(13)} ${i.status.padEnd(13)} ${String(i.riskScore).padEnd(5)} ${i.sourceIp.padEnd(16)} ${i.vector}`
        );
        addLine('output', [header, '----------------------------------------------------------------------', ...rows].join('\n'));
        return;
      }
      if (args[0] === 'triage') {
        const incId = args[1];
        const status = (args[2] || '').toUpperCase() as IncidentStatus;
        if (!incId || !status) {
          addLine('error', `[!] Usage: aegis incidents triage <INC_ID> <OPEN|INVESTIGATING|MITIGATED|RESOLVED>`);
          return;
        }
        const ok = aegisStore.updateIncidentStatus(incId, status, 'operator-cli', 'Updated via Aegis CLI tool');
        if (ok) {
          addLine('success', `[✓] Incident ${incId} status changed to ${status}`);
        } else {
          addLine('error', `[!] Incident ${incId} not found`);
        }
        return;
      }
    }

    if (cmd === 'events' && args[0] === 'tail') {
      let count = 5;
      const nIdx = args.indexOf('-n');
      if (nIdx >= 0 && args[nIdx + 1]) {
        count = parseInt(args[nIdx + 1], 10) || 5;
      }
      const evts = aegisStore.getEvents().slice(0, count);
      const linesOut = evts.map(e => 
        `[${new Date(e.timestamp).toISOString()}] [${e.severity}] [${e.actionTaken}] ${e.sourceIp} -> ${e.destIp}:${e.destPort} (${e.signature})`
      );
      addLine('output', linesOut.join('\n'));
      return;
    }

    addLine('error', `[!] Unknown command: "${raw}". Type "aegis --help" for list of valid commands.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    executeCommand(command);
    setCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex + 1 < history.length ? historyIndex + 1 : historyIndex;
        setHistoryIndex(nextIdx);
        setCommand(history[history.length - 1 - nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCommand(history[history.length - 1 - nextIdx] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const pythonCliSource = `#!/usr/bin/env python3
"""
Aegis-Linux IDS/IPS Local Operator CLI
Location: backend/cli.py
Usage: ./backend/cli.py [COMMAND] [OPTIONS]
"""

import sys
import argparse
import requests
import json

AEGIS_API_URL = "http://127.0.0.1:8000/api/v1"

def print_banner():
    print("""
    ========================================================
      AEGIS-LINUX IDS/IPS OPERATOR COMMAND-LINE INTERFACE
    ========================================================
    """)

def get_status():
    res = requests.get(f"{AEGIS_API_URL}/system/status")
    if res.status_code == 200:
        data = res.json()
        print(f"[+] Status:        {data.get('mode')}")
        print(f"[+] Ingress:       {data.get('traffic_pps')} pps")
        print(f"[+] Active Blocks: {data.get('active_blocks')} rules")
    else:
        print("[!] Failed to query Aegis daemon.")

def simulate(vector: str):
    payload = {"vector": vector}
    res = requests.post(f"{AEGIS_API_URL}/simulate", json=payload)
    print(f"[*] Simulation result: {res.json()}")

def block_ip(ip: str, ttl: int, reason: str):
    payload = {"ip_cidr": ip, "ttl_seconds": ttl, "action": "DROP", "reason": reason}
    res = requests.post(f"{AEGIS_API_URL}/firewall/rules", json=payload)
    print(f"[+] Firewall update: {res.json()}")

def main():
    parser = argparse.ArgumentParser(description="Aegis Linux IDS/IPS Operator CLI")
    subparsers = parser.add_subparsers(dest="subcommand")

    # Status
    subparsers.add_parser("status", help="Get Aegis engine status")

    # Simulate
    sim_p = subparsers.add_parser("simulate", help="Simulate attack vector")
    sim_p.add_argument("--vector", required=True, choices=["PORT_SCAN", "SSH_BRUTE_FORCE", "HTTP_ANOMALY", "NETWORK_FLOOD"])

    # Block
    block_p = subparsers.add_parser("block", help="Block IP address")
    block_p.add_argument("ip", help="IP address to drop")
    block_p.add_argument("--ttl", type=int, default=900, help="TTL seconds")
    block_p.add_argument("--reason", default="Manual CLI block", help="Audit reason")

    args = parser.parse_args()

    if args.subcommand == "status":
        get_status()
    elif args.subcommand == "simulate":
        simulate(args.vector)
    elif args.subcommand == "block":
        block_ip(args.ip, args.ttl, args.reason)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
`;

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-4">
      {/* Header and Subtab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-cyan-400" />
          <h2 className="font-tactical text-sm font-bold tracking-wider text-slate-200 uppercase">
            OPERATOR CLI TOOL (BACKEND/CLI.PY)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono-code">
            <button
              onClick={() => setActiveSubTab('terminal')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeSubTab === 'terminal' ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              Interactive Terminal
            </button>
            <button
              onClick={() => setActiveSubTab('python_source')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeSubTab === 'python_source' ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              backend/cli.py Source
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'terminal' ? (
        <div className="space-y-3">
          {/* Quick Command Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-code">
            <span className="text-slate-500">PRESETS:</span>
            {[
              'aegis status',
              'aegis simulate --vector PORT_SCAN',
              'aegis simulate --vector SSH_BRUTE_FORCE',
              'aegis mode ENFORCEMENT',
              'aegis block 198.51.100.99 --ttl 600',
              'aegis block 127.0.0.1 (safeguard test)',
              'aegis rules list',
              'aegis incidents list',
            ].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setCommand(preset.replace(' (safeguard test)', ''));
                  inputRef.current?.focus();
                }}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-800 cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Terminal Console View */}
          <div 
            onClick={() => inputRef.current?.focus()}
            className="bg-black border border-slate-850 rounded-lg p-3 font-mono-code text-xs text-slate-200 h-[380px] overflow-y-auto cursor-text scrollbar-thin"
          >
            <div className="space-y-1">
              {lines.map((ln) => (
                <div key={ln.id} className="whitespace-pre-wrap leading-relaxed">
                  {ln.type === 'input' && (
                    <span className="text-cyan-400 font-bold">{ln.text}</span>
                  )}
                  {ln.type === 'output' && (
                    <span className="text-slate-300">{ln.text}</span>
                  )}
                  {ln.type === 'success' && (
                    <span className="text-emerald-400 font-semibold">{ln.text}</span>
                  )}
                  {ln.type === 'error' && (
                    <span className="text-red-400 font-semibold">{ln.text}</span>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Command Input Bar */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-black border border-slate-800 rounded font-mono-code text-xs focus-within:border-cyan-500">
              <span className="text-cyan-400 select-none">operator@aegis-soc:~$</span>
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="type aegis command (e.g. aegis status, aegis simulate --vector SSH_BRUTE_FORCE)..."
                className="flex-1 bg-transparent text-slate-100 placeholder:text-slate-600 focus:outline-none"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-tactical font-bold text-xs tracking-wider rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span>RUN</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono-code">
              Local operator python client: <span className="text-cyan-400">backend/cli.py</span>
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(pythonCliSource);
                setCopiedPython(true);
                setTimeout(() => setCopiedPython(false), 2000);
              }}
              className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 text-xs font-mono-code cursor-pointer"
            >
              {copiedPython ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPython ? 'Copied' : 'Copy Script'}</span>
            </button>
          </div>

          <pre className="p-4 bg-black border border-slate-850 rounded font-mono-code text-xs text-emerald-400/90 overflow-x-auto max-h-[420px] scrollbar-thin">
            {pythonCliSource}
          </pre>
        </div>
      )}
    </div>
  );
};
