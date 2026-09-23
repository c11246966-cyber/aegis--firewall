import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  Clock, 
  User, 
  FileText, 
  Send, 
  Ban, 
  ShieldCheck, 
  Filter,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { SecurityIncident, IncidentStatus } from '../types/aegis';

interface IncidentManagementProps {
  incidents: SecurityIncident[];
  onUpdateStatus: (id: string, status: IncidentStatus, note?: string) => void;
  onBlockIp: (ip: string, reason: string) => void;
}

export const IncidentManagement: React.FC<IncidentManagementProps> = ({
  incidents,
  onUpdateStatus,
  onBlockIp,
}) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(incidents[0]?.id || null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [newNote, setNewNote] = useState('');
  const [operatorName, setOperatorName] = useState('SOC-Analyst-01');

  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    return true;
  });

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || filteredIncidents[0];

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-red-950/80 text-red-300 border-red-500/50';
      case 'INVESTIGATING':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/50';
      case 'MITIGATED':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50';
      case 'RESOLVED':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50';
      case 'FALSE_POSITIVE':
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim() || !selectedIncident) return;
    onUpdateStatus(selectedIncident.id, selectedIncident.status, newNote.trim());
    setNewNote('');
  };

  const handleStatusChange = (newStatus: IncidentStatus) => {
    if (!selectedIncident) return;
    onUpdateStatus(selectedIncident.id, newStatus, `Status transitioned to ${newStatus} by ${operatorName}`);
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="font-tactical text-sm font-bold tracking-wider text-slate-200 uppercase">
              SECURITY INCIDENT MANAGEMENT &amp; TRIAGE
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono-code mt-0.5">
            Track, investigate, mitigate, and resolve detected security anomalies with full audit logging.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono-code overflow-x-auto">
          {['ALL', 'OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Split Grid: Incident List & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Incident Selector List */}
        <div className="lg:col-span-5 space-y-2 max-h-[560px] overflow-y-auto pr-1">
          {filteredIncidents.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono-code text-slate-500">
              No security incidents found for status: {statusFilter}.
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-3 rounded border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/70 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-mono-code text-xs font-bold text-slate-200">
                      {inc.id}
                    </div>
                    <span className={`text-[10px] font-mono-code font-bold px-2 py-0.2 rounded border ${getStatusBadge(inc.status)}`}>
                      {inc.status}
                    </span>
                  </div>

                  <div className="text-xs font-tactical font-semibold text-slate-200 mt-1 line-clamp-1">
                    {inc.title}
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px] font-mono-code text-slate-400">
                    <span>IP: <span className="text-cyan-400">{inc.sourceIp}</span></span>
                    <span className="text-amber-400">RISK {inc.riskScore}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Incident Detail & Triage Console */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          {selectedIncident ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-code text-xs font-bold text-cyan-400">{selectedIncident.id}</span>
                    <span className={`text-[10px] font-mono-code font-bold px-2 py-0.2 rounded border ${getStatusBadge(selectedIncident.status)}`}>
                      {selectedIncident.status}
                    </span>
                  </div>
                  <h3 className="font-tactical text-base font-bold text-slate-100 mt-1">
                    {selectedIncident.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs font-mono-code text-slate-400">
                    <span>VECTOR: <span className="text-slate-200">{selectedIncident.vector}</span></span>
                    <span>ATTACKER: <span className="text-cyan-400 font-semibold">{selectedIncident.sourceIp}</span></span>
                  </div>
                </div>

                {/* Quick Mitigation Button */}
                <button
                  onClick={() => onBlockIp(selectedIncident.sourceIp, `Triage mitigation for ${selectedIncident.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/50 text-xs font-tactical font-bold tracking-wider cursor-pointer self-start"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>APPLY TTL BLOCK</span>
                </button>
              </div>

              {/* Triage Status Transition Bar */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-[11px] font-mono-code text-slate-400 block mb-1.5 uppercase font-semibold">
                  TRANSITION TRIAGE STATUS:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED', 'FALSE_POSITIVE'] as IncidentStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      disabled={selectedIncident.status === st}
                      className={`px-2.5 py-1 rounded text-xs font-tactical tracking-wider border cursor-pointer transition-all disabled:opacity-40 ${
                        selectedIncident.status === st
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audit Timeline */}
              <div>
                <span className="text-[11px] font-mono-code text-slate-400 block mb-2 uppercase font-semibold">
                  INVESTIGATION AUDIT TIMELINE
                </span>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedIncident.timeline.map((item) => (
                    <div key={item.id} className="p-2.5 bg-slate-950/80 rounded border border-slate-850 text-xs font-mono-code">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-cyan-300">{item.action}</span>
                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-slate-300 mt-1">{item.note}</div>
                      <div className="text-[10px] text-slate-500 mt-1">BY: {item.user}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Note Bar */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Append forensic analyst note to timeline..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono-code"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded text-xs font-tactical font-bold tracking-wider cursor-pointer disabled:opacity-40"
                  >
                    ADD NOTE
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 font-mono-code text-xs">
              Select an incident to view forensic timeline and triage controls.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
