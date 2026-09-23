import React, { useState, useEffect } from 'react';
import { aegisStore } from './services/aegisStore';
import { 
  SecurityEvent, 
  SecurityAlert, 
  SecurityIncident, 
  FirewallRule, 
  RiskReport, 
  SystemStatus, 
  SimulationVector, 
  OperatingMode, 
  IncidentStatus,
  FirewallAction
} from './types/aegis';

import { SocHeader } from './components/SocHeader';
import { SafetyBanner } from './components/SafetyBanner';
import { SimulationDeck } from './components/SimulationDeck';
import { RiskGauge } from './components/RiskGauge';
import { AlertSystem } from './components/AlertSystem';
import { EventTracker } from './components/EventTracker';
import { IncidentManagement } from './components/IncidentManagement';
import { NetworkControl } from './components/NetworkControl';
import { CliTerminal } from './components/CliTerminal';
import { ApiExplorer } from './components/ApiExplorer';

export default function App() {
  const [events, setEvents] = useState<SecurityEvent[]>(aegisStore.getEvents());
  const [alerts, setAlerts] = useState<SecurityAlert[]>(aegisStore.getAlerts());
  const [incidents, setIncidents] = useState<SecurityIncident[]>(aegisStore.getIncidents());
  const [rules, setRules] = useState<FirewallRule[]>(aegisStore.getRules());
  const [status, setStatus] = useState<SystemStatus>(aegisStore.getSystemStatus());
  const [risk, setRisk] = useState<RiskReport>(aegisStore.getRiskReport());

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [presetFirewallIp, setPresetFirewallIp] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Subscribe to reactive store changes
  useEffect(() => {
    const unsubscribe = aegisStore.subscribe(() => {
      setEvents(aegisStore.getEvents());
      setAlerts(aegisStore.getAlerts());
      setIncidents(aegisStore.getIncidents());
      setRules(aegisStore.getRules());
      setStatus(aegisStore.getSystemStatus());
      setRisk(aegisStore.getRiskReport());
    });
    return () => unsubscribe();
  }, []);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleSelectMode = (mode: OperatingMode) => {
    aegisStore.setMode(mode);
    showNotice(`Operating mode switched to: ${mode}`);
  };

  const handleSimulate = async (vector: SimulationVector) => {
    const res = await aegisStore.simulateVector(vector);
    if (status.mode === 'ENFORCEMENT' && res.mitigatedRule) {
      showNotice(`[ENFORCEMENT ACTION] Threat mitigated! Rule ${res.mitigatedRule.id} applied to drop ${res.mitigatedRule.ipCidr}`);
    }
    return res;
  };

  const handleAcknowledgeAlert = (id: string) => {
    aegisStore.acknowledgeAlert(id);
  };

  const handleAcknowledgeAllAlerts = () => {
    aegisStore.acknowledgeAllAlerts();
    showNotice('All active alerts marked as acknowledged.');
  };

  const handleInspectEvent = (eventId?: string) => {
    if (eventId) {
      setSelectedEventId(eventId);
      setActiveTab('dashboard');
      const el = document.getElementById('events-section');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleUpdateIncidentStatus = (id: string, newStatus: IncidentStatus, note?: string) => {
    const ok = aegisStore.updateIncidentStatus(id, newStatus, 'SOC-Analyst', note);
    if (ok) {
      showNotice(`Incident ${id} updated to ${newStatus}`);
    }
  };

  const handleAddRule = (
    ipCidr: string, 
    action: FirewallAction, 
    ttlSeconds: number, 
    reason: string,
    comment?: string,
    overrideSafeguard?: boolean
  ) => {
    const res = aegisStore.addRule(ipCidr, action, ttlSeconds, reason, comment, overrideSafeguard);
    if (res.success) {
      showNotice(`Firewall rule provisioned for ${ipCidr} (Action: ${action}, TTL: ${ttlSeconds}s)`);
    }
    return res;
  };

  const handleRemoveRule = (id: string) => {
    const ok = aegisStore.removeRule(id);
    if (ok) {
      showNotice(`Firewall rule ${id} removed.`);
    }
  };

  const handleBlockIpFromSource = (ip: string, reason: string) => {
    setPresetFirewallIp(ip);
    setActiveTab('firewall');
    showNotice(`Target IP ${ip} populated in Firewall Provisioning form.`);
  };

  const handleResetData = () => {
    if (window.confirm('Reset Aegis simulation state and clear custom rules?')) {
      aegisStore.resetToDefaults();
      showNotice('Aegis simulation state reset to factory baseline.');
    }
  };

  const handleToggleSound = () => {
    const enabled = aegisStore.toggleSound();
    showNotice(enabled ? 'Tactical Audio Enabled' : 'Tactical Audio Muted');
  };

  return (
    <div className="min-h-screen bg-[#06080c] text-slate-100 flex flex-col font-sans tactical-grid">
      {/* Top SOC HUD & Navigation */}
      <SocHeader
        status={status}
        risk={risk}
        onSelectMode={handleSelectMode}
        onToggleSound={handleToggleSound}
        onOpenSafetyModal={() => setSafetyModalOpen(true)}
        onResetData={handleResetData}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Safety Notice & Boundaries Modal */}
      <SafetyBanner
        isOpen={safetyModalOpen}
        onClose={() => setSafetyModalOpen(false)}
      />

      {/* Transient Action Feedback Toast */}
      {actionNotice && (
        <div className="fixed bottom-4 right-4 z-50 p-3 bg-slate-900 border border-cyan-500/70 rounded-lg shadow-2xl text-xs font-mono-code text-cyan-300 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-6">
        {/* TAB 1: SOC DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Simulation Deck: 4 Test Scenarios */}
            <SimulationDeck
              currentMode={status.mode}
              onSimulate={handleSimulate}
            />

            {/* Split Threat Overview & Alert System */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6">
                <RiskGauge
                  risk={risk}
                  mode={status.mode}
                />
              </div>
              <div className="lg:col-span-6">
                <AlertSystem
                  alerts={alerts}
                  onAcknowledge={handleAcknowledgeAlert}
                  onAcknowledgeAll={handleAcknowledgeAllAlerts}
                  onInspectEvent={handleInspectEvent}
                />
              </div>
            </div>

            {/* Live Security Event Tracker & Deep Hex Inspector */}
            <div id="events-section">
              <EventTracker
                events={events}
                selectedEventId={selectedEventId}
                onSelectEvent={setSelectedEventId}
                onBlockIp={handleBlockIpFromSource}
              />
            </div>
          </div>
        )}

        {/* TAB 2: INCIDENTS MANAGEMENT */}
        {activeTab === 'incidents' && (
          <IncidentManagement
            incidents={incidents}
            onUpdateStatus={handleUpdateIncidentStatus}
            onBlockIp={handleBlockIpFromSource}
          />
        )}

        {/* TAB 3: FIREWALL & NETWORK CONTROL */}
        {activeTab === 'firewall' && (
          <NetworkControl
            rules={rules}
            onAddRule={handleAddRule}
            onRemoveRule={handleRemoveRule}
            presetTargetIp={presetFirewallIp}
          />
        )}

        {/* TAB 4: CLI TERMINAL */}
        {activeTab === 'cli' && (
          <CliTerminal
            onSimulate={handleSimulate}
          />
        )}

        {/* TAB 5: REST API / FASTAPI EXPLORER */}
        {activeTab === 'api' && (
          <ApiExplorer />
        )}
      </main>

      {/* Tactical Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-xs text-slate-500 font-mono-code">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>AEGIS-LINUX SOC MVP // PROTOCOL v1.0.4</span>
            <span>·</span>
            <span className="text-amber-400/90">SAFE SIMULATION ENVIRONMENT</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>FastAPI: <span className="text-cyan-400">/api/v1/</span></span>
            <span>CLI: <span className="text-cyan-400">backend/cli.py</span></span>
            <span>Netfilter: <span className="text-cyan-400">nftables/iptables</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
