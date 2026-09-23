import React from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Radio, 
  Volume2, 
  VolumeX, 
  Cpu, 
  Terminal, 
  Code2, 
  Flame, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { OperatingMode, SystemStatus, RiskReport } from '../types/aegis';

interface SocHeaderProps {
  status: SystemStatus;
  risk: RiskReport;
  onSelectMode: (mode: OperatingMode) => void;
  onToggleSound: () => void;
  onOpenSafetyModal: () => void;
  onResetData: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const SocHeader: React.FC<SocHeaderProps> = ({
  status,
  risk,
  onSelectMode,
  onToggleSound,
  onOpenSafetyModal,
  onResetData,
  activeTab,
  onSelectTab,
}) => {
  const modes: { id: OperatingMode; label: string; desc: string; color: string }[] = [
    { id: 'MONITOR', label: 'MONITOR', desc: 'Passive Observe', color: 'border-cyan-500/50 text-cyan-400' },
    { id: 'SIMULATION', label: 'SIMULATION', desc: 'Safe Testing (Default)', color: 'border-amber-500/50 text-amber-400' },
    { id: 'ENFORCEMENT', label: 'ENFORCEMENT', desc: 'Active Auto-Block', color: 'border-red-500/50 text-red-400' },
  ];

  const tabs = [
    { id: 'dashboard', label: 'SOC DASHBOARD', icon: ShieldAlert },
    { id: 'incidents', label: 'INCIDENTS', icon: AlertTriangle, badge: status.openIncidentsCount },
    { id: 'firewall', label: 'FIREWALL & RULES', icon: ShieldCheck, badge: status.activeBlocksCount },
    { id: 'cli', label: 'CLI TERMINAL', icon: Terminal },
    { id: 'api', label: 'REST API', icon: Code2 },
  ];

  return (
    <header className="border-b border-cyan-900/40 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Threat & Status Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 relative" />
            </div>
            <span className="font-mono-code font-bold tracking-wider text-slate-300">AEGIS-ENGINE</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-mono-code">NODE: <span className="text-cyan-400">aegis-linux-gateway-01</span></span>
          </div>

          <button
            onClick={onOpenSafetyModal}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
            title="Safe Simulation Boundaries"
          >
            <AlertTriangle className="w-3 h-3" />
            <span className="font-tactical font-semibold tracking-wider">SAFE MODE ACTIVE</span>
          </button>
        </div>

        {/* Dynamic Telemetry Metrics */}
        <div className="flex items-center gap-5 font-mono-code">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-slate-400">INGRESS:</span>
            <span className="text-cyan-300 font-bold">{status.trafficPps.toLocaleString()} pps</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">BANDWIDTH:</span>
            <span className="text-emerald-300 font-bold">{status.bandwidthMbps} Mbps</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" style={{ color: risk.threatColor }} />
            <span className="text-slate-400">THREAT:</span>
            <span className="font-bold" style={{ color: risk.threatColor }}>
              {risk.threatLevel.split(' ')[0]} ({risk.currentScore}/100)
            </span>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <button
              onClick={onToggleSound}
              className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
              title={status.soundEnabled ? 'Mute Tactical Audio' : 'Enable Tactical Audio'}
              aria-label="Toggle sound"
            >
              {status.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onResetData}
              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-900 transition-colors"
              title="Reset Simulation State to Defaults"
              aria-label="Reset simulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Brand & Mode Selector Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-cyan-500/40 bg-gradient-to-br from-cyan-950/80 to-slate-950 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-tactical text-xl font-bold tracking-wider text-slate-100">
                AEGIS<span className="text-cyan-400">-LINUX</span> <span className="text-xs px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400 font-mono-code font-normal">IDS / IPS</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-mono-code">
              Tactical Threat Detection &amp; Automated Network Mitigation System
            </p>
          </div>
        </div>

        {/* Operating Modes Segmented Control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono-code uppercase tracking-wider hidden lg:inline">
            OPERATING MODE:
          </span>
          <div className="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-lg">
            {modes.map((m) => {
              const isActive = status.mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => onSelectMode(m.id)}
                  className={`px-3 py-1.5 text-xs font-tactical font-semibold tracking-wider rounded transition-all duration-150 ${
                    isActive
                      ? m.id === 'ENFORCEMENT'
                        ? 'bg-red-950/80 text-red-300 border border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                        : m.id === 'SIMULATION'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                        : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-current animate-pulse' : 'bg-slate-600'}`} />
                    <span>{m.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-slate-900/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-tactical tracking-wider border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className="font-mono-code px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-cyan-300 border border-cyan-800/40">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
