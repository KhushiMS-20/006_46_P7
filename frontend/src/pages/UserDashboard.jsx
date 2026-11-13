import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  FileText, 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { reportService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await reportService.getAll();
      setReports(data);
    } catch (err) {
      console.error('Failed to load user reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Filter reports
  const filteredReports = reports.filter((r) => {
    const matchesSearch = 
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.atm_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.error_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.assigned_handler_name && r.assigned_handler_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalCount = reports.length;
  const pendingCount = reports.filter(r => r.status === 'Pending' || r.status === 'Queued').length;
  const assignedCount = reports.filter(r => r.status === 'Assigned' || r.status === 'In Progress').length;
  const resolvedCount = reports.filter(r => r.status === 'Resolved').length;

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & User Profile Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-navy-800 to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            {user?.full_name ? user.full_name.charAt(0) : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {user?.full_name || 'Branch Operations Officer'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-semibold">
                Staff ID: {user?.username === 'branch_user' ? 'REP-1024' : 'OPERATIONS'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>Branch Ops Tracking Center</span>
              <span>•</span>
              <span>Regional Zone: <strong className="text-slate-300">{user?.zone || 'North'}</strong></span>
            </p>
          </div>
        </div>

        <Link
          to="/submit-report"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Incident Report</span>
        </Link>
      </div>

      {/* User Specific Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-blue-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Reports</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Submitted from your operational scope</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending / Queued</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400">{pendingCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Awaiting dispatch slot</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned / In Progress</span>
            <UserCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400">{assignedCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Technician working on-site</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved Tickets</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{resolvedCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Completed repairs</div>
        </div>
      </div>

      {/* Reports History & Search Section */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Submitted Reports History
            </h2>
            <p className="text-xs text-slate-400">Search by Report ID, ATM ID, or filter by resolution status</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Report ID (e.g. REP-2026-1001)..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {['All', 'Assigned', 'In Progress', 'Resolved', 'Queued', 'Escalated'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reports Table */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
            <p>No reports match your search or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-3">Report ID</th>
                  <th className="py-3 px-3">ATM ID</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Assigned Handler</th>
                  <th className="py-3 px-3">Submitted At</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredReports.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                      {r.id}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {r.atm_id} ({r.branch_code})
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      {r.category}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${getPriorityBadge(r.priority)}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getStatusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {r.assigned_handler_name ? (
                        <span className="font-semibold text-white">{r.assigned_handler_name}</span>
                      ) : (
                        <span className="text-slate-500 italic">None (Queued/Escalated)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      {r.created_at}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate(`/reports/${r.id}`)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 transition-colors"
                        title="View Full Report Details"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
