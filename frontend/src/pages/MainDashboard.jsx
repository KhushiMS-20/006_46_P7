import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  UserCheck, 
  FileText, 
  Plus, 
  ArrowUpRight, 
  Users, 
  Activity, 
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  Server
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { dashboardService, reportService } from '../services/api';

const CATEGORY_COLORS = {
  'Cash Dispenser Errors': '#06D6A0',
  'Card Reader Errors': '#3B82F6',
  'Network/Communication Errors': '#8B5CF6',
  'Hardware/System Errors': '#F59E0B',
  'Transaction/Software Errors': '#EC4899',
};

const PRIORITY_COLORS = {
  'Critical': '#EF4444',
  'High': '#F97316',
  'Medium': '#3B82F6',
  'Low': '#10B981',
};

const MainDashboard = () => {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [statsData, reportsData] = await Promise.all([
        dashboardService.getStats(),
        reportService.getAll({ limit: 6 })
      ]);
      setStats(statsData);
      setReports(reportsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'High':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Medium':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'In Progress':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'Assigned':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'Escalated':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse';
      case 'Queued':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading ATM Enterprise Operations Dashboard...</p>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Reports',
      count: stats?.stats?.total_reports || 0,
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      subtitle: 'Recorded in SQLite'
    },
    {
      title: 'Pending / Queued',
      count: (stats?.stats?.pending_reports || 0) + (stats?.stats?.queued_reports || 0),
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      subtitle: 'Awaiting dispatch'
    },
    {
      title: 'Assigned / In Progress',
      count: (stats?.stats?.assigned_reports || 0) + (stats?.stats?.in_progress_reports || 0),
      icon: UserCheck,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      subtitle: 'Field technicians active'
    },
    {
      title: 'Resolved Reports',
      count: stats?.stats?.resolved_reports || 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      subtitle: 'Closed with resolution'
    },
    {
      title: 'Critical Incidents',
      count: stats?.stats?.critical_reports || 0,
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      subtitle: 'Priority override active'
    },
  ];

  const categoryChartData = (stats?.category_distribution || []).map(item => ({
    name: item.category.replace(' Errors', ''),
    fullName: item.category,
    value: item.count,
    color: CATEGORY_COLORS[item.category] || '#64748B'
  }));

  const priorityChartData = (stats?.priority_distribution || []).map(item => ({
    name: item.priority,
    count: item.count,
    fill: PRIORITY_COLORS[item.priority] || '#3B82F6'
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Enterprise Operations Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-semibold">
              Live Fleet
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time ATM fault logging, DFA state validation, and deterministic dispatch management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/submit-report"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Submit ATM Report</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl border ${kpi.bg} backdrop-blur-sm transition-all hover:translate-y-[-2px]`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {kpi.title}
                </span>
                <div className={`p-2 rounded-xl bg-slate-900/60 ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white tracking-tight">
                {kpi.count}
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5 font-medium">
                {kpi.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Distribution (Donut Chart) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Report Category Distribution (5 Core Categories)
              </h2>
              <p className="text-xs text-slate-400">Classified using rule-based error codes & keyword precedence</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
              5 Categories
            </span>
          </div>

          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0F172A', 
                    borderColor: '#334155', 
                    borderRadius: '0.75rem', 
                    color: '#F8FAFC',
                    fontSize: '12px'
                  }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution (Bar Chart) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Priority Distribution
              </h2>
              <p className="text-xs text-slate-400">Emergency & Urgency Weighting</p>
            </div>
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityChartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ 
                    backgroundColor: '#0F172A', 
                    borderColor: '#334155', 
                    borderRadius: '0.75rem', 
                    color: '#F8FAFC',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Middle Row: Handler Availability Fleet & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Handler Availability Overview */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Field Handler Capacity
              </h2>
              <p className="text-xs text-slate-400">Live technician loads vs max capacity</p>
            </div>
            <Link to="/handler-dashboard" className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium">
              View Workstation <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Fleet Availability:</span>
              <span className="text-emerald-400 font-bold font-mono">
                {stats?.handlers?.available_handlers || 0} / {stats?.handlers?.total_handlers || 0} Technicians Active
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Fleet Workload Utilization:</span>
              <span className="text-cyan-400 font-bold font-mono">
                {stats?.handlers?.active_workload || 0} / {stats?.handlers?.total_fleet_capacity || 0} Capacity Slots Used
              </span>
            </div>

            <div className="pt-2 text-xs text-slate-400 leading-relaxed">
              Dispatch engine automatically reroutes reports when technician capacity reaches 100% or when on-duty status is toggled off.
            </div>
          </div>
        </div>

        {/* Recent Activity Audit Timeline */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Recent Operations Timeline
              </h2>
              <p className="text-xs text-slate-400">Real-time status transitions and assignment logs</p>
            </div>
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {(stats?.recent_activity || []).map((act, index) => (
              <div 
                key={index}
                className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">
                      {act.report_id} {act.atm_id ? `(${act.atm_id})` : ''}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {act.created_at}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                    {act.notes || `Transitioned to ${act.new_status}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400">
                      By: <strong className="text-slate-300">{act.changed_by}</strong>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${getStatusBadge(act.new_status)}`}>
                      {act.new_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Reports Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Recent Incident Reports
            </h2>
            <p className="text-xs text-slate-400">Click any report row to view full lifecycle audit dossier</p>
          </div>
          <Link
            to="/reports"
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
          >
            Browse All Reports <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-3">Report ID</th>
                <th className="py-3 px-3">ATM ID</th>
                <th className="py-3 px-3">Zone</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Assigned Handler</th>
                <th className="py-3 px-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {reports.slice(0, 5).map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/reports/${r.id}`)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-3 font-mono font-bold text-cyan-400 group-hover:underline">
                    {r.id}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    {r.atm_id}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {r.zone}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <span className="truncate max-w-[140px] block">
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
                      <span className="text-slate-400 italic">None (Queued/Escalated)</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                    {r.created_at?.slice(5, 16)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
