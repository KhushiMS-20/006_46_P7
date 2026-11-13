import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sliders, 
  Power, 
  FileCheck, 
  ArrowUpRight, 
  Send, 
  Check, 
  X,
  MapPin,
  Star,
  Activity,
  Layers
} from 'lucide-react';
import { handlerService, reportService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const HandlerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [handlers, setHandlers] = useState([]);
  const [currentHandler, setCurrentHandler] = useState(null);
  const [assignedReports, setAssignedReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status Update & Resolution Modal State
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const handlersList = await handlerService.getAll();
      setHandlers(handlersList);

      // Select active handler (defaults to HND-01 John Davis or matched from user context)
      const matched = handlersList.find(h => h.name.toLowerCase().includes(user?.full_name?.toLowerCase() || 'john')) || handlersList[0];
      setCurrentHandler(matched);

      if (matched) {
        const reports = await reportService.getAll({ assigned_handler_id: matched.id });
        setAssignedReports(reports);
      }
    } catch (err) {
      console.error('Failed to load handler data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSelectHandler = async (h) => {
    setCurrentHandler(h);
    try {
      const reports = await reportService.getAll({ assigned_handler_id: h.id });
      setAssignedReports(reports);
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Availability
  const handleToggleAvailability = async () => {
    if (!currentHandler) return;
    try {
      const newStatus = !currentHandler.is_available;
      const res = await handlerService.update(currentHandler.id, { is_available: newStatus });
      setCurrentHandler(res.handler);
      // Refresh handlers list
      setHandlers(prev => prev.map(h => h.id === currentHandler.id ? res.handler : h));
      if (res.queue_dispatched > 0) {
        alert(`Availability updated! ${res.queue_dispatched} queued ticket(s) were automatically dispatched.`);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Max Capacity
  const handleCapacityChange = async (newCap) => {
    if (!currentHandler) return;
    try {
      const res = await handlerService.update(currentHandler.id, { max_capacity: newCap });
      setCurrentHandler(res.handler);
      setHandlers(prev => prev.map(h => h.id === currentHandler.id ? res.handler : h));
      if (res.queue_dispatched > 0) {
        alert(`Capacity increased! ${res.queue_dispatched} queued ticket(s) were automatically dispatched.`);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Transition to In Progress
  const handleStartWork = async (reportId) => {
    try {
      await reportService.updateStatus(
        reportId, 
        'In Progress', 
        `Technician ${currentHandler.name} accepted ticket and commenced diagnosis.`,
        currentHandler.name
      );
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  // Open Resolution Modal
  const openResolution = (report) => {
    setSelectedReport(report);
    setResolutionNotes(`Component tested and diagnostic cycles cleared successfully on ${report.atm_id}.`);
    setResolutionModalOpen(true);
  };

  // Submit Resolution
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    setUpdating(true);

    try {
      const res = await reportService.updateStatus(
        selectedReport.id,
        'Resolved',
        resolutionNotes,
        currentHandler.name
      );
      setResolutionModalOpen(false);
      loadData();
      if (res.queue_dispatched_count > 0) {
        alert(`Ticket resolved! Resolving this ticket freed capacity: ${res.queue_dispatched_count} ticket(s) automatically pulled from Waiting Queue.`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve ticket');
    } finally {
      setUpdating(false);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'In Progress': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'Assigned': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header and Technician Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Wrench className="w-7 h-7 text-cyan-400" />
            <span>Field Technician Workstation</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Assigned ticket management, status transitions, workload capacity, and on-duty availability controls.
          </p>
        </div>

        {/* Quick Technician Persona Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Viewing Technician:</span>
          <select
            value={currentHandler?.id || ''}
            onChange={(e) => {
              const h = handlers.find(item => item.id === e.target.value);
              if (h) handleSelectHandler(h);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
          >
            {handlers.map(h => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.id} • {h.zone})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Technician Profile & Workload Capacity Control Panel */}
      {currentHandler && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Handler Identity */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                  {currentHandler.id} • Active Profile
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  {currentHandler.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentHandler.zone} Zone</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {currentHandler.rating}
                  </span>
                </div>
              </div>

              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-base">
                {currentHandler.name.charAt(0)}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-xs space-y-1 text-slate-400">
              <div>Specialty: <strong className="text-slate-200">{currentHandler.specialty_category}</strong></div>
              <div>Contact: <span className="font-mono text-slate-300">{currentHandler.phone}</span></div>
              <div>Resolved To Date: <strong className="text-emerald-400">{currentHandler.total_resolved || 0} tickets</strong></div>
            </div>
          </div>

          {/* Card 2: Workload & Capacity Gauge */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Workload Capacity
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {currentHandler.current_load} / {currentHandler.max_capacity} Active
              </span>
            </div>

            {/* Visual Capacity Meter Bar */}
            <div className="space-y-2">
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className={`h-full transition-all duration-500 ${
                    currentHandler.current_load >= currentHandler.max_capacity
                      ? 'bg-rose-500'
                      : currentHandler.current_load >= currentHandler.max_capacity - 1
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (currentHandler.current_load / currentHandler.max_capacity) * 100)}%`
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{((currentHandler.current_load / currentHandler.max_capacity) * 100).toFixed(0)}% Utilized</span>
                <span>
                  {currentHandler.current_load >= currentHandler.max_capacity ? (
                    <strong className="text-rose-400">Capacity Saturated (Failover Active)</strong>
                  ) : (
                    <strong className="text-emerald-400">Available For Routing</strong>
                  )}
                </span>
              </div>
            </div>

            {/* Slider to change capacity */}
            <div className="pt-2 border-t border-slate-800 space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                <span>Adjust Max Capacity Limit:</span>
                <span className="font-mono text-white font-bold">{currentHandler.max_capacity} Slots</span>
              </label>
              <input
                type="range"
                min="1"
                max="8"
                value={currentHandler.max_capacity}
                onChange={(e) => handleCapacityChange(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 cursor-pointer"
              />
            </div>
          </div>

          {/* Card 3: Availability Toggle */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Dispatch Availability Status
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                When toggled Off Duty, incoming tickets targeting this technician automatically failover to their assigned Backup Handler.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${currentHandler.is_available ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-sm font-bold text-white">
                  {currentHandler.is_available ? 'On-Duty (Available)' : 'Off-Duty (Unavailable)'}
                </span>
              </div>

              <button
                onClick={handleToggleAvailability}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md ${
                  currentHandler.is_available
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{currentHandler.is_available ? 'Go Off Duty' : 'Go On Duty'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Reports Table & Actions */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Assigned Tickets for {currentHandler?.name}
            </h2>
            <p className="text-xs text-slate-400">
              Update status from Assigned → In Progress → Resolved with technical notes
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800/40">
            {assignedReports.length} Tickets Linked
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : assignedReports.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50" />
            <p>No active tickets assigned to this technician. Workload queue is clear!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignedReports.map((report) => (
              <div
                key={report.id}
                className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/90 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black text-cyan-400">
                      {report.id}
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      ATM: <strong className="text-white">{report.atm_id}</strong> ({report.branch_code})
                    </span>
                    <span className="text-xs text-slate-400">
                      Zone: <strong>{report.zone}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${getPriorityBadge(report.priority)}`}>
                      {report.priority} Priority
                    </span>
                    <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getStatusBadge(report.status)}`}>
                      {report.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-300 font-medium leading-relaxed">
                  {report.error_description}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                  <div>
                    Category: <strong className="text-cyan-300">{report.category}</strong> • 
                    Reporter: <span className="text-slate-300">{report.reporter_name} ({report.reporter_id})</span> • 
                    Time: <span className="font-mono">{report.created_at}</span>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/reports/${report.id}`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs transition-colors"
                    >
                      Dossier
                    </button>

                    {report.status === 'Assigned' && (
                      <button
                        onClick={() => handleStartWork(report.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-colors shadow-md shadow-cyan-500/20"
                      >
                        Accept & Begin Work
                      </button>
                    )}

                    {report.status === 'In Progress' && (
                      <button
                        onClick={() => openResolution(report)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-colors shadow-md shadow-emerald-500/20 flex items-center gap-1"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Complete & Resolve</span>
                      </button>
                    )}

                    {report.status === 'Resolved' && (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Resolved ({report.resolution_notes ? 'Notes Logged' : 'Closed'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Notes Modal */}
      {resolutionModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Resolve Incident {selectedReport.id}</h3>
                <p className="text-xs text-slate-400">ATM: {selectedReport.atm_id} • {selectedReport.category}</p>
              </div>
              <button
                onClick={() => setResolutionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Technical Resolution Actions & Diagnostics Summary *
                </label>
                <textarea
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Detail parts replaced, tests run, diagnostic codes cleared..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-sans"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                Resolving this ticket automatically decrements your active workload and checks the waiting queue to pull next pending ticket!
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResolutionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {updating ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandlerDashboard;
