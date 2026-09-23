import React from 'react';
import { 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  ShieldCheck, 
  Zap,
  Activity
} from 'lucide-react';
import { RiskReport, OperatingMode } from '../types/aegis';

interface RiskGaugeProps {
  risk: RiskReport;
  mode: OperatingMode;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ risk, mode }) => {
  // SVG circular gauge math
  const size = 150;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Arc angle ~ 240 degrees
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (risk.currentScore / 100) * arcLength;

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="font-tactical text-xs font-bold tracking-wider text-slate-200 uppercase">
            AUTOMATED RISK ENGINE
          </h3>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono-code text-slate-400">
          <span>TREND:</span>
          {risk.recentTrend === 'UP' ? (
            <span className="text-red-400 flex items-center font-bold">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> SPIKING
            </span>
          ) : risk.recentTrend === 'DOWN' ? (
            <span className="text-emerald-400 flex items-center font-bold">
              <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> DECLINING
            </span>
          ) : (
            <span className="text-cyan-400 flex items-center font-bold">
              <Minus className="w-3.5 h-3.5 mr-0.5" /> STABLE
            </span>
          )}
        </div>
      </div>

      {/* Main Gauge and DEFCON Level */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-3">
        {/* Radial Dial */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-135">
              {/* Background Arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#1e293b"
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeLinecap="round"
              />
              {/* Dynamic Value Arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={risk.threatColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Score in Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-tactical text-3xl font-bold tracking-tight text-slate-100">
                {risk.currentScore}
              </span>
              <span className="font-mono-code text-[10px] text-slate-400 uppercase">
                / 100 RISK
              </span>
            </div>
          </div>

          <div 
            className="mt-1 font-tactical font-bold text-xs tracking-wider px-2 py-0.5 rounded border"
            style={{ 
              color: risk.threatColor, 
              borderColor: `${risk.threatColor}40`,
              backgroundColor: `${risk.threatColor}15`
            }}
          >
            {risk.threatLevel}
          </div>
        </div>

        {/* Vector Breakdown Progress Bars */}
        <div className="sm:col-span-7 space-y-2.5">
          <div className="text-[11px] font-mono-code text-slate-400 flex items-center justify-between pb-1 border-b border-slate-800">
            <span>THREAT VECTORS</span>
            <span>EXPOSURE</span>
          </div>

          {/* Port Scan */}
          <div>
            <div className="flex justify-between text-[11px] font-mono-code mb-1">
              <span className="text-slate-300">Port Reconnaissance</span>
              <span className="text-amber-400">{risk.vectorBreakdown.portScan}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${risk.vectorBreakdown.portScan}%` }}
              />
            </div>
          </div>

          {/* SSH Brute Force */}
          <div>
            <div className="flex justify-between text-[11px] font-mono-code mb-1">
              <span className="text-slate-300">SSH Credential Guessing</span>
              <span className="text-orange-400">{risk.vectorBreakdown.sshBruteForce}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${risk.vectorBreakdown.sshBruteForce}%` }}
              />
            </div>
          </div>

          {/* HTTP Anomaly */}
          <div>
            <div className="flex justify-between text-[11px] font-mono-code mb-1">
              <span className="text-slate-300">Web App Payload Injections</span>
              <span className="text-red-400">{risk.vectorBreakdown.httpAnomaly}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-red-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${risk.vectorBreakdown.httpAnomaly}%` }}
              />
            </div>
          </div>

          {/* Volumetric Flood */}
          <div>
            <div className="flex justify-between text-[11px] font-mono-code mb-1">
              <span className="text-slate-300">Volumetric Packet Flooding</span>
              <span className="text-purple-400">{risk.vectorBreakdown.networkFlood}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${risk.vectorBreakdown.networkFlood}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Indicators */}
      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-center text-xs font-mono-code">
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <div className="text-slate-400 text-[10px]">ACTIVE UNRESOLVED</div>
          <div className="font-bold text-amber-400 mt-0.5">{risk.activeThreatsCount} Incidents</div>
        </div>
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <div className="text-slate-400 text-[10px]">DROPPED BY FIREWALL</div>
          <div className="font-bold text-cyan-400 mt-0.5">{risk.blockedAttemptsCount.toLocaleString()} Pkts</div>
        </div>
      </div>
    </div>
  );
};
