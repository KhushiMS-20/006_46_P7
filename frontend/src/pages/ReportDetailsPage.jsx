import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  User, 
  Wrench, 
  GitFork, 
  ShieldAlert, 
  FileText, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Check, 
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';
import { reportService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const LIFECYCLE_STEPS = [
  { key: 'Submitted', label: '1. Submitted', desc: 'Fault logged' },
  { key: 'Validated', label: '2. Validated', desc: 'DFA state verified' },
  { key: 'Classified', label: '3. Classified', desc: '5-category mapped' },
  { key: 'Routed', label: '4. Routed', desc: 'Routing table queried' },
  { key: 'Assigned', label: '5. Assigned', desc: 'Handler linked' },
  { key: 'In Progress', label: '6. In Progress', desc: 'Technician on-site' },
  { key: 'Resolved', label: '7. Resolved', desc: 'Audit verified' },
];

const ReportDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quick Action Update Status
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await reportService.getById(id);
      setDossier(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Report not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  const handleUpdateStatus = async (newStatus, notes = '') => {
    try {
      setStatusUpdating(true);
      await reportService.updateStatus(id, newStatus, notes, user?.full_name || 'Admin');
      setResolutionModalOpen(false);
      loadReport();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading Report Dossier #{id}...</p>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Report Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'The requested incident report could not be located in SQLite database.'}</p>
        <button
          onClick={() => navigate('/reports')}
          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
        >
          Back to Reports List
        </button>
      </div>
    );
  }

  const { report, history, assignments, escalations } = dossier;

  // Determine current lifecycle step index (0 to 6)
  const getLifecycleStepIndex = (status) => {
    switch (status) {
      case 'Pending': return 3; // Submitted -> Validated -> Classified -> Routed
      case 'Queued': return 3;
      case 'Escalated': return 4;
      case 'Assigned': return 4;
      case 'In Progress': return 5;
      case 'Resolved': return 6;
      default: return 4;
    }
  };

  const currentStepIdx = getLifecycleStepIndex(report.status);

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
      case 'Escalated': return 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse';
      case 'Queued': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default: return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Top Navigation & Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Navigation</span>
        </button>

        {/* Quick Status Action Toolbar */}
        <div className="flex items-center gap-2">
          {report.status !== 'In Progress' && report.status !== 'Resolved' && (
            <button
              onClick={() => handleUpdateStatus('In Progress', 'Marked In Progress from dossier inspection.')}
              disabled={statusUpdating}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-cyan-500/20"
            >
              Mark In Progress
            </button>
          )}

          {report.status !== 'Resolved' && (
            <button
              onClick={() => {
                setResolutionNotes('Diagnosed and cleared operational fault.');
                setResolutionModalOpen(true);
              }}
              disabled={statusUpdating}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-emerald-500/20 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Resolved</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Dossier Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-navy-800 to-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-cyan-400 font-mono tracking-wider">
                {report.id}
              </span>
              <span className={`px-2.5 py-0.5 rounded-md border text-xs font-bold ${getPriorityBadge(report.priority)}`}>
                {report.priority} Priority
              </span>
              <span className={`px-2.5 py-0.5 rounded-md border text-xs font-semibold ${getStatusBadge(report.status)}`}>
                {report.status}
              </span>
            </div>
            <p className="text-sm text-slate-300 font-medium">
              ATM Terminal <strong className="text-white">{report.atm_id}</strong> • Branch <span className="font-mono text-cyan-300">{report.branch_code}</span> • {report.zone} Zone
            </p>
          </div>

          <div className="text-right text-xs text-slate-400 font-mono">
            <div>Submitted: {report.created_at}</div>
            {report.resolved_at && (
              <div className="text-emerald-400 font-semibold">Resolved: {report.resolved_at}</div>
            )}
          </div>
        </div>

        {/* 7-Step Visual Lifecycle Timeline */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Report Lifecycle Progression</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div
                  key={step.key}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10'
                      : isCompleted
                      ? 'bg-slate-950/80 border-slate-700 text-slate-200'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1">
                    {isCompleted ? (
                      <CheckCircle2 className={`w-4 h-4 ${isCurrent ? 'text-cyan-400' : 'text-emerald-400'}`} />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[9px] text-slate-600 font-mono">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-bold truncate">{step.label}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{step.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Incident Metadata & Fault Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Fault Specs & Resolution Notes */}
        <div className="lg:col-span-7 space-y-6">
          {/* Incident Description */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-400" /> Incident Description & Diagnostics
            </h3>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 leading-relaxed font-sans">
              {report.error_description}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500">Structured Error Code</span>
                <div className="font-mono font-bold text-cyan-400 text-sm mt-0.5">{report.error_code}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500">Detected Category</span>
                <div className="font-bold text-white text-sm mt-0.5">{report.category}</div>
              </div>
            </div>

            {/* Resolution Notes (If Resolved) */}
            {report.resolution_notes && (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Official Resolution Notes
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {report.resolution_notes}
                </p>
                {report.resolved_at && (
                  <div className="text-[10px] text-emerald-500/80 font-mono">
                    Completed at: {report.resolved_at}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Audit History Timeline */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" /> Relational Audit Trail & Status History
            </h3>

            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 mt-1 shrink-0" />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        Status: <span className="text-cyan-300">{h.new_status}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{h.created_at}</span>
                    </div>
                    <div className="text-slate-300">{h.notes}</div>
                    <div className="text-[11px] text-slate-400">
                      Changed by: <strong className="text-slate-300">{h.changed_by}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Handlers & Reporter Details */}
        <div className="lg:col-span-5 space-y-6">
          {/* Assigned Technician Card */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-cyan-400" /> Assigned Field Handler
            </h3>

            {report.assigned_handler_id ? (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-400">{report.assigned_handler_id}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                    Active Assignment
                  </span>
                </div>
                <div className="text-base font-bold text-white">{report.assigned_handler_name}</div>
                <div className="text-slate-400">
                  Specialty: <strong className="text-slate-200">{report.assigned_handler_specialty}</strong>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-cyan-400" /> {report.assigned_handler_phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-cyan-400" /> {report.assigned_handler_email}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                Ticket currently not assigned to a primary technician (In Waiting Queue or Escalated).
              </div>
            )}

            {/* Backup Handler Reference */}
            {report.backup_handler_id && (
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs text-slate-400 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Configured Backup Handler
                </div>
                <div className="text-slate-200 font-medium">
                  {report.backup_handler_name} ({report.backup_handler_id})
                </div>
              </div>
            )}
          </div>

          {/* Reporter & Branch Card */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-4 h-4 text-cyan-400" /> Reporter & Branch Origins
            </h3>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
              <div>
                <span className="text-slate-400">Reporter Name:</span>
                <div className="font-bold text-white text-sm mt-0.5">{report.reporter_name}</div>
              </div>
              <div>
                <span className="text-slate-400">Reporter Badge ID:</span>
                <div className="font-mono text-cyan-300 font-semibold">{report.reporter_id}</div>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400">Branch & Zone:</span>
                <div className="text-slate-200 font-semibold">{report.branch_code} ({report.zone} Zone)</div>
              </div>
            </div>
          </div>

          {/* Escalation Event Box (If any) */}
          {escalations.length > 0 && (
            <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/40 text-xs space-y-2">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Emergency Escalation Triggered
              </div>
              {escalations.map((esc) => (
                <div key={esc.id} className="space-y-1 text-slate-300">
                  <div><strong>Trigger:</strong> {esc.reason}</div>
                  <div className="text-cyan-300"><strong>Dispatch Action:</strong> {esc.action_taken}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resolution Notes Modal */}
      {resolutionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-white">Resolve Incident {report.id}</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Resolution Notes & Diagnostic Verification *
              </label>
              <textarea
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Detail technical remediation steps..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 font-sans"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResolutionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('Resolved', resolutionNotes)}
                disabled={statusUpdating}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/20"
              >
                {statusUpdating ? 'Updating...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDetailsPage;
