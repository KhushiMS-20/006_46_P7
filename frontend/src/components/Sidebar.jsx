import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  User, 
  Wrench, 
  GitFork, 
  BarChart3, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) => {
  const { user } = useAuth();

  const navItems = [
    { to: '/', label: 'Main Overview', icon: LayoutDashboard, badge: null },
    { to: '/submit-report', label: 'Submit ATM Report', icon: PlusCircle, highlight: true },
    { to: '/user-dashboard', label: 'User Reports', icon: User, badge: null },
    { to: '/handler-dashboard', label: 'Handler Workstation', icon: Wrench, badge: user?.role === 'Handler' ? 'Active' : null },
    { to: '/routing-management', label: 'Routing & Dispatch', icon: GitFork, badge: 'Rules' },
    { to: '/analytics', label: 'Analytics & KPIs', icon: BarChart3, badge: null },
    { to: '/reports', label: 'All Incidents', icon: FileText, badge: null },
    { to: '/settings', label: 'Settings & Tests', icon: Settings, badge: '18 Tests' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] flex flex-col justify-between border-r border-slate-800 bg-slate-950/95 dark:bg-slate-950/95 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Navigation Items */}
        <div className="p-3 space-y-1.5 overflow-y-auto">
          <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${isCollapsed ? 'text-center' : ''}`}>
            {isCollapsed ? '•••' : 'Core Modules'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : item.highlight
                      ? 'text-slate-200 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  } ${isCollapsed ? 'justify-center' : ''}`
                }
                title={isCollapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-cyan-400' : item.highlight ? 'text-cyan-400' : 'text-slate-400'
                    }`} />

                    {!isCollapsed && (
                      <span className="truncate flex-1 tracking-tight">
                        {item.label}
                      </span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase">
                        {item.badge}
                      </span>
                    )}

                    {/* Active Indicator Bar on Left */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-400 rounded-r-full" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Section: Collapse Toggle & System Badge */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {!isCollapsed && (
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-cyan-400" /> Dispatch Engine
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                  Online
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                DFA Validation • 5 Categories • Priority Queue Active
              </p>
            </div>
          )}

          {/* Desktop Collapse Toggle Button */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex w-full items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium">
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Menu</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
