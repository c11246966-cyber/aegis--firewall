import React, { useState } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  ShieldAlert, 
  ShieldX, 
  Copy, 
  Check, 
  ExternalLink,
  Ban
} from 'lucide-react';
import { SecurityEvent, SimulationVector } from '../types/aegis';

interface EventTrackerProps {
  events: SecurityEvent[];
  selectedEventId?: string | null;
  onSelectEvent?: (id: string | null) => void;
  onBlockIp: (ip: string, reason: string) => void;
}

export const EventTracker: React.FC<EventTrackerProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  onBlockIp,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [vectorFilter, setVectorFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(selectedEventId || null);
  const [copiedHex, setCopiedHex] = useState(false);

  // Sync prop changes
  React.useEffect(() => {
    if (selectedEventId) {
      setExpandedId(selectedEventId);
    }
  }, [selectedEventId]);

  const filteredEvents = events.filter((evt) => {
    if (vectorFilter !== 'ALL' && evt.vector !== vectorFilter) return false;
    if (actionFilter !== 'ALL' && evt.actionTaken !== actionFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        evt.id.toLowerCase().includes(q) ||
        evt.sourceIp.toLowerCase().includes(q) ||
        evt.signature.toLowerCase().includes(q) ||
        String(evt.destPort).includes(q)
      );
    }
    return true;
  });

  const getActionBadge = (action: SecurityEvent['actionTaken']) => {
    switch (action) {
      case 'BLOCKED':
        return 'bg-red-950/80 text-red-300 border-red-500/50';
      case 'ALERTED':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/50';
      case 'RATE_LIMITED':
        return 'bg-orange-950/80 text-orange-300 border-orange-500/50';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  const getSeverityColor = (sev: SecurityEvent['severity']) => {
    switch (sev) {
      case 'CRITICAL': return 'text-red-400';
      case 'HIGH': return 'text-orange-400';
      case 'MEDIUM': return 'text-amber-400';
      default: return 'text-cyan-400';
    }
  };

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <h2 className="font-tactical text-sm font-bold tracking-wider text-slate-200 uppercase">
            EVENT TRACKING &amp; PACKET TELEMETRY
          </h2>
          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
            SQLITE RECORD STORE ({events.length} TOTAL)
          </span>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono-code">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter IP, port, signature..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 text-xs w-48"
            />
          </div>

          {/* Vector Selector */}
          <select
            value={vectorFilter}
            onChange={(e) => setVectorFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-cyan-500 text-xs cursor-pointer"
          >
            <option value="ALL">All Vectors</option>
            <option value="PORT_SCAN">Port Scan</option>
            <option value="SSH_BRUTE_FORCE">SSH Brute Force</option>
            <option value="HTTP_ANOMALY">HTTP Anomaly</option>
            <option value="NETWORK_FLOOD">Network Flood</option>
          </select>

          {/* Action Selector */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-cyan-500 text-xs cursor-pointer"
          >
            <option value="ALL">All Actions</option>
            <option value="BLOCKED">Blocked</option>
            <option value="ALERTED">Alerted</option>
            <option value="RATE_LIMITED">Rate Limited</option>
            <option value="LOGGED">Logged</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono-code">
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-400 text-[11px] uppercase tracking-wider">
              <th className="py-2 px-2 w-8"></th>
              <th className="py-2 px-3">TIMESTAMP</th>
              <th className="py-2 px-3">EVENT ID</th>
              <th className="py-2 px-3">SEVERITY</th>
              <th className="py-2 px-3">SOURCE IP</th>
              <th className="py-2 px-3">TARGET</th>
              <th className="py-2 px-3">SIGNATURE / DETAILS</th>
              <th className="py-2 px-3 text-right">ACTION TAKEN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No telemetry events match active filters.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => {
                const isExpanded = expandedId === evt.id;
                const timeStr = new Date(evt.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <React.Fragment key={evt.id}>
                    <tr
                      onClick={() => {
                        const next = isExpanded ? null : evt.id;
                        setExpandedId(next);
                        if (onSelectEvent) onSelectEvent(next);
                      }}
                      className={`hover:bg-slate-900/60 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-slate-900/80' : ''
                      }`}
                    >
                      <td className="py-2 px-2 text-slate-500">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </td>
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{timeStr}</td>
                      <td className="py-2 px-3 font-semibold text-slate-200">{evt.id}</td>
                      <td className="py-2 px-3">
                        <span className={`font-bold ${getSeverityColor(evt.severity)}`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-cyan-400 font-semibold">{evt.sourceIp}</td>
                      <td className="py-2 px-3 text-slate-300">
                        {evt.destIp}:{evt.destPort} <span className="text-slate-500">({evt.protocol})</span>
                      </td>
                      <td className="py-2 px-3 text-slate-300 max-w-xs truncate" title={evt.signature}>
                        {evt.signature}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getActionBadge(evt.actionTaken)}`}>
                          {evt.actionTaken}
                        </span>
                      </td>
                    </tr>

                    {/* Forensic Hex & Protocol Deep Inspection View */}
                    {isExpanded && (
                      <tr className="bg-slate-950/90 border-b border-cyan-900/30">
                        <td colSpan={8} className="p-4">
                          <div className="bg-slate-900/90 border border-cyan-900/40 rounded p-3.5 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-tactical font-bold text-cyan-300 uppercase tracking-wider">
                                  FORENSIC PACKET INSPECTOR // {evt.id}
                                </span>
                                <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 text-slate-300">
                                  VECTOR: {evt.vector}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyHex(evt.rawPacketHex);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] cursor-pointer"
                                >
                                  {copiedHex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedHex ? 'Copied' : 'Copy Hex'}</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onBlockIp(evt.sourceIp, `Firewall block triggered from ${evt.id}: ${evt.signature}`);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/50 text-[11px] cursor-pointer"
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>Block {evt.sourceIp}</span>
                                </button>
                              </div>
                            </div>

                            {/* Payload & Header breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                              <div>
                                <span className="text-slate-500 block mb-1 uppercase font-semibold">DECODED PAYLOAD PREVIEW</span>
                                <div className="p-2.5 bg-black rounded border border-slate-800 text-emerald-400 font-mono-code break-all">
                                  {evt.payloadPreview}
                                </div>
                              </div>

                              <div>
                                <span className="text-slate-500 block mb-1 uppercase font-semibold">RAW PACKET HEX STREAM</span>
                                <div className="p-2.5 bg-black rounded border border-slate-800 text-cyan-400 font-mono-code tracking-widest break-all">
                                  {evt.rawPacketHex}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
