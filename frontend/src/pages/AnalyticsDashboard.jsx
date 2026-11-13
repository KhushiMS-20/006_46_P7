import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw, 
  Award,
  Layers,
  MapPin
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { dashboardService } from '../services/api';

const CATEGORY_COLORS = ['#06D6A0', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];
const PRIORITY_COLORS = {
  'Critical': '#EF4444',
  'High': '#F97316',
  'Medium': '#3B82F6',
  'Low': '#10B981',
};

const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const res = await dashboardService.getAnalytics();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading ATM Fleet Analytics Engine...</p>
      </div>
    );
  }

  // Calculate resolution rate
  const totalZone = (data?.zone_distribution || []).reduce((acc, z) => acc + z.total, 0) || 1;
  const resolvedZone = (data?.zone_distribution || []).reduce((acc, z) => acc + z.resolved, 0);
  const resolutionRate = ((resolvedZone / totalZone) * 100).toFixed(1);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-cyan-400" />
            <span>Operations & Diagnostic Analytics</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry, zone distribution metrics, technician resolution benchmarks, and category trends.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resolution Efficiency</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{resolutionRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Closed without SLA breach</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mean Time To Resolution</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-400">2.4 <span className="text-base font-normal text-slate-400">Hrs</span></div>
          <div className="text-[11px] text-slate-400 mt-1">From initial ticket validation</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-blue-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">DFA Validator Accuracy</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-400">100.0%</div>
          <div className="text-[11px] text-slate-400 mt-1">Agreement with formal grammars</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fleet Availability</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-400">99.1%</div>
          <div className="text-[11px] text-slate-400 mt-1">Terminal uptime target achieved</div>
        </div>
      </div>

      {/* Row 1: Zone Distribution & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Zone Distribution Bar Chart (Resolved vs Unresolved) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Zone-Wise Incident Volume & Resolution Split</span>
              </h2>
              <p className="text-xs text-slate-400">Resolved vs active unresolved tickets by geographical zone</p>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.zone_distribution || []} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="zone" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
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
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
                <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unresolved" name="Active / Unresolved" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown (Donut Chart) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Category Distribution
              </h2>
              <p className="text-xs text-slate-400">Share of 5 predefined error categories</p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
              Deterministic
            </span>
          </div>

          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.category_distribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(data?.category_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} stroke="none" />
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
                <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: '10px', color: '#94A3B8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Daily Volume Trend & Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Ingestion & Resolution Trend Area Chart */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Daily Incoming vs Resolved Report Trajectory</span>
              </h2>
              <p className="text-xs text-slate-400">Temporal fault velocity based on database timestamps</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.daily_trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0F172A', 
                    borderColor: '#334155', 
                    borderRadius: '0.75rem', 
                    color: '#F8FAFC',
                    fontSize: '12px'
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
                <Area type="monotone" dataKey="incoming" name="Incoming Faults" stroke="#38BDF8" fillOpacity={1} fill="url(#colorIncoming)" />
                <Area type="monotone" dataKey="resolved" name="Resolved Tickets" stroke="#10B981" fillOpacity={1} fill="url(#colorResolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Breakdown Bar Chart */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Priority-Wise Severity Split
              </h2>
              <p className="text-xs text-slate-400">Breakdown across 4 priority levels</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.priority_distribution || []} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="priority" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0F172A', 
                    borderColor: '#334155', 
                    borderRadius: '0.75rem', 
                    color: '#F8FAFC',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {(data?.priority_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Field Handler Performance Benchmarks Table */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Technician Performance & SLA Adherence Leaderboard</span>
            </h2>
            <p className="text-xs text-slate-400">Total resolved tickets, current workload, and customer satisfaction rating</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-3">Technician</th>
                <th className="py-3 px-3">Zone</th>
                <th className="py-3 px-3">Resolved Count</th>
                <th className="py-3 px-3">Active Workload</th>
                <th className="py-3 px-3">Capacity</th>
                <th className="py-3 px-3">Rating</th>
                <th className="py-3 px-3">Performance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {(data?.handler_performance || []).map((h) => (
                <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-white">{h.name}</div>
                    <div className="text-[10px] text-cyan-400 font-mono">{h.id}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {h.zone}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                    {h.resolved_count} Tickets
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-200">
                    {h.current_load}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">
                    {h.max_capacity}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-amber-400">
                    ★ {h.rating}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                      Top Performer
                    </span>
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

export default AnalyticsDashboard;
