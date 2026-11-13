import React, { useState, useEffect } from 'react';
import { 
  GitFork, 
  Users, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  Layers,
  ArrowRight,
  ExternalLink,
  Sliders,
  Check
} from 'lucide-react';
import { routingService, handlerService, dashboardService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const RoutingManagementDashboard = () => {
  const navigate = useNavigate();

  const [rules, setRules] = useState([]);
  const [handlers, setHandlers] = useState([]);
  const [queueData, setQueueData] = useState({ queued_reports: [], escalations: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Rule Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    category: 'Cash Dispenser Errors',
    zone: 'North',
    error_code_pattern: 'ERR-CASH-*',
    primary_handler_id: 'HND-01',
    backup_handler_id: 'HND-06',
    notes: 'Custom dedicated dispatch route'
  });

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [rulesData, handlersData, queueRes] = await Promise.all([
        routingService.getRules(),
        handlerService.getAll(),
        dashboardService.getQueue()
      ]);
      setRules(rulesData);
      setHandlers(handlersData);
      setQueueData(queueRes);
    } catch (err) {
      console.error('Failed to load routing data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProcessQueue = async () => {
    try {
      const res = await dashboardService.processQueue();
      alert(`Queue re-evaluated! ${res.dispatched_count} ticket(s) dispatched to eligible technicians.`);
      loadData();
    } catch (err) {
      alert('Failed to process queue');
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    try {
      await routingService.addRule(newRule);
      setAddModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add rule');
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Delete this routing table entry?')) return;
    try {
      await routingService.deleteRule(id);
      loadData();
    } catch (err) {
      alert('Failed to delete rule');
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'High': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Medium': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <GitFork className="w-7 h-7 text-cyan-400" />
            <span>Intelligent Routing & Dispatch Controller</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Explicit routing table configuration, dynamic technician load distribution, and deterministic queue arbitration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh Routing Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Routing Rule</span>
          </button>
        </div>
      </div>

      {/* Fleet Technician Workloads & Capacity Matrix */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span>Technician Fleet Workload & Failover Matrix</span>
            </h2>
            <p className="text-xs text-slate-400">Real-time availability and capacity consumption across all 5 operational zones</p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800/40">
            {handlers.length} Handlers Registered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {handlers.map((h) => {
            const isFull = h.current_load >= h.max_capacity;
            const pct = Math.min(100, (h.current_load / h.max_capacity) * 100);

            return (
              <div 
                key={h.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">{h.id}</span>
                      <span className={`w-2 h-2 rounded-full ${h.is_available ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">
                        {h.is_available ? 'Available' : 'Off Duty'}
                      </span>
                    </div>
                    <div className="font-bold text-white text-sm mt-0.5">{h.name}</div>
                    <div className="text-[11px] text-slate-400">{h.zone} Zone • {h.specialty_category}</div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-white">
                      {h.current_load} / {h.max_capacity}
                    </span>
                    <div className="text-[10px] text-slate-400">Load</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full ${
                        isFull 
                          ? 'bg-rose-500' 
                          : pct >= 75 
                          ? 'bg-amber-400' 
                          : 'bg-cyan-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{pct.toFixed(0)}% Utilized</span>
                    <span>{isFull ? 'Saturated -> Failover' : 'Eligible'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explicit Routing Rules Table */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Explicit Routing Table (Mapping Category + Zone + Error Code)
            </h2>
            <p className="text-xs text-slate-400">The dispatcher algorithm queries this deterministic table on every ticket submission</p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {rules.length} Active Rules
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-3">Rule ID</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Zone</th>
                <th className="py-3 px-3">Error Pattern</th>
                <th className="py-3 px-3">Primary Handler</th>
                <th className="py-3 px-3">Backup Handler</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                    #{rule.id}
                  </td>
                  <td className="py-3 px-3 text-slate-200">
                    {rule.category}
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-semibold">
                    {rule.zone}
                  </td>
                  <td className="py-3 px-3 font-mono text-cyan-300">
                    {rule.error_code_pattern}
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-white font-semibold">{rule.primary_handler_name || rule.primary_handler_id}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Load: {rule.primary_load}/{rule.primary_capacity} • {rule.primary_available ? 'Available' : 'Unavailable'}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-300">{rule.backup_handler_name || rule.backup_handler_id}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Load: {rule.backup_load}/{rule.backup_capacity}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                    {rule.notes || '—'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Section: Deterministic Waiting Queue & Escalation Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Waiting Queue */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Deterministic Waiting Queue</span>
              </h2>
              <p className="text-xs text-slate-400">
                Sorted deterministically: Critical &gt; High &gt; Medium &gt; Low (FIFO tie-breaker)
              </p>
            </div>

            <button
              onClick={handleProcessQueue}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-bold uppercase tracking-wider transition-all shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-amber-300" />
              <span>Process Queue</span>
            </button>
          </div>

          {queueData.queued_reports.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-slate-950/60 border border-slate-800">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50 mb-2" />
              <p>Waiting queue is empty. All eligible incoming reports have been dispatched!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {queueData.queued_reports.map((q, idx) => (
                <div 
                  key={q.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-amber-400">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-400 text-xs">{q.id}</span>
                        <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${getPriorityBadge(q.priority)}`}>
                          {q.priority}
                        </span>
                        <span className="text-slate-300 text-xs font-mono">{q.atm_id}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {q.category} • Zone: {q.zone} • Queued at: {q.created_at}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/reports/${q.id}`)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Escalation & Priority Override Audit Logs */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Priority Override & Escalation Log</span>
              </h2>
              <p className="text-xs text-slate-400">Emergency dispatch overrides & supervisor paging logs</p>
            </div>
          </div>

          {queueData.escalations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-slate-950/60 border border-slate-800">
              No escalation events logged. System routing within regular parameters.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {queueData.escalations.map((esc) => (
                <div
                  key={esc.id}
                  className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span>Incident: {esc.report_id} {esc.atm_id ? `(${esc.atm_id})` : ''}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{esc.created_at}</span>
                  </div>
                  <div className="text-slate-300 leading-snug">
                    <strong className="text-rose-400">Reason:</strong> {esc.reason}
                  </div>
                  <div className="text-slate-400 text-[11px] pt-1 border-t border-rose-500/20">
                    <strong className="text-cyan-400">Action:</strong> {esc.action_taken}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Rule Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5">
            <h3 className="text-lg font-bold text-white">Add Explicit Routing Rule</h3>

            <form onSubmit={handleAddRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={newRule.category}
                  onChange={(e) => setNewRule(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="Cash Dispenser Errors">Cash Dispenser Errors</option>
                  <option value="Card Reader Errors">Card Reader Errors</option>
                  <option value="Network/Communication Errors">Network/Communication Errors</option>
                  <option value="Hardware/System Errors">Hardware/System Errors</option>
                  <option value="Transaction/Software Errors">Transaction/Software Errors</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Zone</label>
                  <select
                    value={newRule.zone}
                    onChange={(e) => setNewRule(prev => ({ ...prev, zone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="Central">Central</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Error Pattern</label>
                  <input
                    type="text"
                    value={newRule.error_code_pattern}
                    onChange={(e) => setNewRule(prev => ({ ...prev, error_code_pattern: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-cyan-300 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Handler</label>
                  <select
                    value={newRule.primary_handler_id}
                    onChange={(e) => setNewRule(prev => ({ ...prev, primary_handler_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    {handlers.map(h => (
                      <option key={h.id} value={h.id}>{h.name} ({h.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Backup Handler</label>
                  <select
                    value={newRule.backup_handler_id}
                    onChange={(e) => setNewRule(prev => ({ ...prev, backup_handler_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    {handlers.map(h => (
                      <option key={h.id} value={h.id}>{h.name} ({h.id})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Rationale</label>
                <input
                  type="text"
                  value={newRule.notes}
                  onChange={(e) => setNewRule(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/20"
                >
                  Save Routing Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutingManagementDashboard;
