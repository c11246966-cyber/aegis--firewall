import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  Terminal, 
  Lock, 
  Bell, 
  Network,
  Cpu
} from 'lucide-react';

interface SafetyBannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({ isOpen, onClose }) => {
  const [collapsed, setCollapsed] = useState(false);

  const limitations = [
    { title: 'NO live packet capture', desc: 'Runs on simulated socket events, not probing physical network NIC interfaces.' },
    { title: 'NO real firewall mutations', desc: 'Kernel nftables / iptables rules are safely modeled without host disruption.' },
    { title: 'NO threat-feed import', desc: 'Threat signatures are locally evaluated test vectors, not third-party feeds.' },
    { title: 'NO DNS monitoring', desc: 'DNS queries and recursive resolver caches are not inspected in this MVP.' },
    { title: 'NO external alerting', desc: 'Zero outbound SMS, Email, or Slack alerts dispatched to prevent test spam.' },
    { title: 'NO authentication', desc: 'Public tactical demonstration mode with local storage persistence.' },
  ];

  const nextSteps = [
    {
      title: '1. User Authentication & RBAC',
      desc: 'Implement Emergent Auth or OAuth2 with JWT session verification to restrict rule-modifying privileges.',
      icon: Lock,
      status: 'Ready to integrate',
    },
    {
      title: '2. Live eBPF / AF_PACKET Ingress Driver',
      desc: 'Deploy high-performance eBPF (XDP) kernel probes for line-rate zero-copy raw packet inspection.',
      icon: Network,
      status: 'Kernel Module Blueprint',
    },
    {
      title: '3. Production nftables & Netfilter Driver',
      desc: 'Hook libnftables via CGo / Python bindings to commit dynamic set elements with native timeout flags.',
      icon: Cpu,
      status: 'nftables Schema ready',
    },
    {
      title: '4. Threat Intelligence Ingestion',
      desc: 'Connect real-time feeds from AbuseIPDB, AlienVault OTX, and CISA Known Exploited Vulnerabilities (KEV).',
      icon: ShieldAlert,
      status: 'REST connector ready',
    },
    {
      title: '5. Multi-Channel External Alerting',
      desc: 'Dispatch incident webhooks with HMAC signatures to Slack SOC channels, PagerDuty, and SIEM syslogs.',
      icon: Bell,
      status: 'Webhook format ready',
    },
  ];

  return (
    <>
      {/* Top Notification Strip */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border-b border-amber-500/30 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="font-semibold font-tactical tracking-wide">
              SAFE MODE SIMULATION ENVIRONMENT:
            </span>
            <span className="text-amber-200/80 hidden md:inline">
              Host network protected. Zero live packet sniffing or kernel firewall disruptions.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-amber-300 hover:text-amber-100 underline decoration-amber-500/60 font-mono-code text-[11px] cursor-pointer"
            >
              [View Safety Boundaries &amp; Roadmap]
            </button>
          </div>
        </div>
      </div>

      {/* Deep Modal for Boundaries & Next Steps */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-950 border border-cyan-800/60 rounded-lg shadow-2xl p-6 text-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/40 rounded text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-tactical text-lg font-bold text-slate-100 tracking-wider">
                    AEGIS SAFETY BOUNDARIES &amp; PRODUCTION ROADMAP
                  </h3>
                  <p className="text-xs text-slate-400 font-mono-code">
                    MVP Demonstration Environment Safeguards (SAFE MODE)
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Safe Mode Boundaries */}
            <div className="mt-5">
              <h4 className="text-xs font-tactical font-semibold tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                <span>Active Safety Interlocks</span>
                <span className="text-slate-500 font-normal">· Tested &amp; Isolated</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2.5">
                {limitations.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-900/80 border border-slate-800 rounded flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-slate-200 font-mono-code">{item.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps to Consider */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <h4 className="text-xs font-tactical font-semibold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
                <span>Next Steps to Consider for Production Deployment</span>
              </h4>
              <div className="space-y-2 mt-3">
                {nextSteps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/40 border border-cyan-900/30 rounded flex items-start gap-3 hover:border-cyan-700/50 transition-colors"
                    >
                      <div className="p-1.5 bg-cyan-950/60 rounded border border-cyan-800/40 text-cyan-300">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 font-mono-code">{step.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-cyan-400 rounded font-mono-code">
                            {step.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-tactical font-bold text-xs tracking-wider rounded transition-colors"
              >
                ACKNOWLEDGE &amp; RETURN TO SOC
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
