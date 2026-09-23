import React, { useState } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  ExternalLink,
  Shield,
  Clock
} from 'lucide-react';
import { SecurityAlert } from '../types/aegis';

interface AlertSystemProps {
  alerts: SecurityAlert[];
  onAcknowledge: (id: string) => void;
  onAcknowledgeAll: () => void;
  onInspectEvent: (eventId?: string) => void;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({
  alerts,
  onAcknowledge,
  onAcknowledgeAll,
  onInspectEvent,
}) => {
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  const filteredAlerts = filterUnreadOnly ? alerts.filter(a => !a.acknowledged) : alerts;
  const unreadCount = alerts.filter(a => !a.acknowledged).length;

  const getSeverityStyle = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          badge: 'bg-red-950/80 text-red-300 border-red-500/60',
          indicator: 'bg-red-500',
          icon: AlertCircle,
        };
      case 'HIGH':
        return {
          badge: 'bg-orange-950/80 text-orange-300 border-orange-500/60',
          indicator: 'bg-orange-500',
          icon: AlertTriangle,
        };
      case 'MEDIUM':
        return {
          badge: 'bg-amber-950/80 text-amber-300 border-amber-500/60',
          indicator: 'bg-amber-500',
          icon: AlertTriangle,
        };
      default:
        return {
          badge: 'bg-slate-900 text-slate-300 border-slate-700',
          indicator: 'bg-cyan-500',
          icon: Info,
        };
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-4 h-4 text-cyan-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          <h3 className="font-tactical text-xs font-bold tracking-wider text-slate-200 uppercase">
            REAL-TIME ALERT QUEUE
          </h3>
          <span className="text-[10px] font-mono-code px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300">
            {unreadCount} NEW
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
            className={`px-2 py-0.5 text-[11px] font-mono-code rounded border cursor-pointer transition-colors ${
              filterUnreadOnly
                ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {filterUnreadOnly ? 'Unread Only' : 'All Alerts'}
          </button>

          {unreadCount > 0 && (
            <button
              onClick={onAcknowledgeAll}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono-code rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
              title="Mark all as acknowledged"
            >
              <CheckCheck className="w-3 h-3" />
              <span>Ack All</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Stream */}
      <div className="space-y-2 mt-3 max-h-[300px] overflow-y-auto pr-1">
        {filteredAlerts.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono-code text-slate-500">
            No active threat alerts in queue. System operational.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const style = getSeverityStyle(alert.severity);
            const Icon = style.icon;

            return (
              <div
                key={alert.id}
                className={`p-2.5 rounded border transition-all ${
                  alert.acknowledged
                    ? 'bg-slate-900/30 border-slate-900 opacity-60'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${style.indicator}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono-code font-bold px-1.5 py-0.2 rounded border ${style.badge}`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs font-tactical font-semibold text-slate-200">
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono-code text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formatTimestamp(alert.timestamp)}
                        </span>
                        <span>IP: <span className="text-cyan-400">{alert.sourceIp}</span></span>
                        <span>RISK: <span className="text-amber-400">{alert.riskScore}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {alert.eventId && (
                      <button
                        onClick={() => onInspectEvent(alert.eventId)}
                        className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="Forensic Packet Inspection"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!alert.acknowledged && (
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="Acknowledge Alert"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
