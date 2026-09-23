import React, { useState } from 'react';
import { 
  Code2, 
  Send, 
  Copy, 
  Check, 
  Database, 
  ShieldCheck, 
  Play, 
  Cpu,
  CornerDownRight,
  FileCode
} from 'lucide-react';
import { aegisStore } from '../services/aegisStore';
import { SimulationVector, OperatingMode, IncidentStatus } from '../types/aegis';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  requestBodySample?: object;
  curlExample: string;
  handler: (body?: unknown) => Promise<unknown> | unknown;
}

export const ApiExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'fastapi_code'>('endpoints');
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState(0);
  const [customBody, setCustomBody] = useState<string>('');
  const [responseOutput, setResponseOutput] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const endpoints: ApiEndpoint[] = [
    {
      method: 'GET',
      path: '/api/v1/system/status',
      summary: 'Get Aegis system status & telemetry',
      description: 'Returns current operating mode (MONITOR/SIMULATION/ENFORCEMENT), packet rates, and active counters.',
      curlExample: 'curl -X GET "http://127.0.0.1:8000/api/v1/system/status"',
      handler: () => aegisStore.getSystemStatus(),
    },
    {
      method: 'GET',
      path: '/api/v1/risk/report',
      summary: 'Calculate dynamic threat & DEFCON score',
      description: 'Evaluates recent threat velocity, active incidents, and mitigation state to generate 0-100 score.',
      curlExample: 'curl -X GET "http://127.0.0.1:8000/api/v1/risk/report"',
      handler: () => aegisStore.getRiskReport(),
    },
    {
      method: 'GET',
      path: '/api/v1/events',
      summary: 'Query security events from SQLite store',
      description: 'Retrieves security event logs with source IP, signature, severity, and raw hex dump.',
      curlExample: 'curl -X GET "http://127.0.0.1:8000/api/v1/events?limit=10"',
      handler: () => aegisStore.getEvents().slice(0, 10),
    },
    {
      method: 'POST',
      path: '/api/v1/simulate',
      summary: 'Trigger safe attack simulation vector',
      description: 'Injects test packets for PORT_SCAN, SSH_BRUTE_FORCE, HTTP_ANOMALY, or NETWORK_FLOOD.',
      requestBodySample: {
        vector: 'SSH_BRUTE_FORCE',
      },
      curlExample: 'curl -X POST "http://127.0.0.1:8000/api/v1/simulate" -H "Content-Type: application/json" -d \'{"vector":"SSH_BRUTE_FORCE"}\'',
      handler: async (body: unknown) => {
        const b = body as { vector?: SimulationVector };
        const vec = b?.vector || 'PORT_SCAN';
        return await aegisStore.simulateVector(vec);
      },
    },
    {
      method: 'GET',
      path: '/api/v1/incidents',
      summary: 'List active security incidents',
      description: 'Fetches incident records with status, assignee, risk score, and audit timeline.',
      curlExample: 'curl -X GET "http://127.0.0.1:8000/api/v1/incidents"',
      handler: () => aegisStore.getIncidents(),
    },
    {
      method: 'POST',
      path: '/api/v1/firewall/rules',
      summary: 'Add IP/CIDR firewall rule with TTL',
      description: 'Applies DROP or ALLOW rule with input safeguard checking against loopback and RFC 1918 space.',
      requestBodySample: {
        ip_cidr: '198.51.100.88',
        action: 'DROP',
        ttl_seconds: 900,
        reason: 'Automated REST API mitigation',
      },
      curlExample: 'curl -X POST "http://127.0.0.1:8000/api/v1/firewall/rules" -H "Content-Type: application/json" -d \'{"ip_cidr":"198.51.100.88","action":"DROP","ttl_seconds":900,"reason":"REST block"}\'',
      handler: (body: unknown) => {
        const b = body as { ip_cidr?: string; action?: string; ttl_seconds?: number; reason?: string };
        return aegisStore.addRule(b?.ip_cidr || '198.51.100.88', 'DROP', b?.ttl_seconds || 900, b?.reason || 'API rule');
      },
    },
    {
      method: 'GET',
      path: '/api/v1/firewall/rules',
      summary: 'List active firewall rules and chains',
      description: 'Returns active rules across aegis_blacklist and aegis_whitelist with hit counters and TTL expiration.',
      curlExample: 'curl -X GET "http://127.0.0.1:8000/api/v1/firewall/rules"',
      handler: () => aegisStore.getRules(),
    },
  ];

  const currentEndpoint = endpoints[selectedEndpointIndex];

  // Initialize custom body when changing endpoint
  React.useEffect(() => {
    if (currentEndpoint.requestBodySample) {
      setCustomBody(JSON.stringify(currentEndpoint.requestBodySample, null, 2));
    } else {
      setCustomBody('');
    }
    setResponseOutput(null);
    setStatusCode(null);
  }, [selectedEndpointIndex]);

  const executeApi = async () => {
    setLoading(true);
    try {
      let parsedBody: unknown = undefined;
      if (customBody.trim()) {
        parsedBody = JSON.parse(customBody);
      }
      const res = await currentEndpoint.handler(parsedBody);
      setStatusCode(200);
      setResponseOutput(JSON.stringify(res, null, 2));
    } catch (err: unknown) {
      setStatusCode(400);
      setResponseOutput(JSON.stringify({ detail: String(err) }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const getMethodBadge = (m: string) => {
    switch (m) {
      case 'GET': return 'bg-cyan-950 text-cyan-400 border-cyan-700/60';
      case 'POST': return 'bg-emerald-950 text-emerald-400 border-emerald-700/60';
      case 'PATCH': return 'bg-amber-950 text-amber-400 border-amber-700/60';
      case 'DELETE': return 'bg-red-950 text-red-400 border-red-700/60';
      default: return 'bg-slate-900 text-slate-300';
    }
  };

  const fastApiSource = `from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
import sqlite3
import time

app = FastAPI(
    title="Aegis-Linux IDS/IPS Engine API",
    description="Tactical RESTful API for intrusion detection, safe simulation vectors, and firewall mitigation.",
    version="1.0.4",
)

class SimulationRequest(BaseModel):
    vector: str = Field(..., description="PORT_SCAN | SSH_BRUTE_FORCE | HTTP_ANOMALY | NETWORK_FLOOD")

class FirewallRuleRequest(BaseModel):
    ip_cidr: str
    action: str = "DROP"
    ttl_seconds: int = 900
    reason: str = "Manual API Rule"

@app.get("/api/v1/system/status")
def get_system_status():
    return {
        "mode": "SIMULATION",
        "safe_mode": True,
        "traffic_pps": 1642,
        "bandwidth_mbps": 14.8,
        "active_blocks": 3,
    }

@app.post("/api/v1/simulate")
def trigger_simulation(req: SimulationRequest):
    # Safe mock simulation logic
    return {
        "status": "success",
        "vector": req.vector,
        "timestamp": int(time.time()),
        "action": "TELEMETRY_LOGGED",
    }

@app.post("/api/v1/firewall/rules")
def create_firewall_rule(rule: FirewallRuleRequest):
    # Safeguard check against RFC1918 / Loopback
    if rule.ip_cidr.startswith("127.") or rule.ip_cidr.startswith("192.168."):
        raise HTTPException(status_code=400, detail="Aegis Safeguard Interlock: Cannot block loopback/RFC1918 addresses.")
    return {"status": "created", "rule_id": "RUL-999", "ip_cidr": rule.ip_cidr, "ttl": rule.ttl_seconds}
`;

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <h2 className="font-tactical text-sm font-bold tracking-wider text-slate-200 uppercase">
            FASTAPI RESTFUL ENDPOINTS EXPLORER
          </h2>
          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
            OPENAPI 3.1 SPEC
          </span>
        </div>

        <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono-code">
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'endpoints' ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-400'
            }`}
          >
            Interactive Tester
          </button>
          <button
            onClick={() => setActiveTab('fastapi_code')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'fastapi_code' ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-400'
            }`}
          >
            backend/main.py Source
          </button>
        </div>
      </div>

      {activeTab === 'endpoints' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Endpoints Sidebar */}
          <div className="lg:col-span-4 space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
            {endpoints.map((ep, idx) => {
              const isSelected = selectedEndpointIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedEndpointIndex(idx)}
                  className={`w-full text-left p-2.5 rounded border font-mono-code text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/80 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                      : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.2 rounded border text-[10px] font-bold ${getMethodBadge(ep.method)}`}>
                      {ep.method}
                    </span>
                    <span className="text-slate-200 truncate font-semibold">{ep.path}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 truncate">
                    {ep.summary}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Test & Console Panel */}
          <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded border text-xs font-mono-code font-bold ${getMethodBadge(currentEndpoint.method)}`}>
                  {currentEndpoint.method}
                </span>
                <span className="font-mono-code text-sm font-bold text-slate-100">
                  {currentEndpoint.path}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono-code mt-1">
                {currentEndpoint.description}
              </p>
            </div>

            {/* Curl Command Bar */}
            <div className="p-2 bg-black rounded border border-slate-800 flex items-center justify-between gap-2 text-xs font-mono-code">
              <span className="text-cyan-400 truncate">{currentEndpoint.curlExample}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentEndpoint.curlExample);
                  setCopiedCurl(true);
                  setTimeout(() => setCopiedCurl(false), 2000);
                }}
                className="shrink-0 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Copy curl"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Request Body Editor if needed */}
            {currentEndpoint.requestBodySample && (
              <div>
                <label className="block text-xs font-mono-code text-slate-400 mb-1 uppercase font-semibold">
                  REQUEST JSON PAYLOAD:
                </label>
                <textarea
                  rows={4}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="w-full p-2.5 bg-black border border-slate-800 rounded text-xs font-mono-code text-emerald-400 focus:outline-none focus:border-cyan-500 scrollbar-thin"
                />
              </div>
            )}

            {/* Execute Button */}
            <div>
              <button
                onClick={executeApi}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-tactical font-bold text-xs tracking-wider rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'EXECUTING...' : 'SEND REQUEST'}</span>
              </button>
            </div>

            {/* Live Response Output */}
            {responseOutput && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono-code">
                  <span className="text-slate-400 uppercase font-semibold">HTTP RESPONSE</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${statusCode === 200 ? 'text-emerald-400 bg-emerald-950/60' : 'text-red-400 bg-red-950/60'}`}>
                    STATUS: {statusCode} OK
                  </span>
                </div>
                <pre className="p-3 bg-black rounded border border-slate-800 font-mono-code text-xs text-slate-200 overflow-x-auto max-h-56 scrollbar-thin">
                  {responseOutput}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono-code">
              FastAPI Implementation Source: <span className="text-cyan-400">backend/main.py</span>
            </span>
          </div>
          <pre className="p-4 bg-black border border-slate-850 rounded font-mono-code text-xs text-emerald-400/90 overflow-x-auto max-h-[460px] scrollbar-thin">
            {fastApiSource}
          </pre>
        </div>
      )}
    </div>
  );
};
