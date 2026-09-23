import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldX, 
  ShieldAlert, 
  Clock, 
  AlertTriangle, 
  Check, 
  Trash2, 
  Plus, 
  Copy, 
  Download, 
  Terminal,
  Code
} from 'lucide-react';
import { FirewallRule, FirewallAction } from '../types/aegis';
import { validateIpOrCidr, IpValidationResult } from '../utils/ipValidator';

interface NetworkControlProps {
  rules: FirewallRule[];
  onAddRule: (
    ipCidr: string, 
    action: FirewallAction, 
    ttlSeconds: number, 
    reason: string,
    comment?: string,
    overrideSafeguard?: boolean
  ) => { success: boolean; error?: string };
  onRemoveRule: (id: string) => void;
  presetTargetIp?: string | null;
}

export const NetworkControl: React.FC<NetworkControlProps> = ({
  rules,
  onAddRule,
  onRemoveRule,
  presetTargetIp,
}) => {
  const [targetIp, setTargetIp] = useState(presetTargetIp || '');
  const [action, setAction] = useState<FirewallAction>('DROP');
  const [ttlSeconds, setTtlSeconds] = useState<number>(900); // default 15 min
  const [reason, setReason] = useState('Manual SOC operator intervention');
  const [overrideSafeguard, setOverrideSafeguard] = useState(false);
  const [validation, setValidation] = useState<IpValidationResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [syntaxView, setSyntaxView] = useState<'nftables' | 'iptables'>('nftables');
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync presetTargetIp if passed
  useEffect(() => {
    if (presetTargetIp) {
      setTargetIp(presetTargetIp);
      setValidation(validateIpOrCidr(presetTargetIp));
    }
  }, [presetTargetIp]);

  // Validate on change
  const handleIpChange = (val: string) => {
    setTargetIp(val);
    setFormError(null);
    if (val.trim()) {
      setValidation(validateIpOrCidr(val));
    } else {
      setValidation(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const result = onAddRule(
      targetIp, 
      action, 
      ttlSeconds, 
      reason, 
      undefined, 
      overrideSafeguard
    );

    if (!result.success) {
      setFormError(result.error || 'Failed to apply rule');
    } else {
      setTargetIp('');
      setValidation(null);
      setOverrideSafeguard(false);
    }
  };

  // Format remaining time
  const formatRemaining = (expiresAt: number | null) => {
    if (!expiresAt) return 'Permanent (No TTL)';
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) return 'Expiring...';
    const totalSecs = Math.floor(remainingMs / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    if (m > 60) {
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}m`;
    }
    return `${m}m ${s}s`;
  };

  // Generate nftables syntax
  const generateNftablesConfig = () => {
    const drops = rules.filter(r => r.action === 'DROP');
    const allows = rules.filter(r => r.action === 'ALLOW');

    return `# Aegis-Linux IDS/IPS Active Ruleset Preview
# Generated automatically by Aegis Control Engine

table inet aegis_filter {
  # Dynamic Quarantine Blacklist Set (with TTL expiration support)
  set aegis_blacklist {
    type ipv4_addr
    flags timeout
    elements = {
${drops.map(r => `      ${r.ipCidr}${r.expiresAt ? ` timeout ${Math.max(1, Math.floor((r.expiresAt - Date.now()) / 1000))}s` : ''} # Hits: ${r.hits}`).join(',\n')}
    }
  }

  # Whitelist Gateway Set
  set aegis_whitelist {
    type ipv4_addr
    elements = {
${allows.map(r => `      ${r.ipCidr} # ${r.reason}`).join(',\n')}
    }
  }

  chain aegis_input {
    type filter hook input priority 0; policy accept;
    
    # 1. Allow established & loopback
    iif "lo" accept
    ct state established,related accept
    
    # 2. Whitelist bypass
    ip saddr @aegis_whitelist accept
    
    # 3. Drop active quarantine entries
    ip saddr @aegis_blacklist counter drop
  }
}`;
  };

  // Generate iptables syntax
  const generateIptablesConfig = () => {
    return `# Aegis-Linux iptables Rule Chains
iptables -N AEGIS_INPUT
iptables -F AEGIS_INPUT

# Default policy routing
iptables -A INPUT -j AEGIS_INPUT

# Loopback protection
iptables -A AEGIS_INPUT -i lo -j ACCEPT
iptables -A AEGIS_INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

${rules.map(r => {
  if (r.action === 'ALLOW') {
    return `iptables -A AEGIS_INPUT -s ${r.ipCidr} -j ACCEPT -m comment --comment "${r.reason}"`;
  }
  return `iptables -A AEGIS_INPUT -s ${r.ipCidr} -j DROP -m comment --comment "Aegis-TTL-${r.ttlSeconds}s hits=${r.hits}"`;
}).join('\n')}
`;
  };

  const copyConfig = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h2 className="font-tactical text-sm font-bold tracking-wider text-slate-200 uppercase">
              NETWORK CONTROL &amp; FIREWALL RULES (NFTABLES / IPTABLES)
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono-code mt-0.5">
            Configure IP/CIDR blocklists, enforce TTL expiration, and inspect active rule group syntax.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono-code">
          <span className="text-slate-400">ACTIVE RULES:</span>
          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-bold">
            {rules.length} ENTRIES
          </span>
        </div>
      </div>

      {/* Add Rule Form & Safeguard Check */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
        <h3 className="text-xs font-tactical font-bold tracking-wider text-slate-200 uppercase mb-3 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span>PROVISION FIREWALL MITIGATION RULE</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs font-mono-code">
            {/* IP / CIDR Input */}
            <div className="sm:col-span-4">
              <label className="block text-slate-400 mb-1">TARGET IP OR CIDR</label>
              <input
                type="text"
                placeholder="e.g. 198.51.100.42 or 203.0.113.0/24"
                value={targetIp}
                onChange={(e) => handleIpChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono-code"
                required
              />
            </div>

            {/* Action */}
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1">ACTION</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as FirewallAction)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="DROP">DROP</option>
                <option value="REJECT">REJECT (RST)</option>
                <option value="ALLOW">ALLOW (WHITELIST)</option>
              </select>
            </div>

            {/* TTL Selector */}
            <div className="sm:col-span-3">
              <label className="block text-slate-400 mb-1">TTL (AUTO-EXPIRATION)</label>
              <select
                value={ttlSeconds}
                onChange={(e) => setTtlSeconds(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value={300}>5 Minutes (300s)</option>
                <option value={900}>15 Minutes (900s - Default)</option>
                <option value={3600}>1 Hour (3,600s)</option>
                <option value={86400}>24 Hours (86,400s)</option>
                <option value={0}>Permanent (No Expiration)</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-3 flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-tactical font-bold text-xs tracking-wider rounded transition-colors cursor-pointer"
              >
                COMMIT RULE
              </button>
            </div>
          </div>

          {/* Reason Input */}
          <div className="text-xs font-mono-code">
            <label className="block text-slate-400 mb-1">REASON / AUDIT COMMENT</label>
            <input
              type="text"
              placeholder="e.g. Automated triage for incident INC-2026-042"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Safeguard Warning Interlock */}
          {validation?.isSafeguarded && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/60 rounded text-xs font-mono-code text-amber-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold tracking-wide uppercase">
                    AEGIS INPUT SAFEGUARD TRIGGERED:
                  </span>
                  <p className="mt-0.5 text-amber-200/90 leading-relaxed">
                    {validation.safeguardMessage}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-amber-900/50">
                <input
                  type="checkbox"
                  id="overrideSafeguardCheck"
                  checked={overrideSafeguard}
                  onChange={(e) => setOverrideSafeguard(e.target.checked)}
                  className="rounded border-amber-500 text-amber-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="overrideSafeguardCheck" className="text-amber-300 font-semibold cursor-pointer">
                  Acknowledge risks &amp; override Aegis safeguard interlock
                </label>
              </div>
            </div>
          )}

          {/* Form Error */}
          {formError && (
            <div className="p-2.5 bg-red-950/60 border border-red-500/60 rounded text-xs font-mono-code text-red-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
        </form>
      </div>

      {/* Active Rules Table */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-tactical font-bold tracking-wider text-slate-200 uppercase">
            ACTIVE FIREWALL CHAINS
          </h3>
          <span className="text-[11px] font-mono-code text-slate-500">
            AUTO-EXPIRING TTL ACTIVE
          </span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-2 px-3">RULE ID</th>
                <th className="py-2 px-3">TARGET IP/CIDR</th>
                <th className="py-2 px-3">ACTION</th>
                <th className="py-2 px-3">CHAIN</th>
                <th className="py-2 px-3">TTL REMAINING</th>
                <th className="py-2 px-3">HITS (DROPPED)</th>
                <th className="py-2 px-3">REASON</th>
                <th className="py-2 px-3 text-right">UNBLOCK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No active firewall rules provisioned.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-300">{rule.id}</td>
                    <td className="py-2.5 px-3 font-bold text-cyan-400">{rule.ipCidr}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                        rule.action === 'DROP'
                          ? 'bg-red-950/80 text-red-300 border-red-500/50'
                          : rule.action === 'REJECT'
                          ? 'bg-orange-950/80 text-orange-300 border-orange-500/50'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                      }`}>
                        {rule.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{rule.chain}</td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {formatRemaining(rule.expiresAt)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-200">
                      {rule.hits.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate" title={rule.reason}>
                      {rule.reason}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onRemoveRule(rule.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors cursor-pointer"
                        title="Delete Rule / Unblock"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Rule Groups: Syntax Preview */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-tactical font-bold tracking-wider text-slate-200 uppercase">
              ACTIVE RULE GROUPS SYNTAX PREVIEW
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono-code">
            <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded">
              <button
                onClick={() => setSyntaxView('nftables')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  syntaxView === 'nftables' ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-400'
                }`}
              >
                nftables (.conf)
              </button>
              <button
                onClick={() => setSyntaxView('iptables')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  syntaxView === 'iptables' ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-400'
                }`}
              >
                iptables-legacy
              </button>
            </div>

            <button
              onClick={() => copyConfig(syntaxView === 'nftables' ? generateNftablesConfig() : generateIptablesConfig())}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <pre className="mt-3 p-3 bg-black rounded border border-slate-850 font-mono-code text-xs text-cyan-300/90 overflow-x-auto max-h-64 scrollbar-thin">
          {syntaxView === 'nftables' ? generateNftablesConfig() : generateIptablesConfig()}
        </pre>
      </div>
    </div>
  );
};
