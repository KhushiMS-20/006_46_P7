import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  RefreshCw,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { reportService } from '../services/api';

const ReportsListPage = () => {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [zoneFilter, setZoneFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const loadReports = async () => {
    try {
      setRefreshing(true);
      const data = await reportService.getAll({
        status: statusFilter,
        category: categoryFilter,
        zone: zoneFilter,
        priority: priorityFilter,
        search: search
      });
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter, categoryFilter, zoneFilter, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadReports();
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
      case 'Escalated': return 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse';
      case 'Queued': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default: return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-cyan-400" />
            <span>ATM Incident Records Explorer</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete database audit of all logged ATM faults, dispatch routing decisions, and resolution history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadReports}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/submit-report"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Incident</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Report ID, ATM ID, Error Code, or keywords..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Search
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Queued">Queued</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
            >
              <option value="All">All Categories</option>
              <option value="Cash Dispenser Errors">Cash Dispenser Errors</option>
              <option value="Card Reader Errors">Card Reader Errors</option>
              <option value="Network/Communication Errors">Network/Communication Errors</option>
              <option value="Hardware/System Errors">Hardware/System Errors</option>
              <option value="Transaction/Software Errors">Transaction/Software Errors</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Zone</label>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
            >
              <option value="All">All Zones</option>
              <option value="North">North Zone</option>
              <option value="South">South Zone</option>
              <option value="East">East Zone</option>
              <option value="West">West Zone</option>
              <option value="Central">Central Zone</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
            <p>No incident records match the current filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-3">Report ID</th>
                  <th className="py-3 px-3">ATM ID</th>
                  <th className="py-3 px-3">Branch & Zone</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Assigned Handler</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/reports/${r.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400 group-hover:underline">
                      {r.id}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200">
                      {r.atm_id}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {r.branch_code} ({r.zone})
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      <span className="truncate max-w-[150px] block">
                        {r.category}
                      </span>
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
                        <span className="text-slate-500 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      {r.created_at?.slice(0, 16)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/reports/${r.id}`);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 transition-colors"
                        title="View Full Dossier"
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

export default ReportsListPage;
